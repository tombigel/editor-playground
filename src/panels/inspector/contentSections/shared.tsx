import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Link2,
  PilcrowLeft,
  PilcrowRight,
  Settings2,
  TextWrap,
  TriangleAlert,
} from 'lucide-react';
import { DARK_TOOLTIP_CLASS } from '@/lib/utils';
import { useMemo, useState, type ReactNode } from 'react';
import { buildFontPickerPreviewStylesheetHref, listFontWeightOptions } from '../../../api/fontApi';
import { useFontPreviewStylesheet } from '../useFontPreviewStylesheet';
import { readRecentFontFamilies, writeRecentFontFamilies } from '../fontPickerHelpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { InlineNotice } from '@/components/ui/settings-panel';
import {
  BOLD_FONT_WEIGHT,
  DEFAULT_FONT_WEIGHT,
  getDocumentFontFamily,
  isBoldFontWeight,
  listDocumentFontsForPicker,
  resolveNearestSupportedFontWeight,
} from '../../../api/fontApi';
import type { DocumentModel } from '../../../api/editorApi';
import {
  FontPickerPopover,
  FontSizeField,
  FormField,
  HoverColorField,
  NumberInput,
  ShadowControlGroup,
  SwitchBlock,
  TextStyleIconButton,
  type readShadowFieldValues,
} from '../../InspectorControls';
import type {
  ButtonInspectorNode,
  ImageInspectorNode,
  LinkInspectorNode,
  TextInspectorNode,
} from '../types';
import type { EditorTextField } from '../../../api/documentApi';
import type { FocusedMode } from '../../../api/editorApi';
import { getSectionAnchorOptions, isValidSectionAnchorTarget } from '../../../api/documentViewApi';
import {
  applyLeafShadowPatch,
} from '../styleFields';
import type { InspectorSectionHeaderAction } from '../CommonSections';

export type FocusModeCardProps = {
  focusedMode?: FocusedMode;
  onEnterFocusedMode?: (mode: FocusedMode) => void;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
  contentClassName?: string;
};

export type TypographyInspectorNode = TextInspectorNode | LinkInspectorNode | ButtonInspectorNode;

export const TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX = 32;
export const TYPOGRAPHY_FIELD_GAP_PX = 4;
export const TYPOGRAPHY_FONT_PICKER_WIDTH_PX = 104 + TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX;
export const TYPOGRAPHY_FONT_ROW_WIDTH_PX =
  TYPOGRAPHY_FONT_PICKER_WIDTH_PX + TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX + TYPOGRAPHY_FIELD_GAP_PX;
export const TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX = TYPOGRAPHY_FONT_ROW_WIDTH_PX;
export const TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX = 96 + TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX / 2;
export const TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX = 40 + TYPOGRAPHY_SQUARE_BUTTON_SIZE_PX / 2;
export const TYPOGRAPHY_SIZE_ROW_WIDTH_PX =
  TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX + TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX + TYPOGRAPHY_FIELD_GAP_PX;

export const SYSTEM_FONT_VALUE = '__system-font__';

export function lineHeightValue(node: TypographyInspectorNode) {
  return node.style?.lineHeight ?? 1.2;
}

export function textDecorationHasUnderline(node: TypographyInspectorNode) {
  return node.style?.textDecorationLine?.includes('underline') ?? false;
}

export function textDecorationHasLineThrough(node: TypographyInspectorNode) {
  return node.style?.textDecorationLine?.includes('line-through') ?? false;
}

