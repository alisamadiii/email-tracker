'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  PiggyBank,
  RefreshCcw,
  Wallet,
} from 'lucide-react';
import { Cell, Pie, PieChart, Bar, BarChart, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { formatAmount } from '@/lib/subscriptions/currency';
import type { Split, Stats } from '@/lib/subscriptions/stats';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

type Props = {
  stats: Stats;
  mainSymbol: string;
  monthlyBudget: number | null;
};

export function StatsClient({ stats, mainSymbol, monthlyBudget }: Props) {
  const money = (n: number) => formatAmount(n, mainSymbol);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Stats</h1>
        <p className="text-muted-foreground">
          Where your money goes, normalized to monthly cost.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BigStat
          icon={<Wallet className="size-5" />}
          label="Monthly cost"
          value={money(stats.monthlyCost)}
          sub={`${money(stats.costPerDay)} per day`}
        />
        <BigStat
          icon={<CalendarClock className="size-5" />}
          label="Yearly cost"
          value={money(stats.yearlyCost)}
          sub={`${stats.activeCount} active subscriptions`}
        />
        <BigStat
          icon={<CalendarClock className="size-5" />}
          label="Due this month"
          value={money(stats.dueThisMonth)}
          sub={`${stats.manualRenewalCount} manual renewals`}
        />
        <BigStat
          icon={<PiggyBank className="size-5" />}
          label="Monthly savings"
          value={money(stats.savingsMonthly)}
          sub="from cancelled subscriptions"
        />
      </div>

      {monthlyBudget !== null && stats.budgetUsedPct !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <p className="font-heading text-2xl font-bold">
                {money(stats.monthlyCost)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  of {money(monthlyBudget)}
                </span>
              </p>
              <p
                className={
                  stats.budgetUsedPct > 100
                    ? 'font-semibold text-destructive'
                    : 'font-semibold text-primary'
                }
              >
                {Math.round(stats.budgetUsedPct)}%
              </p>
            </div>
            <Progress value={Math.min(100, stats.budgetUsedPct)} />
            <p className="text-sm text-muted-foreground">
              {stats.budgetUsedPct > 100 ? (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <ArrowUpRight className="size-4" />
                  {money(stats.monthlyCost - monthlyBudget)} over budget
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <ArrowDownRight className="size-4" />
                  {money(monthlyBudget - stats.monthlyCost)} remaining
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SplitPie title="By category" data={stats.byCategory} symbol={mainSymbol} />
        <SplitPie title="By payment method" data={stats.byPaymentMethod} symbol={mainSymbol} />
        <SplitBar title="By billing cycle" data={stats.byCycle} symbol={mainSymbol} />
        <SplitBar title="By member" data={stats.byMember} symbol={mainSymbol} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ExtremeCard
          label="Most expensive"
          entry={stats.mostExpensive}
          symbol={mainSymbol}
          tone="text-destructive"
        />
        <ExtremeCard
          label="Cheapest"
          entry={stats.leastExpensive}
          symbol={mainSymbol}
          tone="text-primary"
        />
      </div>
    </div>
  );
}

function BigStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-heading text-3xl font-bold tracking-tight">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function chartConfig(data: Split[]): ChartConfig {
  return Object.fromEntries(
    data.map((d, i) => [
      d.label,
      { label: d.label, color: CHART_COLORS[i % CHART_COLORS.length] },
    ])
  );
}

function SplitPie({
  title,
  data,
  symbol,
}: {
  title: string;
  data: Split[];
  symbol: string;
}) {
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig(data)} className="mx-auto aspect-square max-h-64">
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="label" />}
              formatter={(value) => formatAmount(Number(value), symbol)}
            />
            <Pie
              data={data}
              dataKey="monthly"
              nameKey="label"
              innerRadius={55}
              strokeWidth={4}
            >
              {data.map((d, i) => (
                <Cell key={d.label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="mt-2 space-y-1 text-sm">
          {data.slice(0, 5).map((d, i) => (
            <li key={d.label} className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="flex-1 truncate">{d.label}</span>
              <span className="font-medium">{formatAmount(d.monthly, symbol)}/mo</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SplitBar({
  title,
  data,
  symbol,
}: {
  title: string;
  data: Split[];
  symbol: string;
}) {
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig(data)} className="max-h-64 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <ChartTooltip
              content={<ChartTooltipContent nameKey="label" />}
              formatter={(value) => formatAmount(Number(value), symbol)}
            />
            <Bar dataKey="monthly" radius={6}>
              {data.map((d, i) => (
                <Cell key={d.label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ExtremeCard({
  label,
  entry,
  symbol,
  tone,
}: {
  label: string;
  entry: { name: string; monthly: number } | null;
  symbol: string;
  tone: string;
}) {
  if (!entry) return null;
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-heading text-xl font-bold">{entry.name}</p>
        </div>
        <p className={`font-heading text-2xl font-bold ${tone}`}>
          {formatAmount(entry.monthly, symbol)}/mo
        </p>
      </CardContent>
    </Card>
  );
}
