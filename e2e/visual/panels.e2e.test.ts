import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { STORAGE_KEY, DEFAULT_DOCUMENT_STORAGE_KEY } from '../../src/editor/editorStore';
import { createInitialDocument } from '../../src/model/defaults';
import type { DocumentModel, TextLeaf, ImageLeaf, ButtonLeaf } from '../../src/model/types';
import { startViteE2EServer, type StartedServer } from '../../src/stage/tests/e2eServer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ThemeMode = 'light' | 'dark';

function getFirstNodeByRole<T>(document: DocumentModel, role: string): T {
  const node = Object.values(document.nodes).find((n) => n.role === role);
  if (!node) throw new Error(`No node found with role '${role}'`);
  return node as T;
}

function getFirstLeafByName<T>(document: DocumentModel, name: string): T {
  const node = Object.values(document.nodes).find((n) => n.type === 'leaf' && n.name === name);
  if (!node) throw new Error(`No leaf node found with name '${name}'`);
  return node as T;
}

function buildSeededState(document: DocumentModel, selectedId: string | null, themeMode: ThemeMode, focusedMode: string | null = null) {
  return {
    document,
    selectedId,
    selectedIds: selectedId ? [selectedId] : [],
    pendingRoleSwap: null,
    ui: {
      previewSticky: true,
      spacerVisibility: 'selected' as const,
      showGridLanes: false,
      snapEnabled: true,
      themeMode,
      focusedMode,
      startupFocusedMode: null,
      inspectorCollapsed: false,
      temporaryInspectorOpen: false,
    },
  };
}

async function seedPage(page: Page, serverUrl: string, document: DocumentModel, selectedId: string | null, themeMode: ThemeMode, focusedMode: string | null = null) {
  await page.addInitScript(
    ({ storageKey, defaultKey, seededState, seededDocument }) => {
      window.localStorage.clear();
      window.localStorage.setItem(storageKey, JSON.stringify(seededState));
      window.localStorage.setItem(defaultKey, JSON.stringify(seededDocument));
    },
    {
      storageKey: STORAGE_KEY,
      defaultKey: DEFAULT_DOCUMENT_STORAGE_KEY,
      seededState: buildSeededState(document, selectedId, themeMode, focusedMode),
      seededDocument: document,
    },
  );
  await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
  // Wait for the app to render
  await page.waitForSelector('.editor-shell', { timeout: 10_000 });
  // Small delay to let CSS transitions finish
  await page.waitForTimeout(500);
}

async function takeScreenshot(page: Page, name: string) {
  const screenshot = await page.screenshot({ fullPage: false });
  await expect(screenshot).toMatchFileSnapshot(`__screenshots__/${name}.png`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('visual/panels', () => {
  let server: StartedServer;
  let browser: Browser;
  let page: Page | null = null;

  beforeAll(async () => {
    server = await startViteE2EServer(4175);
    browser = await chromium.launch({ headless: true });
  }, 30_000);

  afterEach(async () => {
    await page?.close();
    page = null;
  });

  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });

  // -----------------------------------------------------------------------
  // Inspector panel — text node selected
  // -----------------------------------------------------------------------

  for (const theme of ['light', 'dark'] as const) {
    it(`inspector with text node selected (${theme})`, async () => {
      const document = createInitialDocument();
      const textNode = getFirstLeafByName<TextLeaf>(document, 'Post Title');
      page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await seedPage(page, server.url, document, textNode.id, theme);
      await takeScreenshot(page, `inspector-text-${theme}`);
    });
  }

  // -----------------------------------------------------------------------
  // Inspector panel — image node selected
  // -----------------------------------------------------------------------

  for (const theme of ['light', 'dark'] as const) {
    it(`inspector with image node selected (${theme})`, async () => {
      const document = createInitialDocument();
      const imageNode = getFirstNodeByRole<ImageLeaf>(document, 'image');
      page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await seedPage(page, server.url, document, imageNode.id, theme);
      await takeScreenshot(page, `inspector-image-${theme}`);
    });
  }

  // -----------------------------------------------------------------------
  // Inspector panel — wrapper selected
  // -----------------------------------------------------------------------

  for (const theme of ['light', 'dark'] as const) {
    it(`inspector with wrapper selected (${theme})`, async () => {
      const document = createInitialDocument();
      const wrapper = Object.values(document.nodes).find((n) => n.type === 'wrapper' && n.role === 'section');
      if (!wrapper) throw new Error('No section wrapper found');
      page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await seedPage(page, server.url, document, wrapper.id, theme);
      await takeScreenshot(page, `inspector-wrapper-${theme}`);
    });
  }

  // -----------------------------------------------------------------------
  // Stage view — full app with default document
  // -----------------------------------------------------------------------

  for (const theme of ['light', 'dark'] as const) {
    it(`stage with default document (${theme})`, async () => {
      const document = createInitialDocument();
      page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await seedPage(page, server.url, document, null, theme);
      await takeScreenshot(page, `stage-default-${theme}`);
    });
  }

  // -----------------------------------------------------------------------
  // Focused mode — sticky
  // -----------------------------------------------------------------------

  for (const theme of ['light', 'dark'] as const) {
    it(`focused mode sticky panel (${theme})`, async () => {
      const document = createInitialDocument();
      const textNode = getFirstLeafByName<TextLeaf>(document, 'Post Title');
      page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await seedPage(page, server.url, document, textNode.id, theme, 'sticky');
      await takeScreenshot(page, `focused-sticky-${theme}`);
    });
  }

  // -----------------------------------------------------------------------
  // Focused mode — layout
  // -----------------------------------------------------------------------

  for (const theme of ['light', 'dark'] as const) {
    it(`focused mode layout panel (${theme})`, async () => {
      const document = createInitialDocument();
      const wrapper = Object.values(document.nodes).find((n) => n.type === 'wrapper' && n.role === 'section');
      if (!wrapper) throw new Error('No section wrapper found');
      page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await seedPage(page, server.url, document, wrapper.id, theme, 'layout');
      await takeScreenshot(page, `focused-layout-${theme}`);
    });
  }

  // -----------------------------------------------------------------------
  // Focused mode — design
  // -----------------------------------------------------------------------

  for (const theme of ['light', 'dark'] as const) {
    it(`focused mode design panel (${theme})`, async () => {
      const document = createInitialDocument();
      const textNode = getFirstLeafByName<TextLeaf>(document, 'Post Title');
      page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await seedPage(page, server.url, document, textNode.id, theme, 'design');
      await takeScreenshot(page, `focused-design-${theme}`);
    });
  }

  // -----------------------------------------------------------------------
  // Focused mode — content
  // -----------------------------------------------------------------------

  for (const theme of ['light', 'dark'] as const) {
    it(`focused mode content panel (${theme})`, async () => {
      const document = createInitialDocument();
      const textNode = getFirstLeafByName<TextLeaf>(document, 'Post Title');
      page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await seedPage(page, server.url, document, textNode.id, theme, 'content');
      await takeScreenshot(page, `focused-content-${theme}`);
    });
  }
});
