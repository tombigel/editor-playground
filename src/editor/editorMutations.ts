import {
  createSectionFromTemplate,
  createWrapper,
  syncIdCountersWithDocument,
  type SectionTemplateId,
} from '../model/defaults';
import { ensureDocumentFontFamilyByName, normalizeDocumentFontState } from '../fonts';
import { validateDocument } from '../model/validation';
import type {
  BorderColorField,
  BorderRadiusField,
  BorderWidthField,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  LeafRole,
  NodeId,
  ShadowStyleField,
  StickyDefinition,
  TextLeaf,
  WrapperRole,
  WrapperNode,
  WrapperStyleField,
} from '../model/types';
import { parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue } from '../model/units';
import { forceOpaqueColorValue } from '../model/colors';
import type { EditorState, NodeOrderAction } from './types';
import { getTopLevelSelectedIds, normalizeSelectedIds } from './selection';
import { cloneDocument, normalizeDocument, normalizeTextHtmlTag, isStructuralWrapper, createUniqueLeaf } from './editorPersistence';

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function assertWrapper(node: DocumentNode): WrapperNode {
  if (node.type !== 'wrapper') {
    throw new Error(`Expected wrapper, got ${node.type}`);
  }
  return node;
}

function applySelectionToDocument(state: EditorState, document: DocumentModel, selectedIds = state.selectedIds) {
  const normalized = normalizeSelectedIds(document, selectedIds);
  return {
    ...state,
    document,
    selectedId: normalized[0] ?? null,
    selectedIds: normalized,
  };
}

export function importDocument(state: EditorState, document: DocumentModel): EditorState {
  const normalized = normalizeDocument(document);
  const errors = validateDocument(normalized);
  if (errors.length > 0) {
    throw new Error(`Import failed: ${errors.join('; ')}`);
  }

  return {
    ...state,
    document: normalized,
    selectedId: null,
    selectedIds: [],
    pendingRoleSwap: null,
  };
}

export function insertWrapper(state: EditorState, role: WrapperRole): EditorState {
  const document = cloneDocument(state.document);
  syncIdCountersWithDocument(document);
  const parentId = state.selectedId
    ? getInsertionParent(document, state.selectedId, role === 'container' ? 'containerWrapper' : 'siteWrapper')
    : role === 'container'
      ? findFirstSection(document) ?? document.rootId
      : document.rootId;
  const node = createUniqueWrapper(document, role, parentId);
  document.nodes[node.id] = node;
  document.nodes[parentId].children.push(node.id);
  return applySelectionToDocument(state, document, [node.id]);
}

export function insertSectionTemplate(state: EditorState, templateId: SectionTemplateId): EditorState {
  const document = cloneDocument(state.document);
  syncIdCountersWithDocument(document);
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return state;
  }

  const { wrapper, nodes } = createSectionFromTemplate(templateId, document.rootId);
  Object.assign(document.nodes, nodes);
  const footerIndex = root.children.findIndex((childId) => {
    const child = document.nodes[childId];
    return child?.type === 'wrapper' && child.role === 'footer';
  });
  const insertAt = footerIndex >= 0 ? footerIndex : root.children.length;
  root.children.splice(insertAt, 0, wrapper.id);

  return applySelectionToDocument(state, normalizeDocumentFontState(document), [wrapper.id]);
}

export function insertLeaf(state: EditorState, role: LeafRole): EditorState {
  const document = cloneDocument(state.document);
  syncIdCountersWithDocument(document);
  const parentId = state.selectedId
    ? getInsertionParent(document, state.selectedId, 'leaf')
    : findFirstSection(document) ?? document.rootId;
  const node = createUniqueLeaf(document, role, parentId);
  document.nodes[node.id] = node;
  document.nodes[parentId].children.push(node.id);
  return applySelectionToDocument(state, document, [node.id]);
}

function findFirstSection(document: DocumentModel): NodeId | null {
  for (const node of Object.values(document.nodes)) {
    if (node.type === 'wrapper' && (node.role === 'section' || node.role === 'container')) {
      return node.id;
    }
  }
  return null;
}

