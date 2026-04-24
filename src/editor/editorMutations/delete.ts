import type { DocumentModel, NodeId } from '../../model/types';
import type { EditorState } from '../types';
import { getTopLevelSelectedIds } from '../selection';
import { cloneDocument } from '../editorPersistence';
import { applySelectionToDocument } from './shared';

export function deleteNode(state: EditorState, nodeId: NodeId): EditorState {
  return deleteNodes(state, [nodeId]);
}

export function deleteNodes(state: EditorState, nodeIds: NodeId[]): EditorState {
  const document = cloneDocument(state.document);
  const nextNodeIds = getTopLevelSelectedIds(document, nodeIds);

  if (nextNodeIds.length === 0) {
    return state;
  }

  for (const nodeId of nextNodeIds) {
    const node = document.nodes[nodeId];
    if (!node || node.parentId === null) {
      continue;
    }
    removeRecursively(document, nodeId);
    const parent = document.nodes[node.parentId];
    if (parent) {
      parent.children = parent.children.filter((childId) => childId !== nodeId);
    }
  }

  return applySelectionToDocument(state, document);
}

function removeRecursively(document: DocumentModel, nodeId: NodeId) {
  const node = document.nodes[nodeId];
  for (const childId of node.children) {
    removeRecursively(document, childId);
  }
  delete document.nodes[nodeId];
}
