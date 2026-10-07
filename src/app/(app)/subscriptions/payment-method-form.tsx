'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  createPaymentMethod,
  updatePaymentMethod,
} from '@/app/actions/payment-methods';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PaymentMethodInput } from '@/lib/subscriptions/schemas';

import type { EmailChoice, PaymentMethodOption } from './types';

const NEW_EMAIL = 'new';

type Props = {
  emailChoices: EmailChoice[];
  editing?: PaymentMethodOption | null;
  onSaved: (id: string) => void;
};

export function PaymentMethodForm({ emailChoices, editing, onSaved }: Props) {
  const [type, setType] = React.useState<'card' | 'paypal' | 'other'>(
    editing?.type ?? 'card'
  );
  const [cardKind, setCardKind] = React.useState<'credit' | 'debit'>(
    editing?.cardKind ?? 'credit'
  );
  const [last4, setLast4] = React.useState(editing?.last4 ?? '');
  const [emailId, setEmailId] = React.useState(
    editing?.type === 'paypal' && editing.emailAddress
      ? (emailChoices.find((e) => e.address === editing.emailAddress)?.id ??
          NEW_EMAIL)
      : (emailChoices[0]?.id ?? NEW_EMAIL)
  );
  const [newEmailAddress, setNewEmailAddress] = React.useState('');
  const [name, setName] = React.useState(
    editing?.type === 'other' ? editing.name : ''
  );
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);

    let input: PaymentMethodInput;
    if (type === 'card') {
      input = { type, cardKind, last4, name: '' };
    } else if (type === 'paypal') {
      input = {
        type,
        emailId: emailId === NEW_EMAIL ? '' : emailId,
        newEmailAddress: emailId === NEW_EMAIL ? newEmailAddress : '',
        newEmailLabel: '',
        name: '',
      };
    } else {
      input = { type, name };
    }

    const result = editing
      ? await updatePaymentMethod(editing.id, input)
      : await createPaymentMethod(input);
    setSaving(false);

    if (result.error || !result.id) {
      toast.error(result.error ?? 'Could not save payment method');
      return;
    }
    toast.success(editing ? 'Payment method updated' : 'Payment method added');
    onSaved(result.id);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === 'card' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select
              value={cardKind}
              onValueChange={(v) => setCardKind(v as typeof cardKind)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Last 4 digits</Label>
            <Input
              value={last4}
              onChange={(e) =>
                setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="4242"
              inputMode="numeric"
              required
            />
          </div>
        </div>
      )}

      {type === 'paypal' && (
        <>
          <div className="space-y-1.5">
            <Label>PayPal email</Label>
            <Select value={emailId} onValueChange={setEmailId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emailChoices.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.address} ({e.label})
                  </SelectItem>
                ))}
                <SelectItem value={NEW_EMAIL}>+ New email…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {emailId === NEW_EMAIL && (
            <div className="space-y-1.5">
              <Label>New email address</Label>
              <Input
                value={newEmailAddress}
                onChange={(e) => setNewEmailAddress(e.target.value)}
                placeholder="me@paypal-mail.com"
                type="email"
                required
              />
              <p className="text-xs text-muted-foreground">
                Also added to your Emails list.
              </p>
            </div>
          )}
        </>
      )}

      {type === 'other' && (
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bank transfer"
            required
          />
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full">
        {saving && <Loader2 className="animate-spin" />}
        {editing ? 'Save changes' : 'Add payment method'}
      </Button>
    </form>
  );
}

export function methodDetail(m: PaymentMethodOption): string | null {
  if (m.type === 'card' && m.last4) return `•••• ${m.last4}`;
  if (m.type === 'paypal' && m.emailAddress) return m.emailAddress;
  return null;
}
