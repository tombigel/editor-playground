import { deleteNodesDoc } from '../../api/documentApi';
import type { NodeId } from '../../model/types';
import type { EditorState } from '../types';
import { getTopLevelSelectedIds } from '../selection';
import { applySelectionToDocument } from './shared';

export function deleteNode(state: EditorState, nodeId: NodeId): EditorState {
  return deleteNodes(state, [nodeId]);
}

export function deleteNodes(state: EditorState, nodeIds: NodeId[]): EditorState {
  const nextNodeIds = getTopLevelSelectedIds(state.document, nodeIds);

  if (nextNodeIds.length === 0) {
    return state;
  }

  const document = deleteNodesDoc(state.document, nextNodeIds);
  return document === state.document ? state : applySelectionToDocument(state, document);
}
