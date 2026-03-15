import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { CircleQuestionMark, Eye, Magnet, Redo2, Settings, Undo2, X } from 'lucide-react';
import {
  SECTION_TEMPLATES,
  cancelPromoteWrapperRole,
  clearSessionState,
  clearPersistedState,
  confirmPromoteWrapperRole,
  createFactoryResetState,
  deleteNode,
  demoteWrapperRole,
  getAdjacentStageSelection,
  getNode,
  getStageSelectableNodeIds,
  importDocument as importEditorDocument,
  getValidationErrors,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  loadPersistedState,
  moveNode,
  nudgeNode,
  parseImportedDocumentJson,
  parseUnitValue,
  persistDefaultDocument,
  type DocumentModel,
  type EditorState,
  type EditorTextField,
  type NodeId,
  type SectionTemplateId,
  persistState,
  reparentNode,
  reorderNode,
  requestPromoteWrapperRole,
  resizeNode,
  selectNode,
  serializeDocumentJson,
  resolveStickyLayout,
  type StickyGeometrySnapshot,
  type StickyLayoutState,
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
import { resolveThemeMode, type ResolvedTheme, type ThemeMode } from '@/lib/theme';
import {
  appendHistoryEntry,
  applyHistoryEntry,
  buildHistoryEntry,
  clampHistoryLimit,
  type HistoryEntry,
} from './history';
import { scrollSelectedStageNodeIntoView } from './selectionScroll';

type EditorAction =
  | { type: 'select'; id: string | null }
  | { type: 'insertWrapper'; role: 'section' | 'container' }
  | { type: 'insertSectionTemplate'; templateId: SectionTemplateId }
  | { type: 'insertLeaf'; role: 'text' | 'image' | 'link' | 'button' }
  | { type: 'move'; id: string; x: string; y: string }
  | { type: 'reparent'; id: string; parentId: string; x: string; y: string }
  | { type: 'resize'; id: string; width: string; height: string }
  | { type: 'text'; field: EditorTextField; value: string }
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
  | { type: 'nudgeSelection'; deltaX: number; deltaY: number }
  | { type: 'importDocument'; document: DocumentModel }
  | { type: 'setPreviewSticky'; value: boolean }
  | { type: 'setSpacerVisibility'; value: 'selected' | 'all' }
  | { type: 'setShowGridLanes'; value: boolean }
  | { type: 'setSnapEnabled'; value: boolean }
  | { type: 'setThemeMode'; value: ThemeMode };

type HistoryAction =
  | EditorAction
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clearHistory' }
  | { type: 'resetData' }
  | { type: 'resetAll' }
  | { type: 'setHistoryLimit'; value: number }
  | { type: 'beginResize'; id: NodeId }
  | { type: 'endResize'; id: NodeId };

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

function getTopbarIconButtonClass(theme: ResolvedTheme) {
  return theme === 'dark'
    ? 'h-8 w-8 rounded-md border border-white/10 bg-white/[0.035] p-0 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-white/14 hover:bg-white/[0.065] hover:text-white/92 focus-visible:border-white/20 focus-visible:bg-white/[0.08] focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131720]'
    : 'h-8 w-8 rounded-md border border-[#5d90ff] bg-[#1f5de6] p-0 text-white shadow-[0_8px_18px_rgba(18,48,128,0.18),inset_0_1px_0_rgba(255,255,255,0.07)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-[#81a9ff] hover:bg-[#1854d9] hover:text-white hover:shadow-[0_10px_22px_rgba(18,48,128,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] focus-visible:border-[#8db1ff] focus-visible:bg-[#1854d9] focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2f6df6]';
}

function getTopbarActiveButtonClass(theme: ResolvedTheme) {
  return theme === 'dark'
    ? 'h-8 w-8 rounded-md border border-white/16 bg-white/[0.12] p-0 text-white shadow-[0_8px_18px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-white/22 hover:bg-white/[0.16] hover:text-white focus-visible:border-white/24 focus-visible:bg-white/[0.16] focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131720]'
    : 'h-8 w-8 rounded-md border border-[#8ab0ff] bg-[#4f83fd] p-0 text-white shadow-[0_12px_26px_rgba(18,48,128,0.24),inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-[#a3c0ff] hover:bg-[#6694ff] hover:text-white hover:shadow-[0_14px_30px_rgba(18,48,128,0.28),inset_0_0_0_1px_rgba(255,255,255,0.1)] focus-visible:border-[#a9c4ff] focus-visible:bg-[#6694ff] focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2f6df6]';
}

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
      {
        const parsedDuration = parseUnitValue(`${action.value}vh`);
        return selectedId
          ? updateStickyField(state, selectedId, {
              duration: parsedDuration,
              durationTop: selectedNodeHasTopEdge(state, selectedId) ? parsedDuration : undefined,
              durationBottom: selectedNodeHasBottomEdge(state, selectedId) ? parsedDuration : undefined,
            })
          : state;
      }
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
    case 'nudgeSelection':
      return selectedId ? nudgeNode(state, selectedId, { x: action.deltaX, y: action.deltaY }) : state;
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
    case 'setThemeMode':
      return { ...state, ui: { ...state.ui, themeMode: action.value } };
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

  if (action.type === 'resetData') {
    return {
      ...state,
      present: createFactoryResetState(state.present.ui),
      past: [],
      future: [],
      activeResize: null,
    };
  }

  if (action.type === 'resetAll') {
    return {
      ...state,
      present: createFactoryResetState(),
      past: [],
      future: [],
      historyLimit: DEFAULT_HISTORY_LIMIT,
      activeResize: null,
    };
  }

  if (action.type === 'setHistoryLimit') {
    const nextLimit = clampHistoryLimit(action.value, DEFAULT_HISTORY_LIMIT, MIN_HISTORY_LIMIT, MAX_HISTORY_LIMIT);
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
  const [stickyGeometry, setStickyGeometry] = useState<StickyGeometrySnapshot>({});
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const sectionTemplatePanelRef = useRef<HTMLDivElement | null>(null);
  const shortcutPlatform = getShortcutPlatform();
  const selectedNode = getNode(state.document, state.selectedId);
  const orderState = getNodeOrderState(state, selectedNode);
  const sectionOrderState = getSectionOrderState(state, selectedNode);
  const errors = useMemo(() => getValidationErrors(state), [state]);
  const stickyLayout = useMemo<StickyLayoutState>(
    () => resolveStickyLayout(state.document, stickyGeometry),
    [state.document, stickyGeometry],
  );
  const documentJson = useMemo(() => serializeDocumentJson(state.document), [state.document]);
  const stageSelectableIds = useMemo(() => getStageSelectableNodeIds(state.document), [state.document]);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const resolvedTheme = useMemo<ResolvedTheme>(
    () => resolveThemeMode(state.ui.themeMode, systemPrefersDark),
    [state.ui.themeMode, systemPrefersDark],
  );
  const topbarClass =
    resolvedTheme === 'dark'
      ? 'editor-topbar border-b border-white/10 bg-[#131720] px-4 text-white shadow-[0_1px_0_rgba(255,255,255,0.04)]'
      : 'editor-topbar border-b border-[#245fe2] bg-[#2f6df6] px-4 text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]';
  const topbarIconButtonClass = getTopbarIconButtonClass(resolvedTheme);
  const topbarActiveButtonClass = getTopbarActiveButtonClass(resolvedTheme);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updatePreference = () => setSystemPrefersDark(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    document.body.dataset.editorTheme = resolvedTheme;
    document.documentElement.dataset.editorTheme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;

    return () => {
      delete document.body.dataset.editorTheme;
      delete document.documentElement.dataset.editorTheme;
      document.documentElement.style.colorScheme = '';
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (!state.selectedId || typeof window === 'undefined') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollSelectedStageNodeIntoView(state.selectedId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [state.selectedId]);

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
      const stageFocus = hasStageKeyboardFocus(active);

      if (stageFocus && event.key === 'Tab') {
        const nextSelection = getAdjacentStageSelection(
          state.document,
          state.selectedId,
          event.shiftKey ? 'backward' : 'forward',
        );
        if (nextSelection) {
          event.preventDefault();
          dispatch({ type: 'select', id: nextSelection });
        }
        return;
      }

      const shortcut = findMatchingShortcut(
        event,
        {
          interactiveFocus,
          hasSelection: Boolean(state.selectedId),
          hasDismissiblePanels: sectionTemplateOpen || settingsOpen || shortcutHelpOpen,
          hasStageFocus: stageFocus,
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
        case 'nudgeSelectionLeft':
          dispatch({ type: 'nudgeSelection', deltaX: event.shiftKey ? -10 : -1, deltaY: 0 });
          return;
        case 'nudgeSelectionRight':
          dispatch({ type: 'nudgeSelection', deltaX: event.shiftKey ? 10 : 1, deltaY: 0 });
          return;
        case 'nudgeSelectionUp':
          dispatch({ type: 'nudgeSelection', deltaX: 0, deltaY: event.shiftKey ? -10 : -1 });
          return;
        case 'nudgeSelectionDown':
          dispatch({ type: 'nudgeSelection', deltaX: 0, deltaY: event.shiftKey ? 10 : 1 });
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
    <div
      className="editor-shell h-screen w-screen overflow-hidden"
      data-editor-theme={resolvedTheme}
      data-theme-mode={state.ui.themeMode}
    >
      <div className="grid h-full grid-rows-[56px_minmax(0,1fr)]">
        <header className={topbarClass}>
          <div className="flex h-full items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/sticky_512.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
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
                content={
                  <>
                    <div className="leading-3.5 font-medium">Undo</div>
                    <div className="mt-0.5 font-mono text-[10px] font-light leading-3 text-slate-300">
                      {getShortcutLabel('undo', shortcutPlatform)}
                    </div>
                  </>
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Undo"
                  disabled={historyState.past.length === 0}
                  onClick={() => dispatch({ type: 'undo' })}
                  className={topbarIconButtonClass}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </PopoverTooltip>
              <PopoverTooltip
                side="bottom"
                align="end"
                className={TOPBAR_TOOLTIP_CLASS}
                content={
                  <>
                    <div className="leading-3.5 font-medium">Redo</div>
                    <div className="mt-0.5 font-mono text-[10px] font-light leading-3 text-slate-300">
                      {getShortcutLabel('redo', shortcutPlatform)}
                    </div>
                  </>
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Redo"
                  disabled={historyState.future.length === 0}
                  onClick={() => dispatch({ type: 'redo' })}
                  className={topbarIconButtonClass}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </PopoverTooltip>
              <PopoverTooltip
                side="bottom"
                align="end"
                className={TOPBAR_TOOLTIP_CLASS}
                content={
                  <>
                    <div className="leading-3.5 font-medium">Keyboard shortcuts</div>
                    <div className="mt-0.5 font-mono text-[10px] font-light leading-3 text-slate-300">
                      {getShortcutLabel('showShortcutHelp', shortcutPlatform)}
                    </div>
                  </>
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Keyboard shortcuts"
                  aria-expanded={shortcutHelpOpen}
                  onClick={() => setShortcutHelpOpen((open) => !open)}
                  className={shortcutHelpOpen ? topbarActiveButtonClass : topbarIconButtonClass}
                >
                  <CircleQuestionMark className="h-4 w-4" />
                </Button>
              </PopoverTooltip>
              <PopoverTooltip
                side="bottom"
                align="end"
                className={TOPBAR_TOOLTIP_CLASS}
                content={
                  <>
                    <div className="leading-3.5 font-medium">Settings</div>
                    <div className="mt-0.5 font-mono text-[10px] font-light leading-3 text-slate-300">
                      {getShortcutLabel('openSettings', shortcutPlatform)}
                    </div>
                  </>
                }
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
                  className={settingsOpen ? topbarActiveButtonClass : topbarIconButtonClass}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTooltip>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[84px_minmax(0,1fr)_300px]">
          <aside className="editor-rail-shell editor-border-subtle relative z-[360] overflow-visible border-r shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] backdrop-blur">
            <div className="flex h-full flex-col gap-4 overflow-visible p-3">
              <div className="editor-bg-subtle editor-border-subtle overflow-visible rounded-2xl border p-2">
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

          <main className="editor-workspace-shell relative min-h-0 overflow-hidden">
            <Stage
              document={state.document}
              selectedId={state.selectedId}
              previewSticky={state.ui.previewSticky}
              spacerVisibility={state.ui.spacerVisibility}
              showGridLanes={state.ui.showGridLanes}
              snapEnabled={state.ui.snapEnabled}
              onStageFocus={() => {
                if (!state.selectedId && stageSelectableIds.length > 0) {
                  dispatch({ type: 'select', id: stageSelectableIds[0] });
                }
              }}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onMove={(id, x, y) => dispatch({ type: 'move', id, x, y })}
              onReparent={(id, parentId, x, y) => dispatch({ type: 'reparent', id, parentId, x, y })}
              onResize={(id, width, height) => dispatch({ type: 'resize', id, width, height })}
              onResizeStart={(id) => dispatch({ type: 'beginResize', id })}
              onResizeEnd={(id) => dispatch({ type: 'endResize', id })}
              onStickyGeometryChange={setStickyGeometry}
            />

          </main>

          <aside className="editor-inspector-shell editor-border-subtle min-h-0 overflow-hidden border-l shadow-[-8px_0_24px_rgba(18,32,51,0.03)]">
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
          className="editor-floating-panel editor-section-templates editor-bg-surface editor-border-subtle fixed w-[440px] rounded-xl border shadow-[0_16px_34px_rgba(18,32,51,0.18)]"
          style={{
            top: `${sectionTemplatePosition.top}px`,
            left: `${sectionTemplatePosition.left}px`,
          }}
        >
          <div className="editor-border-subtle flex items-start justify-between border-b px-4 py-3">
            <div>
              <div className="editor-text-strong text-sm font-semibold">Section templates</div>
              <div className="editor-text-muted mt-0.5 text-xs">Choose a layout to insert.</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="editor-icon-button-subtle rounded-lg border focus-visible:ring-blue-500/45"
              onClick={() => {
                setSectionTemplateOpen(false);
                setSectionTemplateAnchor(null);
              }}
              aria-label="Close section templates panel"
            >
              <X className="h-4 w-4" />
            </Button>
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
                  className="editor-template-card group flex min-h-[104px] flex-col rounded-lg border p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="editor-text-strong text-xs font-semibold">{template.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        template.category === 'sticky'
                          ? 'editor-template-tag'
                          : 'editor-pill-subtle'
                      }`}
                    >
                      {template.category === 'sticky' ? 'Sticky' : 'Basic'}
                    </span>
                  </div>
                  <span className="editor-text-muted mt-1.5 text-[11px] leading-4">{template.description}</span>
                </button>
              ))}
              {UPCOMING_SCROLL_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="editor-template-card-muted editor-border-subtle flex min-h-[104px] flex-col rounded-lg border border-dashed p-2.5 text-left opacity-85"
                >
                  <div className="flex items-center justify-between">
                    <span className="editor-text-strong text-xs font-semibold">{template.name}</span>
                    <span className="editor-pill-subtle rounded px-1.5 py-0.5 text-[10px] font-medium">
                      Soon
                    </span>
                  </div>
                  <span className="editor-text-muted mt-1.5 text-[11px] leading-4">{template.description}</span>
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
            stickyLayout={stickyLayout}
            selectedNode={selectedNode}
            previewSticky={state.ui.previewSticky}
            spacerVisibility={state.ui.spacerVisibility}
            showGridLanes={state.ui.showGridLanes}
            snapEnabled={state.ui.snapEnabled}
            themeMode={state.ui.themeMode}
            undoDepth={historyState.past.length}
            redoDepth={historyState.future.length}
            historyLimit={historyState.historyLimit}
            onClose={() => setSettingsOpen(false)}
            onPreviewStickyChange={(value) => dispatch({ type: 'setPreviewSticky', value })}
            onSpacerVisibilityChange={(value) => dispatch({ type: 'setSpacerVisibility', value })}
            onShowGridLanesChange={(value) => dispatch({ type: 'setShowGridLanes', value })}
            onSnapEnabledChange={(value) => dispatch({ type: 'setSnapEnabled', value })}
            onThemeModeChange={(value) => dispatch({ type: 'setThemeMode', value })}
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
            onResetData={() => {
              const next = createFactoryResetState(state.ui);
              clearSessionState();
              persistDefaultDocument(next.document);
              dispatch({ type: 'resetData' });
            }}
            onResetAll={() => {
              clearPersistedState();
              persistDefaultDocument(createFactoryResetState().document);
              dispatch({ type: 'resetAll' });
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

function hasStageKeyboardFocus(element: HTMLElement | null) {
  return Boolean(element?.closest('[data-stage-focus-scope="true"]'));
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
      content={
        shortcut ? (
          <>
            <div className="leading-3.5 font-medium">{label}</div>
            <div className="mt-0.5 font-mono text-[10px] font-light leading-3 text-slate-300">{shortcut}</div>
          </>
        ) : (
          <div className="leading-3.5 font-medium">{detail ? `${label} · ${detail}` : label}</div>
        )
      }
    >
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onClick}
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
          pressed
            ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22),inset_0_0_0_1px_rgba(34,87,214,0.42)] hover:border-[#6f9dff] hover:bg-[#4a7ffc] hover:shadow-[0_16px_30px_rgba(55,114,255,0.3),inset_0_0_0_1px_rgba(34,87,214,0.6)]'
            : 'editor-icon-button-subtle editor-text-strong shadow-[0_2px_10px_rgba(18,32,51,0.05)] hover:shadow-[0_10px_22px_rgba(18,32,51,0.1)]'
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
    action.type !== 'setSnapEnabled' &&
    action.type !== 'setThemeMode'
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
