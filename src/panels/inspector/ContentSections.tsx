import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  ArrowUpDown,
  PilcrowLeft,
  PilcrowRight,
  Settings2,
  TextWrap,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  BOLD_FONT_WEIGHT,
  DEFAULT_FONT_WEIGHT,
  getDocumentFontFamily,
  isBoldFontWeight,
  listDocumentFontsForPicker,
  resolveNearestSupportedFontWeight,
} from '../../api/fontApi';
import type { DocumentModel } from '../../api/editorApi';
import { getSectionAnchorOptions, isValidSectionAnchorTarget } from '../../model/links';
import {
  BorderControlGroup,
  FontPickerPopover,
  FontSizeField,
  FormField,
  HoverColorField,
  InspectorInlineRow,
  NumberInput,
  ShadowControlGroup,
  SpacingField,
  TextStyleIconButton,
  readShadowFieldValues,
  readUnifiedBorderColor,
  readUnifiedBorderRadius,
  readUnifiedBorderWidth,
} from '../InspectorControls';
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
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_RADIUS,
  DEFAULT_IMAGE_BORDER_WIDTH,
  DEFAULT_IMAGE_SHADOW_BLUR_PX,
  DEFAULT_IMAGE_SHADOW_COLOR,
  DEFAULT_IMAGE_SHADOW_SPREAD_PX,
  DEFAULT_IMAGE_SHADOW_OFFSET_X_PX,
  DEFAULT_IMAGE_SHADOW_OFFSET_Y_PX,
  DEFAULT_LINK_COLOR,
  DEFAULT_SHADOW_BLUR_PX,
  DEFAULT_SHADOW_COLOR,
  DEFAULT_SHADOW_SPREAD_PX,
  DEFAULT_SHADOW_OFFSET_X_PX,
  DEFAULT_SHADOW_OFFSET_Y_PX,
  DEFAULT_TEXT_COLOR,
} from '../../model/styleDefaults';
import type {
  ButtonInspectorNode,
  ImageInspectorNode,
  LinkInspectorNode,
  TextInspectorNode,
} from './types';
import type { EditorTextField } from '../../api/documentApi';
import type { FocusedMode } from '../../api/editorApi';
import {
  applyLeafShadowPatch,
  applyUnifiedLeafBorderColor,
  applyUnifiedLeafBorderRadius,
  applyUnifiedLeafBorderWidth,
} from './styleFields';
import {
  createFocusedModeEntry,
  InspectorSectionCard,
  type InspectorSectionHeaderAction,
} from './CommonSections';

type FocusModeCardProps = {
  focusedMode?: FocusedMode;
  onEnterFocusedMode?: (mode: FocusedMode) => void;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
  contentClassName?: string;
};

type NavigationInspectorNode = ButtonInspectorNode | LinkInspectorNode;

export function TextContentSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'px-3 pt-1.5 pb-3',
}: {
  node: TextInspectorNode;
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
        <FormField label="Text">
          <Textarea value={node.content} onChange={(e) => onTextChange('content', e.target.value)} />
        </FormField>
    </InspectorSectionCard>
  );
}

export function TextTextStyleSection({
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
  node: TextInspectorNode;
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
          onOpenManageFonts={onOpenManageFonts}
        />
        <InspectorInlineRow label="HTML tag" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
          <Select value={node.htmlTag} onValueChange={(value) => onTextChange('htmlTag', value)}>
            <SelectTrigger className="h-8 w-24 rounded-sm text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="h1">h1</SelectItem>
              <SelectItem value="h2">h2</SelectItem>
              <SelectItem value="h3">h3</SelectItem>
              <SelectItem value="h4">h4</SelectItem>
              <SelectItem value="h5">h5</SelectItem>
              <SelectItem value="h6">h6</SelectItem>
              <SelectItem value="p">p</SelectItem>
              <SelectItem value="blockquote">blockquote</SelectItem>
              <SelectItem value="div">div</SelectItem>
            </SelectContent>
          </Select>
        </InspectorInlineRow>
    </InspectorSectionCard>
  );
}

