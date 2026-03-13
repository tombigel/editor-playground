import { createInitialDocument, createLeaf, createWrapper } from './defaults';
import { validateDocument } from './validation';
import type {
  DocumentModel,
  DocumentNode,
  LeafRole,
  NodeId,
  StickyDefinition,
  WrapperRole,
  WrapperNode,
} from './types';
import { parseHeightValue, parseUnitValue, parseWidthValue } from './units';

export type ConfirmReplaceRole = {
  requestedId: NodeId;
  targetRole: 'header' | 'footer';
  existingId: NodeId;
};

export type EditorState = {
  document: DocumentModel;
  selectedId: NodeId | null;
  pendingRoleSwap: ConfirmReplaceRole | null;
  ui: {
    previewSticky: boolean;
    showSpacers: boolean;
  };
};

export const STORAGE_KEY = 'sticky-playground.editor-state.v1';

export function createInitialState(): EditorState {
  return {
    document: createInitialDocument(),
    selectedId: null,
    pendingRoleSwap: null,
    ui: {
      previewSticky: true,
      showSpacers: true,
    },
  };
}

export function loadPersistedState(): EditorState {
  if (typeof window === 'undefined') {
    return createInitialState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw) as EditorState;
    const candidate: EditorState = {
      ...parsed,
      document: normalizeDocument(parsed.document),
      pendingRoleSwap: null,
      ui: {
        previewSticky: parsed.ui?.previewSticky ?? true,
        showSpacers: parsed.ui?.showSpacers ?? true,
      },
    };
    const errors = validateDocument(candidate.document);
    if (errors.length > 0) {
      return createInitialState();
    }
    return candidate;
  } catch {
    return createInitialState();
  }
}

export function persistState(state: EditorState) {
  if (typeof window === 'undefined') {
    return;
  }
  const serializable: EditorState = {
    ...state,
    pendingRoleSwap: null,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

export function clearPersistedState() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

function cloneDocument(document: DocumentModel): DocumentModel {
  return {
    rootId: document.rootId,
    nodes: structuredClone(document.nodes),
  };
}

function normalizeSticky(sticky: StickyDefinition | undefined): StickyDefinition | undefined {
  if (!sticky) {
    return undefined;
  }

  return {
    ...sticky,
    enabled: sticky.enabled ?? false,
    target: sticky.target ?? 'self',
    duration: sticky.duration ?? parseUnitValue('50vh'),
    edges: {
      top: true,
      bottom: false,
      ...sticky.edges,
    },
  };
}

function normalizeDocument(document: DocumentModel): DocumentModel {
  const normalized = cloneDocument(document);
  for (const node of Object.values(normalized.nodes)) {
    if (node.type === 'site') {
      continue;
    }
    node.sticky = normalizeSticky(node.sticky);
  }
  return normalized;
}

function assertWrapper(node: DocumentNode): WrapperNode {
  if (node.type !== 'wrapper') {
    throw new Error(`Expected wrapper, got ${node.type}`);
  }
  return node;
}

export function selectNode(state: EditorState, selectedId: NodeId | null): EditorState {
  return { ...state, selectedId };
}

export function insertWrapper(state: EditorState, role: WrapperRole): EditorState {
  const document = cloneDocument(state.document);
  const parentId = state.selectedId
    ? getInsertionParent(document, state.selectedId, role === 'container' ? 'containerWrapper' : 'siteWrapper')
    : role === 'container'
      ? findFirstSection(document) ?? document.rootId
      : document.rootId;
  const node = createWrapper(role, parentId);
  document.nodes[node.id] = node;
  document.nodes[parentId].children.push(node.id);
  return { ...state, document, selectedId: node.id };
}

export function insertLeaf(state: EditorState, role: LeafRole): EditorState {
  const document = cloneDocument(state.document);
  const parentId = state.selectedId
    ? getInsertionParent(document, state.selectedId, 'leaf')
    : findFirstSection(document) ?? document.rootId;
  const node = createLeaf(role, parentId);
  document.nodes[node.id] = node;
  document.nodes[parentId].children.push(node.id);
  return { ...state, document, selectedId: node.id };
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
    return selected.type === 'wrapper' ? selected.id : selected.parentId!;
  }
  if (insertType === 'containerWrapper') {
    if (selected.type === 'wrapper') {
      return selected.id;
    }
    return selected.parentId!;
  }
  if (selected.type === 'wrapper') {
    return document.rootId;
  }
  return document.rootId;
}

export function updateTextField(
  state: EditorState,
  nodeId: NodeId,
  field: string,
  value: string,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (node.type === 'site') {
    return state;
  }

  if (field === 'name') {
    node.name = value;
  } else if (field === 'content' && node.type === 'leaf' && node.role === 'text') {
    node.content = value;
  } else if (field === 'label' && node.type === 'leaf' && 'label' in node) {
    node.label = value;
  } else if (field === 'href' && node.type === 'leaf' && node.role === 'link') {
    node.href = value;
  } else if (field === 'src' && node.type === 'leaf' && node.role === 'image') {
    node.src = value;
  } else if (field === 'alt' && node.type === 'leaf' && node.role === 'image') {
    node.alt = value;
  }

  return { ...state, document };
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
    duration: parseUnitValue('50vh'),
    ...node.sticky,
    ...patch,
  };
  return { ...state, document };
}

export function updateWrapperStyleField(
  state: EditorState,
  nodeId: NodeId,
  field: 'background',
  value: string,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (node.type !== 'wrapper') {
    return state;
  }
  node.style[field] = value || undefined;
  return { ...state, document };
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

function isSiteSectionRole(role: WrapperRole) {
  return role === 'section' || role === 'header' || role === 'footer';
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
  let current: DocumentNode | undefined = document.nodes[candidateId];
  while (current && current.parentId) {
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
  const root = document.nodes[document.rootId];
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
  wrapper.parentId = root.id;
  return { ...state, document };
}

export function demoteWrapperRole(state: EditorState, wrapperId: NodeId): EditorState {
  const document = cloneDocument(state.document);
  const wrapper = assertWrapper(document.nodes[wrapperId]);
  wrapper.role = 'section';
  return { ...state, document };
}

export function deleteNode(state: EditorState, nodeId: NodeId): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (!node || node.parentId === null) {
    return state;
  }
  removeRecursively(document, nodeId);
  const parent = document.nodes[node.parentId];
  parent.children = parent.children.filter((childId) => childId !== nodeId);
  return {
    ...state,
    document,
    selectedId: state.selectedId === nodeId ? null : state.selectedId,
  };
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
