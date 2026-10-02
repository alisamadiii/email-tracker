'use client';

import { useState } from 'react';
import { Loader2, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { createEmail, deleteEmail, updateEmail } from '@/app/actions/emails';
import { CopyText } from '@/components/copy-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export type EmailRow = {
  id: string;
  label: string;
  address: string;
  color: string;
  usageCount: number;
};

const COLOR_CHOICES = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#64748b',
];

export function EmailsClient({ emails }: { emails: EmailRow[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmailRow | null>(null);
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setColor(COLOR_CHOICES[emails.length % COLOR_CHOICES.length]);
    setDialogOpen(true);
  }

  function openEdit(email: EmailRow) {
    setEditing(email);
    setColor(email.color);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const input = {
      label: form.get('label') as string,
      address: form.get('address') as string,
      color,
    };

    const { error } = editing
      ? await updateEmail(editing.id, input)
      : await createEmail(input);

    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }

    toast.success(editing ? 'Email updated' : 'Email added');
    setDialogOpen(false);
  }

  async function handleDelete(email: EmailRow) {
    const { error } = await deleteEmail(email.id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Email deleted');
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Emails</h1>
          <p className="text-sm text-muted-foreground">
            The emails you sign up for apps with.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add email
        </Button>
      </div>

      {emails.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Mail className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No emails yet</p>
              <p className="text-sm text-muted-foreground">
                Add the emails you use (e.g. Business 1, Business 2, Personal)
                to start tracking.
              </p>
            </div>
            <Button onClick={openAdd}>
              <Plus className="size-4" />
              Add your first email
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {emails.map((email) => (
            <Card key={email.id} size="sm">
              <CardContent className="flex items-center gap-4">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: email.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{email.label}</p>
                  <CopyText
                    text={email.address}
                    className="block max-w-full truncate text-left text-sm text-muted-foreground"
                  >
                    {email.address}
                  </CopyText>
                </div>
                <Badge variant="secondary">
                  {email.usageCount} app{email.usageCount === 1 ? '' : 's'}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${email.label}`}
                    onClick={() => openEdit(email)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${email.label}`}
                    disabled={email.usageCount > 0}
                    title={
                      email.usageCount > 0
                        ? 'In use — reassign its apps first'
                        : undefined
                    }
                    onClick={() => handleDelete(email)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit email' : 'Add email'}</DialogTitle>
            <DialogDescription>
              A label and the address you use to sign up.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                name="label"
                placeholder="Business 1"
                defaultValue={editing?.label}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Email address</Label>
              <Input
                id="address"
                name="address"
                type="email"
                placeholder="me@company.com"
                defaultValue={editing?.address}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    aria-label={`Color ${choice}`}
                    className="size-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: choice,
                      borderColor:
                        choice === color ? 'var(--foreground)' : 'transparent',
                    }}
                    onClick={() => setColor(choice)}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? 'Save changes' : 'Add email'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
