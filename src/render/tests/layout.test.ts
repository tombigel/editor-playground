import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { parseHeightValue, parseUnitValue, parseWidthValue } from '../../model/units';
import {
  buildWrapperStyle,
  cssPropertiesToDeclarations,
  getContentWrapperBaseStyle,
  getLeafCssHeight,
  getNodeHeight,
  getNodeWidth,
  getTrackCssWidth,
  hasIntrinsicWidth,
  resolveOffsetPx,
  resolveWrapperRenderPlan,
  usesIntrinsicHeight,
} from '../layout';

describe('render/layout', () => {
  it('uses measured sizes for intrinsic geometry and preserves authored explicit wrapper height', () => {
    const document = createInitialDocument();
    const title = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!title || title.type !== 'leaf' || title.role !== 'text' || !section || section.type !== 'wrapper') {
      throw new Error('Expected text leaf and section wrapper');
    }

    title.rect.width.base = parseWidthValue('fit-content');
    title.rect.height.base = parseHeightValue('auto');

    expect(getNodeWidth(title, { [title.id]: { width: 333, height: 222 } })).toBe(333);
    expect(getNodeHeight(title, { [title.id]: { width: 333, height: 222 } })).toBe(222);
    expect(getNodeHeight(section, { [section.id]: { width: 1000, height: 222 } })).toBe(450);
  });

  it('derives fallback width and height from authored units and aspect ratio', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    const image = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'image');
    const text = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'text');
    if (!section || section.type !== 'wrapper' || !image || image.type !== 'leaf' || image.role !== 'image' || !text || text.type !== 'leaf' || text.role !== 'text') {
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
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!section || section.type !== 'wrapper') {
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

  it('builds mesh layout and sticky extra extent for content-wrapper sticky sections', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    const title = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title');
    if (!section || section.type !== 'wrapper' || !title || title.type !== 'leaf') {
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
});
