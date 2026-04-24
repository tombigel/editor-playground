import {
  createDefaultRect,
  createDefaultFooter,
  createDefaultHeader,
  createInitialDocument,
  createTextNode,
  createLinkTextNode,
  createSectionFromTemplate,
  syncIdCountersWithDocument,
} from '../model/defaults';
import { normalizeDocumentFontState } from '../fonts';
import { getLinkHref } from '../model/links';
import { createTextDocumentFromCode, createTextDocumentFromText, getTextContent } from '../model/richContent';
import { validateDocument } from '../model/validation';
import type {
  ContainerSubtype,
  DocumentModel,
  DocumentNode,
  NodeId,
  RichTextBlockType,
  StickyDefinition,
  TextNode,
  ContainerNode,
} from '../model/types';
import { isSiteNode, isContainerNode, isTextNode, isMediaNode } from '../model/types';
import { parseFontSizeValue, parseSpacingValue, parseUnitValue } from '../model/units';
import { highlightCode } from '../render/codeHighlight';
import { forceOpaqueColorValue } from '../model/colors';
import {
  DEFAULT_EDITOR_ACCENT_COLOR,
  DEFAULT_EDITOR_DARK_THEME,
  DEFAULT_EDITOR_LIGHT_THEME,
  normalizeEditorAccentColor,
  normalizeEditorDarkTheme,
  normalizeEditorLightTheme,
  normalizeThemeMode,
} from '../lib/theme';
import { DOCUMENT_MODEL_VERSION } from '../lib/version';
import { DEFAULT_SNAP_SETTINGS } from './types';
import { normalizeFocusedMode, resolveFocusedModeUrlOverride } from './focusedModes';
import { DEFAULT_FOCUSED_PANEL_OFFSET, normalizeFocusedPanelOffset } from './focusedPanelPosition';
import type { EditorState } from './types';
import { normalizeSelectedIds } from './selection';

export const STORAGE_KEY = 'sticky-playground.editor-state.v2';
export const DEFAULT_DOCUMENT_STORAGE_KEY = 'sticky-playground.default-document.v1';

export function createInitialState(): EditorState {
  const ui = createDefaultUiState();
  const focusedModeOverride = resolveFocusedModeUrlOverride(
    typeof window !== 'undefined' ? (window as Window & { location?: { search?: string } }).location?.search : undefined,
  );
  const startupFocusedMode = focusedModeOverride === undefined ? ui.startupFocusedMode : focusedModeOverride;
  const document = loadDefaultDocument();
  return {
    document,
    activePageId: document.pages?.[0]?.id ?? null,
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

function normalizePersistedState(parsed: EditorState): EditorState | null {
  const normalizedDocument = normalizeDocument(parsed.document);
  const persistedStartupFocusedMode = normalizeFocusedMode(parsed.ui?.startupFocusedMode);
  const focusedModeOverride = resolveFocusedModeUrlOverride(
    typeof window !== 'undefined' ? (window as Window & { location?: { search?: string } }).location?.search : undefined,
  );
  const startupFocusedMode =
    focusedModeOverride === undefined ? persistedStartupFocusedMode : focusedModeOverride;
  const selectedIds = normalizeSelectedIds(
    normalizedDocument,
    Array.isArray((parsed as Partial<EditorState>).selectedIds) ? (parsed as Partial<EditorState>).selectedIds : undefined,
    parsed.selectedId,
  );
  const themeMode = normalizeThemeMode(parsed.ui?.themeMode);
  const lightTheme = normalizeEditorLightTheme(parsed.ui?.lightTheme);
  const darkTheme = normalizeEditorDarkTheme(parsed.ui?.darkTheme);
  const candidate: EditorState = {
    ...parsed,
    document: normalizedDocument,
    activePageId: parsed.activePageId ?? normalizedDocument.pages?.[0]?.id ?? null,
    selectedId: selectedIds[0] ?? null,
    selectedIds,
    pendingRoleSwap: null,
    ui: {
      showHidden: parsed.ui?.showHidden ?? true,
      previewSticky: parsed.ui?.previewSticky ?? true,
      animationPreview: parsed.ui?.animationPreview ?? {
        enabled: false,
        mode: 'passive',
        triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true },
      },
      spacerVisibility:
        parsed.ui?.spacerVisibility === 'all' || parsed.ui?.spacerVisibility === 'selected'
          ? parsed.ui.spacerVisibility
          : 'selected',
      showGridLanes: parsed.ui?.showGridLanes ?? false,
      showDebugInfo: parsed.ui?.showDebugInfo ?? false,
      snapSettings: normalizeSnapSettings(parsed.ui),
      themeMode,
      accentColor: normalizePersistedAccentColor(parsed.ui, themeMode, lightTheme, darkTheme),
      lightTheme,
      darkTheme,
      focusedMode: startupFocusedMode,
      startupFocusedMode,
      inspectorCollapsed: startupFocusedMode ? true : parsed.ui?.inspectorCollapsed ?? false,
      temporaryInspectorOpen: false,
      focusedPanelOffset: normalizeFocusedPanelOffset(parsed.ui?.focusedPanelOffset),
    },
  };
  const errors = validateDocument(candidate.document);
  if (errors.length > 0) {
    return null;
  }
  return candidate;
}

export function loadPersistedState(): EditorState {
  if (typeof window === 'undefined') {
    return createInitialState();
  }

  try {
    ensureDefaultDocumentSeeded();

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EditorState;
      const normalized = normalizePersistedState(parsed);
      if (normalized) {
        return normalized;
      }
      return createInitialState();
    }

    return createInitialState();
  } catch {
    return createInitialState();
  }
}

