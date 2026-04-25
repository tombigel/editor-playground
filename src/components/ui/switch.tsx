import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    mixed?: boolean;
  }
>(({ className, mixed = false, ...props }, ref) => (
  <SwitchPrimitive.Root
    data-ui="switch"
    data-mixed={mixed ? 'true' : 'false'}
    className={cn(
      'peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[var(--editor-switch-background)] transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      data-ui="switch-thumb"
      className={cn(
        'pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5',
        mixed && 'data-[state=unchecked]:translate-x-[9px]',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
