import * as React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { PopoverSurface } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type FloatingPanelShellProps = Omit<React.ComponentPropsWithoutRef<typeof PopoverSurface>, 'children'> & {
  header?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
  suppressPopover?: boolean;
  positionMode?: 'fixed' | 'absolute';
};

export const FloatingPanelShell = React.forwardRef<HTMLDivElement, FloatingPanelShellProps>(
  ({
    header,
    children,
    className,
    bodyClassName,
    bodyStyle,
    suppressPopover = false,
    positionMode = 'fixed',
    open,
    onOpenChange,
    popoverMode,
    ...props
  }, ref) => {
    const shellClassName = cn(
      'editor-floating-panel editor-bg-surface editor-border-subtle rounded-xl border shadow-[0_16px_34px_rgba(18,32,51,0.18)]',
      positionMode === 'fixed' ? 'fixed' : 'absolute',
      className,
    );

    if (suppressPopover) {
      return (
        <div
          ref={ref}
          data-ui="floating-panel-shell"
          className={shellClassName}
          {...props}
        >
          {header}
          <div data-ui="floating-panel-body" className={bodyClassName} style={bodyStyle}>
            {children}
          </div>
        </div>
      );
    }

    return (
      <PopoverSurface
        ref={ref}
        data-ui="floating-panel-shell"
        className={shellClassName}
        open={open}
        onOpenChange={onOpenChange}
        popoverMode={popoverMode}
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
