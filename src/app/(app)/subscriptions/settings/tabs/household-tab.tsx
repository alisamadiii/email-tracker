'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import {
  createHouseholdMember,
  deleteHouseholdMember,
  updateHouseholdMember,
} from '@/app/actions/household';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import type { MemberOption } from '../../types';

export function HouseholdTab({ members }: { members: MemberOption[] }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = editingId
      ? await updateHouseholdMember(editingId, { name, email })
      : await createHouseholdMember({ name, email });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? 'Member updated' : 'Member added');
    setName('');
    setEmail('');
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const result = await deleteHouseholdMember(id);
    if (result.error) toast.error(result.error);
    else toast.success('Member removed');
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-heading">Household members</CardTitle>
        <CardDescription>
          Assign subscriptions to the person paying. Members with an email get
          their own renewal reminders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="min-w-32 flex-1"
            required
          />
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            type="email"
            className="min-w-40 flex-1"
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
                setEmail('');
              }}
            >
              Cancel
            </Button>
          )}
        </form>

        {members.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" /> No members yet — subscriptions default
            to you.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  {m.email && (
                    <p className="truncate text-sm text-muted-foreground">
                      {m.email}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingId(m.id);
                    setName(m.name);
                    setEmail(m.email ?? '');
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(m.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
