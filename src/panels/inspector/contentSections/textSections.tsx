import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  DEFAULT_LINK_COLOR,
  DEFAULT_TEXT_COLOR,
} from '../../../model/styleDefaults';
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
  LinkEnabledRow,
  NavigationFields,
  TypographyTextStyleFields,
  TypographyDesignFields,
} from './shared';
import { createLanguageSelectOptions } from '../../../i18n/languages';
import {
  listContentToLines,
  normalizeListContent,
} from '../../../model/listContent';
import {
  createTextDocumentContent,
  createTextDocumentFromCode,
  createTextDocumentFromText,
  getSingleListBlockContent,
  getSingleTextBlockContent,
  getTextContent,
  htmlTagToTextBlockType,
  listContentToRichListBlock,
  replaceTextDocumentBlocks,
  richListBlockToListContent,
} from '../../../model/richContent';
import type { ListContent, TextDocumentContent } from '../../../model/types';
import { CODE_LANGUAGE_OPTIONS, highlightCode, normalizeCodeLanguage } from '../../../render/codeHighlight';

type StructuredListContent = Extract<ListContent, { type: 'ul' | 'ol' }>;

const LIST_TYPE_OPTIONS = [
  { value: 'ul', label: 'Bulleted' },
  { value: 'ol', label: 'Numbered' },
] as const;

const UNORDERED_MARKER_OPTIONS = [
  { value: 'disc', label: 'Disc' },
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
] as const;

const ORDERED_MARKER_OPTIONS = [
  { value: 'decimal', label: 'Decimal' },
  { value: 'lower-alpha', label: 'a, b, c' },
  { value: 'upper-alpha', label: 'A, B, C' },
  { value: 'lower-roman', label: 'i, ii, iii' },
  { value: 'upper-roman', label: 'I, II, III' },
] as const;

const HTML_TAG_OPTIONS = [
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'h4', label: 'H4' },
  { value: 'h5', label: 'H5' },
  { value: 'h6', label: 'H6' },
  { value: 'p', label: 'P' },
  { value: 'blockquote', label: 'Blockquote' },
  { value: 'div', label: 'Div' },
] as const;

function formatListLine(item: ListContent['items'][number]): string {
  if ('text' in item) {
    return item.text;
  }

  if (item.term && item.description) {
    return `${item.term}: ${item.description}`;
  }

  return item.term || item.description;
}

function parseDescriptionItem(line: string) {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) {
    return { term: line.trim(), description: '' };
  }

  return {
    term: line.slice(0, separatorIndex).trim(),
    description: line.slice(separatorIndex + 1).trim(),
  };
}

function buildListContentFromLines(
  linesValue: string,
  currentContent: ListContent,
  nextType: ListContent['type'] = currentContent.type,
): ListContent {
  const lines = linesValue.split(/\r?\n/);
  const normalizedLines = lines.length > 0 ? lines : [''];

  if (nextType === 'dl') {
    return normalizeListContent({
      type: 'dl',
      items: normalizedLines.map((line, index) => {
        const currentItem = currentContent.items[index];
        const { term, description } = parseDescriptionItem(line);
        return {
          term,
          description,
          direction: currentItem?.direction,
          link: currentItem?.link,
        };
      }),
    });
  }

  return normalizeListContent({
    type: nextType,
    ...(nextType === 'ol'
      ? {
          start: currentContent.type === 'ol' ? currentContent.start : 1,
          markerStyle: currentContent.type === 'ol' ? currentContent.markerStyle : 'decimal',
        }
      : {
          markerStyle: currentContent.type === 'ul' ? currentContent.markerStyle : 'disc',
        }),
    items: normalizedLines.map((line, index) => {
      const currentItem = currentContent.items[index];
      return {
        text: line,
        direction: currentItem?.direction,
        link: currentItem?.link,
      };
    }),
  });
}

function isStructuredListContent(content: ListContent): content is StructuredListContent {
  return content.type === 'ul' || content.type === 'ol';
}