function getInsertionParent(
  document: DocumentModel,
  selectedId: NodeId,
  insertType: 'siteWrapper' | 'containerWrapper' | 'leaf',
): NodeId {
  const selected = document.nodes[selectedId];
  if (selected.type === 'site') {
    return insertType === 'containerWrapper'
      ? findFirstSection(document) ?? selected.id
      : selected.id;
  }
  if (insertType === 'leaf') {
    return selected.type === 'wrapper' ? selected.id : (selected.parentId ?? document.rootId);
  }
  if (insertType === 'containerWrapper') {
    if (selected.type === 'wrapper') {
      return selected.id;
    }
    return selected.parentId ?? document.rootId;
  }
  if (selected.type === 'wrapper') {
    return document.rootId;
  }
  return document.rootId;
}

function createUniqueWrapper(document: DocumentModel, role: WrapperRole, parentId: NodeId) {
  let node = createWrapper(role, parentId);
  while (document.nodes[node.id]) {
    node = createWrapper(role, parentId);
  }
  return node;
}

export function updateTextField(
  state: EditorState,
  nodeId: NodeId,
  field: EditorTextField,
  value: string,
): EditorState {
  let document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (node.type === 'site') {
    return state;
  }

  if (field === 'name') {
    node.name = value;
  } else if (field === 'content' && node.type === 'leaf' && node.role === 'text') {
    node.content = value;
  } else if (field === 'htmlTag' && node.type === 'leaf' && node.role === 'text') {
    node.htmlTag = normalizeTextHtmlTag(value as TextLeaf['htmlTag']);
  } else if (field === 'color' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.color = value || undefined;
  } else if (field === 'fontFamily' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    const trimmedValue = value.trim();
    node.style.fontFamily = trimmedValue || undefined;
    if (trimmedValue) {
      document = ensureDocumentFontFamilyByName(document, trimmedValue);
    }
  } else if (field === 'background' && node.type === 'leaf' && node.role === 'button') {
    node.style ??= {};
    node.style.background = value || undefined;
  } else if ((field === 'paddingBlock' || field === 'paddingInline') && node.type === 'leaf' && node.role === 'button') {
    node.style ??= {};
    node.style[field] = value ? parseSpacingValue(value) : undefined;
  } else if (field === 'fontSize' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.fontSize = value ? parseFontSizeValue(value) : undefined;
  } else if (field === 'fontWeight' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return state;
    }
    node.style ??= {};
    node.style.fontWeight = Math.min(900, Math.max(100, Math.round(parsed)));
  } else if (field === 'fontStyle' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.fontStyle = value === 'italic' ? 'italic' : 'normal';
  } else if (
    field === 'textDecorationLine' &&
    node.type === 'leaf' &&
    (node.role === 'text' || node.role === 'link' || node.role === 'button')
  ) {
    node.style ??= {};
    node.style.textDecorationLine = normalizeTextDecorationLine(value);
  } else if (
    field === 'lineHeight' &&
    node.type === 'leaf' &&
    (node.role === 'text' || node.role === 'link' || node.role === 'button')
  ) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      node.style ??= {};
      node.style.lineHeight = parsed;
    }
  } else if (field === 'direction' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.direction = value === 'rtl' ? 'rtl' : 'ltr';
  } else if (field === 'textAlign' && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.textAlign = value === 'center' || value === 'right' ? value : 'left';
  } else if (field === 'textWrap' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.style ??= {};
    node.style.textWrap = value === 'wrap' ? 'wrap' : 'single-line';
  } else if (field === 'label' && node.type === 'leaf' && 'label' in node) {
    node.label = value;
  } else if (field === 'linkType' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.linkType = value === 'anchor' ? 'anchor' : 'external';
  } else if (field === 'anchorTargetId' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.anchorTargetId = value || undefined;
  } else if (field === 'href' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.href = value;
  } else if (field === 'openInNewTab' && node.type === 'leaf' && (node.role === 'link' || node.role === 'button')) {
    node.openInNewTab = value === 'true' ? true : undefined;
  } else if (field === 'src' && node.type === 'leaf' && node.role === 'image') {
    node.src = value;
  } else if (field === 'alt' && node.type === 'leaf' && node.role === 'image') {
    node.alt = value;
  } else if (isBorderColorField(field) && node.type === 'leaf' && (node.role === 'image' || node.role === 'button')) {
    node.style ??= {};
    node.style[field] = value || undefined;
  } else if (isBorderWidthField(field) && node.type === 'leaf' && (node.role === 'image' || node.role === 'button')) {
    node.style ??= {};
    node.style[field] = value ? parseUnitValue(value) : undefined;
  } else if (isBorderRadiusField(field) && node.type === 'leaf' && (node.role === 'image' || node.role === 'button')) {
    node.style ??= {};
    node.style[field] = value ? parseUnitValue(value) : undefined;
  } else if (isShadowStyleField(field) && node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'image' || node.role === 'button')) {
    node.style ??= {};
    if (field === 'shadowColor') {
      node.style.shadowColor = value || undefined;
    } else {
      const parsed = parseShadowLength(value);
      if (parsed != null) {
        node.style[field] = parsed;
      }
    }
  }

  return { ...state, document: normalizeDocumentFontState(document) };
}

