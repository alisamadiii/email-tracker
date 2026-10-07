'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { emails, paymentMethods, subscriptions } from '@/db/schema';
import { requireSession } from '@/lib/session';
import {
  paymentMethodInputSchema,
  type PaymentMethodInput,
} from '@/lib/subscriptions/schemas';

type Resolved = {
  name: string;
  type: 'card' | 'paypal' | 'other';
  cardKind: 'credit' | 'debit' | null;
  last4: string | null;
  emailId: string | null;
  createdEmail: boolean;
};

// Validates input, creates the linked email row for PayPal when needed,
// and derives a display name when none was given.
async function resolveInput(
  userId: string,
  raw: PaymentMethodInput
): Promise<{ values: Resolved | null; error: string | null }> {
  const parsed = paymentMethodInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      values: null,
      error: parsed.error.issues[0]?.message ?? 'Invalid payment method',
    };
  }
  const input = parsed.data;

  if (input.type === 'card') {
    const kindLabel = input.cardKind === 'credit' ? 'Credit card' : 'Debit card';
    return {
      values: {
        name: input.name || `${kindLabel} •••• ${input.last4}`,
        type: 'card',
        cardKind: input.cardKind,
        last4: input.last4,
        emailId: null,
        createdEmail: false,
      },
      error: null,
    };
  }

  if (input.type === 'paypal') {
    let emailId = input.emailId;
    let address: string | null = null;
    let createdEmail = false;

    if (emailId) {
      const owned = await db.query.emails.findFirst({
        where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
      });
      if (!owned) return { values: null, error: 'Unknown email selected' };
      address = owned.address;
    } else if (input.newEmailAddress) {
      const existing = await db.query.emails.findFirst({
        where: and(
          eq(emails.userId, userId),
          eq(emails.address, input.newEmailAddress)
        ),
      });
      if (existing) {
        emailId = existing.id;
        address = existing.address;
      } else {
        const [created] = await db
          .insert(emails)
          .values({
            userId,
            label: input.newEmailLabel || 'PayPal',
            address: input.newEmailAddress,
          })
          .returning({ id: emails.id, address: emails.address });
        emailId = created.id;
        address = created.address;
        createdEmail = true;
      }
    } else {
      return { values: null, error: 'Pick an email or enter a new one' };
    }

    return {
      values: {
        name: input.name || `PayPal — ${address}`,
        type: 'paypal',
        cardKind: null,
        last4: null,
        emailId,
        createdEmail,
      },
      error: null,
    };
  }

  return {
    values: {
      name: input.name,
      type: 'other',
      cardKind: null,
      last4: null,
      emailId: null,
      createdEmail: false,
    },
    error: null,
  };
}

function revalidate(createdEmail: boolean) {
  revalidatePath('/subscriptions', 'layout');
  if (createdEmail) {
    revalidatePath('/email');
    revalidatePath('/email/emails');
  }
}

export async function createPaymentMethod(raw: PaymentMethodInput) {
  const { user } = await requireSession();

  const { values, error } = await resolveInput(user.id, raw);
  if (error || !values) return { id: null, error };

  const { createdEmail, ...row } = values;
  const [created] = await db
    .insert(paymentMethods)
    .values({ ...row, userId: user.id })
    .returning({ id: paymentMethods.id });

  revalidate(createdEmail);
  return { id: created.id, error: null };
}

export async function updatePaymentMethod(id: string, raw: PaymentMethodInput) {
  const { user } = await requireSession();

  const existing = await db.query.paymentMethods.findFirst({
    where: and(eq(paymentMethods.id, id), eq(paymentMethods.userId, user.id)),
  });
  if (!existing) return { id: null, error: 'Payment method not found' };

  const { values, error } = await resolveInput(user.id, raw);
  if (error || !values) return { id: null, error };

  const { createdEmail, ...row } = values;
  await db
    .update(paymentMethods)
    .set(row)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, user.id)));

  revalidate(createdEmail);
  return { id, error: null };
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