import { count, eq } from 'drizzle-orm';

import { db } from '@/db';
import { appAccounts, emails, subscriptions, user } from '@/db/schema';
import { requireSession } from '@/lib/session';

import { AccountClient } from './account-client';

export default async function AccountPage() {
  const { user: sessionUser } = await requireSession();

  const [[userRow], [subCount], [emailCount], [appCount]] = await Promise.all([
    db.select().from(user).where(eq(user.id, sessionUser.id)),
    db
      .select({ value: count() })
      .from(subscriptions)
      .where(eq(subscriptions.userId, sessionUser.id)),
    db
      .select({ value: count() })
      .from(emails)
      .where(eq(emails.userId, sessionUser.id)),
    db
      .select({ value: count() })
      .from(appAccounts)
      .where(eq(appAccounts.userId, sessionUser.id)),
  ]);

  return (
    <AccountClient
      profile={{
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        createdAt: userRow.createdAt.toISOString().slice(0, 10),
      }}
      apiKey={userRow.apiKey}
      counts={{
        subscriptions: subCount.value,
        emails: emailCount.value,
        apps: appCount.value,
      }}
    />
  );
}
