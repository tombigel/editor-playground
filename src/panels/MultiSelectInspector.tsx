import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignHorizontalDistributeEnd,
  AlignHorizontalDistributeStart,
  AlignLeft,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeEnd,
  AlignVerticalDistributeStart,
  AlignVerticalDistributeCenter,
  ArrowBigDown,
  ArrowBigDownDash,
  ArrowBigUp,
  ArrowBigUpDash,
  PilcrowLeft,
  PilcrowRight,
  Settings2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PopoverTooltip } from '@/components/ui/popover';
import { parseUnitValue } from '../api/documentApi';
import type { DocumentModel, DocumentNode } from '../api/editorApi';
import {
  BOLD_FONT_WEIGHT,
  DEFAULT_FONT_WEIGHT,
  buildFontPickerPreviewStylesheetHref,
  getDocumentFontFamily,
  isBoldFontWeight,
  listDocumentFontsForPicker,
  listFontWeightOptions,
  resolveNearestSupportedFontWeight,
} from '../api/fontApi';
import type { BulkEditOperation } from '../app/types';
import {
  FontPickerPopover,
  FontSizeField,
  HoverColorField,
  InspectorInlineRow,
  NumericUnitInlineField,
  NumberInput,
  OrderIconButton,
  ShadowControlGroup,
  TextStyleIconButton,
  readShadowFieldValues,
} from './InspectorControls';
import type { InspectorActionHandlers, InspectorOrderState } from './inspector/types';
import {
  SYSTEM_FONT_VALUE,
  TYPOGRAPHY_FONT_PICKER_WIDTH_PX,
  TYPOGRAPHY_FONT_ROW_WIDTH_PX,
  TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX,
  TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX,
  TYPOGRAPHY_SIZE_ROW_WIDTH_PX,
} from './inspector/contentSections/shared';
import {
  DEFAULT_SHADOW_BLUR_PX,
  DEFAULT_SHADOW_COLOR,
  DEFAULT_SHADOW_OFFSET_X_PX,
  DEFAULT_SHADOW_OFFSET_Y_PX,
  DEFAULT_SHADOW_SPREAD_PX,
} from '../model/styleDefaults';
import type { ShadowStyle } from '../model/types';
import { offsetsFromDistanceAndAngle } from './InspectorControls';
import { readRecentFontFamilies, writeRecentFontFamilies } from './inspector/fontPickerHelpers';
import { useFontPreviewStylesheet } from './inspector/useFontPreviewStylesheet';
import { MultiStickySection } from './MultiStickySection';
import { resolveSharedNumber, resolveSharedString } from './inspector/multiSelectHelpers';
import { DebugInfoSection } from './inspector/DebugInfoSection';
import type { NodeDebugInfo } from '../editor/types';

