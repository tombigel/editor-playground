import type { ContainerNode, DocumentModel, DocumentNode } from '../../model/types';
import { isContainerNode } from '../../model/types';
import type { EditorState } from '../types';
import { normalizeSelectedIds } from '../selection';

export type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function assertWrapper(node: DocumentNode): ContainerNode {
  if (!isContainerNode(node)) {
    throw new Error(`Expected container, got ${node.contentType}`);
  }
  return node;
}

export function applySelectionToDocument(state: EditorState, document: DocumentModel, selectedIds = state.selectedIds) {
  const normalized = normalizeSelectedIds(document, selectedIds);
  return {
    ...state,
    document,
    selectedId: normalized[0] ?? null,
    selectedIds: normalized,
  };
}
