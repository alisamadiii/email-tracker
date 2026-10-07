import { requireSession } from '@/lib/session';

import { loadSubscriptionData } from './data';
import { SubscriptionsClient } from './subscriptions-client';

export default async function SubscriptionsPage() {
  const { user } = await requireSession();
  const data = await loadSubscriptionData(user.id);

  return (
    <SubscriptionsClient
      rows={data.rows}
      currencies={data.currencies}
      categories={data.categories}
      methods={data.methods}
      members={data.members}
      settings={data.settings}
    />
  );
}
