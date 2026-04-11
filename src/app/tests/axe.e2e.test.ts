import AxeBuilder from '@axe-core/playwright';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { startViteE2EServer, type StartedServer } from '../../stage/tests/e2eServer';

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

    await page.goto(server.url);
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

    await page.goto(server.url);
    await page.locator('.stage-canvas').waitFor({ state: 'visible' });

    const accessibilityScanResults = await analyzeWithRetry(
      () => new AxeBuilder({ page }).include('.stage-canvas'),
      page,
    );

    await expectNoViolations(accessibilityScanResults);
  }, 30_000);
});
