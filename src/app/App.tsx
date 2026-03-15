import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { CircleQuestionMark, Eye, Magnet, Redo2, Settings, StickyNote, Undo2, X } from 'lucide-react';
import {
  SECTION_TEMPLATES,
  cancelPromoteWrapperRole,
  clearPersistedState,
  computeStickyState,
  confirmPromoteWrapperRole,
  deleteNode,
  demoteWrapperRole,
  getNode,
  importDocument as importEditorDocument,
  getValidationErrors,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  loadPersistedState,
  moveNode,
  parseImportedDocumentJson,
  parseUnitValue,
  type DocumentNode,
  type DocumentModel,
  type EditorState,
  type NodeId,
  type SectionTemplateId,
  persistState,
  reparentNode,
  reorderNode,
  requestPromoteWrapperRole,
  resizeNode,
  selectNode,
  serializeDocumentJson,
  updateRectField,
  updateStickyField,
  updateTextField,
  updateWrapperStyleField,
} from '../api/editorApi';
import { InsertPanel } from '../panels/InsertPanel';
import { InspectorPanel } from '../panels/InspectorPanel';
import { ShortcutHelpDialog } from '../panels/ShortcutHelpDialog';
import { SettingsPanel } from '../panels/SettingsPanel';
import { Stage } from '../api/editorViewApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PopoverSurface, PopoverTooltip } from '@/components/ui/popover';
import { findMatchingShortcut, getShortcutLabel, getShortcutPlatform } from '@/lib/shortcuts';

type EditorAction =
  | { type: 'select'; id: string | null }
  | { type: 'insertWrapper'; role: 'section' | 'container' }
  | { type: 'insertSectionTemplate'; templateId: SectionTemplateId }
  | { type: 'insertLeaf'; role: 'text' | 'image' | 'link' | 'button' }
  | { type: 'move'; id: string; x: string; y: string }
  | { type: 'reparent'; id: string; parentId: string; x: string; y: string }
  | { type: 'resize'; id: string; width: string; height: string }
  | { type: 'text'; field: string; value: string }
  | { type: 'wrapperStyle'; field: 'background'; value: string }
  | { type: 'rect'; field: 'x' | 'y' | 'width' | 'height'; value: string }
  | { type: 'promote'; role: 'header' | 'footer' }
  | { type: 'confirmPromote' }
  | { type: 'cancelPromote' }
  | { type: 'demote' }
  | { type: 'delete' }
  | { type: 'stickyEnabled'; value: boolean }
  | { type: 'stickyTarget'; value: 'self' | 'contentWrapper' }
  | { type: 'stickyEdges'; value: 'top' | 'bottom' | 'both' }
  | { type: 'stickyOffset'; value: number }
  | { type: 'stickyOffsetTop'; value: number }
  | { type: 'stickyOffsetBottom'; value: number }
  | { type: 'stickyDurationMode'; value: 'auto' | 'custom' }
  | { type: 'stickyDuration'; value: number }
  | { type: 'stickyDurationTop'; value: number }
  | { type: 'stickyDurationBottom'; value: number }
  | { type: 'orderBack' }
  | { type: 'orderForward' }
  | { type: 'orderSendToBack' }
  | { type: 'orderBringToFront' }
  | { type: 'importDocument'; document: DocumentModel }
  | { type: 'setPreviewSticky'; value: boolean }
  | { type: 'setSpacerVisibility'; value: 'selected' | 'all' }
  | { type: 'setShowGridLanes'; value: boolean }
  | { type: 'setSnapEnabled'; value: boolean };

type HistoryAction =
  | EditorAction
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clearHistory' }
  | { type: 'setHistoryLimit'; value: number }
  | { type: 'beginResize'; id: NodeId }
  | { type: 'endResize'; id: NodeId };

type NodePatch = {
  id: NodeId;
  before?: DocumentNode;
  after?: DocumentNode;
};

type HistoryEntry = {
  rootIdBefore: NodeId;
  rootIdAfter: NodeId;
  nodePatches: NodePatch[];
  selectedBefore: NodeId | null;
  selectedAfter: NodeId | null;
  pendingBefore: EditorState['pendingRoleSwap'];
  pendingAfter: EditorState['pendingRoleSwap'];
  debounceKey: string | null;
  createdAt: number;
};

type HistoryState = {
  present: EditorState;
  past: HistoryEntry[];
  future: HistoryEntry[];
  historyLimit: number;
  activeResize:
    | {
        nodeId: NodeId;
        before: EditorState;
      }
    | null;
};

