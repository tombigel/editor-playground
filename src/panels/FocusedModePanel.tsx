import type { FocusedMode } from '../api/editorApi';
import { InspectorBlockList } from './InspectorBlockList';
import { resolveFocusedModeBlocks } from './focusedModes/schema';
import type { InspectorPanelProps } from './InspectorPanel';
import type { InspectorActionHandlers, InspectorOrderState } from './inspector/types';

type Props = Pick<
  InspectorPanelProps,
  | 'node'
  | 'focusedMode'
  | 'showOrderControls'
  | 'canOrderBack'
  | 'canOrderForward'
  | 'canSendToBack'
  | 'canBringToFront'
  | 'orderBackShortcut'
  | 'orderForwardShortcut'
  | 'sendToBackShortcut'
  | 'bringToFrontShortcut'
  | 'canSectionBack'
  | 'canSectionForward'
  | 'onOrderBack'
  | 'onOrderForward'
  | 'onSendToBack'
  | 'onBringToFront'
  | 'onSectionBack'
  | 'onSectionForward'
  | 'onTextChange'
  | 'onWrapperStyleChange'
  | 'onRectChange'
  | 'onPromote'
  | 'onDemote'
  | 'onStickyEnabled'
  | 'onStickyTarget'
  | 'onStickyEdges'
  | 'onStickyOffset'
  | 'onStickyOffsetTop'
  | 'onStickyOffsetBottom'
  | 'onStickyDurationMode'
  | 'onStickyDuration'
  | 'onStickyDurationTop'
  | 'onStickyDurationBottom'
  | 'onEnterFocusedMode'
> & {
  mode: Exclude<FocusedMode, null>;
  onExitFocusedMode: () => void;
};

export function FocusedModePanel({
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
  mode,
  onExitFocusedMode,
}: Props) {
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
  const title = node?.type === 'site' ? 'No component selected' : node?.name ?? 'No component selected';
  const roleLabel = node && node.type !== 'site' ? node.role : null;
  const headerContent =
    node && node.type !== 'site' ? (
      <div className="min-w-0">
        <div className="editor-text-strong text-sm font-medium">Sticky</div>
        <div className="editor-text-muted mt-1 flex min-w-0 items-center gap-2 text-xs">
          <div className="truncate">{title}</div>
          {roleLabel ? (
            <span className="editor-pill-subtle shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium">
              {roleLabel}
            </span>
          ) : null}
        </div>
      </div>
    ) : undefined;
  const blocks = resolveFocusedModeBlocks(
    mode,
    {
      node,
      actions,
      orderState,
      focusedMode,
    },
    {
      headerContent,
      onExitFocusedMode,
    },
  );

  return (
    <div className="pointer-events-auto" style={{ filter: 'drop-shadow(0 18px 40px rgba(18, 32, 51, 0.16))' }}>
      <div className="max-h-[min(72vh,680px)] overflow-auto">
        <InspectorBlockList blocks={blocks} compact scrollable={false} />
      </div>
    </div>
  );
}
