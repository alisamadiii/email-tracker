import { format } from 'date-fns';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { jobRuns } from '@/db/schema';

type JobResult = Record<string, unknown>;

// Day-stamped idempotency: a job succeeds at most once per calendar day,
// no matter how many scheduler ticks or container restarts happen.
export async function runJob(
  name: string,
  fn: () => Promise<JobResult>,
  opts: { force?: boolean; notBeforeHour?: number } = {}
): Promise<{ ran: boolean; result?: JobResult; error?: string }> {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  if (!opts.force) {
    if (opts.notBeforeHour !== undefined && now.getHours() < opts.notBeforeHour) {
      return { ran: false };
    }
    const [run] = await db
      .select()
      .from(jobRuns)
      .where(eq(jobRuns.jobName, name));
    if (run?.lastSuccessDate === todayStr) return { ran: false };
  }

  try {
    const result = await fn();
    await db
      .insert(jobRuns)
      .values({
        jobName: name,
        lastRunAt: now,
        lastSuccessDate: todayStr,
        lastError: null,
      })
      .onConflictDoUpdate({
        target: jobRuns.jobName,
        set: { lastRunAt: now, lastSuccessDate: todayStr, lastError: null },
      });
    return { ran: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .insert(jobRuns)
      .values({ jobName: name, lastRunAt: now, lastError: message })
      .onConflictDoUpdate({
        target: jobRuns.jobName,
        set: { lastRunAt: now, lastError: message },
      });
    return { ran: true, error: message };
  }
}
