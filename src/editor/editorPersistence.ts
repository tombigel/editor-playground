import {
  createDefaultRect,
  createDefaultFooter,
  createDefaultHeader,
  createInitialDocument,
  createLeaf,
  createSectionFromTemplate,
  syncIdCountersWithDocument,
} from '../model/defaults';
import { normalizeDocumentFontState } from '../fonts';
import { getLinkHref } from '../model/links';
import { validateDocument } from '../model/validation';
import type {
  ButtonLeaf,
  DocumentModel,
  DocumentNode,
  LeafRole,
  LinkLeaf,
  NodeId,
  StickyDefinition,
  TextLeaf,
  WrapperRole,
  WrapperNode,
} from '../model/types';
import { parseFontSizeValue, parseSpacingValue, parseUnitValue } from '../model/units';
import { forceOpaqueColorValue } from '../model/colors';
import {
  DEFAULT_EDITOR_ACCENT_COLOR,
  DEFAULT_EDITOR_DARK_THEME,
  DEFAULT_EDITOR_LIGHT_THEME,
  DEFAULT_MONOKAI_ACCENT_COLOR,
  DEFAULT_PAPER_ACCENT_COLOR,
  normalizeEditorAccentColor,
  normalizeEditorDarkTheme,
  normalizeEditorLightTheme,
  normalizeThemeMode,
} from '../lib/theme';
import { normalizeFocusedMode, resolveFocusedModeUrlOverride } from './focusedModes';
import { DEFAULT_FOCUSED_PANEL_OFFSET, normalizeFocusedPanelOffset } from './focusedPanelPosition';
import type { EditorState } from './types';
import { normalizeSelectedIds } from './selection';

export const STORAGE_KEY = 'sticky-playground.editor-state.v1';
export const DEFAULT_DOCUMENT_STORAGE_KEY = 'sticky-playground.default-document.v1';

export function createInitialState(): EditorState {
  const ui = createDefaultUiState();
  const focusedModeOverride = resolveFocusedModeUrlOverride(
    typeof window !== 'undefined' ? (window as Window & { location?: { search?: string } }).location?.search : undefined,
  );
  const startupFocusedMode = focusedModeOverride === undefined ? ui.startupFocusedMode : focusedModeOverride;
  return {
    document: loadDefaultDocument(),
    selectedId: null,
    selectedIds: [],
    pendingRoleSwap: null,
    ui: {
      ...ui,
      focusedMode: startupFocusedMode,
      startupFocusedMode,
      inspectorCollapsed: startupFocusedMode ? true : ui.inspectorCollapsed,
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
    const persistedStartupFocusedMode = normalizeFocusedMode(parsed.ui?.startupFocusedMode);
    const focusedModeOverride = resolveFocusedModeUrlOverride(
      (window as Window & { location?: { search?: string } }).location?.search,
    );
    const startupFocusedMode =
      focusedModeOverride === undefined ? persistedStartupFocusedMode : focusedModeOverride;
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
        accentColor: normalizeEditorAccentColor(parsed.ui?.accentColor),
        paperAccentColor: normalizeEditorAccentColor(parsed.ui?.paperAccentColor, DEFAULT_PAPER_ACCENT_COLOR),
        monokaiAccentColor: normalizeEditorAccentColor(
          parsed.ui?.monokaiAccentColor,
          DEFAULT_MONOKAI_ACCENT_COLOR,
        ),
        lightTheme: normalizeEditorLightTheme(parsed.ui?.lightTheme),
        darkTheme: normalizeEditorDarkTheme(parsed.ui?.darkTheme),
        focusedMode: startupFocusedMode,
        startupFocusedMode,
        inspectorCollapsed: startupFocusedMode ? true : parsed.ui?.inspectorCollapsed ?? false,
        temporaryInspectorOpen: false,
        focusedPanelOffset: normalizeFocusedPanelOffset(parsed.ui?.focusedPanelOffset),
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
    accentColor: DEFAULT_EDITOR_ACCENT_COLOR,
    paperAccentColor: DEFAULT_PAPER_ACCENT_COLOR,
    monokaiAccentColor: DEFAULT_MONOKAI_ACCENT_COLOR,
    lightTheme: DEFAULT_EDITOR_LIGHT_THEME,
    darkTheme: DEFAULT_EDITOR_DARK_THEME,
    focusedMode: null,
    startupFocusedMode: null,
    inspectorCollapsed: false,
    temporaryInspectorOpen: false,
    focusedPanelOffset: DEFAULT_FOCUSED_PANEL_OFFSET,
  };
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

export function cloneDocument(document: DocumentModel): DocumentModel {
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
  let top = sticky.edges?.top ?? (!bottom);
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

export function normalizeDocument(document: DocumentModel): DocumentModel {
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

export function normalizeTextHtmlTag(
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

export function isStructuralWrapper(role: WrapperRole) {
  return role === 'section' || role === 'header' || role === 'footer';
}

export function createUniqueLeaf(document: DocumentModel, role: LeafRole, parentId: NodeId) {
  let node = createLeaf(role, parentId);
  while (document.nodes[node.id]) {
    node = createLeaf(role, parentId);
  }
  return node;
}

function renameRepositoryLinks(document: DocumentModel) {
  for (const node of Object.values(document.nodes)) {
    if (node.type !== 'leaf' || node.role !== 'link') {
      continue;
    }

    if (node.label === 'github.com/tombigel/codex-playground') {
      node.label = 'github.com/tombigel/sticky-playground';
    }

    if (getLinkHref(node) === 'https://github.com/tombigel/codex-playground') {
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
