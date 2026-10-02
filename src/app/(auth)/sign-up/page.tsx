import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth, hasAnyUser } from '@/lib/auth';

import { SignUpForm } from './sign-up-form';

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect('/');
  }
  // Sign-up is only open until the first (owner) account exists.
  if (await hasAnyUser()) {
    redirect('/sign-in');
  }
  return <SignUpForm />;
}
