import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150 outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'shadow-sm',
        secondary: 'shadow-sm',
        outline: 'border shadow-sm',
        ghost: '',
        menu:
          'border border-transparent bg-transparent text-[color:var(--editor-utility-text-strong)] shadow-none hover:bg-[color:color-mix(in_srgb,var(--editor-accent)_10%,var(--editor-surface-background))] hover:text-[color:var(--editor-accent)] focus-visible:bg-[color:color-mix(in_srgb,var(--editor-accent)_10%,var(--editor-surface-background))] focus-visible:text-[color:var(--editor-accent)] data-[selected=true]:bg-[color:color-mix(in_srgb,var(--editor-accent)_10%,var(--editor-surface-background))] data-[selected=true]:text-[color:var(--editor-accent)] aria-pressed:bg-[color:color-mix(in_srgb,var(--editor-accent)_10%,var(--editor-surface-background))] aria-pressed:text-[color:var(--editor-accent)]',
        destructive: 'border shadow-sm',
      },
      size: {
        default: 'h-7 px-3 py-1.5',
        sm: 'h-7 rounded-md px-2.5 text-xs',
        icon: 'size-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        data-ui="button"
        data-variant={variant ?? 'default'}
        data-size={size ?? 'default'}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
