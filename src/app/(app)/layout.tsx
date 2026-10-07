import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { requireSession } from '@/lib/session';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();

  return (
    <SidebarProvider>
      <TooltipProvider delayDuration={300}>
      <AppSidebar name={user.name} email={user.email} />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
          {children}
        </main>
      </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
