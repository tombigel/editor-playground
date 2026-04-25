import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

const switchRootSizeClasses = {
  compact: 'h-4 w-7',
  large: 'h-5 w-9',
} as const;

const switchRootToneClasses = {
  default:
    'border-transparent bg-[var(--editor-switch-background)] data-[state=checked]:bg-[var(--editor-switch-background-checked)]',
  mixed: 'border-[var(--editor-surface-border)] bg-transparent data-[state=checked]:bg-transparent data-[state=unchecked]:bg-transparent',
} as const;

const switchThumbSizeClasses = {
  compact: 'size-3 data-[state=unchecked]:translate-x-[1px] data-[state=checked]:translate-x-[13px]',
  large: 'size-4 data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-[17px]',
} as const;

const switchMixedThumbClasses = {
  compact: 'border border-dashed border-[var(--editor-switch-mixed-indicator)] data-[state=unchecked]:translate-x-[7px]',
  large: 'border border-dashed border-[var(--editor-switch-mixed-indicator)] data-[state=unchecked]:translate-x-[9px]',
} as const;

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
      'peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50',
      switchRootSizeClasses[size],
      mixed ? switchRootToneClasses.mixed : switchRootToneClasses.default,
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      data-ui="switch-thumb"
      className={cn(
        'pointer-events-none absolute left-0 top-1/2 block rounded-full bg-white shadow-sm ring-0 transition-transform -translate-y-1/2',
        switchThumbSizeClasses[size],
        mixed && switchMixedThumbClasses[size],
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
