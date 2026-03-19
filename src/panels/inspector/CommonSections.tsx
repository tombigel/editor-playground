import {
  ArrowBigDown,
  ArrowBigDownDash,
  ArrowBigUp,
  ArrowBigUpDash,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  PencilLine,
  SquareArrowOutUpRight,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { FocusedMode } from '../../api/editorApi';
import type { WrapperStyleField } from '../../api/documentApi';
import {
  getFocusedModeButtonAriaLabel,
  getFocusedModeTooltip,
  type ActiveFocusedMode,
} from '../../editor/focusedModes';
import {
  DEFAULT_SHADOW_BLUR_PX,
  DEFAULT_SHADOW_COLOR,
  DEFAULT_SHADOW_SPREAD_PX,
  DEFAULT_SHADOW_OFFSET_X_PX,
  DEFAULT_SHADOW_OFFSET_Y_PX,
} from '../../model/styleDefaults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverTooltip } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { InspectorActionHandlers, InspectorNode, InspectorOrderState, WrapperInspectorNode } from './types';
import {
  BorderControlGroup,
  HoverColorField,
  InspectorInlineRow,
  NumericUnitInlineField,
  OrderIconButton,
  ShadowControlGroup,
  SizeInlineField,
  SpacingField,
  WrapperActions,
  readShadowFieldValues,
  readUnifiedBorderColor,
  readUnifiedBorderRadius,
  readUnifiedBorderWidth,
} from '../InspectorControls';
import {
  applyUnifiedWrapperBorderColor,
  applyUnifiedWrapperBorderRadius,
  applyUnifiedWrapperBorderWidth,
  applyWrapperShadowPatch,
} from './styleFields';
import { createShadowFallback } from './contentSections/shared';

export type FocusedModeEntry = {
  mode: ActiveFocusedMode;
  label: string;
  ariaLabel?: string;
  tooltip?: string;
  onEnter: (mode: FocusedMode) => void;
};

export type InspectorSectionHeaderAction = {
  ariaLabel: string;
  icon: ReactNode;
  onClick: () => void;
};

export function InspectorSummary({
  node,
  actions,
}: {
  node: InspectorNode | null;
  actions: Pick<InspectorActionHandlers, 'onTextChange'>;
}) {
  if (!node) {
    return (
      <div className="flex h-full flex-col gap-1.5 p-2.5 text-xs">
        <div className="space-y-1.5 pb-1.5">
          <div className="editor-text-muted mt-1 text-xs">Select a node to inspect its layout and sticky config.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {node.type === 'site' ? (
            <div className="editor-text-strong text-[15px] font-medium leading-5">{node.name}</div>
          ) : (
            <EditableNodeTitle
              name={node.name}
              onCommit={(value) => {
                if (value !== node.name) {
                  actions.onTextChange('name', value);
                }
              }}
            />
          )}
          {node.type !== 'site' ? (
            <div className="mt-1">
              <span className="editor-pill-subtle inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium">
                {node.role}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EditableNodeTitle({
  name,
  onCommit,
  className,
  inputClassName,
}: {
  name: string;
  onCommit: (value: string) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(name);
    }
  }, [isEditing, name]);

  useEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }
    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  function commit() {
    setIsEditing(false);
    if (draft !== name) {
      onCommit(draft);
    }
  }

  function cancel() {
    setDraft(name);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (skipBlurCommitRef.current) {
            skipBlurCommitRef.current = false;
            return;
          }
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            skipBlurCommitRef.current = true;
            commit();
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            skipBlurCommitRef.current = true;
            cancel();
          }
        }}
        aria-label="Edit title"
        className={inputClassName ?? 'h-9 [field-sizing:content] text-[15px] font-medium'}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'editor-text-strong group min-w-0 cursor-text rounded-sm text-[15px] font-medium leading-5 outline-none transition-colors hover:text-[color:var(--editor-accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)]',
        className,
      )}
      aria-label="Edit title"
      onClick={() => setIsEditing(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsEditing(true);
        }
      }}
    >
      <div className="flex items-center gap-1">
        <div className="truncate">{name}</div>
        <PencilLine
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-[color:var(--editor-utility-text-muted)] opacity-0 transition-[opacity,color] group-hover:opacity-100 group-hover:text-[color:var(--editor-utility-text-strong)]"
        />
      </div>
    </div>
  );
}

