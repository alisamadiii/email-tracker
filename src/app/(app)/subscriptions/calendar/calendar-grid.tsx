'use client';

import { format, parseISO } from 'date-fns';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatAmount } from '@/lib/subscriptions/currency';
import { cn } from '@/lib/utils';

export type CalendarDay = {
  date: string;
  inMonth: boolean;
  payments: {
    id: string;
    name: string;
    logo: string | null;
    price: number;
    currencySymbol: string;
  }[];
};

const WEEKDAYS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarGrid({
  days,
  weekStartsOn,
}: {
  days: CalendarDay[];
  weekStartsOn: 0 | 1;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekdays = weekStartsOn === 0 ? WEEKDAYS_SUN : WEEKDAYS_MON;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {weekdays.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell key={day.date} day={day} isToday={day.date === today} />
        ))}
      </div>
    </div>
  );
}

function DayCell({ day, isToday }: { day: CalendarDay; isToday: boolean }) {
  const dayNumber = Number(day.date.slice(-2));
  const total = day.payments.reduce((sum, p) => sum + p.price, 0);

  const cell = (
    <div
      className={cn(
        'min-h-24 border-b border-r p-1.5 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:min-h-28',
        !day.inMonth && 'bg-muted/30 text-muted-foreground',
        day.payments.length > 0 && 'cursor-pointer hover:bg-accent/60'
      )}
    >
      <span
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium',
          isToday && 'bg-primary font-bold text-primary-foreground'
        )}
      >
        {dayNumber}
      </span>
      {day.payments.length > 0 && (
        <div className="mt-1 space-y-1">
          <div className="flex flex-wrap gap-1">
            {day.payments.slice(0, 3).map((p) =>
              p.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.logo}
                  alt={p.name}
                  title={p.name}
                  className="size-6 rounded-md bg-background object-contain ring-1 ring-border"
                />
              ) : (
                <span
                  key={p.id}
                  title={p.name}
                  className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-[9px] font-bold text-primary"
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              )
            )}
            {day.payments.length > 3 && (
              <span className="flex size-6 items-center justify-center rounded-md bg-muted text-[9px] font-semibold">
                +{day.payments.length - 3}
              </span>
            )}
          </div>
          <p className="hidden truncate text-[10px] font-medium text-muted-foreground sm:block">
            {day.payments.length} payment{day.payments.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );

  if (day.payments.length === 0) return cell;

  return (
    <Popover>
      <PopoverTrigger asChild>{cell}</PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <p className="mb-2 font-heading text-sm font-semibold">
          {format(parseISO(day.date), 'EEEE, MMM d')}
        </p>
        <ul className="space-y-2">
          {day.payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              {p.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.logo}
                  alt=""
                  className="size-7 rounded-md object-contain"
                />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="flex-1 truncate">{p.name}</span>
              <span className="font-medium">
                {formatAmount(p.price, p.currencySymbol)}
              </span>
            </li>
          ))}
        </ul>
        {day.payments.length > 1 && (
          <p className="mt-3 border-t pt-2 text-right text-sm font-semibold">
            {formatAmount(total, day.payments[0].currencySymbol)}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
