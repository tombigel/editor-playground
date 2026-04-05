import {
  SECTION_TEMPLATES,
  createInitialDocument,
  createLeaf,
  createMediaNode,
  createSectionFromTemplate,
  createTextNode,
  createWrapper,
  syncIdCountersWithDocument,
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
import { setPageAsHome as setPageAsHomeDoc } from './pageApi';
import {
  getTopLevelWrapperVisibilityState,
  normalizeTopLevelWrapperTargetPageIds,
  type TopLevelWrapperVisibilityMode as TopLevelWrapperVisibilityModeModel,
  type TopLevelWrapperVisibilityState as TopLevelWrapperVisibilityStateModel,
} from '../model/topLevelWrapperVisibility';
import type { PageId } from '../model/types/site';
import type {
  BorderColorField,
  BorderRadiusField,
  BorderWidthField,
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  LeafRole,
  MediaSubtype,
  ShadowStyleField,
  NodeTextField,
  NodeId,
  StickyDefinition,
  TextSubtype,
  WrapperNode,
  WrapperStyleField,
  WrapperRole,
} from '../model/types';
import type { StickyGeometrySnapshot, StickyLayoutState } from '../sticky/resolve';
import { resolveStickyLayout, resolveWrapperStickyState } from '../sticky/resolve';
import { formatValue, parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue, resolveUnitValuePx } from '../model/units';
import { validateDocument, validateLinks } from '../model/validation';
import type { DocumentCommand } from './types/index';

export type NodeOrderAction = 'back' | 'forward' | 'sendToBack' | 'bringToFront';
export type TopLevelWrapperPlacement = 'currentPage' | 'global';
export type TopLevelWrapperVisibilityMode = TopLevelWrapperVisibilityModeModel;
export type TopLevelWrapperVisibilityState = TopLevelWrapperVisibilityStateModel;
export type TopLevelWrapperVisibility = TopLevelWrapperVisibilityModeModel;

export type {
  ComputedWrapperStickyState,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  LeafRole,
  MediaSubtype,
  NodeTextField,
  NodeId,
  StickyGeometrySnapshot,
  StickyLayoutState,
  StickyDefinition,
  TextSubtype,
  WrapperNode,
  WrapperStyleField,
  WrapperRole,
};
export type { DocumentCommand } from './types/index';

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
  setPageAsHomeDoc,
  shouldOpenNavigationInNewTab,
  toggleDocumentFontFavorite,
  validateDocument,
  validateLinks,
  getTopLevelWrapperVisibilityState,
};

