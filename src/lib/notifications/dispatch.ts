import { differenceInCalendarDays, parseISO } from 'date-fns';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  currencies,
  householdMembers,
  notificationChannels,
  subscriptionCategories,
  subscriptions,
  user,
  userSettings,
} from '@/db/schema';

import { discordSender } from './channels/discord';
import { emailSender } from './channels/email';
import { slackSender } from './channels/slack';
import { telegramSender } from './channels/telegram';
import { webhookSender } from './channels/webhook';
import type {
  ChannelSender,
  ChannelType,
  NotificationPayload,
  SubDue,
} from './types';

export const senders: Record<ChannelType, ChannelSender> = {
  email: emailSender,
  discord: discordSender,
  slack: slackSender,
  telegram: telegramSender,
  webhook: webhookSender,
};

const TITLE = 'Business Tracker — upcoming renewals';

export async function sendDueNotifications(today: Date) {
  const users = await db.select({ id: user.id, email: user.email }).from(user);
  const report: Record<string, unknown>[] = [];

  for (const u of users) {
    const result = await sendForUser(u.id, u.email, today);
    if (result) report.push({ userId: u.id, ...result });
  }
  return report;
}

async function sendForUser(userId: string, ownerEmail: string, today: Date) {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  if (!settings) return null;

  const channels = await db
    .select()
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.userId, userId),
        eq(notificationChannels.enabled, true)
      )
    );
  if (channels.length === 0) return null;

  const rows = await db
    .select({
      sub: subscriptions,
      currencyCode: currencies.code,
      categoryName: subscriptionCategories.name,
      payerName: householdMembers.name,
      payerEmail: householdMembers.email,
    })
    .from(subscriptions)
    .innerJoin(currencies, eq(subscriptions.currencyId, currencies.id))
    .leftJoin(
      subscriptionCategories,
      eq(subscriptions.categoryId, subscriptionCategories.id)
    )
    .leftJoin(
      householdMembers,
      eq(subscriptions.payerMemberId, householdMembers.id)
    )
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.notify, true),
        eq(subscriptions.inactive, false)
      )
    );

  type DueRow = SubDue & { payerEmail: string | null };
  const due: DueRow[] = [];
  for (const row of rows) {
    const daysUntil = differenceInCalendarDays(
      parseISO(row.sub.nextPayment),
      today
    );
    const target =
      row.sub.notifyDaysBefore === -1
        ? settings.notifyDaysBefore
        : row.sub.notifyDaysBefore;
    if (daysUntil < 0 || daysUntil !== target) continue;
    due.push({
      name: row.sub.name,
      price: row.sub.price,
      currencyCode: row.currencyCode,
      daysUntil,
      nextPayment: row.sub.nextPayment,
      category: row.categoryName,
      payer: row.payerName,
      url: row.sub.url,
      notes: row.sub.notes,
      payerEmail: row.payerEmail,
    });
  }
  if (due.length === 0) return { sent: 0 };

  const line = (s: SubDue) =>
    `${s.name} for ${s.price} ${s.currencyCode} (in ${s.daysUntil} day${s.daysUntil === 1 ? '' : 's'})`;

  const results: Record<string, unknown> = {};
  for (const channel of channels) {
    const sender = senders[channel.type];
    if (channel.type === 'email') {
      // One message per payer so each household member only sees their subs.
      const byRecipient = new Map<string, SubDue[]>();
      for (const s of due) {
        const recipient = s.payerEmail || ownerEmail;
        byRecipient.set(recipient, [...(byRecipient.get(recipient) ?? []), s]);
      }
      const perRecipient: unknown[] = [];
      for (const [recipient, subs] of byRecipient) {
        const payload: NotificationPayload = {
          title: TITLE,
          lines: subs.map(line),
          recipientEmail: recipient,
          subs,
        };
        perRecipient.push(await sender.send(channel.config, payload));
      }
      results.email = perRecipient;
    } else {
      const payload: NotificationPayload = {
        title: TITLE,
        lines: due.map((s) => (s.payer ? `${line(s)} — ${s.payer}` : line(s))),
        subs: due,
      };
      results[channel.type] = await sender.send(channel.config, payload);
    }
  }
  return { sent: due.length, results };
}
