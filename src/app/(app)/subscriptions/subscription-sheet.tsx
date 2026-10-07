'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  createSubscription,
  updateSubscription,
} from '@/app/actions/subscriptions';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CYCLE_LABELS, CYCLES } from '@/lib/subscriptions/cycles';
import type { SubscriptionInput } from '@/lib/subscriptions/schemas';

import { PaymentMethodForm, methodDetail } from './payment-method-form';
import type {
  CategoryOption,
  CurrencyOption,
  EmailChoice,
  MemberOption,
  PaymentMethodOption,
  SubscriptionRow,
} from './types';

const NONE = 'none';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SubscriptionRow | null;
  currencies: CurrencyOption[];
  categories: CategoryOption[];
  methods: PaymentMethodOption[];
  members: MemberOption[];
  emailChoices: EmailChoice[];
  allSubscriptions: SubscriptionRow[];
  mainCurrencyId: string | null;
};

export function SubscriptionSheet(props: Props) {
  const { open, onOpenChange, editing } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">
            {editing ? 'Edit subscription' : 'New subscription'}
          </SheetTitle>
          <SheetDescription>
            {editing
              ? 'Update the details of this subscription.'
              : 'Track a recurring payment and get notified before it renews.'}
          </SheetDescription>
        </SheetHeader>
        {open && <SubscriptionForm key={editing?.id ?? 'new'} {...props} />}
      </SheetContent>
    </Sheet>
  );
}

