import { describe, expect, it } from 'vitest';
import type { TextNode } from '../types';
import {
  createDefaultFooter,
  createDefaultHeader,
  createLinkTextNode,
  createButtonTextNode,
  createInitialDocument,
  createSectionFromTemplate,
  SECTION_TEMPLATES,
} from '../defaults';

describe('model/defaults', () => {
  it('builds all published section templates and default chrome surfaces', () => {
    const document = createInitialDocument();

    for (const template of SECTION_TEMPLATES) {
      const build = createSectionFromTemplate(template.id, document.rootId);
      expect(build.wrapper.subtype).toBe('section');
      expect(build.nodes[build.wrapper.id]).toBeDefined();
    }

    const header = createDefaultHeader(document.rootId);
    const footer = createDefaultFooter(document.rootId);

    expect(header.wrapper.subtype).toBe('header');
    expect(footer.wrapper.subtype).toBe('footer');
  });

  it('defaults links to internal navigation and buttons to external navigation', () => {
    const link = createLinkTextNode('section_1');
    const button = createButtonTextNode('section_1');

    if (link.contentType !== 'text' || link.link == null) {
      throw new Error('Expected link leaf');
    }
    if (button.contentType !== 'text' || button.subtype !== 'block') {
      throw new Error('Expected button leaf');
    }

    expect(link.link?.linkType).toBe('anchor');
    expect(link.link?.href).toBe('#');
    expect(button.link?.linkType).toBe('external');
    expect(button.link?.href).toBe('#');
  });

  it('seeds pinned cards with auto lead sticky and top-edge narrative cards', () => {
    const document = createInitialDocument();
    const { nodes } = createSectionFromTemplate('stickyPinnedCards', document.rootId);
    const lead = Object.values(nodes).find((node) => node.contentType === 'text' && node.name === 'Pinned Lead');
    const cards = Object.values(nodes).filter(
      (node): node is TextNode =>
        node.contentType === 'text' && node.name.startsWith('Narrative Card'),
    );

    if (!lead || lead.contentType !== 'text') {
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
    const topCard = Object.values(nodes).find((node) => node.contentType === 'container' && node.name === 'Top Edge Card Container');
    const bothCard = Object.values(nodes).find((node) => node.contentType === 'container' && node.name === 'Both Edges Card Container');
    const bottomCard = Object.values(nodes).find((node) => node.contentType === 'container' && node.name === 'Bottom Edge Card Container');

    if (
      !topCard || topCard.contentType !== 'container' ||
      !bothCard || bothCard.contentType !== 'container' ||
      !bottomCard || bottomCard.contentType !== 'container'
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

  it('seeds curated typography pairings across starter chrome and section templates', () => {
    const document = createInitialDocument();
    const initialNodes = Object.values(document.nodes);
    const headerTitle = initialNodes.find((node) => node.contentType === 'text' && node.name === 'Product Title');
    const postTitle = initialNodes.find((node) => node.contentType === 'text' && node.name === 'Post Title');
    const postBody = initialNodes.find((node) => node.contentType === 'text' && node.name === 'Post Body');

    const staggered = createSectionFromTemplate('stickyStaggeredImages', document.rootId);
    const pinned = createSectionFromTemplate('stickyPinnedCards', document.rootId);
    const mediaReveal = createSectionFromTemplate('stickyMediaReveal', document.rootId);
    const stickySteps = createSectionFromTemplate('stickySteps', document.rootId);

    const staggeredHeading = Object.values(staggered.nodes).find((node) => node.contentType === 'text' && node.name === 'Section Heading');
    const pinnedLead = Object.values(pinned.nodes).find((node) => node.contentType === 'text' && node.name === 'Pinned Lead');
    const mediaHeading = Object.values(mediaReveal.nodes).find((node) => node.contentType === 'text' && node.name === 'Section Heading');
    const mediaBlock = Object.values(mediaReveal.nodes).find((node) => node.contentType === 'text' && node.name === 'Narrative Block A');
    const labIntro = Object.values(stickySteps.nodes).find((node) => node.contentType === 'text' && node.name === 'Section Intro');
    const labCard = Object.values(stickySteps.nodes).find((node) => node.contentType === 'text' && node.name === 'Top Edge Card');

    expect(headerTitle).toMatchObject({ style: { fontFamily: 'Playfair Display' } });
    expect(postTitle).toMatchObject({ style: { fontFamily: 'Playfair Display' } });
    expect(postBody).toMatchObject({ style: { fontFamily: 'Inter' } });
    expect(staggeredHeading).toMatchObject({ style: { fontFamily: 'Cormorant Garamond' } });
    expect(pinnedLead).toMatchObject({ style: { fontFamily: 'Poppins' } });
    expect(mediaHeading).toMatchObject({ style: { fontFamily: 'Fraunces' } });
    expect(mediaBlock).toMatchObject({ style: { fontFamily: 'Open Sans' } });
    expect(labIntro).toMatchObject({ style: { fontFamily: 'Crimson Text' } });
    expect(labCard).toMatchObject({ style: { fontFamily: 'Montserrat' } });
  });

  it('keeps post and pinned-card copy stacks clear after the typography refresh', () => {
    const document = createInitialDocument();
    const postTitle = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );
    const postBody = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Body',
    );
    const postLink = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );
    const pinned = createSectionFromTemplate('stickyPinnedCards', document.rootId);
    const pinnedLead = Object.values(pinned.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Pinned Lead',
    );
    const pinnedLeadCopy = Object.values(pinned.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Pinned Lead Copy',
    );
    const pinnedCard = Object.values(pinned.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Narrative Card 1',
    );

    expect(postTitle).toMatchObject({
      rect: {
        x: { base: { raw: '546px' } },
        y: { base: { raw: '57px' } },
      },
      style: { fontSize: { raw: '46px' }, lineHeight: 1.08 },
    });
    expect(postBody).toMatchObject({ rect: { y: { base: { raw: '226.5px' } } } });
    expect(postLink).toMatchObject({
      rect: {
        x: { base: { raw: '549px' } },
        y: { base: { raw: '350.40625px' } },
      },
    });
    expect(pinnedLead).toMatchObject({
      rect: { width: { base: { raw: '392px' } } },
      style: { fontSize: { raw: '44px' } },
    });
    expect(pinnedLeadCopy).toMatchObject({ rect: { y: { base: { raw: '490px' } } } });
    expect(pinnedCard).toMatchObject({
      rect: {
        x: { base: { raw: '500px' } },
        width: { base: { raw: '468px' } },
      },
      style: { fontSize: { raw: '24px' } },
    });
  });

  it('keeps sticky edge lab cards and notes inside the section padding bounds', () => {
    const document = createInitialDocument();
    const { nodes } = createSectionFromTemplate('stickySteps', document.rootId);
    const bothNotes = Object.values(nodes).find((node) => node.contentType === 'text' && node.name === 'Both Column Notes');
    const bottomNotes = Object.values(nodes).find((node) => node.contentType === 'text' && node.name === 'Bottom Column Notes');
    const bothCard = Object.values(nodes).find((node) => node.contentType === 'container' && node.name === 'Both Edges Card Container');
    const bottomCard = Object.values(nodes).find((node) => node.contentType === 'container' && node.name === 'Bottom Edge Card Container');

    expect(bothNotes).toMatchObject({ rect: { x: { base: { raw: '420px' } } } });
    expect(bottomNotes).toMatchObject({
      rect: {
        x: { base: { raw: '770px' } },
        width: { base: { raw: '320px' } },
      },
    });
    expect(bothCard).toMatchObject({ rect: { x: { base: { raw: '420px' } } } });
    expect(bottomCard).toMatchObject({ rect: { x: { base: { raw: '770px' } } } });
  });

  it('keeps the staggered gallery images inside the section padding bounds', () => {
    const document = createInitialDocument();
    const { nodes } = createSectionFromTemplate('stickyStaggeredImages', document.rootId);
    const imageB = Object.values(nodes).find((node) => node.contentType === 'media' && node.name === 'Sticky Image B');
    const imageC = Object.values(nodes).find((node) => node.contentType === 'media' && node.name === 'Sticky Image C');
    const imageD = Object.values(nodes).find((node) => node.contentType === 'media' && node.name === 'Sticky Image D');

    expect(imageB).toMatchObject({
      rect: {
        x: { base: { raw: '332px' } },
        width: { base: { raw: '248px' } },
      },
    });
    expect(imageC).toMatchObject({
      rect: {
        x: { base: { raw: '610px' } },
        width: { base: { raw: '248px' } },
      },
    });
    expect(imageD).toMatchObject({
      rect: {
        x: { base: { raw: '884px' } },
        width: { base: { raw: '208px' } },
      },
    });
  });
});