export function NodeBasicsSection({
  node,
  orderState,
  actions,
  focusedMode,
  headerContent,
  headerAction,
}: {
  node: InspectorNode;
  orderState: InspectorOrderState;
  actions: Pick<InspectorActionHandlers, 'onRectChange' | 'onPromote' | 'onDemote' | 'onWrapperStyleChange'> & {
    onEnterFocusedMode?: InspectorActionHandlers['onEnterFocusedMode'];
  };
  focusedMode?: FocusedMode;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
}) {
  const topLevelWidthLocked =
    node.type === 'wrapper' &&
    (node.role === 'section' || node.role === 'header' || node.role === 'footer') &&
    node.rect.width.base.raw === '100%';
  const hidesPositionFields =
    node.type === 'wrapper' &&
    (node.role === 'section' || node.role === 'header' || node.role === 'footer');
  const isSectionHeight = node.type === 'wrapper' && node.role === 'section';
  const wrapperPaddingNode: WrapperInspectorNode | null =
    node.type === 'wrapper' &&
    (node.role === 'section' || node.role === 'header' || node.role === 'footer' || node.role === 'container')
      ? node
      : null;

  return (
    <InspectorSectionCard
      title="Layout"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName="space-y-2.5 px-3 py-3"
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'layout', actions.onEnterFocusedMode)}
    >
      {node.type !== 'site' ? (
        <div className="grid grid-cols-2 gap-1.5">
          {!hidesPositionFields ? (
            <>
              <SizeInlineField
                label="X"
                nodeId={node.id}
                value={node.rect.x.base.raw}
                onChange={(value) => actions.onRectChange('x', value)}
                axis="x"
              />
              <SizeInlineField
                label="Y"
                nodeId={node.id}
                value={node.rect.y.base.raw}
                onChange={(value) => actions.onRectChange('y', value)}
                axis="y"
              />
            </>
          ) : null}
          <SizeInlineField
            label="W"
            nodeId={node.id}
            value={node.rect.width.base.raw}
            onChange={(value) => actions.onRectChange('width', value)}
            axis="width"
            disabled={topLevelWidthLocked}
          />
          <SizeInlineField
            label="H"
            nodeId={node.id}
            value={node.rect.height.base.raw}
            onChange={(value) => actions.onRectChange('height', value)}
            axis="height"
            isSectionHeight={isSectionHeight}
          />
        </div>
      ) : null}
      {wrapperPaddingNode ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium">Padding</Label>
          <div className="grid grid-cols-2 gap-1.5">
            <LabeledPaddingField
              nodeId={wrapperPaddingNode.id}
              axis="top"
              icon={<ArrowUp className="h-3.5 w-3.5" />}
              ariaLabel="Top padding"
              value={wrapperPaddingNode.style.paddingTop?.raw ?? ''}
              onChange={(value) => actions.onWrapperStyleChange('paddingTop', value)}
            />
            <LabeledPaddingField
              nodeId={wrapperPaddingNode.id}
              axis="right"
              icon={<ArrowRight className="h-3.5 w-3.5" />}
              ariaLabel="Right padding"
              value={wrapperPaddingNode.style.paddingRight?.raw ?? ''}
              onChange={(value) => actions.onWrapperStyleChange('paddingRight', value)}
            />
            <LabeledPaddingField
              nodeId={wrapperPaddingNode.id}
              axis="bottom"
              icon={<ArrowDown className="h-3.5 w-3.5" />}
              ariaLabel="Bottom padding"
              value={wrapperPaddingNode.style.paddingBottom?.raw ?? ''}
              onChange={(value) => actions.onWrapperStyleChange('paddingBottom', value)}
            />
            <LabeledPaddingField
              nodeId={wrapperPaddingNode.id}
              axis="left"
              icon={<ArrowLeft className="h-3.5 w-3.5" />}
              ariaLabel="Left padding"
              value={wrapperPaddingNode.style.paddingLeft?.raw ?? ''}
              onChange={(value) => actions.onWrapperStyleChange('paddingLeft', value)}
            />
          </div>
        </div>
      ) : null}

      {orderState.showOrderControls ? (
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1.5">
          <Label className="text-[11px] font-medium">Order</Label>
          <div className="flex justify-end gap-1.5">
            <OrderIconButton
              label="Position Forward"
              shortcut={orderState.orderForwardShortcut}
              onClick={orderState.onOrderForward}
              disabled={!orderState.canOrderForward}
            >
              <ArrowBigUp className="h-4 w-4" />
            </OrderIconButton>
            <OrderIconButton
              label="Bring to Front"
              shortcut={orderState.bringToFrontShortcut}
              onClick={orderState.onBringToFront}
              disabled={!orderState.canBringToFront}
            >
              <ArrowBigUpDash className="h-4 w-4" />
            </OrderIconButton>
            <OrderIconButton
              label="Position Backward"
              shortcut={orderState.orderBackShortcut}
              onClick={orderState.onOrderBack}
              disabled={!orderState.canOrderBack}
            >
              <ArrowBigDown className="h-4 w-4" />
            </OrderIconButton>
            <OrderIconButton
              label="Send to Back"
              shortcut={orderState.sendToBackShortcut}
              onClick={orderState.onSendToBack}
              disabled={!orderState.canSendToBack}
            >
              <ArrowBigDownDash className="h-4 w-4" />
            </OrderIconButton>
          </div>
        </div>
      ) : null}

      {node.type === 'wrapper' ? (
        <WrapperActions
          node={node}
          canSectionBack={orderState.canSectionBack}
          canSectionForward={orderState.canSectionForward}
          onSectionBack={orderState.onSectionBack}
          onSectionForward={orderState.onSectionForward}
          onPromote={actions.onPromote}
          onDemote={actions.onDemote}
        />
      ) : null}
    </InspectorSectionCard>
  );
}

