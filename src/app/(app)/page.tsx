import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { appAccounts, categories, emails } from '@/db/schema';
import { requireSession } from '@/lib/session';

import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const { user } = await requireSession();

  const [emailRows, appRows, categoryRows] = await Promise.all([
    db.query.emails.findMany({
      where: eq(emails.userId, user.id),
      orderBy: emails.createdAt,
    }),
    db.query.appAccounts.findMany({
      where: eq(appAccounts.userId, user.id),
      orderBy: desc(appAccounts.createdAt),
    }),
    db.query.categories.findMany({
      where: eq(categories.userId, user.id),
      orderBy: categories.name,
    }),
  ]);

  return (
    <DashboardClient
      emails={emailRows.map((e) => ({
        id: e.id,
        label: e.label,
        address: e.address,
        color: e.color,
      }))}
      apps={appRows.map((a) => ({
        id: a.id,
        emailId: a.emailId,
        name: a.name,
        url: a.url,
        categoryId: a.categoryId,
        notes: a.notes,
        favicon: a.favicon,
        createdAt: a.createdAt.toISOString(),
      }))}
      categories={categoryRows.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
