import { describe, expect, it } from 'vitest';
import { CURATED_MODELS } from '../curatedModels';

describe('CURATED_MODELS', () => {
  it('has between 3 and 5 entries', () => {
    expect(CURATED_MODELS.length).toBeGreaterThanOrEqual(3);
    expect(CURATED_MODELS.length).toBeLessThanOrEqual(5);
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
});
