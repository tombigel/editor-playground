import type * as React from 'react';

import { cn } from '@/lib/utils';

function Label({
  className,
  ...props
}: React.ComponentProps<'label'>) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: reusable component — consumer provides htmlFor or wraps a control
    <label
      className={cn('editor-text-muted text-[13px] font-medium', className)}
      {...props}
    />
  );
}

export { Label };
