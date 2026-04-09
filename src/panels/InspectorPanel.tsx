import { useMemo } from 'react';
import type { DocumentModel, DocumentNode, EditorTextField, FocusedMode, TopLevelWrapperVisibility } from '../api/editorApi';
import type { WrapperStyleField } from '../api/documentApi';
import { createInitialDocument } from '../model/defaults';
import type { PageId } from '../model/types/site';
import { buildNodeDebugInfo } from '../editor/debugInfo';
import { InspectorBlockList } from './InspectorBlockList';
import { MultiSelectInspector } from './MultiSelectInspector';
import type { InspectorActionHandlers, InspectorOrderState } from './inspector/types';
import { resolveInspectorBlocks } from './inspector/schema';
import type { BulkEditOperation, AlignmentAction, DistributionMode } from '../app/types';
import type { TextConversionMode } from '../api/textConversion';
import type { TextDocumentContent, TextSubtype } from '../model/types';

export {
  buildSizeFieldValue,
  convertRenderedPxToFontSizeValue,
  convertRenderedPxToUnitValue,
  convertStageFontSizeToInput,
  convertStageMeasurementToInput,
  describeSizeFieldValue,
  getSizeModeOptions,
  NumericUnitInlineField,
  normalizeAspectRatioExpression,
  SizeInlineField,
} from './InspectorControls';

export type InspectorPanelProps = {
  document?: DocumentModel;
  node: DocumentNode | null;
  selectedNodes?: DocumentNode[];
  focusedMode: FocusedMode;
  showOrderControls: boolean;
  canOrderBack: boolean;
  canOrderForward: boolean;
  canSendToBack: boolean;
  canBringToFront: boolean;
  orderBackShortcut: string;
  orderForwardShortcut: string;
  sendToBackShortcut: string;
  bringToFrontShortcut: string;
  canSectionBack: boolean;
  canSectionForward: boolean;
  onOrderBack: () => void;
  onOrderForward: () => void;
  onSendToBack: () => void;
  onBringToFront: () => void;
  onSectionBack: () => void;
  onSectionForward: () => void;
  activePageId?: PageId | null;
  onAlignSelection?: (mode: AlignmentAction) => void;
  onDistributeSelection?: (mode: DistributionMode) => void;
  onBulkEdit?: (operations: BulkEditOperation[]) => void;
  onTextChange: (field: EditorTextField, value: string) => void;
  onWrapperStyleChange: (field: WrapperStyleField, value: string) => void;
  onRectChange: (field: 'x' | 'y' | 'width' | 'height', value: string) => void;
  onSetNodeVisibility: (id: string, value: boolean) => void;
  onSetTopLevelWrapperVisibility: (
    pageId: PageId,
    nodeId: string,
    visibility: TopLevelWrapperVisibility,
    pageIds?: PageId[],
  ) => void;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
  onStickyEnabled: (enabled: boolean) => void;
  onStickyTarget: (target: 'self' | 'contentWrapper') => void;
  onStickyEdges: (edge: 'top' | 'bottom' | 'both') => void;
  onStickyOffset: (value: number) => void;
  onStickyOffsetTop: (value: number) => void;
  onStickyOffsetBottom: (value: number) => void;
  onStickyDurationMode: (value: 'auto' | 'custom') => void;
  onStickyDuration: (value: number) => void;
  onStickyDurationTop: (value: number) => void;
  onStickyDurationBottom: (value: number) => void;
  onStickyElevation: (value: boolean) => void;
  onStickyElevated: (value: boolean) => void;
  globalStickyElevation: boolean;
  onSwitchTextSubtype: (nodeId: string, subtype: TextSubtype, conversionMode?: TextConversionMode) => void;
  onSetTextDocumentContent?: (nodeId: string, content: TextDocumentContent) => void;
  onSetTextDocumentBlockGap?: (nodeId: string, value: number) => void;
  onMergeTextSelectionToRich?: (nodeIds: string[]) => void;
  onEnterFocusedMode: (mode: FocusedMode) => void;
  onActivateRichEdit?: (nodeId: string) => void;
  onOpenManageFonts?: () => void;
  showDebugInfo?: boolean;
};

