'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { notificationChannels } from '@/db/schema';
import { senders } from '@/lib/notifications/dispatch';
import { assertSafeOutboundUrl } from '@/lib/notifications/ssrf';
import {
  CHANNEL_TYPES,
  channelConfigSchemas,
  type ChannelType,
  type NotificationPayload,
} from '@/lib/notifications/types';
import { requireSession } from '@/lib/session';

function isChannelType(type: string): type is ChannelType {
  return (CHANNEL_TYPES as readonly string[]).includes(type);
}

function validateConfig(type: ChannelType, raw: unknown) {
  const parsed = channelConfigSchemas[type].safeParse(raw);
  if (!parsed.success) {
    return { config: null, error: parsed.error.issues[0]?.message ?? 'Invalid config' };
  }
  try {
    if (type === 'discord' || type === 'slack') {
      assertSafeOutboundUrl((parsed.data as { webhookUrl: string }).webhookUrl);
    }
    if (type === 'webhook') {
      assertSafeOutboundUrl((parsed.data as { url: string }).url);
    }
  } catch (error) {
    return {
      config: null,
      error: error instanceof Error ? error.message : 'Unsafe URL',
    };
  }
  return { config: parsed.data as Record<string, unknown>, error: null };
}

export async function saveChannel(type: string, rawConfig: unknown) {
  const { user } = await requireSession();
  if (!isChannelType(type)) return { error: 'Unknown channel' };

  const { config, error } = validateConfig(type, rawConfig);
  if (error || !config) return { error };

  await db
    .insert(notificationChannels)
    .values({ userId: user.id, type, config, enabled: true })
    .onConflictDoUpdate({
      target: [notificationChannels.userId, notificationChannels.type],
      set: { config, enabled: true, updatedAt: new Date() },
    });

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

export async function toggleChannel(type: string) {
  const { user } = await requireSession();
  if (!isChannelType(type)) return { error: 'Unknown channel' };

  const existing = await db.query.notificationChannels.findFirst({
    where: and(
      eq(notificationChannels.userId, user.id),
      eq(notificationChannels.type, type)
    ),
  });
  if (!existing) return { error: 'Configure the channel first' };

  await db
    .update(notificationChannels)
    .set({ enabled: !existing.enabled, updatedAt: new Date() })
    .where(eq(notificationChannels.id, existing.id));

  revalidatePath('/subscriptions', 'layout');
  return { error: null };
}

// Sends a real test message through the saved channel config.
export async function testChannel(type: string) {
  const { user } = await requireSession();
  if (!isChannelType(type)) return { error: 'Unknown channel' };

  const existing = await db.query.notificationChannels.findFirst({
    where: and(
      eq(notificationChannels.userId, user.id),
      eq(notificationChannels.type, type)
    ),
  });
  if (!existing) return { error: 'Configure the channel first' };

  const payload: NotificationPayload = {
    title: 'Business Tracker test notification',
    lines: ['If you can read this, the channel works.'],
    recipientEmail: user.email,
    subs: [
      {
        name: 'Test subscription',
        price: '9.99',
        currencyCode: 'USD',
        daysUntil: 3,
        nextPayment: new Date().toISOString().slice(0, 10),
        category: 'Test',
        payer: null,
        url: null,
        notes: null,
      },
    ],
  };

  const result = await senders[type].send(existing.config, payload);
  if (!result.ok) return { error: result.error ?? 'Send failed' };
  return { error: null };
}
