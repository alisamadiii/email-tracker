import cron from 'node-cron';

import { advancePayments } from './advance-payments';
import { refreshFx } from './refresh-fx';
import { runJob } from './run-job';
import { sendNotifications } from './send-notifications';

declare global {
  var __btScheduler: boolean | undefined;
}

export async function sweep() {
  await runJob('advance-payments', () => advancePayments());
  await runJob('refresh-fx', () => refreshFx());
  // Hour gate keeps renewal messages from firing in the middle of the night.
  await runJob('send-notifications', () => sendNotifications(), {
    notBeforeHour: 9,
  });
}

export function startScheduler() {
  if (globalThis.__btScheduler) return;
  globalThis.__btScheduler = true;

  cron.schedule('*/15 * * * *', () => {
    sweep().catch((error) => console.error('[scheduler] sweep failed', error));
  });

  // Boot sweep so restarts never miss a day; delayed so the server and DB
  // are fully up first.
  setTimeout(() => {
    sweep().catch((error) =>
      console.error('[scheduler] boot sweep failed', error)
    );
  }, 10_000);

  console.log('[scheduler] started (15m tick)');
}
