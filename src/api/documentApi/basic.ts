import { DOCUMENT_MODEL_VERSION } from '../../lib/version';
import { normalizeDocumentFontState } from '../../fonts';
import { migrateDocumentModel } from '../../model/migration';
import { stripDerivedCodeHighlightsFromTextNode } from '../../model/richContent';
import type { ContainerChildBoundary, DocumentModel, NodeId, StickyDefinition } from '../../model/types';
import { isContainerNode, isTextNode } from '../../model/types';
import { parseHeightValue, parseUnitValue, parseWidthValue } from '../../model/units';
import { validateDocument } from '../../model/validation';
import type { DocumentCommand } from '../types/index';
import { expandParentHeightDoc, type ParentExpansionOptions } from './parentExpansion';
import { cloneDocument } from './shared';
import { setTextNodeContentDoc } from './text';

export function applyDocumentCommands(document: DocumentModel, commands: DocumentCommand[]): DocumentModel {
  return commands.reduce((next, command) => {
    switch (command.type) {
      case 'setRect':
        return setNodeRect(next, command.nodeId, command.field, command.value);
      case 'setSticky':
        return setNodeSticky(next, command.nodeId, command.patch);
      case 'setText':
        return setTextNodeContentDoc(next, command.nodeId, command.field, command.value);
      default:
        return next;
    }
  }, cloneDocument(document));
}

export function setNodeRect(
  document: DocumentModel,
  nodeId: NodeId,
  field: 'x' | 'y' | 'width' | 'height',
  value: string,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return document;
  }

  if (field === 'x') {
    node.rect.x.base = parseUnitValue(value);
  } else if (field === 'y') {
    node.rect.y.base = parseUnitValue(value);
  } else if (field === 'width') {
    node.rect.width.base = parseWidthValue(value);
  } else {
    node.rect.height.base = parseHeightValue(value);
  }

  return next;
}

export function moveNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  patch: Partial<Record<'x' | 'y', string>>,
  options: ParentExpansionOptions = {},
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return document;
  }

  let changed = false;
  if (patch.x) {
    const nextX = parseUnitValue(patch.x);
    if (node.rect.x.base.raw !== nextX.raw) {
      node.rect.x.base = nextX;
      changed = true;
    }
  }
  if (patch.y) {
    const nextY = parseUnitValue(patch.y);
    if (node.rect.y.base.raw !== nextY.raw) {
      node.rect.y.base = nextY;
      changed = true;
    }
  }

  const moved = changed ? next : document;
  return expandParentHeightDoc(moved, options.parentExpansion);
}

export function moveNodesDoc(
  document: DocumentModel,
  moves: Array<{ id: NodeId; x: string; y: string }>,
  options: ParentExpansionOptions = {},
): DocumentModel {
  if (moves.length === 0) {
    return expandParentHeightDoc(document, options.parentExpansion);
  }

  const next = cloneDocument(document);
  let changed = false;

  for (const move of moves) {
    const node = next.nodes[move.id];
    if (!node || node.contentType === 'site') {
      continue;
    }

    const nextX = parseUnitValue(move.x);
    const nextY = parseUnitValue(move.y);
    if (node.rect.x.base.raw !== nextX.raw) {
      node.rect.x.base = nextX;
      changed = true;
    }
    if (node.rect.y.base.raw !== nextY.raw) {
      node.rect.y.base = nextY;
      changed = true;
    }
  }

  const moved = changed ? next : document;
  return expandParentHeightDoc(moved, options.parentExpansion);
}

export function resolveContainerChildBoundary(
  document: DocumentModel,
  containerId: NodeId | undefined | null,
): ContainerChildBoundary {
  if (!containerId) {
    return 'anchor';
  }
  const container = document.nodes[containerId];
  return container && isContainerNode(container) ? (container.layout?.childBoundary ?? 'anchor') : 'anchor';
}

export function setContainerChildBoundaryDoc(
  document: DocumentModel,
  containerId: NodeId,
  childBoundary: ContainerChildBoundary,
): DocumentModel {
  const next = cloneDocument(document);
  const container = next.nodes[containerId];
  if (!container || !isContainerNode(container)) {
    return document;
  }
  if ((container.layout?.childBoundary ?? 'anchor') === childBoundary) {
    return document;
  }

  container.layout = {
    ...container.layout,
    childBoundary,
  };
  return next;
}

export function setNodeSticky(
  document: DocumentModel,
  nodeId: NodeId,
  patch: Partial<StickyDefinition>,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    return document;
  }

  node.sticky = {
    enabled: false,
    target: 'self',
    edges: { top: true, bottom: false },
    durationMode: 'auto',
    duration: parseUnitValue('50vh'),
    durationTop: parseUnitValue('50vh'),
    durationBottom: parseUnitValue('50vh'),
    ...node.sticky,
    ...patch,
  };

  return next;
}

export function setSiteNodeStickyElevation(
  document: DocumentModel,
  enabled: boolean,
): DocumentModel {
  const next = cloneDocument(document);
  const site = next.nodes[next.rootId];
  if (site.contentType !== 'site') {
    return document;
  }
  site.stickyElevation = enabled;
  return next;
}

export function parseDocumentJson(raw: string): DocumentModel {
  // Migration is idempotent: legacy `type`/`role` documents are converted to
  // the canonical `contentType`/`subtype` model, current documents pass through.
  const parsed = normalizeDocumentFontState(migrateDocumentModel(JSON.parse(raw)));
  for (const node of Object.values(parsed.nodes)) {
    if (isTextNode(node)) {
      stripDerivedCodeHighlightsFromTextNode(node);
    }
  }
  const errors = validateDocument(parsed);
  if (errors.length > 0) {
    throw new Error(`Invalid document: ${errors.join('; ')}`);
  }
  return parsed;
}

export function serializeDocumentJson(document: DocumentModel): string {
  return JSON.stringify({ ...document, schemaVersion: DOCUMENT_MODEL_VERSION }, null, 2);
}
