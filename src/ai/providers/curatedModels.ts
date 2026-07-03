/**
 * Curated OpenRouter model allowlist for v1.
 *
 * Per the plan's explicit "no dynamic listing of OpenRouter's full 500+
 * model catalog" scope cut, this is a hardcoded, small list of tool-calling-
 * capable models spanning multiple underlying providers and three cost/value
 * tiers, so a user can pick deliberately rather than guessing from 500+ raw
 * options.
 *
 * Tiers, by price and intended use — not by provider brand:
 * - `free`: $0, best for trying the assistant out; subject to OpenRouter's
 *   free-tier rate limits (typically ~20 req/min, ~200 req/day at time of
 *   writing), so not picked as the default.
 * - `low-cost`: cheap relative to input/output price, but benchmarking close
 *   to frontier quality — the best cost/value tradeoff, and the default tier
 *   for this list.
 * - `good`: top-of-market frontier models, priced accordingly.
 *
 * Selection was deliberately cross-provider and benchmark/price-driven, not
 * defaulted to any single vendor (including this assistant's own model
 * family) — see each entry's price/benchmark note.
 *
 * Model ids were verified live against each model's own openrouter.ai page
 * on 2026-07-03 (not guessed from training data, and not trusted from
 * catalog/collection-page summaries, which have been observed to lag the
 * live per-model pages by a generation).
 *
 * Named exports only.
 */

export type CuratedModelTier = 'free' | 'low-cost' | 'good';

export type CuratedModel = {
  /** Exact OpenRouter model id, e.g. `"z-ai/glm-5.2"`. */
  id: string;
  /** Compact model name for space-constrained display (e.g. the picker's closed trigger). */
  name: string;
  /** Fuller descriptive label (name + a short value/benchmark note) for the picker's open option list. */
  label: string;
  /** Underlying model provider, for grouping/display in the picker. */
  provider: string;
  /** Cost/value tier — see the module doc comment for definitions. */
  tier: CuratedModelTier;
};

export const CURATED_MODELS: CuratedModel[] = [
  {
    id: 'z-ai/glm-5.2',
    name: 'GLM 5.2',
    label: 'GLM 5.2 — near-frontier, $0.93/$3 per 1M',
    provider: 'Z.ai',
    tier: 'low-cost',
  },
  {
    id: 'moonshotai/kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    label: 'Kimi K2 Thinking — trillion-param MoE, $0.60/$2.50 per 1M',
    provider: 'Moonshot AI',
    tier: 'low-cost',
  },
  {
    id: 'openai/gpt-5.4',
    name: 'GPT-5.4',
    label: 'GPT-5.4 — frontier reasoning, $2.50/$15 per 1M',
    provider: 'OpenAI',
    tier: 'good',
  },
  {
    id: 'anthropic/claude-sonnet-5',
    name: 'Claude Sonnet 5',
    label: 'Claude Sonnet 5 — frontier agentic/coding, $2/$10 per 1M',
    provider: 'Anthropic',
    tier: 'good',
  },
  {
    id: 'qwen/qwen3-coder:free',
    name: 'Qwen3 Coder 480B',
    label: 'Qwen3 Coder 480B — free, rate-limited',
    provider: 'Qwen',
    tier: 'free',
  },
];
