import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';
import { CircleQuestionMark, Eye, Magnet, Redo2, Settings, Type, Undo2 } from 'lucide-react';
import type {
  DocumentNode,
  EditorState,
  StickyGeometrySnapshot,
  StickyLayoutState,
} from '../api/editorApi';
import type { DocumentFontFamily } from '../model/types';
import {
  addDocumentFontFamily,
  purgeUnusedDocumentFonts,
  removeDocumentFontFamily,
  toggleDocumentFontFavorite,
} from '../api/fontApi';
import { InsertPanel } from '../panels/InsertPanel';
import { EditorPanelHeader } from '../panels/EditorPanelHeader';
import { ShortcutHelpDialog } from '../panels/ShortcutHelpDialog';
import { SettingsPanel } from '../panels/SettingsPanel';
import { ManageFontsPanel } from '../panels/fontManagement/ManageFontsPanel';
import {
  EditorSidebar,
  INSPECTOR_COLLAPSED_WIDTH_PX,
  INSPECTOR_EXPANDED_WIDTH_PX,
  INSPECTOR_TRANSITION_MS,
} from '../panels/EditorSidebar';
import { FocusedModePanel } from '../panels/FocusedModePanel';
import type { ActionResult } from '../panels/settingsTransfer';
import { Stage } from '../api/editorViewApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PopoverSurface } from '@/components/ui/popover';
import { getShortcutLabel, type ShortcutPlatform } from '@/lib/shortcuts';
import {
  resolveAccentSurfaceColors,
  resolveEditorAccentColor,
  resolveStickyGuideColors,
  type ResolvedTheme,
} from '@/lib/theme';
import stickyIconUrl from '../../sticky_512.png';
import {
  clampFocusedPanelOffset,
  FOCUSED_PANEL_RIGHT_OFFSET_PX,
  FOCUSED_PANEL_TOP_OFFSET_PX,
} from '../editor/focusedPanelPosition';
import { RailToggleButton, SectionTemplatePopover, SpacerIcon, TopbarIconAction } from './AppChrome';
import type { HistoryAction, HistoryState } from './editorState';

type Props = {
  state: EditorState;
  historyState: Pick<HistoryState, 'past' | 'future' | 'historyLimit'>;
  selectedNode: DocumentNode | null;
  selectedNodes: DocumentNode[];
  orderState: { show: boolean; canBack: boolean; canForward: boolean };
  sectionOrderState: { canBack: boolean; canForward: boolean };
  resolvedTheme: ResolvedTheme;
  shortcutPlatform: ShortcutPlatform;
  topbarClass: string;
  stageSelectableIds: string[];
  settingsOpen: boolean;
  manageFontsOpen?: boolean;
  shortcutHelpOpen: boolean;
  sectionTemplateOpen: boolean;
  sectionTemplatePosition: { top: number; left: number };
  settingsPanelRef: Ref<HTMLDivElement>;
  sectionTemplatePanelRef: Ref<HTMLDivElement>;
  documentJson: string;
  errors: string[];
  stickyLayout: StickyLayoutState;
  dispatch: Dispatch<HistoryAction>;
  onStickyGeometryChange: (geometry: StickyGeometrySnapshot) => void;
  onOpenSectionTemplates: (trigger: HTMLElement) => void;
  onSectionTemplateOpenChange: (open: boolean) => void;
  onCloseSectionTemplates: () => void;
  onSettingsOpenChange: (open: boolean) => void;
  onManageFontsOpenChange?: (open: boolean) => void;
  onShortcutHelpOpenChange: (open: boolean) => void;
  onImportDocument: (raw: string) => Promise<ActionResult>;
  onResetData: () => void;
  onResetAll: () => void;
};

