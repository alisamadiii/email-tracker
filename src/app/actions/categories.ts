'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { categories } from '@/db/schema';
import { requireSession } from '@/lib/session';

export async function createCategory(name: string) {
  const { user } = await requireSession();

  const trimmed = name.trim();
  if (!trimmed) return { id: null, error: 'Category name is required' };

  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.userId, user.id), eq(categories.name, trimmed)),
  });
  if (existing) return { id: existing.id, error: null };

  const [row] = await db
    .insert(categories)
    .values({ userId: user.id, name: trimmed })
    .returning({ id: categories.id });

  revalidatePath('/');
  return { id: row.id, error: null };
}
