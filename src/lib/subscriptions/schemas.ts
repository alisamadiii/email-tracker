import { z } from 'zod';

const uuidOrNull = z
  .string()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable());

export const subscriptionInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  url: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.url('Invalid URL').nullable()),
  price: z.coerce.number().positive('Price must be positive'),
  currencyId: z.uuid('Pick a currency'),
  nextPayment: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick the next payment date'),
  startDate: z
    .string()
    .transform((v) => v || null)
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  cancellationDate: z
    .string()
    .transform((v) => v || null)
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  cycle: z.coerce.number().int().min(1).max(5),
  frequency: z.coerce.number().int().min(1).max(10),
  categoryId: uuidOrNull,
  paymentMethodId: uuidOrNull,
  payerMemberId: uuidOrNull,
  notify: z.coerce.boolean(),
  notifyDaysBefore: z.coerce.number().int().min(-1).max(365),
  autoRenew: z.coerce.boolean(),
  inactive: z.coerce.boolean(),
  replacementSubscriptionId: uuidOrNull,
  notes: z
    .string()
    .trim()
    .transform((v) => v || null),
});

export type SubscriptionInput = z.input<typeof subscriptionInputSchema>;

export const namedItemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
});

export const householdMemberSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.email('Invalid email').nullable()),
});

export const currencyInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  symbol: z.string().trim().min(1, 'Symbol is required'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Code must be 3 letters (ISO 4217)'),
});

export const userSettingsSchema = z.object({
  monthlyBudget: z.string().transform((v, ctx) => {
    if (!v.trim()) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Budget must be positive' });
      return z.NEVER;
    }
    return n;
  }),
  notifyDaysBefore: z.coerce.number().int().min(0).max(365),
  showMonthlyPrice: z.coerce.boolean(),
  convertCurrency: z.coerce.boolean(),
  hideDisabled: z.coerce.boolean(),
  disabledToBottom: z.coerce.boolean(),
  upcomingLimit: z.coerce.number().int().min(1).max(20),
  weekStart: z.coerce.number().int().min(0).max(1),
});
