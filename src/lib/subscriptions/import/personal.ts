import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  currencies,
  paymentMethods,
  subscriptionCategories,
  subscriptions,
} from '@/db/schema';

import { WALLOS_LOGOS } from './logos';

// One-time import of Ali's subscriptions from the retired Wallos instance
// (subs.alisamadii.com, exported 2026-10-07). Runs as part of first-user
// seeding so a fresh deploy comes up with this data after signup.

type ImportSub = {
  name: string;
  price: string;
  nextPayment: string;
  startDate: string;
  cycle: number;
  frequency: number;
  paymentMethod: string;
  category: string | null;
  url: string | null;
  notifyDaysBefore: number;
  autoRenew: boolean;
};

const SUBS: ImportSub[] = [
  { name: 'Resend', price: '20.00', nextPayment: '2026-10-01', startDate: '2026-09-01', cycle: 3, frequency: 1, paymentMethod: 'Apple Pay', category: 'Software', url: 'https://resend.com', notifyDaysBefore: 2, autoRenew: false },
  { name: 'Supabase', price: '25.00', nextPayment: '2026-10-19', startDate: '2026-09-20', cycle: 3, frequency: 1, paymentMethod: 'Direct Debit', category: null, url: null, notifyDaysBefore: 2, autoRenew: true },
  { name: 'Family Moment Logo - 1476', price: '9.00', nextPayment: '2026-10-25', startDate: '2026-09-26', cycle: 3, frequency: 1, paymentMethod: 'Direct Debit', category: null, url: null, notifyDaysBefore: 2, autoRenew: true },
  { name: 'Dirplay Logo - 1476', price: '9.00', nextPayment: '2026-10-25', startDate: '2026-09-26', cycle: 3, frequency: 1, paymentMethod: 'Direct Debit', category: null, url: null, notifyDaysBefore: 2, autoRenew: true },
  { name: 'Claude', price: '100.00', nextPayment: '2026-11-02', startDate: '2026-09-02', cycle: 3, frequency: 1, paymentMethod: 'Direct Debit', category: 'Software', url: 'https://claude.ai/', notifyDaysBefore: 2, autoRenew: true },
  { name: 'Apple Program', price: '100.00', nextPayment: '2027-09-19', startDate: '2026-09-20', cycle: 4, frequency: 1, paymentMethod: 'Direct Debit', category: 'Technology', url: null, notifyDaysBefore: 1, autoRenew: true },
  { name: 'Hostinger', price: '280.25', nextPayment: '2028-08-30', startDate: '2026-08-31', cycle: 4, frequency: 2, paymentMethod: 'Credit Card', category: 'Software', url: 'https://hpanel.hostinger.com/vps/1944792/overview', notifyDaysBefore: 5, autoRenew: true },
];

const METHOD_NAMES = ['Apple Pay', 'Direct Debit', 'Credit Card'];
const CATEGORY_NAMES = ['Software', 'Technology'];

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function importPersonalSubscriptions(tx: Tx | typeof db, userId: string) {
  const existing = await tx
    .select({ name: subscriptions.name })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.name, SUBS.map((s) => s.name))
      )
    )
    .limit(1);
  if (existing.length > 0) return { imported: 0 };

  const [usd] = await tx
    .select()
    .from(currencies)
    .where(and(eq(currencies.userId, userId), eq(currencies.code, 'USD')));
  if (!usd) return { imported: 0 };

  const methodIds = new Map<string, string>();
  for (const name of METHOD_NAMES) {
    const [found] = await tx
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.name, name)));
    if (found) {
      methodIds.set(name, found.id);
    } else {
      const [created] = await tx
        .insert(paymentMethods)
        .values({ userId, name, type: 'other' })
        .returning({ id: paymentMethods.id });
      methodIds.set(name, created.id);
    }
  }

  const categoryIds = new Map<string, string>();
  for (const name of CATEGORY_NAMES) {
    const [found] = await tx
      .select({ id: subscriptionCategories.id })
      .from(subscriptionCategories)
      .where(
        and(
          eq(subscriptionCategories.userId, userId),
          eq(subscriptionCategories.name, name)
        )
      );
    if (found) {
      categoryIds.set(name, found.id);
    } else {
      const [created] = await tx
        .insert(subscriptionCategories)
        .values({ userId, name, sortOrder: 100 })
        .returning({ id: subscriptionCategories.id });
      categoryIds.set(name, created.id);
    }
  }

  await tx.insert(subscriptions).values(
    SUBS.map((s) => ({
      userId,
      name: s.name,
      logo: WALLOS_LOGOS[s.name] ?? null,
      url: s.url,
      price: s.price,
      currencyId: usd.id,
      nextPayment: s.nextPayment,
      startDate: s.startDate,
      cycle: s.cycle,
      frequency: s.frequency,
      categoryId: s.category ? (categoryIds.get(s.category) ?? null) : null,
      paymentMethodId: methodIds.get(s.paymentMethod) ?? null,
      notify: true,
      notifyDaysBefore: s.notifyDaysBefore,
      autoRenew: s.autoRenew,
      inactive: false,
    }))
  );

  return { imported: SUBS.length };
}
