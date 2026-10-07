'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  currencies,
  householdMembers,
  paymentMethods,
  subscriptionCategories,
  subscriptions,
} from '@/db/schema';
import { fetchFavicon } from '@/lib/favicon';
import { requireSession } from '@/lib/session';
import {
  subscriptionInputSchema,
  type SubscriptionInput,
} from '@/lib/subscriptions/schemas';

async function validateRefs(
  userId: string,
  input: ReturnType<typeof subscriptionInputSchema.parse>
) {
  const currency = await db.query.currencies.findFirst({
    where: and(
      eq(currencies.id, input.currencyId),
      eq(currencies.userId, userId)
    ),
  });
  if (!currency) return 'Unknown currency selected';

  if (input.categoryId) {
    const category = await db.query.subscriptionCategories.findFirst({
      where: and(
        eq(subscriptionCategories.id, input.categoryId),
        eq(subscriptionCategories.userId, userId)
      ),
    });
    if (!category) return 'Unknown category selected';
  }
  if (input.paymentMethodId) {
    const method = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, input.paymentMethodId),
        eq(paymentMethods.userId, userId)
      ),
    });
    if (!method) return 'Unknown payment method selected';
  }
  if (input.payerMemberId) {
    const member = await db.query.householdMembers.findFirst({
      where: and(
        eq(householdMembers.id, input.payerMemberId),
        eq(householdMembers.userId, userId)
      ),
    });
    if (!member) return 'Unknown household member selected';
  }
  if (input.replacementSubscriptionId) {
    const replacement = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, input.replacementSubscriptionId),
        eq(subscriptions.userId, userId)
      ),
    });
    if (!replacement) return 'Unknown replacement subscription';
  }
  return null;
}

function toRow(input: ReturnType<typeof subscriptionInputSchema.parse>) {
  return {
    ...input,
    price: input.price.toFixed(2),
  };
}

export async function createSubscription(raw: SubscriptionInput) {
  const { user } = await requireSession();

  const parsed = subscriptionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const error = await validateRefs(user.id, parsed.data);
  if (error) return { error };

  const logo = await fetchFavicon(parsed.data.url);
  await db
    .insert(subscriptions)
    .values({ ...toRow(parsed.data), userId: user.id, logo });

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function updateSubscription(id: string, raw: SubscriptionInput) {
  const { user } = await requireSession();

  const parsed = subscriptionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  if (parsed.data.replacementSubscriptionId === id) {
    return { error: 'A subscription cannot replace itself' };
  }
  const error = await validateRefs(user.id, parsed.data);
  if (error) return { error };

  const existing = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)),
  });
  if (!existing) return { error: 'Subscription not found' };

  const logo =
    parsed.data.url === existing.url
      ? existing.logo
      : await fetchFavicon(parsed.data.url);

  await db
    .update(subscriptions)
    .set({ ...toRow(parsed.data), logo, updatedAt: new Date() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)));

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function deleteSubscription(id: string) {
  const { user } = await requireSession();

  await db
    .delete(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)));

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function toggleSubscriptionInactive(id: string) {
  const { user } = await requireSession();

  const existing = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)),
  });
  if (!existing) return { error: 'Subscription not found' };

  const inactive = !existing.inactive;
  await db
    .update(subscriptions)
    .set({
      inactive,
      cancellationDate: inactive
        ? new Date().toISOString().slice(0, 10)
        : null,
      updatedAt: new Date(),
    })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)));

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}
