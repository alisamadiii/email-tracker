import { eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  currencies,
  subscriptionCategories,
  userSettings,
} from '@/db/schema';
import { importPersonalSubscriptions } from './import/personal';

const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

const DEFAULT_CATEGORIES = [
  'Streaming',
  'Software',
  'Music',
  'Gaming',
  'News',
  'Utilities',
  'Insurance',
  'Hosting',
  'Health',
  'Other',
];

// Idempotent: the user_settings row doubles as the "already seeded" marker.
export async function ensureSubscriptionDefaults(userId: string) {
  const existing = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  await db.transaction(async (tx) => {
    const insertedCurrencies = await tx
      .insert(currencies)
      .values(DEFAULT_CURRENCIES.map((c) => ({ ...c, userId })))
      .returning({ id: currencies.id, code: currencies.code });

    await tx.insert(subscriptionCategories).values(
      DEFAULT_CATEGORIES.map((name, i) => ({
        userId,
        name,
        sortOrder: i,
      }))
    );

    const usd = insertedCurrencies.find((c) => c.code === 'USD');
    await tx.insert(userSettings).values({
      userId,
      mainCurrencyId: usd?.id,
    });

    await importPersonalSubscriptions(tx, userId);
  });
}