type Props = {
  document: DocumentModel;
  selectedNodes: DocumentNode[];
  orderState: InspectorOrderState;
  actions: InspectorActionHandlers;
  globalStickyElevation: boolean;
  showDebugInfo?: boolean;
  debugInfoItems?: NodeDebugInfo[];
  onAlignSelection: (mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => void;
  onDistributeSelection: (mode: 'horizontal' | 'vertical' | 'left' | 'right' | 'top' | 'bottom') => void;
  onBulkEdit: (operations: BulkEditOperation[]) => void;
};

export function MultiSelectInspector({
  document,
  selectedNodes,
  orderState,
  actions,
  globalStickyElevation,
  showDebugInfo = false,
  debugInfoItems = [],
  onAlignSelection,
  onDistributeSelection,
  onBulkEdit,
}: Props) {
  const textNodes = selectedNodes.filter(isTypographyNode);
  const filterShadowNodes = selectedNodes.filter((node): node is Extract<DocumentNode, { type: 'leaf'; role: 'text' | 'link' }> =>
    node.type === 'leaf' && (node.role === 'text' || node.role === 'link'),
  );
  const backgroundWrapperIds = selectedNodes.flatMap((node) =>
    node.type === 'wrapper' && node.role === 'container' ? [node.id] : [],
  );
  const backgroundLeafIds = selectedNodes.flatMap((node) =>
    node.type === 'leaf' && node.role === 'button' ? [node.id] : [],
  );
  const radiusWrapperIds = backgroundWrapperIds;
  const radiusLeafIds = selectedNodes.flatMap((node) =>
    node.type === 'leaf' && (node.role === 'button' || node.role === 'image') ? [node.id] : [],
  );
  const boxShadowWrapperIds = backgroundWrapperIds;
  const boxShadowLeafIds = radiusLeafIds;
  const stickyNodes = selectedNodes.filter((node): node is Exclude<DocumentNode, { type: 'site' }> => node.type !== 'site');
  const canAlign = canAlignSelection(selectedNodes);
  const canDistribute = canAlign && selectedNodes.length >= 3;

  const fontSizeValues = textNodes.map((node) => node.style?.fontSize?.raw ?? '18px');
  const fontSizeState = resolveSharedString(fontSizeValues);
  const fontSizeUnitState = resolveSharedParsedUnit(fontSizeValues);
  const lineHeightState = resolveSharedNumber(textNodes.map((node) => node.style?.lineHeight ?? 1.4));
  const fontFamilyState = resolveSharedString(textNodes.map((node) => node.style?.fontFamily ?? SYSTEM_FONT_VALUE));
  const fontWeightState = resolveSharedNumber(textNodes.map((node) => node.style?.fontWeight ?? DEFAULT_FONT_WEIGHT));
  const fontStyleState = resolveSharedString(textNodes.map((node) => node.style?.fontStyle ?? 'normal'));
  const decorationState = resolveSharedString(textNodes.map((node) => node.style?.textDecorationLine ?? 'none'));
  const textAlignState = resolveSharedString(textNodes.map((node) => node.style?.textAlign ?? 'left'));
  const directionState = resolveSharedString(textNodes.map((node) => node.style?.direction ?? 'ltr'));
  const foregroundState = resolveSharedString(textNodes.map((node) => node.style?.color ?? ''));
  const filterShadowState = resolveSharedShadow(filterShadowNodes.map((node) => node.style));
  const backgroundState = resolveSharedString(
    selectedNodes.flatMap((node) => {
      if (node.type === 'wrapper' && node.role === 'container') {
        return [node.style.background ?? ''];
      }
      if (node.type === 'leaf' && node.role === 'button') {
        return [node.style?.background ?? ''];
      }
      return [];
    }),
  );
  const radiusValues = selectedNodes.flatMap((node) => {
    if (node.type === 'wrapper' && node.role === 'container') {
      return [node.style.borderRadius?.raw ?? ''];
    }
    if (node.type === 'leaf' && (node.role === 'button' || node.role === 'image')) {
      return [node.style?.borderRadius?.raw ?? ''];
    }
    return [];
  });
  const radiusState = resolveSharedString(radiusValues);
  const radiusUnitState = resolveSharedParsedUnit(radiusValues);
  const boxShadowState = resolveSharedShadow(
    selectedNodes.flatMap((node) => {
      if (node.type === 'wrapper' && node.role === 'container') {
        return [node.style];
      }
      if (node.type === 'leaf' && (node.role === 'button' || node.role === 'image')) {
        return [node.style];
      }
      return [];
    }),
  );
  const documentFonts = listDocumentFontsForPicker(document);

  // Lifted state: recent fonts and preview stylesheet for multi-select font picker
  const [recentFamilyNames, setRecentFamilyNames] = useState<string[]>(() => readRecentFontFamilies());
  const hasTypographySection = textNodes.length >= 2;
  const selectedFamily = fontFamilyState.mixed ? undefined : getDocumentFontFamily(document, fontFamilyState.value);
  const activeWeightOptions = listFontWeightOptions(selectedFamily, fontWeightState.value ?? DEFAULT_FONT_WEIGHT);
  const fontPreviewHref = useMemo(
    () => hasTypographySection
      ? buildFontPickerPreviewStylesheetHref({
          families: documentFonts,
          activeFamilyName: fontFamilyState.mixed ? undefined : fontFamilyState.value === SYSTEM_FONT_VALUE ? undefined : fontFamilyState.value,
          activeWeights: activeWeightOptions.map((option) => option.value),
        })
      : null,
    [activeWeightOptions, documentFonts, fontFamilyState, hasTypographySection],
  );
  useFontPreviewStylesheet(fontPreviewHref);

  const handleRecentFamiliesChange = (families: string[]) => {
    setRecentFamilyNames(families);
    writeRecentFontFamilies(families);
  };

  return (
    <div className="editor-scrollbar h-full overflow-auto">
      <div className="space-y-3 p-3">
        {showDebugInfo && debugInfoItems.length > 0 && (
          <DebugInfoSection items={debugInfoItems} />
        )}
        <Card className="editor-border-subtle rounded-lg shadow-none">
          <CardHeader className="px-3 pt-3 pb-1">
            <CardTitle className="text-xs">Layout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-medium">Align</Label>
              <div className="flex flex-wrap gap-1">
                <TextStyleIconButton label="Align left" active={false} disabled={!canAlign} onClick={() => onAlignSelection('left')}>
                  <AlignStartVertical className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Align center" active={false} disabled={!canAlign} onClick={() => onAlignSelection('center-x')}>
                  <AlignCenterVertical className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Align right" active={false} disabled={!canAlign} onClick={() => onAlignSelection('right')}>
                  <AlignEndVertical className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Align top" active={false} disabled={!canAlign} onClick={() => onAlignSelection('top')}>
                  <AlignStartHorizontal className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Align middle" active={false} disabled={!canAlign} onClick={() => onAlignSelection('center-y')}>
                  <AlignCenterHorizontal className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Align bottom" active={false} disabled={!canAlign} onClick={() => onAlignSelection('bottom')}>
                  <AlignEndHorizontal className="h-4 w-4" />
                </TextStyleIconButton>
              </div>
              <div className="editor-text-muted text-[11px]">First selected node is the alignment anchor.</div>
              {!canAlign ? <div className="editor-text-muted text-[11px]">Align works on sibling movable nodes with the first selected node as the anchor.</div> : null}
            </div>

            <div className="space-y-0.5">
              <Label className="text-[11px] font-medium">Distribute</Label>
              <div className="flex flex-wrap gap-1">
                <TextStyleIconButton label="Distribute horizontal" active={false} disabled={!canDistribute} onClick={() => onDistributeSelection('horizontal')}>
                  <AlignHorizontalDistributeCenter className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Distribute vertical" active={false} disabled={!canDistribute} onClick={() => onDistributeSelection('vertical')}>
                  <AlignVerticalDistributeCenter className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Distribute left" active={false} disabled={!canDistribute} onClick={() => onDistributeSelection('left')}>
                  <AlignHorizontalDistributeStart className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Distribute right" active={false} disabled={!canDistribute} onClick={() => onDistributeSelection('right')}>
                  <AlignHorizontalDistributeEnd className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Distribute top" active={false} disabled={!canDistribute} onClick={() => onDistributeSelection('top')}>
                  <AlignVerticalDistributeStart className="h-4 w-4" />
                </TextStyleIconButton>
                <TextStyleIconButton label="Distribute bottom" active={false} disabled={!canDistribute} onClick={() => onDistributeSelection('bottom')}>
                  <AlignVerticalDistributeEnd className="h-4 w-4" />
                </TextStyleIconButton>
              </div>
              {!canDistribute ? <div className="editor-text-muted text-[11px]">Distribution needs at least 3 selected nodes in one valid layout context.</div> : null}
            </div>

            {orderState.showOrderControls ? (
              <div className="space-y-0.5">
                <Label className="text-[11px] font-medium">Reorder</Label>
                <div className="flex gap-1.5">
                  <OrderIconButton label="Position Forward" shortcut={orderState.orderForwardShortcut} onClick={orderState.onOrderForward} disabled={!orderState.canOrderForward}>
                    <ArrowBigUp className="h-4 w-4" />
                  </OrderIconButton>
                  <OrderIconButton label="Bring to Front" shortcut={orderState.bringToFrontShortcut} onClick={orderState.onBringToFront} disabled={!orderState.canBringToFront}>
                    <ArrowBigUpDash className="h-4 w-4" />
                  </OrderIconButton>
                  <OrderIconButton label="Position Backward" shortcut={orderState.orderBackShortcut} onClick={orderState.onOrderBack} disabled={!orderState.canOrderBack}>
                    <ArrowBigDown className="h-4 w-4" />
                  </OrderIconButton>
                  <OrderIconButton label="Send to Back" shortcut={orderState.sendToBackShortcut} onClick={orderState.onSendToBack} disabled={!orderState.canSendToBack}>
                    <ArrowBigDownDash className="h-4 w-4" />
                  </OrderIconButton>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {stickyNodes.length >= 2 ? <MultiStickySection selectedNodes={stickyNodes} actions={actions} focusedMode={null} globalStickyElevation={globalStickyElevation} /> : null}

        {textNodes.length >= 2 ? (
          <Card className="editor-border-subtle rounded-lg shadow-none">
            <CardHeader className="px-3 pt-3 pb-1">
            <CardTitle className="text-xs">Typography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
            <InspectorInlineRow label="Font" controlWidth={`${TYPOGRAPHY_FONT_ROW_WIDTH_PX}px`} controlClassName="gap-1">
                <div className="shrink-0" style={{ width: `${TYPOGRAPHY_FONT_PICKER_WIDTH_PX}px` }}>
                  <FontPickerPopover
                    familyValue={fontFamilyState.value}
                    weightValue={fontWeightState.value ?? DEFAULT_FONT_WEIGHT}
                    families={documentFonts}
                    systemOptionValue={SYSTEM_FONT_VALUE}
                    mixedFamily={fontFamilyState.mixed}
                    mixedWeight={fontWeightState.mixed}
                    onFamilyChange={(value) => actions.onTextChange('fontFamily', value === SYSTEM_FONT_VALUE ? '' : value)}
                    onWeightChange={(value) => actions.onTextChange('fontWeight', value)}
                    className="w-full"
                    recentFamilyNames={recentFamilyNames}
                    onRecentFamiliesChange={handleRecentFamiliesChange}
                    previewStylesheetHref={fontPreviewHref}
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
                    onClick={actions.onOpenManageFonts}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTooltip>
            </InspectorInlineRow>
              <InspectorInlineRow label="Size" controlWidth={`${TYPOGRAPHY_SIZE_ROW_WIDTH_PX}px`}>
                <div className="grid w-full items-center gap-1" style={{ gridTemplateColumns: `${TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX}px ${TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX}px` }}>
                  <div className="shrink-0" style={{ width: `${TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX}px` }}>
                    <FontSizeField
                      nodeId={textNodes[0]?.id ?? ''}
                      value={fontSizeState.value}
                      onChange={(value) => actions.onTextChange('fontSize', value)}
                      mixed={fontSizeState.mixed}
                      mixedUnit={fontSizeUnitState.mixed}
                    />
                  </div>
                  <div className="shrink-0" style={{ width: `${TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX}px` }}>
                    <NumberInput
                      value={lineHeightState.value ?? 1.4}
                      min={0.1}
                      max={4}
                      step={0.1}
                      mixed={lineHeightState.mixed}
                      onChange={(value) => actions.onTextChange('lineHeight', String(value))}
                    />
                  </div>
                </div>
              </InspectorInlineRow>
              <InspectorInlineRow label="Style" controlClassName="gap-1">
                  <TextStyleIconButton
                    label="Bold"
                    active={Boolean(fontWeightState.value != null && isBoldFontWeight(fontWeightState.value) && !fontWeightState.mixed)}
                    mixed={fontWeightState.mixed}
                    onClick={() =>
                      onBulkEdit(
                        textNodes.map((node) => ({
                          kind: 'text',
                          targetIds: [node.id],
                          field: 'fontWeight',
                          value: String(
                            resolveNearestSupportedFontWeight(
                              textNodes.every((entry) => isBoldFontWeight(entry.style?.fontWeight))
                                ? DEFAULT_FONT_WEIGHT
                                : BOLD_FONT_WEIGHT,
                              node.style?.fontFamily
                                ? getDocumentFontFamily(document, node.style.fontFamily)
                                : undefined,
                            ),
                          ),
                        })),
                      )
                    }
                  >
                    <span className="font-black tracking-[-0.02em] no-underline decoration-transparent">B</span>
                  </TextStyleIconButton>
                  <TextStyleIconButton label="Italic" active={fontStyleState.value === 'italic' && !fontStyleState.mixed} mixed={fontStyleState.mixed} onClick={() => actions.onTextChange('fontStyle', fontStyleState.value === 'italic' && !fontStyleState.mixed ? 'normal' : 'italic')}>
                    <span className="font-medium italic">I</span>
                  </TextStyleIconButton>
                  <TextStyleIconButton label="Underline" active={hasUnderline(decorationState.value) && !decorationState.mixed} mixed={decorationState.mixed} onClick={() => actions.onTextChange('textDecorationLine', toggleTextDecoration(decorationState.value, 'underline'))}>
                    <span className="underline">U</span>
                  </TextStyleIconButton>
                  <TextStyleIconButton label="Strikethrough" active={hasLineThrough(decorationState.value) && !decorationState.mixed} mixed={decorationState.mixed} onClick={() => actions.onTextChange('textDecorationLine', toggleTextDecoration(decorationState.value, 'line-through'))}>
                    <span className="line-through">S</span>
                  </TextStyleIconButton>
              </InspectorInlineRow>
              <InspectorInlineRow label="Align" controlClassName="gap-1">
                  <TextStyleIconButton label="Align left" active={textAlignState.value === 'left' && !textAlignState.mixed} mixed={textAlignState.mixed} onClick={() => actions.onTextChange('textAlign', 'left')}>
                    <AlignLeft className="h-4 w-4" />
                  </TextStyleIconButton>
                  <TextStyleIconButton label="Align center" active={textAlignState.value === 'center' && !textAlignState.mixed} mixed={textAlignState.mixed} onClick={() => actions.onTextChange('textAlign', 'center')}>
                    <AlignCenter className="h-4 w-4" />
                  </TextStyleIconButton>
                  <TextStyleIconButton label="Align right" active={textAlignState.value === 'right' && !textAlignState.mixed} mixed={textAlignState.mixed} onClick={() => actions.onTextChange('textAlign', 'right')}>
                    <AlignRight className="h-4 w-4" />
                  </TextStyleIconButton>
                  <TextStyleIconButton label="Text direction" active={false} mixed={directionState.mixed} onClick={() => actions.onTextChange('direction', directionState.value === 'rtl' && !directionState.mixed ? 'ltr' : 'rtl')}>
                    {directionState.value === 'rtl' && !directionState.mixed ? <PilcrowLeft className="h-4 w-4" /> : <PilcrowRight className="h-4 w-4" />}
                  </TextStyleIconButton>
              </InspectorInlineRow>
            </CardContent>
          </Card>
        ) : null}

        {textNodes.length >= 2 || filterShadowNodes.length >= 2 ? (
          <Card className="editor-border-subtle rounded-lg shadow-none">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-xs">Text Design</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
              {textNodes.length >= 2 ? (
                <InspectorInlineRow label="Color" controlClassName="gap-2">
                    <HoverColorField value={foregroundState.value || undefined} mixed={foregroundState.mixed} onChange={(value) => actions.onTextChange('color', value)} ariaLabel="Text color" fallback={DEFAULT_SHADOW_COLOR} />
                  </InspectorInlineRow>
              ) : null}
              {filterShadowNodes.length >= 2 ? (
                <div className="space-y-1.5">
                  <ShadowControlGroup
                    color={filterShadowState.color}
                    blur={filterShadowState.blur}
                    distance={filterShadowState.distance}
                    angle={filterShadowState.angle}
                    colorFallback={DEFAULT_SHADOW_COLOR}
                    mixed={filterShadowState.mixed}
                    onColorChange={(value) => onBulkEdit(buildLeafShadowOperations(filterShadowNodes.map((node) => node.id), { color: value }, filterShadowState))}
                    onBlurChange={(value) => onBulkEdit(buildLeafShadowOperations(filterShadowNodes.map((node) => node.id), { blur: value }, filterShadowState))}
                    onDistanceChange={(value) => onBulkEdit(buildLeafShadowOperations(filterShadowNodes.map((node) => node.id), { distance: value }, filterShadowState))}
                    onAngleChange={(value) => onBulkEdit(buildLeafShadowOperations(filterShadowNodes.map((node) => node.id), { angle: value }, filterShadowState))}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {backgroundWrapperIds.length + backgroundLeafIds.length >= 2 || radiusWrapperIds.length + radiusLeafIds.length >= 2 || boxShadowWrapperIds.length + boxShadowLeafIds.length >= 2 ? (
          <Card className="editor-border-subtle rounded-lg shadow-none">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-xs">Surface Design</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
              {backgroundWrapperIds.length + backgroundLeafIds.length >= 2 ? (
                <InspectorInlineRow label="Background" controlClassName="gap-2">
                    <HoverColorField
                      value={backgroundState.value || undefined}
                      mixed={backgroundState.mixed}
                      onChange={(value) =>
                        onBulkEdit([
                          ...(backgroundLeafIds.length > 0
                            ? ([{ kind: 'text', targetIds: backgroundLeafIds, field: 'background' as const, value }] satisfies BulkEditOperation[])
                            : []),
                          ...(backgroundWrapperIds.length > 0
                            ? ([{ kind: 'wrapperStyle', targetIds: backgroundWrapperIds, field: 'background' as const, value }] satisfies BulkEditOperation[])
                            : []),
                        ])
                      }
                      ariaLabel="Background color"
                    />
                  </InspectorInlineRow>
              ) : null}

              {radiusWrapperIds.length + radiusLeafIds.length >= 2 ? (
                <InspectorInlineRow label="Radius" controlWidth="120px">
                    <NumericUnitInlineField
                      value={radiusState.value}
                      units={['px', '%']}
                      onChange={(value) =>
                        onBulkEdit([
                          ...(radiusLeafIds.length > 0
                            ? ([{ kind: 'text', targetIds: radiusLeafIds, field: 'borderRadius' as const, value }] satisfies BulkEditOperation[])
                            : []),
                          ...(radiusWrapperIds.length > 0
                            ? ([{ kind: 'wrapperStyle', targetIds: radiusWrapperIds, field: 'borderRadius' as const, value }] satisfies BulkEditOperation[])
                            : []),
                        ])
                      }
                      placeholder={radiusState.mixed ? '-' : '16'}
                      mixed={radiusState.mixed}
                      mixedUnit={radiusUnitState.mixed}
                      min={0}
                    />
                  </InspectorInlineRow>
              ) : null}

              {boxShadowWrapperIds.length + boxShadowLeafIds.length >= 2 ? (
                <div className="space-y-1.5">
                  <ShadowControlGroup
                    color={boxShadowState.color}
                    blur={boxShadowState.blur}
                    spread={boxShadowState.spread}
                    distance={boxShadowState.distance}
                    angle={boxShadowState.angle}
                    colorFallback={DEFAULT_SHADOW_COLOR}
                    supportsSpread
                    mixed={boxShadowState.mixed}
                    onColorChange={(value) => onBulkEdit(buildMixedShadowOperations(boxShadowLeafIds, boxShadowWrapperIds, { color: value }, boxShadowState))}
                    onBlurChange={(value) => onBulkEdit(buildMixedShadowOperations(boxShadowLeafIds, boxShadowWrapperIds, { blur: value }, boxShadowState))}
                    onSpreadChange={(value) => onBulkEdit(buildMixedShadowOperations(boxShadowLeafIds, boxShadowWrapperIds, { spread: value }, boxShadowState))}
                    onDistanceChange={(value) => onBulkEdit(buildMixedShadowOperations(boxShadowLeafIds, boxShadowWrapperIds, { distance: value }, boxShadowState))}
                    onAngleChange={(value) => onBulkEdit(buildMixedShadowOperations(boxShadowLeafIds, boxShadowWrapperIds, { angle: value }, boxShadowState))}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

      </div>
    </div>
  );
}

function isTypographyNode(node: DocumentNode): node is Extract<DocumentNode, { type: 'leaf'; role: 'text' | 'link' | 'button' }> {
  return node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button');
}

function canAlignSelection(selectedNodes: DocumentNode[]) {
  if (selectedNodes.length < 2) {
    return false;
  }

  const [firstNode, ...restNodes] = selectedNodes;
  return (
    firstNode.type !== 'site' &&
    isMovableAlignmentNode(firstNode) &&
    restNodes.every((node) => node.type !== 'site' && isMovableAlignmentNode(node) && node.parentId === firstNode.parentId)
  );
}

function isMovableAlignmentNode(node: DocumentNode) {
  return node.type === 'leaf' || (node.type === 'wrapper' && node.role === 'container');
}

function resolveSharedParsedUnit(values: string[]) {
  const parsedUnits = values.map((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    try {
      return parseUnitValue(trimmed).parsed.unit;
    } catch {
      return '';
    }
  });

  return resolveSharedString(parsedUnits);
}

function resolveSharedShadow(styles: Array<ShadowStyle | undefined>) {
  const values = styles.map((style) =>
    readShadowFieldValues(style, {
      color: DEFAULT_SHADOW_COLOR,
      blur: DEFAULT_SHADOW_BLUR_PX,
      spread: DEFAULT_SHADOW_SPREAD_PX,
      distance: Math.round(Math.sqrt(DEFAULT_SHADOW_OFFSET_X_PX ** 2 + DEFAULT_SHADOW_OFFSET_Y_PX ** 2)),
      angle: Math.round((Math.atan2(DEFAULT_SHADOW_OFFSET_Y_PX, DEFAULT_SHADOW_OFFSET_X_PX) * 180) / Math.PI),
    }),
  );

  return {
    color: values[0]?.color ?? DEFAULT_SHADOW_COLOR,
    blur: values[0]?.blur ?? DEFAULT_SHADOW_BLUR_PX,
    spread: values[0]?.spread ?? DEFAULT_SHADOW_SPREAD_PX,
    distance: values[0]?.distance ?? 0,
    angle: values[0]?.angle ?? 0,
    mixed: values.some((value) => JSON.stringify(value) !== JSON.stringify(values[0])),
  };
}

function hasUnderline(value: string) {
  return value.includes('underline');
}

function hasLineThrough(value: string) {
  return value.includes('line-through');
}

function toggleTextDecoration(value: string, target: 'underline' | 'line-through') {
  const nextUnderline = target === 'underline' ? !hasUnderline(value) : hasUnderline(value);
  const nextLineThrough = target === 'line-through' ? !hasLineThrough(value) : hasLineThrough(value);
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

function buildLeafShadowOperations(
  targetIds: string[],
  patch: Partial<{ color: string; blur: number; distance: number; angle: number }>,
  current: { color: string; blur: number; distance: number; angle: number },
): BulkEditOperation[] {
  const next = {
    color: patch.color ?? current.color,
    blur: patch.blur ?? current.blur,
    distance: patch.distance ?? current.distance,
    angle: patch.angle ?? current.angle,
  };
  const offsets = offsetsFromDistanceAndAngle(next.distance, next.angle);
  return [
    { kind: 'text', targetIds, field: 'shadowColor', value: next.color },
    { kind: 'text', targetIds, field: 'shadowBlur', value: String(next.blur) },
    { kind: 'text', targetIds, field: 'shadowOffsetX', value: String(offsets.offsetX) },
    { kind: 'text', targetIds, field: 'shadowOffsetY', value: String(offsets.offsetY) },
  ];
}

function buildMixedShadowOperations(
  leafTargetIds: string[],
  wrapperTargetIds: string[],
  patch: Partial<{ color: string; blur: number; spread: number; distance: number; angle: number }>,
  current: { color: string; blur: number; spread: number; distance: number; angle: number },
): BulkEditOperation[] {
  const next = {
    color: patch.color ?? current.color,
    blur: patch.blur ?? current.blur,
    spread: patch.spread ?? current.spread,
    distance: patch.distance ?? current.distance,
    angle: patch.angle ?? current.angle,
  };
  const offsets = offsetsFromDistanceAndAngle(next.distance, next.angle);
  return [
    ...(leafTargetIds.length > 0
      ? ([
          { kind: 'text', targetIds: leafTargetIds, field: 'shadowColor' as const, value: next.color },
          { kind: 'text', targetIds: leafTargetIds, field: 'shadowBlur' as const, value: String(next.blur) },
          { kind: 'text', targetIds: leafTargetIds, field: 'shadowSpread' as const, value: String(next.spread) },
          { kind: 'text', targetIds: leafTargetIds, field: 'shadowOffsetX' as const, value: String(offsets.offsetX) },
          { kind: 'text', targetIds: leafTargetIds, field: 'shadowOffsetY' as const, value: String(offsets.offsetY) },
        ] satisfies BulkEditOperation[])
      : []),
    ...(wrapperTargetIds.length > 0
      ? ([
          { kind: 'wrapperStyle', targetIds: wrapperTargetIds, field: 'shadowColor' as const, value: next.color },
          { kind: 'wrapperStyle', targetIds: wrapperTargetIds, field: 'shadowBlur' as const, value: String(next.blur) },
          { kind: 'wrapperStyle', targetIds: wrapperTargetIds, field: 'shadowSpread' as const, value: String(next.spread) },
          { kind: 'wrapperStyle', targetIds: wrapperTargetIds, field: 'shadowOffsetX' as const, value: String(offsets.offsetX) },
          { kind: 'wrapperStyle', targetIds: wrapperTargetIds, field: 'shadowOffsetY' as const, value: String(offsets.offsetY) },
        ] satisfies BulkEditOperation[])
      : []),
  ];
}
