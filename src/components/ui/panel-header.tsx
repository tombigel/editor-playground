import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PopoverTooltip } from '@/components/ui/popover';
import { cn, DARK_TOOLTIP_CLASS } from '@/lib/utils';

type PanelHeaderProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  closeLabel?: string;
  onClose?: () => void;
  closeTooltip?: boolean;
  className?: string;
  actions?: ReactNode;
};

export function PanelHeader({
  icon,
  title,
  description,
  closeLabel,
  onClose,
  closeTooltip = false,
  className,
  actions,
}: PanelHeaderProps) {
  const closeButton = onClose ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="editor-panel-header-close editor-icon-button-subtle rounded-lg border"
      onClick={onClose}
      aria-label={closeLabel}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>
  ) : null;

  return (
    <div
      data-ui="panel-header"
      className={cn('editor-panel-header editor-border-subtle flex w-full items-center justify-between gap-4 border-b px-4 py-3', className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon ? (
          <div
            data-ui="panel-header-icon"
            className="editor-panel-header-icon editor-icon-surface flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div data-ui="panel-header-title" className="editor-panel-header-title editor-text-strong text-sm font-medium">
            {title}
          </div>
          {description ? (
            <div
              data-ui="panel-header-description"
              className="editor-panel-header-description editor-text-muted text-xs"
            >
              {description}
            </div>
          ) : null}
        </div>
      </div>
      {(actions || onClose) ? (
        <div data-ui="panel-header-trailing" className="flex shrink-0 items-center gap-2">
          {actions ? (
            <div data-ui="panel-header-actions" className="editor-panel-header-actions flex items-center gap-2">
              {actions}
            </div>
          ) : null}
          {closeButton ? (
            closeTooltip ? (
              <PopoverTooltip
                content={closeLabel ?? 'Close'}
                side="bottom"
                align="end"
                className={DARK_TOOLTIP_CLASS}
              >
                {closeButton}
              </PopoverTooltip>
            ) : (
              closeButton
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
