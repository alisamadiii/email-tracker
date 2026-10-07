import { toMain } from './currency';
import { CYCLES, advanceNextPayment, monthlyFactor } from './cycles';

export type StatSub = {
  id: string;
  name: string;
  logo: string | null;
  price: number;
  rate: number;
  cycle: number;
  frequency: number;
  inactive: boolean;
  autoRenew: boolean;
  nextPayment: string;
  startDate: string | null;
  cancellationDate: string | null;
  categoryName: string | null;
  paymentMethodName: string | null;
  payerName: string | null;
  currencyCode: string;
  replacementSubscriptionId: string | null;
};

export type Split = { label: string; monthly: number; count: number };
export type MonthPoint = { month: string; label: string; amount: number };
export type NamedAmount = { name: string; logo: string | null; amount: number };

export type Stats = {
  activeCount: number;
  monthlyCost: number;
  yearlyCost: number;
  costPerDay: number;
  avgMonthlyPerSub: number;
  mostExpensive: NamedAmount | null;
  leastExpensive: NamedAmount | null;
  dueThisMonth: number;
  manualRenewalCount: number;
  byCategory: Split[];
  byPaymentMethod: Split[];
  byMember: Split[];
  byCycle: Split[];
  byCurrency: Split[];
  budgetUsedPct: number | null;
  savingsMonthly: number;
  // Trends & forecast
  vsLastMonth: number;
  vsLastMonthPct: number;
  costTrend: MonthPoint[];
  projection: MonthPoint[];
  heaviestMonth: MonthPoint | null;
  // Distribution
  priceDistribution: { bucket: string; count: number }[];
  // History & lifetime
  allTimeSpend: number;
  oldestSub: { name: string; logo: string | null; years: number } | null;
  avgAgeYears: number;
  lifetimeTop: NamedAmount[];
  newSubsPerYear: { year: string; count: number }[];
};

const CYCLE_NAMES: Record<number, string> = {
  1: 'Daily',
  2: 'Weekly',
  3: 'Monthly',
  4: 'Yearly',
  5: 'One-time',
};

