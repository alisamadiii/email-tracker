'use client';

import * as React from 'react';
import { Loader2, Plus, RefreshCcw, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  createCurrency,
  deleteCurrency,
  refreshCurrencyRates,
  setMainCurrency,
} from '@/app/actions/currencies';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { CurrencyOption, SettingsView } from '../../types';

export function CurrenciesTab({
  currencies,
  settings,
}: {
  currencies: CurrencyOption[];
  settings: SettingsView;
}) {
  const [form, setForm] = React.useState({ name: '', symbol: '', code: '' });
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await createCurrency(form);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Currency added');
    setForm({ name: '', symbol: '', code: '' });
  }

  async function handleRefresh() {
    setRefreshing(true);
    const result = await refreshCurrencyRates();
    setRefreshing(false);
    if (result.error) toast.error(result.error);
    else toast.success(`Updated ${result.updated} rates`);
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-heading">Currencies</CardTitle>
        <CardDescription>
          Rates are relative to your main currency and refresh daily from ECB
          data (Frankfurter).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name (Norwegian Krone)"
            className="min-w-40 flex-1"
            required
          />
          <Input
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            placeholder="kr"
            className="w-20"
            required
          />
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="NOK"
            className="w-24"
            maxLength={3}
            required
          />
          <Button type="submit" disabled={saving}>
            <Plus /> Add
          </Button>
        </form>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCcw />
            )}
            Refresh rates now
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {currencies.map((c) => {
              const isMain = c.id === settings.mainCurrencyId;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.symbol} {c.name}
                    {isMain && (
                      <Badge className="ml-2" variant="secondary">
                        Main
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{c.code}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.rate.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isMain && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Set as main currency"
                          onClick={async () => {
                            const result = await setMainCurrency(c.id);
                            if (result.error) toast.error(result.error);
                            else toast.success(`${c.code} is now the main currency`);
                          }}
                        >
                          <Star />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const result = await deleteCurrency(c.id);
                            if (result.error) toast.error(result.error);
                            else toast.success('Currency deleted');
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
