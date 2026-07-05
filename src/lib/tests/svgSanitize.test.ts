// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeStoredSvgInnerMarkup, sanitizeSvgMarkup, sanitizeSvgMarkupWithCleanup } from '../svgSanitize';
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

  it('normalizes a malformed root svg namespace before sanitizing', () => {
    const raw =
      '<svg xmlns="http://w3.org" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="2" rx="2" ry="2"/><rect width="14" height="14" x="2" y="8" rx="2" ry="2" fill="currentColor"/></svg>';
    const result = sanitizeSvgMarkup(raw);

    expect(result).not.toBeNull();
    expect(result?.sourceStatus).toBe('sanitized');
    expect(result?.viewBox).toBe('0 0 24 24');
    expect(result?.innerMarkup).toContain('<rect');
    expect(result?.innerMarkup).toContain('fill="currentColor"');
  });

  it('keeps a correct root svg namespace clean', () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="14" height="14"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result?.sourceStatus).toBe('clean');
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

describe('lib/svgSanitize sanitizeSvgMarkupWithCleanup', () => {
  it('optimizes redundant author markup before the DOMPurify pass', async () => {
    const result = await sanitizeSvgMarkupWithCleanup(
      '<svg viewBox="0 0 24 24"><!-- export note --><metadata>editor export</metadata><g id="unused-wrapper"><rect x="0" y="0" width="24" height="24"/></g></svg>',
    );

    expect(result).not.toBeNull();
    expect(result?.sourceStatus).toBe('sanitized');
    expect(result?.viewBox).toBe('0 0 24 24');
    expect(result?.innerMarkup).not.toContain('export note');
    expect(result?.innerMarkup).not.toContain('metadata');
    expect(result?.innerMarkup).toContain('<path');
  });

  it('keeps DOMPurify as the final safety boundary after cleanup', async () => {
    const result = await sanitizeSvgMarkupWithCleanup(
      '<svg viewBox="0 0 10 10"><rect width="10" height="10" onclick="alert(1)"/><a href="javascript:alert(2)"><circle r="4"/></a></svg>',
    );

    expect(result).not.toBeNull();
    expect(result?.sourceStatus).toBe('sanitized');
    expect(result?.innerMarkup).not.toContain('onclick');
    expect(result?.innerMarkup).not.toContain('javascript:');
    expect(result?.innerMarkup).toContain('<path');
  });

  it('preserves viewBox and can still derive it from width and height', async () => {
    const withViewBox = await sanitizeSvgMarkupWithCleanup(
      '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
    );
    const derived = await sanitizeSvgMarkupWithCleanup(
      '<svg width="100" height="50"><rect width="100" height="50"/></svg>',
    );

    expect(withViewBox?.viewBox).toBe('0 0 24 24');
    expect(derived?.viewBox).toBe('0 0 100 50');
  });

  it('preserves color semantics and transparent no-paint values', async () => {
    const result = await sanitizeSvgMarkupWithCleanup(
      '<svg viewBox="0 0 24 24"><rect width="12" height="12" fill="currentColor" stroke="currentColor"/><circle cx="18" cy="18" r="4" fill="transparent" fill-opacity="0"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result?.innerMarkup).toContain('stroke="currentColor"');
    expect(result?.innerMarkup).toContain('fill="currentColor"');
    expect(result?.innerMarkup).toContain('fill="transparent"');
    expect(result?.innerMarkup).toContain('fill-opacity="0"');
  });

  it('prefixes ids while keeping url references connected', async () => {
    const result = await sanitizeSvgMarkupWithCleanup(
      '<svg viewBox="0 0 10 10"><defs><linearGradient id="paint"><stop stop-color="red"/></linearGradient></defs><rect width="10" height="10" fill="url(#paint)"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result?.innerMarkup).toMatch(/id="svg-[a-z0-9]+-[a-z]"/);
    expect(result?.innerMarkup).toMatch(/fill="url\(#svg-[a-z0-9]+-[a-z]\)"/);
  });

  it('keeps accessible SVG metadata that survives DOMPurify', async () => {
    const result = await sanitizeSvgMarkupWithCleanup(
      '<svg viewBox="0 0 10 10" role="img" aria-labelledby="title desc"><title id="title">Logo</title><desc id="desc">Two squares</desc><rect width="10" height="10"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result?.innerMarkup).toContain('<title');
    expect(result?.innerMarkup).toContain('Logo');
    expect(result?.innerMarkup).toContain('<desc');
    expect(result?.innerMarkup).toContain('Two squares');
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