export function computeStats(
  subs: StatSub[],
  opts: { monthlyBudget: number | null; today: Date }
): Stats {
  const monthlyOf = (s: StatSub) =>
    toMain(s.price, s.rate) * monthlyFactor(s.cycle, s.frequency);

  const active = subs.filter((s) => !s.inactive);
  const monthlyCost = active.reduce((sum, s) => sum + monthlyOf(s), 0);

  const recurring = active.filter((s) => monthlyOf(s) > 0);
  const sorted = [...recurring].sort((a, b) => monthlyOf(b) - monthlyOf(a));
  const mostExpensive = sorted[0]
    ? { name: sorted[0].name, logo: sorted[0].logo, amount: monthlyOf(sorted[0]) }
    : null;
  const leastExpensive = sorted.at(-1)
    ? {
        name: sorted.at(-1)!.name,
        logo: sorted.at(-1)!.logo,
        amount: monthlyOf(sorted.at(-1)!),
      }
    : null;

  const { today } = opts;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const dueThisMonth = active
    .filter((s) => {
      const d = new Date(`${s.nextPayment}T00:00:00`);
      return d >= monthStart && d <= monthEnd;
    })
    .reduce((sum, s) => sum + toMain(s.price, s.rate), 0);

  const split = (key: (s: StatSub) => string | null, fallback: string) => {
    const map = new Map<string, Split>();
    for (const s of active) {
      const label = key(s) ?? fallback;
      const entry = map.get(label) ?? { label, monthly: 0, count: 0 };
      entry.monthly += monthlyOf(s);
      entry.count += 1;
      map.set(label, entry);
    }
    return [...map.values()].sort((a, b) => b.monthly - a.monthly);
  };

  // Savings: inactive subs' monthly cost, net of the active sub replacing them.
  const byId = new Map(subs.map((s) => [s.id, s]));
  let savingsMonthly = 0;
  for (const s of subs) {
    if (!s.inactive) continue;
    const replacement = s.replacementSubscriptionId
      ? byId.get(s.replacementSubscriptionId)
      : null;
    const replacementMonthly =
      replacement && !replacement.inactive ? monthlyOf(replacement) : 0;
    savingsMonthly += Math.max(0, monthlyOf(s) - replacementMonthly);
  }

  // ----- Trends & forecast -----

  const startOf = (s: StatSub) =>
    new Date(`${s.startDate ?? s.nextPayment}T00:00:00`);
  const endOf = (s: StatSub) =>
    s.inactive
      ? new Date(`${s.cancellationDate ?? s.nextPayment}T00:00:00`)
      : null;

  // Estimated recurring cost during a given month, from start/cancellation dates.
  const monthlyCostAt = (year: number, month: number) => {
    const mStart = new Date(year, month, 1);
    const mEnd = new Date(year, month + 1, 0);
    return subs.reduce((sum, s) => {
      const factor = monthlyFactor(s.cycle, s.frequency);
      if (factor === 0) return sum;
      if (startOf(s) > mEnd) return sum;
      const end = endOf(s);
      if (end && end < mStart) return sum;
      return sum + toMain(s.price, s.rate) * factor;
    }, 0);
  };

  const monthLabel = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const costTrend: MonthPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    costTrend.push({
      month: monthKey(d),
      label: monthLabel(d),
      amount: monthlyCostAt(d.getFullYear(), d.getMonth()),
    });
  }

  const lastMonthCost = monthlyCostAt(
    today.getFullYear(),
    today.getMonth() - 1
  );
  const vsLastMonth = monthlyCost - lastMonthCost;
  const vsLastMonthPct = lastMonthCost > 0 ? (vsLastMonth / lastMonthCost) * 100 : 0;

  // Projection: actual payment occurrences per month for the next 12 months.
  const horizon = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  const projectionMap = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    projectionMap.set(monthKey(d), 0);
  }
  for (const s of active) {
    let occurrence = new Date(`${s.nextPayment}T00:00:00`);
    let guard = 0;
    while (occurrence < horizon && guard < 500) {
      const key = monthKey(occurrence);
      if (projectionMap.has(key)) {
        projectionMap.set(
          key,
          (projectionMap.get(key) ?? 0) + toMain(s.price, s.rate)
        );
      }
      if (s.cycle === CYCLES.oneTime || !s.autoRenew) break;
      occurrence = advanceNextPayment(occurrence, s.cycle, s.frequency);
      guard++;
    }
  }
  const projection: MonthPoint[] = [...projectionMap.entries()].map(
    ([key, amount]) => {
      const [y, m] = key.split('-').map(Number);
      return { month: key, label: monthLabel(new Date(y, m - 1, 1)), amount };
    }
  );
  const heaviestMonth = projection.reduce<MonthPoint | null>(
    (best, p) => (p.amount > (best?.amount ?? 0) ? p : best),
    null
  );

  // ----- Price distribution (monthly cost buckets) -----
  const buckets: [string, (n: number) => boolean][] = [
    ['0–5', (n) => n < 5],
    ['5–10', (n) => n >= 5 && n < 10],
    ['10–20', (n) => n >= 10 && n < 20],
    ['20–50', (n) => n >= 20 && n < 50],
    ['50+', (n) => n >= 50],
  ];
  const priceDistribution = buckets.map(([bucket, test]) => ({
    bucket,
    count: recurring.filter((s) => test(monthlyOf(s))).length,
  }));

  // ----- History & lifetime -----
  const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;
  const lifetimeOf = (s: StatSub) => {
    const start = startOf(s);
    const end = endOf(s) ?? today;
    if (s.cycle === CYCLES.oneTime) return toMain(s.price, s.rate);
    const months = Math.max(0, (end.getTime() - start.getTime()) / MS_PER_MONTH);
    return months * toMain(s.price, s.rate) * monthlyFactor(s.cycle, s.frequency);
  };
  const allTimeSpend = subs.reduce((sum, s) => sum + lifetimeOf(s), 0);

  const ageYears = (s: StatSub) =>
    Math.max(0, (today.getTime() - startOf(s).getTime()) / (MS_PER_MONTH * 12));
  const oldest = [...subs].sort((a, b) => ageYears(b) - ageYears(a))[0];
  const oldestSub = oldest
    ? { name: oldest.name, logo: oldest.logo, years: ageYears(oldest) }
    : null;
  const avgAgeYears = subs.length
    ? subs.reduce((sum, s) => sum + ageYears(s), 0) / subs.length
    : 0;

  const lifetimeTop: NamedAmount[] = [...subs]
    .map((s) => ({ name: s.name, logo: s.logo, amount: lifetimeOf(s) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const yearCounts = new Map<string, number>();
  for (const s of subs) {
    const year = String(startOf(s).getFullYear());
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
  }
  const newSubsPerYear = [...yearCounts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));

  return {
    activeCount: active.length,
    monthlyCost,
    yearlyCost: monthlyCost * 12,
    costPerDay: monthlyCost / 30,
    avgMonthlyPerSub: recurring.length ? monthlyCost / recurring.length : 0,
    mostExpensive,
    leastExpensive,
    dueThisMonth,
    manualRenewalCount: active.filter((s) => !s.autoRenew && s.cycle !== 5)
      .length,
    byCategory: split((s) => s.categoryName, 'No category'),
    byPaymentMethod: split((s) => s.paymentMethodName, 'None'),
    byMember: split((s) => s.payerName, 'Me'),
    byCycle: split((s) => CYCLE_NAMES[s.cycle] ?? 'Other', 'Other'),
    byCurrency: split((s) => s.currencyCode, '—'),
    budgetUsedPct:
      opts.monthlyBudget && opts.monthlyBudget > 0
        ? (monthlyCost / opts.monthlyBudget) * 100
        : null,
    savingsMonthly,
    vsLastMonth,
    vsLastMonthPct,
    costTrend,
    projection,
    heaviestMonth,
    priceDistribution,
    allTimeSpend,
    oldestSub,
    avgAgeYears,
    lifetimeTop,
    newSubsPerYear,
  };
}