const DEFAULT_HISTORY_LIMIT = 100;
const MIN_HISTORY_LIMIT = 1;
const MAX_HISTORY_LIMIT = 500;
const TEXT_HISTORY_DEBOUNCE_MS = 450;
const UPCOMING_SCROLL_TEMPLATES = [
  {
    id: 'scrollStory',
    name: 'Scroll Story (Soon)',
    description: 'Reserved for scroll-linked animation templates.',
  },
  {
    id: 'timelineMotion',
    name: 'Timeline Motion (Soon)',
    description: 'Reserved for narrative timeline animations.',
  },
] as const;

const TOPBAR_ICON_BUTTON_CLASS =
  'h-8 w-8 rounded-md border border-white/10 bg-white/[0.035] p-0 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-white/14 hover:bg-white/[0.065] hover:text-white/92 focus-visible:border-white/18 focus-visible:bg-white/[0.08] focus-visible:text-white';

const TOPBAR_TOOLTIP_CLASS =
  'rounded-lg border border-slate-700 bg-[#0f172a] px-3 py-2 text-xs font-medium text-slate-100 shadow-[0_16px_36px_rgba(2,6,23,0.38)]';

function editorReducer(state: EditorState, action: EditorAction) {
  const selectedId = state.selectedId;
  switch (action.type) {
    case 'select':
      return selectNode(state, action.id);
    case 'insertWrapper':
      return insertWrapper(state, action.role);
    case 'insertSectionTemplate':
      return insertSectionTemplate(state, action.templateId);
    case 'insertLeaf':
      return insertLeaf(state, action.role);
    case 'move':
      return moveNode(state, action.id, { x: action.x, y: action.y });
    case 'reparent':
      return reparentNode(state, action.id, action.parentId, action.x, action.y);
    case 'resize':
      return resizeNode(state, action.id, { width: action.width, height: action.height });
    case 'text':
      return selectedId ? updateTextField(state, selectedId, action.field, action.value) : state;
    case 'wrapperStyle':
      return selectedId ? updateWrapperStyleField(state, selectedId, action.field, action.value) : state;
    case 'rect':
      return selectedId ? updateRectField(state, selectedId, action.field, action.value) : state;
    case 'promote':
      return selectedId ? requestPromoteWrapperRole(state, selectedId, action.role) : state;
    case 'confirmPromote':
      return confirmPromoteWrapperRole(state);
    case 'cancelPromote':
      return cancelPromoteWrapperRole(state);
    case 'demote':
      return selectedId ? demoteWrapperRole(state, selectedId) : state;
    case 'delete':
      return selectedId ? deleteNode(state, selectedId) : state;
    case 'stickyEnabled':
      return selectedId ? updateStickyField(state, selectedId, { enabled: action.value }) : state;
    case 'stickyTarget':
      if (!selectedId) {
        return state;
      }
      return updateStickyField(state, selectedId, {
        target: selectedNodeDisallowsContentWrapperTarget(state, selectedId) ? 'self' : action.value,
      });
    case 'stickyEdges':
      if (!selectedId) {
        return state;
      }
      return updateStickyField(state, selectedId, {
        edges:
          action.value === 'both'
            ? { top: true, bottom: true }
            : action.value === 'bottom'
              ? { top: false, bottom: true }
              : { top: true, bottom: false },
      });
    case 'stickyOffset':
      if (!selectedId) {
        return state;
      }
      return updateStickyField(state, selectedId, {
        offsetTop: selectedNodeHasTopEdge(state, selectedId) ? parseUnitValue(`${action.value}vh`) : undefined,
        offsetBottom:
          selectedNodeHasBottomEdge(state, selectedId) ? parseUnitValue(`${action.value}vh`) : undefined,
      });
    case 'stickyOffsetTop':
      if (!selectedId) {
        return state;
      }
      return updateStickyField(state, selectedId, {
        offsetTop: parseUnitValue(`${action.value}vh`),
      });
    case 'stickyOffsetBottom':
      if (!selectedId) {
        return state;
      }
      return updateStickyField(state, selectedId, {
        offsetBottom: parseUnitValue(`${action.value}vh`),
      });
    case 'stickyDurationMode':
      return selectedId ? updateStickyField(state, selectedId, { durationMode: action.value }) : state;
    case 'stickyDuration':
      if (!selectedId) {
        return state;
      }
      const parsedDuration = parseUnitValue(`${action.value}vh`);
      return selectedId
        ? updateStickyField(state, selectedId, {
            duration: parsedDuration,
            durationTop: selectedNodeHasTopEdge(state, selectedId) ? parsedDuration : undefined,
            durationBottom: selectedNodeHasBottomEdge(state, selectedId) ? parsedDuration : undefined,
          })
        : state;
    case 'stickyDurationTop':
      if (!selectedId) {
        return state;
      }
      return updateStickyField(state, selectedId, {
        durationTop: parseUnitValue(`${action.value}vh`),
      });
    case 'stickyDurationBottom':
      if (!selectedId) {
        return state;
      }
      return updateStickyField(state, selectedId, {
        durationBottom: parseUnitValue(`${action.value}vh`),
      });
    case 'orderBack':
      return selectedId ? reorderNode(state, selectedId, 'back') : state;
    case 'orderForward':
      return selectedId ? reorderNode(state, selectedId, 'forward') : state;
    case 'orderSendToBack':
      return selectedId ? reorderNode(state, selectedId, 'sendToBack') : state;
    case 'orderBringToFront':
      return selectedId ? reorderNode(state, selectedId, 'bringToFront') : state;
    case 'importDocument':
      return importEditorDocument(state, action.document);
    case 'setPreviewSticky':
      return { ...state, ui: { ...state.ui, previewSticky: action.value } };
    case 'setSpacerVisibility':
      return { ...state, ui: { ...state.ui, spacerVisibility: action.value } };
    case 'setShowGridLanes':
      return { ...state, ui: { ...state.ui, showGridLanes: action.value } };
    case 'setSnapEnabled':
      return { ...state, ui: { ...state.ui, snapEnabled: action.value } };
    default:
      return state;
  }
}

