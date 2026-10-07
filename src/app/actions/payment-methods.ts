'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { paymentMethods, subscriptions } from '@/db/schema';
import { requireSession } from '@/lib/session';
import { namedItemSchema } from '@/lib/subscriptions/schemas';

export async function createPaymentMethod(raw: { name: string }) {
  const { user } = await requireSession();

  const parsed = namedItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid' };
  }

  await db
    .insert(paymentMethods)
    .values({ userId: user.id, name: parsed.data.name });

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function renamePaymentMethod(id: string, raw: { name: string }) {
  const { user } = await requireSession();

  const parsed = namedItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid' };
  }

  await db
    .update(paymentMethods)
    .set({ name: parsed.data.name })
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, user.id)));

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function togglePaymentMethod(id: string) {
  const { user } = await requireSession();

  const existing = await db.query.paymentMethods.findFirst({
    where: and(eq(paymentMethods.id, id), eq(paymentMethods.userId, user.id)),
  });
  if (!existing) return { error: 'Payment method not found' };

  await db
    .update(paymentMethods)
    .set({ enabled: !existing.enabled })
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, user.id)));

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function deletePaymentMethod(id: string) {
  const { user } = await requireSession();

  const inUse = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.paymentMethodId, id),
      eq(subscriptions.userId, user.id)
    ),
  });
  if (inUse) return { error: 'Payment method is in use by a subscription' };

  await db
    .delete(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, user.id)));

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}
