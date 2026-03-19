import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      data-ui="textarea"
      className={cn(
        'editor-bg-surface editor-border-subtle editor-text-strong flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-[color,box-shadow,border-color] outline-none placeholder:text-slate-400 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
