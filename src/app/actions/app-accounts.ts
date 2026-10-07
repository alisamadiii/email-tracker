'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { appAccounts, categories, emails } from '@/db/schema';
import { fetchFavicon } from '@/lib/favicon';
import { requireSession } from '@/lib/session';

type AppAccountInput = {
  name: string;
  emailId: string;
  url: string | null;
  categoryId: string | null;
  notes: string | null;
};

function clean(input: AppAccountInput) {
  return {
    name: input.name.trim(),
    emailId: input.emailId,
    url: input.url?.trim() || null,
    categoryId: input.categoryId || null,
    notes: input.notes?.trim() || null,
  };
}

async function validate(userId: string, input: ReturnType<typeof clean>) {
  if (!input.name) return 'App name is required';
  if (!input.emailId) return 'Pick which email you used';

  const owned = await db.query.emails.findFirst({
    where: and(eq(emails.id, input.emailId), eq(emails.userId, userId)),
  });
  if (!owned) return 'Unknown email selected';

  if (input.categoryId) {
    const category = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, input.categoryId),
        eq(categories.userId, userId)
      ),
    });
    if (!category) return 'Unknown category selected';
  }

  return null;
}

export async function createAppAccount(input: AppAccountInput) {
  const { user } = await requireSession();

  const values = clean(input);
  const error = await validate(user.id, values);
  if (error) return { error };

  const favicon = await fetchFavicon(values.url);

  await db.insert(appAccounts).values({ ...values, userId: user.id, favicon });

  revalidatePath('/email');
  revalidatePath('/email/emails');
  return { error: null };
}

export async function updateAppAccount(id: string, input: AppAccountInput) {
  const { user } = await requireSession();

  const values = clean(input);
  const error = await validate(user.id, values);
  if (error) return { error };

  const existing = await db.query.appAccounts.findFirst({
    where: and(eq(appAccounts.id, id), eq(appAccounts.userId, user.id)),
  });
  if (!existing) return { error: 'App not found' };

  // Only re-fetch the favicon when the URL actually changed.
  const favicon =
    values.url === existing.url
      ? existing.favicon
      : await fetchFavicon(values.url);

  await db
    .update(appAccounts)
    .set({ ...values, favicon, updatedAt: new Date() })
    .where(and(eq(appAccounts.id, id), eq(appAccounts.userId, user.id)));

  revalidatePath('/email');
  revalidatePath('/email/emails');
  return { error: null };
}

export async function deleteAppAccount(id: string) {
  const { user } = await requireSession();

  await db
    .delete(appAccounts)
    .where(and(eq(appAccounts.id, id), eq(appAccounts.userId, user.id)));

  revalidatePath('/email');
  revalidatePath('/email/emails');
  return { error: null };
}
