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
import type { DocumentModel, FocusedMode } from '../../api/editorApi';
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
import { getTopLevelWrapperVisibilityState, isEligibleTopLevelWrapper } from '../../model/topLevelWrapperVisibility';
import type { PageId } from '../../model/types/site';
import { isContainerNode } from '../../model/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverTooltip } from '@/components/ui/popover';
import { ValuePill } from '@/components/ui/settings-panel';
import { Switch } from '@/components/ui/switch';
import { cn, DARK_TOOLTIP_CLASS } from '@/lib/utils';
import type { InspectorActionHandlers, InspectorNode, InspectorOrderState, WrapperInspectorNode } from './types';
import {
  BorderControlGroup,
  FormField,
  HoverColorField,
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
import { TopLevelWrapperVisibilityControl } from '../controls/TopLevelWrapperVisibilityControl';
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
          {node.contentType === 'site' ? (
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
          {node.contentType !== 'site' ? (
            <div className="mt-1">
              <ValuePill value={node.subtype} className="inline-flex shrink-0" />
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
    <button
      type="button"
      className={cn(
        'editor-text-strong group min-w-0 cursor-text rounded-sm text-[15px] font-medium leading-5 outline-none transition-colors hover:text-[color:var(--editor-accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)]',
        className,
      )}
      aria-label="Edit title"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-center gap-1">
        <div className="truncate">{name}</div>
        <PencilLine
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-[color:var(--editor-utility-text-muted)] opacity-0 transition-[opacity,color] group-hover:opacity-100 group-hover:text-[color:var(--editor-utility-text-strong)]"
        />
      </div>
    </button>
  );
}

export function NodeBasicsSection({
  node,
  document,
  activePageId,
  orderState,
  actions,
  focusedMode,
  headerContent,
  headerAction,
}: {
  node: InspectorNode;
  document: DocumentModel;
  activePageId?: PageId | null;
  orderState: InspectorOrderState;
  actions: Pick<
    InspectorActionHandlers,
    | 'onRectChange'
    | 'onPromote'
    | 'onDemote'
    | 'onWrapperStyleChange'
    | 'onSetNodeVisibility'
    | 'onSetTopLevelWrapperVisibility'
  > & {
    onEnterFocusedMode?: InspectorActionHandlers['onEnterFocusedMode'];
  };
  focusedMode?: FocusedMode;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
}) {
  const topLevelWidthLocked =
    isContainerNode(node) &&
    (node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer') &&
    node.rect.width.base.raw === '100%';
  const hidesPositionFields =
    isContainerNode(node) &&
    (node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer');
  const isSectionHeight = isContainerNode(node) && node.subtype === 'section';
  const wrapperPaddingNode: WrapperInspectorNode | null =
    isContainerNode(node) &&
    (node.subtype === 'section' || node.subtype === 'header' || node.subtype === 'footer' || node.subtype === 'container')
      ? node
      : null;
  const isTopLevelVisibilityWrapper =
    isContainerNode(node) && isEligibleTopLevelWrapper(node) && node.parentId === document.rootId;

  return (
    <InspectorSectionCard
      title="Layout"
      headerContent={headerContent}
      headerAction={headerAction}
      hideTitle={!!focusedMode}
      contentClassName="space-y-2.5 px-3 py-3"
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'layout', actions.onEnterFocusedMode)}
    >
      {node.contentType !== 'site' ? (
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
              icon={<ArrowUp className="h-3.5 w-3.5" role="presentation" />}

              value={wrapperPaddingNode.style?.paddingTop?.raw ?? ''}
              onChange={(value) => actions.onWrapperStyleChange('paddingTop', value)}
            />
            <LabeledPaddingField
              nodeId={wrapperPaddingNode.id}
              axis="right"
              icon={<ArrowRight className="h-3.5 w-3.5" role="presentation" />}

              value={wrapperPaddingNode.style?.paddingRight?.raw ?? ''}
              onChange={(value) => actions.onWrapperStyleChange('paddingRight', value)}
            />
            <LabeledPaddingField
              nodeId={wrapperPaddingNode.id}
              axis="bottom"
              icon={<ArrowDown className="h-3.5 w-3.5" role="presentation" />}

              value={wrapperPaddingNode.style?.paddingBottom?.raw ?? ''}
              onChange={(value) => actions.onWrapperStyleChange('paddingBottom', value)}
            />
            <LabeledPaddingField
              nodeId={wrapperPaddingNode.id}
              axis="left"
              icon={<ArrowLeft className="h-3.5 w-3.5" role="presentation" />}

              value={wrapperPaddingNode.style?.paddingLeft?.raw ?? ''}
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

      {isContainerNode(node) ? (
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
      {node.contentType !== 'site' ? (
        <FormField label="Visibility" layout="inline" controlClassName="gap-2">
          {isTopLevelVisibilityWrapper ? (
            <TopLevelWrapperVisibilityControl
              document={document}
              activePageId={activePageId ?? null}
              value={getTopLevelWrapperVisibilityState(document, node.id)}
              onChange={(visibility, pageIds) => actions.onSetTopLevelWrapperVisibility(node.id, visibility, pageIds)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="editor-text-muted text-xs">{node.visible ? 'Visible' : 'Hidden'}</span>
              <Switch
                checked={node.visible}
                aria-label={`${node.visible ? 'Hide' : 'Show'} ${node.name?.trim() || node.subtype}`}
                onCheckedChange={(checked) => actions.onSetNodeVisibility(node.id, checked)}
              />
            </div>
          )}
        </FormField>
      ) : null}
    </InspectorSectionCard>
  );
}

function LabeledPaddingField({
  nodeId,
  axis,
  icon,
  value,
  onChange,
}: {
  nodeId: string;
  axis: 'top' | 'right' | 'bottom' | 'left';
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
      <div className="editor-text-muted flex h-8 items-center justify-center">
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
  const supportsContainerSurfaceStyling = node.subtype === 'container';
  const allowsBackgroundOpacity = node.subtype === 'container';
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
        <FormField label="Background" layout="inline" controlClassName="gap-2">
          <HoverColorField
            value={node.style?.background}
            onChange={(value) => onWrapperStyleChange('background', value)}
            ariaLabel="Background color"
            showOpacity={allowsBackgroundOpacity}
          />
        </FormField>
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

        {node.subtype === 'section' ? (
          <FormField label="Divider" layout="inline-group" controlClassName="gap-2">
            <NumericUnitInlineField
              value={node.style?.sectionBorderBottomWidth?.raw ?? ''}
              units={['px']}
              onChange={(value) => onWrapperStyleChange('sectionBorderBottomWidth', value)}
              placeholder="1"
              min={0}
              className="w-[5.5rem]"
            />
            <HoverColorField
              value={node.style?.sectionBorderBottomColor}
              onChange={(value) => onWrapperStyleChange('sectionBorderBottomColor', value)}
              ariaLabel="Bottom border color"
              fallback="#dbe3ee"
              showOpacity={false}
            />
          </FormField>
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
  hideTitle = false,
}: {
  title: string;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
  focusedModeEntry?: FocusedModeEntry;
  children: ReactNode;
  contentClassName?: string;
  borderless?: boolean;
  hideHeader?: boolean;
  hideTitle?: boolean;
}) {
  return (
    <Card className={borderless ? 'border-0 bg-transparent shadow-none' : 'editor-border-subtle rounded-lg shadow-none'}>
      {!hideHeader ? (
        <CardHeader className="flex flex-row items-start justify-between gap-2 px-3 pt-3 pb-1">
          {!hideTitle ? <CardTitle className="text-xs">{title}</CardTitle> : null}
          {headerContent ? (
            <div className="min-w-0 flex-1 flex justify-end">{headerContent}</div>
          ) : null}
          {headerAction ? (
            <InspectorSectionActionButton
              aria-label={headerAction.ariaLabel}
              onClick={headerAction.onClick}
            >
              {headerAction.icon}
            </InspectorSectionActionButton>
          ) : focusedModeEntry ? (
            <PopoverTooltip
              side="top"
              align="center"
              className={DARK_TOOLTIP_CLASS}
              content={
                <div className="leading-3.5 font-medium">
                  {focusedModeEntry.tooltip ?? focusedModeEntry.label}
                </div>
              }
            >
              <InspectorSectionActionButton
                aria-label={focusedModeEntry.ariaLabel ?? `Go to ${focusedModeEntry.label}`}
                onClick={() => focusedModeEntry.onEnter(focusedModeEntry.mode)}
              >
                <SquareArrowOutUpRight className="h-3.5 w-3.5" />
              </InspectorSectionActionButton>
            </PopoverTooltip>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

function InspectorSectionActionButton({
  'aria-label': ariaLabel,
  onClick,
  children,
}: {
  'aria-label': string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="editor-icon-button-subtle h-7 w-7 rounded-md border"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </Button>
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
