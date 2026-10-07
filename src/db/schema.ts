import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  unique,
  integer,
  smallint,
  numeric,
  date,
  jsonb,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// ---------- Better Auth tables ----------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'),
  // Read/write API access token (Wallos-style, visible in Account settings).
  apiKey: text('api_key').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ---------- App tables ----------

export const emails = pgTable('emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  address: text('address').notNull(),
  color: text('color').notNull().default('#6366f1'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.name)]
);

export const appAccounts = pgTable('app_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  emailId: uuid('email_id')
    .notNull()
    .references(() => emails.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  url: text('url'),
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  notes: text('notes'),
  favicon: text('favicon'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Email = typeof emails.$inferSelect;
export type AppAccount = typeof appAccounts.$inferSelect;
export type Category = typeof categories.$inferSelect;

// ---------- Subscriptions module ----------
// Independent from the email module above — no FKs between the two.

export const currencies = pgTable(
  'currencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    symbol: text('symbol').notNull(),
    code: text('code').notNull(),
    // Relative to the user's main currency (main = 1). amountInMain = price / rate.
    rate: numeric('rate', { precision: 16, scale: 8 }).notNull().default('1'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.code)]
);

export const subscriptionCategories = pgTable(
  'subscription_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.name)]
);

// type 'card' carries cardKind + last4; 'paypal' links an email from the
// email module (the one deliberate bridge between the two modules).
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['card', 'paypal', 'other'] })
    .notNull()
    .default('other'),
  cardKind: text('card_kind', { enum: ['credit', 'debit'] }),
  last4: text('last4'),
  emailId: uuid('email_id').references(() => emails.id, {
    onDelete: 'set null',
  }),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const householdMembers = pgTable('household_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// cycle: 1=daily 2=weekly 3=monthly 4=yearly 5=one-time
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  logo: text('logo'),
  url: text('url'),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  currencyId: uuid('currency_id')
    .notNull()
    .references(() => currencies.id, { onDelete: 'restrict' }),
  nextPayment: date('next_payment').notNull(),
  startDate: date('start_date'),
  cancellationDate: date('cancellation_date'),
  cycle: smallint('cycle').notNull().default(3),
  frequency: smallint('frequency').notNull().default(1),
  categoryId: uuid('category_id').references(() => subscriptionCategories.id, {
    onDelete: 'set null',
  }),
  paymentMethodId: uuid('payment_method_id').references(
    () => paymentMethods.id,
    { onDelete: 'set null' }
  ),
  payerMemberId: uuid('payer_member_id').references(() => householdMembers.id, {
    onDelete: 'set null',
  }),
  notify: boolean('notify').notNull().default(true),
  // -1 = inherit the global user_settings.notify_days_before
  notifyDaysBefore: integer('notify_days_before').notNull().default(-1),
  autoRenew: boolean('auto_renew').notNull().default(true),
  inactive: boolean('inactive').notNull().default(false),
  replacementSubscriptionId: uuid('replacement_subscription_id').references(
    (): AnyPgColumn => subscriptions.id,
    { onDelete: 'set null' }
  ),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// weekStart: 0=Sunday 1=Monday (date-fns weekStartsOn)
export const userSettings = pgTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  mainCurrencyId: uuid('main_currency_id').references(() => currencies.id, {
    onDelete: 'set null',
  }),
  monthlyBudget: numeric('monthly_budget', { precision: 12, scale: 2 }),
  notifyDaysBefore: integer('notify_days_before').notNull().default(1),
  showMonthlyPrice: boolean('show_monthly_price').notNull().default(false),
  convertCurrency: boolean('convert_currency').notNull().default(true),
  hideDisabled: boolean('hide_disabled').notNull().default(false),
  disabledToBottom: boolean('disabled_to_bottom').notNull().default(true),
  upcomingLimit: integer('upcoming_limit').notNull().default(5),
  weekStart: smallint('week_start').notNull().default(1),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notificationChannels = pgTable(
  'notification_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type', {
      enum: ['email', 'discord', 'slack', 'telegram', 'webhook'],
    }).notNull(),
    enabled: boolean('enabled').notNull().default(false),
    config: jsonb('config').notNull().default({}),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.type)]
);

export const jobRuns = pgTable('job_runs', {
  jobName: text('job_name').primaryKey(),
  lastRunAt: timestamp('last_run_at'),
  lastSuccessDate: date('last_success_date'),
  lastError: text('last_error'),
});

export type Currency = typeof currencies.$inferSelect;
export type SubscriptionCategory = typeof subscriptionCategories.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type NotificationChannel = typeof notificationChannels.$inferSelect;