export function AppShell({
  state,
  historyState,
  selectedNode,
  selectedNodes,
  orderState,
  sectionOrderState,
  resolvedTheme,
  shortcutPlatform,
  topbarClass,
  stageSelectableIds,
  settingsOpen,
  manageFontsOpen = false,
  shortcutHelpOpen,
  sectionTemplateOpen,
  sectionTemplatePosition,
  settingsPanelRef,
  sectionTemplatePanelRef,
  documentJson,
  errors,
  stickyLayout,
  dispatch,
  onStickyGeometryChange,
  onOpenSectionTemplates,
  onSectionTemplateOpenChange,
  onCloseSectionTemplates,
  onSettingsOpenChange,
  onManageFontsOpenChange = () => undefined,
  onShortcutHelpOpenChange,
  onImportDocument,
  onResetData,
  onResetAll,
}: Props) {
  const focusedPanelRef = useRef<HTMLDivElement | null>(null);
  const focusedPanelDragRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    originOffset: EditorState['ui']['focusedPanelOffset'];
  } | null>(null);
  const focusedPanelOffsetDraftRef = useRef(state.ui.focusedPanelOffset);
  const [focusedPanelOffsetDraft, setFocusedPanelOffsetDraft] = useState(state.ui.focusedPanelOffset);
  const [focusedPanelDragging, setFocusedPanelDragging] = useState(false);
  const isSidebarCollapsed = state.ui.inspectorCollapsed && !state.ui.temporaryInspectorOpen;
  const sidebarWidth = isSidebarCollapsed
    ? `${INSPECTOR_COLLAPSED_WIDTH_PX}px`
    : `${INSPECTOR_EXPANDED_WIDTH_PX}px`;
  const focusedPanelRightOffsetPx = INSPECTOR_COLLAPSED_WIDTH_PX + FOCUSED_PANEL_RIGHT_OFFSET_PX;
  const sidebarTransitionTiming = isSidebarCollapsed ? 'ease-in' : 'ease-out';
  const resolvedAccent = resolveEditorAccentColor(
    state.ui.accentColor,
    state.ui.paperAccentColor,
    state.ui.monokaiAccentColor,
    resolvedTheme,
    state.ui.lightTheme,
    state.ui.darkTheme,
  );
  const stickyGuideColors = resolveStickyGuideColors(resolvedAccent);
  const accentSurfaceColors = resolveAccentSurfaceColors(resolvedAccent, stickyGuideColors);
  const activeAccentColor =
    resolvedTheme === 'light' && state.ui.lightTheme === 'paper'
      ? state.ui.paperAccentColor
      : resolvedTheme === 'dark' && state.ui.darkTheme === 'monokai'
        ? state.ui.monokaiAccentColor
        : state.ui.accentColor;

  useEffect(() => {
    focusedPanelOffsetDraftRef.current = focusedPanelOffsetDraft;
  }, [focusedPanelOffsetDraft]);

  useEffect(() => {
    if (!focusedPanelDragging) {
      setFocusedPanelOffsetDraft(state.ui.focusedPanelOffset);
    }
  }, [focusedPanelDragging, state.ui.focusedPanelOffset]);

  useEffect(() => {
    if (!focusedPanelDragging || typeof document === 'undefined') {
      return;
    }

    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [focusedPanelDragging]);

  useEffect(() => {
    if (!focusedPanelDragging) {
      return;
    }

    function finishFocusedPanelDrag(nextOffset: EditorState['ui']['focusedPanelOffset']) {
      focusedPanelDragRef.current = null;
      setFocusedPanelDragging(false);
      if (nextOffset.x !== state.ui.focusedPanelOffset.x || nextOffset.y !== state.ui.focusedPanelOffset.y) {
        dispatch({ type: 'setFocusedPanelOffset', value: nextOffset });
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (
        !focusedPanelDragRef.current ||
        event.pointerId !== focusedPanelDragRef.current.pointerId ||
        !focusedPanelRef.current
      ) {
        return;
      }

      const panelRect = focusedPanelRef.current.getBoundingClientRect();
      const nextOffset = clampFocusedPanelOffset({
        offset: focusedPanelDragRef.current.originOffset,
        deltaX: event.clientX - focusedPanelDragRef.current.originX,
        deltaY: event.clientY - focusedPanelDragRef.current.originY,
        containerWidth: window.innerWidth,
        containerHeight: Math.max(0, window.innerHeight - 56),
        panelWidth: panelRect.width,
        panelHeight: panelRect.height,
        rightOffset: focusedPanelRightOffsetPx,
      });
      setFocusedPanelOffsetDraft(nextOffset);
    }

    function handlePointerEnd(event: PointerEvent) {
      if (!focusedPanelDragRef.current || event.pointerId !== focusedPanelDragRef.current.pointerId) {
        return;
      }
      finishFocusedPanelDrag(focusedPanelOffsetDraftRef.current);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [dispatch, focusedPanelDragging, focusedPanelRightOffsetPx, state.ui.focusedPanelOffset]);

  function handleFocusedPanelDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    focusedPanelDragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      originOffset: focusedPanelOffsetDraft,
    };
    setFocusedPanelDragging(true);
  }

  function collectSelectionRects() {
    if (typeof window === 'undefined') {
      return {};
    }

    return Object.fromEntries(
      state.selectedIds.flatMap((nodeId) => {
        const element = window.document.getElementById(`stage-node-${nodeId}`);
        if (!element) {
          return [];
        }
        const rect = element.getBoundingClientRect();
        return [[nodeId, { left: rect.left, top: rect.top, width: rect.width, height: rect.height }]];
      }),
    );
  }

  function handleAddDocumentFont(family: DocumentFontFamily) {
    dispatch({ type: 'importDocument', document: addDocumentFontFamily(state.document, family) });
  }

  function handleRemoveDocumentFont(familyName: string) {
    dispatch({ type: 'importDocument', document: removeDocumentFontFamily(state.document, familyName) });
  }

  function handleToggleDocumentFontFavorite(familyName: string) {
    dispatch({ type: 'importDocument', document: toggleDocumentFontFavorite(state.document, familyName) });
  }

  function handlePurgeUnusedFonts() {
    dispatch({ type: 'importDocument', document: purgeUnusedDocumentFonts(state.document) });
  }

  return (
    <div
      className="editor-shell h-screen w-screen overflow-hidden"
      data-editor-theme={resolvedTheme}
      data-theme-mode={state.ui.themeMode}
      data-editor-light-theme={state.ui.lightTheme}
      data-editor-dark-theme={state.ui.darkTheme}
      style={
        {
          '--editor-accent': resolvedAccent,
          '--editor-accent-foreground': accentSurfaceColors.accentForeground,
          '--editor-accent-foreground-muted': accentSurfaceColors.accentForegroundMuted,
          '--editor-sticky-offset-guide-color': stickyGuideColors.offsetGuideColor,
          '--editor-sticky-padding-guide-color': stickyGuideColors.paddingGuideColor,
          '--editor-sticky-offset-label-background': stickyGuideColors.offsetLabelBackground,
          '--editor-sticky-auto-guide-color': stickyGuideColors.autoGuideColor,
          '--editor-sticky-auto-label-background': stickyGuideColors.autoLabelBackground,
          '--editor-sticky-distance-label-text': accentSurfaceColors.stickyDistanceLabelText,
          '--editor-sticky-offset-label-text': accentSurfaceColors.stickyOffsetLabelText,
          '--editor-sticky-auto-label-text': accentSurfaceColors.stickyAutoLabelText,
        } as CSSProperties
      }
    >
      <div className="grid h-full grid-rows-[56px_minmax(0,1fr)]">
        <header className={topbarClass}>
          <div className="flex h-full items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src={stickyIconUrl} alt="" className="h-8 w-8 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-[0.01em]">Sticky Playground</div>
                <div className="editor-topbar-subtitle truncate text-[11px]">
                  Editor bootstrap · mesh layout · spacer-based sticky behavior
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <TopbarIconAction
                icon={Undo2}
                label="Undo"
                shortcut={getShortcutLabel('undo', shortcutPlatform)}
                disabled={historyState.past.length === 0}
                onClick={() => dispatch({ type: 'undo' })}
              />
              <TopbarIconAction
                icon={Redo2}
                label="Redo"
                shortcut={getShortcutLabel('redo', shortcutPlatform)}
                disabled={historyState.future.length === 0}
                onClick={() => dispatch({ type: 'redo' })}
              />
              <TopbarIconAction
                icon={CircleQuestionMark}
                label="Keyboard shortcuts"
                shortcut={getShortcutLabel('showShortcutHelp', shortcutPlatform)}
                active={shortcutHelpOpen}
                expanded={shortcutHelpOpen}
                onClick={() => onShortcutHelpOpenChange(!shortcutHelpOpen)}
              />
              <TopbarIconAction
                icon={Settings}
                label="Settings"
                shortcut={getShortcutLabel('openSettings', shortcutPlatform)}
                active={settingsOpen}
                expanded={settingsOpen}
                hasPopup="dialog"
                panelTrigger="settings"
                onClick={() => onSettingsOpenChange(!settingsOpen)}
              />
            </div>
          </div>
        </header>

        <div
          className="grid min-h-0 transition-[grid-template-columns] ease-out"
          style={{
            gridTemplateColumns: `76px minmax(0,1fr) ${sidebarWidth}`,
            transitionDuration: `${INSPECTOR_TRANSITION_MS}ms`,
            transitionTimingFunction: sidebarTransitionTiming,
          }}
        >
          <nav aria-label="Editor tools" className="editor-rail-shell editor-border-subtle relative z-[360] overflow-visible border-r shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] backdrop-blur">
            <div className="flex h-full flex-col overflow-visible p-3">
              <InsertPanel
                onOpenSectionTemplates={onOpenSectionTemplates}
                onInsertWrapper={(role) => dispatch({ type: 'insertWrapper', role })}
                onInsertLeaf={(role) => dispatch({ type: 'insertLeaf', role })}
              />
              <div className="mt-auto flex justify-center pt-3">
                <div className="flex flex-col gap-2">
                  <RailToggleButton
                    icon={Eye}
                    pressed={state.ui.previewSticky}
                    label={state.ui.previewSticky ? 'Sticky preview on' : 'Sticky preview off'}
                    shortcut={getShortcutLabel('togglePreviewSticky', shortcutPlatform)}
                    onClick={() => dispatch({ type: 'setPreviewSticky', value: !state.ui.previewSticky })}
                  />
                  <RailToggleButton
                    icon={SpacerIcon}
                    pressed={state.ui.spacerVisibility === 'all'}
                    label={state.ui.spacerVisibility === 'all' ? 'Show all spacers' : 'Show selected spacers'}
                    shortcut={getShortcutLabel('toggleSpacerVisibility', shortcutPlatform)}
                    onClick={() =>
                      dispatch({
                        type: 'setSpacerVisibility',
                        value: state.ui.spacerVisibility === 'all' ? 'selected' : 'all',
                      })
                    }
                  />
                  <RailToggleButton
                    icon={Magnet}
                    pressed={state.ui.snapEnabled}
                    label={state.ui.snapEnabled ? 'Snap to guides on' : 'Snap to guides off'}
                    shortcut={getShortcutLabel('toggleSnapEnabled', shortcutPlatform)}
                    detail="Alt reverses while dragging"
                    onClick={() => dispatch({ type: 'setSnapEnabled', value: !state.ui.snapEnabled })}
                  />
                </div>
              </div>
            </div>
          </nav>

          <main className="editor-workspace-shell relative min-h-0 overflow-hidden">
            <Stage
              document={state.document}
              selectedId={state.selectedId}
              selectedIds={state.selectedIds}
              previewSticky={state.ui.previewSticky}
              spacerVisibility={state.ui.spacerVisibility}
              showGridLanes={state.ui.showGridLanes}
              snapEnabled={state.ui.snapEnabled}
              onStageFocus={() => {
                if (state.selectedIds.length === 0 && stageSelectableIds.length > 0) {
                  dispatch({ type: 'select', id: stageSelectableIds[0] });
                }
              }}
              onSelect={(id, mode = 'replace') =>
                dispatch(mode === 'toggle' ? { type: 'toggleSelect', id } : { type: 'select', id })
              }
              onSelectMany={(ids, mode) => dispatch({ type: 'selectMany', ids, mode })}
              onClearSelection={() => dispatch({ type: 'clearSelection' })}
              onMove={(id, x, y) => dispatch({ type: 'move', id, x, y })}
              onMoveSelection={(moves) => dispatch({ type: 'moveSelection', moves })}
              onReparent={(id, parentId, x, y) => dispatch({ type: 'reparent', id, parentId, x, y })}
              onResize={(id, width, height) => dispatch({ type: 'resize', id, width, height })}
              onResizeStart={(id) => dispatch({ type: 'beginResize', id })}
              onResizeEnd={(id) => dispatch({ type: 'endResize', id })}
              onStickyGeometryChange={onStickyGeometryChange}
            />
          </main>

          <EditorSidebar
            selectedNodes={selectedNodes}
            document={state.document}
            node={selectedNode}
            focusedMode={state.ui.focusedMode}
            inspectorCollapsed={state.ui.inspectorCollapsed}
            temporaryInspectorOpen={state.ui.temporaryInspectorOpen}
            showOrderControls={orderState.show}
            canOrderBack={orderState.canBack}
            canOrderForward={orderState.canForward}
            canSendToBack={orderState.canBack}
            canBringToFront={orderState.canForward}
            orderBackShortcut={getShortcutLabel('orderBack', shortcutPlatform)}
            orderForwardShortcut={getShortcutLabel('orderForward', shortcutPlatform)}
            sendToBackShortcut={getShortcutLabel('orderSendToBack', shortcutPlatform)}
            bringToFrontShortcut={getShortcutLabel('orderBringToFront', shortcutPlatform)}
            canSectionBack={sectionOrderState.canBack}
            canSectionForward={sectionOrderState.canForward}
            onOrderBack={() => dispatch({ type: 'orderBack' })}
            onOrderForward={() => dispatch({ type: 'orderForward' })}
            onSendToBack={() => dispatch({ type: 'orderSendToBack' })}
            onBringToFront={() => dispatch({ type: 'orderBringToFront' })}
            onSectionBack={() => dispatch({ type: 'orderBack' })}
            onSectionForward={() => dispatch({ type: 'orderForward' })}
            onAlignSelection={(mode) => dispatch({ type: 'alignSelection', mode, rects: collectSelectionRects() })}
            onDistributeSelection={(mode) =>
              dispatch({ type: 'distributeSelection', mode, rects: collectSelectionRects() })
            }
            onBulkEdit={(operations) => dispatch({ type: 'bulkEdit', operations })}
            onTextChange={(field, value) => dispatch({ type: 'text', field, value })}
            onWrapperStyleChange={(field, value) => dispatch({ type: 'wrapperStyle', field, value })}
            onRectChange={(field, value) => dispatch({ type: 'rect', field, value })}
            onPromote={(role) => dispatch({ type: 'promote', role })}
            onDemote={() => dispatch({ type: 'demote' })}
            onStickyEnabled={(value) => dispatch({ type: 'stickyEnabled', value })}
            onStickyTarget={(value) => dispatch({ type: 'stickyTarget', value })}
            onStickyEdges={(value) => dispatch({ type: 'stickyEdges', value })}
            onStickyOffset={(value) => dispatch({ type: 'stickyOffset', value })}
            onStickyOffsetTop={(value) => dispatch({ type: 'stickyOffsetTop', value })}
            onStickyOffsetBottom={(value) => dispatch({ type: 'stickyOffsetBottom', value })}
            onStickyDurationMode={(value) => dispatch({ type: 'stickyDurationMode', value })}
            onStickyDuration={(value) => dispatch({ type: 'stickyDuration', value })}
            onStickyDurationTop={(value) => dispatch({ type: 'stickyDurationTop', value })}
            onStickyDurationBottom={(value) => dispatch({ type: 'stickyDurationBottom', value })}
            onEnterFocusedMode={(value) => dispatch({ type: 'setFocusedMode', value })}
            onOpenManageFonts={() => onManageFontsOpenChange(true)}
            onInspectorCollapsedChange={(value) => dispatch({ type: 'setInspectorCollapsed', value })}
            onTemporaryInspectorOpenChange={(value) => dispatch({ type: 'setTemporaryInspectorOpen', value })}
          />
        </div>
      </div>

      {state.ui.focusedMode && selectedNodes.length > 0 ? (
        <div
          ref={focusedPanelRef}
          className="pointer-events-none absolute z-[340] w-[270px] max-w-[calc(100vw-40px)]"
          data-focused-panel-dragging={focusedPanelDragging ? 'true' : 'false'}
          style={{
            top: `${56 + FOCUSED_PANEL_TOP_OFFSET_PX}px`,
            right: `${focusedPanelRightOffsetPx}px`,
            transform: `translate(${focusedPanelOffsetDraft.x}px, ${focusedPanelOffsetDraft.y}px)`,
          }}
        >
          <FocusedModePanel
            document={state.document}
            selectedNodes={selectedNodes}
            node={selectedNode}
            focusedMode={state.ui.focusedMode}
            mode={state.ui.focusedMode}
            showOrderControls={orderState.show}
            canOrderBack={orderState.canBack}
            canOrderForward={orderState.canForward}
            canSendToBack={orderState.canBack}
            canBringToFront={orderState.canForward}
            orderBackShortcut={getShortcutLabel('orderBack', shortcutPlatform)}
            orderForwardShortcut={getShortcutLabel('orderForward', shortcutPlatform)}
            sendToBackShortcut={getShortcutLabel('orderSendToBack', shortcutPlatform)}
            bringToFrontShortcut={getShortcutLabel('orderBringToFront', shortcutPlatform)}
            canSectionBack={sectionOrderState.canBack}
            canSectionForward={sectionOrderState.canForward}
            onOrderBack={() => dispatch({ type: 'orderBack' })}
            onOrderForward={() => dispatch({ type: 'orderForward' })}
            onSendToBack={() => dispatch({ type: 'orderSendToBack' })}
            onBringToFront={() => dispatch({ type: 'orderBringToFront' })}
            onSectionBack={() => dispatch({ type: 'orderBack' })}
            onSectionForward={() => dispatch({ type: 'orderForward' })}
            onTextChange={(field, value) => dispatch({ type: 'text', field, value })}
            onWrapperStyleChange={(field, value) => dispatch({ type: 'wrapperStyle', field, value })}
            onRectChange={(field, value) => dispatch({ type: 'rect', field, value })}
            onPromote={(role) => dispatch({ type: 'promote', role })}
            onDemote={() => dispatch({ type: 'demote' })}
            onStickyEnabled={(value) => dispatch({ type: 'stickyEnabled', value })}
            onStickyTarget={(value) => dispatch({ type: 'stickyTarget', value })}
            onStickyEdges={(value) => dispatch({ type: 'stickyEdges', value })}
            onStickyOffset={(value) => dispatch({ type: 'stickyOffset', value })}
            onStickyOffsetTop={(value) => dispatch({ type: 'stickyOffsetTop', value })}
            onStickyOffsetBottom={(value) => dispatch({ type: 'stickyOffsetBottom', value })}
            onStickyDurationMode={(value) => dispatch({ type: 'stickyDurationMode', value })}
            onStickyDuration={(value) => dispatch({ type: 'stickyDuration', value })}
            onStickyDurationTop={(value) => dispatch({ type: 'stickyDurationTop', value })}
            onStickyDurationBottom={(value) => dispatch({ type: 'stickyDurationBottom', value })}
            onEnterFocusedMode={(value) => dispatch({ type: 'setFocusedMode', value })}
            onOpenManageFonts={() => onManageFontsOpenChange(true)}
            onExitFocusedMode={() => dispatch({ type: 'setFocusedMode', value: null })}
            onHeaderDragPointerDown={handleFocusedPanelDragStart}
            dragging={focusedPanelDragging}
          />
        </div>
      ) : null}

      <SectionTemplatePopover
        panelRef={sectionTemplatePanelRef}
        open={sectionTemplateOpen}
        position={sectionTemplatePosition}
        onOpenChange={onSectionTemplateOpenChange}
        onClose={onCloseSectionTemplates}
        onInsertTemplate={(templateId) => {
          dispatch({ type: 'insertSectionTemplate', templateId });
          onCloseSectionTemplates();
        }}
      />

      {settingsOpen ? (
        <PopoverSurface ref={settingsPanelRef} open={settingsOpen} onOpenChange={onSettingsOpenChange}>
          <SettingsPanel
            document={state.document}
            documentJson={documentJson}
            errors={errors}
            stickyLayout={stickyLayout}
            selectedNode={selectedNode}
            previewSticky={state.ui.previewSticky}
            spacerVisibility={state.ui.spacerVisibility}
            showGridLanes={state.ui.showGridLanes}
            snapEnabled={state.ui.snapEnabled}
            themeMode={state.ui.themeMode}
            accentColor={activeAccentColor}
            lightTheme={state.ui.lightTheme}
            darkTheme={state.ui.darkTheme}
            startupFocusedMode={state.ui.startupFocusedMode}
            resolvedTheme={resolvedTheme}
            undoDepth={historyState.past.length}
            redoDepth={historyState.future.length}
            historyLimit={historyState.historyLimit}
            onClose={() => onSettingsOpenChange(false)}
            onAddFont={handleAddDocumentFont}
            onRemoveFont={handleRemoveDocumentFont}
            onToggleFontFavorite={handleToggleDocumentFontFavorite}
            onPurgeUnusedFonts={handlePurgeUnusedFonts}
            onPreviewStickyChange={(value) => dispatch({ type: 'setPreviewSticky', value })}
            onSpacerVisibilityChange={(value) => dispatch({ type: 'setSpacerVisibility', value })}
            onShowGridLanesChange={(value) => dispatch({ type: 'setShowGridLanes', value })}
            onSnapEnabledChange={(value) => dispatch({ type: 'setSnapEnabled', value })}
            onThemeModeChange={(value) => dispatch({ type: 'setThemeMode', value })}
            onAccentColorChange={(value) =>
              dispatch(
                resolvedTheme === 'light' && state.ui.lightTheme === 'paper'
                  ? { type: 'setPaperAccentColor', value }
                  : resolvedTheme === 'dark' && state.ui.darkTheme === 'monokai'
                    ? { type: 'setMonokaiAccentColor', value }
                    : { type: 'setAccentColor', value },
              )
            }
            onLightThemeChange={(value) => dispatch({ type: 'setLightTheme', value })}
            onDarkThemeChange={(value) => dispatch({ type: 'setDarkTheme', value })}
            onStartupFocusedModeChange={(value) => dispatch({ type: 'setStartupFocusedMode', value })}
            onClearHistory={() => dispatch({ type: 'clearHistory' })}
            onHistoryLimitChange={(value) => dispatch({ type: 'setHistoryLimit', value })}
            onImport={onImportDocument}
            onResetData={onResetData}
            onResetAll={onResetAll}
          />
        </PopoverSurface>
      ) : null}

      <Dialog open={manageFontsOpen} onOpenChange={onManageFontsOpenChange}>
        <DialogContent showCloseButton={false} className="flex max-h-[min(84vh,820px)] max-w-[920px] min-h-0 flex-col overflow-hidden p-0">
          <EditorPanelHeader
            icon={Type}
            title="Manage Fonts"
            description="Add, remove, favorite, and purge document fonts."
            closeLabel="Close manage fonts"
            onClose={() => onManageFontsOpenChange(false)}
          />
          <div className="editor-scrollbar min-h-0 overflow-y-auto p-5 pt-4">
            <ManageFontsPanel
              document={state.document}
              onAddFont={handleAddDocumentFont}
              onRemoveFont={handleRemoveDocumentFont}
              onToggleFavorite={handleToggleDocumentFontFavorite}
              onPurgeUnused={handlePurgeUnusedFonts}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(state.pendingRoleSwap)}
        onOpenChange={(open) => {
          if (!open) {
            dispatch({ type: 'cancelPromote' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace current {state.pendingRoleSwap?.targetRole}?</DialogTitle>
            <DialogDescription>
              A {state.pendingRoleSwap?.targetRole} already exists. Demote the current one and promote this wrapper
              instead?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({ type: 'cancelPromote' })}>
              Cancel
            </Button>
            <Button onClick={() => dispatch({ type: 'confirmPromote' })}>Replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={onShortcutHelpOpenChange} />
    </div>
  );
}