function updateStructuredListItems(
  content: StructuredListContent,
  updater: (items: StructuredListContent['items']) => StructuredListContent['items'],
): StructuredListContent {
  const items = updater(content.items);
  const normalizedItems = items.length > 0 ? items : [{ text: '' }];
  return normalizeListContent({ ...content, items: normalizedItems }) as StructuredListContent;
}

function setStructuredListItemText(
  content: StructuredListContent,
  index: number,
  text: string,
): StructuredListContent {
  return updateStructuredListItems(content, (items) =>
    items.map((item, itemIndex) => (itemIndex === index ? { ...item, text } : item)),
  );
}

function addStructuredListItem(content: StructuredListContent): StructuredListContent {
  return updateStructuredListItems(content, (items) => [...items, { text: '' }]);
}

function removeStructuredListItem(content: StructuredListContent, index: number): StructuredListContent {
  return updateStructuredListItems(content, (items) => items.filter((_, itemIndex) => itemIndex !== index));
}

function moveStructuredListItem(
  content: StructuredListContent,
  index: number,
  direction: -1 | 1,
): StructuredListContent {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= content.items.length) {
    return content;
  }

  return updateStructuredListItems(content, (items) => {
    const nextItems = [...items];
    const [movedItem] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, movedItem);
    return nextItems;
  });
}

function createStructuredListItemKeys(nodeId: string, content: StructuredListContent): string[] {
  return content.items.map((_, index) => `${nodeId}-list-item-${index}`);
}

function HtmlTagInlineField({
  value,
  onValueChange,
}: {
  value: TextInspectorNode['htmlTag'];
  onValueChange: (value: string) => void;
}) {
  return (
    <InspectorInlineRow label="HTML tag" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 w-24 rounded-sm text-[11px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HTML_TAG_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </InspectorInlineRow>
  );
}

export function TextContentSection({
  document,
  node,
  onTextChange,
  onSetTextDocumentContent,
  showHtmlTag = node.subtype === 'block',
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'px-3 pt-1.5 pb-3',
}: {
  document: DocumentModel;
  node: TextInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
  onSetTextDocumentContent: (content: TextDocumentContent) => void;
  showHtmlTag?: boolean;
} & FocusModeCardProps) {
  const textValue = getTextContent(node.content.blocks, { blockSeparator: '\n' });
  const languageOptions = createLanguageSelectOptions({
    includeSiteLanguage: true,
    siteLanguageTag: document.siteSettings?.lang,
  });
  const textBlock = getSingleTextBlockContent(node.content);

  function setPlainTextContent(nextText: string) {
    onSetTextDocumentContent(createTextDocumentFromText(nextText, {
      type: textBlock?.type ?? 'paragraph',
      direction: node.style?.direction ?? textBlock?.direction ?? 'ltr',
      lineHeight: typeof textBlock?.lineHeight === 'number' ? textBlock.lineHeight : undefined,
      style: textBlock?.style,
    }));
  }

  function setHtmlTag(value: string) {
    if (!textBlock) {
      return;
    }
    onSetTextDocumentContent(replaceTextDocumentBlocks(node.content, [{
      ...textBlock,
      type: htmlTagToTextBlockType(
        value === 'h1' ||
          value === 'h2' ||
          value === 'h3' ||
          value === 'h4' ||
          value === 'h5' ||
          value === 'h6' ||
          value === 'blockquote' ||
          value === 'div'
          ? value
          : 'p',
      ),
    }]));
  }

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
            value={textValue}
            onChange={(e) => setPlainTextContent(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text/plain');
              if (text) {
                e.preventDefault();
                setPlainTextContent(text);
              }
            }}
          />
        </FormField>
      </InspectorFieldGroup>
      <InspectorFieldGroup separated>
        {showHtmlTag ? (
          <HtmlTagInlineField value={node.htmlTag} onValueChange={setHtmlTag} />
        ) : null}
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
      <InspectorFieldGroup gap>
        <LinkEnabledRow
          checked={Boolean(node.link)}
          onCheckedChange={(checked) => onTextChange('linkEnabled', checked ? 'true' : '')}
        />
        {node.link ? (
          <NavigationFields document={document} node={node} onTextChange={onTextChange} />
        ) : null}
      </InspectorFieldGroup>
    </InspectorSectionCard>
  );
}

