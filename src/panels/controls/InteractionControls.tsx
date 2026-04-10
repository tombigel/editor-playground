import type { ReactNode } from 'react';
import { DARK_TOOLTIP_CLASS } from '@/lib/utils';
import {
  BetweenHorizontalStart,
  ListEnd,
  ListStart,
  PanelBottom,
  PanelTop,
} from 'lucide-react';
import type { ContainerNode } from '../../model/types';
import { Button } from '@/components/ui/button';
import { PopoverTooltip } from '@/components/ui/popover';
import { LabeledControlRow } from '@/components/ui/settings-panel';

// ---------------------------------------------------------------------------
// OrderIconButton
// ---------------------------------------------------------------------------

export function OrderIconButton({
  label,
  shortcut,
  onClick,
  disabled,
  compact = false,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className={DARK_TOOLTIP_CLASS}
      content={
        <>
          <div className="leading-3.5 font-medium">{label}</div>
          {shortcut ? (
            <div className="editor-tooltip-shortcut mt-0.5 font-mono text-[10px] font-light leading-3">{shortcut}</div>
          ) : null}
        </>
      }
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`${compact ? 'h-8 w-8' : 'h-8 w-8'} p-0 text-xs`}
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

// ---------------------------------------------------------------------------
// TypeIconButton (internal)
// ---------------------------------------------------------------------------

function TypeIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className={DARK_TOOLTIP_CLASS}
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Button
        type="button"
        variant={active ? 'default' : 'outline'}
        size="sm"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className="h-8 w-8 p-0 text-xs"
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

// ---------------------------------------------------------------------------
// TextStyleIconButton
// ---------------------------------------------------------------------------

export function TextStyleIconButton({
  label,
  active,
  disabled = false,
  mixed = false,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  mixed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className={DARK_TOOLTIP_CLASS}
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Button
        type="button"
        variant={active ? 'default' : 'outline'}
        size="sm"
        aria-label={label}
        aria-pressed={mixed ? 'mixed' : active}
        onClick={onClick}
        disabled={disabled}
        className="h-8 w-8 p-0 text-xs"
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

// ---------------------------------------------------------------------------
// SectionTypeSelector (internal)
// ---------------------------------------------------------------------------

function SectionTypeSelector({
  currentType,
  onPromote,
  onDemote,
}: {
  currentType: 'section' | 'header' | 'footer' | null;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
      <TypeIconButton
        label="Set type to Section"
        active={currentType === 'section'}
        onClick={currentType === 'section' ? () => {} : onDemote}
      >
        <BetweenHorizontalStart className="h-3.5 w-3.5" />
      </TypeIconButton>
      <TypeIconButton
        label="Set type to Header"
        active={currentType === 'header'}
        onClick={currentType === 'header' ? () => {} : () => onPromote('header')}
      >
        <PanelTop className="h-3.5 w-3.5" />
      </TypeIconButton>
      <TypeIconButton
        label="Set type to Footer"
        active={currentType === 'footer'}
        onClick={currentType === 'footer' ? () => {} : () => onPromote('footer')}
      >
        <PanelBottom className="h-3.5 w-3.5" />
      </TypeIconButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WrapperActions
// ---------------------------------------------------------------------------

export function WrapperActions({
  node,
  canSectionBack,
  canSectionForward,
  onSectionBack,
  onSectionForward,
  onPromote,
  onDemote,
}: {
  node: ContainerNode;
  canSectionBack: boolean;
  canSectionForward: boolean;
  onSectionBack: () => void;
  onSectionForward: () => void;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  const currentType =
    node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer' ? node.subtype : null;

  if (node.subtype === 'section') {
    return (
      <div className="space-y-1.5">
        <LabeledControlRow
          label="Order"
          className="gap-1"
          labelClassName="flex-none text-[11px] font-medium"
          controlClassName="ml-0 flex-1 flex-nowrap gap-1 justify-end"
        >
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
            <OrderIconButton compact label="Move Section Up" onClick={onSectionBack} disabled={!canSectionBack}>
              <ListStart className="h-3.5 w-3.5" />
            </OrderIconButton>
            <OrderIconButton compact label="Move Section Down" onClick={onSectionForward} disabled={!canSectionForward}>
              <ListEnd className="h-3.5 w-3.5" />
            </OrderIconButton>
          </div>
        </LabeledControlRow>
        <LabeledControlRow
          label="Section type"
          className="gap-1"
          labelClassName="flex-none text-[11px] font-medium"
          controlClassName="ml-0 flex-1"
        >
          <SectionTypeSelector currentType={currentType} onPromote={onPromote} onDemote={onDemote} />
        </LabeledControlRow>
      </div>
    );
  }

  return (
    <LabeledControlRow
      label="Section type"
      className="gap-1"
      labelClassName="flex-none text-[11px] font-medium"
      controlClassName="ml-0 flex-1"
    >
      <SectionTypeSelector currentType={currentType} onPromote={onPromote} onDemote={onDemote} />
    </LabeledControlRow>
  );
}
