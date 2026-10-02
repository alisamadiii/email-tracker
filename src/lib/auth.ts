import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { count } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // First account ever created becomes admin; after that, signup is closed.
        before: async (userData) => {
          const [{ value: userCount }] = await db
            .select({ value: count() })
            .from(schema.user);

          if (userCount > 0) {
            throw new APIError('FORBIDDEN', {
              message: 'Sign-up is closed. This instance already has an owner.',
            });
          }

          return { data: { ...userData, role: 'admin' } };
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export async function hasAnyUser() {
  const [{ value }] = await db.select({ value: count() }).from(schema.user);
  return value > 0;
}
