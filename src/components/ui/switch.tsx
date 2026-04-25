import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    mixed?: boolean;
    size?: 'compact' | 'large';
  }
>(({ className, mixed = false, size = 'compact', ...props }, ref) => (
  <SwitchPrimitive.Root
    data-ui="switch"
    data-mixed={mixed ? 'true' : 'false'}
    data-size={size}
    className={cn(
      'peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[var(--editor-switch-background)] transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50',
      size === 'large' ? 'h-5 w-9' : 'h-4 w-7',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      data-ui="switch-thumb"
      className={cn(
        'pointer-events-none absolute left-0 top-1/2 block rounded-full bg-white shadow-sm ring-0 transition-transform -translate-y-1/2 data-[state=unchecked]:translate-x-0.5',
        size === 'large'
          ? 'size-4 data-[state=checked]:translate-x-[18px]'
          : 'size-3 data-[state=checked]:translate-x-[13px]',
        mixed && (size === 'large' ? 'data-[state=unchecked]:translate-x-[10px]' : 'data-[state=unchecked]:translate-x-[6px]'),
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
