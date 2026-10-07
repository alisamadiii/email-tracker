import { NextRequest, NextResponse } from 'next/server';

import { advancePayments } from '@/lib/jobs/advance-payments';
import { refreshFx } from '@/lib/jobs/refresh-fx';
import { runJob } from '@/lib/jobs/run-job';
import { sendNotifications } from '@/lib/jobs/send-notifications';

const JOBS: Record<string, () => Promise<Record<string, unknown>>> = {
  'advance-payments': () => advancePayments(),
  'refresh-fx': () => refreshFx(),
  'send-notifications': () => sendNotifications(),
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ job: string }> }
) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { job } = await params;
  const fn = JOBS[job];
  if (!fn) {
    return NextResponse.json({ error: 'Unknown job' }, { status: 404 });
  }

  const force = request.nextUrl.searchParams.get('force') === '1';
  const outcome = await runJob(job, fn, {
    force,
    notBeforeHour: job === 'send-notifications' && !force ? 9 : undefined,
  });
  return NextResponse.json(outcome);
}
