'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  History,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

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
import type { NamedAmount, Split, Stats } from '@/lib/subscriptions/stats';

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
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Stats</h1>
        <p className="text-muted-foreground">
          Where your money goes, normalized to monthly cost.
        </p>
      </div>

      <Section title="Overview">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ValueCard label="Active subscriptions" value={String(stats.activeCount)} />
          <ValueCard label="Monthly cost" value={money(stats.monthlyCost)} />
          <ValueCard label="Yearly cost" value={money(stats.yearlyCost)} />
          <ValueCard label="Cost per day" value={money(stats.costPerDay)} />
          <ValueCard
            label="Average monthly subscription cost"
            value={money(stats.avgMonthlyPerSub)}
          />
          <ValueCard
            label="Amount due this month"
            value={money(stats.dueThisMonth)}
          />
          <LogoValueCard
            label="Most expensive subscription"
            entry={stats.mostExpensive}
            symbol={mainSymbol}
            tone="text-destructive"
          />
          <LogoValueCard
            label="Cheapest subscription"
            entry={stats.leastExpensive}
            symbol={mainSymbol}
            tone="text-primary"
          />
          <ValueCard
            label="Manual renewals"
            value={String(stats.manualRenewalCount)}
          />
        </div>
      </Section>

      {monthlyBudget !== null && stats.budgetUsedPct !== null && (
        <Section title="Budget">
          <Card>
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
        </Section>
      )}

      <Section title="Trends & forecast">
        <div className="grid gap-4 sm:grid-cols-2">
          <ValueCard
            label="vs last month"
            value={`${stats.vsLastMonth >= 0 ? '+' : '−'}${money(Math.abs(stats.vsLastMonth))}`}
            sub={`${stats.vsLastMonthPct >= 0 ? '+' : ''}${stats.vsLastMonthPct.toFixed(1)}%`}
            tone={stats.vsLastMonth > 0 ? 'text-destructive' : 'text-primary'}
          />
          <ValueCard
            label="Heaviest upcoming month"
            value={stats.heaviestMonth ? money(stats.heaviestMonth.amount) : '—'}
            sub={stats.heaviestMonth?.label ?? ''}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">
              Total cost trend{' '}
              <span className="text-sm font-normal text-muted-foreground">
                (monthly cost, estimated from start dates)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ amount: { label: 'Monthly cost', color: 'var(--chart-1)' } }}
              className="h-64 w-full"
            >
              <AreaChart data={stats.costTrend}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={50} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value) => money(Number(value))}
                />
                <Area
                  dataKey="amount"
                  type="monotone"
                  fill="var(--chart-1)"
                  fillOpacity={0.15}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">
              Projected cost{' '}
              <span className="text-sm font-normal text-muted-foreground">
                (next 12 months, actual payment dates)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ amount: { label: 'Due', color: 'var(--chart-1)' } }}
              className="h-64 w-full"
            >
              <BarChart data={stats.projection}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={50} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value) => money(Number(value))}
                />
                <Bar dataKey="amount" fill="var(--chart-1)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </Section>

      <Section title="Split views">
        <div className="grid gap-4 lg:grid-cols-2">
          <SplitPie title="Category split" data={stats.byCategory} symbol={mainSymbol} />
          <SplitPie
            title="Payment method split"
            data={stats.byPaymentMethod}
            symbol={mainSymbol}
          />
          <SplitPie title="Billing cycle split" data={stats.byCycle} symbol={mainSymbol} />
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">
                Price distribution{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  (monthly cost, {mainSymbol})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ count: { label: 'Subscriptions', color: 'var(--chart-3)' } }}
                className="h-64 w-full"
              >
                <BarChart data={stats.priceDistribution}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--chart-3)" radius={6} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <SplitBar title="Member split" data={stats.byMember} symbol={mainSymbol} />
          <SplitBar title="Currency split" data={stats.byCurrency} symbol={mainSymbol} />
        </div>
      </Section>

      <Section title="History & lifetime">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ValueCard
            label="All-time spend (est.)"
            value={money(stats.allTimeSpend)}
          />
          <LogoYearsCard label="Oldest subscription" entry={stats.oldestSub} />
          <ValueCard
            label="Average subscription age"
            value={`${stats.avgAgeYears.toFixed(1)} yrs`}
          />
          <ValueCard
            label="Monthly savings"
            value={money(stats.savingsMonthly)}
            sub="from cancelled subscriptions"
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {stats.lifetimeTop.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">
                  Lifetime spend{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    (top 10, est.)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ amount: { label: 'Spend', color: 'var(--chart-5)' } }}
                  className="h-64 w-full"
                >
                  <BarChart data={stats.lifetimeTop} layout="vertical" margin={{ left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => money(Number(value))}
                    />
                    <Bar dataKey="amount" fill="var(--chart-5)" radius={6} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
          {stats.newSubsPerYear.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">New subscriptions per year</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ count: { label: 'New', color: 'var(--chart-2)' } }}
                  className="h-64 w-full"
                >
                  <BarChart data={stats.newSubsPerYear}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--chart-2)" radius={6} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ValueCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent>
        <p
          className={`font-heading text-3xl font-bold tracking-tight ${tone ?? 'text-primary'}`}
        >
          {value}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function EntryLogo({ entry }: { entry: { name: string; logo: string | null } }) {
  if (entry.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={entry.logo} alt="" className="size-8 rounded-md object-contain" />
    );
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
      {entry.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function LogoValueCard({
  label,
  entry,
  symbol,
  tone,
}: {
  label: string;
  entry: NamedAmount | null;
  symbol: string;
  tone: string;
}) {
  if (!entry) return <ValueCard label={label} value="—" />;
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div>
          <p className={`font-heading text-3xl font-bold tracking-tight ${tone}`}>
            {formatAmount(entry.amount, symbol)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {label} · {entry.name}
          </p>
        </div>
        <EntryLogo entry={entry} />
      </CardContent>
    </Card>
  );
}

function LogoYearsCard({
  label,
  entry,
}: {
  label: string;
  entry: { name: string; logo: string | null; years: number } | null;
}) {
  if (!entry) return <ValueCard label={label} value="—" />;
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div>
          <p className="font-heading text-3xl font-bold tracking-tight text-primary">
            {entry.years.toFixed(1)} yrs
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {label} · {entry.name}
          </p>
        </div>
        <EntryLogo entry={entry} />
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
        <ChartContainer config={chartConfig(data)} className="h-64 w-full">
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
