import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import {
  addDocumentFontFamily,
  getDocumentFontFamily,
  getFontUsage,
  listDocumentFontsForPicker,
  normalizeDocumentFontState,
  purgeUnusedDocumentFonts,
  removeDocumentFontFamily,
  toggleDocumentFontFavorite,
} from '../documentFonts';
import { buildDocumentGoogleFontsStylesheetHref, buildEditorGoogleFontsStylesheetHref, collectDocumentFontRequests } from '../googleCss';
import { getSupportedFontWeights, getFontWeightLabel, listFontWeightOptions, toggleBoldFontWeight } from '../weights';

describe('fonts/documentFonts', () => {
  it('seeds a default document font library', () => {
    const document = createInitialDocument();

    expect(document.fontLibrary.defaults).toContain('Inter');
    expect(document.fontLibrary.usedFamilies.map((family) => family.family)).toContain('Assistant');
  });

  it('tracks favorites, usage, and purge/remove rules at the document level', () => {
    const document = createInitialDocument();
    const postTitle = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!postTitle || postTitle.type !== 'leaf' || postTitle.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    postTitle.style ??= {};
    postTitle.style.fontFamily = 'IBM Plex Sans Hebrew';

    const withAddedFont = addDocumentFontFamily(document, {
      family: 'IBM Plex Sans Hebrew',
      category: 'sans-serif',
      subsets: ['hebrew', 'latin'],
      variants: ['regular', '500', '700'],
      isVariable: false,
      source: 'google-fonts',
      favorite: false,
      origin: 'added',
    });

    expect(getFontUsage(withAddedFont, 'IBM Plex Sans Hebrew')).toBe(1);
    expect(removeDocumentFontFamily(withAddedFont, 'IBM Plex Sans Hebrew')).toBe(withAddedFont);

    const withFavorite = toggleDocumentFontFavorite(withAddedFont, 'IBM Plex Sans Hebrew');
    expect(getDocumentFontFamily(withFavorite, 'IBM Plex Sans Hebrew')?.favorite).toBe(true);

    const unusedFavorite = structuredClone(withFavorite);
    if (postTitle.id in unusedFavorite.nodes) {
      const node = unusedFavorite.nodes[postTitle.id];
      if (node?.type === 'leaf' && node.role === 'text') {
        node.style = { ...node.style, fontFamily: undefined };
      }
    }

    expect(purgeUnusedDocumentFonts(unusedFavorite).fontLibrary.usedFamilies.map((family) => family.family)).toContain('IBM Plex Sans Hebrew');
    expect(removeDocumentFontFamily(unusedFavorite, 'IBM Plex Sans Hebrew').fontLibrary.usedFamilies.map((family) => family.family)).not.toContain('IBM Plex Sans Hebrew');
  });

  it('normalizes legacy font weights and auto-registers authored font families', () => {
    const document = createInitialDocument();
    const postTitle = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!postTitle || postTitle.type !== 'leaf' || postTitle.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    postTitle.style ??= {};
    (postTitle.style as { fontWeight?: number | string }).fontWeight = 'bold';
    postTitle.style.fontFamily = 'Custom Sans';

    const normalized = normalizeDocumentFontState(document);
    const normalizedNode = normalized.nodes[postTitle.id];

    if (!normalizedNode || normalizedNode.type !== 'leaf' || normalizedNode.role !== 'text') {
      throw new Error('Expected normalized text node');
    }

    expect(normalizedNode.style?.fontWeight).toBe(700);
    expect(getDocumentFontFamily(normalized, 'Custom Sans')).toMatchObject({
      family: 'Custom Sans',
      variants: ['regular'],
    });
  });

  it('reseeds built-in defaults when a legacy font library is effectively empty', () => {
    const document = createInitialDocument();
    document.fontLibrary = {
      defaults: [],
      favorites: [],
      usedFamilies: [],
    };

    const normalized = normalizeDocumentFontState(document);

    expect(normalized.fontLibrary.defaults).toContain('Inter');
    expect(normalized.fontLibrary.usedFamilies.map((family) => family.family)).toContain('Assistant');
  });

  it('sanitizes malformed persisted font metadata before picker sorting', () => {
    const document = createInitialDocument();
    (document.fontLibrary.defaults as unknown[]).push(10);
    (document.fontLibrary.favorites as unknown[]).push('  Broken Font  ');
    (document.fontLibrary.usedFamilies as unknown[]).push(
      {
        family: '  Broken Font  ',
        category: 123,
        subsets: ['latin', false],
        variants: ['regular', 700],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
      {
        family: 9,
        category: 'sans-serif',
        subsets: ['latin'],
        variants: ['regular'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
    );

    const normalized = normalizeDocumentFontState(document);
    const brokenFont = getDocumentFontFamily(normalized, 'Broken Font');

    expect(brokenFont).toMatchObject({
      family: 'Broken Font',
      category: 'sans-serif',
      subsets: ['latin'],
      variants: ['regular'],
      favorite: true,
    });
    expect(getDocumentFontFamily(normalized, '9')).toBeUndefined();
    expect(() => listDocumentFontsForPicker(normalized)).not.toThrow();
  });

  it('collects deduplicated Google CSS2 requests for authored document fonts', () => {
    const document = createInitialDocument();
    const textNodes = Object.values(document.nodes).filter(
      (node): node is Extract<typeof node, { type: 'leaf'; role: 'text' }> =>
        node.type === 'leaf' && node.role === 'text',
    );

    for (const [index, node] of textNodes.entries()) {
      node.style ??= {};
      node.style.fontFamily = index === 0 ? 'Inter' : 'Roboto';
      node.style.fontWeight = index === 0 ? 500 : 700;
    }

    const requests = collectDocumentFontRequests(document);
    expect(requests).toEqual([
      {
        family: 'Inter',
        weights: [],
        isVariable: true,
        variableRange: { min: 100, max: 900 },
      },
      {
        family: 'Roboto',
        weights: [700],
        isVariable: false,
        variableRange: undefined,
      },
    ]);

    expect(buildDocumentGoogleFontsStylesheetHref(document)).toContain('family=Inter%3Awght%40100..900');
    expect(buildDocumentGoogleFontsStylesheetHref(document)).toContain('family=Roboto%3Awght%40700');
    expect(buildEditorGoogleFontsStylesheetHref(document)).toContain('family=Assistant%3Awght%40200..800');
  });

  it('encodes multi-word CSS2 family names without double-encoding the Google family separator', () => {
    const document = createInitialDocument();
    const textNode = Object.values(document.nodes).find(
      (node): node is Extract<typeof node, { type: 'leaf'; role: 'text' }> => node.type === 'leaf' && node.role === 'text',
    );

    if (!textNode) {
      throw new Error('Expected text node');
    }

    textNode.style ??= {};
    textNode.style.fontFamily = 'Playfair Display';

    const href = buildDocumentGoogleFontsStylesheetHref(document);

    expect(href).toContain('family=Playfair+Display%3Awght%40400..900');
    expect(href).not.toContain('family=Playfair%2BDisplay');
  });

  it('toggles bold between 400 and the nearest supported bold equivalent', () => {
    const staticFamily = {
      variants: ['regular', '700', '900'],
      isVariable: false,
      axes: undefined,
    };

    expect(toggleBoldFontWeight(400, staticFamily)).toBe(900);
    expect(toggleBoldFontWeight(900, staticFamily)).toBe(400);
    expect(toggleBoldFontWeight(400, getDocumentFontFamily(createInitialDocument(), 'Inter'))).toBe(800);
  });

  it('returns stepped weight options for variable families', () => {
    expect(getSupportedFontWeights(getDocumentFontFamily(createInitialDocument(), 'Inter'))).toEqual([
      100, 200, 300, 400, 500, 600, 700, 800, 900,
    ]);
    expect(getSupportedFontWeights(getDocumentFontFamily(createInitialDocument(), 'Assistant'))).toEqual([
      200, 300, 400, 500, 600, 700, 800,
    ]);
  });

  it('maps weight options to readable labels for picker previews', () => {
    expect(getFontWeightLabel(300)).toBe('Light');
    expect(getFontWeightLabel(400)).toBe('Normal');
    expect(getFontWeightLabel(700)).toBe('Bold');
    expect(listFontWeightOptions(getDocumentFontFamily(createInitialDocument(), 'Assistant'), 400)).toEqual([
      { value: 200, label: 'Extra Light' },
      { value: 300, label: 'Light' },
      { value: 400, label: 'Normal' },
      { value: 500, label: 'Medium' },
      { value: 600, label: 'Semi Bold' },
      { value: 700, label: 'Bold' },
      { value: 800, label: 'Extra Bold' },
    ]);
  });
});
