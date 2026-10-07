'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { subscriptionCategories, subscriptions } from '@/db/schema';
import { requireSession } from '@/lib/session';
import { namedItemSchema } from '@/lib/subscriptions/schemas';

export async function createSubscriptionCategory(raw: { name: string }) {
  const { user } = await requireSession();

  const parsed = namedItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { id: null, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  }

  const existing = await db.query.subscriptionCategories.findFirst({
    where: and(
      eq(subscriptionCategories.userId, user.id),
      eq(subscriptionCategories.name, parsed.data.name)
    ),
  });
  if (existing) return { id: existing.id, error: null };

  const [created] = await db
    .insert(subscriptionCategories)
    .values({ userId: user.id, name: parsed.data.name })
    .returning({ id: subscriptionCategories.id });

  revalidatePath('/subscriptions', 'layout');
  return { id: created.id, error: null };
}

export async function renameSubscriptionCategory(
  id: string,
  raw: { name: string }
) {
  const { user } = await requireSession();

  const parsed = namedItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid' };
  }

  await db
    .update(subscriptionCategories)
    .set({ name: parsed.data.name })
    .where(
      and(
        eq(subscriptionCategories.id, id),
        eq(subscriptionCategories.userId, user.id)
      )
    );

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function deleteSubscriptionCategory(id: string) {
  const { user } = await requireSession();

  const inUse = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.categoryId, id),
      eq(subscriptions.userId, user.id)
    ),
  });
  if (inUse) {
    return { error: 'Category is in use by a subscription' };
  }

  await db
    .delete(subscriptionCategories)
    .where(
      and(
        eq(subscriptionCategories.id, id),
        eq(subscriptionCategories.userId, user.id)
      )
    );

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}
