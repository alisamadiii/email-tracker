import { and, eq, ne } from 'drizzle-orm';

import { db } from '@/db';
import { currencies, userSettings } from '@/db/schema';

type FrankfurterResponse = {
  base: string;
  rates: Record<string, number>;
};

// Refresh all of a user's currency rates relative to their main currency.
// Frankfurter serves ECB reference rates, no API key needed.
export async function refreshRates(userId: string) {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  if (!settings?.mainCurrencyId) return { updated: 0 };

  const [main] = await db
    .select()
    .from(currencies)
    .where(eq(currencies.id, settings.mainCurrencyId));
  if (!main) return { updated: 0 };

  const others = await db
    .select()
    .from(currencies)
    .where(and(eq(currencies.userId, userId), ne(currencies.id, main.id)));
  if (others.length === 0) return { updated: 0 };

  const res = await fetch(
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(main.code)}`,
    { signal: AbortSignal.timeout(15_000) }
  );
  if (!res.ok) {
    throw new Error(`Frankfurter responded ${res.status}`);
  }
  const data = (await res.json()) as FrankfurterResponse;

  let updated = 0;
  for (const currency of others) {
    const rate = data.rates[currency.code];
    if (typeof rate !== 'number' || rate <= 0) continue;
    await db
      .update(currencies)
      .set({ rate: rate.toFixed(8) })
      .where(eq(currencies.id, currency.id));
    updated++;
  }
  await db
    .update(currencies)
    .set({ rate: '1' })
    .where(eq(currencies.id, main.id));

  return { updated };
}
