import { describe, expect, it } from 'vitest';
import { createDefaultRect, createInitialDocument, createContainerNode, createTextNode } from '../../model/defaults';
import { parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue } from '../../model/units';
import {
  AUTO_WRAPPER_MIN_HEIGHT_PX,
  buildWrapperStyle,
  cssPropertiesToDeclarations,
  getContentWrapperBaseStyle,
  getContentWrapperPaddingStyle,
  getContentWrapperSurfaceStyle,
  getLeafCssHeight,
  getNodeHeight,
  getNodeWidth,
  getTrackCssWidth,
  getWrapperBorderDeclarations,
  getWrapperBorderStyle,
  hasIntrinsicWidth,
  resolveOffsetPx,
  resolveWrapperRenderPlan,
  usesIntrinsicHeight,
} from '../layout';

describe('render/layout', () => {
  it('uses measured sizes for intrinsic geometry and preserves authored explicit wrapper height', () => {
    const document = createInitialDocument();
    const title = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );
    const section = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');
    if (!title || title.contentType !== 'text' || !section || section.contentType !== 'container') {
      throw new Error('Expected text leaf and section wrapper');
    }

    title.rect.width.base = parseWidthValue('fit-content');
    title.rect.height.base = parseHeightValue('auto');

    expect(getNodeWidth(title, { [title.id]: { width: 333, height: 222 } })).toBe(333);
    expect(getNodeHeight(title, { [title.id]: { width: 333, height: 222 } })).toBe(222);
    expect(getNodeHeight(section, { [section.id]: { width: 1000, height: 222 } })).toBe(450);
  });

  it('keeps explicit section height driven by authored size instead of wrapper remeasurement', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const container = createContainerNode('container', 'root');
    container.rect.height.base = parseHeightValue('180px');

    expect(getNodeHeight(section, { [section.id]: { width: 998, height: 700 } })).toBe(450);
    expect(getNodeHeight(container, { [container.id]: { width: 320, height: 260 } })).toBe(180);
  });

  it('derives fallback width and height from authored units and aspect ratio', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');
    const image = Object.values(document.nodes).find((node) => node.contentType === 'media');
    const text = Object.values(document.nodes).find((node) => node.contentType === 'text');
    if (!section || section.contentType !== 'container' || !image || image.contentType !== 'media' || image.subtype !== 'image' || !text || text.contentType !== 'text') {
      throw new Error('Expected section, image, and text nodes');
    }

    expect(getNodeWidth(section)).toBe(960);
    expect(getNodeHeight(section)).toBe(450);
    expect(getNodeHeight(image)).toBe(315);
    expect(usesIntrinsicHeight(text)).toBe(true);
    expect(hasIntrinsicWidth(text)).toBe(true);
    expect(getTrackCssWidth(text)).toBe('fit-content');
    expect(getLeafCssHeight(image)).toBe('auto');
    expect(getLeafCssHeight(text)).toBe('auto');
  });

  it('resolves offsets, wrapper styles, content wrapper styles, and css declarations', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const offset = resolveOffsetPx(parseUnitValue('10%'), section, {
      [section.id]: { width: 1000, height: 500 },
    });

    expect(offset).toBe(45);
    expect(buildWrapperStyle(section, true)).toEqual({ width: '100%' });
    expect(getContentWrapperBaseStyle(section)).toEqual({ width: '100%', minHeight: '50vh' });
    expect(cssPropertiesToDeclarations({ gridTemplateColumns: '1fr 2fr', minHeight: '50vh' })).toEqual([
      'grid-template-columns: 1fr 2fr',
      'min-height: 50vh',
    ]);
  });

  it('uses fixed height for containers and minimum height for sections', () => {
    const section = createContainerNode('section', 'root');
    const container = createContainerNode('container', 'root');
    section.rect.height.base = parseHeightValue('240px');
    container.rect.height.base = parseHeightValue('180px');

    expect(getContentWrapperBaseStyle(section)).toEqual({ width: '100%', minHeight: '240px' });
    expect(getContentWrapperBaseStyle(container)).toEqual({ width: '100%', height: '180px' });
  });

  it('keeps section bottom dividers on the inner surface instead of the wrapper box', () => {
    const section = createContainerNode('section', 'root');
    section.style!.borderColor = undefined;
    section.style!.borderWidth = undefined;
    section.style!.sectionBorderBottomColor = '#cbd5e1';
    section.style!.sectionBorderBottomWidth = parseUnitValue('2px');

    expect(getWrapperBorderStyle(section)).toEqual({});
    expect(getWrapperBorderDeclarations(section)).toEqual([]);
    expect(getContentWrapperSurfaceStyle(section)).toMatchObject({
      borderBottomStyle: 'solid',
      borderBottomColor: '#cbd5e1',
      borderBottomWidth: '2px',
    });

    const container = createContainerNode('container', 'root');
    container.style!.borderColor = undefined;
    container.style!.borderWidth = undefined;
    expect(getWrapperBorderStyle(container)).toEqual({});
    expect(getWrapperBorderDeclarations(container)).toEqual([]);
  });

  it('applies wrapper surface background, border, radius, and shadow on the content wrapper', () => {
    const container = createContainerNode('container', 'root');
    container.style!.background = '#ffffff';
    container.style!.borderWidth = parseUnitValue('2px');
    container.style!.borderColor = '#dbe3ee';
    container.style!.borderRadius = parseUnitValue('20px');
    container.style!.shadowColor = 'rgba(18, 32, 51, 0.18)';
    container.style!.shadowBlur = 24;
    container.style!.shadowSpread = 8;
    container.style!.shadowOffsetX = 0;
    container.style!.shadowOffsetY = 12;

    expect(getContentWrapperSurfaceStyle(container)).toEqual({
      boxSizing: 'border-box',
      backgroundClip: 'padding-box',
      background: '#ffffff',
      borderStyle: 'solid',
      borderWidth: '2px',
      borderColor: '#dbe3ee',
      borderRadius: '20px',
      boxShadow: '0px 12px 24px 8px rgba(18, 32, 51, 0.18)',
    });
    expect(getWrapperBorderStyle(container)).toEqual({});
  });

  it('omits zero-width borders, zero radius, and fully transparent shadows from wrapper surfaces', () => {
    const container = createContainerNode('container', 'root');
    container.style!.background = '#ffffff';
    container.style!.borderWidth = parseUnitValue('0px');
    container.style!.borderColor = '#dbe3ee';
    container.style!.borderRadius = parseUnitValue('0px');
    container.style!.shadowColor = 'rgba(18, 32, 51, 0)';
    container.style!.shadowBlur = 24;
    container.style!.shadowSpread = 8;
    container.style!.shadowOffsetX = 0;
    container.style!.shadowOffsetY = 12;

    expect(getContentWrapperSurfaceStyle(container)).toEqual({
      boxSizing: 'border-box',
      background: '#ffffff',
    });
  });

  it('exposes content wrapper padding separately for overlay alignment', () => {
    const section = createContainerNode('section', 'root');
    section.style!.paddingTop = parseSpacingValue('1.5em');
    section.style!.paddingRight = parseSpacingValue('2rem');
    section.style!.paddingBottom = parseSpacingValue('12px');
    section.style!.paddingLeft = parseSpacingValue('0.5em');

    expect(getContentWrapperPaddingStyle(section)).toEqual({
      paddingTop: '1.5em',
      paddingRight: '2rem',
      paddingBottom: '12px',
      paddingLeft: '0.5em',
    });
  });

  it('builds mesh layout and sticky extra extent for content-wrapper sticky sections', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');
    const title = Object.values(document.nodes).find((node) => node.contentType === 'text' && node.name === 'Post Title');
    if (!section || section.contentType !== 'container' || !title || title.contentType !== 'text') {
      throw new Error('Expected section and title nodes');
    }

    section.sticky = {
      enabled: true,
      target: 'contentWrapper',
      edges: { top: true },
      durationMode: 'custom',
      duration: parseUnitValue('30vh'),
      durationTop: parseUnitValue('30vh'),
      durationBottom: parseUnitValue('30vh'),
      offsetTop: parseUnitValue('10px'),
    };

    const plan = resolveWrapperRenderPlan(document, section, {
      [section.id]: { width: 1200, height: 800 },
    });

    expect(plan.extraExtent).toBeGreaterThan(0);
    expect(plan.stickyState.registrations.some((registration) => registration.target === 'contentWrapper')).toBe(true);
    expect(plan.meshLayout.columnTemplate).toContain('px');
    expect(plan.meshLayout.rowTemplate).toContain('px');
    expect(plan.meshLayout.childPlacements[title.id]).toMatchObject({
      gridColumn: expect.any(String),
      gridRow: expect.any(String),
    });
    expect(plan.meshLayout.bottomLanePx).toBeGreaterThan(0);
  });

  it('does not keep stale measured auto wrapper height as a mesh row boundary', () => {
    const section = createContainerNode('section', 'root');
    section.rect = createDefaultRect('0px', '0px', '100%', 'auto');
    const text = createTextNode('block', section.id);
    text.name = 'Auto Height Child';
    text.rect = createDefaultRect('0px', '24px', '240px', '40px');
    section.children = [text.id];

    const document = {
      rootId: section.id,
      nodes: {
        [section.id]: section,
        [text.id]: text,
      },
      fontLibrary: createInitialDocument().fontLibrary,
    };

    const plan = resolveWrapperRenderPlan(document, section, {
      [section.id]: { width: 960, height: 640 },
    });

    expect(plan.meshLayout.bottomLanePx).toBe(AUTO_WRAPPER_MIN_HEIGHT_PX);
    expect(plan.meshLayout.rowTemplate).toContain('24px');
    expect(plan.meshLayout.rowTemplate).not.toContain('640px');
  });
});
