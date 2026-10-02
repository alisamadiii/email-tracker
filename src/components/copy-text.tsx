'use client';

import { Slot } from '@radix-ui/react-slot';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

/**
 * Click-to-copy wrapper. Copies `text` (or the child's text content) to the
 * clipboard. With `asChild`, behavior is merged onto the child element via
 * Radix Slot; otherwise it renders a <button>.
 */
export function CopyText({
  text,
  asChild = false,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  text?: string;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : 'button';

  async function handleCopy(e: React.MouseEvent<HTMLButtonElement>) {
    props.onClick?.(e);
    const value = text ?? e.currentTarget.textContent ?? '';
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${value}`);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <Comp
      type={asChild ? undefined : 'button'}
      {...props}
      onClick={handleCopy}
      title="Click to copy"
      className={cn(
        'cursor-pointer rounded-sm outline-none transition-[color,transform] duration-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-95',
        className
      )}
    >
      {children}
    </Comp>
  );
}
