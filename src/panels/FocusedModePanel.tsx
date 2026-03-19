import { useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { SquareArrowRightEnter } from 'lucide-react';
import type { FocusedMode } from '../api/editorApi';
import { getFocusedModeLabel } from '../editor/focusedModes';
import { createInitialDocument } from '../model/defaults';
import { InspectorBlockList } from './InspectorBlockList';
import { MultiStickySection } from './MultiStickySection';
import { resolveFocusedModeBlocks } from './focusedModes/schema';
import type { InspectorPanelProps } from './InspectorPanel';
import type { InspectorActionHandlers, InspectorOrderState } from './inspector/types';

type Props = Pick<
  InspectorPanelProps,
  | 'document'
  | 'node'
  | 'selectedNodes'
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
  | 'onOpenManageFonts'
> & {
  mode: Exclude<FocusedMode, null>;
  onExitFocusedMode: () => void;
};

export function FocusedModePanel({
  document,
  node,
  selectedNodes = [],
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
  onOpenManageFonts,
  mode,
  onExitFocusedMode,
}: Props) {
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
  const title = node?.name ?? 'No component selected';
  const roleLabel = node ? (node.type === 'site' ? 'site' : node.role) : null;
  const isMultiSticky = mode === 'sticky' && selectedNodes.length > 1;
  const modeLabel = getFocusedModeLabel(mode);
  const dialogLabel = `${modeLabel} focus mode`;
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onExitFocusedMode();
      }
    },
    [onExitFocusedMode],
  );
  const headerContent =
    isMultiSticky ? (
      <div className="min-w-0">
        <div className="editor-text-strong text-sm font-medium">{modeLabel}</div>
        <div className="editor-text-muted mt-1 flex min-w-0 items-center gap-2 text-xs">
          <div className="truncate">{selectedNodes.length} selected</div>
        </div>
      </div>
    ) : node ? (
      <div className="min-w-0">
        <div className="editor-text-strong text-sm font-medium">{modeLabel}</div>
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

  if (isMultiSticky) {
    return (
      <div role="dialog" aria-label={dialogLabel} onKeyDown={handleKeyDown} className="pointer-events-auto" style={{ filter: 'drop-shadow(0 18px 40px rgba(18, 32, 51, 0.16))' }}>
        <div className="editor-bg-surface editor-border-subtle editor-scrollbar max-h-[min(72vh,680px)] overflow-auto rounded-xl border">
          <div className="space-y-3">
            <MultiStickySection
              selectedNodes={selectedNodes}
              actions={actions}
              focusedMode={focusedMode}
              headerContent={headerContent}
              contentClassName="space-y-3 px-3 pt-1.5 pb-5"
              headerAction={
                {
                  ariaLabel: 'Close sticky focus mode',
                  icon: <SquareArrowRightEnter className="h-3.5 w-3.5" />,
                  onClick: onExitFocusedMode,
                }
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const blocks = resolveFocusedModeBlocks(
    mode,
    {
      document: resolvedDocument,
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
    <div role="dialog" aria-label={dialogLabel} onKeyDown={handleKeyDown} className="pointer-events-auto" style={{ filter: 'drop-shadow(0 18px 40px rgba(18, 32, 51, 0.16))' }}>
      <div className="editor-bg-surface editor-border-subtle editor-scrollbar max-h-[min(72vh,680px)] overflow-auto rounded-xl border">
        <InspectorBlockList blocks={blocks} compact scrollable={false} />
      </div>
    </div>
  );
}