function LabeledPaddingField({
  nodeId,
  axis,
  icon,
  ariaLabel,
  value,
  onChange,
}: {
  nodeId: string;
  axis: 'top' | 'right' | 'bottom' | 'left';
  icon: ReactNode;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
      <div className="editor-text-muted flex h-8 items-center justify-center" aria-label={ariaLabel}>
        {icon}
      </div>
      <SpacingField nodeId={nodeId} axis={axis} value={value || '0px'} onChange={onChange} />
    </div>
  );
}

export function WrapperDesignSection({
  node,
  onWrapperStyleChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: WrapperInspectorNode;
  onWrapperStyleChange: (field: WrapperStyleField, value: string) => void;
  focusedMode?: FocusedMode;
  onEnterFocusedMode?: (mode: FocusedMode) => void;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
  contentClassName?: string;
}) {
  const supportsContainerSurfaceStyling = node.role === 'container';
  const allowsBackgroundOpacity = node.role === 'container';
  const shadowFallback = createShadowFallback(
    DEFAULT_SHADOW_COLOR,
    DEFAULT_SHADOW_BLUR_PX,
    DEFAULT_SHADOW_SPREAD_PX,
    DEFAULT_SHADOW_OFFSET_X_PX,
    DEFAULT_SHADOW_OFFSET_Y_PX,
  );
  const shadow = readShadowFieldValues(node.style, shadowFallback);

  return (
    <InspectorSectionCard
      title="Design"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'design', onEnterFocusedMode)}
    >
        <InspectorInlineRow label="Background" controlClassName="gap-2">
          <HoverColorField
            value={node.style.background}
            onChange={(value) => onWrapperStyleChange('background', value)}
            ariaLabel="Background color"
            showOpacity={allowsBackgroundOpacity}
          />
        </InspectorInlineRow>
        {supportsContainerSurfaceStyling ? (
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
            <Label className="pt-1 text-[11px] font-medium">Border</Label>
            <BorderControlGroup
              nodeId={node.id}
              colorValue={readUnifiedBorderColor(node.style)}
              widthValue={readUnifiedBorderWidth(node.style)}
              radiusValue={readUnifiedBorderRadius(node.style)}
              onColorChange={(value) => applyUnifiedWrapperBorderColor(onWrapperStyleChange, value)}
              onWidthChange={(value) => applyUnifiedWrapperBorderWidth(onWrapperStyleChange, value)}
              onRadiusChange={(value) => applyUnifiedWrapperBorderRadius(onWrapperStyleChange, value)}
            />
          </div>
        ) : null}
        {supportsContainerSurfaceStyling ? (
          <div className="space-y-1.5">
            <ShadowControlGroup
              color={shadow.color}
              blur={shadow.blur}
              spread={shadow.spread}
              distance={shadow.distance}
              angle={shadow.angle}
              colorFallback={DEFAULT_SHADOW_COLOR}
              supportsSpread
              onColorChange={(value) => applyWrapperShadowPatch(onWrapperStyleChange, node.style, shadowFallback, { color: value })}
              onBlurChange={(value) => applyWrapperShadowPatch(onWrapperStyleChange, node.style, shadowFallback, { blur: value })}
              onSpreadChange={(value) => applyWrapperShadowPatch(onWrapperStyleChange, node.style, shadowFallback, { spread: value })}
              onDistanceChange={(value) => applyWrapperShadowPatch(onWrapperStyleChange, node.style, shadowFallback, { distance: value })}
              onAngleChange={(value) => applyWrapperShadowPatch(onWrapperStyleChange, node.style, shadowFallback, { angle: value })}
            />
          </div>
        ) : null}

        {node.role === 'section' ? (
          <InspectorInlineRow label="Divider" controlClassName="gap-2">
            <NumericUnitInlineField
              value={node.style.sectionBorderBottomWidth?.raw ?? ''}
              units={['px']}
              onChange={(value) => onWrapperStyleChange('sectionBorderBottomWidth', value)}
              placeholder="1"
              min={0}
              className="w-[5.5rem]"
            />
            <HoverColorField
              value={node.style.sectionBorderBottomColor}
              onChange={(value) => onWrapperStyleChange('sectionBorderBottomColor', value)}
              ariaLabel="Bottom border color"
              fallback="#dbe3ee"
              showOpacity={false}
            />
          </InspectorInlineRow>
        ) : null}
    </InspectorSectionCard>
  );
}

