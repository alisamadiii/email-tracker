'use server';

import { revalidatePath } from 'next/cache';
import { and, count, eq } from 'drizzle-orm';

import { db } from '@/db';
import { appAccounts, emails } from '@/db/schema';
import { requireSession } from '@/lib/session';

type EmailInput = {
  label: string;
  address: string;
  color: string;
};

function validate(input: EmailInput) {
  if (!input.label.trim()) return 'Label is required';
  if (!input.address.trim() || !input.address.includes('@'))
    return 'A valid email address is required';
  return null;
}

export async function createEmail(input: EmailInput) {
  const { user } = await requireSession();

  const error = validate(input);
  if (error) return { error };

  await db.insert(emails).values({
    userId: user.id,
    label: input.label.trim(),
    address: input.address.trim(),
    color: input.color,
  });

  revalidatePath('/');
  revalidatePath('/emails');
  return { error: null };
}

export async function updateEmail(id: string, input: EmailInput) {
  const { user } = await requireSession();

  const error = validate(input);
  if (error) return { error };

  await db
    .update(emails)
    .set({
      label: input.label.trim(),
      address: input.address.trim(),
      color: input.color,
    })
    .where(and(eq(emails.id, id), eq(emails.userId, user.id)));

  revalidatePath('/');
  revalidatePath('/emails');
  return { error: null };
}

export async function deleteEmail(id: string) {
  const { user } = await requireSession();

  const [{ value: usage }] = await db
    .select({ value: count() })
    .from(appAccounts)
    .where(and(eq(appAccounts.emailId, id), eq(appAccounts.userId, user.id)));

  if (usage > 0) {
    return {
      error: `This email is used by ${usage} app${usage === 1 ? '' : 's'}. Reassign or delete them first.`,
    };
  }

  await db
    .delete(emails)
    .where(and(eq(emails.id, id), eq(emails.userId, user.id)));

  revalidatePath('/');
  revalidatePath('/emails');
  return { error: null };
}
