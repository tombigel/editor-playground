import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { parseUnitValue } from '../../model/units';
import {
  formatNodeHeight,
  getContentClassName,
  getContentSpacerClassName,
  getNodeClassName,
  getNodeTextContent,
  getRootWrappers,
  getStickyCssDeclarations,
  getStickyDurationCss,
  getStickyEdgeMode,
  getStickyTrackSpacerCss,
  getStickyTrackSpacerSequence,
  getTrackSpacerClassName,
  getTrackClassName,
  getWrapperChildren,
  getWrapperTag,
  isBrandMark,
  splitRootWrappers,
} from '../siteShared';

describe('site/siteShared', () => {
  it('returns root wrappers and splits them into header, main, and footer', () => {
    const document = createInitialDocument();
    const wrappers = getRootWrappers(document);
    const split = splitRootWrappers(wrappers);

    expect(wrappers).toHaveLength(3);
    expect(split.header?.role).toBe('header');
    expect(split.footer?.role).toBe('footer');
    expect(split.main).toHaveLength(1);
    expect(split.main[0]?.role).toBe('section');
  });

  it('returns wrapper children and deterministic class names', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const children = getWrapperChildren(document, section.id);

    expect(children).toHaveLength(4);
    expect(getWrapperTag(section.role)).toBe('section');
    expect(getNodeClassName(section)).toContain(`sp-node-${section.id}`);
    expect(getTrackClassName(section.id)).toBe(`sp-sticky-track sp-node-${section.id}-track`);
    expect(getTrackSpacerClassName(section.id, 'top')).toBe(
      `sp-sticky-spacer sp-sticky-spacer-top sp-node-${section.id}-top-spacer`,
    );
    expect(getContentClassName(section.id)).toBe(`sp-wrapper-content sp-node-${section.id}-content`);
    expect(getContentSpacerClassName(section.id)).toBe(`sp-content-spacer sp-node-${section.id}-content-spacer`);
  });

  it('computes sticky edge, duration, css declarations, and spacer sequencing', () => {
    const topSticky = {
      enabled: true,
      target: 'self' as const,
      edges: { top: true },
      durationMode: 'custom' as const,
      duration: parseUnitValue('10vh'),
      durationTop: parseUnitValue('10vh'),
      durationBottom: parseUnitValue('10vh'),
      offsetTop: parseUnitValue('12px'),
    };
    const bothSticky = {
      enabled: true,
      target: 'self' as const,
      edges: { top: true, bottom: true },
      durationMode: 'custom' as const,
      duration: parseUnitValue('40vh'),
      durationTop: parseUnitValue('15vh'),
      durationBottom: parseUnitValue('25vh'),
      offsetTop: parseUnitValue('4px'),
      offsetBottom: parseUnitValue('8px'),
    };
    const bottomSticky = {
      enabled: true,
      target: 'self' as const,
      edges: { bottom: true },
      durationMode: 'custom' as const,
      duration: parseUnitValue('20vh'),
      durationTop: parseUnitValue('20vh'),
      durationBottom: parseUnitValue('20vh'),
      offsetBottom: parseUnitValue('10px'),
    };

    expect(getStickyEdgeMode(undefined)).toBe('top');
    expect(getStickyEdgeMode(bottomSticky)).toBe('bottom');
    expect(getStickyEdgeMode(bothSticky)).toBe('both');

    expect(getStickyDurationCss(topSticky)).toBe('10vh');
    expect(getStickyDurationCss(bothSticky)).toBe('calc(15vh + 25vh)');

    expect(getStickyCssDeclarations(bothSticky)).toEqual(['position: sticky', 'z-index: 1', 'top: 4px', 'bottom: 8px']);
    expect(getStickyTrackSpacerSequence(topSticky)).toEqual({ before: [], after: ['top'] });
    expect(getStickyTrackSpacerSequence(bottomSticky)).toEqual({ before: ['bottom'], after: [] });
    expect(getStickyTrackSpacerSequence(bothSticky)).toEqual({ before: ['bottom'], after: ['top'] });
    expect(getStickyTrackSpacerCss(bothSticky, 'top')).toBe('15vh');
    expect(getStickyTrackSpacerCss(bothSticky, 'bottom')).toBe('25vh');
  });

  it('resolves text content, brand mark state, and node height formatting', () => {
    const document = createInitialDocument();
    const text = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'text');
    const image = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'image');
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!text || text.type !== 'leaf' || text.role !== 'text' || !image || image.type !== 'leaf' || image.role !== 'image' || !section || section.type !== 'wrapper') {
      throw new Error('Expected text, image, and section nodes');
    }

    image.name = 'Brand Mark';

    expect(getNodeTextContent(text)).toBe(text.content);
    expect(getNodeTextContent(image)).toBe(image.alt);
    expect(isBrandMark(image)).toBe(true);
    expect(formatNodeHeight(section)).toBe('50vh');
    expect(formatNodeHeight(text)).toBeUndefined();
  });
});
