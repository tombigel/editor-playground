import {
  SECTION_TEMPLATES,
  createInitialDocument,
  createSectionFromTemplate,
  type SectionTemplateId,
} from '../model/defaults';
import {
  addDocumentFontFamily,
  ensureDocumentFontFamilyByName,
  getDocumentFontLibrary,
  getFontUsage,
  isFontFamilyUsed,
  listDocumentFonts,
  normalizeDocumentFontState,
  purgeUnusedDocumentFonts,
  removeDocumentFontFamily,
  toggleDocumentFontFavorite,
} from '../fonts';
import { getLinkHref, normalizeNavigationKind, shouldOpenNavigationInNewTab } from '../model/links';
import { getChildren, getNode } from '../model/selectors';
import type {
  BorderColorField,
  BorderRadiusField,
  BorderWidthField,
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  LeafRole,
  ShadowStyleField,
  NodeTextField,
  NodeId,
  StickyDefinition,
  WrapperNode,
  WrapperStyleField,
  WrapperRole,
} from '../model/types';
import type { StickyGeometrySnapshot, StickyLayoutState } from '../sticky/resolve';
import { resolveStickyLayout, resolveWrapperStickyState } from '../sticky/resolve';
import { formatValue, parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue, resolveUnitValuePx } from '../model/units';
import { validateDocument } from '../model/validation';
import type { DocumentCommand } from './types';

export type {
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  LeafRole,
  NodeTextField,
  NodeId,
  StickyGeometrySnapshot,
  StickyLayoutState,
  StickyDefinition,
  WrapperNode,
  WrapperStyleField,
  WrapperRole,
};
export type { DocumentCommand } from './types';

export {
  SECTION_TEMPLATES,
  addDocumentFontFamily,
  createInitialDocument,
  createSectionFromTemplate,
  formatValue,
  getDocumentFontLibrary,
  getFontUsage,
  getChildren,
  getLinkHref,
  getNode,
  isFontFamilyUsed,
  listDocumentFonts,
  parseHeightValue,
  parseFontSizeValue,
  parseUnitValue,
  parseSpacingValue,
  parseWidthValue,
  purgeUnusedDocumentFonts,
  removeDocumentFontFamily,
  resolveStickyLayout,
  resolveWrapperStickyState,
  resolveUnitValuePx,
  shouldOpenNavigationInNewTab,
  toggleDocumentFontFavorite,
  validateDocument,
};

