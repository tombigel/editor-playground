import { chromium, type Browser, type BrowserContext, type Page, type Route } from 'playwright';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { startViteE2EServer, type StartedServer } from '../../stage/tests/e2eServer';
import {
  AUTO_MODEL_ID,
  FLOOR_MODEL_SENTINEL,
  FREE_MODEL_SENTINEL,
  getFloorCuratedModel,
  getFreeCuratedModel,
  getModelsInAscendingPriceOrder,
} from '../../ai/providers/curatedModels';

/**
 * End-to-end proof of the agentic-interface feature's core guarantee
 * (Task 12): chat → propose → diff → approve → single undo step, driven
 * through a real browser against a real dev server.
 *
 * The unit tests (`AiPanel.test.tsx`, `AiDraftDiffCard.test.tsx`,
 * `AiSettingsSection.test.tsx`) already cover the per-layer logic — the
 * streaming loop, tool routing, draft summarisation, stale-batch rejection,
 * and settings persistence — via `renderToStaticMarkup`/direct calls. This
 * file instead proves the *wiring*: that a mocked OpenRouter SSE response,
 * flowing through the real `openRouterAdapter` → `useAiChat` → `routeToolCall`
 * → `conversationStore` → `AiDraftDiffCard` → `editorApi.applyAiCommands`
 * chain, actually renders a draft, leaves the stage untouched until Approve,
 * then commits exactly one undoable history entry that a single Undo reverts.
 *
 * The OpenRouter network call is intercepted with Playwright's `page.route`
 * against `openrouter.ai`; no real key or network access is used. The canned
 * body is an OpenAI-compatible SSE stream carrying one text-delta sequence and
 * one `setNodeVisibility` tool-call sequence targeting a real node id read
 * from the live document at test time (so the batch validates at approval).
 */

const AI_PROVIDER_KEY_STORAGE_KEY = 'editor-playground.ai-provider-key.v1';
const AI_CONVERSATION_STORAGE_KEY = 'editor-playground.ai-conversation.v1';

/**
 * Builds an OpenAI-compatible SSE stream body: some assistant text deltas
 * followed by a single tool-call for `setNodeVisibility` on `nodeId`. The
 * tool call's `name`/`id` arrive on the first delta and its `arguments` are
 * split across two deltas to exercise the adapter's fragment accumulation,
 * mirroring how OpenRouter actually streams tool calls.
 */
function buildToolCallSseBody(nodeId: string, visible: boolean): string {
  const args = JSON.stringify({ nodeId, visible });
  const argsHead = args.slice(0, Math.ceil(args.length / 2));
  const argsTail = args.slice(argsHead.length);

  const chunks = [
    { choices: [{ index: 0, delta: { role: 'assistant', content: '' } }] },
    { choices: [{ index: 0, delta: { content: 'Sure — ' } }] },
    { choices: [{ index: 0, delta: { content: "I'll hide that node for you." } }] },
    {
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_hide_1',
                type: 'function',
                function: { name: 'setNodeVisibility', arguments: argsHead },
              },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          index: 0,
          delta: { tool_calls: [{ index: 0, function: { arguments: argsTail } }] },
        },
      ],
    },
    { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
  ];

  return `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('')}data: [DONE]\n\n`;
}

function buildTextSseBody(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
}

/**
 * Registers a `page.route` interception for OpenRouter's chat-completions
 * endpoint that replies with `sseBody`. Kept as a helper so each test can swap
 * the canned response body (and re-register) without touching the rest of the
 * flow.
 */
async function mockOpenRouter(page: Page, sseBody: string) {
  await page.route('**/openrouter.ai/api/v1/chat/completions', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody,
    });
  });
}

async function persistAiConversationSelection(
  page: Page,
  selectedModelId: string,
  promptCachingEnabled = false,
) {
  await page.evaluate(
    ({ key, selectedModelId: modelId, promptCachingEnabled: cacheEnabled }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          messages: [],
          selectedModelId: modelId,
          promptCachingEnabled: cacheEnabled,
        }),
      );
    },
    { key: AI_CONVERSATION_STORAGE_KEY, selectedModelId, promptCachingEnabled },
  );
}

async function expectEditorReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('toolbar', { name: 'Editor toolbar' }).waitFor({ state: 'visible' });
  await page.locator('.stage-shell').waitFor({ state: 'visible' });
}

