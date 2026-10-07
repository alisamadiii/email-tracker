import { requireSession } from '@/lib/session';
import { computeStats, type StatSub } from '@/lib/subscriptions/stats';

import { loadSubscriptionData } from '../data';
import { StatsClient } from './stats-client';

export default async function StatsPage() {
  const { user } = await requireSession();
  const data = await loadSubscriptionData(user.id);

  const statSubs: StatSub[] = data.rows.map((r) => ({
    id: r.id,
    name: r.name,
    logo: r.logo,
    startDate: r.startDate,
    cancellationDate: r.cancellationDate,
    price: r.price,
    rate: r.currencyRate,
    cycle: r.cycle,
    frequency: r.frequency,
    inactive: r.inactive,
    autoRenew: r.autoRenew,
    nextPayment: r.nextPayment,
    categoryName: r.categoryName,
    paymentMethodName: r.paymentMethodName,
    payerName: r.payerName,
    currencyCode: r.currencyCode,
    replacementSubscriptionId: r.replacementSubscriptionId,
  }));

  const stats = computeStats(statSubs, {
    monthlyBudget: data.settings.monthlyBudget,
    today: new Date(),
  });

  const mainCurrency =
    data.currencies.find((c) => c.id === data.settings.mainCurrencyId) ??
    data.currencies[0];

  return (
    <StatsClient
      stats={stats}
      mainSymbol={mainCurrency?.symbol ?? '$'}
      monthlyBudget={data.settings.monthlyBudget}
    />
  );
}
