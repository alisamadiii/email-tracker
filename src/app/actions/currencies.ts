'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { currencies, subscriptions, userSettings } from '@/db/schema';
import { requireSession } from '@/lib/session';
import { refreshRates } from '@/lib/subscriptions/fx';
import { currencyInputSchema } from '@/lib/subscriptions/schemas';

type CurrencyInput = { name: string; symbol: string; code: string };

export async function createCurrency(raw: CurrencyInput) {
  const { user } = await requireSession();

  const parsed = currencyInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid' };
  }

  const existing = await db.query.currencies.findFirst({
    where: and(
      eq(currencies.userId, user.id),
      eq(currencies.code, parsed.data.code)
    ),
  });
  if (existing) return { error: 'Currency already exists' };

  await db.insert(currencies).values({ ...parsed.data, userId: user.id });

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function deleteCurrency(id: string) {
  const { user } = await requireSession();

  const inUse = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.currencyId, id),
      eq(subscriptions.userId, user.id)
    ),
  });
  if (inUse) return { error: 'Currency is in use by a subscription' };

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));
  if (settings?.mainCurrencyId === id) {
    return { error: 'Cannot delete the main currency' };
  }

  await db
    .delete(currencies)
    .where(and(eq(currencies.id, id), eq(currencies.userId, user.id)));

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

// Changing main currency re-bases all rates (new main becomes 1.0).
export async function setMainCurrency(id: string) {
  const { user } = await requireSession();

  const currency = await db.query.currencies.findFirst({
    where: and(eq(currencies.id, id), eq(currencies.userId, user.id)),
  });
  if (!currency) return { error: 'Currency not found' };

  await db
    .update(userSettings)
    .set({ mainCurrencyId: id, updatedAt: new Date() })
    .where(eq(userSettings.userId, user.id));
  await db
    .update(currencies)
    .set({ rate: '1' })
    .where(eq(currencies.id, id));

  try {
    await refreshRates(user.id);
  } catch {
    // Rates refresh is best-effort here; the daily job will retry.
  }

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function refreshCurrencyRates() {
  const { user } = await requireSession();

  try {
    const { updated } = await refreshRates(user.id);
    revalidatePath('/subscriptions', 'layout');
    return { updated, error: null };
  } catch (error) {
    return {
      updated: 0,
      error: error instanceof Error ? error.message : 'Refresh failed',
    };
  }
}
