import AxeBuilder from '@axe-core/playwright';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page, type Route } from 'playwright';
import { startViteE2EServer, type StartedServer } from '../../stage/tests/e2eServer';

const AI_PROVIDER_KEY_STORAGE_KEY = 'editor-playground.ai-provider-key.v1';

/**
 * OpenAI-compatible SSE body carrying a short assistant text plus a single
 * `deleteNode` tool call for `nodeId`. `deleteNode` is used deliberately: it
 * renders the draft card's destructive treatment (the "Includes deletion"
 * badge, the danger-surface row, the destructive Approve variant), so the a11y
 * scan covers that visually-distinct styling — the highest-risk custom surface
 * in this panel — not just the additive path.
 */
function buildDeleteToolCallSseBody(nodeId: string): string {
  const chunks = [
    { choices: [{ index: 0, delta: { role: 'assistant', content: 'I can remove that node.' } }] },
    {
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_delete_1',
                type: 'function',
                function: { name: 'deleteNode', arguments: JSON.stringify({ nodeId }) },
              },
            ],
          },
        },
      ],
    },
    { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
  ];
  return `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('')}data: [DONE]\n\n`;
}

type AxeViolation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number];

function formatViolations(violations: AxeViolation[]) {
  return violations
    .map((violation) => {
      const impactedTargets = violation.nodes
        .map((node) => node.target.join(' '))
        .slice(0, 5)
        .join(', ');
      return `${violation.id} [${violation.impact ?? 'unknown'}]: ${violation.help}${impactedTargets ? ` | targets: ${impactedTargets}` : ''}`;
    })
    .join('\n');
}

async function expectNoViolations(
  results: Awaited<ReturnType<AxeBuilder['analyze']>>,
) {
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

async function analyzeWithRetry(build: () => AxeBuilder, page: Page) {
  try {
    return await build().analyze();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Execution context was destroyed')) {
      throw error;
    }

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(250);
    return await build().analyze();
  }
}

describe('app/axe accessibility e2e', () => {
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

  it('has no automatically detectable editor chrome axe violations on initial load', async () => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto(`${server.url}/#/edit`, { waitUntil: 'domcontentloaded' });
    await page.locator('.stage-shell').waitFor({ state: 'visible' });

    const accessibilityScanResults = await analyzeWithRetry(
      () =>
        new AxeBuilder({ page })
          .exclude('.stage-frame')
          .disableRules(['region']),
      page,
    );

    await expectNoViolations(accessibilityScanResults);
  }, 30_000);

  it('has no automatically detectable site preview axe violations on initial load', async () => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto(`${server.url}/#/edit`, { waitUntil: 'domcontentloaded' });
    await page.locator('.stage-canvas').waitFor({ state: 'visible' });

    const accessibilityScanResults = await analyzeWithRetry(
      () => new AxeBuilder({ page }).include('.stage-canvas'),
      page,
    );

    await expectNoViolations(accessibilityScanResults);
  }, 30_000);

  it('has no axe violations for the AI panel with a rendered draft diff card', async () => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // Read a real target node id so the mocked mutation validates and stages a
    // draft (rather than being rejected before the card can render).
    await page.goto(`${server.url}/#/edit`, { waitUntil: 'domcontentloaded' });
    await page.locator('.stage-shell').waitFor({ state: 'visible' });
    const targetNode = page
      .locator('.stage-canvas [data-node-id]', {
        hasText: 'Plan sticky behavior before building scroll-driven animations',
      })
      .first();
    await targetNode.waitFor({ state: 'visible' });
    const nodeId = await targetNode.getAttribute('data-node-id');
    if (!nodeId) {
      throw new Error('Expected the starter text leaf to expose a data-node-id');
    }

    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: buildDeleteToolCallSseBody(nodeId),
      });
    });

    // Persist a fake key through the real Settings AI section so the panel
    // builds a live adapter (intercepted by the mocked route above). Settings
    // opens via the menubar — the `panel` URL param does not recognise it.
    await page.locator('[data-ui="menubar-trigger"][data-menu-id="settings"]').click();
    await page.getByRole('menuitem', { name: 'Open Settings' }).click();
    const settingsDialog = page.getByRole('dialog', { name: 'Settings' });
    await settingsDialog.waitFor({ state: 'visible' });
    await settingsDialog.locator('[data-settings-nav="ai"]').click();
    await settingsDialog.getByLabel('OpenRouter API key').fill('sk-or-fake-a11y-key');
    await settingsDialog.getByLabel('Custom OpenRouter model id').waitFor({ state: 'visible' });
    await settingsDialog.getByLabel('Prompt caching').waitFor({ state: 'visible' });
    await settingsDialog.getByRole('link', { name: /Get an OpenRouter key/ }).waitFor({ state: 'visible' });
    const settingsScanResults = await analyzeWithRetry(
      () => new AxeBuilder({ page: page as Page }).include('[role="dialog"]'),
      page,
    );
    await expectNoViolations(settingsScanResults);

    await expect
      .poll(async () =>
        page.evaluate((key) => window.localStorage.getItem(key), AI_PROVIDER_KEY_STORAGE_KEY),
      )
      .toBe('sk-or-fake-a11y-key');
    await settingsDialog.getByRole('button', { name: 'Close settings' }).click();
    await settingsDialog.waitFor({ state: 'hidden' });

    // Open the floating AI panel and drive one turn to render a draft card.
    await page.locator('[data-panel-trigger="ai"]').click();
    await page.locator('.editor-ai-panel').waitFor({ state: 'visible' });
    const composer = page.getByLabel('Message the AI assistant');
    await composer.fill('Delete that node.');
    await page.getByRole('button', { name: 'Send message' }).click();

    const draftCard = page.locator('[data-ui="ai-draft-diff-card"]');
    await draftCard.waitFor({ state: 'visible' });
    // Confirm the destructive treatment is present so the scan covers it.
    await draftCard.locator('[data-ui="ai-draft-destructive-badge"]').waitFor({ state: 'visible' });

    const accessibilityScanResults = await analyzeWithRetry(
      () => new AxeBuilder({ page: page as Page }).include('.editor-ai-panel'),
      page,
    );

    await expectNoViolations(accessibilityScanResults);
  }, 45_000);
});
