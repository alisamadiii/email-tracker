import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { requireSession } from '@/lib/session';
import { CYCLES, advanceNextPayment } from '@/lib/subscriptions/cycles';

import { loadSubscriptionData } from '../data';
import { CalendarGrid, type CalendarDay } from './calendar-grid';
import { MonthNav } from './month-nav';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { user } = await requireSession();
  const { month } = await searchParams;

  const parsed = month ? parse(month, 'yyyy-MM', new Date()) : new Date();
  const current = isValid(parsed) ? parsed : new Date();

  const data = await loadSubscriptionData(user.id);
  const weekStartsOn = data.settings.weekStart === 0 ? 0 : 1;

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });

  // Project each active subscription's payments landing inside the grid.
  const paymentsByDay = new Map<string, CalendarDay['payments']>();
  for (const sub of data.rows) {
    if (sub.inactive) continue;
    let occurrence = parseISO(sub.nextPayment);
    let guard = 0;
    while (occurrence <= gridEnd && guard < 100) {
      if (occurrence >= gridStart) {
        const key = format(occurrence, 'yyyy-MM-dd');
        const list = paymentsByDay.get(key) ?? [];
        list.push({
          id: sub.id,
          name: sub.name,
          logo: sub.logo,
          price: sub.price,
          currencySymbol: sub.currencySymbol,
        });
        paymentsByDay.set(key, list);
      }
      if (sub.cycle === CYCLES.oneTime || !sub.autoRenew) break;
      occurrence = advanceNextPayment(occurrence, sub.cycle, sub.frequency);
      guard++;
    }
  }

  const days: CalendarDay[] = eachDayOfInterval({
    start: gridStart,
    end: gridEnd,
  }).map((d) => ({
    date: format(d, 'yyyy-MM-dd'),
    inMonth: d >= monthStart && d <= monthEnd,
    payments: paymentsByDay.get(format(d, 'yyyy-MM-dd')) ?? [],
  }));

  const monthKey = format(current, 'yyyy-MM');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Calendar
          </h1>
          <p className="text-muted-foreground">
            Every renewal on its payment day.
          </p>
        </div>
        <MonthNav
          label={format(current, 'MMMM yyyy')}
          prev={format(addMonths(current, -1), 'yyyy-MM')}
          next={format(addMonths(current, 1), 'yyyy-MM')}
          isCurrent={monthKey === format(new Date(), 'yyyy-MM')}
        />
      </div>
      <CalendarGrid days={days} weekStartsOn={weekStartsOn} />
    </div>
  );
}