export function InspectorSectionCard({
  title,
  headerContent,
  headerAction,
  focusedModeEntry,
  children,
  contentClassName = 'space-y-3 px-3 pt-1.5 pb-3',
  borderless = false,
  hideHeader = false,
}: {
  title: string;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
  focusedModeEntry?: FocusedModeEntry;
  children: ReactNode;
  contentClassName?: string;
  borderless?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <Card className={borderless ? 'border-0 bg-transparent shadow-none' : 'editor-border-subtle rounded-lg shadow-none'}>
      {!hideHeader ? (
        <CardHeader className="flex flex-row items-start justify-between gap-2 px-3 pt-3 pb-1">
          {headerContent ? (
            <div className="min-w-0 flex-1">{headerContent}</div>
          ) : (
            <CardTitle className="text-xs">{title}</CardTitle>
          )}
          {headerAction ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="editor-icon-button-subtle h-7 w-7 rounded-md border"
              aria-label={headerAction.ariaLabel}
              onClick={headerAction.onClick}
            >
              {headerAction.icon}
            </Button>
          ) : focusedModeEntry ? (
            <PopoverTooltip
              side="top"
              align="center"
              className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
              content={
                <div className="leading-3.5 font-medium">
                  {focusedModeEntry.tooltip ?? focusedModeEntry.label}
                </div>
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="editor-icon-button-subtle h-7 w-7 rounded-md border"
                aria-label={focusedModeEntry.ariaLabel ?? `Go to ${focusedModeEntry.label}`}
                onClick={() => focusedModeEntry.onEnter(focusedModeEntry.mode)}
              >
                <SquareArrowOutUpRight className="h-3.5 w-3.5" />
              </Button>
            </PopoverTooltip>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}


export function createFocusedModeEntry(
  focusedMode: FocusedMode,
  targetMode: ActiveFocusedMode,
  onEnterFocusedMode?: (mode: FocusedMode) => void,
): FocusedModeEntry | undefined {
  if (!onEnterFocusedMode || focusedMode === targetMode) {
    return undefined;
  }

  return {
    mode: targetMode,
    label: getFocusedModeTooltip(targetMode),
    tooltip: getFocusedModeTooltip(targetMode),
    ariaLabel: getFocusedModeButtonAriaLabel(targetMode),
    onEnter: onEnterFocusedMode,
  };
}