export function toggleTextDecorationLine(
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

export function createShadowFallback(color: string, blur: number, spread: number, offsetX: number, offsetY: number) {
  return {
    color,
    blur,
    spread,
    distance: Math.round(Math.sqrt(offsetX ** 2 + offsetY ** 2) * 100) / 100,
    angle: Math.round(((Math.atan2(offsetY, offsetX) * 180) / Math.PI) * 100) / 100,
  };
}

export function fontSizeFieldValueFromNode(node: TypographyInspectorNode) {
  return node.style?.fontSize?.raw ?? '18px';
}

export function readTextWrapMode(node: TypographyInspectorNode) {
  return node.link !== undefined ? node.style?.textWrap : undefined;
}

export function TypographyTextStyleFields({
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

  // Lifted state: recent fonts and preview stylesheet
  const [recentFamilyNames, setRecentFamilyNames] = useState<string[]>(() => readRecentFontFamilies());
  const currentWeight = node.style?.fontWeight ?? DEFAULT_FONT_WEIGHT;
  const activeWeightOptions = listFontWeightOptions(selectedFamily, currentWeight);
  const previewHref = useMemo(
    () => buildFontPickerPreviewStylesheetHref({
        families: documentFonts,
        activeFamilyName: currentFamily === SYSTEM_FONT_VALUE ? undefined : currentFamily,
        activeWeights: activeWeightOptions.map((option) => option.value),
      }),
    [activeWeightOptions, currentFamily, documentFonts],
  );
  useFontPreviewStylesheet(previewHref);

  const handleRecentFamiliesChange = (families: string[]) => {
    setRecentFamilyNames(families);
    writeRecentFontFamilies(families);
  };

  return (
    <>
      <FormField
        label="Font"
        layout="inline-group"
        controlWidth={`${TYPOGRAPHY_FONT_ROW_WIDTH_PX}px`}
        controlClassName="gap-1"
      >
          <div className="shrink-0" style={{ width: `${TYPOGRAPHY_FONT_PICKER_WIDTH_PX}px` }}>
            <FontPickerPopover
              familyValue={currentFamily}
              weightValue={currentWeight}
              families={documentFonts}
              systemOptionValue={SYSTEM_FONT_VALUE}
              onFamilyChange={(value) => onTextChange('fontFamily', value === SYSTEM_FONT_VALUE ? '' : value)}
              onWeightChange={(value) => onTextChange('fontWeight', value)}
              className="w-full"
              recentFamilyNames={recentFamilyNames}
              onRecentFamiliesChange={handleRecentFamiliesChange}
              previewStylesheetHref={previewHref}
            />
          </div>
          <PopoverTooltip
            side="top"
            align="center"
            className={DARK_TOOLTIP_CLASS}
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
      </FormField>
      <FormField
        label="Size"
        layout="inline-group"
        controlWidth={`${TYPOGRAPHY_SIZE_ROW_WIDTH_PX}px`}
      >
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
      </FormField>
      <FormField
        label="Style"
        layout="inline-group"
        controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
        controlClassName="gap-1"
      >
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
      </FormField>
      <FormField
        label="Align"
        layout="inline-group"
        controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
        controlClassName="gap-1"
      >
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
      </FormField>
      {supportsWrap ? (
        <FormField
          label={wrapFieldLabel}
          layout="inline"
          controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
          controlClassName="gap-1"
        >
            <TextStyleIconButton
              label={wrapEnabled ? 'Wrapped text' : 'Single line'}
              active={wrapEnabled}
              onClick={() => onTextChange('textWrap', wrapEnabled ? 'single-line' : 'wrap')}
            >
              <TextWrap className="h-4 w-4" />
            </TextStyleIconButton>
        </FormField>
      ) : null}
    </>
  );
}

export function TypographyDesignFields({
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
      <FormField label="Color" layout="inline" controlClassName="gap-2">
        <HoverColorField
          value={node.style?.color}
          onChange={(value) => onTextChange('color', value)}
          ariaLabel="Text color"
          fallback={colorFallback}
        />
      </FormField>
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

export type NavigationInspectorNode = ButtonInspectorNode | LinkInspectorNode | ImageInspectorNode;

export function LinkEnabledRow({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <SwitchBlock
      icon={<Link2 className={`h-3.5 w-3.5 shrink-0 ${checked ? 'editor-text-accent' : 'editor-text-muted'}`} />}
      title="Link"
      description="Turn this content into a navigation target."
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
  );
}

export function OpenInNewTabField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <FormField label="Open in a new tab" layout="inline">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label="Open in a new tab"
        className="editor-border-subtle h-4 w-4 rounded-sm border"
      />
    </FormField>
  );
}

function computePageDepth(pages: Array<{ id: string; parentPageId?: string }>, pageId: string): number {
  const visited = new Set<string>();
  let depth = 0;
  let current: string | undefined = pageId;
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const page = pages.find((p) => p.id === current);
    if (!page?.parentPageId) break;
    current = page.parentPageId;
    depth++;
  }
  return depth;
}

export function NavigationFields({
  document,
  node,
  onTextChange,
}: {
  document: DocumentModel;
  node: NavigationInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  const linkType = node.link?.linkType ?? 'external';
  const sectionOptions = getSectionAnchorOptions(document);
  const anchorValue = isValidSectionAnchorTarget(document, node.link?.anchorTargetId) ? node.link?.anchorTargetId : undefined;
  const selectedAnchorOption = sectionOptions.find((option) => option.id === anchorValue);
  const hasBrokenAnchorTarget = Boolean(node.link?.anchorTargetId && !anchorValue);
  const pages = document.pages ?? [];
  const hasPages = pages.length > 0;

  // Page link fields
  const targetPageId = node.link?.targetPageId;
  const pageAnchorId = node.link?.pageAnchorId;
  const targetPage = targetPageId ? pages.find((p) => p.id === targetPageId) : undefined;

  // Build section options for the target page
  const targetPageSectionOptions = useMemo(() => {
    if (!targetPage) return [];
    return targetPage.sectionIds
      .map((sectionId) => {
        const sectionNode = document.nodes[sectionId];
        if (!sectionNode) return null;
        return { id: sectionId, name: sectionNode.name || sectionId };
      })
      .filter((opt): opt is { id: string; name: string } => opt !== null);
  }, [targetPage, document.nodes]);

  function handleLinkTypeChange(value: 'anchor' | 'external' | 'page') {
    onTextChange('linkType', value);
    if (value === 'anchor' && !node.link?.anchorTargetId && sectionOptions[0]) {
      onTextChange('anchorTargetId', sectionOptions[0].id);
      onTextChange('href', sectionOptions[0].href);
      return;
    }
    if (value === 'external') {
      onTextChange('openInNewTab', node.link?.openInNewTab ? 'true' : '');
    }
    if (value === 'page' && !targetPageId && pages[0]) {
      onTextChange('targetPageId', pages[0].id);
    }
  }

  return (
    <>
      <FormField label="Type" layout="inline">
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
          {hasPages ? (
            <Button
              type="button"
              variant={linkType === 'page' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              onClick={() => handleLinkTypeChange('page')}
            >
              Page
            </Button>
          ) : null}
        </div>
      </FormField>
      {linkType === 'anchor' ? (
        <FormField
          label={(
            <div className="flex items-center justify-between gap-2">
              <span>Section</span>
              {hasBrokenAnchorTarget ? (
                <InlineNotice
                  className="shrink-0 text-[10px] font-medium leading-4"
                  icon={<TriangleAlert className="h-3 w-3 shrink-0" />}
                >
                  Broken anchor
                </InlineNotice>
              ) : null}
            </div>
          )}
        >
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
        </FormField>
      ) : linkType === 'page' ? (
        <div className="space-y-2">
          <FormField label="Page">
            <Select
              value={targetPageId}
              onValueChange={(value) => onTextChange('targetPageId', value)}
              disabled={pages.length === 0}
            >
              <SelectTrigger>
                <span className="truncate text-left">
                  {targetPage?.displayName ?? (pages.length > 0 ? 'Select a page' : 'No pages available')}
                </span>
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => {
                  const depth = computePageDepth(pages, page.id);
                  return (
                    <SelectItem key={page.id} value={page.id}>
                      <span style={{ paddingLeft: `${depth * 12}px` }}>
                        {page.displayName || page.slug || page.id}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </FormField>
          {targetPage && targetPageSectionOptions.length > 0 ? (
            <FormField label="Jump to section (optional)">
              <Select
                value={pageAnchorId ?? ''}
                onValueChange={(value) =>
                  onTextChange('pageAnchorId', value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger>
                  <span className="truncate text-left">
                    {pageAnchorId
                      ? (targetPageSectionOptions.find((o) => o.id === pageAnchorId)?.name ?? pageAnchorId)
                      : 'None'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {targetPageSectionOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
        </div>
      ) : (
        <>
          <FormField label="Href">
            <Input value={node.link?.href ?? ''} onChange={(e) => onTextChange('href', e.target.value)} />
          </FormField>
          <OpenInNewTabField
            checked={Boolean(node.link?.openInNewTab)}
            onChange={(checked) => onTextChange('openInNewTab', checked ? 'true' : '')}
          />
        </>
      )}
    </>
  );
}
