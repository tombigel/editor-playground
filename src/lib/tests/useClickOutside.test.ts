import { describe, expect, it } from 'vitest';

describe('useClickOutside', () => {
  it('exports a function', async () => {
    const mod = await import('../useClickOutside');
    expect(typeof mod.useClickOutside).toBe('function');
  });
});
