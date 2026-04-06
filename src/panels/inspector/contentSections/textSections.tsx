import { Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { DocumentModel } from '../../../api/editorApi';
import {
  FormField,
  InspectorFieldGroup,
  InspectorInlineRow,
  readShadowFieldValues,
} from '../../InspectorControls';
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
  createShadowFallback,
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
          <Textarea value={node.content as string} onChange={(e) => onTextChange('content', e.target.value)} />
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
  headerContent,
  headerAction,
  contentClassName = 'px-3 pt-2 pb-3',
}: {
  node: TextInspectorNode;
} & FocusModeCardProps) {
  const preview = getNodeTextContent(node);
  return (
    <InspectorSectionCard
      title="Content"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
    >
      <div className="editor-text-muted flex items-start gap-2 rounded-md border border-dashed px-3 py-2.5 text-[11px]"
        style={{ borderColor: 'var(--editor-border-subtle)' }}
      >
        <Pencil size={13} className="mt-px shrink-0 opacity-60" />
        <span>Double-click on the canvas to edit rich text</span>
      </div>
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
