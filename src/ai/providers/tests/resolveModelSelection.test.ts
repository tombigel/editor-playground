import { describe, expect, it } from 'vitest';
import {
  AUTO_MODEL_ID,
  FLOOR_MODEL_SENTINEL,
  FREE_MODEL_SENTINEL,
  getFloorCuratedModel,
  getFreeCuratedModel,
  getModelsInAscendingPriceOrder,
} from '../curatedModels';
import { resolveModelSelection, withFloorSuffix } from '../resolveModelSelection';

describe('resolveModelSelection', () => {
  it('resolves the Free sentinel to the curated free model without provider-floor routing', () => {
    expect(resolveModelSelection(FREE_MODEL_SENTINEL)).toEqual({
      kind: 'single',
      modelId: getFreeCuratedModel()?.id,
      applyFloorSuffix: false,
    });
  });

  it('resolves the Floor sentinel to the cheapest paid curated model with provider-floor routing', () => {
    expect(resolveModelSelection(FLOOR_MODEL_SENTINEL)).toEqual({
      kind: 'single',
      modelId: getFloorCuratedModel()?.id,
      applyFloorSuffix: true,
    });
  });

  it('resolves Auto to every curated candidate in ascending price order', () => {
    expect(resolveModelSelection(AUTO_MODEL_ID)).toEqual({
      kind: 'auto-fallback',
      candidateModelIds: getModelsInAscendingPriceOrder().map((model) => model.id),
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
