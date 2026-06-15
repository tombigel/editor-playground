import type { DocumentModel, NodeId } from '../../model/types';
import { isContainerNode } from '../../model/types';
import { parseHeightValue } from '../../model/units';
import { cloneDocument } from './shared';

export type ParentExpansionRequest = {
  parentId: NodeId;
  minHeightPx: number;
};

export type ParentExpansionOptions = {
  parentExpansion?: ParentExpansionRequest;
};

export function expandParentHeightDoc(
  document: DocumentModel,
  parentExpansion: ParentExpansionRequest | undefined,
): DocumentModel {
  if (!parentExpansion || !Number.isFinite(parentExpansion.minHeightPx)) {
    return document;
  }

  const parent = document.nodes[parentExpansion.parentId];
  if (!parent || !isContainerNode(parent)) {
    return document;
  }

  const nextHeightPx = Math.max(0, Math.ceil(parentExpansion.minHeightPx));
  const currentHeight = parent.rect.height.base.parsed;
  if (!('unit' in currentHeight) && currentHeight.keyword === 'auto') {
    return document;
  }
  const currentHeightPx = 'unit' in currentHeight && currentHeight.unit === 'px'
    ? currentHeight.value
    : 0;
  if (nextHeightPx <= currentHeightPx) {
    return document;
  }

  const next = cloneDocument(document);
  const nextParent = next.nodes[parentExpansion.parentId];
  if (!nextParent || !isContainerNode(nextParent)) {
    return document;
  }

  nextParent.rect.height.base = parseHeightValue(`${nextHeightPx}px`);
  return next;
}
