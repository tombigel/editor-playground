import {
  ArrowLeftRight,
  ArrowUpDown,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DocumentModel } from '../../../api/editorApi';
import {
  BorderControlGroup,
  FormField,
  HoverColorField,
  InspectorInlineRow,
  ShadowControlGroup,
  SpacingField,
  readShadowFieldValues,
  readUnifiedBorderColor,
  readUnifiedBorderRadius,
  readUnifiedBorderWidth,
} from '../../InspectorControls';
import {
  DEFAULT_BUTTON_BACKGROUND,
  DEFAULT_BUTTON_PADDING_BLOCK,
  DEFAULT_BUTTON_PADDING_INLINE,
  DEFAULT_BUTTON_SHADOW_BLUR_PX,
  DEFAULT_BUTTON_SHADOW_COLOR,
  DEFAULT_BUTTON_SHADOW_SPREAD_PX,
  DEFAULT_BUTTON_SHADOW_OFFSET_X_PX,
  DEFAULT_BUTTON_SHADOW_OFFSET_Y_PX,
  DEFAULT_BUTTON_TEXT_COLOR,
} from '../../../model/styleDefaults';
import type { ButtonInspectorNode } from '../types';
import type { EditorTextField } from '../../../api/documentApi';
import {
  applyLeafShadowPatch,
  applyUnifiedLeafBorderColor,
  applyUnifiedLeafBorderRadius,
  applyUnifiedLeafBorderWidth,
} from '../styleFields';
import {
  createFocusedModeEntry,
  InspectorSectionCard,
} from '../CommonSections';
import {
  type FocusModeCardProps,
  createShadowFallback,
  NavigationFields,
  TypographyTextStyleFields,
} from './shared';

export function ButtonContentSection({
  document,
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  document: DocumentModel;
  node: ButtonInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
  return (
    <InspectorSectionCard
      title="Content"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'content', onEnterFocusedMode)}
    >
        <FormField label="Label">
          <Input value={node.content} onChange={(e) => onTextChange('content', e.target.value)} />
        </FormField>
        <NavigationFields document={document} node={node} onTextChange={onTextChange} />
    </InspectorSectionCard>
  );
}

export function ButtonTextStyleSection({
  document,
  node,
  onTextChange,
  onOpenManageFonts,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  document: DocumentModel;
  node: ButtonInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
  onOpenManageFonts: () => void;
} & FocusModeCardProps) {
  return (
    <InspectorSectionCard
      title="Text style"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'design', onEnterFocusedMode)}
    >
        <TypographyTextStyleFields
          document={document}
          node={node}
          onTextChange={onTextChange}
          supportsWrap
          wrapFieldLabel="Wrap"
          onOpenManageFonts={onOpenManageFonts}
        />
    </InspectorSectionCard>
  );
}

export function ButtonDesignSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: ButtonInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
  const shadowFallback = createShadowFallback(
    DEFAULT_BUTTON_SHADOW_COLOR,
    DEFAULT_BUTTON_SHADOW_BLUR_PX,
    DEFAULT_BUTTON_SHADOW_SPREAD_PX,
    DEFAULT_BUTTON_SHADOW_OFFSET_X_PX,
    DEFAULT_BUTTON_SHADOW_OFFSET_Y_PX,
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
        <InspectorInlineRow label="Color" controlClassName="gap-2">
          <HoverColorField
            value={node.style?.color}
            onChange={(value) => onTextChange('color', value)}
            ariaLabel="Text color"
            fallback={DEFAULT_BUTTON_TEXT_COLOR}
          />
        </InspectorInlineRow>
        <InspectorInlineRow label="Background" controlClassName="gap-2">
          <HoverColorField
            value={node.style?.background}
            onChange={(value) => onTextChange('background', value)}
            ariaLabel="Button background color"
            fallback={DEFAULT_BUTTON_BACKGROUND}
          />
        </InspectorInlineRow>
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
          <Label className="pt-1 text-[11px] font-medium">Border</Label>
          <BorderControlGroup
            nodeId={node.id}
            colorValue={readUnifiedBorderColor(node.style)}
            widthValue={readUnifiedBorderWidth(node.style)}
            radiusValue={readUnifiedBorderRadius(node.style)}
            onColorChange={(value) => applyUnifiedLeafBorderColor(onTextChange, value)}
            onWidthChange={(value) => applyUnifiedLeafBorderWidth(onTextChange, value)}
            onRadiusChange={(value) => applyUnifiedLeafBorderRadius(onTextChange, value)}
          />
        </div>
        <div className="space-y-1.5">
          <ShadowControlGroup
            color={shadow.color}
            blur={shadow.blur}
            spread={shadow.spread}
            distance={shadow.distance}
            angle={shadow.angle}
            colorFallback={DEFAULT_BUTTON_SHADOW_COLOR}
            supportsSpread
            onColorChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { color: value })}
            onBlurChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { blur: value })}
            onSpreadChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { spread: value })}
            onDistanceChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { distance: value })}
            onAngleChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { angle: value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium">Padding</Label>
          <div className="grid grid-cols-2 gap-1.5">
            <ButtonPaddingField
              nodeId={node.id}
              axis="block"
              icon={<ArrowUpDown className="h-3.5 w-3.5" role="presentation" />}

              value={node.style?.paddingBlock?.raw ?? DEFAULT_BUTTON_PADDING_BLOCK}
              onChange={(value) => onTextChange('paddingBlock', value)}
            />
            <ButtonPaddingField
              nodeId={node.id}
              axis="inline"
              icon={<ArrowLeftRight className="h-3.5 w-3.5" role="presentation" />}

              value={node.style?.paddingInline?.raw ?? DEFAULT_BUTTON_PADDING_INLINE}
              onChange={(value) => onTextChange('paddingInline', value)}
            />
          </div>
        </div>
    </InspectorSectionCard>
  );
}

