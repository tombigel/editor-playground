import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { startViteE2EServer, type StartedServer } from '../../stage/tests/e2eServer';

describe('panels/SettingsPanel e2e', () => {
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

  async function newCleanPage(viewport = { width: 1440, height: 1100 }) {
    const nextPage = await browser.newPage({ viewport });
    await nextPage.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    return nextPage;
  }

  async function waitForEditorReady(targetPage: Page) {
    await targetPage.goto(`${server.url}/#/edit`, { waitUntil: 'domcontentloaded' });
    await targetPage.getByRole('toolbar', { name: 'Editor toolbar' }).waitFor({ state: 'visible' });
    await targetPage.locator('.stage-shell').waitFor({ state: 'visible' });
  }

  async function openSettingsPanel(targetPage: Page) {
    await targetPage.locator('[data-ui="menubar-trigger"][data-menu-id="settings"]').click();
    await targetPage.getByRole('menuitem', { name: 'Open Settings' }).click();

    const dialog = targetPage.getByRole('dialog', { name: 'Settings' });
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByLabel('Startup mode').waitFor({ state: 'visible' });
    return dialog;
  }

  it('opens the startup mode dropdown inside the settings surface', async () => {
    page = await newCleanPage();
    await waitForEditorReady(page);
    const settings = await openSettingsPanel(page);

    await settings.getByLabel('Startup mode').click();

    const dropdown = settings.locator('[data-ui="select-content"]');
    await dropdown.waitFor({ state: 'visible' });
    expect(await dropdown.getByText('Normal').isVisible()).toBe(true);
    expect(await dropdown.getByText('Sticky').isVisible()).toBe(true);
    expect(await page.locator('body > [data-ui="select-content"]').count()).toBe(0);
  }, 30_000);

  it('keeps settings open when the startup trigger is clicked again to close the dropdown', async () => {
    page = await newCleanPage();
    await waitForEditorReady(page);
    const settings = await openSettingsPanel(page);

    const trigger = settings.getByLabel('Startup mode');
    await trigger.click();
    await settings.locator('[data-ui="select-content"]').waitFor({ state: 'visible' });
    const box = await trigger.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box?.x + box?.width / 2, box?.y + box?.height / 2);

    await settings.waitFor({ state: 'visible' });
    expect(await settings.isVisible()).toBe(true);
  }, 30_000);

  it('keeps the compact settings nav inside the body layout at shorter viewport heights', async () => {
    page = await newCleanPage({ width: 852, height: 700 });
    await waitForEditorReady(page);
    const settings = await openSettingsPanel(page);

    const geometry = await settings.evaluate((dialog) => {
      const header = dialog.querySelector('[data-ui="panel-header"]');
      const layout = dialog.querySelector('[data-ui="settings-panel-layout"]');
      const navRail = dialog.querySelector('[data-ui="settings-panel-nav-rail"]');
      if (!(header instanceof HTMLElement) || !(layout instanceof HTMLElement) || !(navRail instanceof HTMLElement)) {
        return null;
      }

      const headerBox = header.getBoundingClientRect();
      const layoutBox = layout.getBoundingClientRect();
      const navBox = navRail.getBoundingClientRect();
      const layoutStyle = window.getComputedStyle(layout);
      const navStyle = window.getComputedStyle(navRail);

      return {
        headerHeight: headerBox.height,
        headerBottom: headerBox.bottom,
        layoutTop: layoutBox.top,
        layoutHeight: layoutBox.height,
        navTop: navBox.top,
        navHeight: navBox.height,
        layoutHeightStyle: layoutStyle.height,
        navOverflowY: navStyle.overflowY,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry?.headerHeight).toBeGreaterThanOrEqual(56);
    expect(geometry?.layoutHeight).toBeGreaterThanOrEqual(600);
    expect(geometry?.layoutHeightStyle).toBe('600px');
    expect(geometry?.navOverflowY).toBe('auto');
    expect(geometry?.layoutTop).toBeCloseTo(geometry?.headerBottom ?? 0, 1);
    expect(geometry?.navTop).toBeCloseTo(geometry?.layoutTop ?? 0, 1);
    expect(geometry?.navHeight).toBeCloseTo(geometry?.layoutHeight ?? 0, 1);
  }, 30_000);

  it('opens inspector dropdowns in the same top-layer model without body portals', async () => {
    page = await newCleanPage();
    await waitForEditorReady(page);
    await page.locator('.stage-leaf', { hasText: 'Plan sticky behavior before building scroll-driven animations' }).first().click();

    const inspector = page.locator('.editor-inspector-shell');
    await inspector.waitFor({ state: 'visible' });
    const firstCombobox = inspector.locator('[role="combobox"]').first();
    await firstCombobox.click();

    const dropdown = page.locator('[data-ui="select-content"]').last();
    await dropdown.waitFor({ state: 'visible' });
    expect(await dropdown.isVisible()).toBe(true);
    expect(await page.locator('body > [data-ui="select-content"]').count()).toBe(0);
  }, 30_000);
});
