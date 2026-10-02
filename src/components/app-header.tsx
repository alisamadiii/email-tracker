'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Mail, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/emails', label: 'Emails' },
] as const;

export function AppHeader({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  async function handleSignOut() {
    await signOut();
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Mail className="size-4" />
          </span>
          Email Tracker
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground',
                pathname === item.href && 'bg-muted text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() =>
              setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
            }
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{name}</div>
                <div className="text-xs font-normal break-all text-muted-foreground">
                  {email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