export function ListContentSection({
  node,
  onSetTextDocumentContent,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'px-3 pt-1.5 pb-3',
}: {
  node: TextInspectorNode;
  onSetTextDocumentContent: (content: TextDocumentContent) => void;
} & FocusModeCardProps) {
  const listBlock = getSingleListBlockContent(node.content);
  const listContent = listBlock ? richListBlockToListContent(listBlock) : normalizeListContent(undefined);
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(() => listContent.type === 'dl');
  const itemsValue = listContent.items.map((item) => formatListLine(item)).join('\n');
  const structuredListContent = isStructuredListContent(listContent) ? listContent : null;
  const structuredItemKeys = structuredListContent ? createStructuredListItemKeys(node.id, structuredListContent) : [];

  useEffect(() => {
    if (listContent.type === 'dl') {
      setShowAdvancedEdit(true);
    }
  }, [listContent.type]);

  function commitListContent(nextContent: ListContent) {
    onSetTextDocumentContent(createTextDocumentContent([
      listContentToRichListBlock(normalizeListContent(nextContent), { direction: node.style?.direction ?? 'ltr' }),
    ]));
  }

  return (
    <InspectorSectionCard
      title="Content"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'content', onEnterFocusedMode)}
    >
      <InspectorFieldGroup gap>
        {structuredListContent ? (
          <InspectorInlineRow label="Type" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
            <Select
              value={structuredListContent.type}
              onValueChange={(value: StructuredListContent['type']) =>
                commitListContent(buildListContentFromLines(itemsValue, listContent, value))
              }
            >
              <SelectTrigger className="h-8 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIST_TYPE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InspectorInlineRow>
        ) : (
          <div className="editor-border-subtle editor-bg-subtle editor-text-muted rounded-sm border px-3 py-2 text-[11px] leading-4">
            Description list inspector editing is deferred to phase 2. Convert this node to bulleted or numbered to use structured controls.
          </div>
        )}
        {structuredListContent?.type === 'ul' ? (
          <InspectorInlineRow label="Bullet" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
            <Select
              value={structuredListContent.markerStyle ?? 'disc'}
              onValueChange={(value) =>
                commitListContent({ ...structuredListContent, markerStyle: value as typeof structuredListContent.markerStyle })
              }
            >
              <SelectTrigger className="h-8 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNORDERED_MARKER_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InspectorInlineRow>
        ) : null}
        {structuredListContent?.type === 'ol' ? (
          <>
            <InspectorInlineRow label="Start" controlWidth="88px">
              <NumberInput
                value={structuredListContent.start ?? 1}
                min={1}
                max={999}
                step={1}
                onChange={(value) =>
                  commitListContent({ ...structuredListContent, start: Math.max(1, Math.trunc(value)) })
                }
              />
            </InspectorInlineRow>
            <InspectorInlineRow label="Marker" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
              <Select
                value={structuredListContent.markerStyle ?? 'decimal'}
                onValueChange={(value) =>
                  commitListContent({ ...structuredListContent, markerStyle: value as typeof structuredListContent.markerStyle })
                }
              >
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDERED_MARKER_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InspectorInlineRow>
          </>
        ) : null}
      </InspectorFieldGroup>
      {structuredListContent ? (
        <div className="space-y-2.5 pt-2.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="editor-text-strong text-[11px] font-medium">Items</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2 text-[11px]"
                onClick={() => commitListContent(addStructuredListItem(structuredListContent))}
              >
                <Plus className="h-3.5 w-3.5" />
                Add item
              </Button>
            </div>
            <div className="space-y-2">
              {structuredListContent.items.map((item, index) => (
                <div
                  key={structuredItemKeys[index]}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                >
                  <Input
                    aria-label={`List item ${index + 1}`}
                    value={item.text}
                    placeholder={`Item ${index + 1}`}
                    className="h-8 rounded-sm text-[12px]"
                    onChange={(event) =>
                      commitListContent(setStructuredListItemText(structuredListContent, index, event.target.value))
                    }
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Move list item ${index + 1} up`}
                      className="h-8 w-8 rounded-sm p-0"
                      onClick={() => commitListContent(moveStructuredListItem(structuredListContent, index, -1))}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Move list item ${index + 1} down`}
                      className="h-8 w-8 rounded-sm p-0"
                      onClick={() => commitListContent(moveStructuredListItem(structuredListContent, index, 1))}
                      disabled={index === structuredListContent.items.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Remove list item ${index + 1}`}
                      className="h-8 w-8 rounded-sm p-0"
                      onClick={() => commitListContent(removeStructuredListItem(structuredListContent, index))}
                      disabled={structuredListContent.items.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <InspectorFieldGroup gap>
        <div className="flex items-center justify-between gap-2">
          <span className="editor-text-strong text-[11px] font-medium">Advanced edit</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setShowAdvancedEdit((value) => !value)}
          >
            {showAdvancedEdit ? 'Hide' : 'Show'}
          </Button>
        </div>
        {showAdvancedEdit ? (
          <FormField label={listContent.type === 'dl' ? 'Bulk edit (term: description)' : 'Bulk edit (new line separated)'}>
            <Textarea
              value={itemsValue}
              rows={Math.max(4, listContentToLines(listContent).length)}
              onChange={(event) => commitListContent(buildListContentFromLines(event.target.value, listContent))}
              onPaste={(event) => {
                const text = event.clipboardData.getData('text/plain');
                if (text) {
                  event.preventDefault();
                  commitListContent(buildListContentFromLines(text, listContent));
                }
              }}
            />
          </FormField>
        ) : null}
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
    </InspectorSectionCard>
  );
}

export function CodeContentSection({
  node,
  onSetTextDocumentContent,
  onSetCodeLanguage,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'px-3 pt-1.5 pb-3',
}: {
  node: TextInspectorNode;
  onSetTextDocumentContent: (content: TextDocumentContent) => void;
  onSetCodeLanguage: (language: string) => void;
} & FocusModeCardProps) {
  const codeBlock = node.content.blocks[0]?.type === 'code-block' ? node.content.blocks[0] : undefined;
  const language = normalizeCodeLanguage(codeBlock?.language ?? node.code?.language ?? 'plaintext');
  const codeValue = getTextContent(node.content.blocks, { blockSeparator: '\n' });

  function setCodeContent(nextText: string) {
    onSetTextDocumentContent(createTextDocumentFromCode(nextText, {
      direction: 'ltr',
      language,
      theme: codeBlock?.theme ?? node.code?.theme,
      highlightedHtml: highlightCode(nextText, language),
      style: codeBlock?.style,
    }));
  }

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
            value={codeValue}
            rows={5}
            style={{ fontFamily: 'monospace' }}
            onChange={(e) => setCodeContent(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text/plain');
              if (text) {
                e.preventDefault();
                setCodeContent(text);
              }
            }}
          />
        </FormField>
      </InspectorFieldGroup>
      <InspectorFieldGroup gap>
        <InspectorInlineRow label="Language" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
          <Select value={language} onValueChange={onSetCodeLanguage}>
            <SelectTrigger className="h-8 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODE_LANGUAGE_OPTIONS.map(({ value, label }) => (
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
          supportsWrap={node.link !== undefined}
          onOpenManageFonts={onOpenManageFonts}
        />
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
          colorFallback={node.link ? DEFAULT_LINK_COLOR : DEFAULT_TEXT_COLOR}
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
        supportsWrap={node.link !== undefined}
        onOpenManageFonts={onOpenManageFonts}
      />
      <div className="editor-border-subtle space-y-2.5 border-t pt-2.5">
        <TypographyDesignFields
          node={node}
          onTextChange={onTextChange}
          colorFallback={node.link ? DEFAULT_LINK_COLOR : DEFAULT_TEXT_COLOR}
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
      <FormField label="Background" layout="inline" controlClassName="gap-2">
        <HoverColorField
          value={node.style?.background}
          onChange={(value) => onTextChange('background', value)}
          ariaLabel="Code block background"
          fallback="transparent"
        />
      </FormField>
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
