import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { startViteE2EServer, type StartedServer } from './e2eServer';

describe('stage/Stage e2e', () => {
  let server: StartedServer;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    server = await startViteE2EServer();
    browser = await chromium.launch({ headless: true });
  }, 30_000);

  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });

  async function openEditor() {
    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.goto(server.url);
    await page.waitForSelector('.stage-shell');
  }

  async function closeEditor() {
    await page.close();
  }

  it('selects and drags a stage text node', async () => {
    await openEditor();
    const title = page.locator('.stage-leaf', {
      hasText: 'Plan sticky behavior before building scroll-driven animations',
    }).first();

    const before = await title.boundingBox();
    expect(before).not.toBeNull();

    await title.click();
    expect(await title.getAttribute('class')).toMatch(/\bselected\b/);

    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2 + 120, before!.y + before!.height / 2 + 80, { steps: 10 });
    await page.mouse.up();

    const after = await title.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs((after?.x ?? 0) - before!.x)).toBeGreaterThan(20);
    expect(Math.abs((after?.y ?? 0) - before!.y)).toBeGreaterThan(20);

    await closeEditor();
  }, 30_000);

  it('resizes a selected image node from the south-east handle', async () => {
    await openEditor();
    const image = page.locator('.stage-leaf.role-image').first();

    await image.click();
    expect(await image.getAttribute('class')).toMatch(/\bselected\b/);

    const before = await image.boundingBox();
    expect(before).not.toBeNull();

    const handle = page.locator('.resize-handle.handle-se').first();
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 80, handleBox!.y + handleBox!.height / 2 + 60, {
      steps: 10,
    });
    await page.mouse.up();

    const after = await image.boundingBox();
    expect(after).not.toBeNull();
    expect((after?.width ?? 0) - before!.width).toBeGreaterThan(40);
    expect((after?.height ?? 0) - before!.height).toBeGreaterThan(20);

    await closeEditor();
  }, 30_000);
});
