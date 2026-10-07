export type CurrencyOption = {
  id: string;
  name: string;
  symbol: string;
  code: string;
  rate: number;
};

export type CategoryOption = { id: string; name: string };
export type PaymentMethodOption = {
  id: string;
  name: string;
  enabled: boolean;
  type: 'card' | 'paypal' | 'other';
  cardKind: 'credit' | 'debit' | null;
  last4: string | null;
  emailAddress: string | null;
};
export type MemberOption = { id: string; name: string; email: string | null };
export type EmailChoice = { id: string; label: string; address: string };

export type SettingsView = {
  mainCurrencyId: string | null;
  monthlyBudget: number | null;
  notifyDaysBefore: number;
  showMonthlyPrice: boolean;
  convertCurrency: boolean;
  hideDisabled: boolean;
  disabledToBottom: boolean;
  upcomingLimit: number;
  weekStart: number;
};

export type SubscriptionRow = {
  id: string;
  name: string;
  logo: string | null;
  url: string | null;
  price: number;
  currencyId: string;
  currencyCode: string;
  currencySymbol: string;
  currencyRate: number;
  nextPayment: string;
  startDate: string | null;
  cancellationDate: string | null;
  cycle: number;
  frequency: number;
  categoryId: string | null;
  categoryName: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  payerMemberId: string | null;
  payerName: string | null;
  notify: boolean;
  notifyDaysBefore: number;
  autoRenew: boolean;
  inactive: boolean;
  replacementSubscriptionId: string | null;
  notes: string | null;
};
