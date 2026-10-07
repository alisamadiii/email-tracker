import { sendDueNotifications } from '@/lib/notifications/dispatch';

export async function sendNotifications(today = new Date()) {
  const report = await sendDueNotifications(today);
  return { users: report.length, report };
}
