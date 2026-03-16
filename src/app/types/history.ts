import type { DocumentNode, EditorState, NodeId } from '../../api/editorApi';

export type NodePatch = {
  id: NodeId;
  before?: DocumentNode;
  after?: DocumentNode;
};

export type HistoryEntry = {
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
