'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { saveUserSettings } from '@/app/actions/user-settings';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { CurrencyOption, SettingsView } from '../../types';
import { toSettingsInput } from './settings-input';

export function BudgetTab({
  settings,
  currencies,
}: {
  settings: SettingsView;
  currencies: CurrencyOption[];
}) {
  const main = currencies.find((c) => c.id === settings.mainCurrencyId);
  const [budget, setBudget] = React.useState(
    settings.monthlyBudget?.toString() ?? ''
  );
  const [saving, setSaving] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await saveUserSettings(
      toSettingsInput(settings, { monthlyBudget: budget })
    );
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success('Budget saved');
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-heading">Monthly budget</CardTitle>
        <CardDescription>
          Stats shows how much of this budget your subscriptions use. Leave
          empty for no budget.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label>Budget ({main?.code ?? 'main currency'}) per month</Label>
            <Input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="200"
              inputMode="decimal"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