export function TextDesignSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: TextInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
  const shadow = readShadowFieldValues(
    node.style,
    createShadowFallback(
      DEFAULT_SHADOW_COLOR,
      DEFAULT_SHADOW_BLUR_PX,
      DEFAULT_SHADOW_SPREAD_PX,
      DEFAULT_SHADOW_OFFSET_X_PX,
      DEFAULT_SHADOW_OFFSET_Y_PX,
    ),
  );

  return (
    <InspectorSectionCard
      title="Design"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'design', onEnterFocusedMode)}
    >
        <TypographyDesignFields
          node={node}
          onTextChange={onTextChange}
          colorFallback={DEFAULT_TEXT_COLOR}
          shadow={shadow}
          shadowFallback={createShadowFallback(
            DEFAULT_SHADOW_COLOR,
            DEFAULT_SHADOW_BLUR_PX,
            DEFAULT_SHADOW_SPREAD_PX,
            DEFAULT_SHADOW_OFFSET_X_PX,
            DEFAULT_SHADOW_OFFSET_Y_PX,
          )}
        />
    </InspectorSectionCard>
  );
}

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
          <Input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
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
              icon={<ArrowUpDown className="h-3.5 w-3.5" />}
              ariaLabel="Vertical padding"
              value={node.style?.paddingBlock?.raw ?? DEFAULT_BUTTON_PADDING_BLOCK}
              onChange={(value) => onTextChange('paddingBlock', value)}
            />
            <ButtonPaddingField
              nodeId={node.id}
              axis="inline"
              icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
              ariaLabel="Horizontal padding"
              value={node.style?.paddingInline?.raw ?? DEFAULT_BUTTON_PADDING_INLINE}
              onChange={(value) => onTextChange('paddingInline', value)}
            />
          </div>
        </div>
    </InspectorSectionCard>
  );
}

function ButtonPaddingField({
  nodeId,
  axis,
  icon,
  ariaLabel,
  value,
  onChange,
}: {
  nodeId: string;
  axis: 'block' | 'inline';
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
      <SpacingField nodeId={nodeId} axis={axis} value={value} onChange={onChange} />
    </div>
  );
}

function OpenInNewTabField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="editor-text-strong inline-flex items-center gap-2 text-[11px] font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="editor-border-subtle h-4 w-4 rounded-sm border"
      />
      <span>Open in a new tab</span>
    </label>
  );
}

export function LinkContentSection({
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
  node: LinkInspectorNode;
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
          <Input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
        </FormField>
        <NavigationFields document={document} node={node} onTextChange={onTextChange} />
    </InspectorSectionCard>
  );
}

