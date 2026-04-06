import type { DocumentModel, NodeId } from '../../model/types';
import { isSiteNode, isContainerNode, isLeafNode } from '../../model/types';
import type {
  CachedSnapTargets,
  SnapTarget,
  StageMathWrapperNode as WrapperNode,
} from '../types';

const SNAP_THRESHOLD_PX = 8;

export function collectVerticalSnapTargets(
  draggedId: string,
  documentRef: Pick<Document, 'querySelectorAll'> = document,
) {
  const targets: SnapTarget[] = [];
  const nodes = documentRef.querySelectorAll<HTMLElement>('.stage-canvas [data-node-id]');
  for (const element of nodes) {
    if (element.dataset.nodeId === draggedId) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.height < 1 || rect.width < 1) {
      continue;
    }
    targets.push(
      { value: rect.top, source: 'component', anchor: 'edge' },
      { value: rect.top + rect.height / 2, source: 'component', anchor: 'center' },
      { value: rect.bottom, source: 'component', anchor: 'edge' },
    );
  }
  return targets;
}

export function collectPageSnapTargets(
  documentRef: Pick<Document, 'querySelector'> = window.document,
  windowRef: Pick<Window, 'innerWidth' | 'innerHeight'> = window,
) {
  const frame = documentRef.querySelector<HTMLElement>('.stage-frame');
  if (!frame) {
    return {
      horizontal: [
        { value: 0, source: 'page' as const, anchor: 'edge' as const },
        { value: windowRef.innerWidth / 2, source: 'page' as const, anchor: 'center' as const },
        { value: windowRef.innerWidth, source: 'page' as const, anchor: 'edge' as const },
      ],
      vertical: [
        { value: 0, source: 'page' as const, anchor: 'edge' as const },
        { value: windowRef.innerHeight / 2, source: 'page' as const, anchor: 'center' as const },
        { value: windowRef.innerHeight, source: 'page' as const, anchor: 'edge' as const },
      ],
    };
  }

  const rect = frame.getBoundingClientRect();
  return {
    horizontal: [
      { value: rect.left, source: 'page' as const, anchor: 'edge' as const },
      { value: rect.left + rect.width / 2, source: 'page' as const, anchor: 'center' as const },
      { value: rect.right, source: 'page' as const, anchor: 'edge' as const },
    ],
    vertical: [
      { value: rect.top, source: 'page' as const, anchor: 'edge' as const },
      { value: rect.top + rect.height / 2, source: 'page' as const, anchor: 'center' as const },
      { value: rect.bottom, source: 'page' as const, anchor: 'edge' as const },
    ],
  };
}

export function findDropWrapper(
  model: DocumentModel,
  draggedId: NodeId,
  clientX: number,
  clientY: number,
  documentRef: Pick<Document, 'elementFromPoint' | 'querySelectorAll'> = window.document,
) {
  const target = documentRef.elementFromPoint(clientX, clientY) as HTMLElement | null;
  const draggedNode = model.nodes[draggedId];
  if (!target || !draggedNode || isSiteNode(draggedNode) || !draggedNode.parentId) {
    return null;
  }

  const visited = new Set<string>();
  let current: HTMLElement | null = target;
  while (current) {
    const wrapperId = current.dataset.dropWrapperId;
    if (wrapperId && !visited.has(wrapperId)) {
      visited.add(wrapperId);
      const candidate = model.nodes[wrapperId];
      if (
        candidate &&
        isContainerNode(candidate) &&
        isValidDropParent(model, draggedNode, candidate)
      ) {
        return {
          wrapperId,
          element: current,
          rect: current.getBoundingClientRect(),
        };
      }
    }
    current = current.parentElement;
  }

  const fallback = findDropWrapperElement(draggedNode.parentId, documentRef);
  if (!fallback) {
    return null;
  }

  return {
    wrapperId: draggedNode.parentId,
    element: fallback,
    rect: fallback.getBoundingClientRect(),
  };
}

export function findDropWrapperElement(
  wrapperId: string,
  documentRef: Pick<Document, 'querySelectorAll'> = window.document,
) {
  const wrappers = documentRef.querySelectorAll<HTMLElement>('[data-drop-wrapper-id]');
  for (const wrapper of wrappers) {
    if (wrapper.dataset.dropWrapperId === wrapperId) {
      return wrapper;
    }
  }
  return null;
}

function isValidDropParent(
  model: DocumentModel,
  draggedNode: Exclude<import('../../model/types').DocumentNode, { contentType: 'site' }>,
  candidate: WrapperNode,
) {
  if (candidate.id === draggedNode.id) {
    return false;
  }

  if (isDescendant(model, candidate.id, draggedNode.id)) {
    return false;
  }

  if (isLeafNode(draggedNode)) {
    return true;
  }

  if (!isContainerNode(draggedNode) || draggedNode.subtype !== 'container') {
    return false;
  }

  if (candidate.subtype === 'container') {
    return true;
  }

  return candidate.subtype === 'section' || candidate.subtype === 'header' || candidate.subtype === 'footer';
}

function isDescendant(model: DocumentModel, candidateId: NodeId, targetAncestorId: NodeId) {
  let current: import('../../model/types').DocumentNode | undefined = model.nodes[candidateId];
  while (current?.parentId) {
    if (current.parentId === targetAncestorId) {
      return true;
    }
    current = model.nodes[current.parentId];
  }
  return false;
}

export function findHorizontalSnap(left: number, width: number, targets: SnapTarget[]) {
  const anchors = [left, left + width / 2, left + width];
  let best: { delta: number; distance: number; target: number; source: SnapTarget['source']; anchor: SnapTarget['anchor'] } | null = null;

  for (const target of targets) {
    for (const anchor of anchors) {
      const delta = target.value - anchor;
      const distance = Math.abs(delta);
      if (distance > SNAP_THRESHOLD_PX) {
        continue;
      }
      if (!best || distance < best.distance) {
        best = { delta, distance, target: target.value, source: target.source, anchor: target.anchor };
      }
    }
  }

  return best;
}

export function findVerticalSnap(top: number, height: number, targets: SnapTarget[]) {
  const anchors = [top, top + height / 2, top + height];
  let best: { delta: number; distance: number; target: number; source: SnapTarget['source']; anchor: SnapTarget['anchor'] } | null = null;

  for (const target of targets) {
    for (const anchor of anchors) {
      const delta = target.value - anchor;
      const distance = Math.abs(delta);
      if (distance > SNAP_THRESHOLD_PX) {
        continue;
      }
      if (!best || distance < best.distance) {
        best = { delta, distance, target: target.value, source: target.source, anchor: target.anchor };
      }
    }
  }

  return best;
}

export function collectAllSnapTargets(
  draggedId: string,
  documentRef: Pick<Document, 'querySelector' | 'querySelectorAll'> = window.document,
  windowRef: Pick<Window, 'innerWidth' | 'innerHeight'> = window,
): CachedSnapTargets {
  const pageTargets = collectPageSnapTargets(documentRef, windowRef);
  return {
    horizontal: pageTargets.horizontal,
    vertical: [
      ...collectVerticalSnapTargets(draggedId, documentRef),
      ...pageTargets.vertical,
    ],
  };
}
