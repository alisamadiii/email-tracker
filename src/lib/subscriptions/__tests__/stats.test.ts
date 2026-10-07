import { describe, expect, it } from 'vitest';

import { computeStats, type StatSub } from '../stats';

const base: Omit<StatSub, 'id' | 'name' | 'price' | 'cycle'> = {
  rate: 1,
  frequency: 1,
  inactive: false,
  autoRenew: true,
  nextPayment: '2026-10-15',
  startDate: '2026-01-01',
  cancellationDate: null,
  logo: null,
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

describe('trends, distribution, lifetime', () => {
  it('projects next-12-month payments and finds heaviest month', () => {
    const stats = computeStats(
      [
        { ...base, id: 'a', name: 'Monthly10', price: 10, cycle: 3, nextPayment: '2026-10-15' },
        { ...base, id: 'b', name: 'Yearly120', price: 120, cycle: 4, nextPayment: '2026-12-01' },
      ],
      { monthlyBudget: null, today }
    );
    expect(stats.projection).toHaveLength(12);
    const dec = stats.projection.find((p) => p.month === '2026-12');
    expect(dec?.amount).toBeCloseTo(130);
    expect(stats.heaviestMonth?.month).toBe('2026-12');
  });

  it('computes vs-last-month from start dates', () => {
    const stats = computeStats(
      [
        { ...base, id: 'a', name: 'Old', price: 10, cycle: 3, startDate: '2026-01-01' },
        { ...base, id: 'b', name: 'New', price: 20, cycle: 3, startDate: '2026-10-01' },
      ],
      { monthlyBudget: null, today }
    );
    expect(stats.vsLastMonth).toBeCloseTo(20);
    expect(stats.costTrend).toHaveLength(12);
  });

  it('buckets price distribution and estimates lifetime spend', () => {
    const stats = computeStats(
      [
        { ...base, id: 'a', name: 'Cheap', price: 3, cycle: 3 },
        { ...base, id: 'b', name: 'Mid', price: 15, cycle: 3 },
      ],
      { monthlyBudget: null, today }
    );
    expect(stats.priceDistribution.find((b) => b.bucket === '0–5')?.count).toBe(1);
    expect(stats.priceDistribution.find((b) => b.bucket === '10–20')?.count).toBe(1);
    // ~9.2 months since Jan 1 at 18/mo total
    expect(stats.allTimeSpend).toBeGreaterThan(150);
    expect(stats.lifetimeTop[0].name).toBe('Mid');
    expect(stats.oldestSub?.name).toBeDefined();
    expect(stats.newSubsPerYear).toEqual([{ year: '2026', count: 2 }]);
  });
});