export function cloneDocument(document: DocumentModel): DocumentModel {
  return {
    rootId: document.rootId,
    nodes: structuredClone(document.nodes),
    fontLibrary: structuredClone(document.fontLibrary),
    ...(document.animationSettings !== undefined ? { animationSettings: structuredClone(document.animationSettings) } : {}),
    ...(document.pages !== undefined ? { pages: structuredClone(document.pages) } : {}),
    ...(document.siteSettings !== undefined ? { siteSettings: structuredClone(document.siteSettings) } : {}),
    ...(document.sharedRegionIds !== undefined ? { sharedRegionIds: [...document.sharedRegionIds] } : {}),
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

export function setSiteNodeStickyElevation(
  document: DocumentModel,
  enabled: boolean,
): DocumentModel {
  const next = cloneDocument(document);
  const site = next.nodes[next.rootId];
  if (site.type !== 'site') {
    return document;
  }
  site.stickyElevation = enabled;
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

  if (field === 'lang' && node.type === 'leaf' && node.role === 'text') {
    node.lang = value.trim() || undefined;
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

export function setNodeVisibilityDoc(
  document: DocumentModel,
  nodeId: NodeId,
  visible: boolean,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.type === 'site' || node.visible === visible) {
    return document;
  }

  node.visible = visible;
  return next;
}

export function setPageTopLevelWrapperPlacement(
  document: DocumentModel,
  pageId: PageId,
  nodeId: NodeId,
  placement: TopLevelWrapperPlacement,
): DocumentModel {
  return setTopLevelWrapperVisibility(
    document,
    pageId,
    nodeId,
    placement === 'global' ? 'allPages' : 'currentPage',
  );
}

export function setTopLevelWrapperVisibility(
  document: DocumentModel,
  pageId: PageId,
  nodeId: NodeId,
  visibility: TopLevelWrapperVisibility,
  pageIds: PageId[] = [],
): DocumentModel {
  const root = document.nodes[document.rootId];
  const page = document.pages?.find((entry) => entry.id === pageId);
  const node = document.nodes[nodeId];
  if (!root || root.type !== 'site' || !page || !node || node.type !== 'wrapper') {
    return document;
  }
  if (node.parentId !== document.rootId || !isEligibleTopLevelWrapper(node.role)) {
    return document;
  }

  const next = cloneDocument(document);
  const pages = structuredClone(document.pages ?? []);
  const sharedRegionIds = new Set(document.sharedRegionIds ?? []);
  const targetPage = pages.find((entry) => entry.id === pageId);
  const nextNode = next.nodes[nodeId];

  if (!targetPage || nextNode.type !== 'wrapper') {
    return document;
  }

  let changed = false;
  const hadPageTargets = nextNode.pageTargetIds !== undefined;
  const removeFromAllPages = () => {
    for (const candidate of pages) {
      const originalLength = candidate.sectionIds.length;
      candidate.sectionIds = candidate.sectionIds.filter((sectionId) => sectionId !== nodeId);
      if (candidate.sectionIds.length !== originalLength) {
        changed = true;
      }
    }
  };

  if (visibility === 'hidden') {
    if (nextNode.visible !== false) {
      nextNode.visible = false;
      changed = true;
    }
  } else {
    if (nextNode.visible !== true) {
      nextNode.visible = true;
      changed = true;
    }

    if (visibility === 'currentPage') {
      removeFromAllPages();
      if (sharedRegionIds.delete(nodeId)) {
        changed = true;
      }
      if (hadPageTargets) {
        delete nextNode.pageTargetIds;
        changed = true;
      }
      if (!targetPage.sectionIds.includes(nodeId)) {
        targetPage.sectionIds.push(nodeId);
        changed = true;
      }
    } else if (visibility === 'allPages') {
      removeFromAllPages();
      if (hadPageTargets) {
        delete nextNode.pageTargetIds;
        changed = true;
      }
      if (!sharedRegionIds.has(nodeId)) {
        sharedRegionIds.add(nodeId);
        changed = true;
      }
    } else {
      const normalizedPageIds = normalizeTopLevelWrapperTargetPageIds(document, pageIds);
      if (normalizedPageIds.length === 0) {
        return document;
      }
      removeFromAllPages();
      if (sharedRegionIds.delete(nodeId)) {
        changed = true;
      }
      const nextTargets = nextNode.pageTargetIds ?? [];
      if (nextTargets.length !== normalizedPageIds.length || nextTargets.some((id, index) => id !== normalizedPageIds[index])) {
        nextNode.pageTargetIds = normalizedPageIds;
        changed = true;
      }
    }
  }

  if (!changed) {
    return document;
  }

  next.pages = pages;
  next.sharedRegionIds = Array.from(sharedRegionIds);
  return next;
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

function isEligibleTopLevelWrapper(role: WrapperNode['role']) {
  return role === 'section' || role === 'header' || role === 'footer';
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

// ---------------------------------------------------------------------------
// Pure DocumentModel mutation functions (API-first variants)
// ---------------------------------------------------------------------------

/**
 * Insert a wrapper node into the document without requiring EditorState.
 * The wrapper is appended as the last child of `parentId`.
 */
export function insertWrapperDoc(
  document: DocumentModel,
  role: WrapperRole,
  parentId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  syncIdCountersWithDocument(next);

  const parent = next.nodes[parentId];
  if (!parent) {
    return document;
  }

  let node = createWrapper(role, parentId);
  while (next.nodes[node.id]) {
    node = createWrapper(role, parentId);
  }

  next.nodes[node.id] = node;
  parent.children.push(node.id);
  return next;
}

/**
 * Insert a leaf node into the document without requiring EditorState.
 * The leaf is appended as the last child of `parentId`.
 */
export function insertLeafDoc(
  document: DocumentModel,
  role: LeafRole,
  parentId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  syncIdCountersWithDocument(next);

  const parent = next.nodes[parentId];
  if (!parent) {
    return document;
  }

  let node = createLeaf(role, parentId);
  while (next.nodes[node.id]) {
    node = createLeaf(role, parentId);
  }

  next.nodes[node.id] = node;
  parent.children.push(node.id);
  return next;
}

/**
 * Delete a single node (and its descendants) from the document.
 */
export function deleteNodeDoc(document: DocumentModel, nodeId: NodeId): DocumentModel {
  return deleteNodesDoc(document, [nodeId]);
}

/**
 * Delete multiple nodes (and their descendants) from the document.
 * Automatically filters to top-level selected IDs so that deleting a parent
 * and child simultaneously does not cause errors.
 */
export function deleteNodesDoc(document: DocumentModel, nodeIds: NodeId[]): DocumentModel {
  if (nodeIds.length === 0) {
    return document;
  }

  const next = cloneDocument(document);

  // Filter to top-level IDs (skip nodes whose ancestor is also in the list).
  const topLevel = nodeIds.filter((candidateId) =>
    !nodeIds.some((otherId) => otherId !== candidateId && isDescendantOf(next, candidateId, otherId)),
  );

  if (topLevel.length === 0) {
    return document;
  }

  for (const nodeId of topLevel) {
    const node = next.nodes[nodeId];
    if (!node || node.parentId === null) {
      continue;
    }
    removeSubtree(next, nodeId);
    const parent = next.nodes[node.parentId];
    if (parent) {
      parent.children = parent.children.filter((childId) => childId !== nodeId);
    }
  }

  return next;
}

/**
 * Reorder a node among its siblings within the document.
 */
export function reorderNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  action: NodeOrderAction,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!node || node.type === 'site' || !node.parentId) {
    return document;
  }

  const parent = next.nodes[node.parentId];
  if (!parent) {
    return document;
  }

  const index = parent.children.indexOf(nodeId);
  if (index === -1) {
    return document;
  }

  // Sections are reordered only among sibling sections at root level.
  if (node.type === 'wrapper' && node.role === 'section') {
    if (parent.type !== 'site') {
      return document;
    }
    if (action === 'sendToBack' || action === 'bringToFront') {
      return document;
    }
    const targetIndex = findSiblingSectionIndex(next, parent.children, index, action === 'back' ? -1 : 1);
    if (targetIndex === -1) {
      return document;
    }
    const nextChildren = [...parent.children];
    [nextChildren[targetIndex], nextChildren[index]] = [nextChildren[index], nextChildren[targetIndex]];
    parent.children = nextChildren;
    return next;
  }

  if (!isReorderableNode(node)) {
    return document;
  }

  const nextChildren = [...parent.children];
  if (action === 'back') {
    if (index === 0) return document;
    [nextChildren[index - 1], nextChildren[index]] = [nextChildren[index], nextChildren[index - 1]];
  } else if (action === 'forward') {
    if (index === nextChildren.length - 1) return document;
    [nextChildren[index + 1], nextChildren[index]] = [nextChildren[index], nextChildren[index + 1]];
  } else if (action === 'sendToBack') {
    if (index === 0) return document;
    nextChildren.splice(index, 1);
    nextChildren.unshift(nodeId);
  } else {
    if (index === nextChildren.length - 1) return document;
    nextChildren.splice(index, 1);
    nextChildren.push(nodeId);
  }

  parent.children = nextChildren;
  return next;
}

/**
 * Reparent a node to a new parent within the document.
 * Returns the original document unchanged when the operation is invalid
 * (e.g. reparenting to a descendant, invalid parent type).
 */
export function reparentNodeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  newParentId: NodeId,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  const newParent = next.nodes[newParentId];

  if (!node || !newParent || node.type === 'site' || newParent.type !== 'wrapper') {
    return document;
  }

  if (newParentId === nodeId) {
    return document;
  }

  if (node.parentId === null || node.parentId === newParentId) {
    return document;
  }

  // Validate the parent-child relationship.
  if (!canAcceptChild(newParent, node)) {
    return document;
  }

  // Prevent reparenting into own descendants.
  if (isDescendantOf(next, newParentId, nodeId)) {
    return document;
  }

  const previousParent = next.nodes[node.parentId];
  if (previousParent) {
    previousParent.children = previousParent.children.filter((childId) => childId !== nodeId);
  }
  newParent.children.push(nodeId);
  node.parentId = newParentId;

  return next;
}

export function moveNodeInTreeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetParentId: NodeId,
  targetIndex: number,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  const targetParent = next.nodes[targetParentId];

  if (!node || node.type === 'site' || !targetParent || targetIndex < 0) {
    return document;
  }

  const movingStructuralRootNode =
    node.type === 'wrapper' &&
    isSiteSectionRole(node.role) &&
    targetParent.type === 'site' &&
    targetParentId === next.rootId;

  if (targetParent.type === 'site') {
    if (!movingStructuralRootNode) {
      return document;
    }
  } else if (!canAcceptChild(targetParent, node)) {
    return document;
  }

  if (node.parentId == null) {
    return document;
  }

  if (targetParentId === nodeId || isDescendantOf(next, targetParentId, nodeId)) {
    return document;
  }

  const currentParent = next.nodes[node.parentId];
  if (!currentParent) {
    return document;
  }

  const currentIndex = currentParent.children.indexOf(nodeId);
  if (currentIndex === -1) {
    return document;
  }

  if (
    currentParent.id === targetParent.id &&
    (targetIndex === currentIndex || targetIndex === currentIndex + 1)
  ) {
    return document;
  }

  const maxTargetIndex = targetParent.children.length;
  if (targetIndex > maxTargetIndex) {
    return document;
  }

  currentParent.children = currentParent.children.filter((childId) => childId !== nodeId);
  const nextIndex =
    currentParent.id === targetParent.id && currentIndex < targetIndex
      ? targetIndex - 1
      : targetIndex;

  if (nextIndex < 0 || nextIndex > targetParent.children.length) {
    return document;
  }

  targetParent.children.splice(nextIndex, 0, nodeId);
  node.parentId = targetParentId;

  if (movingStructuralRootNode) {
    normalizeRootStructuralRoles(next);
  }

  return next;
}

/**
 * Switch the subtype of a MediaNode or TextNode within the same content-type family.
 *
 * Rules:
 * - Source and target must be in the same contentType family (both 'media' or both 'text').
 *   Throws an Error if they differ.
 * - Container subtype switching is handled by the existing promote/demote logic; this
 *   function intentionally does NOT support contentType: 'container'.
 * - Transferred fields (always): id, parentId, children, name, visible, locked, rect,
 *   sticky, animation.
 * - For media→media: transfers src, alt; drops video/svg/embed props that don't apply.
 * - For text→text: transfers content, lang, link; drops htmlTag/code if not applicable.
 * - Uses createMediaNode / createTextNode as the base to ensure correct defaults, then
 *   overlays the transferred fields.
 */
export function switchSubtypeDoc(
  document: DocumentModel,
  nodeId: NodeId,
  targetSubtype: MediaSubtype | TextSubtype,
): DocumentModel {
  const node = document.nodes[nodeId];
  if (!node) {
    return document;
  }

  const contentType = (node as { contentType?: string }).contentType;

  // Determine the target family from the targetSubtype value.
  const mediaSubtypes: MediaSubtype[] = ['image', 'video', 'svg', 'embed'];
  const textSubtypes: TextSubtype[] = ['block', 'rich', 'code'];
  const targetIsMedia = (mediaSubtypes as string[]).includes(targetSubtype);
  const targetIsText = (textSubtypes as string[]).includes(targetSubtype);

  if (!targetIsMedia && !targetIsText) {
    throw new Error(`switchSubtypeDoc: unrecognised targetSubtype "${targetSubtype}"`);
  }

  if (contentType === 'container' || contentType === 'site') {
    throw new Error(
      `switchSubtypeDoc: cannot switch subtype of a "${contentType}" node — use promote/demote logic instead`,
    );
  }

  if (contentType === 'media' && !targetIsMedia) {
    throw new Error(
      `switchSubtypeDoc: source node is "media" but targetSubtype "${targetSubtype}" belongs to the "text" family`,
    );
  }

  if (contentType === 'text' && !targetIsText) {
    throw new Error(
      `switchSubtypeDoc: source node is "text" but targetSubtype "${targetSubtype}" belongs to the "media" family`,
    );
  }

  // If there's nothing to change, bail early.
  const currentSubtype = (node as { subtype?: string }).subtype;
  if (currentSubtype === targetSubtype) {
    return document;
  }

  const next = cloneDocument(document);
  const sourceNode = next.nodes[nodeId];

  if (targetIsMedia) {
    // media → media
    const mediaSource = sourceNode as import('../model/types').MediaNode;
    const base = createMediaNode(targetSubtype as MediaSubtype, mediaSource.parentId ?? '');
    const switched: import('../model/types').MediaNode = {
      ...base,
      // Identity / tree fields
      id: mediaSource.id,
      parentId: mediaSource.parentId,
      children: [...mediaSource.children],
      name: mediaSource.name,
      visible: mediaSource.visible,
      locked: mediaSource.locked,
      // Position
      rect: mediaSource.rect,
      // Behaviour
      ...(mediaSource.sticky !== undefined ? { sticky: mediaSource.sticky } : {}),
      ...(mediaSource.animation !== undefined ? { animation: mediaSource.animation } : {}),
      // Media content — transfer src/alt; type-specific props come from the base
      ...(mediaSource.src !== undefined ? { src: mediaSource.src } : {}),
      ...(mediaSource.alt !== undefined ? { alt: mediaSource.alt } : {}),
    };
    next.nodes[nodeId] = switched;
    return next;
  }

  // text → text
  const textSource = sourceNode as import('../model/types').TextNode;
  const base = createTextNode(targetSubtype as TextSubtype, textSource.parentId ?? '');
  const switched: import('../model/types').TextNode = {
    ...base,
    // Identity / tree fields
    id: textSource.id,
    parentId: textSource.parentId,
    children: [...textSource.children],
    name: textSource.name,
    visible: textSource.visible,
    locked: textSource.locked,
    // Position
    rect: textSource.rect,
    // Behaviour
    ...(textSource.sticky !== undefined ? { sticky: textSource.sticky } : {}),
    ...(textSource.animation !== undefined ? { animation: textSource.animation } : {}),
    // Text content
    content: textSource.content,
    ...(textSource.lang !== undefined ? { lang: textSource.lang } : {}),
    // Link extension — only meaningful for block; carry it over regardless
    // (it will be ignored at render time for non-block subtypes)
    ...(textSource.link !== undefined ? { link: textSource.link } : {}),
    // htmlTag: carry over if targetSubtype is block; discard for rich/code
    ...(targetSubtype === 'block' && textSource.htmlTag !== undefined
      ? { htmlTag: textSource.htmlTag }
      : {}),
    // code: carry over if targetSubtype is code; discard otherwise
    ...(targetSubtype === 'code' && textSource.code !== undefined
      ? { code: textSource.code }
      : {}),
  };
  next.nodes[nodeId] = switched;
  return next;
}

// ---------------------------------------------------------------------------
// Internal helpers for pure DocumentModel mutations
// ---------------------------------------------------------------------------

function removeSubtree(document: DocumentModel, nodeId: NodeId) {
  const node = document.nodes[nodeId];
  if (!node) return;
  for (const childId of node.children) {
    removeSubtree(document, childId);
  }
  delete document.nodes[nodeId];
}

function isDescendantOf(document: DocumentModel, candidateId: NodeId, ancestorId: NodeId): boolean {
  let current = document.nodes[candidateId];
  while (current?.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }
    current = document.nodes[current.parentId];
  }
  return false;
}

