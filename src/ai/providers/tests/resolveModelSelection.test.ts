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
} from '../resolveModelSelection';

describe('resolveModelSelection', () => {
  it('resolves Free to OpenRouter free models router', () => {
    expect(resolveModelSelection(FREE_MODEL_SENTINEL)).toEqual({
      modelId: OPENROUTER_FREE_MODEL_ID,
    });
  });

  it('resolves Floor to OpenRouter Auto Router biased toward cost', () => {
    expect(resolveModelSelection(FLOOR_MODEL_SENTINEL)).toEqual({
      modelId: OPENROUTER_AUTO_MODEL_ID,
      adapterOptions: { autoRouterCostQualityTradeoff: OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF },
    });
  });

  it('resolves Auto to OpenRouter auto router', () => {
    expect(resolveModelSelection(AUTO_MODEL_ID)).toEqual({
      modelId: OPENROUTER_AUTO_MODEL_ID,
    });
  });

  it('passes through curated and custom model ids', () => {
    expect(resolveModelSelection('openai/gpt-5.4')).toEqual({
      modelId: 'openai/gpt-5.4',
    });
    expect(resolveModelSelection('mistralai/mistral-large')).toEqual({
      modelId: 'mistralai/mistral-large',
    });
  });
});