function createHistoryState(): HistoryState {
  return {
    present: loadPersistedState(),
    past: [],
    future: [],
    historyLimit: DEFAULT_HISTORY_LIMIT,
    activeResize: null,
  };
}

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'beginResize') {
    if (state.activeResize) {
      return state;
    }
    return {
      ...state,
      activeResize: {
        nodeId: action.id,
        before: state.present,
      },
    };
  }

  if (action.type === 'endResize') {
    if (!state.activeResize || state.activeResize.nodeId !== action.id) {
      return state;
    }

    const entry = buildHistoryEntry(
      state.activeResize.before,
      state.present,
      null,
      Date.now(),
    );

    if (!entry) {
      return { ...state, activeResize: null };
    }

    return {
      ...state,
      past: appendHistoryEntry(state.past, entry, state.historyLimit),
      future: [],
      activeResize: null,
    };
  }

  if (action.type === 'undo') {
    if (state.activeResize) {
      return state;
    }
    const entry = state.past[state.past.length - 1];
    if (!entry) {
      return state;
    }

    return {
      ...state,
      present: applyHistoryEntry(state.present, entry, 'undo'),
      past: state.past.slice(0, -1),
      future: [entry, ...state.future],
    };
  }

  if (action.type === 'redo') {
    if (state.activeResize) {
      return state;
    }
    const entry = state.future[0];
    if (!entry) {
      return state;
    }

    return {
      ...state,
      present: applyHistoryEntry(state.present, entry, 'redo'),
      past: [...state.past, entry],
      future: state.future.slice(1),
    };
  }

  if (action.type === 'clearHistory') {
    return { ...state, past: [], future: [], activeResize: null };
  }

  if (action.type === 'setHistoryLimit') {
    const nextLimit = clampHistoryLimit(action.value);
    const excess = Math.max(0, state.past.length - nextLimit);
    return {
      ...state,
      historyLimit: nextLimit,
      past: excess > 0 ? state.past.slice(excess) : state.past,
    };
  }

  const nextPresent = editorReducer(state.present, action);
  if (nextPresent === state.present) {
    return state;
  }

  if (state.activeResize && isResizeStreamAction(action, state.activeResize.nodeId)) {
    return {
      ...state,
      present: nextPresent,
    };
  }

  if (!shouldTrackInHistory(action)) {
    return {
      ...state,
      present: nextPresent,
    };
  }

  const entry = buildHistoryEntry(
    state.present,
    nextPresent,
    getTextDebounceKey(action, state.present.selectedId),
    Date.now(),
  );
  if (!entry) {
    return {
      ...state,
      present: nextPresent,
    };
  }

  return {
    ...state,
    present: nextPresent,
    past: appendHistoryEntry(state.past, entry, state.historyLimit),
    future: [],
  };
}

