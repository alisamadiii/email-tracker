'use client';

import { useMemo, useState } from 'react';
import { Globe, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  createAppAccount,
  updateAppAccount,
} from '@/app/actions/app-accounts';
import { createCategory } from '@/app/actions/categories';
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { AppRow, CategoryOption, EmailOption } from './types';

const NO_CATEGORY = 'none';
const NEW_CATEGORY = '__new__';

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

// Common second-level labels so "bbc.co.uk" yields "Bbc", not "Co".
const SECOND_LEVEL_TLDS = new Set(['co', 'com', 'net', 'org', 'gov', 'ac', 'edu']);

function nameFromUrl(raw: string): string | null {
  try {
    const hostname = new URL(raw.includes('://') ? raw : `https://${raw}`)
      .hostname.replace(/^www\./, '');
    const parts = hostname.split('.').filter(Boolean);
    if (parts.length < 2) return null;

    let base = parts[parts.length - 2];
    if (parts.length >= 3 && SECOND_LEVEL_TLDS.has(base)) {
      base = parts[parts.length - 3];
    }
    if (!base) return null;
    return base.charAt(0).toUpperCase() + base.slice(1);
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
  categories: CategoryOption[];
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
  categories: CategoryOption[];
  editing: AppRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [emailId, setEmailId] = useState(
    editing?.emailId ?? emails[0]?.id ?? ''
  );
  const [url, setUrl] = useState(editing?.url ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  // Auto-fill stops the moment the name is typed by hand (or when editing).
  const [nameEdited, setNameEdited] = useState(Boolean(editing));
  const [categoryId, setCategoryId] = useState(
    editing?.categoryId ?? NO_CATEGORY
  );
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  // A just-created category may not be in the server-provided list yet.
  const [createdCategory, setCreatedCategory] = useState<CategoryOption | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const allCategories = useMemo(() => {
    if (createdCategory && !categories.some((c) => c.id === createdCategory.id)) {
      return [...categories, createdCategory].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }
    return categories;
  }, [categories, createdCategory]);

  function handleCategorySelect(value: string) {
    if (value === NEW_CATEGORY) {
      setAddingCategory(true);
      return;
    }
    setCategoryId(value);
  }

  async function handleCreateCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCreatingCategory(true);
    const { id, error } = await createCategory(trimmed);
    setCreatingCategory(false);
    if (error || !id) {
      toast.error(error ?? 'Could not create category');
      return;
    }
    setCreatedCategory({ id, name: trimmed });
    setCategoryId(id);
    setAddingCategory(false);
    setNewCategoryName('');
  }

  const preview = url.trim() ? previewFaviconUrl(url.trim()) : null;

  function handleUrlChange(value: string) {
    setUrl(value);
    if (!nameEdited) {
      const derived = nameFromUrl(value.trim());
      if (derived) setName(derived);
      else if (!value.trim()) setName('');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const input = {
      name: form.get('name') as string,
      emailId,
      url: (form.get('url') as string) || null,
      categoryId: categoryId === NO_CATEGORY ? null : categoryId,
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
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameEdited(e.target.value.trim().length > 0);
                }}
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
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Name auto-fills from the domain; favicon is fetched once and
              cached.
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
              <Label>Category</Label>
              {addingCategory ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="New category"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                      if (e.key === 'Escape') setAddingCategory(false);
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Create category"
                    disabled={creatingCategory || !newCategoryName.trim()}
                    onClick={handleCreateCategory}
                  >
                    {creatingCategory ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <Select value={categoryId} onValueChange={handleCategorySelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                    {allCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value={NEW_CATEGORY}>
                      <Plus className="size-4" />
                      New category…
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
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