/**
 * The stable starter-document text leaf both this suite and the app smoke test
 * key off. It is a real, selectable, deletable, visibility-togglable child
 * node (never the site root), which makes it a valid `setNodeVisibility` /
 * delete target across every flow below.
 */
const TARGET_NODE_TEXT = 'Plan sticky behavior before building scroll-driven animations';

/**
 * Reads the live `data-node-id` of the starter text leaf from the stage
 * canvas, so the mocked tool call targets a node that actually exists in the
 * current document (and therefore validates at approval time) rather than a
 * hardcoded id that could drift.
 */
async function readTargetNode(page: Page): Promise<{ nodeId: string }> {
  // Target the text LEAF itself (`.stage-leaf[data-node-id]`), not an
  // ancestor section wrapper that also `hasText` the copy — the leaf is a
  // small, safely-deletable node whose element detaches on delete.
  const target = page
    .locator('.stage-canvas .stage-leaf[data-node-id]', { hasText: TARGET_NODE_TEXT })
    .first();
  await target.waitFor({ state: 'visible' });
  const nodeId = await target.getAttribute('data-node-id');
  if (!nodeId) {
    throw new Error('Expected the starter text leaf to expose a data-node-id');
  }
  return { nodeId };
}

/**
 * Drives the real Settings → AI Assistant section UI to persist a (fake)
 * OpenRouter key, so the AI panel builds a real `openRouterAdapter` from it —
 * exactly as it would for a user — rather than relying on a test-only adapter
 * override. The mocked `page.route` intercepts the actual network call.
 */
