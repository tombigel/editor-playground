import {
  SECTION_TEMPLATES,
  createInitialDocument,
  createSectionFromTemplate,
  type SectionTemplateId,
} from '../model/defaults';
import { getChildren, getNode } from '../model/selectors';
import type {
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
  LeafRole,
  NodeId,
  StickyDefinition,
  WrapperNode,
  WrapperRole,
} from '../model/types';
import { formatValue, parseFontSizeValue, parseHeightValue, parseUnitValue, parseWidthValue, resolveUnitValuePx } from '../model/units';
import { validateDocument } from '../model/validation';

export type {
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
  LeafRole,
  NodeId,
  StickyDefinition,
  WrapperNode,
  WrapperRole,
};

export {
  SECTION_TEMPLATES,
  createInitialDocument,
  createSectionFromTemplate,
  formatValue,
  getChildren,
  getNode,
  parseHeightValue,
  parseFontSizeValue,
  parseUnitValue,
  parseWidthValue,
  resolveUnitValuePx,
  validateDocument,
};

export type DocumentCommand =
  | { type: 'setRect'; nodeId: NodeId; field: 'x' | 'y' | 'width' | 'height'; value: string }
  | { type: 'setSticky'; nodeId: NodeId; patch: Partial<StickyDefinition> }
  | { type: 'setText'; nodeId: NodeId; field: 'name' | 'content' | 'label' | 'href' | 'src' | 'alt'; value: string };

export function cloneDocument(document: DocumentModel): DocumentModel {
  return {
    rootId: document.rootId,
    nodes: structuredClone(document.nodes),
  };
}

export function applyDocumentCommands(document: DocumentModel, commands: DocumentCommand[]): DocumentModel {
  return commands.reduce((next, command) => {
    switch (command.type) {
      case 'setRect':
        return setNodeRect(next, command.nodeId, command.field, command.value);
      case 'setSticky':
        return setNodeSticky(next, command.nodeId, command.patch);
      case 'setText':
        return setNodeTextField(next, command.nodeId, command.field, command.value);
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
  if (!node || node.type === 'site') {
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

export function setNodeSticky(
  document: DocumentModel,
  nodeId: NodeId,
  patch: Partial<StickyDefinition>,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.type === 'site') {
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

export function setNodeTextField(
  document: DocumentModel,
  nodeId: NodeId,
  field: 'name' | 'content' | 'htmlTag' | 'label' | 'href' | 'src' | 'alt',
  value: string,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.type === 'site') {
    return document;
  }

  if (field === 'name') {
    node.name = value;
    return next;
  }

  if (field === 'content' && node.type === 'leaf' && node.role === 'text') {
    node.content = value;
    return next;
  }

  if (field === 'htmlTag' && node.type === 'leaf' && node.role === 'text') {
    node.htmlTag =
      value === 'h1' ||
      value === 'h2' ||
      value === 'h3' ||
      value === 'h4' ||
      value === 'h5' ||
      value === 'h6' ||
      value === 'blockquote' ||
      value === 'div'
        ? value
        : 'p';
    return next;
  }

  if (field === 'label' && node.type === 'leaf' && 'label' in node) {
    node.label = value;
    return next;
  }

  if (field === 'href' && node.type === 'leaf' && node.role === 'link') {
    node.href = value;
    return next;
  }

  if (field === 'src' && node.type === 'leaf' && node.role === 'image') {
    node.src = value;
    return next;
  }

  if (field === 'alt' && node.type === 'leaf' && node.role === 'image') {
    node.alt = value;
    return next;
  }

  return document;
}

export function parseDocumentJson(raw: string): DocumentModel {
  const parsed = JSON.parse(raw) as DocumentModel;
  const errors = validateDocument(parsed);
  if (errors.length > 0) {
    throw new Error(`Invalid document: ${errors.join('; ')}`);
  }
  return parsed;
}

export function serializeDocumentJson(document: DocumentModel): string {
  return JSON.stringify(document, null, 2);
}

export function insertSectionTemplateBeforeFooter(
  document: DocumentModel,
  templateId: SectionTemplateId,
): DocumentModel {
  const next = cloneDocument(document);
  const root = next.nodes[next.rootId];
  if (!root || root.type !== 'site') {
    return document;
  }

  const build = createSectionFromTemplate(templateId, root.id);
  const footerIndex = root.children.findIndex((id) => {
    const node = next.nodes[id];
    return node?.type === 'wrapper' && node.role === 'footer';
  });

  const insertionIndex = footerIndex >= 0 ? footerIndex : root.children.length;
  root.children.splice(insertionIndex, 0, build.wrapper.id);
  Object.assign(next.nodes, build.nodes);

  return next;
}
