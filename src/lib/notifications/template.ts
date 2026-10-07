import type { SubDue } from './types';

// Substitutes {{placeholders}} in a user-defined webhook payload template.
export function renderTemplate(template: string, sub: SubDue): string {
  const vars: Record<string, string> = {
    subscription_name: sub.name,
    subscription_price: sub.price,
    subscription_currency: sub.currencyCode,
    subscription_category: sub.category ?? '',
    subscription_payer: sub.payer ?? '',
    subscription_date: sub.nextPayment,
    subscription_url: sub.url ?? '',
    subscription_notes: sub.notes ?? '',
    days_until: String(sub.daysUntil),
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in vars ? vars[key] : match
  );
}