function NavigationFields({
  document,
  node,
  onTextChange,
}: {
  document: DocumentModel;
  node: NavigationInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  const linkType = node.linkType ?? 'external';
  const sectionOptions = getSectionAnchorOptions(document);
  const anchorValue = isValidSectionAnchorTarget(document, node.anchorTargetId) ? node.anchorTargetId : undefined;
  const selectedAnchorOption = sectionOptions.find((option) => option.id === anchorValue);
  const hasBrokenAnchorTarget = Boolean(node.anchorTargetId && !anchorValue);

  function handleLinkTypeChange(value: 'anchor' | 'external') {
    onTextChange('linkType', value);
    if (value === 'anchor' && !node.anchorTargetId && sectionOptions[0]) {
      onTextChange('anchorTargetId', sectionOptions[0].id);
      onTextChange('href', sectionOptions[0].href);
      return;
    }
    if (value === 'external') {
      onTextChange('openInNewTab', node.openInNewTab ? 'true' : '');
    }
  }

  return (
    <>
      <InspectorInlineRow label="Type">
        <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
          <Button
            type="button"
            variant={linkType === 'anchor' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-[11px]"
            onClick={() => handleLinkTypeChange('anchor')}
          >
            Internal
          </Button>
          <Button
            type="button"
            variant={linkType === 'external' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-[11px]"
            onClick={() => handleLinkTypeChange('external')}
          >
            External
          </Button>
        </div>
      </InspectorInlineRow>
      {linkType === 'anchor' ? (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[11px] font-medium">Section</Label>
            {hasBrokenAnchorTarget ? (
              <div className="editor-warning-text inline-flex shrink-0 items-center gap-1 text-[10px] font-medium leading-4">
                <TriangleAlert className="h-3 w-3 shrink-0" />
                <span>Broken anchor</span>
              </div>
            ) : null}
          </div>
          <Select
            value={anchorValue}
            onValueChange={(value) => {
              const option = sectionOptions.find((entry) => entry.id === value);
              onTextChange('anchorTargetId', value);
              if (option) {
                onTextChange('href', option.href);
              }
            }}
            disabled={sectionOptions.length === 0}
          >
            <SelectTrigger>
              <span className="truncate text-left">
                {selectedAnchorOption?.name ?? (sectionOptions.length > 0 ? 'Select a section' : 'No sections available')}
              </span>
            </SelectTrigger>
            <SelectContent>
              {sectionOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <span className="flex min-w-0 flex-col">
                    <span>{option.name}</span>
                    {option.detail ? (
                      <span className="editor-text-muted text-[10px] leading-3">
                        {option.detail}
                      </span>
                    ) : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <FormField label="Href">
            <Input value={node.href ?? ''} onChange={(e) => onTextChange('href', e.target.value)} />
          </FormField>
          <OpenInNewTabField
            checked={Boolean(node.openInNewTab)}
            onChange={(checked) => onTextChange('openInNewTab', checked ? 'true' : '')}
          />
        </>
      )}
    </>
  );
}

export function LinkTextStyleSection({
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
  node: LinkInspectorNode;
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

export function LinkDesignSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: LinkInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
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
        <TypographyDesignFields
          node={node}
          onTextChange={onTextChange}
          colorFallback={DEFAULT_LINK_COLOR}
          shadow={shadow}
          shadowFallback={shadowFallback}
        />
    </InspectorSectionCard>
  );
}

export function ImageContentSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: ImageInspectorNode;
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
        <FormField label="Src">
          <Input value={node.src ?? ''} onChange={(e) => onTextChange('src', e.target.value)} />
        </FormField>
        <FormField label="Alt">
          <Input value={node.alt ?? ''} onChange={(e) => onTextChange('alt', e.target.value)} />
        </FormField>
    </InspectorSectionCard>
  );
}

export function ImageDesignSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: ImageInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
  const shadowFallback = createShadowFallback(
    DEFAULT_IMAGE_SHADOW_COLOR,
    DEFAULT_IMAGE_SHADOW_BLUR_PX,
    DEFAULT_IMAGE_SHADOW_SPREAD_PX,
    DEFAULT_IMAGE_SHADOW_OFFSET_X_PX,
    DEFAULT_IMAGE_SHADOW_OFFSET_Y_PX,
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
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
          <Label className="pt-1 text-[11px] font-medium">Border</Label>
          <BorderControlGroup
            nodeId={node.id}
            colorValue={readUnifiedBorderColor(node.style) || DEFAULT_IMAGE_BORDER_COLOR}
            widthValue={readUnifiedBorderWidth(node.style) || DEFAULT_IMAGE_BORDER_WIDTH}
            radiusValue={readUnifiedBorderRadius(node.style) || DEFAULT_IMAGE_BORDER_RADIUS}
            onColorChange={(value) => applyUnifiedLeafBorderColor(onTextChange, value)}
            onWidthChange={(value) => applyUnifiedLeafBorderWidth(onTextChange, value)}
            onRadiusChange={(value) => applyUnifiedLeafBorderRadius(onTextChange, value)}
            colorFallback={DEFAULT_IMAGE_BORDER_COLOR}
            widthPlaceholder="1"
            radiusPlaceholder="16"
          />
        </div>
        <div className="space-y-1.5">
          <ShadowControlGroup
            color={shadow.color}
            blur={shadow.blur}
            spread={shadow.spread}
            distance={shadow.distance}
            angle={shadow.angle}
            colorFallback={DEFAULT_IMAGE_SHADOW_COLOR}
            supportsSpread
            onColorChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { color: value })}
            onBlurChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { blur: value })}
            onSpreadChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { spread: value })}
            onDistanceChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { distance: value })}
            onAngleChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { angle: value })}
          />
        </div>
    </InspectorSectionCard>
  );
}

