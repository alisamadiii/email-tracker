'use client';

import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  createAppAccount,
  updateAppAccount,
} from '@/app/actions/app-accounts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { AppRow, EmailOption } from './types';

const CATEGORY_SUGGESTIONS = ['Business', 'Personal', 'Dev', 'Social', 'Finance'];

function previewFaviconUrl(url: string) {
  try {
    const hostname = new URL(url.includes('://') ? url : `https://${url}`)
      .hostname;
    if (!hostname.includes('.')) return null;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}

export function AppDialog({
  open,
  onOpenChange,
  emails,
  categories,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emails: EmailOption[];
  categories: string[];
  editing: AppRow | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit app' : 'New app'}</DialogTitle>
          <DialogDescription>
            Which app did you sign up for, and with which email?
          </DialogDescription>
        </DialogHeader>
        {/* DialogContent unmounts when closed, so form state resets naturally */}
        <AppForm
          emails={emails}
          categories={categories}
          editing={editing}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function AppForm({
  emails,
  categories,
  editing,
  onOpenChange,
}: {
  emails: EmailOption[];
  categories: string[];
  editing: AppRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [emailId, setEmailId] = useState(
    editing?.emailId ?? emails[0]?.id ?? ''
  );
  const [url, setUrl] = useState(editing?.url ?? '');
  const [saving, setSaving] = useState(false);

  const preview = url.trim() ? previewFaviconUrl(url.trim()) : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const input = {
      name: form.get('name') as string,
      emailId,
      url: (form.get('url') as string) || null,
      category: (form.get('category') as string) || null,
      notes: (form.get('notes') as string) || null,
      signupDate: (form.get('signupDate') as string) || null,
    };

    const { error } = editing
      ? await updateAppAccount(editing.id, input)
      : await createAppAccount(input);

    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }

    toast.success(editing ? `${input.name} updated` : `${input.name} added`);
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div className="grid gap-2">
              <Label htmlFor="name">App name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Hostinger"
                defaultValue={editing?.name}
                required
              />
            </div>
            <div className="flex size-9 items-center justify-center rounded-md border bg-muted/50">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="size-6" />
              ) : editing?.favicon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editing.favicon} alt="" className="size-6" />
              ) : (
                <Globe className="size-4 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              name="url"
              placeholder="https://hostinger.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The favicon is fetched from this once and cached.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Email used</Label>
            <Select value={emailId} onValueChange={setEmailId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick an email" />
              </SelectTrigger>
              <SelectContent>
                {emails.map((email) => (
                  <SelectItem key={email.id} value={email.id}>
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: email.color }}
                    />
                    {email.label}
                    <span className="text-muted-foreground">
                      {email.address}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                list="category-suggestions"
                placeholder="Business"
                defaultValue={editing?.category ?? ''}
              />
              <datalist id="category-suggestions">
                {[...new Set([...CATEGORY_SUGGESTIONS, ...categories])].map(
                  (c) => (
                    <option key={c} value={c} />
                  )
                )}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signupDate">Signup date</Label>
              <Input
                id="signupDate"
                name="signupDate"
                type="date"
                defaultValue={editing?.signupDate ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Plan, account details, anything worth remembering…"
              defaultValue={editing?.notes ?? ''}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !emailId}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add app'}
            </Button>
          </DialogFooter>
    </form>
  );
}
