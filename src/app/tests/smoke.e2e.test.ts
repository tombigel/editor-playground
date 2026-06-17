import AxeBuilder from '@axe-core/playwright';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { startViteE2EServer, type StartedServer } from '../../stage/tests/e2eServer';

async function expectEditorReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('toolbar', { name: 'Editor toolbar' }).waitFor({ state: 'visible' });
  await page.locator('.stage-shell').waitFor({ state: 'visible' });
}

function getHashSearchParams(url: string) {
  const hash = new URL(url).hash;
  const queryStart = hash.indexOf('?');
  const queryEnd = hash.indexOf('#', queryStart);
  if (queryStart === -1) {
    return new URLSearchParams();
  }
  return new URLSearchParams(hash.slice(queryStart + 1, queryEnd === -1 ? undefined : queryEnd));
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
    await expectEditorReady(nextPage, `${server.url}/#/edit`);
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
    await expectEditorReady(smokePage, `${server.url}/#/edit?tour=start&step=welcome`);
    page = smokePage;

    const tour = smokePage.locator('[data-showcase-tour="true"]');
    await tour.waitFor({ state: 'visible' });

    expect(await tour.textContent()).toContain('real editor surfaces');
    const tourMenu = smokePage.getByRole('navigation', { name: 'Showcase tour topics' });
    const showMenuButton = smokePage.getByRole('button', { name: 'Show tour menu' });
    expect(await tourMenu.count()).toBe(0);
    expect(await showMenuButton.isVisible()).toBe(true);
    await showMenuButton.hover();
    await smokePage.getByRole('tooltip', { name: 'Show tour menu' }).waitFor({ state: 'visible' });
    await showMenuButton.click();
    await tourMenu.waitFor({ state: 'visible' });
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
      return {
        backgroundColor: style.backgroundColor,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
    expect(highlightStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(highlightStyle.borderWidth).toBe('0px');
    expect(highlightStyle.outlineStyle).toBe('solid');
    expect(highlightStyle.outlineWidth).toBe('4px');
    expect(highlightStyle.boxShadow).not.toContain('9999px');
    expect(highlightStyle.boxShadow).toContain('inset');
    const highlightLabel = smokePage.locator('[data-showcase-tour-highlight-label="true"]');
    await highlightLabel.waitFor({ state: 'visible' });
    const highlightLabelStyle = await highlightLabel.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return { backgroundColor: style.backgroundColor };
    });
    expect(highlightLabelStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    await smokePage.getByRole('button', { name: 'Hide tour panel' }).click();
    await smokePage.getByRole('button', { name: 'Show tour' }).waitFor({ state: 'visible' });
    await smokePage.getByRole('button', { name: 'Show tour' }).click();
    await smokePage.getByRole('button', { name: 'Hide tour panel' }).waitFor({ state: 'visible' });
    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('anchors settings workflow tour highlights to left nav items', async () => {
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
    page = smokePage;

    for (const { topic, step, navId } of [
      { topic: 'design', step: 'ui-settings', navId: 'display' },
      { topic: 'design', step: 'font-system', navId: 'fonts' },
      { topic: 'api', step: 'model-transfer', navId: 'transfer' },
      { topic: 'product', step: 'link-validation', navId: 'transfer' },
    ]) {
      await expectEditorReady(
        smokePage,
        `${server.url}/#/edit?tour=${topic}&step=${step}`,
      );
      await smokePage.getByRole('dialog', { name: 'Settings' }).waitFor({ state: 'visible' });
      const navItem = smokePage.locator(`[data-settings-nav="${navId}"]`);
      const highlight = smokePage.locator('[data-showcase-tour-highlight="true"]');
      await navItem.waitFor({ state: 'visible' });
      await highlight.waitFor({ state: 'visible' });

      await expect
        .poll(async () => {
          const navBox = await navItem.boundingBox();
          const highlightBox = await highlight.boundingBox();
          if (!navBox || !highlightBox) {
            return false;
          }
          return (
            Math.abs(highlightBox.x - (navBox.x - 8)) <= 3 &&
            Math.abs(highlightBox.y - (navBox.y - 8)) <= 3 &&
            Math.abs(highlightBox.width - (navBox.width + 16)) <= 6 &&
            Math.abs(highlightBox.height - (navBox.height + 16)) <= 6 &&
            highlightBox.y > 100
          );
        })
        .toBe(true);
    }

    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('opens and highlights the non-linear tour menu step', async () => {
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
    await expectEditorReady(smokePage, `${server.url}/#/edit?tour=start&step=menu-is-nonlinear`);
    page = smokePage;

    const tourMenu = smokePage.getByRole('navigation', { name: 'Showcase tour topics' });
    const highlight = smokePage.locator('[data-showcase-tour-highlight="true"]');
    await tourMenu.waitFor({ state: 'visible' });
    await highlight.waitFor({ state: 'visible' });

    expect(await tourMenu.textContent()).toContain('API & Architecture');
    expect(await smokePage.locator('[data-showcase-tour-highlight-label="true"]').textContent()).toContain('Tour menu');
    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('clears stale panel URL params when advancing to a close-panels step', async () => {
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
    await expectEditorReady(smokePage, `${server.url}/#/edit?tour=api&step=model-transfer&panel=settings&settings=transfer&keep=1`);
    page = smokePage;

    await smokePage.getByRole('dialog', { name: 'Settings' }).waitFor({ state: 'visible' });
    const tourCard = smokePage.locator('[data-showcase-tour-card="true"]');
    await tourCard.getByRole('button', { name: 'Next' }).click();
    await tourCard.filter({ hasText: 'The editor model renders as a site' }).waitFor({ state: 'visible' });

    const searchParams = getHashSearchParams(smokePage.url());
    expect(searchParams.get('keep')).toBe('1');
    expect(searchParams.get('tour')).toBe('api');
    expect(searchParams.get('step')).toBe('site-preview-export');
    expect(searchParams.has('panel')).toBe(false);
    expect(searchParams.has('settings')).toBe(false);
    const previewAction = tourCard.getByRole('link', { name: 'Open preview in a new tab' });
    await previewAction.waitFor({ state: 'visible' });
    expect(await previewAction.getAttribute('href')).toBe('#/preview');
    expect(await previewAction.getAttribute('target')).toBe('_blank');

    const highlight = smokePage.locator('[data-showcase-tour-highlight="true"]');
    const label = smokePage.locator('[data-showcase-tour-highlight-label="true"]');
    await highlight.waitFor({ state: 'visible' });
    await label.waitFor({ state: 'visible' });
    await smokePage.waitForTimeout(250);
    const highlightBox = await highlight.boundingBox();
    const labelBox = await label.boundingBox();
    if (!highlightBox || !labelBox) {
      throw new Error('Expected preview highlight and label to be measurable');
    }
    expect(labelBox.y).toBeGreaterThanOrEqual(highlightBox.y + highlightBox.height - 1);
    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('restores tour-applied view flags and URL params on close', async () => {
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
    await expectEditorReady(smokePage, `${server.url}/#/edit?tour=api&step=debug-info&keep=1`);
    page = smokePage;

    const tour = smokePage.locator('[data-showcase-tour="true"]');
    await tour.waitFor({ state: 'visible' });
    await tour.filter({ hasText: 'Inspect debug state' }).waitFor({ state: 'visible' });

    const tourSearchParams = getHashSearchParams(smokePage.url());
    expect(tourSearchParams.get('tour')).toBe('api');
    expect(tourSearchParams.get('step')).toBe('debug-info');
    expect(tourSearchParams.get('debug')).toBe('1');

    await smokePage.getByRole('button', { name: 'Close showcase tour' }).click();
    await tour.waitFor({ state: 'hidden' });

    const cleanSearchParams = getHashSearchParams(smokePage.url());
    expect(cleanSearchParams.get('keep')).toBe('1');
    expect(cleanSearchParams.has('tour')).toBe(false);
    expect(cleanSearchParams.has('step')).toBe(false);
    expect(cleanSearchParams.has('debug')).toBe(false);
    expect(cleanSearchParams.has('sticky-preview')).toBe(false);
    expect(cleanSearchParams.has('animation-preview')).toBe(false);
    expect(cleanSearchParams.has('spacers')).toBe(false);

    await smokePage.locator('[data-ui="menubar-trigger"][data-menu-id="view"]').click();
    const debugMenuItem = smokePage.getByRole('menuitemcheckbox', { name: 'Show debug info' });
    await debugMenuItem.waitFor({ state: 'visible' });
    expect(await debugMenuItem.getAttribute('aria-checked')).toBe('false');
    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('drags the showcase tour panel and menu separately without remembering position after close', async () => {
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
    await expectEditorReady(smokePage, `${server.url}/#/edit?tour=start&step=welcome`);
    page = smokePage;

    const tourCard = smokePage.locator('[data-showcase-tour-card="true"]');
    const dragHandle = smokePage.locator('[data-showcase-tour-drag-handle="true"]');
    await tourCard.waitFor({ state: 'visible' });
    const initialBox = await tourCard.boundingBox();
    const handleBox = await dragHandle.boundingBox();
    if (!initialBox || !handleBox) {
      throw new Error('Expected showcase tour card and drag handle to be measurable');
    }

    await smokePage.mouse.move(handleBox.x + 80, handleBox.y + 18);
    await smokePage.mouse.down();
    await smokePage.mouse.move(handleBox.x + 280, handleBox.y - 140, { steps: 8 });
    await smokePage.mouse.up();

    const draggedBox = await tourCard.boundingBox();
    if (!draggedBox) {
      throw new Error('Expected dragged showcase tour card to be measurable');
    }
    expect(draggedBox.x).toBeGreaterThan(initialBox.x + 120);
    expect(draggedBox.y).toBeLessThan(initialBox.y - 80);

    const tourFooter = tourCard.locator('[data-showcase-tour-footer="true"]');
    const footerBeforeStepChange = await tourFooter.boundingBox();
    if (!footerBeforeStepChange) {
      throw new Error('Expected dragged showcase tour footer to be measurable');
    }
    await tourCard.getByRole('button', { name: 'Next' }).click();
    await tourCard.filter({ hasText: 'The stage uses document state' }).waitFor({ state: 'visible' });
    const footerAfterStepChange = await tourFooter.boundingBox();
    if (!footerAfterStepChange) {
      throw new Error('Expected showcase tour footer after step change to be measurable');
    }
    expect(
      Math.abs(
        footerAfterStepChange.y +
          footerAfterStepChange.height -
          (footerBeforeStepChange.y + footerBeforeStepChange.height),
      ),
    ).toBeLessThan(3);
    const panelBeforeMenuDragBox = await tourCard.boundingBox();
    if (!panelBeforeMenuDragBox) {
      throw new Error('Expected showcase tour card before menu drag to be measurable');
    }

    await smokePage.getByRole('button', { name: 'Show tour menu' }).click();
    const tourMenu = smokePage.locator('[data-showcase-tour-menu="true"]');
    const menuDragHandle = smokePage.locator('[data-showcase-tour-menu-drag-handle="true"]');
    await tourMenu.waitFor({ state: 'visible' });
    const menuInitialBox = await tourMenu.boundingBox();
    const menuHandleBox = await menuDragHandle.boundingBox();
    if (!menuInitialBox || !menuHandleBox) {
      throw new Error('Expected showcase tour menu and drag handle to be measurable');
    }

    await smokePage.mouse.move(menuHandleBox.x + 80, menuHandleBox.y + 18);
    await smokePage.mouse.down();
    await smokePage.mouse.move(menuHandleBox.x - 120, menuHandleBox.y - 100, { steps: 8 });
    await smokePage.mouse.up();

    const menuDraggedBox = await tourMenu.boundingBox();
    const panelAfterMenuDragBox = await tourCard.boundingBox();
    if (!menuDraggedBox || !panelAfterMenuDragBox) {
      throw new Error('Expected dragged tour surfaces to be measurable');
    }
    expect(menuDraggedBox.x).toBeLessThan(menuInitialBox.x - 80);
    expect(menuDraggedBox.y).toBeLessThan(menuInitialBox.y - 50);
    expect(Math.abs(panelAfterMenuDragBox.x - panelBeforeMenuDragBox.x)).toBeLessThan(5);
    expect(Math.abs(panelAfterMenuDragBox.y - panelBeforeMenuDragBox.y)).toBeLessThan(5);

    await smokePage.getByRole('button', { name: 'Close showcase tour' }).click();
    await smokePage.locator('[data-showcase-tour="true"]').waitFor({ state: 'hidden' });
    await smokePage.locator('[data-ui="menubar-trigger"][data-menu-id="help"]').click();
    await smokePage.getByRole('menuitem', { name: 'Showcase tour' }).click();
    await tourCard.waitFor({ state: 'visible' });

    const reopenedBox = await tourCard.boundingBox();
    if (!reopenedBox) {
      throw new Error('Expected reopened showcase tour card to be measurable');
    }
    expect(reopenedBox.x).toBeLessThan(80);
    expect(reopenedBox.y).toBeGreaterThan(600);
    await smokePage.getByRole('button', { name: 'Show tour menu' }).click();
    await tourMenu.waitFor({ state: 'visible' });
    const reopenedMenuBox = await tourMenu.boundingBox();
    if (!reopenedMenuBox) {
      throw new Error('Expected reopened showcase tour menu to be measurable');
    }
    expect(reopenedMenuBox.x).toBeGreaterThan(reopenedBox.x + reopenedBox.width);
    expect(reopenedMenuBox.y).toBeGreaterThan(menuDraggedBox.y + 80);
    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('does not dismiss outside-click panels when dragging the showcase tour', async () => {
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
    await expectEditorReady(smokePage, `${server.url}/#/edit?tour=start&step=welcome`);
    page = smokePage;

    await smokePage.locator('[data-ui="menubar-trigger"][data-menu-id="view"]').click();
    await smokePage.getByRole('menuitemcheckbox', { name: 'Pages panel' }).click();
    const pagesPanel = smokePage.locator('.editor-pages-panel');
    await pagesPanel.waitFor({ state: 'visible' });
    await pagesPanel.getByRole('button', { name: 'Site language' }).click();
    const languageList = smokePage.getByRole('listbox');
    await languageList.waitFor({ state: 'visible' });

    const dragHandle = smokePage.locator('[data-showcase-tour-drag-handle="true"]');
    const handleBox = await dragHandle.boundingBox();
    if (!handleBox) {
      throw new Error('Expected showcase tour drag handle to be measurable');
    }
    await smokePage.mouse.move(handleBox.x + 80, handleBox.y + 18);
    await smokePage.mouse.down();
    await smokePage.mouse.move(handleBox.x + 260, handleBox.y - 120, { steps: 8 });
    await smokePage.mouse.up();

    expect(await languageList.isVisible()).toBe(true);
    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('does not dismiss the settings panel when interacting with the showcase tour', async () => {
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
    await expectEditorReady(smokePage, `${server.url}/#/edit?tour=start&step=welcome`);
    page = smokePage;

    await smokePage.locator('[data-ui="menubar-trigger"][data-menu-id="settings"]').click();
    await smokePage.getByRole('menuitem', { name: 'Open Settings' }).click();
    const settingsPanel = smokePage.getByRole('dialog', { name: 'Settings' });
    await settingsPanel.waitFor({ state: 'visible' });

    const dragHandle = smokePage.locator('[data-showcase-tour-drag-handle="true"]');
    const handleBox = await dragHandle.boundingBox();
    if (!handleBox) {
      throw new Error('Expected showcase tour drag handle to be measurable');
    }
    await smokePage.mouse.click(handleBox.x + 80, handleBox.y + 18);
    expect(await settingsPanel.isVisible()).toBe(true);

    await smokePage.mouse.move(handleBox.x + 80, handleBox.y + 18);
    await smokePage.mouse.down();
    await smokePage.mouse.move(handleBox.x + 260, handleBox.y - 120, { steps: 8 });
    await smokePage.mouse.up();

    expect(await settingsPanel.isVisible()).toBe(true);
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
    await expectEditorReady(smokePage, `${server.url}/#/edit?tour=sticky&step=sticky-templates`);
    page = smokePage;

    await smokePage.locator('[data-showcase-tour="true"]').waitFor({ state: 'visible' });
    await smokePage.locator('.stage-shell', { hasText: 'Sticky Edge Lab' }).waitFor({ state: 'visible' });

    expect(await smokePage.locator('[data-showcase-tour="true"]').textContent()).toContain('Create the sticky lab');
    expect(pageErrors).toEqual([]);
  }, 30_000);

  it('creates the sticky lab from later sticky tour deep links', async () => {
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
    await expectEditorReady(smokePage, `${server.url}/#/edit?tour=sticky&step=sticky-guides`);
    page = smokePage;

    await smokePage.locator('[data-showcase-tour="true"]').waitFor({ state: 'visible' });
    await smokePage.locator('.stage-shell', { hasText: 'Sticky Edge Lab' }).waitFor({ state: 'visible' });

    expect(await smokePage.locator('[data-showcase-tour="true"]').textContent()).toContain('Turn on sticky preview');
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
