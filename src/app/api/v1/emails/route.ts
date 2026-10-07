import { NextRequest } from 'next/server';
import { asc, count, eq } from 'drizzle-orm';

import { db } from '@/db';
import { appAccounts, emails } from '@/db/schema';
import { resolveApiUser, unauthorized } from '@/lib/api-key';

export async function GET(request: NextRequest) {
  const apiUser = await resolveApiUser(request);
  if (!apiUser) return unauthorized();

  const rows = await db
    .select({
      id: emails.id,
      label: emails.label,
      address: emails.address,
      color: emails.color,
      appCount: count(appAccounts.id),
    })
    .from(emails)
    .leftJoin(appAccounts, eq(appAccounts.emailId, emails.id))
    .where(eq(emails.userId, apiUser.id))
    .groupBy(emails.id)
    .orderBy(asc(emails.createdAt));

  return Response.json({ emails: rows });
}
