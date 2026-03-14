import {
  createDefaultRect,
  createDefaultFooter,
  createDefaultHeader,
  createInitialDocument,
  createLeaf,
  createSectionFromTemplate,
  createWrapper,
  syncIdCountersWithDocument,
  type SectionTemplateId,
} from './defaults';
import { validateDocument } from './validation';
import type {
  DocumentModel,
  DocumentNode,
  LeafRole,
  LinkLeaf,
  NodeId,
  StickyDefinition,
  TextLeaf,
  WrapperRole,
  WrapperNode,
} from './types';
import { parseHeightValue, parseUnitValue, parseWidthValue } from './units';

export type ConfirmReplaceRole = {
  requestedId: NodeId;
  targetRole: 'header' | 'footer';
  existingId: NodeId;
};

export type NodeOrderAction = 'back' | 'forward' | 'sendToBack' | 'bringToFront';

export type EditorState = {
  document: DocumentModel;
  selectedId: NodeId | null;
  pendingRoleSwap: ConfirmReplaceRole | null;
  ui: {
    previewSticky: boolean;
    spacerVisibility: 'selected' | 'all';
    showGridLanes: boolean;
    snapEnabled: boolean;
  };
};

export const STORAGE_KEY = 'sticky-playground.editor-state.v1';
export const DEFAULT_DOCUMENT_STORAGE_KEY = 'sticky-playground.default-document.v1';

export function createInitialState(): EditorState {
  return {
    document: loadDefaultDocument(),
    selectedId: null,
    pendingRoleSwap: null,
    ui: {
      previewSticky: true,
      spacerVisibility: 'selected',
      showGridLanes: false,
      snapEnabled: true,
    },
  };
}

export function loadPersistedState(): EditorState {
  if (typeof window === 'undefined') {
    return createInitialState();
  }

  try {
    ensureDefaultDocumentSeeded();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw) as EditorState;
    const normalizedDocument = normalizeDocument(parsed.document);
    const candidate: EditorState = {
      ...parsed,
      document: normalizedDocument,
      selectedId: parsed.selectedId && normalizedDocument.nodes[parsed.selectedId] ? parsed.selectedId : null,
      pendingRoleSwap: null,
      ui: {
        previewSticky: parsed.ui?.previewSticky ?? true,
        spacerVisibility:
          parsed.ui?.spacerVisibility === 'all' || parsed.ui?.spacerVisibility === 'selected'
            ? parsed.ui.spacerVisibility
            : 'selected',
        showGridLanes: parsed.ui?.showGridLanes ?? false,
        snapEnabled: parsed.ui?.snapEnabled ?? true,
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

function loadDefaultDocument(): DocumentModel {
  if (typeof window === 'undefined') {
    return createInitialDocument();
  }

  try {
    const raw = window.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY);
    if (!raw) {
      return createInitialDocument();
    }
    const document = normalizeDocument(JSON.parse(raw) as DocumentModel);
    const errors = validateDocument(document);
    if (errors.length > 0) {
      return createInitialDocument();
    }
    return document;
  } catch {
    return createInitialDocument();
  }
}

function ensureDefaultDocumentSeeded() {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY)) {
    return;
  }

  const persistedSession = window.localStorage.getItem(STORAGE_KEY);
  if (persistedSession) {
    try {
      const parsed = JSON.parse(persistedSession) as EditorState;
      const document = normalizeDocument(parsed.document);
      const errors = validateDocument(document);
      if (errors.length === 0) {
        window.localStorage.setItem(DEFAULT_DOCUMENT_STORAGE_KEY, JSON.stringify(document));
        return;
      }
    } catch {
      // fall through to factory default
    }
  }

  window.localStorage.setItem(
    DEFAULT_DOCUMENT_STORAGE_KEY,
    JSON.stringify(createInitialDocument()),
  );
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

  const bottom = sticky.edges?.bottom ?? false;
  let top = sticky.edges?.top ?? (bottom ? false : true);
  let normalizedBottom = bottom;

  // Heuristic migration: keep single-edge intent when legacy data accidentally persisted both edges.
  if (top && normalizedBottom) {
    if (!sticky.offsetTop && sticky.offsetBottom) {
      top = false;
    } else if (sticky.offsetTop && !sticky.offsetBottom) {
      normalizedBottom = false;
    }
  }

  const duration = sticky.duration ?? parseUnitValue('50vh');
  const durationTop = sticky.durationTop ?? duration;
  const durationBottom = sticky.durationBottom ?? duration;

  return {
    ...sticky,
    enabled: sticky.enabled ?? false,
    target: sticky.target ?? 'self',
    durationMode: sticky.durationMode ?? 'auto',
    duration,
    durationTop,
    durationBottom,
    edges: { top, bottom: normalizedBottom },
  };
}

