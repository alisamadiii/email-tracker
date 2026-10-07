'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function MonthNav({
  label,
  prev,
  next,
  isCurrent,
}: {
  label: string;
  prev: string;
  next: string;
  isCurrent: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/subscriptions/calendar?month=${prev}`} aria-label="Previous month">
          <ChevronLeft />
        </Link>
      </Button>
      <span className="min-w-36 text-center font-heading text-lg font-semibold">
        {label}
      </span>
      <Button variant="outline" size="icon" asChild>
        <Link href={`/subscriptions/calendar?month=${next}`} aria-label="Next month">
          <ChevronRight />
        </Link>
      </Button>
      {!isCurrent && (
        <Button variant="ghost" asChild>
          <Link href="/subscriptions/calendar">Today</Link>
        </Button>
      )}
    </div>
  );
}
