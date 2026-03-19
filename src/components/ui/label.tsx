import type * as React from 'react';

import { cn } from '@/lib/utils';

function Label({
  className,
  ...props
}: React.ComponentProps<'label'>) {
  return (
    <label
      className={cn('editor-text-muted text-[13px] font-medium', className)}
      {...props}
    />
  );
}

export { Label };
