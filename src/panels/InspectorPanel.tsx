import { useMemo } from 'react';
import type { DocumentModel, DocumentNode, EditorTextField, FocusedMode } from '../api/editorApi';
import type { WrapperStyleField } from '../api/documentApi';
import { createInitialDocument } from '../model/defaults';
import { InspectorBlockList } from './InspectorBlockList';
import { MultiSelectInspector } from './MultiSelectInspector';
import type { InspectorActionHandlers, InspectorOrderState } from './inspector/types';
import { resolveInspectorBlocks } from './inspector/schema';
import type { BulkEditOperation, AlignmentAction, DistributionMode } from '../app/types';

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
  onAlignSelection?: (mode: AlignmentAction) => void;
  onDistributeSelection?: (mode: DistributionMode) => void;
  onBulkEdit?: (operations: BulkEditOperation[]) => void;
  onTextChange: (field: EditorTextField, value: string) => void;
  onWrapperStyleChange: (field: WrapperStyleField, value: string) => void;
  onRectChange: (field: 'x' | 'y' | 'width' | 'height', value: string) => void;
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
  onEnterFocusedMode: (mode: FocusedMode) => void;
  onOpenManageFonts?: () => void;
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
  onAlignSelection = () => undefined,
  onDistributeSelection = () => undefined,
  onBulkEdit = () => undefined,
  onTextChange,
  onWrapperStyleChange,
  onRectChange,
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
  onEnterFocusedMode,
  onOpenManageFonts = () => undefined,
}: InspectorPanelProps) {
  const resolvedDocument = document ?? createInitialDocument();
  const actions: InspectorActionHandlers = {
    onTextChange,
    onWrapperStyleChange,
    onRectChange,
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
    onEnterFocusedMode,
    onOpenManageFonts,
  };
  const orderState: InspectorOrderState = {
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
  };
  if (selectedNodes.length > 1) {
    return (
      <MultiSelectInspector
        document={resolvedDocument}
        selectedNodes={selectedNodes}
        orderState={orderState}
        actions={actions}
        onAlignSelection={onAlignSelection}
        onDistributeSelection={onDistributeSelection}
        onBulkEdit={onBulkEdit}
      />
    );
  }
  const blocks = useMemo(
    () => resolveInspectorBlocks({ document: resolvedDocument, node, actions, orderState, focusedMode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions/orderState are rebuilt each render; key on stable identities
    [node?.id, focusedMode, resolvedDocument],
  );

  return <InspectorBlockList blocks={blocks} />;
}
