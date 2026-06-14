import * as React from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';

const TOOLTIP_HOVER_DELAY_MS = 200;
let visibleTooltipCount = 0;
let tooltipDelayBypassUntil = 0;

type NativePopoverElement = HTMLDivElement & {
  showPopover: () => void;
  hidePopover: () => void;
};

type PopoverAttributeProps = React.HTMLAttributes<HTMLDivElement> & {
  popover?: 'auto' | 'manual';
};

type PopoverSurfaceProps = React.ComponentProps<'div'> & {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  popoverMode?: 'auto' | 'manual';
  bringToFrontKey?: React.Key;
  keepTopLayer?: boolean;
};

export function bringPopoverSurfaceToFront(element: NativePopoverElement) {
  if (element.matches(':popover-open')) {
    element.hidePopover();
  }
  element.showPopover();
}

export const PopoverSurface = React.forwardRef<HTMLDivElement, PopoverSurfaceProps>(
  (
    {
      open,
      onOpenChange,
      popoverMode = 'manual',
      bringToFrontKey,
      keepTopLayer = false,
      className,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const localRef = React.useRef<NativePopoverElement | null>(null);
    const surfaceProps: PopoverAttributeProps = {
      ...props,
      popover: popoverMode,
    };
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
      if (!element || !open || bringToFrontKey == null) {
        return;
      }

      let innerFrame = 0;
      const outerFrame = window.requestAnimationFrame(() => {
        innerFrame = window.requestAnimationFrame(() => {
          bringPopoverSurfaceToFront(element);
        });
      });

      return () => {
        window.cancelAnimationFrame(outerFrame);
        window.cancelAnimationFrame(innerFrame);
      };
    }, [bringToFrontKey, open]);

    React.useEffect(() => {
      const element = localRef.current;
      if (!element || !open || !keepTopLayer) {
        return;
      }

      let frame = 0;
      const handleToggle = (event: Event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || target === element || !target.matches(':popover-open')) {
          return;
        }
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          bringPopoverSurfaceToFront(element);
        });
      };

      document.addEventListener('toggle', handleToggle, true);
      return () => {
        window.cancelAnimationFrame(frame);
        document.removeEventListener('toggle', handleToggle, true);
      };
    }, [keepTopLayer, open]);

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
        hidden={!open}
        aria-hidden={open ? undefined : true}
        data-state={open ? 'open' : 'closed'}
        className={cn('ui-popover-surface m-0 outline-none', className)}
        {...surfaceProps}
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

export function getTooltipDelayBypassUntil(now = Date.now()) {
  return now + TOOLTIP_HOVER_DELAY_MS;
}

export function shouldBypassTooltipDelay(
  hasVisibleTooltip: boolean,
  now = Date.now(),
  delayBypassUntil = tooltipDelayBypassUntil,
) {
  return hasVisibleTooltip || now < delayBypassUntil;
}

export function getTooltipHoverDelay(
  hasVisibleTooltip: boolean,
  now = Date.now(),
  delayBypassUntil = tooltipDelayBypassUntil,
) {
  return shouldBypassTooltipDelay(hasVisibleTooltip, now, delayBypassUntil) ? 0 : TOOLTIP_HOVER_DELAY_MS;
}

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
  const openTimerRef = React.useRef<number | null>(null);
  const registeredVisibleRef = React.useRef(false);
  const [open, setOpen] = React.useState(false);
  const [style, setStyle] = React.useState<CSSProperties>({ top: 0, left: 0, visibility: 'hidden' });

  const clearOpenTimer = React.useCallback(() => {
    if (openTimerRef.current != null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const openFromHover = React.useCallback(() => {
    clearOpenTimer();
    const delay = getTooltipHoverDelay(visibleTooltipCount > 0);
    if (delay === 0) {
      setOpen(true);
      return;
    }
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setOpen(true);
    }, delay);
  }, [clearOpenTimer]);

  const closeFromHover = React.useCallback(() => {
    clearOpenTimer();
    if (registeredVisibleRef.current) {
      tooltipDelayBypassUntil = getTooltipDelayBypassUntil();
    }
    setOpen(false);
  }, [clearOpenTimer]);

  React.useEffect(() => clearOpenTimer, [clearOpenTimer]);

  React.useEffect(() => {
    if (open && !registeredVisibleRef.current) {
      visibleTooltipCount += 1;
      registeredVisibleRef.current = true;
    } else if (!open && registeredVisibleRef.current) {
      visibleTooltipCount = Math.max(0, visibleTooltipCount - 1);
      registeredVisibleRef.current = false;
    }

    return () => {
      if (registeredVisibleRef.current) {
        visibleTooltipCount = Math.max(0, visibleTooltipCount - 1);
        registeredVisibleRef.current = false;
      }
    };
  }, [open]);

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
      {/* biome-ignore lint/a11y/noStaticElementInteractions: tooltip trigger wrapper delegates interaction to children */}
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={openFromHover}
        onMouseLeave={closeFromHover}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      <div
        ref={popoverRef}
        {...({ popover: 'manual' } as PopoverAttributeProps)}
        role="tooltip"
        className={cn(
          'editor-tooltip-panel ui-popover-tooltip fixed m-0 rounded-xl border px-3 py-2 text-xs font-medium outline-none',
          className,
        )}
        style={style}
      >
        {content}
      </div>
    </>
  );
}
