'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { requireSession } from '@/lib/session';
import { userSettingsSchema } from '@/lib/subscriptions/schemas';

export type UserSettingsInput = {
  monthlyBudget: string;
  notifyDaysBefore: number;
  showMonthlyPrice: boolean;
  convertCurrency: boolean;
  hideDisabled: boolean;
  disabledToBottom: boolean;
  upcomingLimit: number;
  weekStart: number;
};

export async function saveUserSettings(raw: UserSettingsInput) {
  const { user } = await requireSession();

  const parsed = userSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid settings' };
  }

  await db
    .update(userSettings)
    .set({
      monthlyBudget:
        parsed.data.monthlyBudget === null
          ? null
          : parsed.data.monthlyBudget.toFixed(2),
      notifyDaysBefore: parsed.data.notifyDaysBefore,
      showMonthlyPrice: parsed.data.showMonthlyPrice,
      convertCurrency: parsed.data.convertCurrency,
      hideDisabled: parsed.data.hideDisabled,
      disabledToBottom: parsed.data.disabledToBottom,
      upcomingLimit: parsed.data.upcomingLimit,
      weekStart: parsed.data.weekStart,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, user.id));

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}
