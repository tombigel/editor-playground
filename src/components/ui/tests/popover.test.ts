import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PopoverSurface,
  bringPopoverSurfaceToFront,
  getTooltipDelayBypassUntil,
  getTooltipHoverDelay,
  shouldBypassTooltipDelay,
} from '../popover';

describe('components/ui/popover', () => {
  it('marks closed surfaces hidden so unopened editor popovers do not remain in the accessibility tree', () => {
    const closedMarkup = renderToStaticMarkup(createElement(PopoverSurface, { open: false }, 'Hidden surface'));
    const openMarkup = renderToStaticMarkup(createElement(PopoverSurface, { open: true }, 'Visible surface'));

    expect(closedMarkup).toContain('hidden=""');
    expect(closedMarkup).toContain('aria-hidden="true"');
    expect(closedMarkup).toContain('data-state="closed"');
    expect(openMarkup).toContain('data-state="open"');
    expect(openMarkup).not.toContain('hidden=""');
  });

  it('bypasses the hover delay when a tooltip is visible or still inside the close grace window', () => {
    const now = 1_000;
    const graceUntil = getTooltipDelayBypassUntil(now);

    expect(shouldBypassTooltipDelay(true, now, now)).toBe(true);
    expect(shouldBypassTooltipDelay(false, now + 100, graceUntil)).toBe(true);
    expect(shouldBypassTooltipDelay(false, graceUntil, graceUntil)).toBe(false);
    expect(shouldBypassTooltipDelay(false, graceUntil + 1, graceUntil)).toBe(false);
  });

  it('re-enters an already-open popover to move it to the top layer front', () => {
    const calls: string[] = [];
    const element = {
      matches: () => true,
      hidePopover: () => calls.push('hide'),
      showPopover: () => calls.push('show'),
    };

    bringPopoverSurfaceToFront(element as never);

    expect(calls).toEqual(['hide', 'show']);
  });

  it('uses the full hover delay only when no tooltip is visible and no close grace period is active', () => {
    const now = 2_000;
    const graceUntil = getTooltipDelayBypassUntil(now);

    expect(getTooltipHoverDelay(true, now, now)).toBe(0);
    expect(getTooltipHoverDelay(false, now + 100, graceUntil)).toBe(0);
    expect(getTooltipHoverDelay(false, graceUntil, graceUntil)).toBe(200);
    expect(getTooltipHoverDelay(false, graceUntil + 1, graceUntil)).toBe(200);
  });
});