export function persistState(state: EditorState) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, pendingRoleSwap: null }));
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
    activePageId: document.pages?.[0]?.id ?? null,
    selectedId: null,
    selectedIds: [],
    pendingRoleSwap: null,
    ui: ui ? { ...ui, temporaryInspectorOpen: false } : createDefaultUiState(),
  };
}

function createDefaultUiState(): EditorState['ui'] {
  return {
    showHidden: true,
    previewSticky: true,
    animationPreview: {
      enabled: false,
      mode: 'passive',
      triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true },
    },
    spacerVisibility: 'selected',
    showGridLanes: false,
    showDebugInfo: false,
    snapSettings: DEFAULT_SNAP_SETTINGS,
    themeMode: 'auto',
    accentColor: DEFAULT_EDITOR_ACCENT_COLOR,
    lightTheme: DEFAULT_EDITOR_LIGHT_THEME,
    darkTheme: DEFAULT_EDITOR_DARK_THEME,
    focusedMode: null,
    startupFocusedMode: null,
    inspectorCollapsed: false,
    temporaryInspectorOpen: false,
    focusedPanelOffset: DEFAULT_FOCUSED_PANEL_OFFSET,
  };
}

function normalizePersistedAccentColor(
  ui: Partial<EditorState['ui']> | undefined,
  themeMode: EditorState['ui']['themeMode'],
  lightTheme: EditorState['ui']['lightTheme'],
  darkTheme: EditorState['ui']['darkTheme'],
) {
  const legacyUi = ui as
    | (Partial<EditorState['ui']> & {
        paperAccentColor?: unknown;
        monokaiAccentColor?: unknown;
      })
    | undefined;
  if (themeMode === 'light' && lightTheme === 'paper') {
    return normalizeEditorAccentColor(legacyUi?.paperAccentColor);
  }
  if (themeMode === 'dark' && darkTheme === 'monokai') {
    return normalizeEditorAccentColor(legacyUi?.monokaiAccentColor);
  }
  return normalizeEditorAccentColor(ui?.accentColor);
}

