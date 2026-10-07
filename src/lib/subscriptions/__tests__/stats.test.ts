import { describe, expect, it } from 'vitest';

import { computeStats, type StatSub } from '../stats';

const base: Omit<StatSub, 'id' | 'name' | 'price' | 'cycle'> = {
  rate: 1,
  frequency: 1,
  inactive: false,
  autoRenew: true,
  nextPayment: '2026-10-15',
  categoryName: 'Streaming',
  paymentMethodName: 'Credit Card',
  payerName: null,
  currencyCode: 'USD',
  replacementSubscriptionId: null,
};

const today = new Date('2026-10-07T00:00:00');

describe('computeStats', () => {
  it('normalizes cycles to monthly cost', () => {
    const stats = computeStats(
      [
        { ...base, id: 'a', name: 'Netflix', price: 12, cycle: 3 },
        { ...base, id: 'b', name: 'Domain', price: 120, cycle: 4 },
      ],
      { monthlyBudget: null, today }
    );
    expect(stats.monthlyCost).toBeCloseTo(12 + 10);
    expect(stats.yearlyCost).toBeCloseTo(264);
    expect(stats.activeCount).toBe(2);
    expect(stats.mostExpensive?.name).toBe('Netflix');
  });

  it('converts foreign currency via rate (price / rate)', () => {
    const stats = computeStats(
      [{ ...base, id: 'a', name: 'EU sub', price: 10, cycle: 3, rate: 0.9 }],
      { monthlyBudget: null, today }
    );
    expect(stats.monthlyCost).toBeCloseTo(10 / 0.9);
  });

  it('computes budget usage and savings net of replacement', () => {
    const stats = computeStats(
      [
        { ...base, id: 'old', name: 'Cable', price: 60, cycle: 3, inactive: true, replacementSubscriptionId: 'new' },
        { ...base, id: 'new', name: 'Streaming', price: 15, cycle: 3 },
      ],
      { monthlyBudget: 30, today }
    );
    expect(stats.savingsMonthly).toBeCloseTo(45);
    expect(stats.budgetUsedPct).toBeCloseTo(50);
  });

  it('counts due this month and manual renewals', () => {
    const stats = computeStats(
      [
        { ...base, id: 'a', name: 'A', price: 10, cycle: 3, nextPayment: '2026-10-20' },
        { ...base, id: 'b', name: 'B', price: 10, cycle: 3, nextPayment: '2026-11-02', autoRenew: false },
      ],
      { monthlyBudget: null, today }
    );
    expect(stats.dueThisMonth).toBeCloseTo(10);
    expect(stats.manualRenewalCount).toBe(1);
  });
});
