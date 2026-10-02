import { count, eq } from 'drizzle-orm';

import { db } from '@/db';
import { appAccounts, emails } from '@/db/schema';
import { requireSession } from '@/lib/session';

import { EmailsClient } from './emails-client';

export default async function EmailsPage() {
  const { user } = await requireSession();

  const rows = await db
    .select({
      id: emails.id,
      label: emails.label,
      address: emails.address,
      color: emails.color,
      usageCount: count(appAccounts.id),
    })
    .from(emails)
    .leftJoin(appAccounts, eq(appAccounts.emailId, emails.id))
    .where(eq(emails.userId, user.id))
    .groupBy(emails.id)
    .orderBy(emails.createdAt);

  return <EmailsClient emails={rows} />;
}
