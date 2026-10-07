'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  Calendar,
  Download,
  Layers,
  LayoutGrid,
  List,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { deleteAppAccount } from '@/app/actions/app-accounts';
import { CopyText } from '@/components/copy-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { AppDialog } from './app-dialog';
import type { AppRow, CategoryOption, EmailOption } from './types';

type SortKey = 'recent' | 'name';

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Recently added',
  name: 'Name',
};

const ALL = 'all';

export function AppIcon({
  app,
  color,
  className,
}: {
  app: Pick<AppRow, 'name' | 'favicon'>;
  color: string;
  className?: string;
}) {
  if (app.favicon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={app.favicon}
        alt=""
        className={cn('size-10 rounded-md object-contain', className)}
      />
    );
  }
  return (
    <span
      className={cn(
        'flex size-10 items-center justify-center rounded-md text-base font-semibold text-white',
        className
      )}
      style={{ backgroundColor: color }}
    >
      {app.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function DashboardClient({
  emails,
  apps,
  categories,
}: {
  emails: EmailOption[];
  apps: AppRow[];
  categories: CategoryOption[];
}) {
  const [search, setSearch] = useState('');
  const [emailFilter, setEmailFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [sort, setSort] = useState<SortKey>('recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [groupByDomain, setGroupByDomain] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppRow | null>(null);

  const emailById = useMemo(
    () => new Map(emails.map((e) => [e.id, e])),
    [emails]
  );

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = apps.filter((app) => {
      if (emailFilter !== ALL && app.emailId !== emailFilter) return false;
      if (categoryFilter !== ALL && app.categoryId !== categoryFilter)
        return false;
      const categoryName = app.categoryId
        ? (categoryById.get(app.categoryId)?.name ?? '')
        : '';
      if (
        q &&
        !app.name.toLowerCase().includes(q) &&
        !categoryName.toLowerCase().includes(q) &&
        !(app.notes ?? '').toLowerCase().includes(q)
      )
        return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [apps, search, emailFilter, categoryFilter, sort, categoryById]);

  // Sections keyed by the domain of the email each app was signed up with.
  const grouped = useMemo(() => {
    if (!groupByDomain) return null;
    const map = new Map<string, AppRow[]>();
    for (const app of visible) {
      const address = emailById.get(app.emailId)?.address ?? '';
      const domain = address.split('@')[1] ?? 'unknown';
      map.set(domain, [...(map.get(domain) ?? []), app]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [groupByDomain, visible, emailById]);

  function exportCsv() {
    const esc = (v: string | null | undefined) =>
      `"${String(v ?? '').replaceAll('"', '""')}"`;
    const header = [
      'name',
      'url',
      'email_label',
      'email_address',
      'category',
      'notes',
      'created_at',
    ].join(',');
    const rows = apps.map((a) => {
      const email = emailById.get(a.emailId);
      const category = a.categoryId
        ? categoryById.get(a.categoryId)?.name
        : '';
      return [
        a.name,
        a.url,
        email?.label,
        email?.address,
        category,
        a.notes,
        a.createdAt,
      ]
        .map(esc)
        .join(',');
    });
    const blob = new Blob([[header, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'business-tracker-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(app: AppRow) {
    setEditing(app);
    setDialogOpen(true);
  }

  async function handleDelete(app: AppRow) {
    const { error } = await deleteAppAccount(app.id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`${app.name} deleted`);
  }

  const gridClass =
    view === 'grid'
      ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid gap-2';

  const renderApp = (app: AppRow) => {
    const email = emailById.get(app.emailId);
    const color = email?.color ?? '#6366f1';
    const categoryName = app.categoryId
      ? categoryById.get(app.categoryId)?.name
      : null;
    const menu = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${app.name}`}
            className="text-muted-foreground"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(app)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDelete(app)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    if (view === 'list') {
      return (
        <Card key={app.id} size="sm">
          <CardContent className="flex items-center gap-3">
            <AppIcon app={app} color={color} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{app.name}</p>
              <CopyText
                text={email?.address ?? ''}
                className="block max-w-full truncate text-left text-xs text-muted-foreground"
              >
                {email?.address}
              </CopyText>
            </div>
            {categoryName && <Badge variant="outline">{categoryName}</Badge>}
            <Badge variant="secondary" style={{ color }} className="font-medium">
              {email?.label}
            </Badge>
            {menu}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={app.id}>
        <CardHeader>
          <AppIcon app={app} color={color} className="mb-2" />
          <CardTitle>{app.name}</CardTitle>
          <CardDescription className="truncate">
            <CopyText text={email?.address ?? ''}>{email?.address}</CopyText>
          </CardDescription>
          <CardAction>{menu}</CardAction>
        </CardHeader>
        <CardFooter className="flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" style={{ color }} className="font-medium">
            {email?.label}
          </Badge>
          {categoryName && <Badge variant="outline">{categoryName}</Badge>}
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3" />
            {app.createdAt.slice(0, 10)}
          </span>
          {app.notes && (
            <span className="inline-flex items-center gap-1" title={app.notes}>
              <StickyNote className="size-3" />
              Note
            </span>
          )}
        </CardFooter>
      </Card>
    );
  };

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Mail className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Add your emails first</p>
            <p className="text-sm text-muted-foreground">
              Set up the emails you sign up with, then start tracking apps.
            </p>
          </div>
          <Button asChild>
            <Link href="/email/emails">
              <Plus className="size-4" />
              Add emails
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Stats per email */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {emails.map((email) => {
          const n = apps.filter((a) => a.emailId === email.id).length;
          const active = emailFilter === email.id;
          return (
            <button
              key={email.id}
              type="button"
              onClick={() => setEmailFilter(active ? ALL : email.id)}
              className={cn(
                'rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50',
                active && 'ring-2 ring-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: email.color }}
                />
                <span className="text-sm font-medium">{email.label}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{n}</p>
              <p className="truncate text-xs text-muted-foreground">
                {email.address}
              </p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          New App
        </Button>

        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="pl-8"
          />
        </div>

        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Sort">
              <ArrowUpDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(v) => setSort(v as SortKey)}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex rounded-md border">
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            aria-label="List view"
            className="rounded-r-none"
            onClick={() => setView('list')}
          >
            <List className="size-4" />
          </Button>
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            aria-label="Grid view"
            className="rounded-l-none"
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>

        <Button
          variant={groupByDomain ? 'secondary' : 'outline'}
          size="icon"
          aria-label="Group by email domain"
          title="Group by email domain"
          onClick={() => setGroupByDomain((v) => !v)}
        >
          <Layers className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          aria-label="Export CSV"
          title="Export CSV"
          onClick={exportCsv}
        >
          <Download className="size-4" />
        </Button>
      </div>

      {/* Apps */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-medium">
              {apps.length === 0 ? 'No apps tracked yet' : 'Nothing matches'}
            </p>
            <p className="text-sm text-muted-foreground">
              {apps.length === 0
                ? 'Add the first app you signed up for.'
                : 'Try a different search or filter.'}
            </p>
            {apps.length === 0 && (
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                New App
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {grouped ? (
            <div className="grid gap-8">
              {grouped.map(([domain, domainApps]) => (
                <section key={domain} className="grid gap-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-semibold capitalize">
                      {domain.split('.')[0]}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {domain} · {domainApps.length} app
                      {domainApps.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className={gridClass}>{domainApps.map(renderApp)}</div>
                </section>
              ))}
            </div>
          ) : (
            <div className={gridClass}>{visible.map(renderApp)}</div>
          )}
        </>
      )}

      <AppDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        emails={emails}
        categories={categories}
        editing={editing}
      />
    </div>
  );
}
