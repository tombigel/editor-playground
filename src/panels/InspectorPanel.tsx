import type { DocumentNode, EditorTextField, FocusedMode } from '../api/editorApi';
import type { WrapperStyleField } from '../api/documentApi';
import { InspectorBlockList } from './InspectorBlockList';
import type { InspectorActionHandlers, InspectorOrderState } from './inspector/types';
import { resolveInspectorBlocks } from './inspector/schema';

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
  node: DocumentNode | null;
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
};

export function InspectorPanel({
  node,
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
}: InspectorPanelProps) {
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
  const blocks = resolveInspectorBlocks({ node, actions, orderState, focusedMode });

  return <InspectorBlockList blocks={blocks} />;
}
