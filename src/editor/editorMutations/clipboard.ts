import {
  createNodeFromExternalClipboardDoc,
  duplicateNodesDoc,
  pasteNodesFromClipboardDoc,
  type EditorNodeClipboardPayload,
  type ExternalClipboardData,
} from '../../api/documentApi';
import type { NodeId } from '../../model/types';
import type { EditorState } from '../types';
import { applySelectionToDocument } from './shared';

export function pasteClipboardNodes(
  state: EditorState,
  payload: EditorNodeClipboardPayload,
): EditorState {
  const result = pasteNodesFromClipboardDoc(state.document, payload, {
    selectedId: state.selectedId,
    activePageId: state.activePageId,
    offset: true,
  });
  if (result.document === state.document || result.pastedIds.length === 0) {
    return state;
  }
  return applySelectionToDocument(state, result.document, result.pastedIds);
}

export function duplicateSelection(state: EditorState, nodeIds?: NodeId[]): EditorState {
  const selectedIds = nodeIds ?? state.selectedIds;
  const result = duplicateNodesDoc(state.document, selectedIds, {
    selectedId: state.selectedId,
    activePageId: state.activePageId,
    offset: true,
  });
  if (result.document === state.document || result.pastedIds.length === 0) {
    return state;
  }
  return applySelectionToDocument(state, result.document, result.pastedIds);
}

export function pasteExternalClipboard(
  state: EditorState,
  data: ExternalClipboardData,
): EditorState {
  const result = createNodeFromExternalClipboardDoc(state.document, data, {
    selectedId: state.selectedId,
    activePageId: state.activePageId,
  });
  if (result.document === state.document || result.pastedIds.length === 0) {
    return state;
  }
  return applySelectionToDocument(state, result.document, result.pastedIds);
}
