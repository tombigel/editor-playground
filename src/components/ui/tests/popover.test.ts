import { describe, expect, it } from 'vitest';
import { getTooltipHoverDelay, shouldBypassTooltipDelay } from '../popover';

describe('components/ui/popover', () => {
  it('bypasses the hover delay only when a tooltip is already visible', () => {
    expect(shouldBypassTooltipDelay(true)).toBe(true);
    expect(shouldBypassTooltipDelay(false)).toBe(false);
  });

  it('uses the full hover delay whenever no tooltip is currently visible', () => {
    expect(getTooltipHoverDelay(true)).toBe(0);
    expect(getTooltipHoverDelay(false)).toBe(200);
  });
});
