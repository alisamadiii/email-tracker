'use client';

import * as React from 'react';
import Link from 'next/link';
import { Copy, KeyRound, Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { regenerateApiKey } from '@/app/actions/account';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CopyText } from '@/components/copy-text';

type Props = {
  profile: { name: string; email: string; role: string; createdAt: string };
  apiKey: string | null;
  counts: { subscriptions: number; emails: number; apps: number };
};

export function AccountClient({ profile, apiKey, counts }: Props) {
  const [working, setWorking] = React.useState(false);

  async function handleRegenerate() {
    setWorking(true);
    const result = await regenerateApiKey();
    setWorking(false);
    if (result.error) toast.error(result.error);
    else toast.success(apiKey ? 'API key rotated — old key is dead' : 'API key generated');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Account
        </h1>
        <p className="text-muted-foreground">
          Global settings for this Business Tracker instance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Name" value={profile.name} />
          <InfoRow label="Email" value={profile.email} />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge className="gap-1">
              <ShieldCheck className="size-3" />
              {profile.role}
            </Badge>
          </div>
          <InfoRow label="Member since" value={profile.createdAt} />
          <p className="pt-2 text-xs text-muted-foreground">
            Sign-up closed after this account. Household members live in{' '}
            <Link href="/subscriptions/settings" className="underline">
              Subscriptions → Settings
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Instance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-center">
          <Stat value={counts.subscriptions} label="Subscriptions" />
          <Stat value={counts.emails} label="Emails" />
          <Stat value={counts.apps} label="Apps" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 font-heading">
                <KeyRound className="size-4" /> API access
              </CardTitle>
              <CardDescription>
                Read and create data over HTTP with this key. Treat it like a
                password — rotate it after sharing.
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={working}>
                  {working ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RefreshCcw />
                  )}
                  {apiKey ? 'Regenerate' : 'Generate key'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {apiKey ? 'Rotate the API key?' : 'Generate an API key?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {apiKey
                      ? 'The current key stops working immediately. Anything using it must switch to the new key.'
                      : 'Creates a key with full read and create access to your data.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRegenerate}>
                    {apiKey ? 'Rotate key' : 'Generate'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKey ? (
            <CopyText
              text={apiKey}
              className="flex w-full items-center justify-between gap-2 rounded-xl border bg-muted/50 px-3 py-2.5 text-left font-mono text-sm break-all"
            >
              {apiKey}
              <Copy className="size-4 shrink-0 text-muted-foreground" />
            </CopyText>
          ) : (
            <p className="text-sm text-muted-foreground">
              No key yet — generate one to enable the API.
            </p>
          )}

          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-semibold uppercase tracking-wider">Endpoints</p>
            <p>
              <code>GET /api/v1/subscriptions</code> ·{' '}
              <code>GET /api/v1/emails</code> · <code>GET /api/v1/apps</code>{' '}
              (add <code>?include_logos=1</code> for images)
            </p>
            <p>
              <code>POST /api/v1/subscriptions</code> — create a subscription
            </p>
            <p>
              Auth: <code>x-api-key</code> header or <code>?api_key=</code>{' '}
              query parameter.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-heading text-3xl font-bold text-primary">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