export function ButtonAppearanceSection({
  document,
  node,
  onTextChange,
  onOpenManageFonts,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  document: DocumentModel;
  node: ButtonInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
  onOpenManageFonts: () => void;
} & FocusModeCardProps) {
  const shadowFallback = createShadowFallback(
    DEFAULT_BUTTON_SHADOW_COLOR,
    DEFAULT_BUTTON_SHADOW_BLUR_PX,
    DEFAULT_BUTTON_SHADOW_SPREAD_PX,
    DEFAULT_BUTTON_SHADOW_OFFSET_X_PX,
    DEFAULT_BUTTON_SHADOW_OFFSET_Y_PX,
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
      <TypographyTextStyleFields
        document={document}
        node={node}
        onTextChange={onTextChange}
        supportsWrap
        wrapFieldLabel="Wrap"
        onOpenManageFonts={onOpenManageFonts}
      />
      <div className="editor-border-subtle border-t pt-2.5">
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">Color</Label>
          <div className="ml-auto flex items-center gap-2">
            <HoverColorField
              value={node.style?.color}
              onChange={(value) => onTextChange('color', value)}
              ariaLabel="Text color"
              fallback={DEFAULT_BUTTON_TEXT_COLOR}
            />
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">Background</Label>
          <div className="ml-auto flex items-center gap-2">
            <HoverColorField
              value={node.style?.background}
              onChange={(value) => onTextChange('background', value)}
              ariaLabel="Button background color"
              fallback={DEFAULT_BUTTON_BACKGROUND}
            />
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
          <Label className="pt-1 text-[11px] font-medium">Border</Label>
          <BorderControlGroup
            nodeId={node.id}
            colorValue={readUnifiedBorderColor(node.style)}
            widthValue={readUnifiedBorderWidth(node.style)}
            radiusValue={readUnifiedBorderRadius(node.style)}
            onColorChange={(value) => applyUnifiedLeafBorderColor(onTextChange, value)}
            onWidthChange={(value) => applyUnifiedLeafBorderWidth(onTextChange, value)}
            onRadiusChange={(value) => applyUnifiedLeafBorderRadius(onTextChange, value)}
          />
        </div>
        <div className="mt-2.5 space-y-1.5">
          <ShadowControlGroup
            color={shadow.color}
            blur={shadow.blur}
            spread={shadow.spread}
            distance={shadow.distance}
            angle={shadow.angle}
            colorFallback={DEFAULT_BUTTON_SHADOW_COLOR}
            supportsSpread
            onColorChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { color: value })}
            onBlurChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { blur: value })}
            onSpreadChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { spread: value })}
            onDistanceChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { distance: value })}
            onAngleChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { angle: value })}
          />
        </div>
        <div className="mt-2.5 space-y-1.5">
          <Label className="text-[11px] font-medium">Padding</Label>
          <div className="grid grid-cols-2 gap-1.5">
            <ButtonPaddingField
              nodeId={node.id}
              axis="block"
              icon={<ArrowUpDown className="h-3.5 w-3.5" role="presentation" />}

              value={node.style?.paddingBlock?.raw ?? DEFAULT_BUTTON_PADDING_BLOCK}
              onChange={(value) => onTextChange('paddingBlock', value)}
            />
            <ButtonPaddingField
              nodeId={node.id}
              axis="inline"
              icon={<ArrowLeftRight className="h-3.5 w-3.5" role="presentation" />}

              value={node.style?.paddingInline?.raw ?? DEFAULT_BUTTON_PADDING_INLINE}
              onChange={(value) => onTextChange('paddingInline', value)}
            />
          </div>
        </div>
      </div>
    </InspectorSectionCard>
  );
}

function ButtonPaddingField({
  nodeId,
  axis,
  icon,
  value,
  onChange,
}: {
  nodeId: string;
  axis: 'block' | 'inline';
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
      <div className="editor-text-muted flex h-8 items-center justify-center">
        {icon}
      </div>
      <SpacingField nodeId={nodeId} axis={axis} value={value} onChange={onChange} />
    </div>
  );
}
