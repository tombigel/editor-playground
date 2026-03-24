import type { NodeId } from '../model/types';
import type { EditorState } from './types';
import { normalizeSelectedIds, toggleSelectedId, toggleSelectedIds } from './selection';

export type { ConfirmReplaceRole, EditorState, FocusedMode, NodeOrderAction } from './types';

// --- Persistence, normalization, migration ---
export {
  STORAGE_KEY,
  DEFAULT_DOCUMENT_STORAGE_KEY,
  createInitialState,
  loadPersistedState,
  persistState,
  persistDefaultDocument,
  clearSessionState,
  clearPersistedState,
  createFactoryResetState,
  parseImportedDocumentJson,
  cloneDocument,
  normalizeDocument,
  normalizeTextHtmlTag,
  isStructuralWrapper,
  createUniqueLeaf,
} from './editorPersistence';

// --- Document mutations ---
export {
  importDocument,
  insertWrapper,
  insertSectionTemplate,
  insertLeaf,
  updateTextField,
  updateRectField,
  updateStickyField,
  updateWrapperStyleField,
  moveNode,
  moveNodes,
  moveNodeInTree,
  nudgeNode,
  resizeNode,
  reorderNode,
  reorderNodes,
  setNodeVisibility,
  alignNodes,
  distributeNodes,
  reparentNode,
  reparentNodes,
  requestPromoteWrapperRole,
  confirmPromoteWrapperRole,
  cancelPromoteWrapperRole,
  demoteWrapperRole,
  deleteNode,
  deleteNodes,
  getValidationErrors,
} from './editorMutations';

// --- Selection (inline) ---

function applySelection(state: EditorState, selectedIds: NodeId[]) {
  const normalized = normalizeSelectedIds(state.document, selectedIds);
  return {
    ...state,
    selectedId: normalized[0] ?? null,
    selectedIds: normalized,
  };
}

export function selectNode(state: EditorState, selectedId: NodeId | null): EditorState {
  return applySelection(state, selectedId ? [selectedId] : []);
}

export function clearSelection(state: EditorState): EditorState {
  return applySelection(state, []);
}

export function toggleNodeSelection(state: EditorState, selectedId: NodeId): EditorState {
  return applySelection(state, toggleSelectedId(state.selectedIds, selectedId));
}

export function selectManyNodes(
  state: EditorState,
  selectedIds: NodeId[],
  mode: 'replace' | 'toggle',
): EditorState {
  return applySelection(
    state,
    mode === 'toggle' ? toggleSelectedIds(state.selectedIds, selectedIds) : selectedIds,
  );
}
