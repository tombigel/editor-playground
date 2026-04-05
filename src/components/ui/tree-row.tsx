import { ChevronDown, ChevronRight, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

const ROW_INDENT_PX = 8;

export interface TreeRowItemProps
  extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected?: boolean;
  isHidden?: boolean;
  isDragging?: boolean;
  onToggle?: () => void;
  onToggleAriaLabel?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  icon?: ReactNode;
  label: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export const TreeRowItem = forwardRef<HTMLDivElement, TreeRowItemProps>(
  (
    {
      depth,
      hasChildren,
      isExpanded,
      isSelected,
      isHidden,
      isDragging,
      onToggle,
      onToggleAriaLabel,
      onPointerDown,
      icon,
      label,
      actions,
      children,
      className = '',
      ...restProps
    },
    ref,
  ) => {
    const DisclosureIcon: LucideIcon = isExpanded ? ChevronDown : ChevronRight;

    return (
      <>
        {children}
        <div
          ref={ref}
          className={`editor-layers-row group ${className}`}
          data-selected={isSelected ? 'true' : 'false'}
          data-hidden={isHidden ? 'true' : 'false'}
          data-dragging={isDragging ? 'true' : 'false'}
          style={{
            paddingLeft: `${8 + depth * ROW_INDENT_PX}px`,
          }}
          {...restProps}
        >
          {hasChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="editor-layers-disclosure h-5 w-5 rounded-md"
              data-layers-control="true"
              aria-label={onToggleAriaLabel}
              onClick={(event) => {
                event.stopPropagation();
                onToggle?.();
              }}
            >
              <DisclosureIcon className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <span aria-hidden="true" className="block h-5 w-5 shrink-0" />
          )}

          <div
            className="editor-layers-row-main min-w-0 flex-1"
            onPointerDown={(event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest('[data-layers-control="true"], [data-layers-title-editor="true"]')) {
                return;
              }
              onPointerDown?.(event);
            }}
          >
            {icon && <span className="editor-layers-row-icon">{icon}</span>}
            {label}
          </div>

          {actions && <div className="editor-layers-row-actions flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      </>
    );
  },
);

TreeRowItem.displayName = 'TreeRowItem';

export interface VisibilityToggleProps {
  isHidden: boolean;
  onToggle: () => void;
  nodeId: string;
  label?: string;
  disabled?: boolean;
}

export function VisibilityToggle({ isHidden, onToggle, nodeId, label, disabled = false }: VisibilityToggleProps) {
  const defaultLabel = isHidden ? 'Show' : 'Hide';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="editor-layers-action editor-layers-action-visibility h-7 w-7 rounded-md border"
      data-layers-control="true"
      aria-label={`${label ?? defaultLabel} ${nodeId}`}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) {
          return;
        }
        onToggle();
      }}
    >
      {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
    </Button>
  );
}
