import { describe, expect, it, vi } from 'vitest';
import { scrollSelectedStageNodeIntoView } from '../selectionScroll';

describe('app/selectionScroll', () => {
  it('scrolls the selected stage node into view', () => {
    const scrollIntoView = vi.fn();
    const ownerDocument = {
      getElementById: vi.fn(() => ({ scrollIntoView })),
    };

    const didScroll = scrollSelectedStageNodeIntoView('text_12', ownerDocument);

    expect(didScroll).toBe(true);
    expect(ownerDocument.getElementById).toHaveBeenCalledWith('stage-node-text_12');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  });

  it('does nothing when there is no selected node or matching element', () => {
    const ownerDocument = {
      getElementById: vi.fn(() => null),
    };

    expect(scrollSelectedStageNodeIntoView(null, ownerDocument)).toBe(false);
    expect(scrollSelectedStageNodeIntoView('missing', ownerDocument)).toBe(false);
    expect(ownerDocument.getElementById).toHaveBeenCalledTimes(1);
  });
});