export function App() {
  const [historyState, dispatch] = useReducer(historyReducer, undefined, createHistoryState);
  const state = historyState.present;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [sectionTemplateOpen, setSectionTemplateOpen] = useState(false);
  const [sectionTemplateAnchor, setSectionTemplateAnchor] = useState<HTMLElement | null>(null);
  const [sectionTemplatePosition, setSectionTemplatePosition] = useState({ top: 72, left: 102 });
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const sectionTemplatePanelRef = useRef<HTMLDivElement | null>(null);
  const shortcutPlatform = getShortcutPlatform();
  const selectedNode = getNode(state.document, state.selectedId);
  const orderState = getNodeOrderState(state, selectedNode);
  const sectionOrderState = getSectionOrderState(state, selectedNode);
  const errors = useMemo(() => getValidationErrors(state), [state]);
  const stickyState = useMemo(() => computeStickyState(state.document), [state.document]);
  const documentJson = useMemo(() => serializeDocumentJson(state.document), [state.document]);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    if (!sectionTemplateOpen || !sectionTemplateAnchor) {
      return;
    }
    const anchor = sectionTemplateAnchor;

    function updateSectionTemplatePosition() {
      const rect = anchor.getBoundingClientRect();
      setSectionTemplatePosition({
        top: Math.max(72, Math.min(window.innerHeight - 480, rect.top - 10)),
        left: rect.right + 16,
      });
    }

    updateSectionTemplatePosition();
    window.addEventListener('resize', updateSectionTemplatePosition);
    window.addEventListener('scroll', updateSectionTemplatePosition, true);
    return () => {
      window.removeEventListener('resize', updateSectionTemplatePosition);
      window.removeEventListener('scroll', updateSectionTemplatePosition, true);
    };
  }, [sectionTemplateAnchor, sectionTemplateOpen]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (
        settingsOpen &&
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(target) &&
        !target.closest('[data-panel-trigger="settings"]')
      ) {
        setSettingsOpen(false);
      }

      if (
        sectionTemplateOpen &&
        sectionTemplatePanelRef.current &&
        !sectionTemplatePanelRef.current.contains(target) &&
        !target.closest('[data-panel-trigger="section-templates"]')
      ) {
        setSectionTemplateOpen(false);
        setSectionTemplateAnchor(null);
      }

    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [sectionTemplateOpen, settingsOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      const interactiveFocus = isInteractiveFocus(active);
      const shortcut = findMatchingShortcut(
        event,
        {
          interactiveFocus,
          hasSelection: Boolean(state.selectedId),
          hasDismissiblePanels: sectionTemplateOpen || settingsOpen || shortcutHelpOpen,
        },
        shortcutPlatform,
      );

      if (!shortcut) {
        return;
      }

      event.preventDefault();
      switch (shortcut.id) {
        case 'dismissPanels':
          setSectionTemplateOpen(false);
          setSectionTemplateAnchor(null);
          setSettingsOpen(false);
          setShortcutHelpOpen(false);
          return;
        case 'undo':
          dispatch({ type: 'undo' });
          return;
        case 'redo':
          dispatch({ type: 'redo' });
          return;
        case 'openSettings':
          setSettingsOpen((open) => !open);
          return;
        case 'showShortcutHelp':
          setShortcutHelpOpen(true);
          return;
        case 'togglePreviewSticky':
          dispatch({ type: 'setPreviewSticky', value: !state.ui.previewSticky });
          return;
        case 'toggleSpacerVisibility':
          dispatch({
            type: 'setSpacerVisibility',
            value: state.ui.spacerVisibility === 'all' ? 'selected' : 'all',
          });
          return;
        case 'toggleSnapEnabled':
          dispatch({ type: 'setSnapEnabled', value: !state.ui.snapEnabled });
          return;
        case 'deleteSelection':
          dispatch({ type: 'delete' });
          return;
        case 'orderBack':
          dispatch({ type: 'orderBack' });
          return;
        case 'orderForward':
          dispatch({ type: 'orderForward' });
          return;
        case 'orderSendToBack':
          dispatch({ type: 'orderSendToBack' });
          return;
        case 'orderBringToFront':
          dispatch({ type: 'orderBringToFront' });
          return;
        default:
          assertNever(shortcut.id);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sectionTemplateOpen, settingsOpen, shortcutHelpOpen, shortcutPlatform, state]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#eef2f7] text-slate-900">
      <div className="grid h-full grid-rows-[56px_minmax(0,1fr)]">
        <header className="border-b border-white/10 bg-[#131720] px-4 text-white shadow-[0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex h-full items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3772ff] to-[#1a243a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
                <StickyNote className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-[0.01em]">Sticky Playground</div>
                <div className="truncate text-[11px] text-white/55">
                  Editor bootstrap · mesh layout · spacer-based sticky behavior
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <PopoverTooltip
                side="bottom"
                align="end"
                className={TOPBAR_TOOLTIP_CLASS}
                content={`Undo · ${getShortcutLabel('undo', shortcutPlatform)}`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Undo"
                  disabled={historyState.past.length === 0}
                  onClick={() => dispatch({ type: 'undo' })}
                  className={TOPBAR_ICON_BUTTON_CLASS}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </PopoverTooltip>
              <PopoverTooltip
                side="bottom"
                align="end"
                className={TOPBAR_TOOLTIP_CLASS}
                content={`Redo · ${getShortcutLabel('redo', shortcutPlatform)}`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Redo"
                  disabled={historyState.future.length === 0}
                  onClick={() => dispatch({ type: 'redo' })}
                  className={TOPBAR_ICON_BUTTON_CLASS}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </PopoverTooltip>
              <PopoverTooltip
                side="bottom"
                align="end"
                className={TOPBAR_TOOLTIP_CLASS}
                content={`Keyboard shortcuts · ${getShortcutLabel('showShortcutHelp', shortcutPlatform)}`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Keyboard shortcuts"
                  onClick={() => setShortcutHelpOpen(true)}
                  className={TOPBAR_ICON_BUTTON_CLASS}
                >
                  <CircleQuestionMark className="h-4 w-4" />
                </Button>
              </PopoverTooltip>
              <PopoverTooltip
                side="bottom"
                align="end"
                className={TOPBAR_TOOLTIP_CLASS}
                content={`Settings · ${getShortcutLabel('openSettings', shortcutPlatform)}`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Settings"
                  aria-haspopup="dialog"
                  aria-expanded={settingsOpen}
                  data-panel-trigger="settings"
                  onClick={() => setSettingsOpen((open) => !open)}
                  className={
                    settingsOpen
                      ? 'h-8 w-8 rounded-md border border-[#4d86ff] bg-[#3772ff] p-0 text-white shadow-[0_12px_24px_rgba(55,114,255,0.22),inset_0_0_0_1px_rgba(34,87,214,0.42)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-[#7da7ff] hover:bg-[#4f83fd] hover:shadow-[0_14px_28px_rgba(55,114,255,0.26),inset_0_0_0_1px_rgba(34,87,214,0.6)] focus-visible:border-[#76a2ff] focus-visible:bg-[#4f86ff]'
                      : TOPBAR_ICON_BUTTON_CLASS
                  }
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTooltip>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[84px_minmax(0,1fr)_300px]">
          <aside className="relative z-[360] overflow-visible border-r border-slate-200/80 bg-white/95 shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] backdrop-blur">
            <div className="flex h-full flex-col gap-4 overflow-visible p-3">
              <div className="overflow-visible rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
                <InsertPanel
                  onOpenSectionTemplates={(trigger) => {
                    setSectionTemplateAnchor(trigger);
                    setSectionTemplateOpen(true);
                  }}
                  onInsertWrapper={(role) => dispatch({ type: 'insertWrapper', role })}
                  onInsertLeaf={(role) => dispatch({ type: 'insertLeaf', role })}
                />
              </div>
              <div className="mt-auto flex justify-center">
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
          </aside>

          <main className="relative min-h-0 overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0)),#eef2f7]">
            <Stage
              document={state.document}
              selectedId={state.selectedId}
              previewSticky={state.ui.previewSticky}
              spacerVisibility={state.ui.spacerVisibility}
              showGridLanes={state.ui.showGridLanes}
              snapEnabled={state.ui.snapEnabled}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onMove={(id, x, y) => dispatch({ type: 'move', id, x, y })}
              onReparent={(id, parentId, x, y) => dispatch({ type: 'reparent', id, parentId, x, y })}
              onResize={(id, width, height) => dispatch({ type: 'resize', id, width, height })}
              onResizeStart={(id) => dispatch({ type: 'beginResize', id })}
              onResizeEnd={(id) => dispatch({ type: 'endResize', id })}
            />

          </main>

          <aside className="min-h-0 overflow-hidden border-l border-slate-200/80 bg-white/97 shadow-[-8px_0_24px_rgba(18,32,51,0.03)]">
            <InspectorPanel
              node={selectedNode}
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
            />
          </aside>
        </div>
      </div>

      {sectionTemplateOpen ? (
        <PopoverSurface
          ref={sectionTemplatePanelRef}
          open={sectionTemplateOpen}
          onOpenChange={(open) => {
            setSectionTemplateOpen(open);
            if (!open) {
              setSectionTemplateAnchor(null);
            }
          }}
          className="fixed w-[440px] rounded-xl border border-slate-200 bg-white shadow-[0_16px_34px_rgba(18,32,51,0.18)]"
          style={{
            top: `${sectionTemplatePosition.top}px`,
            left: `${sectionTemplatePosition.left}px`,
          }}
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Section templates</div>
              <div className="mt-0.5 text-xs text-slate-500">Choose a layout to insert.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSectionTemplateOpen(false);
                setSectionTemplateAnchor(null);
              }}
              className="rounded-md p-1 text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-100/80 hover:text-slate-700"
              aria-label="Close section templates panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[62vh] overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2.5">
              {SECTION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'insertSectionTemplate', templateId: template.id });
                    setSectionTemplateOpen(false);
                    setSectionTemplateAnchor(null);
                  }}
                  className="group flex min-h-[104px] flex-col rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-[background-color,border-color,box-shadow] duration-150 hover:border-slate-300 hover:bg-slate-50/70"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">{template.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        template.category === 'sticky'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {template.category === 'sticky' ? 'Sticky' : 'Basic'}
                    </span>
                  </div>
                  <span className="mt-1.5 text-[11px] leading-4 text-slate-600">{template.description}</span>
                </button>
              ))}
              {UPCOMING_SCROLL_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="flex min-h-[104px] flex-col rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2.5 text-left opacity-85"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{template.name}</span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Soon
                    </span>
                  </div>
                  <span className="mt-1.5 text-[11px] leading-4 text-slate-500">{template.description}</span>
                </div>
              ))}
            </div>
          </div>
        </PopoverSurface>
      ) : null}

      {settingsOpen ? (
        <PopoverSurface ref={settingsPanelRef} open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SettingsPanel
            documentJson={documentJson}
            errors={errors}
            stickyState={stickyState}
            selectedNode={selectedNode}
            previewSticky={state.ui.previewSticky}
            spacerVisibility={state.ui.spacerVisibility}
            showGridLanes={state.ui.showGridLanes}
            snapEnabled={state.ui.snapEnabled}
            undoDepth={historyState.past.length}
            redoDepth={historyState.future.length}
            historyLimit={historyState.historyLimit}
            onClose={() => setSettingsOpen(false)}
            onPreviewStickyChange={(value) => dispatch({ type: 'setPreviewSticky', value })}
            onSpacerVisibilityChange={(value) => dispatch({ type: 'setSpacerVisibility', value })}
            onShowGridLanesChange={(value) => dispatch({ type: 'setShowGridLanes', value })}
            onSnapEnabledChange={(value) => dispatch({ type: 'setSnapEnabled', value })}
            onClearHistory={() => dispatch({ type: 'clearHistory' })}
            onHistoryLimitChange={(value) => dispatch({ type: 'setHistoryLimit', value })}
            onImport={async (raw) => {
              try {
                const document = parseImportedDocumentJson(raw);
                dispatch({ type: 'importDocument', document });
                return {
                  ok: true,
                  message: 'Document imported. Undo with Cmd + Z.',
                };
              } catch (error) {
                return {
                  ok: false,
                  message: error instanceof Error ? error.message : 'Import failed.',
                };
              }
            }}
            onReset={() => {
              clearPersistedState();
              window.location.reload();
            }}
          />
        </PopoverSurface>
      ) : null}

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
              A {state.pendingRoleSwap?.targetRole} already exists. Demote the current one and promote
              this wrapper instead?
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

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </div>
  );
}

