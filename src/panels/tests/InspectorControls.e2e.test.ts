import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { STORAGE_KEY, DEFAULT_DOCUMENT_STORAGE_KEY } from '../../editor/editorStore';
import { DEFAULT_SNAP_SETTINGS } from '../../editor/types';
import { createInitialDocument } from '../../model/defaults';
import type { DocumentModel, TextLeaf } from '../../model/types';
import { startViteE2EServer, type StartedServer } from '../../stage/tests/e2eServer';

type SeededColorDocument = {
  document: DocumentModel;
  titleId: string;
  bodyId: string;
};

function createColorSpaceDocument(): SeededColorDocument {
  const document = createInitialDocument();
  const title = Object.values(document.nodes).find(
    (node): node is TextLeaf => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
  );
  const body = Object.values(document.nodes).find(
    (node): node is TextLeaf => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Body',
  );

  if (!title || !body) {
    throw new Error('Expected seeded Post Title and Post Body text nodes');
  }

  title.style ??= {};
  body.style ??= {};
  title.style.color = 'color(display-p3 0.31 0.42 0.56 / 0.72)';
  body.style.color = 'oklch(62% 0.18 252 / 0.8)';

  return {
    document,
    titleId: title.id,
    bodyId: body.id,
  };
}

function createShadowColorSpaceDocument(): SeededColorDocument {
  const document = createInitialDocument();
  const title = Object.values(document.nodes).find(
    (node): node is TextLeaf => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
  );
  const body = Object.values(document.nodes).find(
    (node): node is TextLeaf => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Body',
  );

  if (!title || !body) {
    throw new Error('Expected seeded Post Title and Post Body text nodes');
  }

  title.style ??= {};
  body.style ??= {};
  title.style.shadowColor = 'color(display-p3 0.31 0.42 0.56 / 0.72)';
  title.style.shadowBlur = 18;
  title.style.shadowOffsetX = 0;
  title.style.shadowOffsetY = 12;
  body.style.shadowColor = 'rgba(15, 23, 42, 0.18)';
  body.style.shadowBlur = 12;
  body.style.shadowOffsetX = 0;
  body.style.shadowOffsetY = 8;

  return {
    document,
    titleId: title.id,
    bodyId: body.id,
  };
}

