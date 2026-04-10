import { describe, expect, it } from 'vitest';

describe('useEscapeKey', () => {
  it('exports a function', async () => {
    const mod = await import('../useEscapeKey');
    expect(typeof mod.useEscapeKey).toBe('function');
  });
});
