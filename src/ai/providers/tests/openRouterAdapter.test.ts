import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiToolDefinition } from '../../../api/ai/types';
import type { ConversationMessage, StreamEvent } from '../../types/index';
import { createOpenRouterAdapter } from '../openRouterAdapter';

/**
 * Builds a fake `fetch` `Response` whose body is a `ReadableStream` emitting
 * the given raw SSE text chunks. Mirrors the `vi.stubGlobal('fetch', ...)`
 * convention used in `src/fonts/tests/googleFonts.test.ts`, adapted for a
 * streaming body rather than a JSON response.
 */
function makeSseResponse(chunks: string[], options: { ok?: boolean; status?: number; statusText?: string } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    body,
    text: () => Promise.resolve(''),
  } as unknown as Response;
}

function sseLine(dataObject: unknown): string {
  return `data: ${JSON.stringify(dataObject)}\n\n`;
}

const testMessages: ConversationMessage[] = [
  { id: 'm1', role: 'user', content: 'hello', createdAt: 0 },
];

const testMessagesWithSystemPrompt: ConversationMessage[] = [
  { id: 's1', role: 'system', content: 'system instructions', createdAt: 0 },
  { id: 'm1', role: 'user', content: 'hello', createdAt: 1 },
];

const testTools: AiToolDefinition[] = [
  { name: 'getDocumentTree', description: 'Returns the tree.', kind: 'query', parameters: {} },
];

