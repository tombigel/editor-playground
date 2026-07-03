import { describe, expect, it } from 'vitest';
import {
  AUTO_MODEL_ID,
  FLOOR_MODEL_SENTINEL,
  FREE_MODEL_SENTINEL,
} from '../curatedModels';
import {
  OPENROUTER_AUTO_MODEL_ID,
  OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF,
  OPENROUTER_FREE_MODEL_ID,
  resolveModelSelection,
  withFloorSuffix,
} from '../resolveModelSelection';

describe('resolveModelSelection', () => {
  it('resolves Free to OpenRouter’s free models router', () => {
    expect(resolveModelSelection(FREE_MODEL_SENTINEL)).toEqual({
      kind: 'single',
      modelId: OPENROUTER_FREE_MODEL_ID,
      applyFloorSuffix: false,
    });
  });

  it('resolves Floor to OpenRouter Auto Router biased toward cost', () => {
    expect(resolveModelSelection(FLOOR_MODEL_SENTINEL)).toEqual({
      kind: 'single',
      modelId: OPENROUTER_AUTO_MODEL_ID,
      applyFloorSuffix: false,
      adapterOptions: { autoRouterCostQualityTradeoff: OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF },
    });
  });

  it('resolves Auto to OpenRouter’s auto router', () => {
    expect(resolveModelSelection(AUTO_MODEL_ID)).toEqual({
      kind: 'single',
      modelId: OPENROUTER_AUTO_MODEL_ID,
      applyFloorSuffix: false,
    });
  });

  it('passes through curated and custom model ids as single selections', () => {
    expect(resolveModelSelection('openai/gpt-5.4')).toEqual({
      kind: 'single',
      modelId: 'openai/gpt-5.4',
      applyFloorSuffix: false,
    });
    expect(resolveModelSelection('mistralai/mistral-large')).toEqual({
      kind: 'single',
      modelId: 'mistralai/mistral-large',
      applyFloorSuffix: false,
    });
  });
});

describe('withFloorSuffix', () => {
  it('appends the floor suffix idempotently', () => {
    expect(withFloorSuffix('moonshotai/kimi-k2-thinking')).toBe('moonshotai/kimi-k2-thinking:floor');
    expect(withFloorSuffix('moonshotai/kimi-k2-thinking:floor')).toBe('moonshotai/kimi-k2-thinking:floor');
  });
});
