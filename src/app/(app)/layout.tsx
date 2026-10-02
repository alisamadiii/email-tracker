import { AppHeader } from '@/components/app-header';
import { requireSession } from '@/lib/session';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <AppHeader name={user.name} email={user.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