export function TextAppearanceSection({
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
  node: TextInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
  onOpenManageFonts: () => void;
} & FocusModeCardProps) {
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
      <TypographyTextStyleFields
        document={document}
        node={node}
        onTextChange={onTextChange}
        onOpenManageFonts={onOpenManageFonts}
      />
      <InspectorInlineRow label="HTML tag" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
          <Select value={node.htmlTag} onValueChange={(value) => onTextChange('htmlTag', value)}>
            <SelectTrigger className="h-8 w-24 rounded-sm text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="h1">h1</SelectItem>
              <SelectItem value="h2">h2</SelectItem>
              <SelectItem value="h3">h3</SelectItem>
              <SelectItem value="h4">h4</SelectItem>
              <SelectItem value="h5">h5</SelectItem>
              <SelectItem value="h6">h6</SelectItem>
              <SelectItem value="p">p</SelectItem>
              <SelectItem value="blockquote">blockquote</SelectItem>
              <SelectItem value="div">div</SelectItem>
            </SelectContent>
          </Select>
      </InspectorInlineRow>
      <div className="editor-border-subtle space-y-2.5 border-t pt-2.5">
        <TypographyDesignFields
          node={node}
          onTextChange={onTextChange}
          colorFallback={DEFAULT_TEXT_COLOR}
          shadow={shadow}
          shadowFallback={shadowFallback}
        />
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
              icon={<ArrowUpDown className="h-3.5 w-3.5" />}
              ariaLabel="Vertical padding"
              value={node.style?.paddingBlock?.raw ?? DEFAULT_BUTTON_PADDING_BLOCK}
              onChange={(value) => onTextChange('paddingBlock', value)}
            />
            <ButtonPaddingField
              nodeId={node.id}
              axis="inline"
              icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
              ariaLabel="Horizontal padding"
              value={node.style?.paddingInline?.raw ?? DEFAULT_BUTTON_PADDING_INLINE}
              onChange={(value) => onTextChange('paddingInline', value)}
            />
          </div>
        </div>
      </div>
    </InspectorSectionCard>
  );
}

export function LinkAppearanceSection({
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
  node: LinkInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
  onOpenManageFonts: () => void;
} & FocusModeCardProps) {
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
      <TypographyTextStyleFields
        document={document}
        node={node}
        onTextChange={onTextChange}
        supportsWrap
        wrapFieldLabel="Wrap"
        onOpenManageFonts={onOpenManageFonts}
      />
      <div className="editor-border-subtle space-y-2.5 border-t pt-2.5">
        <TypographyDesignFields
          node={node}
          onTextChange={onTextChange}
          colorFallback={DEFAULT_LINK_COLOR}
          shadow={shadow}
          shadowFallback={shadowFallback}
        />
      </div>
    </InspectorSectionCard>
  );
}

function lineHeightValue(node: TypographyInspectorNode) {
  return node.style?.lineHeight ?? 1.2;
}

function textDecorationHasUnderline(node: TypographyInspectorNode) {
  return node.style?.textDecorationLine?.includes('underline') ?? false;
}

function textDecorationHasLineThrough(node: TypographyInspectorNode) {
  return node.style?.textDecorationLine?.includes('line-through') ?? false;
}

function toggleTextDecorationLine(
  current: 'none' | 'underline' | 'line-through' | 'underline line-through' | undefined,
  target: 'underline' | 'line-through',
) {
  const hasUnderline = current?.includes('underline') ?? false;
  const hasLineThrough = current?.includes('line-through') ?? false;
  const nextUnderline = target === 'underline' ? !hasUnderline : hasUnderline;
  const nextLineThrough = target === 'line-through' ? !hasLineThrough : hasLineThrough;

  if (nextUnderline && nextLineThrough) {
    return 'underline line-through';
  }
  if (nextUnderline) {
    return 'underline';
  }
  if (nextLineThrough) {
    return 'line-through';
  }
  return 'none';
}

function createShadowFallback(color: string, blur: number, spread: number, offsetX: number, offsetY: number) {
  return {
    color,
    blur,
    spread,
    distance: Math.round(Math.sqrt(offsetX ** 2 + offsetY ** 2) * 100) / 100,
    angle: Math.round(((Math.atan2(offsetY, offsetX) * 180) / Math.PI) * 100) / 100,
  };
}