function SubscriptionForm({
  onOpenChange,
  editing,
  currencies,
  categories,
  methods,
  members,
  emailChoices,
  allSubscriptions,
  mainCurrencyId,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [methodDialogOpen, setMethodDialogOpen] = React.useState(false);
  // Inline-created method: selected only once revalidation delivers it in
  // `methods`, so the Select never holds a value without a matching item.
  const [pendingMethodId, setPendingMethodId] = React.useState<string | null>(
    null
  );

  const [form, setForm] = React.useState({
    name: editing?.name ?? '',
    url: editing?.url ?? '',
    price: editing ? String(editing.price) : '',
    currencyId: editing?.currencyId ?? mainCurrencyId ?? currencies[0]?.id ?? '',
    nextPayment: editing?.nextPayment ?? today,
    startDate: editing?.startDate ?? today,
    cancellationDate: editing?.cancellationDate ?? '',
    cycle: editing?.cycle ?? CYCLES.monthly,
    frequency: editing?.frequency ?? 1,
    categoryId: editing?.categoryId ?? NONE,
    paymentMethodId: editing?.paymentMethodId ?? '',
    payerMemberId: editing?.payerMemberId ?? NONE,
    notify: editing?.notify ?? true,
    notifyDaysBefore: editing?.notifyDaysBefore ?? -1,
    autoRenew: editing?.autoRenew ?? true,
    inactive: editing?.inactive ?? false,
    replacementSubscriptionId: editing?.replacementSubscriptionId ?? NONE,
    notes: editing?.notes ?? '',
  });
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const oneTime = form.cycle === CYCLES.oneTime;

  React.useEffect(() => {
    if (pendingMethodId && methods.some((m) => m.id === pendingMethodId)) {
      setForm((f) => ({ ...f, paymentMethodId: pendingMethodId }));
      setPendingMethodId(null);
    }
  }, [pendingMethodId, methods]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.paymentMethodId) {
      toast.error('Pick a payment method — add one with the + button');
      return;
    }
    setSaving(true);

    const input: SubscriptionInput = {
      name: form.name,
      url: form.url,
      price: form.price,
      currencyId: form.currencyId,
      nextPayment: form.nextPayment,
      startDate: form.startDate,
      cancellationDate: form.inactive ? form.cancellationDate : '',
      cycle: form.cycle,
      frequency: form.frequency,
      categoryId: form.categoryId === NONE ? '' : form.categoryId,
      paymentMethodId: form.paymentMethodId,
      payerMemberId: form.payerMemberId === NONE ? '' : form.payerMemberId,
      notify: form.notify,
      notifyDaysBefore: form.notifyDaysBefore,
      autoRenew: oneTime ? false : form.autoRenew,
      inactive: form.inactive,
      replacementSubscriptionId:
        form.replacementSubscriptionId === NONE
          ? ''
          : form.replacementSubscriptionId,
      notes: form.notes,
    };

    const result = editing
      ? await updateSubscription(editing.id, input)
      : await createSubscription(input);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? 'Subscription updated' : 'Subscription added');
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="flex-1 space-y-6 px-4 pb-6">
        <section className="space-y-4">
          <SectionTitle>General</SectionTitle>
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Netflix"
              autoFocus
              required
            />
          </Field>
          <Field label="Website" hint="Used to fetch the logo">
            <Input
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://netflix.com"
              type="url"
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.categoryId}
              onValueChange={(v) => set('categoryId', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        <Separator />

        <section className="space-y-4">
          <SectionTitle>Billing</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <Input
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="9.99"
                inputMode="decimal"
                required
              />
            </Field>
            <Field label="Currency">
              <Select
                value={form.currencyId}
                onValueChange={(v) => set('currencyId', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billing cycle">
              <Select
                value={String(form.cycle)}
                onValueChange={(v) => set('cycle', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CYCLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {!oneTime && (
              <Field label="Every">
                <Select
                  value={String(form.frequency)}
                  onValueChange={(v) => set('frequency', Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 1 ? 'Every cycle' : `Every ${n} cycles`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={oneTime ? 'Payment date' : 'Next payment'}>
              <DatePicker
                value={form.nextPayment}
                onChange={(v) => set('nextPayment', v)}
              />
            </Field>
            <Field label="Started on">
              <DatePicker
                value={form.startDate}
                onChange={(v) => set('startDate', v)}
              />
            </Field>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <SectionTitle>Assignment</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment method">
              <div className="flex gap-2">
                <Select
                  value={form.paymentMethodId}
                  onValueChange={(v) => set('paymentMethodId', v)}
                >
                  <SelectTrigger className="min-w-0 flex-1">
                    <SelectValue placeholder="Pick one" />
                  </SelectTrigger>
                  <SelectContent>
                    {methods
                      .filter((m) => m.enabled || m.id === form.paymentMethodId)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                          {methodDetail(m) && m.type !== 'card'
                            ? ` (${methodDetail(m)})`
                            : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Add payment method"
                  onClick={() => setMethodDialogOpen(true)}
                >
                  +
                </Button>
              </div>
            </Field>
            <Field label="Paid by">
              <Select
                value={form.payerMemberId}
                onValueChange={(v) => set('payerMemberId', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Me</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <SectionTitle>Notifications</SectionTitle>
          <ToggleRow
            label="Notify before renewal"
            checked={form.notify}
            onCheckedChange={(v) => set('notify', v)}
          />
          {form.notify && (
            <Field label="Days before payment">
              <Select
                value={String(form.notifyDaysBefore)}
                onValueChange={(v) => set('notifyDaysBefore', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-1">Use global setting</SelectItem>
                  {[0, 1, 2, 3, 5, 7, 14, 30].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n === 0 ? 'Same day' : `${n} day${n === 1 ? '' : 's'} before`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </section>

        <Separator />

        <section className="space-y-4">
          <SectionTitle>Status</SectionTitle>
          {!oneTime && (
            <ToggleRow
              label="Auto-renews"
              hint="Renewal date advances automatically after each payment"
              checked={form.autoRenew}
              onCheckedChange={(v) => set('autoRenew', v)}
            />
          )}
          <ToggleRow
            label="Inactive / cancelled"
            checked={form.inactive}
            onCheckedChange={(v) => set('inactive', v)}
          />
          {form.inactive && (
            <>
              <Field label="Cancelled on">
                <DatePicker
                  value={form.cancellationDate}
                  onChange={(v) => set('cancellationDate', v)}
                />
              </Field>
              <Field
                label="Replaced by"
                hint="Counts against this one in savings"
              >
                <Select
                  value={form.replacementSubscriptionId}
                  onValueChange={(v) => set('replacementSubscriptionId', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nothing</SelectItem>
                    {allSubscriptions
                      .filter((s) => !s.inactive && s.id !== editing?.id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
        </section>

        <Separator />

        <section className="space-y-4">
          <SectionTitle>Notes</SectionTitle>
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Plan details, account used, shared with…"
            rows={3}
          />
        </section>
      </div>

      <SheetFooter className="sticky bottom-0 border-t bg-background">
        <Button type="submit" disabled={saving} size="lg">
          {saving && <Loader2 className="animate-spin" />}
          {editing ? 'Save changes' : 'Add subscription'}
        </Button>
      </SheetFooter>

      <Dialog open={methodDialogOpen} onOpenChange={setMethodDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">
              New payment method
            </DialogTitle>
            <DialogDescription>
              At minimum the last 4 digits, so you know which card pays this.
            </DialogDescription>
          </DialogHeader>
          {methodDialogOpen && (
            <PaymentMethodForm
              emailChoices={emailChoices}
              onSaved={(id) => {
                setPendingMethodId(id);
                setMethodDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </form>
  );
}

function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="size-4" />
          {selected ? format(selected, 'MMM d, yyyy') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
