import { format, parseISO, startOfDay } from 'date-fns';
import { and, eq, lt } from 'drizzle-orm';

import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { advanceUntilFuture } from '@/lib/subscriptions/cycles';

// Move past-due next_payment dates forward by whole billing cycles.
export async function advancePayments(today = new Date()) {
  const day = startOfDay(today);
  const overdue = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        lt(subscriptions.nextPayment, format(day, 'yyyy-MM-dd')),
        eq(subscriptions.autoRenew, true),
        eq(subscriptions.inactive, false)
      )
    );

  let advanced = 0;
  for (const sub of overdue) {
    const next = advanceUntilFuture(
      parseISO(sub.nextPayment),
      sub.cycle,
      sub.frequency,
      day
    );
    const formatted = format(next, 'yyyy-MM-dd');
    if (formatted === sub.nextPayment) continue;
    await db
      .update(subscriptions)
      .set({ nextPayment: formatted, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
    advanced++;
  }
  return { advanced };
}
