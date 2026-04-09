import { describe, expect, it } from 'vitest';
import {
  numericWidth,
  numericHeight,
  getNodeWidth,
  getNodeHeight,
  resolveOffsetPx,
  hasIntrinsicWidth,
  DEFAULT_STAGE_VIEWPORT,
} from '../math/nodeGeometry';
import { createTextDocumentFromText } from '../../model/richContent';
import type { ViewportMeasurement } from '../../model/types';

// ---------------------------------------------------------------------------
// Helpers to build minimal node stubs
// ---------------------------------------------------------------------------

type WidthParsed =
  | { value: number; unit: 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax' }
  | { keyword: 'fit-content' | 'min-content' | 'max-content' };

type HeightParsed =
  | { value: number; unit: 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax' }
  | { keyword: 'auto' }
  | { keyword: 'aspect-ratio'; ratio: number };

function makeLeafNode(opts: {
  id?: string;
  subtype?: 'block' | 'image' | 'video';
  widthRaw?: string;
  widthParsed?: WidthParsed;
  heightRaw?: string;
  heightParsed?: HeightParsed;
  content?: string;
  style?: Record<string, unknown>;
  parentId?: string | null;
}) {
  const widthParsed: WidthParsed = opts.widthParsed ?? { value: 100, unit: 'px' };
  const heightParsed: HeightParsed = opts.heightParsed ?? { value: 50, unit: 'px' };
  return {
    id: opts.id ?? 'leaf-1',
    contentType: 'text' as const,
    subtype: opts.subtype ?? 'block',
    parentId: opts.parentId ?? null,
    children: [],
    name: 'Test',
    visible: true,
    locked: false,
    content: createTextDocumentFromText(opts.content ?? ''),
    htmlTag: 'p' as const,
    rect: {
      x: { base: { raw: '0px', parsed: { value: 0, unit: 'px' as const } } },
      y: { base: { raw: '0px', parsed: { value: 0, unit: 'px' as const } } },
      width: { base: { raw: opts.widthRaw ?? '100px', parsed: widthParsed } },
      height: { base: { raw: opts.heightRaw ?? '50px', parsed: heightParsed } },
    },
    style: opts.style,
  } as Parameters<typeof getNodeWidth>[0];
}

function makeWrapperNode(opts: {
  id?: string;
  subtype?: 'section' | 'header' | 'footer' | 'container';
  widthParsed?: WidthParsed;
  heightParsed?: HeightParsed;
}) {
  const widthParsed: WidthParsed = opts.widthParsed ?? { value: 800, unit: 'px' };
  const heightParsed: HeightParsed = opts.heightParsed ?? { value: 400, unit: 'px' };
  return {
    id: opts.id ?? 'wrapper-1',
    contentType: 'container' as const,
    subtype: opts.subtype ?? 'section',
    parentId: null,
    children: [],
    name: 'Wrapper',
    visible: true,
    locked: false,
    style: {},
    rect: {
      x: { base: { raw: '0px', parsed: { value: 0, unit: 'px' as const } } },
      y: { base: { raw: '0px', parsed: { value: 0, unit: 'px' as const } } },
      width: { base: { raw: '800px', parsed: widthParsed } },
      height: { base: { raw: '400px', parsed: heightParsed } },
    },
  } as Parameters<typeof getNodeWidth>[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stage/nodeGeometry', () => {
  describe('DEFAULT_STAGE_VIEWPORT', () => {
    it('has expected default dimensions', () => {
      expect(DEFAULT_STAGE_VIEWPORT.width).toBe(1440);
      expect(DEFAULT_STAGE_VIEWPORT.height).toBe(900);
    });
  });

  describe('numericWidth', () => {
    it('parses a valid numeric string', () => {
      expect(numericWidth('200')).toBe(200);
      expect(numericWidth('200px')).toBe(200);
      expect(numericWidth('50.5')).toBe(50.5);
    });

    it('returns default 160 for non-numeric strings', () => {
      expect(numericWidth('auto')).toBe(160);
      expect(numericWidth('fit-content')).toBe(160);
      expect(numericWidth('')).toBe(160);
      expect(numericWidth('abc')).toBe(160);
    });

    it('returns default 160 for NaN-producing input', () => {
      expect(numericWidth('NaN')).toBe(160);
    });

    it('handles Infinity strings', () => {
      expect(numericWidth('Infinity')).toBe(160);
      expect(numericWidth('-Infinity')).toBe(160);
    });

    it('parses zero', () => {
      expect(numericWidth('0')).toBe(0);
    });

    it('parses negative values', () => {
      expect(numericWidth('-10')).toBe(-10);
    });
  });

  describe('numericHeight', () => {
    it('parses a valid numeric string', () => {
      expect(numericHeight('100')).toBe(100);
      expect(numericHeight('100px')).toBe(100);
    });

    it('returns default 80 for non-numeric strings', () => {
      expect(numericHeight('auto')).toBe(80);
      expect(numericHeight('')).toBe(80);
    });

    it('returns default 80 for Infinity', () => {
      expect(numericHeight('Infinity')).toBe(80);
    });

    it('parses zero', () => {
      expect(numericHeight('0')).toBe(0);
    });
  });

  describe('getNodeWidth', () => {
    it('returns px value directly', () => {
      const node = makeLeafNode({ widthParsed: { value: 300, unit: 'px' } });
      expect(getNodeWidth(node)).toBe(300);
    });

    it('returns measured width when available and positive', () => {
      const node = makeLeafNode({ id: 'n1', widthParsed: { value: 300, unit: 'px' } });
      const measured = { n1: { width: 350, height: 100 } };
      expect(getNodeWidth(node, measured)).toBe(350);
    });

    it('falls back to parsed when measured width is zero', () => {
      const node = makeLeafNode({ id: 'n1', widthParsed: { value: 300, unit: 'px' } });
      const measured = { n1: { width: 0, height: 100 } };
      expect(getNodeWidth(node, measured)).toBe(300);
    });

    it('resolves vw unit relative to viewport width', () => {
      const node = makeLeafNode({ widthParsed: { value: 50, unit: 'vw' } });
      const viewport: ViewportMeasurement = { width: 1000, height: 600 };
      expect(getNodeWidth(node, {}, viewport)).toBe(500);
    });

    it('resolves vh unit relative to viewport height', () => {
      const node = makeLeafNode({ widthParsed: { value: 50, unit: 'vh' } });
      const viewport: ViewportMeasurement = { width: 1000, height: 600 };
      expect(getNodeWidth(node, {}, viewport)).toBe(300);
    });

    it('resolves vmin unit relative to smaller viewport dimension', () => {
      const node = makeLeafNode({ widthParsed: { value: 50, unit: 'vmin' } });
      const viewport: ViewportMeasurement = { width: 1000, height: 600 };
      expect(getNodeWidth(node, {}, viewport)).toBe(300); // 50% of 600
    });

    it('resolves vmax unit relative to larger viewport dimension', () => {
      const node = makeLeafNode({ widthParsed: { value: 50, unit: 'vmax' } });
      const viewport: ViewportMeasurement = { width: 1000, height: 600 };
      expect(getNodeWidth(node, {}, viewport)).toBe(500); // 50% of 1000
    });

    it('returns 240 for keyword-based width (fit-content)', () => {
      const node = makeLeafNode({ widthParsed: { keyword: 'fit-content' } });
      expect(getNodeWidth(node)).toBe(240);
    });

    it('returns 240 for keyword-based width (min-content)', () => {
      const node = makeLeafNode({ widthParsed: { keyword: 'min-content' } });
      expect(getNodeWidth(node)).toBe(240);
    });

    it('uses default viewport when none is provided', () => {
      const node = makeLeafNode({ widthParsed: { value: 10, unit: 'vw' } });
      expect(getNodeWidth(node)).toBe(144); // 10% of 1440
    });
  });

  describe('getNodeHeight', () => {
    it('returns px value directly', () => {
      const node = makeLeafNode({ heightParsed: { value: 200, unit: 'px' } });
      expect(getNodeHeight(node)).toBe(200);
    });

    it('returns measured height for percentage units', () => {
      const node = makeLeafNode({ id: 'n1', heightParsed: { value: 50, unit: '%' } });
      const measured = { n1: { width: 100, height: 250 } };
      expect(getNodeHeight(node, measured)).toBe(250);
    });

    it('falls through for percentage unit without measurement', () => {
      const node = makeLeafNode({ heightParsed: { value: 50, unit: '%' } });
      // When no measured height and unit is %, the unit chain returns 0
      expect(getNodeHeight(node)).toBe(0);
    });

    it('resolves vh unit relative to viewport height', () => {
      const node = makeLeafNode({ heightParsed: { value: 25, unit: 'vh' } });
      const viewport: ViewportMeasurement = { width: 1000, height: 800 };
      expect(getNodeHeight(node, {}, viewport)).toBe(200);
    });

    it('resolves vw unit relative to viewport width', () => {
      const node = makeLeafNode({ heightParsed: { value: 10, unit: 'vw' } });
      const viewport: ViewportMeasurement = { width: 1000, height: 800 };
      expect(getNodeHeight(node, {}, viewport)).toBe(100);
    });

    it('resolves vmin unit', () => {
      const node = makeLeafNode({ heightParsed: { value: 20, unit: 'vmin' } });
      const viewport: ViewportMeasurement = { width: 1000, height: 600 };
      expect(getNodeHeight(node, {}, viewport)).toBe(120); // 20% of 600
    });

    it('resolves vmax unit', () => {
      const node = makeLeafNode({ heightParsed: { value: 20, unit: 'vmax' } });
      const viewport: ViewportMeasurement = { width: 1000, height: 600 };
      expect(getNodeHeight(node, {}, viewport)).toBe(200); // 20% of 1000
    });

    it('returns measured height for auto keyword when available', () => {
      const node = makeLeafNode({ id: 'n1', heightParsed: { keyword: 'auto' } });
      const measured = { n1: { width: 100, height: 300 } };
      expect(getNodeHeight(node, measured)).toBe(300);
    });

    it('estimates auto height for text role when no measurement', () => {
      const node = makeLeafNode({
        heightParsed: { keyword: 'auto' },
        subtype: 'block',
        widthParsed: { value: 200, unit: 'px' },
        content: 'Hello world',
      });
      const result = getNodeHeight(node);
      expect(result).toBeGreaterThan(0);
    });

    it('returns 24 for link role with auto height', () => {
      const node = makeLeafNode({
        heightParsed: { keyword: 'auto' },
        subtype: 'block',
        content: 'Click',
      });
      (node as Record<string, unknown>).link = { linkType: 'external', href: '#' };
      const result = getNodeHeight(node);
      expect(result).toBe(24);
    });

    it('returns 50 for button role with auto height', () => {
      const node = makeLeafNode({
        heightParsed: { keyword: 'auto' },
        subtype: 'block',
        content: 'Submit',
      });
      (node as Record<string, unknown>).link = { linkType: 'external', href: '#' };
      (node as Record<string, unknown>).style = { background: '#1e40af' };
      const result = getNodeHeight(node);
      expect(result).toBe(50);
    });

    it('computes aspect-ratio height from width and ratio', () => {
      const node = makeLeafNode({
        widthParsed: { value: 300, unit: 'px' },
        heightParsed: { keyword: 'aspect-ratio', ratio: 1.5 },
      });
      expect(getNodeHeight(node)).toBe(200); // 300 / 1.5
    });

    it('computes aspect-ratio height using vw width', () => {
      const node = makeLeafNode({
        widthParsed: { value: 50, unit: 'vw' },
        heightParsed: { keyword: 'aspect-ratio', ratio: 2 },
      });
      const viewport: ViewportMeasurement = { width: 1000, height: 600 };
      // width = 50% of 1000 = 500, height = 500 / 2 = 250
      expect(getNodeHeight(node, {}, viewport)).toBe(250);
    });

    it('returns 0 for wrapper header with auto-like height', () => {
      const node = makeWrapperNode({
        subtype: 'header',
        heightParsed: { keyword: 'auto' },
      });
      expect(getNodeHeight(node)).toBe(0);
    });

    it('returns 0 for wrapper footer with auto-like height', () => {
      const node = makeWrapperNode({
        subtype: 'footer',
        heightParsed: { keyword: 'auto' },
      });
      expect(getNodeHeight(node)).toBe(0);
    });
  });

  describe('resolveOffsetPx', () => {
    it('resolves a px offset', () => {
      const node = makeLeafNode({
        widthParsed: { value: 200, unit: 'px' },
        heightParsed: { value: 100, unit: 'px' },
      });
      const offset = { raw: '20px', parsed: { value: 20, unit: 'px' as const } };
      const result = resolveOffsetPx(offset, node);
      expect(result).toBe(20);
    });

    it('resolves a vh offset relative to viewport', () => {
      const node = makeLeafNode({
        widthParsed: { value: 200, unit: 'px' },
        heightParsed: { value: 100, unit: 'px' },
      });
      const offset = { raw: '10vh', parsed: { value: 10, unit: 'vh' as const } };
      const viewport: ViewportMeasurement = { width: 1440, height: 900 };
      const result = resolveOffsetPx(offset, node, {}, viewport);
      expect(result).toBe(90); // 10% of 900
    });
  });

  describe('hasIntrinsicWidth', () => {
    it('returns false for unit-based width (px)', () => {
      const node = makeLeafNode({ widthParsed: { value: 100, unit: 'px' } });
      expect(hasIntrinsicWidth(node)).toBe(false);
    });

    it('returns false for unit-based width (vw)', () => {
      const node = makeLeafNode({ widthParsed: { value: 50, unit: 'vw' } });
      expect(hasIntrinsicWidth(node)).toBe(false);
    });

    it('returns true for keyword-based width (fit-content)', () => {
      const node = makeLeafNode({ widthParsed: { keyword: 'fit-content' } });
      expect(hasIntrinsicWidth(node)).toBe(true);
    });

    it('returns true for keyword-based width (min-content)', () => {
      const node = makeLeafNode({ widthParsed: { keyword: 'min-content' } });
      expect(hasIntrinsicWidth(node)).toBe(true);
    });

    it('returns true for keyword-based width (max-content)', () => {
      const node = makeLeafNode({ widthParsed: { keyword: 'max-content' } });
      expect(hasIntrinsicWidth(node)).toBe(true);
    });
  });
});
