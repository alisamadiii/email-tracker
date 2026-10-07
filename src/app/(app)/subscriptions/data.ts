import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  currencies,
  householdMembers,
  paymentMethods,
  subscriptionCategories,
  subscriptions,
  userSettings,
} from '@/db/schema';

import type {
  CategoryOption,
  CurrencyOption,
  MemberOption,
  PaymentMethodOption,
  SettingsView,
  SubscriptionRow,
} from './types';

export async function loadSubscriptionData(userId: string) {
  const [subs, currencyRows, categoryRows, methodRows, memberRows, settingsRows] =
    await Promise.all([
      db
        .select({
          sub: subscriptions,
          currencyCode: currencies.code,
          currencySymbol: currencies.symbol,
          currencyRate: currencies.rate,
          categoryName: subscriptionCategories.name,
          paymentMethodName: paymentMethods.name,
          payerName: householdMembers.name,
        })
        .from(subscriptions)
        .innerJoin(currencies, eq(subscriptions.currencyId, currencies.id))
        .leftJoin(
          subscriptionCategories,
          eq(subscriptions.categoryId, subscriptionCategories.id)
        )
        .leftJoin(
          paymentMethods,
          eq(subscriptions.paymentMethodId, paymentMethods.id)
        )
        .leftJoin(
          householdMembers,
          eq(subscriptions.payerMemberId, householdMembers.id)
        )
        .where(eq(subscriptions.userId, userId))
        .orderBy(asc(subscriptions.nextPayment)),
      db
        .select()
        .from(currencies)
        .where(eq(currencies.userId, userId))
        .orderBy(asc(currencies.code)),
      db
        .select()
        .from(subscriptionCategories)
        .where(eq(subscriptionCategories.userId, userId))
        .orderBy(asc(subscriptionCategories.sortOrder)),
      db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.userId, userId))
        .orderBy(asc(paymentMethods.sortOrder)),
      db
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.userId, userId))
        .orderBy(asc(householdMembers.createdAt)),
      db.select().from(userSettings).where(eq(userSettings.userId, userId)),
    ]);

  const rows: SubscriptionRow[] = subs.map((r) => ({
    id: r.sub.id,
    name: r.sub.name,
    logo: r.sub.logo,
    url: r.sub.url,
    price: Number(r.sub.price),
    currencyId: r.sub.currencyId,
    currencyCode: r.currencyCode,
    currencySymbol: r.currencySymbol,
    currencyRate: Number(r.currencyRate),
    nextPayment: r.sub.nextPayment,
    startDate: r.sub.startDate,
    cancellationDate: r.sub.cancellationDate,
    cycle: r.sub.cycle,
    frequency: r.sub.frequency,
    categoryId: r.sub.categoryId,
    categoryName: r.categoryName,
    paymentMethodId: r.sub.paymentMethodId,
    paymentMethodName: r.paymentMethodName,
    payerMemberId: r.sub.payerMemberId,
    payerName: r.payerName,
    notify: r.sub.notify,
    notifyDaysBefore: r.sub.notifyDaysBefore,
    autoRenew: r.sub.autoRenew,
    inactive: r.sub.inactive,
    replacementSubscriptionId: r.sub.replacementSubscriptionId,
    notes: r.sub.notes,
  }));

  const settings = settingsRows[0];
  const settingsView: SettingsView = {
    mainCurrencyId: settings?.mainCurrencyId ?? null,
    monthlyBudget: settings?.monthlyBudget
      ? Number(settings.monthlyBudget)
      : null,
    notifyDaysBefore: settings?.notifyDaysBefore ?? 1,
    showMonthlyPrice: settings?.showMonthlyPrice ?? false,
    convertCurrency: settings?.convertCurrency ?? true,
    hideDisabled: settings?.hideDisabled ?? false,
    disabledToBottom: settings?.disabledToBottom ?? true,
    upcomingLimit: settings?.upcomingLimit ?? 5,
    weekStart: settings?.weekStart ?? 1,
  };

  return {
    rows,
    currencies: currencyRows.map(
      (c): CurrencyOption => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        code: c.code,
        rate: Number(c.rate),
      })
    ),
    categories: categoryRows.map(
      (c): CategoryOption => ({ id: c.id, name: c.name })
    ),
    methods: methodRows.map(
      (m): PaymentMethodOption => ({
        id: m.id,
        name: m.name,
        enabled: m.enabled,
      })
    ),
    members: memberRows.map(
      (m): MemberOption => ({ id: m.id, name: m.name, email: m.email })
    ),
    settings: settingsView,
  };
}

export type SubscriptionData = Awaited<ReturnType<typeof loadSubscriptionData>>;
