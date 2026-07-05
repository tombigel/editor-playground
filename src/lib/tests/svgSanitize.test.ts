// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeStoredSvgInnerMarkup, sanitizeSvgMarkup } from '../svgSanitize';
import { isValidViewBox } from '../../model/svg';

describe('lib/svgSanitize', () => {
  it('keeps safe shape markup and extracts the viewBox', () => {
    const result = sanitizeSvgMarkup('<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="red"/></svg>');
    expect(result).not.toBeNull();
    expect(result?.viewBox).toBe('0 0 24 24');
    expect(result?.sourceStatus).toBe('clean');
    expect(result?.innerMarkup).toContain('<path');
    expect(result?.innerMarkup).toContain('fill="red"');
  });

  it('strips scripts, event handlers, and javascript urls', () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><script>alert(1)</script><rect width="10" height="10" onclick="alert(2)"/><a href="javascript:alert(3)"><circle r="4"/></a></svg>',
    );
    expect(result).not.toBeNull();
    expect(result?.sourceStatus).toBe('sanitized');
    expect(result?.innerMarkup).not.toContain('script');
    expect(result?.innerMarkup).not.toContain('onclick');
    expect(result?.innerMarkup).not.toContain('javascript:');
    expect(result?.innerMarkup).toContain('<rect');
  });

  it('strips foreignObject content', () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><foreignObject><iframe src="https://evil.example"></iframe></foreignObject><circle r="4"/></svg>',
    );
    expect(result).not.toBeNull();
    expect(result?.innerMarkup).not.toContain('foreignObject');
    expect(result?.innerMarkup).not.toContain('iframe');
  });

  it('derives a viewBox from width and height when missing', () => {
    const result = sanitizeSvgMarkup('<svg width="100" height="50"><rect width="100" height="50"/></svg>');
    expect(result?.viewBox).toBe('0 0 100 50');
  });

  it('does not keep malformed source viewBox values', () => {
    const derived = sanitizeSvgMarkup('<svg viewBox="0 0 0 10" width="100" height="50"><rect width="100" height="50"/></svg>');
    expect(derived?.viewBox).toBe('0 0 100 50');

    const missing = sanitizeSvgMarkup('<svg viewBox="not a viewbox"><circle r="5"/></svg>');
    expect(missing?.viewBox).toBeUndefined();
  });

  it('rejects markup without usable svg content', () => {
    expect(sanitizeSvgMarkup('')).toBeNull();
    expect(sanitizeSvgMarkup('<div>not svg</div>')).toBeNull();
    expect(sanitizeSvgMarkup('<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>')).toBeNull();
  });
});

describe('lib/svgSanitize sanitizeStoredSvgInnerMarkup', () => {
  it('strips dangerous constructs from already-stored inner markup', () => {
    const cleaned = sanitizeStoredSvgInnerMarkup(
      '<image href="x" onerror="alert(1)"/><rect width="10" height="10" onclick="alert(2)"/>',
    );
    expect(cleaned).not.toBeNull();
    expect(cleaned).not.toContain('onerror');
    expect(cleaned).not.toContain('onclick');
    expect(cleaned).toContain('<rect');
  });

  it('returns null when nothing safe survives', () => {
    expect(sanitizeStoredSvgInnerMarkup('<script>alert(1)</script>')).toBeNull();
  });

  it('keeps benign shape markup intact', () => {
    const cleaned = sanitizeStoredSvgInnerMarkup('<circle r="5" fill="blue"/>');
    expect(cleaned).toContain('<circle');
    expect(cleaned).toContain('fill="blue"');
  });
});

describe('normalizeDocument SVG ingestion sanitization', () => {
  it('strips dangerous inline SVG markup that entered as raw JSON', async () => {
    const { normalizeDocument } = await import('../../editor/editorDocumentNormalization');
    const { createInitialDocument, createMediaNode } = await import('../../model/defaults');

    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section');
    }
    const svg = createMediaNode('svg', section.id);
    // Simulate a hand-crafted imported document bypassing input-time sanitization.
    svg.svg = { renderMode: 'inline', innerMarkup: '<image href="x" onerror="alert(1)"/><rect width="10" height="10"/>' };
    document.nodes[svg.id] = svg;
    section.children.push(svg.id);

    const normalized = normalizeDocument(document);
    const cleaned = normalized.nodes[svg.id];
    if (cleaned.contentType !== 'media') {
      throw new Error('Expected media node');
    }
    expect(cleaned.svg?.innerMarkup).not.toContain('onerror');
    expect(cleaned.svg?.innerMarkup).toContain('<rect');
  });
});

describe('model/svg isValidViewBox', () => {
  it('accepts four finite numbers with positive size', () => {
    expect(isValidViewBox('0 0 24 24')).toBe(true);
    expect(isValidViewBox('-5.5 10, 100 50')).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isValidViewBox('')).toBe(false);
    expect(isValidViewBox('0 0 24')).toBe(false);
    expect(isValidViewBox('0 0 0 24')).toBe(false);
    expect(isValidViewBox('a b c d')).toBe(false);
  });
});