function isInteractiveFocus(element: HTMLElement | null) {
  if (!element) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  return Boolean(
    element.closest(
      'input, textarea, select, button, [role="textbox"], [contenteditable="true"], [data-radix-slider-thumb], [data-radix-select-trigger]',
    ),
  );
}

function RailToggleButton({
  icon: Icon,
  pressed,
  label,
  shortcut,
  detail,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  pressed: boolean;
  label: string;
  shortcut?: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <PopoverTooltip
      side="right"
      align="center"
      content={`${label}${shortcut ? ` · ${shortcut}` : detail ? ` · ${detail}` : ''}`}
    >
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onClick}
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-[background-color,border-color,color,box-shadow] duration-150 ${
          pressed
            ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22),inset_0_0_0_1px_rgba(34,87,214,0.42)] hover:border-[#7da7ff] hover:bg-[#4f83fd] hover:shadow-[0_14px_28px_rgba(55,114,255,0.26),inset_0_0_0_1px_rgba(34,87,214,0.6)]'
            : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50/80'
        }`}
      >
        <Icon className="h-4 w-4" />
      </button>
    </PopoverTooltip>
  );
}

function SpacerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="4" rx="1" />
      <path d="M12 8v8" />
      <path d="M8 12h8" opacity="0.65" />
      <rect x="4" y="16" width="16" height="4" rx="1" />
    </svg>
  );
}

function assertNever(value: never) {
  throw new Error(`Unhandled shortcut: ${String(value)}`);
}

function shouldTrackInHistory(action: EditorAction) {
  return (
    action.type !== 'select' &&
    action.type !== 'setPreviewSticky' &&
    action.type !== 'setSpacerVisibility' &&
    action.type !== 'setShowGridLanes' &&
    action.type !== 'setSnapEnabled'
  );
}

function isResizeStreamAction(action: EditorAction, nodeId: NodeId) {
  return (
    (action.type === 'resize' && action.id === nodeId) ||
    (action.type === 'move' && action.id === nodeId)
  );
}

function getTextDebounceKey(action: EditorAction, selectedId: string | null) {
  if (action.type !== 'text' || !selectedId) {
    return null;
  }
  return `text:${selectedId}:${action.field}`;
}

function appendHistoryEntry(past: HistoryEntry[], entry: HistoryEntry, historyLimit: number) {
  const last = past[past.length - 1];
  const shouldDebounceMerge =
    Boolean(
      last &&
      last.debounceKey &&
      entry.debounceKey &&
      last.debounceKey === entry.debounceKey &&
      entry.createdAt - last.createdAt <= TEXT_HISTORY_DEBOUNCE_MS,
    );

  const nextPast = shouldDebounceMerge
    ? [...past.slice(0, -1), composeHistoryEntries(last!, entry)]
    : [...past, entry];

  if (nextPast.length > historyLimit) {
    return nextPast.slice(nextPast.length - historyLimit);
  }
  return nextPast;
}

function clampHistoryLimit(value: number) {
  const parsed = Number.isFinite(value) ? Math.round(value) : DEFAULT_HISTORY_LIMIT;
  return Math.min(MAX_HISTORY_LIMIT, Math.max(MIN_HISTORY_LIMIT, parsed));
}

function buildHistoryEntry(
  before: EditorState,
  after: EditorState,
  debounceKey: string | null,
  createdAt: number,
): HistoryEntry | null {
  const patches: NodePatch[] = [];
  const nodeIds = new Set<string>([
    ...Object.keys(before.document.nodes),
    ...Object.keys(after.document.nodes),
  ]);

  for (const id of nodeIds) {
    const beforeNode = before.document.nodes[id];
    const afterNode = after.document.nodes[id];
    if (!beforeNode && afterNode) {
      patches.push({ id, before: undefined, after: afterNode });
      continue;
    }
    if (beforeNode && !afterNode) {
      patches.push({ id, before: beforeNode, after: undefined });
      continue;
    }
    if (beforeNode && afterNode && !nodesEqual(beforeNode, afterNode)) {
      patches.push({ id, before: beforeNode, after: afterNode });
    }
  }

  const selectedChanged = before.selectedId !== after.selectedId;
  const pendingChanged =
    JSON.stringify(before.pendingRoleSwap) !== JSON.stringify(after.pendingRoleSwap);
  const rootChanged = before.document.rootId !== after.document.rootId;

  if (!selectedChanged && !pendingChanged && !rootChanged && patches.length === 0) {
    return null;
  }

  return {
    rootIdBefore: before.document.rootId,
    rootIdAfter: after.document.rootId,
    nodePatches: patches,
    selectedBefore: before.selectedId,
    selectedAfter: after.selectedId,
    pendingBefore: before.pendingRoleSwap,
    pendingAfter: after.pendingRoleSwap,
    debounceKey,
    createdAt,
  };
}

function composeHistoryEntries(previous: HistoryEntry, next: HistoryEntry): HistoryEntry {
  const byId = new Map<string, NodePatch>();

  for (const patch of previous.nodePatches) {
    byId.set(patch.id, patch);
  }

  for (const patch of next.nodePatches) {
    const existing = byId.get(patch.id);
    if (!existing) {
      byId.set(patch.id, patch);
      continue;
    }

    const composed: NodePatch = {
      id: patch.id,
      before: existing.before,
      after: patch.after,
    };

    if (
      (composed.before === undefined && composed.after === undefined) ||
      (composed.before && composed.after && nodesEqual(composed.before, composed.after))
    ) {
      byId.delete(patch.id);
    } else {
      byId.set(patch.id, composed);
    }
  }

  return {
    rootIdBefore: previous.rootIdBefore,
    rootIdAfter: next.rootIdAfter,
    nodePatches: Array.from(byId.values()),
    selectedBefore: previous.selectedBefore,
    selectedAfter: next.selectedAfter,
    pendingBefore: previous.pendingBefore,
    pendingAfter: next.pendingAfter,
    debounceKey: next.debounceKey,
    createdAt: next.createdAt,
  };
}

function applyHistoryEntry(
  present: EditorState,
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
): EditorState {
  const nodes = { ...present.document.nodes };
  for (const patch of entry.nodePatches) {
    const snapshot = direction === 'undo' ? patch.before : patch.after;
    if (!snapshot) {
      delete nodes[patch.id];
    } else {
      nodes[patch.id] = structuredClone(snapshot);
    }
  }

  const rootId = direction === 'undo' ? entry.rootIdBefore : entry.rootIdAfter;
  const selectedCandidate = direction === 'undo' ? entry.selectedBefore : entry.selectedAfter;
  const selectedId = selectedCandidate && nodes[selectedCandidate] ? selectedCandidate : null;

  return {
    ...present,
    document: {
      rootId,
      nodes,
    },
    selectedId,
    pendingRoleSwap: direction === 'undo' ? entry.pendingBefore : entry.pendingAfter,
  };
}

function nodesEqual(left: DocumentNode, right: DocumentNode) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function selectedNodeHasTopEdge(state: EditorState, selectedId: string) {
  const node = getNode(state.document, selectedId);
  if (!node || node.type === 'site') {
    return false;
  }
  return node.sticky?.edges.top ?? !node.sticky?.edges.bottom;
}

function selectedNodeHasBottomEdge(state: EditorState, selectedId: string) {
  const node = getNode(state.document, selectedId);
  if (!node || node.type === 'site') {
    return false;
  }
  return node.sticky?.edges.bottom ?? false;
}

function selectedNodeDisallowsContentWrapperTarget(state: EditorState, selectedId: string) {
  const node = getNode(state.document, selectedId);
  return Boolean(node && node.type === 'wrapper' && node.role === 'container');
}

function getNodeOrderState(
  state: EditorState,
  node: ReturnType<typeof getNode>,
) {
  if (!node || node.type === 'site' || node.parentId === null) {
    return { show: false, canBack: false, canForward: false };
  }

  const isReorderable = node.type === 'leaf' || (node.type === 'wrapper' && node.role === 'container');
  if (!isReorderable) {
    return { show: false, canBack: false, canForward: false };
  }

  const parent = state.document.nodes[node.parentId];
  if (!parent) {
    return { show: false, canBack: false, canForward: false };
  }

  const index = parent.children.indexOf(node.id);
  if (index === -1) {
    return { show: false, canBack: false, canForward: false };
  }

  return {
    show: true,
    canBack: index > 0,
    canForward: index < parent.children.length - 1,
  };
}

function getSectionOrderState(
  state: EditorState,
  node: ReturnType<typeof getNode>,
) {
  if (!node || node.type !== 'wrapper' || node.role !== 'section' || node.parentId !== state.document.rootId) {
    return { canBack: false, canForward: false };
  }

  const root = state.document.nodes[state.document.rootId];
  if (!root || root.type !== 'site') {
    return { canBack: false, canForward: false };
  }

  const index = root.children.indexOf(node.id);
  if (index === -1) {
    return { canBack: false, canForward: false };
  }

  return {
    canBack: findSectionSiblingIndex(state, root.children, index, -1) !== -1,
    canForward: findSectionSiblingIndex(state, root.children, index, 1) !== -1,
  };
}

function findSectionSiblingIndex(
  state: EditorState,
  siblingIds: NodeId[],
  fromIndex: number,
  direction: -1 | 1,
) {
  let index = fromIndex + direction;
  while (index >= 0 && index < siblingIds.length) {
    const candidate = state.document.nodes[siblingIds[index]];
    if (candidate?.type === 'wrapper' && candidate.role === 'section') {
      return index;
    }
    index += direction;
  }
  return -1;
}
