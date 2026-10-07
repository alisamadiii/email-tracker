import { describe, expect, it } from 'vitest';

import {
  CYCLES,
  advanceNextPayment,
  advanceUntilFuture,
  monthlyFactor,
} from '../cycles';

const d = (s: string) => new Date(`${s}T00:00:00`);

describe('advanceNextPayment', () => {
  it('advances by cycle × frequency', () => {
    expect(advanceNextPayment(d('2026-01-01'), CYCLES.daily, 3)).toEqual(
      d('2026-01-04')
    );
    expect(advanceNextPayment(d('2026-01-01'), CYCLES.weekly, 2)).toEqual(
      d('2026-01-15')
    );
    expect(advanceNextPayment(d('2026-01-31'), CYCLES.monthly, 1)).toEqual(
      d('2026-02-28')
    );
    expect(advanceNextPayment(d('2024-02-29'), CYCLES.yearly, 1)).toEqual(
      d('2025-02-28')
    );
  });

  it('leaves one-time untouched', () => {
    expect(advanceNextPayment(d('2026-01-01'), CYCLES.oneTime, 1)).toEqual(
      d('2026-01-01')
    );
  });
});

describe('advanceUntilFuture', () => {
  it('skips multiple missed cycles', () => {
    expect(
      advanceUntilFuture(d('2026-01-01'), CYCLES.monthly, 1, d('2026-04-15'))
    ).toEqual(d('2026-05-01'));
  });

  it('keeps a date that is already today', () => {
    expect(
      advanceUntilFuture(d('2026-04-01'), CYCLES.monthly, 1, d('2026-04-01'))
    ).toEqual(d('2026-04-01'));
  });

  it('never advances one-time subscriptions', () => {
    expect(
      advanceUntilFuture(d('2020-01-01'), CYCLES.oneTime, 1, d('2026-01-01'))
    ).toEqual(d('2020-01-01'));
  });
});

describe('monthlyFactor', () => {
  it('matches the Wallos normalization', () => {
    expect(monthlyFactor(CYCLES.daily, 1)).toBeCloseTo(30);
    expect(monthlyFactor(CYCLES.weekly, 1)).toBeCloseTo(4.35);
    expect(monthlyFactor(CYCLES.monthly, 1)).toBe(1);
    expect(monthlyFactor(CYCLES.monthly, 3)).toBeCloseTo(1 / 3);
    expect(monthlyFactor(CYCLES.yearly, 1)).toBeCloseTo(1 / 12);
    expect(monthlyFactor(CYCLES.oneTime, 1)).toBe(0);
  });
});
