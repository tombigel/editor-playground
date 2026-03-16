import { describe, expect, it } from 'vitest';
import { getTooltipDelayBypassUntil, getTooltipHoverDelay, shouldBypassTooltipDelay } from '../popover';

describe('components/ui/popover', () => {
  it('bypasses the hover delay when a tooltip is visible or still inside the close grace window', () => {
    const now = 1_000;
    const graceUntil = getTooltipDelayBypassUntil(now);

    expect(shouldBypassTooltipDelay(true, now, now)).toBe(true);
    expect(shouldBypassTooltipDelay(false, now + 100, graceUntil)).toBe(true);
    expect(shouldBypassTooltipDelay(false, graceUntil + 1, graceUntil)).toBe(false);
  });

  it('uses the full hover delay only when no tooltip is visible and no close grace period is active', () => {
    const now = 2_000;
    const graceUntil = getTooltipDelayBypassUntil(now);

    expect(getTooltipHoverDelay(true, now, now)).toBe(0);
    expect(getTooltipHoverDelay(false, now + 100, graceUntil)).toBe(0);
    expect(getTooltipHoverDelay(false, graceUntil + 1, graceUntil)).toBe(200);
  });
});
