/**
 * Curated OpenRouter model allowlist for v1.
 *
 * Per the plan's explicit "no dynamic listing of OpenRouter's full 500+
 * model catalog" scope cut, this is a hardcoded, small (3-5 entry) list of
 * tool-calling-capable models spanning multiple underlying providers, so a
 * user always has a working alternative if one provider has an outage or
 * rate-limits them.
 *
 * Model ids were verified live against openrouter.ai model pages on
 * 2026-07-03 (not guessed from training data) — see Task 8's report for the
 * exact pages checked. Each id is the exact string OpenRouter expects in the
 * `model` field of a chat completion request.
 *
 * Named exports only.
 */

export type CuratedModel = {
  /** Exact OpenRouter model id, e.g. `"anthropic/claude-sonnet-4.5"`. */
  id: string;
  /** Human-readable label for the Settings model picker (Task 11). */
  label: string;
  /** Underlying model provider, for grouping/display in the picker. */
  provider: string;
};

export const CURATED_MODELS: CuratedModel[] = [
  {
    id: 'anthropic/claude-sonnet-4.5',
    label: 'Claude Sonnet 4.5 (recommended default)',
    provider: 'Anthropic',
  },
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o mini (fast, low-cost)',
    provider: 'OpenAI',
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (fast, alternate provider)',
    provider: 'Google',
  },
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o (strong general-purpose, alternate provider)',
    provider: 'OpenAI',
  },
];