export function InspectorPanel({
  document,
  node,
  selectedNodes = node ? [node] : [],
  focusedMode,
  showOrderControls,
  canOrderBack,
  canOrderForward,
  canSendToBack,
  canBringToFront,
  orderBackShortcut,
  orderForwardShortcut,
  sendToBackShortcut,
  bringToFrontShortcut,
  canSectionBack,
  canSectionForward,
  onOrderBack,
  onOrderForward,
  onSendToBack,
  onBringToFront,
  onSectionBack,
  onSectionForward,
  activePageId = null,
  onAlignSelection = () => undefined,
  onDistributeSelection = () => undefined,
  onBulkEdit = () => undefined,
  onTextChange,
  onWrapperStyleChange,
  onRectChange,
  onSetNodeVisibility,
  onSetTopLevelWrapperVisibility,
  onPromote,
  onDemote,
  onStickyEnabled,
  onStickyTarget,
  onStickyEdges,
  onStickyOffset,
  onStickyOffsetTop,
  onStickyOffsetBottom,
  onStickyDurationMode,
  onStickyDuration,
  onStickyDurationTop,
  onStickyDurationBottom,
  onStickyElevation,
  onStickyElevated,
  globalStickyElevation,
  onSwitchTextSubtype,
  onSetTextDocumentContent,
  onSetTextDocumentBlockGap,
  onMergeTextSelectionToRich,
  onEnterFocusedMode,
  onActivateRichEdit,
  onOpenManageFonts = () => undefined,
  showDebugInfo = false,
}: InspectorPanelProps) {
  const resolvedDocument = useMemo(
    () => document ?? createInitialDocument(),
    [document],
  );
  const resolvedActivePageId = activePageId ?? resolvedDocument.pages?.[0]?.id ?? null;
  const actions = useMemo<InspectorActionHandlers>(
    () => ({
      onTextChange,
      onWrapperStyleChange,
      onRectChange,
      onSetNodeVisibility,
      onSetTopLevelWrapperVisibility: (nodeId, visibility, pageIds) => {
        if (resolvedActivePageId) {
          onSetTopLevelWrapperVisibility(resolvedActivePageId, nodeId, visibility, pageIds);
        }
      },
      onPromote,
      onDemote,
      onStickyEnabled,
      onStickyTarget,
      onStickyEdges,
      onStickyOffset,
      onStickyOffsetTop,
      onStickyOffsetBottom,
      onStickyDurationMode,
      onStickyDuration,
      onStickyDurationTop,
      onStickyDurationBottom,
      onStickyElevation,
      onStickyElevated,
      onSwitchTextSubtype,
      onSetTextDocumentContent,
      onSetTextDocumentBlockGap,
      onMergeTextSelectionToRich,
      onEnterFocusedMode,
      onActivateRichEdit,
      onOpenManageFonts,
    }),
    [
      onTextChange, onWrapperStyleChange, onRectChange, onPromote, onDemote,
      onSetNodeVisibility, onSetTopLevelWrapperVisibility, resolvedActivePageId,
      onStickyEnabled, onStickyTarget, onStickyEdges, onStickyOffset,
      onStickyOffsetTop, onStickyOffsetBottom, onStickyDurationMode,
      onStickyDuration, onStickyDurationTop, onStickyDurationBottom,
      onStickyElevation, onStickyElevated, onSwitchTextSubtype, onSetTextDocumentContent,
      onSetTextDocumentBlockGap,
      onMergeTextSelectionToRich, onEnterFocusedMode, onActivateRichEdit, onOpenManageFonts,
    ],
  );
  const orderState = useMemo<InspectorOrderState>(
    () => ({
      showOrderControls,
      canOrderBack,
      canOrderForward,
      canSendToBack,
      canBringToFront,
      orderBackShortcut,
      orderForwardShortcut,
      sendToBackShortcut,
      bringToFrontShortcut,
      canSectionBack,
      canSectionForward,
      onOrderBack,
      onOrderForward,
      onSendToBack,
      onBringToFront,
      onSectionBack,
      onSectionForward,
    }),
    [
      showOrderControls, canOrderBack, canOrderForward, canSendToBack, canBringToFront,
      orderBackShortcut, orderForwardShortcut, sendToBackShortcut, bringToFrontShortcut,
      canSectionBack, canSectionForward, onOrderBack, onOrderForward, onSendToBack,
      onBringToFront, onSectionBack, onSectionForward,
    ],
  );
  const debugInfo = useMemo(
    () => {
      if (!showDebugInfo || !node || node.contentType === 'site') return null;
      return buildNodeDebugInfo(resolvedDocument, node, {
        documentRef: typeof window !== 'undefined' ? window.document : undefined,
      });
    },
    [showDebugInfo, node, resolvedDocument],
  );
  const debugInfoItems = useMemo(
    () => {
      if (!showDebugInfo) return [];
      const docRef = typeof window !== 'undefined' ? window.document : undefined;
      return selectedNodes
        .filter((n): n is Exclude<typeof n, { contentType: 'site' }> => n.contentType !== 'site')
        .map((n) => buildNodeDebugInfo(resolvedDocument, n, { documentRef: docRef }));
    },
    [showDebugInfo, selectedNodes, resolvedDocument],
  );
  const blocks = useMemo(
    () => resolveInspectorBlocks({ document: resolvedDocument, node, actions, orderState, focusedMode, globalStickyElevation, showDebugInfo, debugInfo }),
    [resolvedDocument, node, actions, orderState, focusedMode, globalStickyElevation, showDebugInfo, debugInfo],
  );

  if (selectedNodes.length > 1) {
    return (
      <MultiSelectInspector
        document={resolvedDocument}
        selectedNodes={selectedNodes}
        orderState={orderState}
        actions={actions}
        globalStickyElevation={globalStickyElevation}
        showDebugInfo={showDebugInfo}
        debugInfoItems={debugInfoItems}
        onAlignSelection={onAlignSelection}
        onDistributeSelection={onDistributeSelection}
        onBulkEdit={onBulkEdit}
      />
    );
  }

  return <InspectorBlockList blocks={blocks} />;
}
