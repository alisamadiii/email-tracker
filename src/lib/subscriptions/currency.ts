// Rates are stored relative to the main currency (main = 1).
// A price in currency X converts to main as price / rate(X).
export function toMain(price: number, rate: number): number {
  if (!rate || rate <= 0) return price;
  return price / rate;
}

export function formatAmount(amount: number, symbol: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}
