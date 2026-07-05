import type { NodeId } from '../../model/types';
import { isContainerNode } from '../../model/types';
import {
  demoteWrapperRoleDoc,
  moveNodeInTreeDoc,
  promoteWrapperRoleDoc,
  reorderNodeDoc,
  reorderNodesDoc,
  reparentNodeAtDoc,
  reparentNodesAtDoc,
  type ParentExpansionOptions,
} from '../../api/documentApi';
import type { EditorState, NodeOrderAction } from '../types';
import { applySelectionToDocument } from './shared';

export function reorderNode(
  state: EditorState,
  nodeId: NodeId,
  action: NodeOrderAction,
): EditorState {
  const document = reorderNodeDoc(state.document, nodeId, action);
  return document === state.document ? state : { ...state, document };
}

export function reorderNodes(
  state: EditorState,
  nodeIds: NodeId[],
  action: NodeOrderAction,
): EditorState {
  const document = reorderNodesDoc(state.document, nodeIds, action);
  return document === state.document ? state : { ...state, document };
}

export function reparentNode(
  state: EditorState,
  nodeId: NodeId,
  parentId: NodeId,
  x: string,
  y: string,
  options: ParentExpansionOptions = {},
): EditorState {
  const document = reparentNodeAtDoc(state.document, nodeId, parentId, { x, y }, options);
  return document === state.document ? state : { ...state, document };
}

export function reparentNodes(
  state: EditorState,
  moves: Array<{ id: NodeId; x: string; y: string }>,
  parentId: NodeId,
  options: ParentExpansionOptions = {},
): EditorState {
  const document = reparentNodesAtDoc(state.document, parentId, moves, options);
  return document === state.document ? state : { ...state, document };
}

export function moveNodeInTree(
  state: EditorState,
  nodeId: NodeId,
  targetParentId: NodeId,
  targetIndex: number,
): EditorState {
  const document = moveNodeInTreeDoc(state.document, nodeId, targetParentId, targetIndex);
  if (document === state.document) {
    return state;
  }

  return {
    ...applySelectionToDocument(state, document),
    pendingRoleSwap: null,
  };
}

export function requestPromoteWrapperRole(
  state: EditorState,
  wrapperId: NodeId,
  targetRole: 'header' | 'footer',
): EditorState {
  const document = state.document;
  for (const node of Object.values(document.nodes)) {
    if (isContainerNode(node) && node.subtype === targetRole && node.id !== wrapperId) {
      return {
        ...state,
        pendingRoleSwap: {
          requestedId: wrapperId,
          targetRole,
          existingId: node.id,
        },
      };
    }
  }
  return applyPromoteWrapperRole(state, wrapperId, targetRole, false);
}

export function confirmPromoteWrapperRole(state: EditorState): EditorState {
  const pending = state.pendingRoleSwap;
  if (!pending) {
    return state;
  }
  const next = applyPromoteWrapperRole(
    { ...state, pendingRoleSwap: null },
    pending.requestedId,
    pending.targetRole,
    true,
  );
  return { ...next, pendingRoleSwap: null };
}

export function cancelPromoteWrapperRole(state: EditorState): EditorState {
  return { ...state, pendingRoleSwap: null };
}

function applyPromoteWrapperRole(
  state: EditorState,
  wrapperId: NodeId,
  targetRole: 'header' | 'footer',
  replaceExisting: boolean,
): EditorState {
  const document = promoteWrapperRoleDoc(state.document, wrapperId, targetRole, { replaceExisting });
  return document === state.document ? state : { ...state, document };
}

export function demoteWrapperRole(state: EditorState, wrapperId: NodeId): EditorState {
  const document = demoteWrapperRoleDoc(state.document, wrapperId);
  return document === state.document ? state : { ...state, document };
}
