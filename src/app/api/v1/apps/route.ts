import { NextRequest } from 'next/server';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { appAccounts, categories, emails } from '@/db/schema';
import { resolveApiUser, unauthorized } from '@/lib/api-key';

export async function GET(request: NextRequest) {
  const apiUser = await resolveApiUser(request);
  if (!apiUser) return unauthorized();

  const includeLogos =
    request.nextUrl.searchParams.get('include_logos') === '1';

  const rows = await db
    .select({
      id: appAccounts.id,
      name: appAccounts.name,
      url: appAccounts.url,
      notes: appAccounts.notes,
      favicon: appAccounts.favicon,
      emailAddress: emails.address,
      emailLabel: emails.label,
      category: categories.name,
    })
    .from(appAccounts)
    .innerJoin(emails, eq(appAccounts.emailId, emails.id))
    .leftJoin(categories, eq(appAccounts.categoryId, categories.id))
    .where(eq(appAccounts.userId, apiUser.id))
    .orderBy(asc(appAccounts.createdAt));

  return Response.json({
    apps: rows.map(({ favicon, ...rest }) => ({
      ...rest,
      ...(includeLogos ? { favicon } : {}),
    })),
  });
}
