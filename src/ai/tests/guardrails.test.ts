import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_TOOL_MANIFEST } from '../../api/ai/toolManifest';
import {
  MAX_COMMANDS_PER_BATCH,
  createRateLimiter,
  createSessionTokenBudget,
  isBatchSizeAllowed,
  isToolAllowlisted,
} from '../guardrails';

describe('isToolAllowlisted', () => {
  it('returns true for every real tool name in the manifest', () => {
    for (const tool of AI_TOOL_MANIFEST) {
      expect(isToolAllowlisted(tool.name)).toBe(true);
    }
  });

  it('returns false for a made-up tool name', () => {
    expect(isToolAllowlisted('deleteEverything')).toBe(false);
    expect(isToolAllowlisted('')).toBe(false);
    expect(isToolAllowlisted('getDocumentTree ')).toBe(false);
  });
});

describe('isBatchSizeAllowed', () => {
  it('allows batches at or below the limit', () => {
    expect(isBatchSizeAllowed(0)).toBe(true);
    expect(isBatchSizeAllowed(MAX_COMMANDS_PER_BATCH)).toBe(true);
  });

  it('rejects batches over the limit', () => {
    expect(isBatchSizeAllowed(MAX_COMMANDS_PER_BATCH + 1)).toBe(false);
  });
});

describe('createSessionTokenBudget', () => {
  it('allows repeated consumption within budget', () => {
    const budget = createSessionTokenBudget(100);
    expect(budget.consume(30)).toBe(true);
    expect(budget.consume(30)).toBe(true);
    expect(budget.remaining()).toBe(40);
  });

  it('returns false once the limit would be exceeded and does not decrement further', () => {
    const budget = createSessionTokenBudget(100);
    expect(budget.consume(80)).toBe(true);
    expect(budget.consume(30)).toBe(false);
    // The rejected consume must not have decremented the budget.
    expect(budget.remaining()).toBe(20);
    // Further attempts over the limit keep returning false and never go negative.
    expect(budget.consume(30)).toBe(false);
    expect(budget.remaining()).toBe(20);
    // A consume that still fits is still honored.
    expect(budget.consume(20)).toBe(true);
    expect(budget.remaining()).toBe(0);
    expect(budget.consume(1)).toBe(false);
    expect(budget.remaining()).toBe(0);
  });
});

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to maxCalls within the window then rejects', () => {
    const limiter = createRateLimiter({ maxCalls: 3, windowMs: 1000 });
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it('replenishes as the sliding window advances', () => {
    const limiter = createRateLimiter({ maxCalls: 2, windowMs: 1000 });
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);

    // Advance past the window so earlier timestamps age out.
    vi.advanceTimersByTime(1001);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });
});
