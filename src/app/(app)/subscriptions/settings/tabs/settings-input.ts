import type { UserSettingsInput } from '@/app/actions/user-settings';

import type { SettingsView } from '../../types';

// Builds a full settings payload from current values + one tab's overrides,
// so each tab can save independently without clobbering the others.
export function toSettingsInput(
  settings: SettingsView,
  overrides: Partial<UserSettingsInput>
): UserSettingsInput {
  return {
    monthlyBudget: settings.monthlyBudget?.toString() ?? '',
    notifyDaysBefore: settings.notifyDaysBefore,
    showMonthlyPrice: settings.showMonthlyPrice,
    convertCurrency: settings.convertCurrency,
    hideDisabled: settings.hideDisabled,
    disabledToBottom: settings.disabledToBottom,
    upcomingLimit: settings.upcomingLimit,
    weekStart: settings.weekStart,
    ...overrides,
  };
}