describe('panels/InspectorControls e2e', () => {
  let server: StartedServer;
  let browser: Browser;
  let page: Page | null = null;

  beforeAll(async () => {
    server = await startViteE2EServer();
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

  it('re-initializes the active colorspace from the selected node when reopening the picker', async () => {
    const seeded = createColorSpaceDocument();

    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.addInitScript(
      ({ storageKey, defaultKey, seededState, seededDocument }) => {
        window.localStorage.clear();
        window.localStorage.setItem(storageKey, JSON.stringify(seededState));
        window.localStorage.setItem(defaultKey, JSON.stringify(seededDocument));
      },
      {
        storageKey: STORAGE_KEY,
        defaultKey: DEFAULT_DOCUMENT_STORAGE_KEY,
        seededState: {
          document: seeded.document,
          selectedId: seeded.titleId,
          pendingRoleSwap: null,
          ui: {
            previewSticky: true,
            spacerVisibility: 'selected',
            showGridLanes: false,
            snapSettings: DEFAULT_SNAP_SETTINGS,
            themeMode: 'auto',
            accentColor: '#1668ff',
            lightTheme: 'air',
            darkTheme: 'monokai',
            focusedMode: null,
            startupFocusedMode: null,
            inspectorCollapsed: false,
            temporaryInspectorOpen: false,
            focusedPanelOffset: { x: 0, y: 0 },
          },
        },
        seededDocument: seeded.document,
      },
    );

    await page.goto(server.url);
    await page.locator('.editor-inspector-shell').waitFor({ state: 'visible' });

    const readPickerState = () => page.evaluate(() => {
      const element = document.querySelector('color-input[aria-label="Text color"]');
      const spaceSelect = element?.shadowRoot?.querySelector<HTMLSelectElement>('.space');
      return {
        value: element?.value ?? null,
        colorspace: element?.colorspace ?? null,
        selectValue: spaceSelect?.value ?? null,
      };
    });

    const picker = page.locator('color-input[aria-label="Text color"]').first();

    await picker.click();
    await expect.poll(async () => (await readPickerState()).selectValue).toBe('display-p3');
    await page.keyboard.press('Escape');

    await page.locator(`[data-node-id="${seeded.bodyId}"]`).click();
    await expect.poll(async () => await page.locator('.editor-inspector-shell').textContent()).toContain('Post Body');

    await picker.click();
    await expect.poll(async () => await readPickerState()).toMatchObject({
      value: 'oklch(62% 0.18 252 / 0.8)',
      colorspace: 'oklch',
      selectValue: 'oklch',
    });
  }, 30_000);

  it('closes the picker when the trigger is clicked again', async () => {
    const seeded = createColorSpaceDocument();

    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.addInitScript(
      ({ storageKey, defaultKey, seededState, seededDocument }) => {
        window.localStorage.clear();
        window.localStorage.setItem(storageKey, JSON.stringify(seededState));
        window.localStorage.setItem(defaultKey, JSON.stringify(seededDocument));
      },
      {
        storageKey: STORAGE_KEY,
        defaultKey: DEFAULT_DOCUMENT_STORAGE_KEY,
        seededState: {
          document: seeded.document,
          selectedId: seeded.titleId,
          pendingRoleSwap: null,
          ui: {
            previewSticky: true,
            spacerVisibility: 'selected',
            showGridLanes: false,
            snapSettings: DEFAULT_SNAP_SETTINGS,
            themeMode: 'auto',
            accentColor: '#1668ff',
            lightTheme: 'air',
            darkTheme: 'monokai',
            focusedMode: null,
            startupFocusedMode: null,
            inspectorCollapsed: false,
            temporaryInspectorOpen: false,
            focusedPanelOffset: { x: 0, y: 0 },
          },
        },
        seededDocument: seeded.document,
      },
    );

    await page.goto(server.url);
    await page.locator('.editor-inspector-shell').waitFor({ state: 'visible' });

    const picker = page.locator('color-input[aria-label="Text color"]').first();
    const readOpenState = () => page.evaluate(() => {
      const element = document.querySelector('color-input[aria-label="Text color"]');
      const panel = element?.shadowRoot?.querySelector<HTMLElement>('.panel');
      return panel?.matches(':popover-open') ?? false;
    });

    await picker.click();
    await expect.poll(readOpenState).toBe(true);

    await picker.click();
    await expect.poll(readOpenState).toBe(false);
  }, 30_000);

  it('re-initializes shadow pickers from the current authored alpha color when selection changes', async () => {
    const seeded = createShadowColorSpaceDocument();

    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.addInitScript(
      ({ storageKey, defaultKey, seededState, seededDocument }) => {
        window.localStorage.clear();
        window.localStorage.setItem(storageKey, JSON.stringify(seededState));
        window.localStorage.setItem(defaultKey, JSON.stringify(seededDocument));
      },
      {
        storageKey: STORAGE_KEY,
        defaultKey: DEFAULT_DOCUMENT_STORAGE_KEY,
        seededState: {
          document: seeded.document,
          selectedId: seeded.titleId,
          pendingRoleSwap: null,
          ui: {
            previewSticky: true,
            spacerVisibility: 'selected',
            showGridLanes: false,
            snapSettings: DEFAULT_SNAP_SETTINGS,
            themeMode: 'auto',
            accentColor: '#1668ff',
            lightTheme: 'air',
            darkTheme: 'monokai',
            focusedMode: null,
            startupFocusedMode: null,
            inspectorCollapsed: false,
            temporaryInspectorOpen: false,
            focusedPanelOffset: { x: 0, y: 0 },
          },
        },
        seededDocument: seeded.document,
      },
    );

    await page.goto(server.url);
    await page.locator('.editor-inspector-shell').waitFor({ state: 'visible' });

    const readPickerState = () => page.evaluate(() => {
      const element = document.querySelector('color-input[aria-label="Shadow color"]');
      const spaceSelect = element?.shadowRoot?.querySelector<HTMLSelectElement>('.space');
      return {
        value: element?.value ?? null,
        colorspace: element?.colorspace ?? null,
        selectValue: spaceSelect?.value ?? null,
      };
    });

    const shadowPicker = page.locator('color-input[aria-label="Shadow color"]').first();

    await shadowPicker.click();
    await expect.poll(async () => (await readPickerState()).selectValue).toBe('display-p3');
    await page.keyboard.press('Escape');

    await page.locator(`[data-node-id="${seeded.bodyId}"]`).click();
    await expect.poll(async () => await page.locator('.editor-inspector-shell').textContent()).toContain('Post Body');

    await shadowPicker.click();
    await expect.poll(async () => await readPickerState()).toMatchObject({
      value: 'rgba(15, 23, 42, 0.18)',
      colorspace: 'srgb',
      selectValue: 'srgb',
    });
  }, 30_000);

  it('re-initializes shadow pickers from their own authored value after another picker used a different colorspace', async () => {
    const seeded = createShadowColorSpaceDocument();
    const title = seeded.document.nodes[seeded.titleId];

    if (title.type !== 'leaf' || title.role !== 'text') {
      throw new Error('Expected seeded title text node');
    }

    title.style ??= {};
    title.style.color = 'color(display-p3 0.31 0.42 0.56 / 0.72)';
    title.style.shadowColor = 'rgba(15, 23, 42, 0.18)';

    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.addInitScript(
      ({ storageKey, defaultKey, seededState, seededDocument }) => {
        window.localStorage.clear();
        window.localStorage.setItem(storageKey, JSON.stringify(seededState));
        window.localStorage.setItem(defaultKey, JSON.stringify(seededDocument));
      },
      {
        storageKey: STORAGE_KEY,
        defaultKey: DEFAULT_DOCUMENT_STORAGE_KEY,
        seededState: {
          document: seeded.document,
          selectedId: seeded.titleId,
          pendingRoleSwap: null,
          ui: {
            previewSticky: true,
            spacerVisibility: 'selected',
            showGridLanes: false,
            snapSettings: DEFAULT_SNAP_SETTINGS,
            themeMode: 'auto',
            accentColor: '#1668ff',
            lightTheme: 'air',
            darkTheme: 'monokai',
            focusedMode: null,
            startupFocusedMode: null,
            inspectorCollapsed: false,
            temporaryInspectorOpen: false,
            focusedPanelOffset: { x: 0, y: 0 },
          },
        },
        seededDocument: seeded.document,
      },
    );

    await page.goto(server.url);
    await page.locator('.editor-inspector-shell').waitFor({ state: 'visible' });

    const readPickerState = (ariaLabel: string) => page.evaluate((label) => {
      const element = document.querySelector(`color-input[aria-label="${label}"]`);
      const spaceSelect = element?.shadowRoot?.querySelector<HTMLSelectElement>('.space');
      return {
        value: element?.value ?? null,
        colorspace: element?.colorspace ?? null,
        selectValue: spaceSelect?.value ?? null,
      };
    }, ariaLabel);

    await page.locator('color-input[aria-label="Text color"]').first().click();
    await expect.poll(async () => (await readPickerState('Text color')).selectValue).toBe('display-p3');
    await page.keyboard.press('Escape');

    await page.locator('color-input[aria-label="Shadow color"]').first().click();
    await expect.poll(async () => await readPickerState('Shadow color')).toMatchObject({
      value: 'rgba(15, 23, 42, 0.18)',
      colorspace: 'srgb',
      selectValue: 'srgb',
    });
    await page.keyboard.press('Escape');
  }, 30_000);

  it('re-applies the authored shadow color space on open even when the element already has the same value attribute', async () => {
    const seeded = createShadowColorSpaceDocument();
    const body = seeded.document.nodes[seeded.bodyId];

    if (body.type !== 'leaf' || body.role !== 'text') {
      throw new Error('Expected seeded body text node');
    }

    body.style ??= {};
    body.style.shadowColor = 'rgba(15, 23, 42, 0.18)';

    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.addInitScript(
      ({ storageKey, defaultKey, seededState, seededDocument }) => {
        window.localStorage.clear();
        window.localStorage.setItem(storageKey, JSON.stringify(seededState));
        window.localStorage.setItem(defaultKey, JSON.stringify(seededDocument));
      },
      {
        storageKey: STORAGE_KEY,
        defaultKey: DEFAULT_DOCUMENT_STORAGE_KEY,
        seededState: {
          document: seeded.document,
          selectedId: seeded.bodyId,
          pendingRoleSwap: null,
          ui: {
            previewSticky: true,
            spacerVisibility: 'selected',
            showGridLanes: false,
            snapSettings: DEFAULT_SNAP_SETTINGS,
            themeMode: 'auto',
            accentColor: '#1668ff',
            lightTheme: 'air',
            darkTheme: 'monokai',
            focusedMode: null,
            startupFocusedMode: null,
            inspectorCollapsed: false,
            temporaryInspectorOpen: false,
            focusedPanelOffset: { x: 0, y: 0 },
          },
        },
        seededDocument: seeded.document,
      },
    );

    await page.goto(server.url);
    await page.locator('.editor-inspector-shell').waitFor({ state: 'visible' });

    const shadowPicker = page.locator('color-input[aria-label="Shadow color"]').first();

    await page.evaluate(() => {
      const element = document.querySelector('color-input[aria-label="Shadow color"]');
      const spaceSelect = element?.shadowRoot?.querySelector<HTMLSelectElement>('.space');
      const alphaRange = element?.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"].ch-alp');
      if (!element || !spaceSelect) {
        throw new Error('Expected shadow color picker and colorspace select');
      }

      spaceSelect.value = 'display-p3';
      if (alphaRange) {
        alphaRange.style.background = 'linear-gradient(to right, color(display-p3 0.2 0.4 0.6 / 0%), color(display-p3 0.2 0.4 0.6 / 100%)), var(--checker)';
      }
    });

    await shadowPicker.click();
    await expect.poll(async () => await page.evaluate(() => {
      const element = document.querySelector('color-input[aria-label="Shadow color"]');
      const spaceSelect = element?.shadowRoot?.querySelector<HTMLSelectElement>('.space');
      const alphaRange = element?.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"].ch-alp');
      return {
        value: element?.value ?? null,
        colorspace: element?.colorspace ?? null,
        selectValue: spaceSelect?.value ?? null,
        alphaBackground: alphaRange?.style.background ?? null,
      };
    })).toMatchObject({
      value: 'rgba(15, 23, 42, 0.18)',
      colorspace: 'srgb',
      selectValue: 'srgb',
    });

    const alphaBackground = await page.evaluate(() => {
      const element = document.querySelector('color-input[aria-label="Shadow color"]');
      const alphaRange = element?.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"].ch-alp');
      return alphaRange?.style.background ?? '';
    });

    expect(alphaBackground).toContain('rgb(');
    expect(alphaBackground).not.toContain('display-p3');
  }, 30_000);
});