export function parseImportedDocumentJson(raw: string): DocumentModel {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Import failed: invalid JSON.');
  }

  const storedVersion = (parsed as Record<string, unknown>)?.schemaVersion;
  if (typeof storedVersion === 'string' && storedVersion !== DOCUMENT_MODEL_VERSION) {
    console.warn(
      `[sticky-playground] Document schema version mismatch: stored ${storedVersion}, current ${DOCUMENT_MODEL_VERSION}. Attempting import anyway.`,
    );
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
    ...(document.animationSettings ? { animationSettings: structuredClone(document.animationSettings) } : {}),
    ...(document.pages ? { pages: structuredClone(document.pages) } : {}),
    ...(document.siteSettings ? { siteSettings: structuredClone(document.siteSettings) } : {}),
    ...(document.sharedRegionIds ? { sharedRegionIds: [...document.sharedRegionIds] } : {}),
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

function normalizeSnapSettings(ui: Partial<EditorState['ui']> | undefined) {
  // Migration: if old snapEnabled boolean exists and no snapSettings, derive from it
  const legacy = (ui as Record<string, unknown> | undefined);
  if (legacy && 'snapEnabled' in legacy && !('snapSettings' in legacy)) {
    const wasEnabled = typeof legacy.snapEnabled === 'boolean' ? legacy.snapEnabled : true;
    return {
      guideSnap: { ...DEFAULT_SNAP_SETTINGS.guideSnap, enabled: wasEnabled },
      containerSnap: { ...DEFAULT_SNAP_SETTINGS.containerSnap },
    };
  }

  const persisted = ui?.snapSettings;
  if (!persisted) {
    return DEFAULT_SNAP_SETTINGS;
  }

  return {
    guideSnap: {
      enabled: persisted.guideSnap?.enabled ?? DEFAULT_SNAP_SETTINGS.guideSnap.enabled,
      threshold: persisted.guideSnap?.threshold ?? DEFAULT_SNAP_SETTINGS.guideSnap.threshold,
      power: persisted.guideSnap?.power ?? DEFAULT_SNAP_SETTINGS.guideSnap.power,
      maxSpeedPxPerSecond:
        persisted.guideSnap?.maxSpeedPxPerSecond ?? DEFAULT_SNAP_SETTINGS.guideSnap.maxSpeedPxPerSecond,
    },
    containerSnap: {
      enabled: persisted.containerSnap?.enabled ?? DEFAULT_SNAP_SETTINGS.containerSnap.enabled,
      threshold: persisted.containerSnap?.threshold ?? DEFAULT_SNAP_SETTINGS.containerSnap.threshold,
      power: persisted.containerSnap?.power ?? DEFAULT_SNAP_SETTINGS.containerSnap.power,
    },
  };
}

export function normalizeDocument(document: DocumentModel): DocumentModel {
  const normalized = normalizeDocumentFontState(cloneDocument(document));
  syncIdCountersWithDocument(normalized);
  for (const node of Object.values(normalized.nodes)) {
    if (isSiteNode(node)) {
      continue;
    }
    if (isTextNode(node)) {
      node.htmlTag = normalizeTextHtmlTag(node.htmlTag);
    }
    node.sticky = normalizeSticky(node.sticky);
    if (isContainerNode(node) && node.subtype === 'container' && node.sticky?.target === 'contentWrapper') {
      node.sticky.target = 'self';
    }
    if (isContainerNode(node) && isStructuralWrapper(node.subtype) && node.style?.background) {
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
  htmlTag: TextNode['htmlTag'] | undefined,
): TextNode['htmlTag'] {
  switch (htmlTag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
    case 'p':
    case 'blockquote':
      return htmlTag;
    default:
      return 'p';
  }
}

export function isStructuralWrapper(subtype: ContainerSubtype) {
  return subtype === 'section' || subtype === 'header' || subtype === 'footer';
}

function htmlTagToBlockType(htmlTag: TextNode['htmlTag']): RichTextBlockType {
  if (htmlTag === 'blockquote') {
    return 'blockquote';
  }
  if (htmlTag && htmlTag !== 'p') {
    return htmlTag;
  }
  return 'paragraph';
}

function getNodePlainText(node: TextNode): string {
  return getTextContent(node.content.blocks, { blockSeparator: '\n' });
}

function setNodePlainText(node: TextNode, text: string) {
  if (node.subtype === 'code') {
    node.content = createTextDocumentFromCode(text, {
      language: node.code?.language,
      theme: node.code?.theme,
      highlightedHtml: node.code?.language ? highlightCode(text, node.code.language) : undefined,
    });
    return;
  }

  node.content = createTextDocumentFromText(text, {
    type: htmlTagToBlockType(node.htmlTag),
  });
}

function createUniqueTextNode(document: DocumentModel, parentId: NodeId) {
  let node = createTextNode('block', parentId);
  while (document.nodes[node.id]) {
    node = createTextNode('block', parentId);
  }
  return node;
}

function createUniqueLinkTextNode(document: DocumentModel, parentId: NodeId) {
  let node = createLinkTextNode(parentId);
  while (document.nodes[node.id]) {
    node = createLinkTextNode(parentId);
  }
  return node;
}

function renameRepositoryLinks(document: DocumentModel) {
  for (const node of Object.values(document.nodes)) {
    if (!isTextNode(node) || !node.link) {
      continue;
    }

    if (getNodePlainText(node) === 'github.com/tombigel/codex-playground') {
      setNodePlainText(node, 'github.com/tombigel/sticky-playground');
    }

    if (node.link && getLinkHref(node.link) === 'https://github.com/tombigel/codex-playground') {
      node.link.href = 'https://github.com/tombigel/sticky-playground';
    }
  }
}

function upgradeLegacyStarterShell(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || !isSiteNode(root)) {
    return;
  }

  const wrappers = root.children
    .map((id) => document.nodes[id])
    .filter((node): node is ContainerNode => Boolean(node && isContainerNode(node)));

  const header = wrappers.find((node) => node.subtype === 'header');
  const footer = wrappers.find((node) => node.subtype === 'footer');

  if (header && isLegacyHeader(document, header)) {
    applyModernHeader(document, header);
  }

  if (footer && isLegacyFooter(document, footer)) {
    applyModernFooter(document, footer);
  }
}

function normalizeStarterShellTextTags(document: DocumentModel) {
  for (const node of Object.values(document.nodes)) {
    if (!isTextNode(node)) {
      continue;
    }

    if (node.name === 'Product Title' && getNodePlainText(node) === 'Sticky Playground') {
      node.htmlTag = 'h1';
    }

    if (node.name === 'Footer Title' && getNodePlainText(node) === 'Sticky Playground') {
      node.htmlTag = 'h2';
    }
  }
}

function upgradeLegacyStarterSection(document: DocumentModel) {
  const root = document.nodes[document.rootId];
  if (!root || !isSiteNode(root)) {
    return;
  }

  const sections = root.children
    .map((id) => document.nodes[id])
    .filter((node): node is ContainerNode => Boolean(node && isContainerNode(node) && node.subtype === 'section'));

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

function isLegacyStarterSection(document: DocumentModel, section: ContainerNode) {
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

function isLegacyStarterText(node: DocumentNode | undefined): node is TextNode {
  return Boolean(
      node &&
      isTextNode(node) &&
      !node.link &&
      node.name === 'Text' &&
      getNodePlainText(node) === 'Edit text' &&
      node.rect.x.base.raw === '32px' &&
      node.rect.y.base.raw === '32px' &&
      node.rect.width.base.raw === 'fit-content' &&
      node.rect.height.base.raw === 'auto',
  );
}

function isLegacyStarterButton(node: DocumentNode | undefined): node is TextNode {
  return Boolean(
    node &&
      isTextNode(node) &&
      node.link &&
      node.style?.background &&
      node.name === 'Button' &&
      getNodePlainText(node) === 'Button' &&
      node.rect.x.base.raw === '32px' &&
      node.rect.y.base.raw === '32px' &&
      node.rect.width.base.raw === 'fit-content' &&
      node.rect.height.base.raw === 'auto',
  );
}

function isLegacyHeader(document: DocumentModel, header: ContainerNode) {
  if (header.name === 'Primary Header') {
    return true;
  }

  const children = header.children.map((id) => document.nodes[id]).filter(Boolean);
  const brandName = children.find(
    (node): node is TextNode => isTextNode(node) && !node.link && getNodePlainText(node) === 'Business Name',
  );
  const homeLink = children.find(
    (node) => isTextNode(node) && node.link && getNodePlainText(node) === 'Home',
  );
  if (brandName && homeLink) {
    return true;
  }

  const hasLegacyModernMark = children.some(
    (node) => isMediaNode(node) && node.name === 'Brand Mark',
  );
  const hasStarterTitle = children.some(
    (node) => isTextNode(node) && !node.link && node.name === 'Product Title' && getNodePlainText(node) === 'Sticky Playground',
  );
  if (hasLegacyModernMark && hasStarterTitle) {
    return true;
  }

  const textOnlyStarterTitle = children.find(
    (node): node is TextNode =>
      isTextNode(node) && !node.link && node.name === 'Product Title' && getNodePlainText(node) === 'Sticky Playground',
  );
  const titleX = textOnlyStarterTitle ? parseFloat(textOnlyStarterTitle.rect.x.base.raw) || 0 : 0;
  return Boolean(textOnlyStarterTitle && titleX < 40);
}

function isLegacyFooter(document: DocumentModel, footer: ContainerNode) {
  if (footer.name === 'Footer') {
    return true;
  }

  const children = footer.children.map((id) => document.nodes[id]).filter(Boolean);
  const hasOldBusinessCopy = children.some(
    (node) =>
      isTextNode(node) &&
      !node.link &&
      getNodePlainText(node).includes('Built for sticky exploration'),
  );
  if (hasOldBusinessCopy) {
    return true;
  }

  const modernCopy = children.find(
    (node): node is TextNode =>
      isTextNode(node) &&
      !node.link &&
      node.name === 'Footer Copy' &&
      getNodePlainText(node) === 'A prototyping surface for sticky logic, spacing strategy, and interaction QA.',
  );
  const hasModernMeta = children.some(
    (node) => isTextNode(node) && !node.link && node.name === 'Footer Meta',
  );
  if (hasModernMeta) {
    return true;
  }

  const copyY = modernCopy ? parseFloat(modernCopy.rect.y.base.raw) || 0 : 0;
  return Boolean(modernCopy && copyY < 45);
}

function applyModernHeader(document: DocumentModel, header: ContainerNode) {
  const previousChildren = [...header.children];
  for (const childId of previousChildren) {
    removeNodeSubtree(document, childId);
  }

  header.name = 'Playground Header';
  header.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  header.style ??= {};
  header.style.background = '#f8fbff';
  header.style.borderColor = '#d6e2f2';
  header.style.paddingTop = parseSpacingValue('20px');
  header.style.paddingRight = parseSpacingValue('48px');
  header.style.paddingBottom = parseSpacingValue('20px');
  header.style.paddingLeft = parseSpacingValue('48px');

  const title = createUniqueTextNode(document, header.id);
  title.name = 'Product Title';
  setNodePlainText(title, 'Sticky Playground');
  title.rect = createDefaultRect('62px', '25.5px', 'max-content', 'auto');
  title.style ??= {};
  title.style.color = '#0f172a';
  title.style.fontSize = parseFontSizeValue('20px');
  title.style.fontWeight = 700;
  title.htmlTag = 'h1';

  const subtitle = createUniqueTextNode(document, header.id);
  subtitle.name = 'Product Subtitle';
  setNodePlainText(subtitle, 'Model, preview, and validate sticky behavior before implementation.');
  subtitle.rect = createDefaultRect('61px', '60px', 'max-content', 'auto');
  subtitle.style ??= {};
  subtitle.style.color = '#516174';
  subtitle.style.fontSize = parseFontSizeValue('14px');

  const templatesLink = createUniqueLinkTextNode(document, header.id);
  templatesLink.name = 'Templates Link';
  setNodePlainText(templatesLink, 'Templates');
  templatesLink.rect = createDefaultRect('836px', '48px', 'max-content', 'auto');

  const stickyLink = createUniqueLinkTextNode(document, header.id);
  stickyLink.name = 'Sticky Demos Link';
  setNodePlainText(stickyLink, 'Sticky Demos');
  stickyLink.rect = createDefaultRect('947px', '48px', 'max-content', 'auto');

  const testPlanLink = createUniqueLinkTextNode(document, header.id);
  testPlanLink.name = 'Test Plan Link';
  setNodePlainText(testPlanLink, 'Test Plan');
  testPlanLink.rect = createDefaultRect('1082px', '48px', '144px', '24px');

  document.nodes[title.id] = title;
  document.nodes[subtitle.id] = subtitle;
  document.nodes[templatesLink.id] = templatesLink;
  document.nodes[stickyLink.id] = stickyLink;
  document.nodes[testPlanLink.id] = testPlanLink;
  header.children = [title.id, subtitle.id, templatesLink.id, stickyLink.id, testPlanLink.id];
}

function applyModernFooter(document: DocumentModel, footer: ContainerNode) {
  const previousChildren = [...footer.children];
  for (const childId of previousChildren) {
    removeNodeSubtree(document, childId);
  }

  footer.name = 'Playground Footer';
  footer.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  footer.style ??= {};
  footer.style.background = '#f8fbff';
  footer.style.borderColor = '#d6e2f2';
  footer.style.paddingTop = parseSpacingValue('26px');
  footer.style.paddingRight = parseSpacingValue('48px');
  footer.style.paddingBottom = parseSpacingValue('26px');
  footer.style.paddingLeft = parseSpacingValue('48px');

  const title = createUniqueTextNode(document, footer.id);
  title.name = 'Footer Title';
  setNodePlainText(title, 'Sticky Playground');
  title.rect = createDefaultRect('67px', '28px', 'max-content', 'auto');
  title.style ??= {};
  title.style.color = '#0f172a';
  title.style.fontSize = parseFontSizeValue('16px');
  title.style.fontWeight = 700;
  title.style.lineHeight = 1.2;
  title.htmlTag = 'h2';

  const copy = createUniqueTextNode(document, footer.id);
  copy.name = 'Footer Copy';
  setNodePlainText(copy, 'A prototyping surface for sticky logic, spacing strategy, and interaction QA.');
  copy.rect = createDefaultRect('64px', '53px', '271px', '38px');
  copy.style ??= {};
  copy.style.color = '#475569';
  copy.style.fontSize = parseFontSizeValue('14px');
  copy.style.lineHeight = 1.3;

  const repoLink = createUniqueLinkTextNode(document, footer.id);
  repoLink.name = 'Repository Link';
  setNodePlainText(repoLink, 'github.com/tombigel/sticky-playground');
  repoLink.link = { linkType: 'external', href: 'https://github.com/tombigel/sticky-playground', openInNewTab: true };
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
  if (!root || !isSiteNode(root)) {
    return;
  }

  const wrappers = root.children
    .map((id) => document.nodes[id])
    .filter((node): node is ContainerNode => Boolean(node && isContainerNode(node)));

  const hasHeader = wrappers.some((node) => node.subtype === 'header');
  const hasFooter = wrappers.some((node) => node.subtype === 'footer');

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
