import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { STORAGE_KEY, DEFAULT_DOCUMENT_STORAGE_KEY } from '../../editor/editorStore';
import { createDefaultRect, createLeaf, createWrapper } from '../../model/defaultFactories';
import type { DocumentModel, TextLeaf } from '../../model/types';
import { startViteE2EServer, type StartedServer } from './e2eServer';

type TestDocumentIds = {
  sectionId: string;
  sourceContainerId: string;
  nestedContainerId: string;
  targetContainerId: string;
  reparentLeafId: string;
  axisLeafId: string;
  snapLeafId: string;
};

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

  async function openEditor(options?: { document?: DocumentModel; snapEnabled?: boolean }) {
    page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const state = options?.document
      ? {
          document: options.document,
          selectedId: null,
          pendingRoleSwap: null,
          ui: {
            previewSticky: true,
            spacerVisibility: 'selected',
            showGridLanes: false,
            snapEnabled: options.snapEnabled ?? true,
            themeMode: 'auto',
          },
        }
      : null;

    if (state) {
      await page.addInitScript(
        ({ storageKey, defaultKey, seededState, seededDocument }) => {
          window.localStorage.clear();
          window.localStorage.setItem(storageKey, JSON.stringify(seededState));
          window.localStorage.setItem(defaultKey, JSON.stringify(seededDocument));
        },
        {
          storageKey: STORAGE_KEY,
          defaultKey: DEFAULT_DOCUMENT_STORAGE_KEY,
          seededState: state,
          seededDocument: state.document,
        },
      );
    }

    await page.goto(server.url);
    await page.waitForSelector('.stage-shell');
  }

  async function closeEditor() {
    await page.close();
  }

  async function dragLocatorToPoint(
    locatorSelector: string,
    targetX: number,
    targetY: number,
    options?: { shiftKey?: boolean; altKey?: boolean },
  ) {
    const locator = page.locator(locatorSelector).first();
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();

    const modifiers: Array<'Shift' | 'Alt'> = [];
    if (options?.shiftKey) {
      modifiers.push('Shift');
    }
    if (options?.altKey) {
      modifiers.push('Alt');
    }

    for (const modifier of modifiers) {
      await page.keyboard.down(modifier);
    }

    try {
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetX, targetY, { steps: 14 });
      await page.mouse.up();
    } finally {
      for (const modifier of modifiers.reverse()) {
        await page.keyboard.up(modifier);
      }
    }
  }

  async function readPersistedState() {
    return page.evaluate((storageKey) => JSON.parse(window.localStorage.getItem(storageKey) ?? 'null'), STORAGE_KEY);
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

  it('collapses a multi-selection back to a single node on a plain second click and shows the group outline only while grouped', async () => {
    await openEditor();
    const title = page.locator('.stage-leaf', {
      hasText: 'Plan sticky behavior before building scroll-driven animations',
    }).first();
    const image = page.locator('.stage-leaf.role-image').first();

    await title.click();
    await image.click({ modifiers: ['Shift'] });

    expect(await title.getAttribute('class')).toMatch(/\bselected\b/);
    expect(await image.getAttribute('class')).toMatch(/\bselected\b/);
    expect(await title.getAttribute('class')).not.toMatch(/\bselected-primary\b/);
    expect(await image.getAttribute('class')).not.toMatch(/\bselected-primary\b/);

    const groupOutline = page.locator('.stage-multi-selection-outline');
    expect(await groupOutline.count()).toBe(1);
    const groupBox = await groupOutline.boundingBox();
    expect(groupBox).not.toBeNull();
    expect(groupBox?.width ?? 0).toBeGreaterThan(0);
    expect(groupBox?.height ?? 0).toBeGreaterThan(0);

    await title.click();

    expect(await title.getAttribute('class')).toMatch(/\bselected\b/);
    expect(await title.getAttribute('class')).toMatch(/\bselected-primary\b/);
    expect(await image.getAttribute('class')).not.toMatch(/\bselected\b/);
    expect(await groupOutline.count()).toBe(0);

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

  it('preserves image aspect ratio when resizing from a corner with Shift', async () => {
    await openEditor();
    const image = page.locator('.stage-leaf.role-image').first();

    await image.click();
    const before = await image.boundingBox();
    expect(before).not.toBeNull();

    const handle = page.locator('.resize-handle.handle-se').first();
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.keyboard.down('Shift');
    try {
      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 90, handleBox!.y + handleBox!.height / 2 + 30, {
        steps: 12,
      });
      await page.mouse.up();
    } finally {
      await page.keyboard.up('Shift');
    }

    const after = await image.boundingBox();
    expect(after).not.toBeNull();
    const beforeRatio = before!.width / before!.height;
    const afterRatio = (after?.width ?? 1) / Math.max(after?.height ?? 1, 1);
    expect(Math.abs(afterRatio - beforeRatio)).toBeLessThan(0.05);

    await closeEditor();
  }, 30_000);

  it('reparents a leaf into another container', async () => {
    const { document, ids } = createE2EDocument();
    await openEditor({ document });

    const target = page.locator(`[data-drop-wrapper-id="${ids.targetContainerId}"]`).first();
    const targetBox = await target.boundingBox();
    expect(targetBox).not.toBeNull();

    await dragLocatorToPoint(
      `[data-node-id="${ids.reparentLeafId}"]`,
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height / 2,
    );

    await page.waitForFunction(
      ({ storageKey, nodeId, parentId }) => {
        const state = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null');
        return state?.document?.nodes?.[nodeId]?.parentId === parentId;
      },
      {
        storageKey: STORAGE_KEY,
        nodeId: ids.reparentLeafId,
        parentId: ids.targetContainerId,
      },
    );

    const state = await readPersistedState();
    expect(state.document.nodes[ids.reparentLeafId].parentId).toBe(ids.targetContainerId);
    expect(parseFloat(state.document.nodes[ids.reparentLeafId].rect.x.base.raw)).toBeGreaterThan(10);
    expect(parseFloat(state.document.nodes[ids.reparentLeafId].rect.y.base.raw)).toBeGreaterThan(10);

    await closeEditor();
  }, 30_000);

  it('falls back to moving within the current parent when the hovered drop wrapper is invalid', async () => {
    const { document, ids } = createE2EDocument();
    await openEditor({ document });
    const draggedLeaf = page.locator(`[data-node-id="${ids.axisLeafId}"]`).first();
    const before = await draggedLeaf.boundingBox();
    expect(before).not.toBeNull();

    await page.evaluate(() => {
      const stageShell = window.document.querySelector('.stage-shell');
      if (!stageShell) {
        throw new Error('Expected stage shell');
      }
      const overlay = window.document.createElement('div');
      overlay.id = 'invalid-drop-overlay';
      overlay.dataset.dropWrapperId = 'missing_wrapper';
      overlay.style.position = 'absolute';
      overlay.style.left = '980px';
      overlay.style.top = '320px';
      overlay.style.width = '120px';
      overlay.style.height = '120px';
      overlay.style.zIndex = '9999';
      overlay.style.pointerEvents = 'auto';
      overlay.style.background = 'transparent';
      stageShell.appendChild(overlay);
    });

    const invalidOverlay = page.locator('#invalid-drop-overlay');
    const invalidOverlayBox = await invalidOverlay.boundingBox();
    expect(invalidOverlayBox).not.toBeNull();

    await dragLocatorToPoint(
      `[data-node-id="${ids.axisLeafId}"]`,
      invalidOverlayBox!.x + invalidOverlayBox!.width / 2,
      invalidOverlayBox!.y + invalidOverlayBox!.height / 2,
    );
    await page.waitForTimeout(150);

    const after = await draggedLeaf.boundingBox();
    expect(after).not.toBeNull();

    const state = await readPersistedState();
    expect(state.document.nodes[ids.axisLeafId].parentId).toBe(ids.sectionId);
    expect(Math.abs((after?.x ?? 0) - before!.x) + Math.abs((after?.y ?? 0) - before!.y)).toBeGreaterThan(5);

    await closeEditor();
  }, 30_000);

  it('locks drag movement to one axis while Shift is held', async () => {
    const { document, ids } = createE2EDocument();
    await openEditor({ document, snapEnabled: false });

    const leaf = page.locator(`[data-node-id="${ids.axisLeafId}"]`).first();
    const before = await leaf.boundingBox();
    expect(before).not.toBeNull();

    await dragLocatorToPoint(
      `[data-node-id="${ids.axisLeafId}"]`,
      before!.x + before!.width / 2 + 140,
      before!.y + before!.height / 2 + 90,
      { shiftKey: true },
    );

    const after = await leaf.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs((after?.x ?? 0) - before!.x)).toBeGreaterThan(80);
    expect(Math.abs((after?.y ?? 0) - before!.y)).toBeLessThan(3);

    await closeEditor();
  }, 30_000);

  it('nudges the selected element by 1px and 10px with arrow keys', async () => {
    const { document, ids } = createE2EDocument();
    await openEditor({ document, snapEnabled: false });

    const leaf = page.locator(`[data-node-id="${ids.axisLeafId}"]`).first();
    await leaf.click();
    await page.locator('.stage-shell').focus();

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');

    await page.waitForFunction(
      ({ storageKey, nodeId }) => {
        const state = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null');
        return state?.document?.nodes?.[nodeId]?.rect?.x?.base?.raw === '131px';
      },
      {
        storageKey: STORAGE_KEY,
        nodeId: ids.axisLeafId,
      },
    );

    const state = await readPersistedState();
    expect(state.document.nodes[ids.axisLeafId].rect.x.base.raw).toBe('131px');

    await closeEditor();
  }, 30_000);

  it('disables snapping while Alt is held', async () => {
    const { document, ids } = createE2EDocument();
    await openEditor({ document, snapEnabled: true });

    const frame = page.locator('.stage-frame').first();
    const frameBox = await frame.boundingBox();
    expect(frameBox).not.toBeNull();

    const snapTarget = page.locator(`[data-node-id="${ids.snapLeafId}"]`).first();
    const before = await snapTarget.boundingBox();
    expect(before).not.toBeNull();

    const nearCenterX = frameBox!.x + frameBox!.width / 2 + 6;

    await dragLocatorToPoint(
      `[data-node-id="${ids.snapLeafId}"]`,
      nearCenterX,
      before!.y + before!.height / 2,
    );

    const snapped = await snapTarget.boundingBox();
    expect(snapped).not.toBeNull();
    const snappedCenter = snapped!.x + snapped!.width / 2;
    const frameCenter = frameBox!.x + frameBox!.width / 2;
    expect(Math.abs(snappedCenter - frameCenter)).toBeLessThanOrEqual(2);

    await closeEditor();

    const second = createE2EDocument();
    await openEditor({ document: second.document, snapEnabled: true });

    const secondFrame = page.locator('.stage-frame').first();
    const secondFrameBox = await secondFrame.boundingBox();
    expect(secondFrameBox).not.toBeNull();

    const secondTarget = page.locator(`[data-node-id="${second.ids.snapLeafId}"]`).first();
    const secondBefore = await secondTarget.boundingBox();
    expect(secondBefore).not.toBeNull();

    await dragLocatorToPoint(
      `[data-node-id="${second.ids.snapLeafId}"]`,
      secondFrameBox!.x + secondFrameBox!.width / 2 + 6,
      secondBefore!.y + secondBefore!.height / 2,
      { altKey: true },
    );

    const unsnapped = await secondTarget.boundingBox();
    expect(unsnapped).not.toBeNull();
    const unsnappedCenter = unsnapped!.x + unsnapped!.width / 2;
    const secondFrameCenter = secondFrameBox!.x + secondFrameBox!.width / 2;
    expect(Math.abs(unsnappedCenter - secondFrameCenter)).toBeGreaterThanOrEqual(4);

    await closeEditor();
  }, 30_000);

  it('respects the snap toggle shortcut state during drag', async () => {
    const { document, ids } = createE2EDocument();
    await openEditor({ document, snapEnabled: true });

    await page.keyboard.press('Shift+G');

    const frame = page.locator('.stage-frame').first();
    const frameBox = await frame.boundingBox();
    expect(frameBox).not.toBeNull();

    const snapTarget = page.locator(`[data-node-id="${ids.snapLeafId}"]`).first();
    const before = await snapTarget.boundingBox();
    expect(before).not.toBeNull();

    await dragLocatorToPoint(
      `[data-node-id="${ids.snapLeafId}"]`,
      frameBox!.x + frameBox!.width / 2 + 6,
      before!.y + before!.height / 2,
    );

    const after = await snapTarget.boundingBox();
    expect(after).not.toBeNull();
    const frameCenter = frameBox!.x + frameBox!.width / 2;
    const afterCenter = after!.x + after!.width / 2;
    expect(Math.abs(afterCenter - frameCenter)).toBeGreaterThanOrEqual(4);

    const state = await readPersistedState();
    expect(state.ui.snapEnabled).toBe(false);

    await closeEditor();
  }, 30_000);
});

