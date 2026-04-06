import { useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { SquareArrowRightEnter } from 'lucide-react';
import type { PointerEventHandler } from 'react';
import type { FocusedMode } from '../api/editorApi';
import { isSiteNode, isContainerNode, isLeafNode } from '../model/types';
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
  | 'activePageId'
  | 'onTextChange'
  | 'onWrapperStyleChange'
  | 'onRectChange'
  | 'onSetNodeVisibility'
  | 'onSetTopLevelWrapperVisibility'
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
  | 'onStickyElevation'
  | 'onStickyElevated'
  | 'globalStickyElevation'
  | 'onEnterFocusedMode'
  | 'onOpenManageFonts'
> & {
  mode: Exclude<FocusedMode, null>;
  onExitFocusedMode: () => void;
  onHeaderDragPointerDown?: PointerEventHandler<HTMLDivElement>;
  dragging?: boolean;
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
  activePageId,
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
  onEnterFocusedMode,
  onOpenManageFonts,
  mode,
  onExitFocusedMode,
  onHeaderDragPointerDown,
  dragging = false,
}: Props) {
  const resolvedDocument = document ?? createInitialDocument();
  const resolvedActivePageId = activePageId ?? resolvedDocument.pages?.[0]?.id ?? null;
  const actions: InspectorActionHandlers = {
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
  const roleLabel = node ? (isSiteNode(node) ? 'site' : (isContainerNode(node) || isLeafNode(node) ? node.subtype : null)) : null;
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
      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: drag grip zone — no semantic element for drag handles
      <div
        className={dragging ? 'min-w-0 cursor-grabbing select-none touch-none' : 'min-w-0 cursor-grab touch-none'}
        aria-label={onHeaderDragPointerDown ? 'Drag focused panel' : undefined}
        data-focused-panel-drag-zone={onHeaderDragPointerDown ? 'true' : undefined}
        data-dragging={onHeaderDragPointerDown ? (dragging ? 'true' : 'false') : undefined}
        onPointerDown={onHeaderDragPointerDown}
      >
        <div className="editor-text-strong text-sm font-medium">{modeLabel}</div>
        <div className="editor-text-muted mt-1 flex min-w-0 items-center gap-2 text-xs">
          <div className="truncate">{selectedNodes.length} selected</div>
        </div>
      </div>
    ) : node ? (
      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: drag grip zone — no semantic element for drag handles
      <div
        className={dragging ? 'min-w-0 cursor-grabbing select-none touch-none' : 'min-w-0 cursor-grab touch-none'}
        aria-label={onHeaderDragPointerDown ? 'Drag focused panel' : undefined}
        data-focused-panel-drag-zone={onHeaderDragPointerDown ? 'true' : undefined}
        data-dragging={onHeaderDragPointerDown ? (dragging ? 'true' : 'false') : undefined}
        onPointerDown={onHeaderDragPointerDown}
      >
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
      <div role="dialog" aria-label={dialogLabel} onKeyDown={handleKeyDown} className="editor-focused-panel pointer-events-auto">
        <div className="space-y-3">
          <MultiStickySection
            selectedNodes={selectedNodes}
            actions={actions}
            focusedMode={focusedMode}
            globalStickyElevation={globalStickyElevation}
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
    );
  }

  const blocks = resolveFocusedModeBlocks(
    mode,
    {
      document: resolvedDocument,
      activePageId,
      node,
      actions,
      orderState,
      focusedMode,
      globalStickyElevation,
    },
    {
      headerContent,
      onExitFocusedMode,
    },
  );

  return (
    <div role="dialog" aria-label={dialogLabel} onKeyDown={handleKeyDown} className="editor-focused-panel pointer-events-auto">
      <InspectorBlockList blocks={blocks} compact scrollable={false} />
    </div>
  );
}