type TypographyInspectorNode = TextInspectorNode | LinkInspectorNode | ButtonInspectorNode;

const TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX = 32;
const TYPOGRAPHY_FIELD_GAP_PX = 4;
const TYPOGRAPHY_FONT_PICKER_WIDTH_PX = 104 + TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX;
const TYPOGRAPHY_FONT_ROW_WIDTH_PX =
  TYPOGRAPHY_FONT_PICKER_WIDTH_PX + TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX + TYPOGRAPHY_FIELD_GAP_PX;
const TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX = TYPOGRAPHY_FONT_ROW_WIDTH_PX;
const TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX = 96 + TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX / 2;
const TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX = 40 + TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX / 2;
const TYPOGRAPHY_SIZE_ROW_WIDTH_PX =
  TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX + TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX + TYPOGRAPHY_FIELD_GAP_PX;

function TypographyTextStyleFields({
  document,
  node,
  onTextChange,
  supportsWrap = false,
  wrapFieldLabel = 'Wrap',
  onOpenManageFonts,
}: {
  document: DocumentModel;
  node: TypographyInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
  supportsWrap?: boolean;
  wrapFieldLabel?: string;
  onOpenManageFonts: () => void;
}) {
  const wrapEnabled = supportsWrap && readTextWrapMode(node) === 'wrap';
  const documentFonts = listDocumentFontsForPicker(document);
  const currentFamily = node.style?.fontFamily ?? SYSTEM_FONT_VALUE;
  const selectedFamily = node.style?.fontFamily ? getDocumentFontFamily(document, node.style.fontFamily) : undefined;

  return (
    <>
      <InspectorInlineRow label="Font" controlWidth={`${TYPOGRAPHY_FONT_ROW_WIDTH_PX}px`} controlClassName="gap-1">
          <div className="shrink-0" style={{ width: `${TYPOGRAPHY_FONT_PICKER_WIDTH_PX}px` }}>
            <FontPickerPopover
              familyValue={currentFamily}
              weightValue={node.style?.fontWeight ?? DEFAULT_FONT_WEIGHT}
              families={documentFonts}
              systemOptionValue={SYSTEM_FONT_VALUE}
              onFamilyChange={(value) => onTextChange('fontFamily', value === SYSTEM_FONT_VALUE ? '' : value)}
              onWeightChange={(value) => onTextChange('fontWeight', value)}
              className="w-full"
            />
          </div>
          <PopoverTooltip
            side="top"
            align="center"
            className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
            content={<div className="leading-3.5 font-medium">Manage fonts</div>}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              aria-label="Manage fonts"
              onClick={onOpenManageFonts}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </PopoverTooltip>
      </InspectorInlineRow>
      <InspectorInlineRow label="Size" controlWidth={`${TYPOGRAPHY_SIZE_ROW_WIDTH_PX}px`}>
        <div className="grid w-full items-center gap-1" style={{ gridTemplateColumns: `${TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX}px ${TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX}px` }}>
          <div className="shrink-0" style={{ width: `${TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX}px` }}>
            <FontSizeField nodeId={node.id} value={fontSizeFieldValueFromNode(node)} onChange={(value) => onTextChange('fontSize', value)} />
          </div>
          <div className="shrink-0" style={{ width: `${TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX}px` }}>
            <NumberInput
              value={lineHeightValue(node)}
              min={0.1}
              max={4}
              step={0.1}
              onChange={(value) => onTextChange('lineHeight', String(value))}
            />
          </div>
        </div>
      </InspectorInlineRow>
      <InspectorInlineRow label="Style" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`} controlClassName="gap-1">
          <TextStyleIconButton
            label="Bold"
            active={isBoldFontWeight(node.style?.fontWeight)}
            onClick={() =>
              onTextChange(
                'fontWeight',
                String(
                  resolveNearestSupportedFontWeight(
                    isBoldFontWeight(node.style?.fontWeight) ? DEFAULT_FONT_WEIGHT : BOLD_FONT_WEIGHT,
                    selectedFamily,
                  ),
                ),
              )
            }
          >
            <span className="font-black tracking-[-0.02em] no-underline decoration-transparent">B</span>
          </TextStyleIconButton>
          <TextStyleIconButton
            label="Italic"
            active={node.style?.fontStyle === 'italic'}
            onClick={() => onTextChange('fontStyle', node.style?.fontStyle === 'italic' ? 'normal' : 'italic')}
          >
            <span className="font-medium italic">I</span>
          </TextStyleIconButton>
          <TextStyleIconButton
            label="Underline"
            active={textDecorationHasUnderline(node)}
            onClick={() => onTextChange('textDecorationLine', toggleTextDecorationLine(node.style?.textDecorationLine, 'underline'))}
          >
            <span className="underline">U</span>
          </TextStyleIconButton>
          <TextStyleIconButton
            label="Strikethrough"
            active={textDecorationHasLineThrough(node)}
            onClick={() =>
              onTextChange('textDecorationLine', toggleTextDecorationLine(node.style?.textDecorationLine, 'line-through'))
            }
          >
            <span className="line-through">S</span>
          </TextStyleIconButton>
      </InspectorInlineRow>
      <InspectorInlineRow label="Align" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`} controlClassName="gap-1">
          <TextStyleIconButton
            label="Align left"
            active={(node.style?.textAlign ?? 'left') === 'left'}
            onClick={() => onTextChange('textAlign', 'left')}
          >
            <AlignLeft className="h-4 w-4" />
          </TextStyleIconButton>
          <TextStyleIconButton
            label="Align center"
            active={node.style?.textAlign === 'center'}
            onClick={() => onTextChange('textAlign', 'center')}
          >
            <AlignCenter className="h-4 w-4" />
          </TextStyleIconButton>
          <TextStyleIconButton
            label="Align right"
            active={node.style?.textAlign === 'right'}
            onClick={() => onTextChange('textAlign', 'right')}
          >
            <AlignRight className="h-4 w-4" />
          </TextStyleIconButton>
          <TextStyleIconButton
            label="Text direction"
            active={false}
            onClick={() => onTextChange('direction', (node.style?.direction ?? 'ltr') === 'rtl' ? 'ltr' : 'rtl')}
          >
            {(node.style?.direction ?? 'ltr') === 'rtl' ? (
              <PilcrowLeft className="h-4 w-4" />
            ) : (
              <PilcrowRight className="h-4 w-4" />
            )}
          </TextStyleIconButton>
      </InspectorInlineRow>
      {supportsWrap ? (
        <InspectorInlineRow label={wrapFieldLabel} controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`} controlClassName="gap-1">
            <TextStyleIconButton
              label={wrapEnabled ? 'Wrapped text' : 'Single line'}
              active={wrapEnabled}
              onClick={() => onTextChange('textWrap', wrapEnabled ? 'single-line' : 'wrap')}
            >
              <TextWrap className="h-4 w-4" />
            </TextStyleIconButton>
        </InspectorInlineRow>
      ) : null}
    </>
  );
}

function TypographyDesignFields({
  node,
  onTextChange,
  colorFallback,
  shadow,
  shadowFallback,
}: {
  node: TypographyInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
  colorFallback: string;
  shadow: ReturnType<typeof readShadowFieldValues>;
  shadowFallback: ReturnType<typeof createShadowFallback>;
}) {
  return (
    <>
      <InspectorInlineRow label="Color" controlClassName="gap-2">
        <HoverColorField
          value={node.style?.color}
          onChange={(value) => onTextChange('color', value)}
          ariaLabel="Text color"
          fallback={colorFallback}
        />
      </InspectorInlineRow>
      <div className="space-y-1.5">
        <ShadowControlGroup
          color={shadow.color}
          blur={shadow.blur}
          distance={shadow.distance}
          angle={shadow.angle}
          colorFallback={shadowFallback.color}
          onColorChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { color: value })}
          onBlurChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { blur: value })}
          onDistanceChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { distance: value })}
          onAngleChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { angle: value })}
        />
      </div>
    </>
  );
}

function fontSizeFieldValueFromNode(node: TypographyInspectorNode) {
  return node.style?.fontSize?.raw ?? '18px';
}

const SYSTEM_FONT_VALUE = '__system-font__';

function readTextWrapMode(node: TypographyInspectorNode) {
  return node.type === 'leaf' && (node.role === 'link' || node.role === 'button') ? node.style?.textWrap : undefined;
}
