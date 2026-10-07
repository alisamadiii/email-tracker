'use client';

import * as React from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  CalendarClock,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  deleteSubscription,
  toggleSubscriptionInactive,
} from '@/app/actions/subscriptions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatAmount, toMain } from '@/lib/subscriptions/currency';
import { CYCLE_LABELS, CYCLES, monthlyFactor } from '@/lib/subscriptions/cycles';

import { SubscriptionSheet } from './subscription-sheet';
import type {
  CategoryOption,
  CurrencyOption,
  EmailChoice,
  MemberOption,
  PaymentMethodOption,
  SettingsView,
  SubscriptionRow,
} from './types';

type Props = {
  rows: SubscriptionRow[];
  currencies: CurrencyOption[];
  categories: CategoryOption[];
  methods: PaymentMethodOption[];
  members: MemberOption[];
  emailChoices: EmailChoice[];
  settings: SettingsView;
};

const ALL = 'all';

export function SubscriptionsClient({
  rows,
  currencies,
  categories,
  methods,
  members,
  emailChoices,
  settings,
}: Props) {
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState(ALL);
  const [stateFilter, setStateFilter] = React.useState<'active' | 'inactive' | 'all'>(
    settings.hideDisabled ? 'active' : 'all'
  );
  const [sort, setSort] = React.useState<'next' | 'price' | 'name'>('next');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SubscriptionRow | null>(null);
  const [deleting, setDeleting] = React.useState<SubscriptionRow | null>(null);

  const mainCurrency =
    currencies.find((c) => c.id === settings.mainCurrencyId) ?? currencies[0];

  const monthlyOf = React.useCallback(
    (s: SubscriptionRow) =>
      toMain(s.price, s.currencyRate) * monthlyFactor(s.cycle, s.frequency),
    []
  );

  const active = rows.filter((s) => !s.inactive);
  const monthlyTotal = active.reduce((sum, s) => sum + monthlyOf(s), 0);
  const dueSoon = active.filter((s) => {
    const days = differenceInCalendarDays(parseISO(s.nextPayment), new Date());
    return days >= 0 && days <= 7;
  });

  const filtered = rows
    .filter((s) => {
      if (stateFilter === 'active' && s.inactive) return false;
      if (stateFilter === 'inactive' && !s.inactive) return false;
      if (categoryFilter !== ALL && s.categoryId !== categoryFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    })
    .sort((a, b) => {
      if (settings.disabledToBottom && a.inactive !== b.inactive) {
        return a.inactive ? 1 : -1;
      }
      switch (sort) {
        case 'price':
          return monthlyOf(b) - monthlyOf(a);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return a.nextPayment.localeCompare(b.nextPayment);
      }
    });

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(sub: SubscriptionRow) {
    setEditing(sub);
    setSheetOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteSubscription(deleting.id);
    setDeleting(null);
    if (result.error) toast.error(result.error);
    else toast.success('Subscription deleted');
  }

  async function handleToggle(sub: SubscriptionRow) {
    const result = await toggleSubscriptionInactive(sub.id);
    if (result.error) toast.error(result.error);
    else toast.success(sub.inactive ? 'Reactivated' : 'Marked inactive');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Subscriptions
          </h1>
          <p className="text-muted-foreground">
            {active.length} active · {formatAmount(monthlyTotal, mainCurrency?.symbol ?? '$')}
            /month
          </p>
        </div>
        <Button onClick={openNew} size="lg">
          <Plus /> New subscription
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Wallet className="size-5" />}
          label="Monthly cost"
          value={formatAmount(monthlyTotal, mainCurrency?.symbol ?? '$')}
        />
        <StatCard
          icon={<Wallet className="size-5" />}
          label="Yearly cost"
          value={formatAmount(monthlyTotal * 12, mainCurrency?.symbol ?? '$')}
        />
        <StatCard
          icon={<CalendarClock className="size-5" />}
          label="Due in 7 days"
          value={String(dueSoon.length)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscriptions…"
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={stateFilter}
          onValueChange={(v) => setStateFilter(v as typeof stateFilter)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next">Next payment</SelectItem>
            <SelectItem value="price">Highest cost</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Wallet className="size-10 text-muted-foreground" />
            <p className="font-heading text-lg font-semibold">
              No subscriptions yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first subscription and Business Tracker will watch the
              renewal date for you.
            </p>
            <Button onClick={openNew}>
              <Plus /> Add subscription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              settings={settings}
              mainSymbol={mainCurrency?.symbol ?? '$'}
              monthly={monthlyOf(sub)}
              onEdit={() => openEdit(sub)}
              onDelete={() => setDeleting(sub)}
              onToggle={() => handleToggle(sub)}
            />
          ))}
        </div>
      )}

      <SubscriptionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        currencies={currencies}
        categories={categories}
        methods={methods}
        members={members}
        emailChoices={emailChoices}
        allSubscriptions={rows}
        mainCurrencyId={settings.mainCurrencyId}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the subscription and its history. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({
  sub,
  settings,
  mainSymbol,
  monthly,
  onEdit,
  onDelete,
  onToggle,
}: {
  sub: SubscriptionRow;
  settings: SettingsView;
  mainSymbol: string;
  monthly: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const days = differenceInCalendarDays(parseISO(sub.nextPayment), new Date());
  const oneTime = sub.cycle === CYCLES.oneTime;

  const price = settings.showMonthlyPrice
    ? `${formatAmount(monthly, mainSymbol)}/mo`
    : formatAmount(sub.price, sub.currencySymbol);

  return (
    <Card
      className={
        sub.inactive ? 'opacity-60 transition-opacity hover:opacity-90' : undefined
      }
    >
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <SubLogo sub={sub} />
          <div className="min-w-0">
            <CardTitle className="truncate font-semibold">{sub.name}</CardTitle>
            <CardDescription>
              {CYCLE_LABELS[sub.cycle]}
              {sub.frequency > 1 && ` ×${sub.frequency}`}
              {sub.payerName && ` · ${sub.payerName}`}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggle}>
                <Power /> {sub.inactive ? 'Reactivate' : 'Mark inactive'}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex items-end justify-between">
        <p className="font-heading text-2xl font-bold">{price}</p>
        {!sub.inactive && !oneTime && (
          <Badge variant={days <= 3 ? 'destructive' : days <= 7 ? 'default' : 'secondary'}>
            {days === 0
              ? 'Due today'
              : days < 0
                ? 'Overdue'
                : `In ${days} day${days === 1 ? '' : 's'}`}
          </Badge>
        )}
        {sub.inactive && <Badge variant="outline">Inactive</Badge>}
      </CardContent>

      <CardFooter className="flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{format(parseISO(sub.nextPayment), 'MMM d, yyyy')}</span>
        {sub.categoryName && <Badge variant="outline">{sub.categoryName}</Badge>}
        {sub.paymentMethodName && (
          <Badge variant="outline">{sub.paymentMethodName}</Badge>
        )}
        {!sub.autoRenew && !oneTime && !sub.inactive && (
          <Badge variant="outline">Manual renew</Badge>
        )}
      </CardFooter>
    </Card>
  );
}

export function SubLogo({ sub }: { sub: Pick<SubscriptionRow, 'name' | 'logo'> }) {
  if (sub.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sub.logo}
        alt=""
        className="size-10 shrink-0 rounded-lg object-contain"
      />
    );
  }
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-heading text-sm font-bold text-primary">
      {sub.name.slice(0, 2).toUpperCase()}
    </div>
  );
}