async function enterFakeApiKey(page: Page) {
  // Open Settings the way a user does — through the menubar — then jump to the
  // AI Assistant section via its nav item. (The `panel` URL param does not
  // recognise `settings`, so a deep-link goto can't open this dialog.)
  await page.locator('[data-ui="menubar-trigger"][data-menu-id="settings"]').click();
  await page.getByRole('menuitem', { name: 'Open Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator('[data-settings-nav="ai"]').click();

  const keyInput = dialog.getByLabel('OpenRouter API key');
  await keyInput.waitFor({ state: 'visible' });
  await keyInput.fill('sk-or-fake-e2e-key');
  // The section persists on change; confirm it reached the storage contract
  // the AI panel reads from before we close Settings.
  await expect
    .poll(async () =>
      page.evaluate((key) => window.localStorage.getItem(key), AI_PROVIDER_KEY_STORAGE_KEY),
    )
    .toBe('sk-or-fake-e2e-key');

  // Close Settings so the AI panel's rail trigger is unobstructed.
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  await dialog.waitFor({ state: 'hidden' });
}

/** Opens the floating AI panel via its left-rail Sparkles trigger. */
async function openAiPanel(page: Page) {
  const trigger = page.locator('[data-panel-trigger="ai"]');
  await trigger.waitFor({ state: 'visible' });
  await trigger.click();
  await page.locator('.editor-ai-panel').waitFor({ state: 'visible' });
}

/** Sends a message through the AI composer. */
async function sendMessage(page: Page, text: string) {
  const composer = page.getByLabel('Message the AI assistant');
  await composer.waitFor({ state: 'visible' });
  await composer.fill(text);
  await page.getByRole('button', { name: 'Send message' }).click();
}

describe('ai assistant draft/approve/undo e2e', () => {
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

  async function newAiPage() {
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

  it('resolves Free, Floor, custom, and prompt-caching selections at send time', async () => {
    const cases = [
      {
        name: 'Free',
        selection: FREE_MODEL_SENTINEL,
        expectedModel: getFreeCuratedModel()?.id,
        promptCachingEnabled: false,
      },
      {
        name: 'Floor',
        selection: FLOOR_MODEL_SENTINEL,
        expectedModel: `${getFloorCuratedModel()?.id}:floor`,
        promptCachingEnabled: false,
      },
      {
        name: 'Custom',
        selection: 'mistralai/mistral-large',
        expectedModel: 'mistralai/mistral-large',
        promptCachingEnabled: false,
      },
      {
        name: 'Prompt caching',
        selection: 'anthropic/claude-sonnet-5',
        expectedModel: 'anthropic/claude-sonnet-5',
        promptCachingEnabled: true,
      },
    ];

    for (const testCase of cases) {
      const aiPage = await newAiPage();
      const requestBodies: Array<Record<string, unknown>> = [];
      await aiPage.route('**/openrouter.ai/api/v1/chat/completions', async (route: Route) => {
        requestBodies.push(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: buildTextSseBody(`ok ${testCase.name}`),
        });
      });

      await enterFakeApiKey(aiPage);
      await persistAiConversationSelection(
        aiPage,
        testCase.selection,
        testCase.promptCachingEnabled,
      );
      await openAiPanel(aiPage);
      await sendMessage(aiPage, `Say hello for ${testCase.name}.`);

      await aiPage
        .locator('.editor-ai-panel [data-ai-role="assistant"]:not([data-ai-streaming="true"])')
        .filter({ hasText: `ok ${testCase.name}` })
        .waitFor({ state: 'visible' });

      expect(requestBodies).toHaveLength(1);
      expect(requestBodies[0]?.model).toBe(testCase.expectedModel);
      const messages = requestBodies[0]?.messages as Array<{ role: string; content: unknown }>;
      expect(messages[0]?.role).toBe('system');
      if (testCase.promptCachingEnabled) {
        expect(messages[0]?.content).toEqual([
          expect.objectContaining({
            type: 'text',
            cache_control: { type: 'ephemeral' },
          }),
        ]);
      } else {
        expect(typeof messages[0]?.content).toBe('string');
      }

      await aiPage.close();
      await context?.close();
      page = null;
      context = null;
    }
  }, 90_000);

  it('Auto retries a retryable failure using the next cheapest model and renders provenance', async () => {
    const aiPage = await newAiPage();
    const requestBodies: Array<Record<string, unknown>> = [];
    let requestCount = 0;
    await aiPage.route('**/openrouter.ai/api/v1/chat/completions', async (route: Route) => {
      requestCount += 1;
      requestBodies.push(route.request().postDataJSON() as Record<string, unknown>);
      if (requestCount === 1) {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Rate limit exceeded' } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: buildTextSseBody('auto recovered'),
      });
    });

    const orderedModels = getModelsInAscendingPriceOrder();
    await enterFakeApiKey(aiPage);
    await persistAiConversationSelection(aiPage, AUTO_MODEL_ID);
    await openAiPanel(aiPage);
    await sendMessage(aiPage, 'Use automatic fallback.');

    const assistantMessage = aiPage
      .locator('.editor-ai-panel [data-ai-role="assistant"]:not([data-ai-streaming="true"])')
      .filter({ hasText: 'auto recovered' });
    await assistantMessage.waitFor({ state: 'visible' });
    expect(await assistantMessage.textContent()).toContain(`Answered by ${orderedModels[1]?.name}`);

    expect(requestBodies).toHaveLength(2);
    expect(requestBodies[0]?.model).toBe(orderedModels[0]?.id);
    expect(requestBodies[1]?.model).toBe(orderedModels[1]?.id);
  }, 45_000);

  it('proposes a mutation as a draft, applies it on Approve as one undoable step, and reverts in a single Undo', async () => {
    const aiPage = await newAiPage();

    // Target a real node so the batch validates against the live document at
    // approval time (not a hardcoded id that might not exist).
    const { nodeId } = await readTargetNode(aiPage);
    const targetNode = aiPage.locator(`.stage-canvas .stage-leaf[data-node-id="${nodeId}"]`).first();

    // Pre-condition: the node is not hidden, and there is nothing to undo yet.
    expect(await targetNode.getAttribute('data-hidden')).toBe('false');
    const undoButton = aiPage.getByRole('button', { name: 'Undo', exact: true });
    expect(await undoButton.isDisabled()).toBe(true);

    await mockOpenRouter(aiPage, buildToolCallSseBody(nodeId, false));
    await enterFakeApiKey(aiPage);

    await openAiPanel(aiPage);
    await sendMessage(aiPage, 'Hide the first node on the page.');

    // The mutation renders as a draft diff card BEFORE the document changes.
    const draftCard = aiPage.locator('[data-ui="ai-draft-diff-card"]');
    await draftCard.waitFor({ state: 'visible' });
    expect(await draftCard.textContent()).toContain('Hide node');

    // The streamed assistant text is persisted in the transcript (the draft
    // card being visible means streaming finished, so the only remaining
    // assistant bubble is the persisted message, not the "Thinking…" stream).
    const assistantMessage = aiPage
      .locator('.editor-ai-panel [data-ai-role="assistant"]:not([data-ai-streaming="true"])')
      .last();
    await assistantMessage.waitFor({ state: 'visible' });
    expect(await assistantMessage.textContent()).toContain('hide that node');
    // Critical: stage is unchanged and history is still empty at draft time.
    expect(await targetNode.getAttribute('data-hidden')).toBe('false');
    expect(await undoButton.isDisabled()).toBe(true);

    // Approve → the document updates on stage.
    await draftCard.getByRole('button', { name: 'Approve proposed change' }).click();
    await expect.poll(async () => targetNode.getAttribute('data-hidden')).toBe('true');
    // The draft card is cleared once committed.
    await draftCard.waitFor({ state: 'hidden' });

    // Exactly one undoable entry exists: a single Undo fully reverts the node,
    // and the Undo control returns to disabled (bottom of the stack) — proving
    // the multi-nothing batch landed as one entry, not a partial/second one.
    await expect.poll(async () => undoButton.isDisabled()).toBe(false);
    await undoButton.click();
    await expect.poll(async () => targetNode.getAttribute('data-hidden')).toBe('false');
    await expect.poll(async () => undoButton.isDisabled()).toBe(true);
  }, 45_000);

  it('applies nothing and creates no history entry when a proposal is rejected', async () => {
    const aiPage = await newAiPage();

    const { nodeId } = await readTargetNode(aiPage);
    const targetNode = aiPage.locator(`.stage-canvas .stage-leaf[data-node-id="${nodeId}"]`).first();
    const undoButton = aiPage.getByRole('button', { name: 'Undo', exact: true });

    expect(await targetNode.getAttribute('data-hidden')).toBe('false');
    expect(await undoButton.isDisabled()).toBe(true);

    await mockOpenRouter(aiPage, buildToolCallSseBody(nodeId, false));
    await enterFakeApiKey(aiPage);

    await openAiPanel(aiPage);
    await sendMessage(aiPage, 'Hide the first node on the page.');

    const draftCard = aiPage.locator('[data-ui="ai-draft-diff-card"]');
    await draftCard.waitFor({ state: 'visible' });

    // Reject → the draft is dismissed, nothing is applied, and there is still
    // nothing to undo.
    await draftCard.getByRole('button', { name: 'Reject proposed change' }).click();
    await draftCard.waitFor({ state: 'hidden' });

    expect(await targetNode.getAttribute('data-hidden')).toBe('false');
    expect(await undoButton.isDisabled()).toBe(true);
  }, 45_000);

  it('surfaces a stale-draft error instead of applying when the target node is deleted before Approve', async () => {
    const aiPage = await newAiPage();

    const { nodeId } = await readTargetNode(aiPage);
    const targetNode = aiPage.locator(`.stage-canvas .stage-leaf[data-node-id="${nodeId}"]`).first();
    const undoButton = aiPage.getByRole('button', { name: 'Undo', exact: true });

    await mockOpenRouter(aiPage, buildToolCallSseBody(nodeId, false));
    await enterFakeApiKey(aiPage);

    await openAiPanel(aiPage);
    await sendMessage(aiPage, 'Hide the first node on the page.');

    const draftCard = aiPage.locator('[data-ui="ai-draft-diff-card"]');
    await draftCard.waitFor({ state: 'visible' });

    // Invalidate the draft out-of-band: select the target node on stage and
    // delete it, so the batch no longer validates against the current document.
    await targetNode.click();
    await aiPage.locator('.editor-inspector-shell').waitFor({ state: 'visible' });
    await aiPage.keyboard.press('Backspace');
    await targetNode.waitFor({ state: 'detached' });
    // Deletion is itself one undoable entry — the point below is that Approve
    // adds no further entry, not that history is empty.
    await expect.poll(async () => undoButton.isDisabled()).toBe(false);

    // Approve now: the batch is stale. It must surface the stale-state message
    // rather than silently no-op or partially apply.
    await draftCard.getByRole('button', { name: 'Approve proposed change' }).click();
    const staleError = aiPage.locator('[data-ui="ai-draft-stale-error"]');
    await staleError.waitFor({ state: 'visible' });
    expect(await staleError.textContent()).toContain("out of date");

    // A single Undo reverts only the deletion (history depth is exactly one:
    // the delete), confirming the stale Approve committed nothing.
    await undoButton.click();
    await aiPage
      .locator(`.stage-canvas [data-node-id="${nodeId}"]`)
      .first()
      .waitFor({ state: 'visible' });
    await expect.poll(async () => undoButton.isDisabled()).toBe(true);
  }, 45_000);
});
