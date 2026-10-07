import { db } from '@/db';
import { user } from '@/db/schema';
import { refreshRates } from '@/lib/subscriptions/fx';

export async function refreshFx() {
  const users = await db.select({ id: user.id }).from(user);
  let updated = 0;
  for (const u of users) {
    const result = await refreshRates(u.id);
    updated += result.updated;
  }
  return { updated };
}