export function cloneDocument(document: DocumentModel): DocumentModel {
  return {
    rootId: document.rootId,
    nodes: structuredClone(document.nodes),
    fontLibrary: structuredClone(document.fontLibrary),
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
  field: EditorTextField,
  value: string,
): DocumentModel {
  let next = cloneDocument(document);
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

  if (field === 'linkType' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.linkType = normalizeNavigationKind(value);
    return next;
  }

  if (field === 'anchorTargetId' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.anchorTargetId = value || undefined;
    return next;
  }

  if (field === 'href' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.href = value;
    return next;
  }

  if (field === 'openInNewTab' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.openInNewTab = value === 'true' ? true : undefined;
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

  if (field === 'color' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.color = value || undefined;
    return next;
  }

  if (field === 'fontFamily' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    const trimmedValue = value.trim();
    node.style.fontFamily = trimmedValue || undefined;
    if (trimmedValue) {
      next = ensureDocumentFontFamilyByName(next, trimmedValue);
    }
    return next;
  }

  if (field === 'background' && node.type === 'leaf' && node.role === 'button') {
    node.style ??= {};
    node.style.background = value || undefined;
    return next;
  }

  if ((field === 'paddingBlock' || field === 'paddingInline') && node.type === 'leaf' && node.role === 'button') {
    node.style ??= {};
    node.style[field] = value ? parseSpacingValue(value) : undefined;
    return next;
  }

  if (field === 'fontSize' && node.type === 'leaf' && node.role === 'text') {
    node.style ??= {};
    node.style.fontSize = value ? parseFontSizeValue(value) : undefined;
    return next;
  }

  if (field === 'fontSize' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.fontSize = value ? parseFontSizeValue(value) : undefined;
    return next;
  }

  if (field === 'fontWeight' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return document;
    }
    node.style ??= {};
    node.style.fontWeight = Math.min(900, Math.max(100, Math.round(parsed)));
    return next;
  }

  if (field === 'fontStyle' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.fontStyle = value === 'italic' ? 'italic' : 'normal';
    return next;
  }

  if (
    field === 'textDecorationLine' &&
    node.type === 'leaf' &&
    (node.role === 'text' || node.role === 'link' || node.role === 'button')
  ) {
    node.style ??= {};
    node.style.textDecorationLine = normalizeTextDecorationLine(value);
    return next;
  }

  if (
    field === 'lineHeight' &&
    node.type === 'leaf' &&
    (node.role === 'text' || node.role === 'link' || node.role === 'button')
  ) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      node.style ??= {};
      node.style.lineHeight = parsed;
      return next;
    }
    return document;
  }

  if (field === 'direction' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.direction = value === 'rtl' ? 'rtl' : 'ltr';
    return next;
  }

  if (field === 'textAlign' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.textAlign = value === 'center' || value === 'right' ? value : 'left';
    return next;
  }

  if (field === 'textWrap' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.textWrap = value === 'wrap' ? 'wrap' : 'single-line';
    return next;
  }

  if (isBorderColorField(field) && node.type === 'leaf' && (node.role === 'image' || node.role === 'button')) {
    node.style ??= {};
    node.style[field] = value || undefined;
    return next;
  }

  if (isBorderWidthField(field) && node.type === 'leaf' && (node.role === 'image' || node.role === 'button')) {
    node.style ??= {};
    node.style[field] = value ? parseUnitValue(value) : undefined;
    return next;
  }

  if (isBorderRadiusField(field) && node.type === 'leaf' && (node.role === 'image' || node.role === 'button')) {
    node.style ??= {};
    node.style[field] = value ? parseUnitValue(value) : undefined;
    return next;
  }

  if (isShadowStyleField(field) && node.type === 'leaf') {
    if (node.role !== 'text' && node.role !== 'link' && node.role !== 'image' && node.role !== 'button') {
      return document;
    }
    node.style ??= {};
    if (field === 'shadowColor') {
      node.style.shadowColor = value || undefined;
      return next;
    }
    const parsed = parseShadowLength(value);
    if (parsed == null) {
      return document;
    }
    node.style[field] = parsed;
    return next;
  }

  return document;
}

function normalizeTextDecorationLine(
  value: string,
): 'none' | 'underline' | 'line-through' | 'underline line-through' {
  switch (value) {
    case 'underline':
    case 'line-through':
    case 'underline line-through':
      return value;
    default:
      return 'none';
  }
}

function parseShadowLength(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBorderColorField(field: EditorTextField): field is BorderColorField {
  return (
    field === 'borderColor' ||
    field === 'borderTopColor' ||
    field === 'borderRightColor' ||
    field === 'borderBottomColor' ||
    field === 'borderLeftColor'
  );
}

function isBorderWidthField(field: EditorTextField): field is BorderWidthField {
  return (
    field === 'borderWidth' ||
    field === 'borderTopWidth' ||
    field === 'borderRightWidth' ||
    field === 'borderBottomWidth' ||
    field === 'borderLeftWidth'
  );
}

function isBorderRadiusField(field: EditorTextField): field is BorderRadiusField {
  return (
    field === 'borderRadius' ||
    field === 'borderTopLeftRadius' ||
    field === 'borderTopRightRadius' ||
    field === 'borderBottomRightRadius' ||
    field === 'borderBottomLeftRadius'
  );
}

function isShadowStyleField(field: EditorTextField): field is ShadowStyleField {
  return (
    field === 'shadowColor' ||
    field === 'shadowBlur' ||
    field === 'shadowSpread' ||
    field === 'shadowOffsetX' ||
    field === 'shadowOffsetY'
  );
}

export function parseDocumentJson(raw: string): DocumentModel {
  const parsed = normalizeDocumentFontState(JSON.parse(raw) as DocumentModel);
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

  return normalizeDocumentFontState(next);
}
