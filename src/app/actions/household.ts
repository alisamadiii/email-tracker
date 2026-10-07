'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { householdMembers, subscriptions } from '@/db/schema';
import { requireSession } from '@/lib/session';
import { householdMemberSchema } from '@/lib/subscriptions/schemas';

type MemberInput = { name: string; email: string };

export async function createHouseholdMember(raw: MemberInput) {
  const { user } = await requireSession();

  const parsed = householdMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid' };
  }

  await db.insert(householdMembers).values({ ...parsed.data, userId: user.id });

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function updateHouseholdMember(id: string, raw: MemberInput) {
  const { user } = await requireSession();

  const parsed = householdMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid' };
  }

  await db
    .update(householdMembers)
    .set(parsed.data)
    .where(
      and(eq(householdMembers.id, id), eq(householdMembers.userId, user.id))
    );

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function deleteHouseholdMember(id: string) {
  const { user } = await requireSession();

  const inUse = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.payerMemberId, id),
      eq(subscriptions.userId, user.id)
    ),
  });
  if (inUse) return { error: 'Member is set as payer on a subscription' };

  await db
    .delete(householdMembers)
    .where(
      and(eq(householdMembers.id, id), eq(householdMembers.userId, user.id))
    );

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}
