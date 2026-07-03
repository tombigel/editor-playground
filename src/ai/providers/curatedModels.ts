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
 * 2026-07-03 (not guessed from training data). An initial pass picked ids
 * from a general OpenRouter catalog page, but those ids turned out to be a
 * model generation behind the live catalog (a WebFetch summarization gap,
 * not a fabrication) — every id below was re-confirmed by fetching that
 * exact model's own OpenRouter page directly and reading its stated model id
 * and tool/function-calling support back out of the page content. Each id is
 * the exact string OpenRouter expects in the `model` field of a chat
 * completion request.
 *
 * Named exports only.
 */

export type CuratedModel = {
  /** Exact OpenRouter model id, e.g. `"anthropic/claude-sonnet-5"`. */
  id: string;
  /** Human-readable label for the Settings model picker (Task 11). */
  label: string;
  /** Underlying model provider, for grouping/display in the picker. */
  provider: string;
};

export const CURATED_MODELS: CuratedModel[] = [
  {
    id: 'anthropic/claude-sonnet-5',
    label: 'Claude Sonnet 5 (recommended default)',
    provider: 'Anthropic',
  },
  {
    id: 'openai/gpt-5-mini',
    label: 'GPT-5 Mini (fast, low-cost)',
    provider: 'OpenAI',
  },
  {
    id: 'google/gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview (fast, alternate provider)',
    provider: 'Google',
  },
];
