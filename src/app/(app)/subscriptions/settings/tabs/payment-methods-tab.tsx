'use client';

import * as React from 'react';
import { CreditCard, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import {
  deletePaymentMethod,
  togglePaymentMethod,
} from '@/app/actions/payment-methods';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

import { PaymentMethodForm, methodDetail } from '../../payment-method-form';
import type { EmailChoice, PaymentMethodOption } from '../../types';

const TYPE_LABELS: Record<PaymentMethodOption['type'], string> = {
  card: 'Card',
  paypal: 'PayPal',
  other: 'Other',
};

export function PaymentMethodsTab({
  methods,
  emailChoices,
}: {
  methods: PaymentMethodOption[];
  emailChoices: EmailChoice[];
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PaymentMethodOption | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(m: PaymentMethodOption) {
    setEditing(m);
    setDialogOpen(true);
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="font-heading">Payment methods</CardTitle>
            <CardDescription>
              Each method records the actual instrument — card last 4 digits or
              PayPal email. Required on every subscription.
            </CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {methods.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="size-4" /> No payment methods yet — add your
            first card or PayPal.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {methods.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Switch
                  checked={m.enabled}
                  onCheckedChange={async () => {
                    const result = await togglePaymentMethod(m.id);
                    if (result.error) toast.error(result.error);
                  }}
                />
                <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {m.type === 'paypal' ? (
                    <Wallet className="size-4" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  {methodDetail(m) && (
                    <p className="truncate text-sm text-muted-foreground">
                      {methodDetail(m)}
                    </p>
                  )}
                </div>
                <Badge variant="outline">{TYPE_LABELS[m.type]}</Badge>
                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
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
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? 'Edit payment method' : 'New payment method'}
            </DialogTitle>
          </DialogHeader>
          {dialogOpen && (
            <PaymentMethodForm
              key={editing?.id ?? 'new'}
              emailChoices={emailChoices}
              editing={editing}
              onSaved={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
