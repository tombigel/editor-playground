import { describe, expect, it } from 'vitest';
import {
  AUTO_GROUP_SENTINELS,
  AUTO_MODEL_ID,
  CURATED_MODELS,
  FLOOR_MODEL_SENTINEL,
  FREE_MODEL_SENTINEL,
  getFreeCuratedModel,
  isAutoGroupSentinel,
} from '../curatedModels';

describe('CURATED_MODELS', () => {
  it('has between 3 and 6 entries', () => {
    expect(CURATED_MODELS.length).toBeGreaterThanOrEqual(3);
    expect(CURATED_MODELS.length).toBeLessThanOrEqual(6);
  });

  it('has a non-empty id, label, and provider for every entry', () => {
    for (const model of CURATED_MODELS) {
      expect(model.id.length).toBeGreaterThan(0);
      expect(model.label.length).toBeGreaterThan(0);
      expect(model.provider.length).toBeGreaterThan(0);
    }
  });

  it('has well-formed OpenRouter model id strings (provider/model-name)', () => {
    for (const model of CURATED_MODELS) {
      expect(model.id).toContain('/');
      const [providerSlug, ...rest] = model.id.split('/');
      expect(providerSlug.length).toBeGreaterThan(0);
      expect(rest.join('/').length).toBeGreaterThan(0);
    }
  });

  it('spans at least two distinct underlying providers', () => {
    const providers = new Set(CURATED_MODELS.map((model) => model.provider));
    expect(providers.size).toBeGreaterThanOrEqual(2);
  });

  it('has unique model ids', () => {
    const ids = new Set(CURATED_MODELS.map((model) => model.id));
    expect(ids.size).toBe(CURATED_MODELS.length);
  });

  it('has a valid tier for every entry', () => {
    for (const model of CURATED_MODELS) {
      expect(['free', 'low-cost', 'good']).toContain(model.tier);
      expect(model.inputPricePerMillion).toBeGreaterThanOrEqual(0);
      expect(model.outputPricePerMillion).toBeGreaterThanOrEqual(0);
    }
  });

  it('includes at least one model in each of the three tiers', () => {
    const tiers = new Set(CURATED_MODELS.map((model) => model.tier));
    expect(tiers).toEqual(new Set(['free', 'low-cost', 'good']));
  });

  it('does not default to a single provider across the good/low-cost tiers', () => {
    const nonFreeProviders = new Set(
      CURATED_MODELS.filter((model) => model.tier !== 'free').map((model) => model.provider),
    );
    expect(nonFreeProviders.size).toBeGreaterThanOrEqual(3);
  });

  it('exports three unique automatic sentinels', () => {
    expect(AUTO_GROUP_SENTINELS).toEqual([FREE_MODEL_SENTINEL, FLOOR_MODEL_SENTINEL, AUTO_MODEL_ID]);
    expect(new Set(AUTO_GROUP_SENTINELS).size).toBe(3);
    expect(isAutoGroupSentinel(FREE_MODEL_SENTINEL)).toBe(true);
    expect(isAutoGroupSentinel(FLOOR_MODEL_SENTINEL)).toBe(true);
    expect(isAutoGroupSentinel(AUTO_MODEL_ID)).toBe(true);
    expect(isAutoGroupSentinel('openai/gpt-5.4')).toBe(false);
  });

  it('finds curated free models', () => {
    const freeModel = getFreeCuratedModel();
    const freeModels = CURATED_MODELS.filter((model) => model.tier === 'free');

    expect(freeModel).toBeDefined();
    expect(freeModel?.tier).toBe('free');
    expect(freeModels.map((model) => model.id)).toContain('qwen/qwen3-next-80b-a3b-instruct:free');
    expect(freeModels.every((model) => model.inputPricePerMillion === 0)).toBe(true);
    expect(freeModels.every((model) => model.outputPricePerMillion === 0)).toBe(true);
  });

});
