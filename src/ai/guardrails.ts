import { AI_TOOL_MANIFEST } from '../api/ai/toolManifest';

/**
 * Security-load-bearing guardrails for the AI orchestration layer.
 *
 * Every limit-hit here is designed to return an explicit signal (a boolean or
 * a reason) to the caller — never a silent drop. The actual "surface this to
 * the user" wiring lands with the UI (Tasks 9-11); these functions simply make
 * silent failure structurally impossible for whoever calls them.
 */

/**
 * Maximum number of commands allowed in a single mutation draft batch. A coarse
 * bound against a model proposing an unreasonably large one-shot edit.
 */
export const MAX_COMMANDS_PER_BATCH = 25;

/**
 * Maximum accepted length of a free-text command value. Re-exported from the
 * API-layer validation module (per its explicit NOTE FOR TASK 6) so the two
 * layers can never silently diverge — this is the single source of truth.
 */
export { MAX_TEXT_VALUE_LENGTH } from '../api/ai/validation';

/**
 * Coarse hardcoded ceiling on tokens consumed within a single conversation
 * session. This is a runaway-loop / cost control, not a billing feature.
 */
export const MAX_TOKENS_PER_SESSION = 100_000;

/**
 * Default rate-limit window for tool-call frequency within a session.
 */
export const DEFAULT_RATE_LIMIT_MAX_CALLS = 30;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

const ALLOWLISTED_TOOL_NAMES = new Set(AI_TOOL_MANIFEST.map((tool) => tool.name));

/**
 * Returns `true` only if `toolName` is a real tool in `AI_TOOL_MANIFEST`.
 * Anything not in the manifest (including model-hallucinated tool names) is
 * rejected.
 */
export function isToolAllowlisted(toolName: string): boolean {
  return ALLOWLISTED_TOOL_NAMES.has(toolName);
}

/**
 * Returns `true` if a batch of the given size is within
 * {@link MAX_COMMANDS_PER_BATCH}. Exposed so batch-size limiting is a checkable
 * operation, not just an unused constant.
 */
export function isBatchSizeAllowed(commandCount: number): boolean {
  return commandCount >= 0 && commandCount <= MAX_COMMANDS_PER_BATCH;
}

/**
 * A session-scoped token budget. `consume` returns `false` (and does not
 * decrement further) once the limit would be exceeded, so callers can check the
 * return value and stop issuing requests. Never silently succeeds past the
 * limit and never goes negative.
 */
export type SessionTokenBudget = {
  consume(tokens: number): boolean;
  remaining(): number;
};

export function createSessionTokenBudget(limit: number = MAX_TOKENS_PER_SESSION): SessionTokenBudget {
  let consumed = 0;

  return {
    consume(tokens: number): boolean {
      const amount = Math.max(0, tokens);
      if (consumed + amount > limit) {
        return false;
      }
      consumed += amount;
      return true;
    },
    remaining(): number {
      return Math.max(0, limit - consumed);
    },
  };
}

/**
 * A simple in-memory sliding-window rate limiter for bounding tool-call
 * frequency within a session. `tryAcquire` returns `false` when the window is
 * saturated — an explicit signal, never a silent drop.
 */
export type RateLimiter = {
  tryAcquire(): boolean;
};

export function createRateLimiter(options: { maxCalls: number; windowMs: number }): RateLimiter {
  const { maxCalls, windowMs } = options;
  const timestamps: number[] = [];

  return {
    tryAcquire(): boolean {
      const now = Date.now();
      const windowStart = now - windowMs;
      // Drop timestamps that have aged out of the sliding window.
      while (timestamps.length > 0 && timestamps[0] <= windowStart) {
        timestamps.shift();
      }
      if (timestamps.length >= maxCalls) {
        return false;
      }
      timestamps.push(now);
      return true;
    },
  };
}
