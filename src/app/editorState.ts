import {
  cancelPromoteWrapperRole,
  confirmPromoteWrapperRole,
  createFactoryResetState,
  deleteNode,
  demoteWrapperRole,
  importDocument as importEditorDocument,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  loadPersistedState,
  moveNode,
  nudgeNode,
  parseUnitValue,
  reparentNode,
  reorderNode,
  requestPromoteWrapperRole,
  resizeNode,
  selectNode,
  updateRectField,
  updateStickyField,
  updateTextField,
  updateWrapperStyleField,
  type EditorState,
  type NodeId,
} from '../api/editorApi';
import {
  appendHistoryEntry,
  applyHistoryEntry,
  buildHistoryEntry,
  clampHistoryLimit,
} from './history';
import {
  selectedNodeDisallowsContentWrapperTarget,
  selectedNodeHasBottomEdge,
  selectedNodeHasTopEdge,
} from './appSelectors';
import type { EditorAction, HistoryAction, HistoryState } from './types';
export type { EditorAction, HistoryAction, HistoryState } from './types';

export const DEFAULT_HISTORY_LIMIT = 100;
export const MIN_HISTORY_LIMIT = 1;
export const MAX_HISTORY_LIMIT = 500;

export function editorReducer(state: EditorState, action: EditorAction) {
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
        return updateStickyField(state, selectedId, {
          duration: parsedDuration,
          durationTop: selectedNodeHasTopEdge(state, selectedId) ? parsedDuration : undefined,
          durationBottom: selectedNodeHasBottomEdge(state, selectedId) ? parsedDuration : undefined,
        });
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

export function createHistoryState(): HistoryState {
  return {
    present: loadPersistedState(),
    past: [],
    future: [],
    historyLimit: DEFAULT_HISTORY_LIMIT,
    activeResize: null,
  };
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
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
