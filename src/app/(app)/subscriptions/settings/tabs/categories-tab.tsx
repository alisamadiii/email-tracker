'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  createSubscriptionCategory,
  deleteSubscriptionCategory,
  renameSubscriptionCategory,
} from '@/app/actions/subscription-categories';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import type { CategoryOption } from '../../types';

export function CategoriesTab({ categories }: { categories: CategoryOption[] }) {
  const [name, setName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = editingId
      ? await renameSubscriptionCategory(editingId, { name })
      : await createSubscriptionCategory({ name });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? 'Category renamed' : 'Category added');
    setName('');
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const result = await deleteSubscriptionCategory(id);
    if (result.error) toast.error(result.error);
    else toast.success('Category deleted');
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-heading">Categories</CardTitle>
        <CardDescription>
          Group subscriptions for filtering and stats. Categories in use cannot
          be deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
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
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 truncate font-medium">{c.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingId(c.id);
                  setName(c.name);
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(c.id)}
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
