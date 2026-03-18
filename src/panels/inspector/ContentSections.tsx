import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  ArrowUpDown,
  PilcrowLeft,
  PilcrowRight,
  TextWrap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  BorderControlGroup,
  FontSizeField,
  FormField,
  HoverColorField,
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
import {
  applyLeafShadowPatch,
  applyUnifiedLeafBorderColor,
  applyUnifiedLeafBorderRadius,
  applyUnifiedLeafBorderWidth,
} from './styleFields';

export function TextContentSection({
  node,
  onTextChange,
}: {
  node: TextInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Content</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-1.5 pb-3">
        <FormField label="Text">
          <Textarea value={node.content} onChange={(e) => onTextChange('content', e.target.value)} />
        </FormField>
      </CardContent>
    </Card>
  );
}

export function TextTextStyleSection({
  node,
  onTextChange,
}: {
  node: TextInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Text style</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
        <TypographyTextStyleFields
          node={node}
          onTextChange={onTextChange}
        />
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">HTML tag</Label>
          <Select value={node.htmlTag} onValueChange={(value) => onTextChange('htmlTag', value)}>
            <SelectTrigger className="ml-auto h-8 w-24 rounded-sm text-[11px]">
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
        </div>
      </CardContent>
    </Card>
  );
}

export function TextDesignSection({
  node,
  onTextChange,
}: {
  node: TextInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
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
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Design</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
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
      </CardContent>
    </Card>
  );
}

export function ButtonContentSection({
  node,
  onTextChange,
}: {
  node: ButtonInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Content</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-1.5 pb-3">
        <FormField label="Label">
          <Input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
        </FormField>
      </CardContent>
    </Card>
  );
}

export function ButtonTextStyleSection({
  node,
  onTextChange,
}: {
  node: ButtonInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Text style</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
        <TypographyTextStyleFields node={node} onTextChange={onTextChange} supportsWrap wrapFieldLabel="Wrap" />
      </CardContent>
    </Card>
  );
}

export function ButtonDesignSection({
  node,
  onTextChange,
}: {
  node: ButtonInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  const shadowFallback = createShadowFallback(
    DEFAULT_BUTTON_SHADOW_COLOR,
    DEFAULT_BUTTON_SHADOW_BLUR_PX,
    DEFAULT_BUTTON_SHADOW_SPREAD_PX,
    DEFAULT_BUTTON_SHADOW_OFFSET_X_PX,
    DEFAULT_BUTTON_SHADOW_OFFSET_Y_PX,
  );
  const shadow = readShadowFieldValues(node.style, shadowFallback);

  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Design</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
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
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
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
      </CardContent>
    </Card>
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

export function LinkContentSection({
  node,
  onTextChange,
}: {
  node: LinkInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
        <FormField label="Label">
          <Input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
        </FormField>
        <FormField label="Href">
          <Input value={node.href ?? ''} onChange={(e) => onTextChange('href', e.target.value)} />
        </FormField>
      </CardContent>
    </Card>
  );
}

export function LinkTextStyleSection({
  node,
  onTextChange,
}: {
  node: LinkInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Text style</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
        <TypographyTextStyleFields node={node} onTextChange={onTextChange} supportsWrap wrapFieldLabel="Wrap" />
      </CardContent>
    </Card>
  );
}

export function LinkDesignSection({
  node,
  onTextChange,
}: {
  node: LinkInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  const shadowFallback = createShadowFallback(
    DEFAULT_SHADOW_COLOR,
    DEFAULT_SHADOW_BLUR_PX,
    DEFAULT_SHADOW_SPREAD_PX,
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
        <TypographyDesignFields
          node={node}
          onTextChange={onTextChange}
          colorFallback={DEFAULT_LINK_COLOR}
          shadow={shadow}
          shadowFallback={shadowFallback}
        />
      </CardContent>
    </Card>
  );
}

export function ImageContentSection({
  node,
  onTextChange,
}: {
  node: ImageInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
        <FormField label="Src">
          <Input value={node.src ?? ''} onChange={(e) => onTextChange('src', e.target.value)} />
        </FormField>
        <FormField label="Alt">
          <Input value={node.alt ?? ''} onChange={(e) => onTextChange('alt', e.target.value)} />
        </FormField>
      </CardContent>
    </Card>
  );
}

export function ImageDesignSection({
  node,
  onTextChange,
}: {
  node: ImageInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  const shadowFallback = createShadowFallback(
    DEFAULT_IMAGE_SHADOW_COLOR,
    DEFAULT_IMAGE_SHADOW_BLUR_PX,
    DEFAULT_IMAGE_SHADOW_SPREAD_PX,
    DEFAULT_IMAGE_SHADOW_OFFSET_X_PX,
    DEFAULT_IMAGE_SHADOW_OFFSET_Y_PX,
  );
  const shadow = readShadowFieldValues(node.style, shadowFallback);

  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Design</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
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
      </CardContent>
    </Card>
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

function TypographyTextStyleFields({
  node,
  onTextChange,
  supportsWrap = false,
  wrapFieldLabel = 'Wrap',
}: {
  node: TypographyInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
  supportsWrap?: boolean;
  wrapFieldLabel?: string;
}) {
  const wrapEnabled = supportsWrap && readTextWrapMode(node) === 'wrap';

  return (
    <>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
        <Label className="text-[11px] font-medium">Size</Label>
        <div className="ml-auto grid w-[140px] grid-cols-[96px_40px] items-center gap-1">
          <FontSizeField nodeId={node.id} value={fontSizeFieldValueFromNode(node)} onChange={(value) => onTextChange('fontSize', value)} />
          <NumberInput
            value={lineHeightValue(node)}
            min={0.1}
            max={4}
            step={0.1}
            onChange={(value) => onTextChange('lineHeight', String(value))}
          />
        </div>
      </div>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
        <Label className="text-[11px] font-medium">Style</Label>
        <div className="ml-auto flex items-center gap-1">
          <TextStyleIconButton
            label="Bold"
            active={node.style?.fontWeight === 'bold'}
            onClick={() => onTextChange('fontWeight', node.style?.fontWeight === 'bold' ? 'normal' : 'bold')}
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
        </div>
      </div>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
        <Label className="text-[11px] font-medium">Align</Label>
        <div className="ml-auto flex items-center gap-1">
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
        </div>
      </div>
      {supportsWrap ? (
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">{wrapFieldLabel}</Label>
          <div className="ml-auto flex items-center gap-1">
            <TextStyleIconButton
              label={wrapEnabled ? 'Wrapped text' : 'Single line'}
              active={wrapEnabled}
              onClick={() => onTextChange('textWrap', wrapEnabled ? 'single-line' : 'wrap')}
            >
              <TextWrap className="h-4 w-4" />
            </TextStyleIconButton>
          </div>
        </div>
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
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
        <Label className="text-[11px] font-medium">Color</Label>
        <div className="ml-auto flex items-center gap-2">
          <HoverColorField
            value={node.style?.color}
            onChange={(value) => onTextChange('color', value)}
            ariaLabel="Text color"
            fallback={colorFallback}
          />
        </div>
      </div>
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

function readTextWrapMode(node: TypographyInspectorNode) {
  return node.type === 'leaf' && (node.role === 'link' || node.role === 'button') ? node.style?.textWrap : undefined;
}
