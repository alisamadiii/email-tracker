import { toMain } from './currency';
import { monthlyFactor } from './cycles';

export type StatSub = {
  id: string;
  name: string;
  price: number;
  rate: number;
  cycle: number;
  frequency: number;
  inactive: boolean;
  autoRenew: boolean;
  nextPayment: string;
  categoryName: string | null;
  paymentMethodName: string | null;
  payerName: string | null;
  currencyCode: string;
  replacementSubscriptionId: string | null;
};

export type Split = { label: string; monthly: number; count: number };

export type Stats = {
  activeCount: number;
  monthlyCost: number;
  yearlyCost: number;
  costPerDay: number;
  avgMonthlyPerSub: number;
  mostExpensive: { name: string; monthly: number } | null;
  leastExpensive: { name: string; monthly: number } | null;
  dueThisMonth: number;
  manualRenewalCount: number;
  byCategory: Split[];
  byPaymentMethod: Split[];
  byMember: Split[];
  byCycle: Split[];
  byCurrency: Split[];
  budgetUsedPct: number | null;
  savingsMonthly: number;
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
    ? { name: sorted[0].name, monthly: monthlyOf(sorted[0]) }
    : null;
  const leastExpensive = sorted.at(-1)
    ? { name: sorted.at(-1)!.name, monthly: monthlyOf(sorted.at(-1)!) }
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
  };
}