function normalizeDocument(document: DocumentModel): DocumentModel {
  const normalized = cloneDocument(document);
  syncIdCountersWithDocument(normalized);
  for (const node of Object.values(normalized.nodes)) {
    if (node.type === 'site') {
      continue;
    }
    node.sticky = normalizeSticky(node.sticky);
  }
  ensureDefaultSiteSections(normalized);
  upgradeLegacyStarterShell(normalized);
  return normalized;
}

function upgradeLegacyStarterShell(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return;
  }

  const wrappers = root.children
    .map((id) => document.nodes[id])
    .filter((node): node is WrapperNode => Boolean(node && node.type === 'wrapper'));

  const header = wrappers.find((node) => node.role === 'header');
  const footer = wrappers.find((node) => node.role === 'footer');

  if (header && isLegacyHeader(document, header)) {
    applyModernHeader(document, header);
  }

  if (footer && isLegacyFooter(document, footer)) {
    applyModernFooter(document, footer);
  }
}

function isLegacyHeader(document: DocumentModel, header: WrapperNode) {
  if (header.name === 'Primary Header') {
    return true;
  }

  const children = header.children.map((id) => document.nodes[id]).filter(Boolean);
  const brandName = children.find(
    (node): node is TextLeaf => node.type === 'leaf' && node.role === 'text' && node.content === 'Business Name',
  );
  const homeLink = children.find(
    (node) => node.type === 'leaf' && node.role === 'link' && node.label === 'Home',
  );
  if (brandName && homeLink) {
    return true;
  }

  const hasLegacyModernMark = children.some(
    (node) => node.type === 'leaf' && node.role === 'image' && node.name === 'Brand Mark',
  );
  const hasStarterTitle = children.some(
    (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Product Title' && node.content === 'Sticky Playground',
  );
  if (hasLegacyModernMark && hasStarterTitle) {
    return true;
  }

  const textOnlyStarterTitle = children.find(
    (node): node is TextLeaf =>
      node.type === 'leaf' && node.role === 'text' && node.name === 'Product Title' && node.content === 'Sticky Playground',
  );
  const titleX = textOnlyStarterTitle ? parseFloat(textOnlyStarterTitle.rect.x.base.raw) || 0 : 0;
  return Boolean(textOnlyStarterTitle && titleX < 40);
}

function isLegacyFooter(document: DocumentModel, footer: WrapperNode) {
  if (footer.name === 'Footer') {
    return true;
  }

  const children = footer.children.map((id) => document.nodes[id]).filter(Boolean);
  const hasOldBusinessCopy = children.some(
    (node) =>
      node.type === 'leaf' &&
      node.role === 'text' &&
      node.content.includes('Built for sticky exploration'),
  );
  if (hasOldBusinessCopy) {
    return true;
  }

  const modernCopy = children.find(
    (node): node is TextLeaf =>
      node.type === 'leaf' &&
      node.role === 'text' &&
      node.name === 'Footer Copy' &&
      node.content === 'A prototyping surface for sticky logic, spacing strategy, and interaction QA.',
  );
  const hasModernMeta = children.some(
    (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Footer Meta',
  );
  if (hasModernMeta) {
    return true;
  }

  const copyY = modernCopy ? parseFloat(modernCopy.rect.y.base.raw) || 0 : 0;
  return Boolean(modernCopy && copyY < 45);
}

function applyModernHeader(document: DocumentModel, header: WrapperNode) {
  const previousChildren = [...header.children];
  for (const childId of previousChildren) {
    removeNodeSubtree(document, childId);
  }

  header.name = 'Playground Header';
  header.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  header.style.background = '#f8fbff';
  header.style.borderColor = '#d6e2f2';
  header.style.paddingTop = parseUnitValue('20px');
  header.style.paddingRight = parseUnitValue('48px');
  header.style.paddingBottom = parseUnitValue('20px');
  header.style.paddingLeft = parseUnitValue('48px');

  const title = createUniqueLeaf(document, 'text', header.id) as TextLeaf;
  title.name = 'Product Title';
  title.content = 'Sticky Playground';
  title.rect = createDefaultRect('62px', '25.5px', 'fit-content', 'auto');
  title.style ??= {};
  title.style.color = '#0f172a';
  title.style.fontSize = parseUnitValue('20px');
  title.style.fontWeight = 'bold';

  const subtitle = createUniqueLeaf(document, 'text', header.id) as TextLeaf;
  subtitle.name = 'Product Subtitle';
  subtitle.content = 'Model, preview, and validate sticky behavior before implementation.';
  subtitle.rect = createDefaultRect('61px', '60px', 'fit-content', 'auto');
  subtitle.style ??= {};
  subtitle.style.color = '#516174';
  subtitle.style.fontSize = parseUnitValue('14px');

  const templatesLink = createUniqueLeaf(document, 'link', header.id) as LinkLeaf;
  templatesLink.name = 'Templates Link';
  templatesLink.label = 'Templates';
  templatesLink.rect = createDefaultRect('836px', '48px', 'fit-content', 'auto');

  const stickyLink = createUniqueLeaf(document, 'link', header.id) as LinkLeaf;
  stickyLink.name = 'Sticky Demos Link';
  stickyLink.label = 'Sticky Demos';
  stickyLink.rect = createDefaultRect('947px', '48px', 'fit-content', 'auto');

  const testPlanLink = createUniqueLeaf(document, 'link', header.id) as LinkLeaf;
  testPlanLink.name = 'Test Plan Link';
  testPlanLink.label = 'Test Plan';
  testPlanLink.rect = createDefaultRect('1082px', '48px', '144px', '24px');

  document.nodes[title.id] = title;
  document.nodes[subtitle.id] = subtitle;
  document.nodes[templatesLink.id] = templatesLink;
  document.nodes[stickyLink.id] = stickyLink;
  document.nodes[testPlanLink.id] = testPlanLink;
  header.children = [title.id, subtitle.id, templatesLink.id, stickyLink.id, testPlanLink.id];
}

function applyModernFooter(document: DocumentModel, footer: WrapperNode) {
  const previousChildren = [...footer.children];
  for (const childId of previousChildren) {
    removeNodeSubtree(document, childId);
  }

  footer.name = 'Playground Footer';
  footer.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  footer.style.background = '#f8fbff';
  footer.style.borderColor = '#d6e2f2';
  footer.style.paddingTop = parseUnitValue('26px');
  footer.style.paddingRight = parseUnitValue('48px');
  footer.style.paddingBottom = parseUnitValue('26px');
  footer.style.paddingLeft = parseUnitValue('48px');

  const title = createUniqueLeaf(document, 'text', footer.id) as TextLeaf;
  title.name = 'Footer Title';
  title.content = 'Sticky Playground';
  title.rect = createDefaultRect('67px', '28px', 'fit-content', 'auto');
  title.style ??= {};
  title.style.color = '#0f172a';
  title.style.fontSize = parseUnitValue('16px');
  title.style.fontWeight = 'bold';
  title.style.lineHeight = 1.2;

  const copy = createUniqueLeaf(document, 'text', footer.id) as TextLeaf;
  copy.name = 'Footer Copy';
  copy.content = 'A prototyping surface for sticky logic, spacing strategy, and interaction QA.';
  copy.rect = createDefaultRect('64px', '53px', '271px', '38px');
  copy.style ??= {};
  copy.style.color = '#475569';
  copy.style.fontSize = parseUnitValue('14px');
  copy.style.lineHeight = 1.3;

  const repoLink = createUniqueLeaf(document, 'link', footer.id) as LinkLeaf;
  repoLink.name = 'Repository Link';
  repoLink.label = 'github.com/tombigel/codex-playground';
  repoLink.href = 'https://github.com/tombigel/codex-playground';
  repoLink.rect = createDefaultRect('866px', '48px', '322px', '24px');

  document.nodes[title.id] = title;
  document.nodes[copy.id] = copy;
  document.nodes[repoLink.id] = repoLink;
  footer.children = [title.id, copy.id, repoLink.id];
}

function removeNodeSubtree(document: DocumentModel, nodeId: NodeId) {
  const node = document.nodes[nodeId];
  if (!node) {
    return;
  }
  for (const childId of node.children) {
    removeNodeSubtree(document, childId);
  }
  delete document.nodes[nodeId];
}

function ensureDefaultSiteSections(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return;
  }

  const wrappers = root.children
    .map((id) => document.nodes[id])
    .filter((node): node is WrapperNode => Boolean(node && node.type === 'wrapper'));

  const hasHeader = wrappers.some((node) => node.role === 'header');
  const hasFooter = wrappers.some((node) => node.role === 'footer');

  if (!hasHeader) {
    const { wrapper, nodes } = createDefaultHeader(document.rootId);
    Object.assign(document.nodes, nodes);
    root.children.unshift(wrapper.id);
  }

  if (!hasFooter) {
    const { wrapper, nodes } = createDefaultFooter(document.rootId);
    Object.assign(document.nodes, nodes);
    root.children.push(wrapper.id);
  }
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
  syncIdCountersWithDocument(document);
  const parentId = state.selectedId
    ? getInsertionParent(document, state.selectedId, role === 'container' ? 'containerWrapper' : 'siteWrapper')
    : role === 'container'
      ? findFirstSection(document) ?? document.rootId
      : document.rootId;
  const node = createUniqueWrapper(document, role, parentId);
  document.nodes[node.id] = node;
  document.nodes[parentId].children.push(node.id);
  return { ...state, document, selectedId: node.id };
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

  return { ...state, document, selectedId: wrapper.id };
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

function createUniqueWrapper(document: DocumentModel, role: WrapperRole, parentId: NodeId) {
  let node = createWrapper(role, parentId);
  while (document.nodes[node.id]) {
    node = createWrapper(role, parentId);
  }
  return node;
}

function createUniqueLeaf(document: DocumentModel, role: LeafRole, parentId: NodeId) {
  let node = createLeaf(role, parentId);
  while (document.nodes[node.id]) {
    node = createLeaf(role, parentId);
  }
  return node;
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
  } else if (field === 'fontSize' && node.type === 'leaf' && node.role === 'text') {
    node.style ??= {};
    node.style.fontSize = parseUnitValue(value);
  } else if (field === 'fontWeight' && node.type === 'leaf' && node.role === 'text') {
    node.style ??= {};
    node.style.fontWeight = value === 'bold' ? 'bold' : 'normal';
  } else if (field === 'fontStyle' && node.type === 'leaf' && node.role === 'text') {
    node.style ??= {};
    node.style.fontStyle = value === 'italic' ? 'italic' : 'normal';
  } else if (field === 'lineHeight' && node.type === 'leaf' && node.role === 'text') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      node.style ??= {};
      node.style.lineHeight = parsed;
    }
  } else if (field === 'textAlign' && node.type === 'leaf' && node.role === 'text') {
    node.style ??= {};
    node.style.textAlign = value === 'center' || value === 'right' ? value : 'left';
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
    durationMode: 'auto',
    duration: parseUnitValue('50vh'),
    durationTop: parseUnitValue('50vh'),
    durationBottom: parseUnitValue('50vh'),
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
    selectedId:
      state.selectedId && !document.nodes[state.selectedId]
        ? null
        : state.selectedId,
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