function isReorderableNode(node: DocumentNode): boolean {
  if (node.type === 'site') return false;
  if (node.type === 'leaf') return true;
  return node.role === 'container';
}

function isSiteSectionRole(role: WrapperRole): boolean {
  return role === 'section' || role === 'header' || role === 'footer';
}

function canAcceptChild(parent: DocumentNode, child: DocumentNode): boolean {
  if (parent.type !== 'wrapper') return false;
  if (child.type === 'leaf') return true;
  if (child.type !== 'wrapper') return false;
  if (child.role !== 'container') return false;
  if (parent.role === 'container') return true;
  return isSiteSectionRole(parent.role);
}

function findSiblingSectionIndex(
  document: DocumentModel,
  siblingIds: NodeId[],
  fromIndex: number,
  direction: -1 | 1,
): number {
  let index = fromIndex + direction;
  while (index >= 0 && index < siblingIds.length) {
    const candidate = document.nodes[siblingIds[index]];
    if (candidate?.type === 'wrapper' && candidate.role === 'section') {
      return index;
    }
    index += direction;
  }
  return -1;
}

function normalizeRootStructuralRoles(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return;
  }

  const structuralWrappers = root.children
    .map((childId) => document.nodes[childId])
    .filter(
      (node): node is WrapperNode =>
        node?.type === 'wrapper' && isSiteSectionRole(node.role),
    );

  if (structuralWrappers.length === 0) {
    return;
  }

  for (const wrapper of structuralWrappers) {
    wrapper.role = 'section';
  }

  structuralWrappers[0].role = 'header';
  if (structuralWrappers.length > 1) {
    structuralWrappers[structuralWrappers.length - 1].role = 'footer';
  }
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
