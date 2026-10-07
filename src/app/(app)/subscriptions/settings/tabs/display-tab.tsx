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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import type { SettingsView } from '../../types';
import { toSettingsInput } from './settings-input';

export function DisplayTab({ settings }: { settings: SettingsView }) {
  const [form, setForm] = React.useState({
    showMonthlyPrice: settings.showMonthlyPrice,
    convertCurrency: settings.convertCurrency,
    hideDisabled: settings.hideDisabled,
    disabledToBottom: settings.disabledToBottom,
    upcomingLimit: settings.upcomingLimit,
    weekStart: settings.weekStart,
  });
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await saveUserSettings(toSettingsInput(settings, form));
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success('Display settings saved');
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-heading">Display</CardTitle>
        <CardDescription>How subscriptions and prices render.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Row
          label="Show monthly price"
          hint="Cards show the normalized per-month cost instead of the raw price"
        >
          <Switch
            checked={form.showMonthlyPrice}
            onCheckedChange={(v) => setForm({ ...form, showMonthlyPrice: v })}
          />
        </Row>
        <Row
          label="Convert to main currency"
          hint="Totals and stats convert everything to your main currency"
        >
          <Switch
            checked={form.convertCurrency}
            onCheckedChange={(v) => setForm({ ...form, convertCurrency: v })}
          />
        </Row>
        <Row label="Hide inactive subscriptions">
          <Switch
            checked={form.hideDisabled}
            onCheckedChange={(v) => setForm({ ...form, hideDisabled: v })}
          />
        </Row>
        <Row label="Sink inactive subscriptions to the bottom">
          <Switch
            checked={form.disabledToBottom}
            onCheckedChange={(v) => setForm({ ...form, disabledToBottom: v })}
          />
        </Row>
        <Row label="Week starts on">
          <Select
            value={String(form.weekStart)}
            onValueChange={(v) => setForm({ ...form, weekStart: Number(v) })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="0">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
