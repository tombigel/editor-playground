import * as React from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type NativePopoverElement = HTMLDivElement & {
  showPopover: () => void;
  hidePopover: () => void;
};

type PopoverSurfaceProps = React.ComponentProps<'div'> & {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  popoverMode?: 'auto' | 'manual';
};

export const PopoverSurface = React.forwardRef<HTMLDivElement, PopoverSurfaceProps>(
  ({ open, onOpenChange, popoverMode = 'manual', className, children, ...props }, forwardedRef) => {
    const localRef = React.useRef<NativePopoverElement | null>(null);
    const setRef = React.useCallback(
      (node: NativePopoverElement | null) => {
        localRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    React.useEffect(() => {
      const element = localRef.current;
      if (!element) {
        return;
      }

      if (open) {
        if (!element.matches(':popover-open')) {
          element.showPopover();
        }
        return;
      }

      if (element.matches(':popover-open')) {
        element.hidePopover();
      }
    }, [open]);

    React.useEffect(() => {
      const element = localRef.current;
      if (!element || !onOpenChange) {
        return;
      }

      const handleToggle = () => {
        onOpenChange(element.matches(':popover-open'));
      };

      element.addEventListener('toggle', handleToggle);
      return () => element.removeEventListener('toggle', handleToggle);
    }, [onOpenChange]);

    return (
      <div
        ref={setRef}
        popover={popoverMode}
        className={cn('ui-popover-surface m-0 outline-none', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
PopoverSurface.displayName = 'PopoverSurface';

type PopoverTooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom';
  align?: 'start' | 'center' | 'end';
  className?: string;
  offset?: number;
};

export function PopoverTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
  offset = 12,
}: PopoverTooltipProps) {
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const popoverRef = React.useRef<NativePopoverElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [style, setStyle] = React.useState<CSSProperties>({ top: 0, left: 0, visibility: 'hidden' });

  React.useEffect(() => {
    const element = popoverRef.current;
    if (!element) {
      return;
    }

    if (!open) {
      if (element.matches(':popover-open')) {
        element.hidePopover();
      }
      return;
    }

    if (!element.matches(':popover-open')) {
      element.showPopover();
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const margin = 12;
      let left = triggerRect.left;
      let top = triggerRect.top;

      if (side === 'right') {
        left = triggerRect.right + offset;
        if (align === 'center') {
          top = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;
        } else if (align === 'end') {
          top = triggerRect.bottom - popoverRect.height;
        }
      } else if (side === 'bottom') {
        top = triggerRect.bottom + offset;
        if (align === 'center') {
          left = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
        } else if (align === 'end') {
          left = triggerRect.right - popoverRect.width;
        }
      } else {
        top = triggerRect.top - popoverRect.height - offset;
        if (align === 'center') {
          left = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
        } else if (align === 'end') {
          left = triggerRect.right - popoverRect.width;
        }
      }

      setStyle({
        top: Math.max(margin, Math.min(window.innerHeight - popoverRect.height - margin, top)),
        left: Math.max(margin, Math.min(window.innerWidth - popoverRect.width - margin, left)),
        visibility: 'visible',
      });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [align, offset, open, side]);

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      <div
        ref={popoverRef}
        popover="manual"
        role="tooltip"
        className={cn(
          'ui-popover-tooltip fixed m-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] outline-none',
          className,
        )}
        style={style}
      >
        {content}
      </div>
    </>
  );
}
