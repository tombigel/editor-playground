import { moveNodeInTreeDoc } from '../api/documentApi';
import type { DocumentModel, DocumentNode, NodeId } from '../model/types';
import { formatNodeLabel } from '../render/nodePresentation';
import { resolveStickyIsElevated } from '../render/sticky';

export type LayersTreeNode = Exclude<DocumentNode, { type: 'site' }>;
export type LayersDropPosition = 'before' | 'after' | 'inside';

export type LayersTreeRow = {
  id: NodeId;
  node: LayersTreeNode;
  depth: number;
  dividerBefore: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  displayName: string;
  typeLabel: string;
  isSticky: boolean;
  hasAnimation: boolean;
  isElevated: boolean;
};

export type LayersMoveTarget = {
  targetParentId: NodeId;
  targetIndex: number;
};

export function buildLayersTreeRows(
  document: DocumentModel,
  selectedIds: NodeId[],
  expandedIds: ReadonlySet<NodeId>,
): LayersTreeRow[] {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return [];
  }

  const globalStickyElevation = root.stickyElevation ?? true;
  const selectedIdSet = new Set(selectedIds);
  const rows: LayersTreeRow[] = [];
  let previousRootRoleGroup: 'header' | 'section' | 'footer' | null = null;

  for (const childId of root.children) {
    const child = document.nodes[childId];
    const roleGroup = resolveRootRoleGroup(child);
    const dividerBefore =
      rows.length > 0 &&
      roleGroup != null &&
      previousRootRoleGroup != null &&
      roleGroup !== previousRootRoleGroup;

    appendLayersTreeRow(document, childId, 0, expandedIds, selectedIdSet, rows, dividerBefore, globalStickyElevation);

    if (roleGroup != null) {
      previousRootRoleGroup = roleGroup;
    }
  }

  return rows;
}

export function getDefaultExpandedLayerIds(document: DocumentModel): NodeId[] {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return [];
  }

  return root.children.filter((childId) => document.nodes[childId]?.type === 'wrapper');
}

export function getAutoExpandedLayerIds(
  document: DocumentModel,
  selectedIds: NodeId[],
): NodeId[] {
  const autoExpandedIds = new Set<NodeId>();

  for (const selectedId of selectedIds) {
    let current = document.nodes[selectedId];
    while (current?.parentId) {
      const parent = document.nodes[current.parentId];
      if (!parent || parent.type === 'site') {
        break;
      }
      autoExpandedIds.add(parent.id);
      current = parent;
    }
  }

  return Array.from(autoExpandedIds);
}

export function resolveLayersDropTarget(
  document: DocumentModel,
  nodeId: NodeId,
  targetRowId: NodeId,
  position: LayersDropPosition,
): LayersMoveTarget | null {
  const target = document.nodes[targetRowId];
  if (!target || target.type === 'site') {
    return null;
  }

  if (position === 'inside') {
    if (target.type !== 'wrapper') {
      return null;
    }

    const candidate = {
      targetParentId: target.id,
      targetIndex: target.children.length,
    };
    return moveNodeInTreeDoc(document, nodeId, candidate.targetParentId, candidate.targetIndex) === document
      ? null
      : candidate;
  }

  if (!target.parentId) {
    return null;
  }

  const parent = document.nodes[target.parentId];
  if (!parent) {
    return null;
  }

  const targetIndex = parent.children.indexOf(target.id);
  if (targetIndex === -1) {
    return null;
  }

  const candidate = {
    targetParentId: parent.id,
    targetIndex: position === 'before' ? targetIndex : targetIndex + 1,
  };
  return moveNodeInTreeDoc(document, nodeId, candidate.targetParentId, candidate.targetIndex) === document
    ? null
    : candidate;
}

export function resolveProjectedLayersRole(
  document: DocumentModel,
  nodeId: NodeId,
  targetParentId: NodeId,
  targetIndex: number,
) {
  const next = moveNodeInTreeDoc(document, nodeId, targetParentId, targetIndex);
  if (next === document) {
    return null;
  }

  const movedNode = next.nodes[nodeId];
  if (
    !movedNode ||
    movedNode.type !== 'wrapper' ||
    (movedNode.role !== 'header' && movedNode.role !== 'section' && movedNode.role !== 'footer')
  ) {
    return null;
  }

  return formatNodeLabel(movedNode);
}

export function resolveLayersDropPosition(
  rowHeight: number,
  pointerOffsetY: number,
  canDropInside: boolean,
): LayersDropPosition {
  const edgeBandPx = Math.min(14, Math.max(8, rowHeight * 0.28));
  if (pointerOffsetY <= edgeBandPx) {
    return 'before';
  }
  if (pointerOffsetY >= rowHeight - edgeBandPx) {
    return 'after';
  }
  return canDropInside ? 'inside' : pointerOffsetY < rowHeight / 2 ? 'before' : 'after';
}

export function isLayersNodeDraggable(node: LayersTreeNode) {
  if (node.type === 'leaf') {
    return true;
  }

  return (
    node.role === 'section' ||
    node.role === 'header' ||
    node.role === 'footer' ||
    node.role === 'container'
  );
}

function appendLayersTreeRow(
  document: DocumentModel,
  nodeId: NodeId,
  depth: number,
  expandedIds: ReadonlySet<NodeId>,
  selectedIdSet: ReadonlySet<NodeId>,
  rows: LayersTreeRow[],
  dividerBefore = false,
  globalStickyElevation = true,
) {
  const node = document.nodes[nodeId];
  if (!node || node.type === 'site') {
    return;
  }

  const hasChildren = node.children.some((childId) => Boolean(document.nodes[childId]));
  const isExpanded = hasChildren && expandedIds.has(node.id);
  const typeLabel = formatNodeLabel(node);
  const isSticky = Boolean(node.sticky?.enabled);
  const hasAnimation = node.animation !== undefined;
  const isElevated = isSticky ? resolveStickyIsElevated(node.sticky!, globalStickyElevation) : false;
  rows.push({
    id: node.id,
    node,
    depth,
    dividerBefore,
    hasChildren,
    isExpanded,
    isSelected: selectedIdSet.has(node.id),
    displayName: node.name.trim() || typeLabel,
    typeLabel,
    isSticky,
    hasAnimation,
    isElevated,
  });

  if (!hasChildren || !isExpanded) {
    return;
  }

  for (const childId of node.children) {
    appendLayersTreeRow(document, childId, depth + 1, expandedIds, selectedIdSet, rows, false, globalStickyElevation);
  }
}

function resolveRootRoleGroup(node: DocumentNode | undefined) {
  if (!node || node.type !== 'wrapper') {
    return null;
  }

  if (node.role === 'header' || node.role === 'section' || node.role === 'footer') {
    return node.role;
  }

  return null;
}
