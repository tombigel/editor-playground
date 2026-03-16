import { describe, expect, it } from 'vitest';
import { createInitialDocument, createSectionFromTemplate } from '../defaults';

describe('model/defaults', () => {
  it('seeds pinned cards with auto lead sticky and top-edge narrative cards', () => {
    const document = createInitialDocument();
    const { nodes } = createSectionFromTemplate('stickyPinnedCards', document.rootId);
    const lead = Object.values(nodes).find((node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Pinned Lead');
    const cards = Object.values(nodes).filter(
      (node): node is Extract<typeof node, { type: 'leaf'; role: 'text' }> =>
        node.type === 'leaf' && node.role === 'text' && node.name.startsWith('Narrative Card'),
    );

    if (!lead || lead.type !== 'leaf' || lead.role !== 'text') {
      throw new Error('Expected pinned lead text node');
    }

    expect(lead.sticky).toMatchObject({
      enabled: true,
      target: 'self',
      durationMode: 'auto',
      edges: { top: true, bottom: false },
    });
    expect(lead.sticky?.offsetTop?.raw).toBe('12vh');
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.sticky).toMatchObject({
        enabled: true,
        target: 'self',
        durationMode: 'custom',
        edges: { top: true, bottom: false },
      });
      expect(card.sticky?.offsetTop?.raw).toBe('15vh');
    }
  });

  it('seeds sticky edge lab card containers with top, both, and bottom sticky variants', () => {
    const document = createInitialDocument();
    const { nodes } = createSectionFromTemplate('stickySteps', document.rootId);
    const topCard = Object.values(nodes).find((node) => node.type === 'wrapper' && node.name === 'Top Edge Card Container');
    const bothCard = Object.values(nodes).find((node) => node.type === 'wrapper' && node.name === 'Both Edges Card Container');
    const bottomCard = Object.values(nodes).find((node) => node.type === 'wrapper' && node.name === 'Bottom Edge Card Container');

    if (
      !topCard || topCard.type !== 'wrapper' ||
      !bothCard || bothCard.type !== 'wrapper' ||
      !bottomCard || bottomCard.type !== 'wrapper'
    ) {
      throw new Error('Expected sticky edge lab card containers');
    }

    expect(topCard.sticky).toMatchObject({
      edges: { top: true, bottom: false },
      durationMode: 'custom',
    });
    expect(topCard.sticky?.offsetTop?.raw).toBe('10vh');
    expect(topCard.sticky?.durationTop?.raw).toBe('140vh');

    expect(bothCard.sticky).toMatchObject({
      edges: { top: true, bottom: true },
      durationMode: 'custom',
    });
    expect(bothCard.sticky?.offsetTop?.raw).toBe('10vh');
    expect(bothCard.sticky?.offsetBottom?.raw).toBe('10vh');
    expect(bothCard.sticky?.durationTop?.raw).toBe('80vh');
    expect(bothCard.sticky?.durationBottom?.raw).toBe('80vh');

    expect(bottomCard.sticky).toMatchObject({
      edges: { top: false, bottom: true },
      durationMode: 'custom',
    });
    expect(bottomCard.sticky?.offsetBottom?.raw).toBe('10vh');
    expect(bottomCard.sticky?.durationBottom?.raw).toBe('140vh');
  });
});
