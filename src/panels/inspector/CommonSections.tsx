import { ArrowBigDown, ArrowBigDownDash, ArrowBigUp, ArrowBigUpDash, SquareArrowOutUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { FocusedMode } from '../../api/editorApi';
import type { WrapperStyleField } from '../../api/documentApi';
import {
  DEFAULT_SHADOW_BLUR_PX,
  DEFAULT_SHADOW_COLOR,
  DEFAULT_SHADOW_OFFSET_X_PX,
  DEFAULT_SHADOW_OFFSET_Y_PX,
} from '../../model/styleDefaults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InspectorActionHandlers, InspectorNode, InspectorOrderState, WrapperInspectorNode } from './types';
import {
  BorderControlGroup,
  HoverColorField,
  NumericUnitInlineField,
  OrderIconButton,
  ShadowControlGroup,
  SizeInlineField,
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

export type FocusedModeEntry = {
  mode: FocusedMode;
  label: string;
  onEnter: (mode: FocusedMode) => void;
};

export type InspectorSectionHeaderAction = {
  ariaLabel: string;
  icon: ReactNode;
  onClick: () => void;
};

export function InspectorSummary({ node }: { node: InspectorNode | null }) {
  if (!node) {
    return (
      <div className="flex h-full flex-col gap-1.5 p-2.5 text-xs">
        <div className="space-y-1.5 pb-1.5">
          <div className="editor-text-muted mt-1 text-xs">Select a node to inspect its layout and sticky config.</div>
        </div>
      </div>
    );
  }

  return null;
}

export function NodeBasicsSection({
  node,
  orderState,
  actions,
}: {
  node: InspectorNode;
  orderState: InspectorOrderState;
  actions: Pick<InspectorActionHandlers, 'onRectChange' | 'onPromote' | 'onDemote'>;
}) {
  const topLevelWidthLocked =
    node.type === 'wrapper' &&
    (node.role === 'section' || node.role === 'header' || node.role === 'footer') &&
    node.rect.width.base.raw === '100%';

  return (
    <InspectorSectionCard title="Layout" contentClassName="space-y-2.5 px-3 py-3">
      {node.type !== 'site' ? (
        <div className="grid grid-cols-2 gap-1.5">
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
          />
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

export function NodePropertiesSection({
  node,
  actions,
}: {
  node: InspectorNode;
  actions: Pick<InspectorActionHandlers, 'onTextChange'>;
}) {
  return (
    <InspectorSectionCard title="Properties" contentClassName="space-y-2.5 px-3 py-3">
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1.5">
        <Label className="text-[11px] font-medium">Name</Label>
        <Input
          value={node.name}
          onChange={(e) => actions.onTextChange('name', e.target.value)}
          className="h-8 rounded-sm text-[11px]"
        />
      </div>
    </InspectorSectionCard>
  );
}

export function WrapperDesignSection({
  node,
  onWrapperStyleChange,
}: {
  node: WrapperInspectorNode;
  onWrapperStyleChange: (field: WrapperStyleField, value: string) => void;
}) {
  const supportsContainerSurfaceStyling = node.role === 'container';
  const shadowFallback = createShadowFallback(
    DEFAULT_SHADOW_COLOR,
    DEFAULT_SHADOW_BLUR_PX,
    DEFAULT_SHADOW_OFFSET_X_PX,
    DEFAULT_SHADOW_OFFSET_Y_PX,
  );
  const shadow = readShadowFieldValues(node.style, shadowFallback);

  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Design</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">Background</Label>
          <div className="ml-auto flex items-center gap-2">
            <HoverColorField
              value={node.style.background}
              onChange={(value) => onWrapperStyleChange('background', value)}
              ariaLabel="Background color"
            />
          </div>
        </div>
        {supportsContainerSurfaceStyling ? (
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
            <Label className="pt-1 text-[11px] font-medium">Border</Label>
            <BorderControlGroup
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
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
            <Label className="pt-1 text-[11px] font-medium">Shadow</Label>
            <ShadowControlGroup
              color={shadow.color}
              blur={shadow.blur}
              distance={shadow.distance}
              angle={shadow.angle}
              colorFallback={DEFAULT_SHADOW_COLOR}
              onColorChange={(value) => applyWrapperShadowPatch(onWrapperStyleChange, node.style, shadowFallback, { color: value })}
              onBlurChange={(value) => applyWrapperShadowPatch(onWrapperStyleChange, node.style, shadowFallback, { blur: value })}
              onDistanceChange={(value) => applyWrapperShadowPatch(onWrapperStyleChange, node.style, shadowFallback, { distance: value })}
              onAngleChange={(value) => applyWrapperShadowPatch(onWrapperStyleChange, node.style, shadowFallback, { angle: value })}
            />
          </div>
        ) : null}

        {node.role === 'section' ? (
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
            <Label className="text-[11px] font-medium">Divider</Label>
            <div className="ml-auto flex items-center gap-2">
              <NumericUnitInlineField
                value={node.style.sectionBorderBottomWidth?.raw ?? ''}
                units={['px']}
                onChange={(value) => onWrapperStyleChange('sectionBorderBottomWidth', value)}
                placeholder="1"
                className="w-[5.5rem]"
              />
              <HoverColorField
                value={node.style.sectionBorderBottomColor}
                onChange={(value) => onWrapperStyleChange('sectionBorderBottomColor', value)}
                ariaLabel="Bottom border color"
                fallback="#dbe3ee"
                showOpacity={false}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="editor-icon-button-subtle h-7 w-7 rounded-md border"
              aria-label={`Go to ${focusedModeEntry.label}`}
              onClick={() => focusedModeEntry.onEnter(focusedModeEntry.mode)}
            >
              <SquareArrowOutUpRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

function createShadowFallback(color: string, blur: number, offsetX: number, offsetY: number) {
  return {
    color,
    blur,
    distance: Math.round(Math.sqrt(offsetX ** 2 + offsetY ** 2) * 100) / 100,
    angle: Math.round(((Math.atan2(offsetY, offsetX) * 180) / Math.PI) * 100) / 100,
  };
}