async function collectEvents(iterable: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of iterable) {
    events.push(event);
  }
  return events;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createOpenRouterAdapter / streamChat', () => {
  it('sends an Authorization header and OpenAI-compatible body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeSseResponse(['data: [DONE]\n\n']));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-4.5');
    await collectEvents(adapter.streamChat(testMessages, testTools));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-key' });

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('anthropic/claude-sonnet-4.5');
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([{ role: 'user', content: 'hello' }]);
    expect(body.tools).toEqual([
      { type: 'function', function: { name: 'getDocumentTree', description: 'Returns the tree.', parameters: {} } },
    ]);
  });

  it('leaves the system message content as a plain string when prompt caching is disabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeSseResponse(['data: [DONE]\n\n']));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-5');
    await collectEvents(adapter.streamChat(testMessagesWithSystemPrompt, []));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual([
      { role: 'system', content: 'system instructions' },
      { role: 'user', content: 'hello' },
    ]);
  });

  it('wraps only the system message with cache_control when prompt caching is enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeSseResponse(['data: [DONE]\n\n']));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-5', {
      cacheSystemPrompt: true,
    });
    await collectEvents(adapter.streamChat(testMessagesWithSystemPrompt, []));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual([
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: 'system instructions',
            cache_control: { type: 'ephemeral' },
          },
        ],
      },
      { role: 'user', content: 'hello' },
    ]);
  });

  it('produces text-delta events followed by message-complete for a text-only stream', async () => {
    const chunks = [
      sseLine({ choices: [{ delta: { content: 'Hello' } }] }),
      sseLine({ choices: [{ delta: { content: ', world' } }] }),
      sseLine({ choices: [{ delta: {}, finish_reason: 'stop' }] }),
      'data: [DONE]\n\n',
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseResponse(chunks)));

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-4.5');
    const events = await collectEvents(adapter.streamChat(testMessages, []));

    expect(events).toEqual([
      { type: 'text-delta', delta: 'Hello' },
      { type: 'text-delta', delta: ', world' },
      { type: 'message-complete' },
    ]);
  });

  it('accumulates streamed tool-call fragments into tool-call-start/delta/complete', async () => {
    const chunks = [
      sseLine({
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'getSelection', arguments: '' } }],
            },
          },
        ],
      }),
      sseLine({
        choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"nod' } }] } }],
      }),
      sseLine({
        choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'eId":"n1"}' } }] } }],
      }),
      sseLine({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
      'data: [DONE]\n\n',
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseResponse(chunks)));

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-4.5');
    const events = await collectEvents(adapter.streamChat(testMessages, testTools));

    expect(events).toEqual([
      { type: 'tool-call-start', toolCallId: 'call_1', name: 'getSelection' },
      { type: 'tool-call-delta', toolCallId: 'call_1', argumentsDelta: '{"nod' },
      { type: 'tool-call-delta', toolCallId: 'call_1', argumentsDelta: 'eId":"n1"}' },
      { type: 'tool-call-complete', toolCall: { id: 'call_1', name: 'getSelection', arguments: { nodeId: 'n1' } } },
      { type: 'message-complete' },
    ]);
  });

  it('flushes an in-progress tool call at end of stream even without a finish_reason chunk', async () => {
    const chunks = [
      sseLine({
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, id: 'call_2', type: 'function', function: { name: 'getActivePage', arguments: '{}' } }],
            },
          },
        ],
      }),
      'data: [DONE]\n\n',
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseResponse(chunks)));

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-4.5');
    const events = await collectEvents(adapter.streamChat(testMessages, testTools));

    expect(events).toEqual([
      { type: 'tool-call-start', toolCallId: 'call_2', name: 'getActivePage' },
      { type: 'tool-call-delta', toolCallId: 'call_2', argumentsDelta: '{}' },
      { type: 'tool-call-complete', toolCall: { id: 'call_2', name: 'getActivePage', arguments: {} } },
      { type: 'message-complete' },
    ]);
  });

  it('yields a single error StreamEvent on a 401 response, never a thrown exception', async () => {
    const errorResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      body: null,
      text: () => Promise.resolve(JSON.stringify({ error: { message: 'Invalid API key.' } })),
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse));

    const adapter = createOpenRouterAdapter('bad-key', 'anthropic/claude-sonnet-4.5');

    let thrown: unknown;
    let events: StreamEvent[] = [];
    try {
      events = await collectEvents(adapter.streamChat(testMessages, []));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('error');
    expect((events[0] as { message: string }).message).toContain('401');
    expect((events[0] as { message: string }).message).toContain('Invalid API key.');
  });

  it('yields a single error StreamEvent when fetch itself rejects (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-4.5');
    const events = await collectEvents(adapter.streamChat(testMessages, []));

    expect(events).toEqual([{ type: 'error', message: 'Failed to fetch' }]);
  });

  it('yields a cancelled StreamEvent (not error) when aborted before the request settles, and stops iterating', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }),
    );

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-4.5');
    const iterator = adapter.streamChat(testMessages, [], { signal: controller.signal })[Symbol.asyncIterator]();

    const nextPromise = iterator.next();
    controller.abort();
    const result = await nextPromise;

    expect(result.done).toBe(false);
    expect(result.value).toEqual({ type: 'cancelled' });

    const followUp = await iterator.next();
    expect(followUp.done).toBe(true);
  });

  it('yields a cancelled StreamEvent when aborted mid-stream (reader.read rejects), not an error', async () => {
    const controller = new AbortController();
    const encoder = new TextEncoder();
    let pullCount = 0;

    const body = new ReadableStream<Uint8Array>({
      pull(streamController) {
        pullCount += 1;
        if (pullCount === 1) {
          streamController.enqueue(encoder.encode(sseLine({ choices: [{ delta: { content: 'partial' } }] })));
          return;
        }
        controller.abort();
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body,
        text: () => Promise.resolve(''),
      } as unknown as Response),
    );

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-4.5');
    const events = await collectEvents(adapter.streamChat(testMessages, [], { signal: controller.signal }));

    expect(events).toEqual([{ type: 'text-delta', delta: 'partial' }, { type: 'cancelled' }]);
  });

  it('yields an error StreamEvent for a malformed (non-JSON) SSE data chunk without throwing', async () => {
    const chunks = ['data: {not valid json\n\n', 'data: [DONE]\n\n'];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseResponse(chunks)));

    const adapter = createOpenRouterAdapter('test-key', 'anthropic/claude-sonnet-4.5');
    const events = await collectEvents(adapter.streamChat(testMessages, []));

    expect(events[0]?.type).toBe('error');
    expect(events.at(-1)).toEqual({ type: 'message-complete' });
  });
});
