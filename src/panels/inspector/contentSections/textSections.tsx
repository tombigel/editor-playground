import { Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { DocumentModel } from '../../../api/editorApi';
import {
  BorderControlGroup,
  FormField,
  FontSizeField,
  HoverColorField,
  InspectorFieldGroup,
  InspectorInlineRow,
  NumberInput,
  readShadowFieldValues,
  ShadowControlGroup,
  TextStyleIconButton,
} from '../../InspectorControls';
import {
  applyLeafShadowPatch,
  applyUnifiedLeafBorderColor,
  applyUnifiedLeafBorderRadius,
  applyUnifiedLeafBorderWidth,
} from '../styleFields';
import {
  readUnifiedBorderColor,
  readUnifiedBorderRadius,
  readUnifiedBorderWidth,
} from '../stageConversions';
import { BOLD_FONT_WEIGHT, DEFAULT_FONT_WEIGHT, isBoldFontWeight } from '../../../fonts/weights';
import {
  DEFAULT_SHADOW_BLUR_PX,
  DEFAULT_SHADOW_COLOR,
  DEFAULT_SHADOW_SPREAD_PX,
  DEFAULT_SHADOW_OFFSET_X_PX,
  DEFAULT_SHADOW_OFFSET_Y_PX,
  DEFAULT_TEXT_COLOR,
} from '../../../model/styleDefaults';
import { getNodeTextContent } from '../../../render/nodePresentation';
import type { TextInspectorNode } from '../types';
import type { EditorTextField } from '../../../api/documentApi';
import {
  createFocusedModeEntry,
  InspectorSectionCard,
} from '../CommonSections';
import {
  type FocusModeCardProps,
  TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX,
  TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX,
  TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX,
  TYPOGRAPHY_SIZE_ROW_WIDTH_PX,
  createShadowFallback,
  fontSizeFieldValueFromNode,
  lineHeightValue,
  textDecorationHasLineThrough,
  textDecorationHasUnderline,
  toggleTextDecorationLine,
  TypographyTextStyleFields,
  TypographyDesignFields,
} from './shared';
import { createLanguageSelectOptions } from '../../../i18n/languages';

export function TextContentSection({
  document,
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'px-3 pt-1.5 pb-3',
}: {
  document: DocumentModel;
  node: TextInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
  const languageOptions = createLanguageSelectOptions({
    includeSiteLanguage: true,
    siteLanguageTag: document.siteSettings?.lang,
  });

  return (
    <InspectorSectionCard
      title="Content"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'content', onEnterFocusedMode)}
    >
      <InspectorFieldGroup>
        <FormField label="Text">
          <Textarea
            value={node.content as string}
            onChange={(e) => onTextChange('content', e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text/plain');
              if (text) {
                e.preventDefault();
                onTextChange('content', text);
              }
            }}
          />
        </FormField>
      </InspectorFieldGroup>
      <InspectorFieldGroup separated>
        <InspectorInlineRow label="Language" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
          <SearchableSelect
            value={node.lang ?? '__site__'}
            options={languageOptions}
            placeholder="Site language"
            searchPlaceholder="Search languages"
            triggerClassName="h-8 text-[11px]"
            onValueChange={(value) => onTextChange('lang', value === '__site__' ? '' : value)}
          />
        </InspectorInlineRow>
      </InspectorFieldGroup>
    </InspectorSectionCard>
  );
}

export function RichTextContentSection({
  node,
  focusedMode,
  onEnterFocusedMode,
  onActivateRichEdit,
  headerContent,
  headerAction,
  contentClassName = 'px-3 pt-2 pb-3',
}: {
  node: TextInspectorNode;
  onActivateRichEdit?: (nodeId: string) => void;
} & FocusModeCardProps) {
  const preview = getNodeTextContent(node);
  return (
    <InspectorSectionCard
      title="Content"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'content', onEnterFocusedMode)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-full gap-1.5 text-[11px]"
        onClick={() => onActivateRichEdit?.(node.id)}
      >
        <Pencil size={12} />
        Edit rich text
      </Button>
      {preview && (
        <p className="editor-text-muted mt-2 line-clamp-3 break-words px-0.5 text-[11px] leading-relaxed opacity-70">
          {preview}
        </p>
      )}
      <p className="editor-text-muted mt-2 px-0.5 text-[10px] opacity-50">
        <kbd className="font-mono">⌘B</kbd> bold &nbsp;
        <kbd className="font-mono">⌘I</kbd> italic &nbsp;
        <kbd className="font-mono">⌘K</kbd> link
      </p>
    </InspectorSectionCard>
  );
}

const CODE_LANGUAGES = [
  { value: 'plaintext', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash' },
  { value: 'cpp', label: 'C++' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'csharp', label: 'C#' },
];

export function CodeContentSection({
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
  const language = node.code?.language ?? 'plaintext';
  return (
    <InspectorSectionCard
      title="Content"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'content', onEnterFocusedMode)}
    >
      <InspectorFieldGroup>
        <FormField label="Code">
          <Textarea
            value={node.content as string}
            rows={5}
            style={{ fontFamily: 'monospace' }}
            onChange={(e) => onTextChange('content', e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text/plain');
              if (text) {
                e.preventDefault();
                onTextChange('content', text);
              }
            }}
          />
        </FormField>
      </InspectorFieldGroup>
      <InspectorFieldGroup gap>
        <InspectorInlineRow label="Language" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
          <Select value={language} onValueChange={(value) => onTextChange('codeLanguage', value)}>
            <SelectTrigger className="h-8 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODE_LANGUAGES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InspectorInlineRow>
      </InspectorFieldGroup>
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

export function CodeTextStyleSection({
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
  const theme = node.code?.theme ?? 'light';
  return (
    <InspectorSectionCard
      title="Text style"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'design', onEnterFocusedMode)}
    >
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
          onClick={() => onTextChange('fontWeight', String(isBoldFontWeight(node.style?.fontWeight) ? DEFAULT_FONT_WEIGHT : BOLD_FONT_WEIGHT))}
        >
          <span className="font-black tracking-[-0.02em]">B</span>
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
          onClick={() => onTextChange('textDecorationLine', toggleTextDecorationLine(node.style?.textDecorationLine, 'line-through'))}
        >
          <span className="line-through">S</span>
        </TextStyleIconButton>
      </InspectorInlineRow>
      <InspectorInlineRow label="Theme" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
        <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
          {(['light', 'dark'] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={theme === t ? 'default' : 'ghost'}
              size="sm"
              className="h-6 rounded-md px-2 text-[11px] capitalize"
              onClick={() => onTextChange('codeTheme', t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </InspectorInlineRow>
    </InspectorSectionCard>
  );
}

export function CodeDesignSection({
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
          value={node.style?.background}
          onChange={(value) => onTextChange('background', value)}
          ariaLabel="Code block background"
          fallback="transparent"
        />
      </InspectorInlineRow>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
        <span className="editor-text-strong pt-1 text-[11px] font-medium">Border</span>
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
          distance={shadow.distance}
          angle={shadow.angle}
          colorFallback={shadowFallback.color}
          onColorChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { color: value })}
          onBlurChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { blur: value })}
          onDistanceChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { distance: value })}
          onAngleChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { angle: value })}
        />
      </div>
    </InspectorSectionCard>
  );
}
