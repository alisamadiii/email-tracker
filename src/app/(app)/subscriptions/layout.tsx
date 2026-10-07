import { requireSession } from '@/lib/session';
import { ensureSubscriptionDefaults } from '@/lib/subscriptions/seed';

export default async function SubscriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();
  await ensureSubscriptionDefaults(user.id);

  return <>{children}</>;
}
