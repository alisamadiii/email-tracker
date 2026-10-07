import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { db } from '@/db';
import { user } from '@/db/schema';

export function generateApiKey(): string {
  return `bt_${randomBytes(24).toString('hex')}`;
}

// Key via `x-api-key` header or `?api_key=` query param.
export async function resolveApiUser(request: NextRequest) {
  const key =
    request.headers.get('x-api-key') ??
    request.nextUrl.searchParams.get('api_key');
  if (!key || key.length < 10) return null;

  const [found] = await db.select().from(user).where(eq(user.apiKey, key));
  return found ?? null;
}

export function unauthorized() {
  return Response.json({ error: 'Invalid or missing API key' }, { status: 401 });
}
