import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Eye, Grid3X3, Magnet, Redo2, SearchCode, StickyNote, Undo2, X } from 'lucide-react';
import {
  cancelPromoteWrapperRole,
  clearPersistedState,
  confirmPromoteWrapperRole,
  deleteNode,
  demoteWrapperRole,
  getValidationErrors,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  loadPersistedState,
  moveNode,
  type EditorState,
  persistState,
  reparentNode,
  reorderNode,
  requestPromoteWrapperRole,
  resizeNode,
  selectNode,
  updateRectField,
  updateStickyField,
  updateTextField,
  updateWrapperStyleField,
} from '../model/documentStore';
import { SECTION_TEMPLATES, type SectionTemplateId } from '../model/defaults';
import { parseUnitValue } from '../model/units';
import { getNode } from '../model/selectors';
import type { DocumentNode, NodeId } from '../model/types';
import { InsertPanel } from '../panels/InsertPanel';
import { InspectorPanel } from '../panels/InspectorPanel';
import { DebugPanel } from '../panels/DebugPanel';
import { Stage } from '../stage/Stage';
import { computeStickyState } from '../sticky/stickyCompute';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

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
  const [debugOpen, setDebugOpen] = useState(false);
  const [spacerMenuOpen, setSpacerMenuOpen] = useState(false);
  const [sectionTemplateOpen, setSectionTemplateOpen] = useState(false);
  const spacerMenuRef = useRef<HTMLDivElement | null>(null);
  const sectionTemplatePanelRef = useRef<HTMLDivElement | null>(null);
  const debugPanelRef = useRef<HTMLDivElement | null>(null);
  const selectedNode = getNode(state.document, state.selectedId);
  const orderState = getNodeOrderState(state, selectedNode);
  const sectionOrderState = getSectionOrderState(state, selectedNode);
  const errors = useMemo(() => getValidationErrors(state), [state]);
  const stickyState = useMemo(() => computeStickyState(state.document), [state.document]);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (
        spacerMenuRef.current &&
        !spacerMenuRef.current.contains(target) &&
        !target.closest('[data-panel-trigger="spacer-visibility"]')
      ) {
        setSpacerMenuOpen(false);
      }

      if (
        sectionTemplateOpen &&
        sectionTemplatePanelRef.current &&
        !sectionTemplatePanelRef.current.contains(target) &&
        !target.closest('[data-panel-trigger="section-templates"]')
      ) {
        setSectionTemplateOpen(false);
      }

      if (
        debugOpen &&
        debugPanelRef.current &&
        !debugPanelRef.current.contains(target) &&
        !target.closest('[data-panel-trigger="debug-tools"]')
      ) {
        setDebugOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [debugOpen, sectionTemplateOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (sectionTemplateOpen || debugOpen || spacerMenuOpen) {
          event.preventDefault();
          setSectionTemplateOpen(false);
          setDebugOpen(false);
          setSpacerMenuOpen(false);
        }
        return;
      }

      const isUndoRedo = event.metaKey && !event.ctrlKey && event.code === 'KeyZ';
      if (isUndoRedo) {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      if (isInteractiveFocus(active)) {
        return;
      }

      if (!state.selectedId) {
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        dispatch({ type: 'delete' });
        return;
      }

      if (!event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      const isLeft = event.code === 'BracketLeft';
      const isRight = event.code === 'BracketRight';
      if (!isLeft && !isRight) {
        return;
      }

      event.preventDefault();
      if (event.altKey) {
        dispatch({ type: isLeft ? 'orderSendToBack' : 'orderBringToFront' });
      } else {
        dispatch({ type: isLeft ? 'orderBack' : 'orderForward' });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugOpen, sectionTemplateOpen, spacerMenuOpen, state]);

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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Undo · Cmd + Z"
                aria-label="Undo"
                disabled={historyState.past.length === 0}
                onClick={() => dispatch({ type: 'undo' })}
                className="h-8 w-8 rounded-md border border-white/12 bg-white/4 p-0 text-white hover:bg-white/10 disabled:opacity-35"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Redo · Cmd + Shift + Z"
                aria-label="Redo"
                disabled={historyState.future.length === 0}
                onClick={() => dispatch({ type: 'redo' })}
                className="h-8 w-8 rounded-md border border-white/12 bg-white/4 p-0 text-white hover:bg-white/10 disabled:opacity-35"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[84px_minmax(0,1fr)_300px]">
          <aside className="relative z-30 overflow-visible border-r border-slate-200/80 bg-white/95 shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] backdrop-blur">
            <div className="flex h-full flex-col gap-4 overflow-visible p-3">
              <div className="overflow-visible rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
                <InsertPanel
                  onOpenSectionTemplates={() => setSectionTemplateOpen(true)}
                  onInsertWrapper={(role) => dispatch({ type: 'insertWrapper', role })}
                  onInsertLeaf={(role) => dispatch({ type: 'insertLeaf', role })}
                />
              </div>
              <div className="mt-auto flex justify-center">
                <div className="relative flex flex-col gap-2 overflow-visible">
                  <button
                    type="button"
                    aria-pressed={state.ui.previewSticky}
                    onClick={() => dispatch({ type: 'setPreviewSticky', value: !state.ui.previewSticky })}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                      state.ui.previewSticky
                        ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22)]'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] group-hover:block">
                      {state.ui.previewSticky ? 'Disable sticky preview' : 'Enable sticky preview'}
                    </span>
                  </button>
                  <div ref={spacerMenuRef} className="group relative">
                    <button
                      type="button"
                      data-panel-trigger="spacer-visibility"
                      aria-haspopup="menu"
                      aria-expanded={spacerMenuOpen}
                      onClick={() => setSpacerMenuOpen((open) => !open)}
                      aria-pressed={state.ui.spacerVisibility === 'all'}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                        state.ui.spacerVisibility === 'all'
                          ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22)]'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <SpacerIcon className="h-4 w-4" />
                    </button>
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] group-hover:block">
                      Spacer visibility
                    </span>
                    {spacerMenuOpen ? (
                      <div className="absolute left-[calc(100%+8px)] top-1/2 z-[95] min-w-[140px] -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_12px_24px_rgba(18,32,51,0.12)]">
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'setSpacerVisibility', value: 'selected' });
                          setSpacerMenuOpen(false);
                        }}
                        className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                          state.ui.spacerVisibility === 'selected'
                            ? 'bg-[#3772ff] text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Selected spacers
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'setSpacerVisibility', value: 'all' });
                          setSpacerMenuOpen(false);
                        }}
                        className={`mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                          state.ui.spacerVisibility === 'all'
                            ? 'bg-[#3772ff] text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        All spacers
                      </button>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-pressed={state.ui.showGridLanes}
                    onClick={() => dispatch({ type: 'setShowGridLanes', value: !state.ui.showGridLanes })}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                      state.ui.showGridLanes
                        ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22)]'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] group-hover:block">
                      {state.ui.showGridLanes ? 'Hide grid lanes' : 'Show grid lanes'}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={state.ui.snapEnabled}
                    onClick={() => dispatch({ type: 'setSnapEnabled', value: !state.ui.snapEnabled })}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                      state.ui.snapEnabled
                        ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22)]'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Magnet className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] group-hover:block">
                      {state.ui.snapEnabled ? 'Disable snap (Alt reverses)' : 'Enable snap (Alt reverses)'}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-panel-trigger="debug-tools"
                    aria-pressed={debugOpen}
                    onClick={() => setDebugOpen((open) => !open)}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                      debugOpen
                        ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22)]'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <SearchCode className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] group-hover:block">
                      {debugOpen ? 'Hide debug tools' : 'Show debug tools'}
                    </span>
                  </button>
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
        <div
          ref={sectionTemplatePanelRef}
          className="fixed left-[102px] top-[72px] z-[300] w-[440px] rounded-xl border border-slate-200 bg-white shadow-[0_16px_34px_rgba(18,32,51,0.18)]"
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Section templates</div>
              <div className="mt-0.5 text-xs text-slate-500">Choose a layout to insert.</div>
            </div>
            <button
              type="button"
              onClick={() => setSectionTemplateOpen(false)}
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
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
                  }}
                  className="group flex min-h-[104px] flex-col rounded-lg border border-slate-200 bg-white p-2.5 text-left transition hover:border-[#3772ff] hover:bg-[#f6f9ff]"
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
        </div>
      ) : null}

      {debugOpen ? (
        <div
          ref={debugPanelRef}
          className="fixed bottom-4 left-[102px] z-[300] w-[440px] rounded-xl border border-slate-200 bg-white shadow-[0_16px_34px_rgba(18,32,51,0.18)]"
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Debug tools</div>
              <div className="mt-0.5 text-xs text-slate-500">Validation, sticky math, stage reset</div>
            </div>
            <button
              type="button"
              onClick={() => setDebugOpen(false)}
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close debug tools panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Separator />
          <div className="max-h-[58vh] overflow-y-auto">
            <DebugPanel
              errors={errors}
              stickyState={stickyState}
              selectedNode={selectedNode}
              undoDepth={historyState.past.length}
              redoDepth={historyState.future.length}
              historyLimit={historyState.historyLimit}
              onClearHistory={() => dispatch({ type: 'clearHistory' })}
              onHistoryLimitChange={(value) => dispatch({ type: 'setHistoryLimit', value })}
              onExport={async () => {
                try {
                  await navigator.clipboard.writeText(
                    JSON.stringify(state.document, null, 2),
                  );
                  return true;
                } catch {
                  return false;
                }
              }}
              onReset={() => {
                clearPersistedState();
                window.location.reload();
              }}
            />
          </div>
        </div>
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
