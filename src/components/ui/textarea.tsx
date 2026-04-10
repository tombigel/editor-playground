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
        'flex min-h-20 w-full rounded-sm border px-3 py-2 text-sm shadow-sm transition-[color,box-shadow,border-color] outline-none placeholder:text-[color:var(--editor-input-placeholder)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
