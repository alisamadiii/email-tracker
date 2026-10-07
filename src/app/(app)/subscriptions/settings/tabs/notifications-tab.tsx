'use client';

import * as React from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import {
  saveChannel,
  testChannel,
  toggleChannel,
} from '@/app/actions/notification-channels';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ChannelType } from '@/lib/notifications/types';

import type { SettingsView } from '../../types';
import type { ChannelView } from '../settings-client';
import { toSettingsInput } from './settings-input';

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'textarea';
  hint?: string;
};

const CHANNEL_DEFS: {
  type: ChannelType;
  title: string;
  description: string;
  fields: FieldDef[];
}[] = [
  {
    type: 'email',
    title: 'Email (SMTP)',
    description: 'Renewal reminders by email; household members get their own.',
    fields: [
      { key: 'host', label: 'SMTP host', placeholder: 'smtp.example.com' },
      { key: 'port', label: 'Port', placeholder: '587' },
      { key: 'username', label: 'Username' },
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'fromEmail', label: 'From email', placeholder: 'tracker@example.com' },
      { key: 'encryption', label: 'Encryption (tls / ssl / none)', placeholder: 'tls' },
      {
        key: 'extraEmails',
        label: 'Extra recipients',
        placeholder: 'a@x.com;b@y.com',
        hint: 'Semicolon-separated, CCed on every reminder',
      },
    ],
  },
  {
    type: 'discord',
    title: 'Discord',
    description: 'Posts reminders to a channel webhook.',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/…' },
      { key: 'botUsername', label: 'Bot username (optional)' },
      { key: 'botAvatarUrl', label: 'Bot avatar URL (optional)' },
    ],
  },
  {
    type: 'slack',
    title: 'Slack',
    description: 'Posts reminders via an incoming webhook.',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/…' },
    ],
  },
  {
    type: 'telegram',
    title: 'Telegram',
    description: 'Messages you through a bot.',
    fields: [
      { key: 'botToken', label: 'Bot token', type: 'password' },
      { key: 'chatId', label: 'Chat ID' },
    ],
  },
  {
    type: 'webhook',
    title: 'Webhook',
    description:
      'One request per due subscription with your own payload template.',
    fields: [
      { key: 'url', label: 'URL', placeholder: 'https://example.com/hook' },
      { key: 'method', label: 'Method (POST / PUT / PATCH)', placeholder: 'POST' },
      { key: 'headers', label: 'Headers (JSON)', placeholder: '{"Authorization": "Bearer …"}' },
      {
        key: 'payloadTemplate',
        label: 'Payload template',
        type: 'textarea',
        placeholder:
          '{"text": "{{subscription_name}} renews in {{days_until}} days ({{subscription_price}} {{subscription_currency}})"}',
        hint: 'Placeholders: subscription_name, subscription_price, subscription_currency, subscription_category, subscription_payer, subscription_date, subscription_url, subscription_notes, days_until',
      },
    ],
  },
];

export function NotificationsTab({
  settings,
  channels,
}: {
  settings: SettingsView;
  channels: ChannelView[];
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <GlobalDays settings={settings} />
      {CHANNEL_DEFS.map((def) => (
        <ChannelCard
          key={def.type}
          def={def}
          saved={channels.find((c) => c.type === def.type) ?? null}
        />
      ))}
    </div>
  );
}

function GlobalDays({ settings }: { settings: SettingsView }) {
  const [days, setDays] = React.useState(settings.notifyDaysBefore);
  const [saving, setSaving] = React.useState(false);

  async function handleSave(value: number) {
    setDays(value);
    setSaving(true);
    const result = await saveUserSettings(
      toSettingsInput(settings, { notifyDaysBefore: value })
    );
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success('Saved');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">When to notify</CardTitle>
        <CardDescription>
          Default lead time before a renewal. Each subscription can override
          it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Select
          value={String(days)}
          onValueChange={(v) => handleSave(Number(v))}
          disabled={saving}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3, 5, 7, 14, 30].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n === 0 ? 'Same day' : `${n} day${n === 1 ? '' : 's'} before`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving && <Loader2 className="size-4 animate-spin" />}
      </CardContent>
    </Card>
  );
}

function ChannelCard({
  def,
  saved,
}: {
  def: (typeof CHANNEL_DEFS)[number];
  saved: ChannelView | null;
}) {
  const [form, setForm] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      def.fields.map((f) => [f.key, String(saved?.config[f.key] ?? '')])
    )
  );
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await saveChannel(def.type, form);
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success(`${def.title} saved and enabled`);
  }

  async function handleTest() {
    setTesting(true);
    const result = await testChannel(def.type);
    setTesting(false);
    if (result.error) toast.error(`Test failed: ${result.error}`);
    else toast.success('Test message sent — check the channel');
  }

  async function handleToggle() {
    const result = await toggleChannel(def.type);
    if (result.error) toast.error(result.error);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="font-heading">{def.title}</CardTitle>
            <CardDescription>{def.description}</CardDescription>
          </div>
          <Switch
            checked={saved?.enabled ?? false}
            onCheckedChange={handleToggle}
            disabled={!saved}
          />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-3">
          {def.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              {f.type === 'textarea' ? (
                <Textarea
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  rows={3}
                />
              ) : (
                <Input
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  type={f.type ?? 'text'}
                />
              )}
              {f.hint && (
                <p className="text-xs text-muted-foreground">{f.hint}</p>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || !saved}
            >
              {testing ? <Loader2 className="animate-spin" /> : <Send />}
              Send test
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
