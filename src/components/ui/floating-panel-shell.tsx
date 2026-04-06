import * as React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { PopoverSurface } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type FloatingPanelShellProps = Omit<React.ComponentPropsWithoutRef<typeof PopoverSurface>, 'children'> & {
  header?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
};

export const FloatingPanelShell = React.forwardRef<HTMLDivElement, FloatingPanelShellProps>(
  ({ header, children, className, bodyClassName, bodyStyle, ...props }, ref) => {
    return (
      <PopoverSurface
        ref={ref}
        data-ui="floating-panel-shell"
        className={cn(
          'editor-floating-panel editor-bg-surface editor-border-subtle fixed rounded-xl border shadow-[0_16px_34px_rgba(18,32,51,0.18)]',
          className,
        )}
        {...props}
      >
        {header}
        <div data-ui="floating-panel-body" className={bodyClassName} style={bodyStyle}>
          {children}
        </div>
      </PopoverSurface>
    );
  },
);
FloatingPanelShell.displayName = 'FloatingPanelShell';
