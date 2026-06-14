import AxeBuilder from '@axe-core/playwright';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { startViteE2EServer, type StartedServer } from '../../stage/tests/e2eServer';

async function expectEditorReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('toolbar', { name: 'Editor toolbar' }).waitFor({ state: 'visible' });
  await page.locator('.stage-shell').waitFor({ state: 'visible' });
}

describe('app smoke e2e', () => {
  let server: StartedServer;
  let browser: Browser;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  beforeAll(async () => {
    server = await startViteE2EServer();
    browser = await chromium.launch({ headless: true });
  }, 30_000);

  afterEach(async () => {
    await page?.close();
    await context?.close();
    page = null;
    context = null;
  });

  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });

  async function newSmokePage() {
    context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const nextPage = await context.newPage();
    await nextPage.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await expectEditorReady(nextPage, server.url);
    page = nextPage;
    return nextPage;
  }

  it('loads the editor stage and opens the inspector for a selected node', async () => {
    const smokePage = await newSmokePage();

    await smokePage.locator('.stage-leaf', { hasText: 'Plan sticky behavior before building scroll-driven animations' }).first().click();

    await smokePage.locator('.editor-inspector-shell').waitFor({ state: 'visible' });
    expect(await smokePage.locator('.stage-single-selection-overlay').first().isVisible()).toBe(true);
  }, 30_000);

  it('opens the settings panel and startup mode dropdown', async () => {
    const smokePage = await newSmokePage();

    await smokePage.locator('[data-ui="menubar-trigger"][data-menu-id="settings"]').click();
    const openSettingsItem = smokePage.getByRole('menuitem', { name: 'Open Settings' });
    await openSettingsItem.waitFor({ state: 'visible' });
    const menuStyle = await openSettingsItem.evaluate((element) => {
      const menu = element.closest('.editor-menubar-content');
      if (!menu) {
        throw new Error('Expected opened menu item to be inside a menubar surface');
      }
      const style = window.getComputedStyle(menu);
      return {
        backgroundColor: style.backgroundColor,
        borderStyle: style.borderStyle,
        paddingTop: style.paddingTop,
      };
    });
    expect(menuStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(menuStyle.borderStyle).not.toBe('none');
    expect(Number.parseFloat(menuStyle.paddingTop)).toBeGreaterThan(0);
    await openSettingsItem.click();
    const dialog = smokePage.getByRole('dialog', { name: 'Settings' });
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByLabel('Startup mode').click();

    expect(await dialog.locator('[data-ui="select-content"]').isVisible()).toBe(true);
  }, 30_000);

  it('opens the showcase tour from URL state without render-loop errors', async () => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const smokePage = await context.newPage();
    const pageErrors: string[] = [];
    smokePage.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    await smokePage.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await expectEditorReady(smokePage, `${server.url}/?tour=start&step=welcome`);
    page = smokePage;

    const tour = smokePage.locator('[data-showcase-tour="true"]');
    await tour.waitFor({ state: 'visible' });

    expect(await tour.textContent()).toContain('working editor surface');
    const tourStyle = await tour.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, borderStyle: style.borderStyle };
    });
    expect(tourStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(tourStyle.borderStyle).toBe('none');
    const highlight = smokePage.locator('[data-showcase-tour-highlight="true"]');
    await highlight.waitFor({ state: 'visible' });
    const highlightStyle = await highlight.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, boxShadow: style.boxShadow };
    });
    expect(highlightStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(highlightStyle.boxShadow).not.toContain('9999px');
    await smokePage.getByRole('button', { name: 'Hide tour panel' }).click();
    await smokePage.getByRole('button', { name: 'Show tour' }).waitFor({ state: 'visible' });
    await smokePage.getByRole('button', { name: 'Show tour' }).click();
    await smokePage.getByRole('button', { name: 'Hide tour panel' }).waitFor({ state: 'visible' });
    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('creates the sticky lab during the sticky tour story', async () => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const smokePage = await context.newPage();
    const pageErrors: string[] = [];
    smokePage.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    await smokePage.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await expectEditorReady(smokePage, `${server.url}/?tour=sticky&step=sticky-templates`);
    page = smokePage;

    await smokePage.locator('[data-showcase-tour="true"]').waitFor({ state: 'visible' });
    await smokePage.locator('.stage-shell', { hasText: 'Sticky Edge Lab' }).waitFor({ state: 'visible' });

    expect(await smokePage.locator('[data-showcase-tour="true"]').textContent()).toContain('Create the sticky lab');
    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('has no automatically detectable editor chrome axe violations on initial load', async () => {
    const smokePage = await newSmokePage();

    const results = await new AxeBuilder({ page: smokePage })
      .exclude('.stage-frame')
      .disableRules(['region'])
      .analyze();

    expect(results.violations).toEqual([]);
  }, 30_000);
});
