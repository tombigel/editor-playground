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
} from '../model/defaults';
import { ensureDocumentFontFamilyByName, normalizeDocumentFontState } from '../fonts';
import { validateDocument } from '../model/validation';
import type {
  BorderColorField,
  BorderRadiusField,
  BorderWidthField,
  ButtonLeaf,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  LeafRole,
  LinkLeaf,
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
import { normalizeThemeMode } from '../lib/theme';
import type { EditorState, FocusedMode, NodeOrderAction } from './types';
import { getTopLevelSelectedIds, normalizeSelectedIds, toggleSelectedId, toggleSelectedIds } from './selection';
export type { ConfirmReplaceRole, EditorState, FocusedMode, NodeOrderAction } from './types';

export const STORAGE_KEY = 'sticky-playground.editor-state.v1';
export const DEFAULT_DOCUMENT_STORAGE_KEY = 'sticky-playground.default-document.v1';

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function createInitialState(): EditorState {
  const ui = createDefaultUiState();
  return {
    document: loadDefaultDocument(),
    selectedId: null,
    selectedIds: [],
    pendingRoleSwap: null,
    ui: {
      ...ui,
      focusedMode: ui.startupFocusedMode,
      inspectorCollapsed: ui.startupFocusedMode ? true : ui.inspectorCollapsed,
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
    const startupFocusedMode = normalizeFocusedMode(parsed.ui?.startupFocusedMode);
    const selectedIds = normalizeSelectedIds(
      normalizedDocument,
      Array.isArray((parsed as Partial<EditorState>).selectedIds) ? (parsed as Partial<EditorState>).selectedIds : undefined,
      parsed.selectedId,
    );
    const candidate: EditorState = {
      ...parsed,
      document: normalizedDocument,
      selectedId: selectedIds[0] ?? null,
      selectedIds,
      pendingRoleSwap: null,
      ui: {
        previewSticky: parsed.ui?.previewSticky ?? true,
        spacerVisibility:
          parsed.ui?.spacerVisibility === 'all' || parsed.ui?.spacerVisibility === 'selected'
            ? parsed.ui.spacerVisibility
            : 'selected',
        showGridLanes: parsed.ui?.showGridLanes ?? false,
        snapEnabled: parsed.ui?.snapEnabled ?? true,
        themeMode: normalizeThemeMode(parsed.ui?.themeMode),
        focusedMode: startupFocusedMode,
        startupFocusedMode,
        inspectorCollapsed: startupFocusedMode ? true : parsed.ui?.inspectorCollapsed ?? false,
        temporaryInspectorOpen: false,
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

export function persistDefaultDocument(document: DocumentModel) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(DEFAULT_DOCUMENT_STORAGE_KEY, JSON.stringify(document));
}

export function clearSessionState() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function clearPersistedState() {
  if (typeof window === 'undefined') {
    return;
  }
  clearSessionState();
  window.localStorage.removeItem(DEFAULT_DOCUMENT_STORAGE_KEY);
}

export function createFactoryResetState(ui?: EditorState['ui']): EditorState {
  const document = createInitialDocument();
  return {
    document,
    selectedId: null,
    selectedIds: [],
    pendingRoleSwap: null,
    ui: ui ? { ...ui, temporaryInspectorOpen: false } : createDefaultUiState(),
  };
}

function createDefaultUiState(): EditorState['ui'] {
  return {
    previewSticky: true,
    spacerVisibility: 'selected',
    showGridLanes: false,
    snapEnabled: true,
    themeMode: 'auto',
    focusedMode: null,
    startupFocusedMode: null,
    inspectorCollapsed: false,
    temporaryInspectorOpen: false,
  };
}

function normalizeFocusedMode(value: unknown): FocusedMode {
  return value === 'sticky' ? 'sticky' : null;
}

export function parseImportedDocumentJson(raw: string): DocumentModel {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Import failed: invalid JSON.');
  }

  try {
    const document = normalizeDocument(parsed as DocumentModel);
    const errors = validateDocument(document);
    if (errors.length > 0) {
      throw new Error(`Import failed: ${errors.join('; ')}`);
    }
    return document;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Import failed:')) {
      throw error;
    }
    throw new Error('Import failed: invalid document structure.');
  }
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
    fontLibrary: structuredClone(document.fontLibrary),
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
  const normalized = normalizeDocumentFontState(cloneDocument(document));
  syncIdCountersWithDocument(normalized);
  for (const node of Object.values(normalized.nodes)) {
    if (node.type === 'site') {
      continue;
    }
    if (node.type === 'leaf' && node.role === 'text') {
      node.htmlTag = normalizeTextHtmlTag(node.htmlTag);
    }
    node.sticky = normalizeSticky(node.sticky);
    if (node.type === 'wrapper' && node.role === 'container' && node.sticky?.target === 'contentWrapper') {
      node.sticky.target = 'self';
    }
    if (node.type === 'wrapper' && isStructuralWrapper(node.role) && node.style.background) {
      node.style.background = forceOpaqueColorValue(node.style.background);
    }
  }
  ensureDefaultSiteSections(normalized);
  upgradeLegacyStarterSection(normalized);
  upgradeLegacyStarterShell(normalized);
  normalizeStarterShellTextTags(normalized);
  renameRepositoryLinks(normalized);
  return normalized;
}

function normalizeTextHtmlTag(
  htmlTag: TextLeaf['htmlTag'] | undefined,
): TextLeaf['htmlTag'] {
  switch (htmlTag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
    case 'p':
    case 'blockquote':
    case 'div':
      return htmlTag;
    default:
      return 'p';
  }
}

function renameRepositoryLinks(document: DocumentModel) {
  for (const node of Object.values(document.nodes)) {
    if (node.type !== 'leaf' || node.role !== 'link') {
      continue;
    }

    if (node.label === 'github.com/tombigel/codex-playground') {
      node.label = 'github.com/tombigel/sticky-playground';
    }

    if (node.href === 'https://github.com/tombigel/codex-playground') {
      node.href = 'https://github.com/tombigel/sticky-playground';
    }
  }
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

function normalizeStarterShellTextTags(document: DocumentModel) {
  for (const node of Object.values(document.nodes)) {
    if (node.type !== 'leaf' || node.role !== 'text') {
      continue;
    }

    if (node.name === 'Product Title' && node.content === 'Sticky Playground') {
      node.htmlTag = 'h1';
    }

    if (node.name === 'Footer Title' && node.content === 'Sticky Playground') {
      node.htmlTag = 'h2';
    }
  }
}

function upgradeLegacyStarterSection(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'site') {
    return;
  }

  const sections = root.children
    .map((id) => document.nodes[id])
    .filter((node): node is WrapperNode => Boolean(node && node.type === 'wrapper' && node.role === 'section'));

  if (sections.length !== 1) {
    return;
  }

  const [legacySection] = sections;
  if (!legacySection || !isLegacyStarterSection(document, legacySection)) {
    return;
  }

  const sectionIndex = root.children.indexOf(legacySection.id);
  removeNodeSubtree(document, legacySection.id);

  const { wrapper, nodes } = createSectionFromTemplate('post', document.rootId);
  Object.assign(document.nodes, nodes);
  root.children.splice(sectionIndex, 1, wrapper.id);
}

function isLegacyStarterSection(document: DocumentModel, section: WrapperNode) {
  if (
    section.name !== 'Section' ||
    section.rect.width.base.raw !== '100%' ||
    section.rect.height.base.raw !== '480px' ||
    section.children.length !== 2
  ) {
    return false;
  }

  const [firstChildId, secondChildId] = section.children;
  const firstChild = document.nodes[firstChildId];
  const secondChild = document.nodes[secondChildId];

  return isLegacyStarterText(firstChild) && isLegacyStarterButton(secondChild);
}

function isLegacyStarterText(node: DocumentNode | undefined): node is TextLeaf {
  return Boolean(
    node &&
      node.type === 'leaf' &&
      node.role === 'text' &&
      node.name === 'Text' &&
      node.content === 'Edit text' &&
      node.rect.x.base.raw === '32px' &&
      node.rect.y.base.raw === '32px' &&
      node.rect.width.base.raw === 'fit-content' &&
      node.rect.height.base.raw === 'auto',
  );
}

function isLegacyStarterButton(node: DocumentNode | undefined): node is ButtonLeaf {
  return Boolean(
    node &&
      node.type === 'leaf' &&
      node.role === 'button' &&
      node.name === 'Button' &&
      node.label === 'Button' &&
      node.rect.x.base.raw === '32px' &&
      node.rect.y.base.raw === '32px' &&
      node.rect.width.base.raw === 'fit-content' &&
      node.rect.height.base.raw === 'auto',
  );
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
  header.style.paddingTop = parseSpacingValue('20px');
  header.style.paddingRight = parseSpacingValue('48px');
  header.style.paddingBottom = parseSpacingValue('20px');
  header.style.paddingLeft = parseSpacingValue('48px');

  const title = createUniqueLeaf(document, 'text', header.id) as TextLeaf;
  title.name = 'Product Title';
  title.content = 'Sticky Playground';
  title.rect = createDefaultRect('62px', '25.5px', 'fit-content', 'auto');
  title.style ??= {};
  title.style.color = '#0f172a';
  title.style.fontSize = parseFontSizeValue('20px');
  title.style.fontWeight = 700;
  title.htmlTag = 'h1';

  const subtitle = createUniqueLeaf(document, 'text', header.id) as TextLeaf;
  subtitle.name = 'Product Subtitle';
  subtitle.content = 'Model, preview, and validate sticky behavior before implementation.';
  subtitle.rect = createDefaultRect('61px', '60px', 'fit-content', 'auto');
  subtitle.style ??= {};
  subtitle.style.color = '#516174';
  subtitle.style.fontSize = parseFontSizeValue('14px');

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
  footer.style.paddingTop = parseSpacingValue('26px');
  footer.style.paddingRight = parseSpacingValue('48px');
  footer.style.paddingBottom = parseSpacingValue('26px');
  footer.style.paddingLeft = parseSpacingValue('48px');

  const title = createUniqueLeaf(document, 'text', footer.id) as TextLeaf;
  title.name = 'Footer Title';
  title.content = 'Sticky Playground';
  title.rect = createDefaultRect('67px', '28px', 'fit-content', 'auto');
  title.style ??= {};
  title.style.color = '#0f172a';
  title.style.fontSize = parseFontSizeValue('16px');
  title.style.fontWeight = 700;
  title.style.lineHeight = 1.2;
  title.htmlTag = 'h2';

  const copy = createUniqueLeaf(document, 'text', footer.id) as TextLeaf;
  copy.name = 'Footer Copy';
  copy.content = 'A prototyping surface for sticky logic, spacing strategy, and interaction QA.';
  copy.rect = createDefaultRect('64px', '53px', '271px', '38px');
  copy.style ??= {};
  copy.style.color = '#475569';
  copy.style.fontSize = parseFontSizeValue('14px');
  copy.style.lineHeight = 1.3;

  const repoLink = createUniqueLeaf(document, 'link', footer.id) as LinkLeaf;
  repoLink.name = 'Repository Link';
  repoLink.label = 'github.com/tombigel/sticky-playground';
  repoLink.href = 'https://github.com/tombigel/sticky-playground';
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

function applySelection(state: EditorState, selectedIds: NodeId[]) {
  const normalized = normalizeSelectedIds(state.document, selectedIds);
  return {
    ...state,
    selectedId: normalized[0] ?? null,
    selectedIds: normalized,
  };
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

export function selectNode(state: EditorState, selectedId: NodeId | null): EditorState {
  return applySelection(state, selectedId ? [selectedId] : []);
}

export function clearSelection(state: EditorState): EditorState {
  return applySelection(state, []);
}

export function toggleNodeSelection(state: EditorState, selectedId: NodeId): EditorState {
  return applySelection(state, toggleSelectedId(state.selectedIds, selectedId));
}

export function selectManyNodes(
  state: EditorState,
  selectedIds: NodeId[],
  mode: 'replace' | 'toggle',
): EditorState {
  return applySelection(
    state,
    mode === 'toggle' ? toggleSelectedIds(state.selectedIds, selectedIds) : selectedIds,
  );
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

  return applySelectionToDocument(state, document, [wrapper.id]);
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
  } else if (field === 'href' && node.type === 'leaf' && node.role === 'link') {
    node.href = value;
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

function isStructuralWrapper(role: WrapperRole) {
  return role === 'section' || role === 'header' || role === 'footer';
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

  const selectedNodes = selectedIds
    .map((nodeId) => document.nodes[nodeId])
    .filter((node): node is Exclude<DocumentNode, { type: 'site' }> => Boolean(node && node.type !== 'site'));
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
