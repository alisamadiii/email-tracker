import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  isAfter,
  isSameDay,
} from 'date-fns';

export const CYCLES = {
  daily: 1,
  weekly: 2,
  monthly: 3,
  yearly: 4,
  oneTime: 5,
} as const;

export const CYCLE_LABELS: Record<number, string> = {
  1: 'Daily',
  2: 'Weekly',
  3: 'Monthly',
  4: 'Yearly',
  5: 'One-time',
};

export function advanceNextPayment(
  current: Date,
  cycle: number,
  frequency: number
): Date {
  switch (cycle) {
    case CYCLES.daily:
      return addDays(current, frequency);
    case CYCLES.weekly:
      return addWeeks(current, frequency);
    case CYCLES.monthly:
      return addMonths(current, frequency);
    case CYCLES.yearly:
      return addYears(current, frequency);
    default:
      return current;
  }
}

// Advance until strictly in the future relative to `today` (today itself counts
// as not yet due-advanced, matching "payment happens today, advance tomorrow").
export function advanceUntilFuture(
  current: Date,
  cycle: number,
  frequency: number,
  today: Date,
  maxSteps = 1000
): Date {
  if (cycle === CYCLES.oneTime) return current;
  let next = current;
  let steps = 0;
  while (!isAfter(next, today) && !isSameDay(next, today) && steps < maxSteps) {
    next = advanceNextPayment(next, cycle, frequency);
    steps++;
  }
  return next;
}

// Factor that converts a subscription price to a per-month amount.
export function monthlyFactor(cycle: number, frequency: number): number {
  const f = Math.max(1, frequency);
  switch (cycle) {
    case CYCLES.daily:
      return 30 / f;
    case CYCLES.weekly:
      return 4.35 / f;
    case CYCLES.monthly:
      return 1 / f;
    case CYCLES.yearly:
      return 1 / (12 * f);
    default:
      return 0;
  }
}
