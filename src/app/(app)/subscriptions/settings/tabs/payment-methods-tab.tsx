'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  createPaymentMethod,
  deletePaymentMethod,
  renamePaymentMethod,
  togglePaymentMethod,
} from '@/app/actions/payment-methods';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import type { PaymentMethodOption } from '../../types';

export function PaymentMethodsTab({
  methods,
}: {
  methods: PaymentMethodOption[];
}) {
  const [name, setName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = editingId
      ? await renamePaymentMethod(editingId, { name })
      : await createPaymentMethod({ name });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? 'Payment method renamed' : 'Payment method added');
    setName('');
    setEditingId(null);
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-heading">Payment methods</CardTitle>
        <CardDescription>
          Disabled methods are hidden from the subscription form but kept on
          existing subscriptions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Payment method name"
            className="flex-1"
            required
          />
          <Button type="submit" disabled={saving}>
            <Plus /> {editingId ? 'Save' : 'Add'}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setName('');
              }}
            >
              Cancel
            </Button>
          )}
        </form>
        <ul className="divide-y rounded-xl border">
          {methods.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <Switch
                checked={m.enabled}
                onCheckedChange={async () => {
                  const result = await togglePaymentMethod(m.id);
                  if (result.error) toast.error(result.error);
                }}
              />
              <span className="flex-1 truncate font-medium">{m.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingId(m.id);
                  setName(m.name);
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  const result = await deletePaymentMethod(m.id);
                  if (result.error) toast.error(result.error);
                  else toast.success('Payment method deleted');
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