function createE2EDocument(): { document: DocumentModel; ids: TestDocumentIds } {
  const siteId = 'site_e2e';
  const section = createWrapper('section', siteId);
  section.name = 'E2E Section';
  section.rect = createDefaultRect('0px', '0px', '100%', '900px');

  const sourceContainer = createWrapper('container', section.id);
  sourceContainer.name = 'Source Container';
  sourceContainer.rect = createDefaultRect('80px', '110px', '300px', '260px');

  const nestedContainer = createWrapper('container', sourceContainer.id);
  nestedContainer.name = 'Nested Invalid Target';
  nestedContainer.rect = createDefaultRect('36px', '108px', '150px', '96px');

  const targetContainer = createWrapper('container', section.id);
  targetContainer.name = 'Target Container';
  targetContainer.rect = createDefaultRect('560px', '110px', '300px', '260px');

  const reparentLeaf = createLeaf('text', sourceContainer.id) as TextLeaf;
  reparentLeaf.name = 'Reparent Leaf';
  reparentLeaf.content = 'Reparent me';
  reparentLeaf.rect = createDefaultRect('188px', '36px', '160px', 'auto');

  const axisLeaf = createLeaf('text', section.id) as TextLeaf;
  axisLeaf.name = 'Axis Lock Leaf';
  axisLeaf.content = 'Shift drag me';
  axisLeaf.rect = createDefaultRect('120px', '470px', '180px', 'auto');

  const snapLeaf = createLeaf('text', section.id) as TextLeaf;
  snapLeaf.name = 'Snap Leaf';
  snapLeaf.content = 'Snap me';
  snapLeaf.rect = createDefaultRect('160px', '620px', '180px', 'auto');

  sourceContainer.children = [nestedContainer.id, reparentLeaf.id];
  targetContainer.children = [];
  nestedContainer.children = [];
  section.children = [sourceContainer.id, targetContainer.id, axisLeaf.id, snapLeaf.id];

  const document: DocumentModel = {
    rootId: siteId,
    nodes: {
      [siteId]: {
        id: siteId,
        type: 'site',
        parentId: null,
        children: [section.id],
        name: 'Site',
        visible: true,
        locked: false,
      },
      [section.id]: section,
      [sourceContainer.id]: sourceContainer,
      [nestedContainer.id]: nestedContainer,
      [targetContainer.id]: targetContainer,
      [reparentLeaf.id]: reparentLeaf,
      [axisLeaf.id]: axisLeaf,
      [snapLeaf.id]: snapLeaf,
    },
  };

  return {
    document,
    ids: {
      sectionId: section.id,
      sourceContainerId: sourceContainer.id,
      nestedContainerId: nestedContainer.id,
      targetContainerId: targetContainer.id,
      reparentLeafId: reparentLeaf.id,
      axisLeafId: axisLeaf.id,
      snapLeafId: snapLeaf.id,
    },
  };
}
