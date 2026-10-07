import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { notificationChannels } from '@/db/schema';
import { requireSession } from '@/lib/session';
import type { ChannelType } from '@/lib/notifications/types';

import { loadSubscriptionData } from '../data';
import { SettingsClient, type ChannelView } from './settings-client';

export default async function SettingsPage() {
  const { user } = await requireSession();
  const [data, channelRows] = await Promise.all([
    loadSubscriptionData(user.id),
    db
      .select()
      .from(notificationChannels)
      .where(eq(notificationChannels.userId, user.id)),
  ]);

  const channels: ChannelView[] = channelRows.map((c) => ({
    type: c.type as ChannelType,
    enabled: c.enabled,
    config: c.config as Record<string, unknown>,
  }));

  return (
    <SettingsClient
      settings={data.settings}
      categories={data.categories}
      currencies={data.currencies}
      methods={data.methods}
      members={data.members}
      channels={channels}
    />
  );
}