export function updateRectField(
  state: EditorState,
  nodeId: NodeId,
  field: 'x' | 'y' | 'width' | 'height',
  raw: string,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (node.type === 'site') {
    return state;
  }
  const rect = node.rect;
  if (field === 'width') {
    rect.width.base = parseWidthValue(raw);
  } else if (field === 'height') {
    rect.height.base = parseHeightValue(raw);
  } else if (field === 'x') {
    rect.x.base = parseUnitValue(raw);
  } else {
    rect.y.base = parseUnitValue(raw);
  }
  return { ...state, document };
}

function normalizeTextDecorationLine(
  value: string,
): NonNullable<TextLeaf['style']>['textDecorationLine'] {
  switch (value) {
    case 'underline':
    case 'line-through':
    case 'underline line-through':
      return value;
    default:
      return 'none';
  }
}

export function updateStickyField(
  state: EditorState,
  nodeId: NodeId,
  patch: Partial<StickyDefinition>,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (node.type === 'site') {
    return state;
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
  if (node.type === 'wrapper' && node.role === 'container' && node.sticky.target === 'contentWrapper') {
    node.sticky.target = 'self';
  }
  return { ...state, document };
}

export function updateWrapperStyleField(
  state: EditorState,
  nodeId: NodeId,
  field: WrapperStyleField,
  value: string,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (node.type !== 'wrapper') {
    return state;
  }

  if (field === 'sectionBorderBottomWidth') {
    node.style.sectionBorderBottomWidth = value ? parseUnitValue(value) : undefined;
    return { ...state, document };
  }

  if (field === 'background' && isStructuralWrapper(node.role)) {
    node.style.background = value ? forceOpaqueColorValue(value) : undefined;
    return { ...state, document };
  }

  if (isWrapperPaddingField(field)) {
    node.style[field] = value ? parseSpacingValue(value) : undefined;
    return { ...state, document };
  }

  if (isBorderWidthField(field) || isBorderRadiusField(field)) {
    node.style[field] = value ? parseUnitValue(value) : undefined;
    return { ...state, document };
  }

  if (isShadowStyleField(field)) {
    if (field === 'shadowColor') {
      node.style.shadowColor = value || undefined;
    } else {
      const parsed = parseShadowLength(value);
      if (parsed != null) {
        node.style[field] = parsed;
      }
    }
    return { ...state, document };
  }

  node.style[field] = value || undefined;
  return { ...state, document };
}

function parseShadowLength(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBorderColorField(field: EditorTextField | WrapperStyleField): field is BorderColorField {
  return (
    field === 'borderColor' ||
    field === 'borderTopColor' ||
    field === 'borderRightColor' ||
    field === 'borderBottomColor' ||
    field === 'borderLeftColor'
  );
}

function isBorderWidthField(field: EditorTextField | WrapperStyleField): field is BorderWidthField {
  return (
    field === 'borderWidth' ||
    field === 'borderTopWidth' ||
    field === 'borderRightWidth' ||
    field === 'borderBottomWidth' ||
    field === 'borderLeftWidth'
  );
}

function isBorderRadiusField(field: EditorTextField | WrapperStyleField): field is BorderRadiusField {
  return (
    field === 'borderRadius' ||
    field === 'borderTopLeftRadius' ||
    field === 'borderTopRightRadius' ||
    field === 'borderBottomRightRadius' ||
    field === 'borderBottomLeftRadius'
  );
}

function isShadowStyleField(field: EditorTextField | WrapperStyleField): field is ShadowStyleField {
  return (
    field === 'shadowColor' ||
    field === 'shadowBlur' ||
    field === 'shadowSpread' ||
    field === 'shadowOffsetX' ||
    field === 'shadowOffsetY'
  );
}

function isWrapperPaddingField(
  field: EditorTextField | WrapperStyleField,
): field is Extract<WrapperStyleField, 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'> {
  return field === 'paddingTop' || field === 'paddingRight' || field === 'paddingBottom' || field === 'paddingLeft';
}

export function moveNode(
  state: EditorState,
  nodeId: NodeId,
  patch: Partial<Record<'x' | 'y', string>>,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (node.type === 'site') {
    return state;
  }
  if (patch.x) {
    node.rect.x.base = parseUnitValue(patch.x);
  }
  if (patch.y) {
    node.rect.y.base = parseUnitValue(patch.y);
  }
  return { ...state, document };
}

export function moveNodes(
  state: EditorState,
  moves: Array<{ id: NodeId; x: string; y: string }>,
): EditorState {
  if (moves.length === 0) {
    return state;
  }

  const document = cloneDocument(state.document);
  let changed = false;

  for (const move of moves) {
    const node = document.nodes[move.id];
    if (!node || node.type === 'site') {
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

  return changed ? { ...state, document } : state;
}

export function nudgeNode(
  state: EditorState,
  nodeId: NodeId,
  delta: { x: number; y: number },
): EditorState {
  const node = state.document.nodes[nodeId];
  if (!node || node.type === 'site' || !node.parentId || node.parentId === state.document.rootId) {
    return state;
  }

  return moveNode(state, nodeId, {
    x: `${Math.max(0, readCoordinatePx(node.rect.x.base.raw) + delta.x)}px`,
    y: `${Math.max(0, readCoordinatePx(node.rect.y.base.raw) + delta.y)}px`,
  });
}

export function resizeNode(
  state: EditorState,
  nodeId: NodeId,
  patch: Partial<Record<'width' | 'height', string>>,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (node.type === 'site') {
    return state;
  }
  if (patch.width) {
    node.rect.width.base = parseWidthValue(patch.width);
  }
  if (patch.height) {
    node.rect.height.base = parseHeightValue(patch.height);
  }
  return { ...state, document };
}

export function reorderNode(
  state: EditorState,
  nodeId: NodeId,
  action: NodeOrderAction,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (!node || node.type === 'site' || !node.parentId) {
    return state;
  }

  const parent = document.nodes[node.parentId];
  if (!parent) {
    return state;
  }

  const index = parent.children.indexOf(nodeId);
  if (index === -1) {
    return state;
  }

  // Sections are reordered only among sibling sections at root level.
  if (node.type === 'wrapper' && node.role === 'section') {
    if (parent.type !== 'site') {
      return state;
    }
    if (action === 'sendToBack' || action === 'bringToFront') {
      return state;
    }
    const targetIndex = findSiblingSectionIndex(document, parent.children, index, action === 'back' ? -1 : 1);
    if (targetIndex === -1) {
      return state;
    }
    const nextChildren = [...parent.children];
    [nextChildren[targetIndex], nextChildren[index]] = [nextChildren[index], nextChildren[targetIndex]];
    parent.children = nextChildren;
    return { ...state, document };
  }

  if (!isReorderableComponent(node)) {
    return state;
  }

  const nextChildren = [...parent.children];
  if (action === 'back') {
    if (index === 0) {
      return state;
    }
    [nextChildren[index - 1], nextChildren[index]] = [nextChildren[index], nextChildren[index - 1]];
  } else if (action === 'forward') {
    if (index === nextChildren.length - 1) {
      return state;
    }
    [nextChildren[index + 1], nextChildren[index]] = [nextChildren[index], nextChildren[index + 1]];
  } else if (action === 'sendToBack') {
    if (index === 0) {
      return state;
    }
    nextChildren.splice(index, 1);
    nextChildren.unshift(nodeId);
  } else {
    if (index === nextChildren.length - 1) {
      return state;
    }
    nextChildren.splice(index, 1);
    nextChildren.push(nodeId);
  }

  parent.children = nextChildren;
  return { ...state, document };
}

export function reorderNodes(
  state: EditorState,
  nodeIds: NodeId[],
  action: NodeOrderAction,
): EditorState {
  const selectedIds = normalizeSelectedIds(state.document, nodeIds);
  if (selectedIds.length <= 1) {
    return selectedIds[0] ? reorderNode(state, selectedIds[0], action) : state;
  }

  if (
    selectedIds.some((nodeId) => {
      const node = state.document.nodes[nodeId];
      return node?.type === 'wrapper' && node.role === 'section';
    })
  ) {
    return state;
  }

  const document = cloneDocument(state.document);
  const selectedNodes = selectedIds.map((nodeId) => document.nodes[nodeId]).filter(Boolean) as Exclude<DocumentNode, { type: 'site' }>[];
  const parentId = selectedNodes[0]?.parentId ?? null;
  if (
    !parentId ||
    selectedNodes.some((node) => !isReorderableComponent(node) || node.parentId !== parentId)
  ) {
    return state;
  }

  const parent = document.nodes[parentId];
  if (!parent) {
    return state;
  }

  const selectedIdSet = new Set(selectedIds);
  const nextChildren = [...parent.children];

  if (action === 'sendToBack' || action === 'bringToFront') {
    const selectedChildren = nextChildren.filter((childId) => selectedIdSet.has(childId));
    const unselectedChildren = nextChildren.filter((childId) => !selectedIdSet.has(childId));
    parent.children =
      action === 'sendToBack'
        ? [...selectedChildren, ...unselectedChildren]
        : [...unselectedChildren, ...selectedChildren];
    return { ...state, document };
  }

  if (action === 'back') {
    for (let index = 1; index < nextChildren.length; index += 1) {
      if (selectedIdSet.has(nextChildren[index]) && !selectedIdSet.has(nextChildren[index - 1])) {
        [nextChildren[index - 1], nextChildren[index]] = [nextChildren[index], nextChildren[index - 1]];
      }
    }
  } else {
    for (let index = nextChildren.length - 2; index >= 0; index -= 1) {
      if (selectedIdSet.has(nextChildren[index]) && !selectedIdSet.has(nextChildren[index + 1])) {
        [nextChildren[index], nextChildren[index + 1]] = [nextChildren[index + 1], nextChildren[index]];
      }
    }
  }

  parent.children = nextChildren;
  return { ...state, document };
}

export function alignNodes(
  state: EditorState,
  nodeIds: NodeId[],
  mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom',
  rects: Record<NodeId, SelectionRect>,
): EditorState {
  const context = getAlignmentContext(state.document, nodeIds);
  if (!context) {
    return state;
  }

  const anchorRect = rects[context.anchorId];
  if (!anchorRect) {
    return state;
  }

  const document = cloneDocument(state.document);
  let changed = false;

  for (const nodeId of context.targetIds) {
    const node = document.nodes[nodeId];
    const rect = rects[nodeId];
    if (!node || node.type === 'site' || !rect) {
      continue;
    }

    if (mode === 'left' || mode === 'center-x' || mode === 'right') {
      const desiredLeft =
        mode === 'left'
          ? anchorRect.left
          : mode === 'center-x'
            ? anchorRect.left + anchorRect.width / 2 - rect.width / 2
            : anchorRect.left + anchorRect.width - rect.width;
      const nextX = Math.max(0, Math.round(readCoordinatePx(node.rect.x.base.raw) + (desiredLeft - rect.left)));
      if (nextX !== Math.round(readCoordinatePx(node.rect.x.base.raw))) {
        node.rect.x.base = parseUnitValue(`${nextX}px`);
        changed = true;
      }
    } else {
      const desiredTop =
        mode === 'top'
          ? anchorRect.top
          : mode === 'center-y'
            ? anchorRect.top + anchorRect.height / 2 - rect.height / 2
            : anchorRect.top + anchorRect.height - rect.height;
      const nextY = Math.max(0, Math.round(readCoordinatePx(node.rect.y.base.raw) + (desiredTop - rect.top)));
      if (nextY !== Math.round(readCoordinatePx(node.rect.y.base.raw))) {
        node.rect.y.base = parseUnitValue(`${nextY}px`);
        changed = true;
      }
    }
  }

  return changed ? { ...state, document } : state;
}

export function distributeNodes(
  state: EditorState,
  nodeIds: NodeId[],
  mode: 'horizontal' | 'vertical' | 'left' | 'right' | 'top' | 'bottom',
  rects: Record<NodeId, SelectionRect>,
): EditorState {
  const context = getAlignmentContext(state.document, nodeIds);
  if (!context) {
    return state;
  }

  const items = context.movableIds
    .map((nodeId) => ({ nodeId, rect: rects[nodeId] }))
    .filter((item): item is { nodeId: NodeId; rect: SelectionRect } => Boolean(item.rect))
    .sort((left, right) =>
      mode === 'horizontal' || mode === 'left' || mode === 'right'
        ? left.rect.left - right.rect.left
        : left.rect.top - right.rect.top,
    );
  if (items.length < 3) {
    return state;
  }

  const first = items[0];
  const last = items[items.length - 1];
  const isHorizontal = mode === 'horizontal' || mode === 'left' || mode === 'right';
  const totalSize = items.reduce((sum, item) => sum + (isHorizontal ? item.rect.width : item.rect.height), 0);
  const span = isHorizontal
    ? last.rect.left + last.rect.width - first.rect.left
    : last.rect.top + last.rect.height - first.rect.top;
  const gap = (span - totalSize) / (items.length - 1);

  const document = cloneDocument(state.document);
  let changed = false;
  let cursor =
    mode === 'horizontal'
      ? first.rect.left + first.rect.width + gap
      : mode === 'vertical'
        ? first.rect.top + first.rect.height + gap
        : mode === 'left'
          ? first.rect.left + ((last.rect.left - first.rect.left) / (items.length - 1))
          : mode === 'right'
            ? first.rect.left + first.rect.width + ((last.rect.left + last.rect.width - (first.rect.left + first.rect.width)) / (items.length - 1))
            : mode === 'top'
              ? first.rect.top + ((last.rect.top - first.rect.top) / (items.length - 1))
              : first.rect.top + first.rect.height + ((last.rect.top + last.rect.height - (first.rect.top + first.rect.height)) / (items.length - 1));

  const edgeStep =
    mode === 'left'
      ? (last.rect.left - first.rect.left) / (items.length - 1)
      : mode === 'right'
        ? (last.rect.left + last.rect.width - (first.rect.left + first.rect.width)) / (items.length - 1)
        : mode === 'top'
          ? (last.rect.top - first.rect.top) / (items.length - 1)
          : mode === 'bottom'
            ? (last.rect.top + last.rect.height - (first.rect.top + first.rect.height)) / (items.length - 1)
            : 0;

  for (const item of items.slice(1, -1)) {
    const node = document.nodes[item.nodeId];
    if (!node || node.type === 'site') {
      continue;
    }

    if (isHorizontal) {
      const desiredLeft =
        mode === 'horizontal'
          ? cursor
          : mode === 'left'
            ? cursor
            : cursor - item.rect.width;
      const nextX = Math.max(0, Math.round(readCoordinatePx(node.rect.x.base.raw) + (desiredLeft - item.rect.left)));
      if (nextX !== Math.round(readCoordinatePx(node.rect.x.base.raw))) {
        node.rect.x.base = parseUnitValue(`${nextX}px`);
        changed = true;
      }
      cursor += mode === 'horizontal' ? item.rect.width + gap : edgeStep;
    } else {
      const desiredTop =
        mode === 'vertical'
          ? cursor
          : mode === 'top'
            ? cursor
            : cursor - item.rect.height;
      const nextY = Math.max(0, Math.round(readCoordinatePx(node.rect.y.base.raw) + (desiredTop - item.rect.top)));
      if (nextY !== Math.round(readCoordinatePx(node.rect.y.base.raw))) {
        node.rect.y.base = parseUnitValue(`${nextY}px`);
        changed = true;
      }
      cursor += mode === 'vertical' ? item.rect.height + gap : edgeStep;
    }
  }

  return changed ? { ...state, document } : state;
}

function isReorderableComponent(node: Exclude<DocumentNode, { type: 'site' }>) {
  if (node.type === 'leaf') {
    return true;
  }
  return node.role === 'container';
}

function findSiblingSectionIndex(
  document: DocumentModel,
  siblingIds: NodeId[],
  fromIndex: number,
  direction: -1 | 1,
) {
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

function isSiteSectionRole(role: WrapperRole) {
  return role === 'section' || role === 'header' || role === 'footer';
}

function isMovableAlignmentNode(node: Exclude<DocumentNode, { type: 'site' }>) {
  return node.type === 'leaf' || (node.type === 'wrapper' && node.role === 'container');
}

function getAlignmentContext(document: DocumentModel, nodeIds: NodeId[]) {
  const selectedIds = normalizeSelectedIds(document, nodeIds);
  if (selectedIds.length < 2) {
    return null;
  }

  const anchorId = selectedIds[0];
  const anchorNode = document.nodes[anchorId];
  if (!anchorNode || anchorNode.type === 'site' || !isMovableAlignmentNode(anchorNode) || !anchorNode.parentId) {
    return null;
  }

  if (
    selectedIds.some((nodeId) => {
      const node = document.nodes[nodeId];
      return !node || node.type === 'site' || !isMovableAlignmentNode(node) || node.parentId !== anchorNode.parentId;
    })
  ) {
    return null;
  }

  return {
    anchorId,
    movableIds: selectedIds,
    targetIds: selectedIds.filter((nodeId) => nodeId !== anchorId),
  };
}

function canParentNode(parent: DocumentNode, child: DocumentNode): boolean {
  if (parent.type !== 'wrapper') {
    return false;
  }

  if (child.type === 'leaf') {
    return true;
  }

  if (child.type !== 'wrapper') {
    return false;
  }

  if (child.role !== 'container') {
    return false;
  }

  if (parent.role === 'container') {
    return true;
  }

  return isSiteSectionRole(parent.role);
}

function isDescendant(document: DocumentModel, candidateId: NodeId, targetAncestorId: NodeId) {
  if (candidateId === targetAncestorId) {
    return true;
  }

  let current: DocumentNode | undefined = document.nodes[candidateId];
  while (current?.parentId) {
    if (current.parentId === targetAncestorId) {
      return true;
    }
    current = document.nodes[current.parentId];
  }
  return false;
}

export function reparentNode(
  state: EditorState,
  nodeId: NodeId,
  parentId: NodeId,
  x: string,
  y: string,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  const nextParent = document.nodes[parentId];

  if (!node || !nextParent || node.type === 'site' || nextParent.type !== 'wrapper') {
    return state;
  }

  if (parentId === nodeId) {
    return state;
  }

  if (node.parentId === null || node.parentId === parentId) {
    return moveNode(state, nodeId, { x, y });
  }

  if (!canParentNode(nextParent, node)) {
    return state;
  }

  if (isDescendant(document, parentId, nodeId)) {
    return state;
  }

  const previousParent = document.nodes[node.parentId];
  previousParent.children = previousParent.children.filter((childId) => childId !== nodeId);
  nextParent.children.push(nodeId);
  node.parentId = parentId;
  node.rect.x.base = parseUnitValue(x);
  node.rect.y.base = parseUnitValue(y);

  return { ...state, document };
}

export function requestPromoteWrapperRole(
  state: EditorState,
  wrapperId: NodeId,
  targetRole: 'header' | 'footer',
): EditorState {
  const document = state.document;
  for (const node of Object.values(document.nodes)) {
    if (node.type === 'wrapper' && node.role === targetRole && node.id !== wrapperId) {
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
  const document = cloneDocument(state.document);
  const wrapper = assertWrapper(document.nodes[wrapperId]);
  for (const node of Object.values(document.nodes)) {
    if (
      node.type === 'wrapper' &&
      node.role === targetRole &&
      node.id !== wrapperId &&
      replaceExisting
    ) {
      node.role = 'section';
    }
  }
  wrapper.role = targetRole;
  moveWrapperToRoot(document, wrapper.id, targetRole);
  return { ...state, document };
}

function moveWrapperToRoot(
  document: DocumentModel,
  wrapperId: NodeId,
  targetRole: 'header' | 'footer',
) {
  const wrapper = document.nodes[wrapperId];
  const root = document.nodes[document.rootId];
  if (!wrapper || wrapper.type !== 'wrapper' || root.type !== 'site') {
    return;
  }

  if (wrapper.parentId && wrapper.parentId !== root.id) {
    const previousParent = document.nodes[wrapper.parentId];
    if (previousParent) {
      previousParent.children = previousParent.children.filter((childId) => childId !== wrapper.id);
    }
  }

  root.children = root.children.filter((childId) => childId !== wrapper.id);
  if (targetRole === 'header') {
    root.children.unshift(wrapper.id);
  } else {
    root.children.push(wrapper.id);
  }
  wrapper.parentId = root.id;
}

export function demoteWrapperRole(state: EditorState, wrapperId: NodeId): EditorState {
  const document = cloneDocument(state.document);
  const wrapper = assertWrapper(document.nodes[wrapperId]);
  wrapper.role = 'section';
  return { ...state, document };
}

export function deleteNode(state: EditorState, nodeId: NodeId): EditorState {
  return deleteNodes(state, [nodeId]);
}

export function deleteNodes(state: EditorState, nodeIds: NodeId[]): EditorState {
  const document = cloneDocument(state.document);
  const nextNodeIds = getTopLevelSelectedIds(document, nodeIds);

  if (nextNodeIds.length === 0) {
    return state;
  }

  for (const nodeId of nextNodeIds) {
    const node = document.nodes[nodeId];
    if (!node || node.parentId === null) {
      continue;
    }
    removeRecursively(document, nodeId);
    const parent = document.nodes[node.parentId];
    if (parent) {
      parent.children = parent.children.filter((childId) => childId !== nodeId);
    }
  }

  return applySelectionToDocument(state, document);
}

function removeRecursively(document: DocumentModel, nodeId: NodeId) {
  const node = document.nodes[nodeId];
  for (const childId of node.children) {
    removeRecursively(document, childId);
  }
  delete document.nodes[nodeId];
}

export function getValidationErrors(state: EditorState): string[] {
  return validateDocument(state.document);
}

function readCoordinatePx(raw: string) {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
