import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import {
  currencies,
  householdMembers,
  paymentMethods,
  subscriptionCategories,
  subscriptions,
  userSettings,
} from '@/db/schema';
import { resolveApiUser, unauthorized } from '@/lib/api-key';
import { loadSubscriptionData } from '@/app/(app)/subscriptions/data';

export async function GET(request: NextRequest) {
  const apiUser = await resolveApiUser(request);
  if (!apiUser) return unauthorized();

  const includeLogos =
    request.nextUrl.searchParams.get('include_logos') === '1';
  const data = await loadSubscriptionData(apiUser.id);

  return Response.json({
    subscriptions: data.rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      currencyCode: r.currencyCode,
      currencySymbol: r.currencySymbol,
      nextPayment: r.nextPayment,
      startDate: r.startDate,
      cancellationDate: r.cancellationDate,
      cycle: r.cycle,
      frequency: r.frequency,
      category: r.categoryName,
      paymentMethod: r.paymentMethodName,
      payer: r.payerName,
      url: r.url,
      notes: r.notes,
      notify: r.notify,
      notifyDaysBefore: r.notifyDaysBefore,
      autoRenew: r.autoRenew,
      inactive: r.inactive,
      ...(includeLogos ? { logo: r.logo } : {}),
    })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  price: z.coerce.number().positive(),
  currencyCode: z.string().trim().toUpperCase().optional(),
  nextPayment: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  cycle: z.coerce.number().int().min(1).max(5).default(3),
  frequency: z.coerce.number().int().min(1).max(10).default(1),
  categoryName: z.string().trim().nullish(),
  paymentMethodName: z.string().trim().min(1),
  payerName: z.string().trim().nullish(),
  url: z.string().trim().url().nullish(),
  notes: z.string().trim().nullish(),
  notify: z.coerce.boolean().default(true),
  notifyDaysBefore: z.coerce.number().int().min(-1).max(365).default(-1),
  autoRenew: z.coerce.boolean().default(true),
  inactive: z.coerce.boolean().default(false),
  logo: z
    .string()
    .regex(/^data:image\/[\w.+-]+;base64,/)
    .max(400_000)
    .nullish(),
});

export async function POST(request: NextRequest) {
  const apiUser = await resolveApiUser(request);
  if (!apiUser) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const userId = apiUser.id;

  // Currency: by code, default main currency.
  let currency;
  if (input.currencyCode) {
    [currency] = await db
      .select()
      .from(currencies)
      .where(
        and(eq(currencies.userId, userId), eq(currencies.code, input.currencyCode))
      );
    if (!currency) {
      return Response.json(
        { error: `Unknown currency code ${input.currencyCode}` },
        { status: 400 }
      );
    }
  } else {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    if (!settings?.mainCurrencyId) {
      return Response.json({ error: 'No main currency set' }, { status: 400 });
    }
    [currency] = await db
      .select()
      .from(currencies)
      .where(eq(currencies.id, settings.mainCurrencyId));
  }

  // Payment method: resolve by name or create as type 'other'.
  let [method] = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.userId, userId),
        eq(paymentMethods.name, input.paymentMethodName)
      )
    );
  if (!method) {
    [method] = await db
      .insert(paymentMethods)
      .values({ userId, name: input.paymentMethodName, type: 'other' })
      .returning({ id: paymentMethods.id });
  }

  let categoryId: string | null = null;
  if (input.categoryName) {
    let [category] = await db
      .select({ id: subscriptionCategories.id })
      .from(subscriptionCategories)
      .where(
        and(
          eq(subscriptionCategories.userId, userId),
          eq(subscriptionCategories.name, input.categoryName)
        )
      );
    if (!category) {
      [category] = await db
        .insert(subscriptionCategories)
        .values({ userId, name: input.categoryName, sortOrder: 100 })
        .returning({ id: subscriptionCategories.id });
    }
    categoryId = category.id;
  }

  let payerMemberId: string | null = null;
  if (input.payerName) {
    let [member] = await db
      .select({ id: householdMembers.id })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.userId, userId),
          eq(householdMembers.name, input.payerName)
        )
      );
    if (!member) {
      [member] = await db
        .insert(householdMembers)
        .values({ userId, name: input.payerName })
        .returning({ id: householdMembers.id });
    }
    payerMemberId = member.id;
  }

  const [created] = await db
    .insert(subscriptions)
    .values({
      userId,
      name: input.name,
      logo: input.logo ?? null,
      url: input.url ?? null,
      price: input.price.toFixed(2),
      currencyId: currency.id,
      nextPayment: input.nextPayment,
      startDate: input.startDate ?? null,
      cycle: input.cycle,
      frequency: input.frequency,
      categoryId,
      paymentMethodId: method.id,
      payerMemberId,
      notify: input.notify,
      notifyDaysBefore: input.notifyDaysBefore,
      autoRenew: input.autoRenew,
      inactive: input.inactive,
      notes: input.notes ?? null,
    })
    .returning({ id: subscriptions.id });

  return Response.json({ id: created.id }, { status: 201 });
}
