import DOMPurify from 'dompurify';
import type { Config } from 'svgo/browser';
import { isValidViewBox } from '../model/svg';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SVG_OPTIMIZER_PLUGINS = [
  {
    name: 'preset-default',
    params: {
      overrides: {
        cleanupIds: {
          minify: true,
          remove: true,
        },
        convertColors: false,
        removeDesc: false,
        removeUnknownsAndDefaults: {
          keepAriaAttrs: true,
          keepRoleAttr: true,
        },
        removeUselessStrokeAndFill: false,
      },
    },
  },
] satisfies Config['plugins'];

export type SanitizedSvg = {
  /** Sanitized inner markup of the root svg element (root tag excluded). */
  innerMarkup: string;
  /** viewBox from the source, or one derived from width/height when absent. */
  viewBox?: string;
  /** Whether the cleanup/sanitization pipeline returned the original source unchanged. */
  sourceStatus: 'clean' | 'sanitized';
};

/**
 * Sanitize raw SVG markup for inline storage in the document model.
 *
 * Runs DOMPurify with the SVG profiles (scripts, event handlers, and
 * javascript: URLs are stripped) plus an explicit foreignObject ban, then
 * parses the result and returns the root element's inner markup and viewBox.
 * Returns null when the input has no usable `<svg>` root.
 *
 * Browser-only (requires DOM). Callers sanitize at input time so the stored
 * model — and therefore every render and export path — is already safe.
 */
export function sanitizeSvgMarkup(raw: string): SanitizedSvg | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const normalizedSource = normalizeSvgRootNamespace(trimmed);
  return sanitizeSvgMarkupSource(trimmed, normalizedSource);
}

/**
 * Optimize author-supplied SVG markup before the final DOMPurify safety pass.
 *
 * Intended for interactive/import input paths where the app can lazy-load SVGO.
 * Document ingestion keeps using the synchronous sanitizer so normalization does
 * not depend on an async optimizer chunk.
 */
export async function sanitizeSvgMarkupWithCleanup(raw: string): Promise<SanitizedSvg | null> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const normalizedSource = normalizeSvgRootNamespace(trimmed);
  const optimizedSource = await optimizeSvgMarkup(normalizedSource).catch(() => normalizedSource);
  return sanitizeSvgMarkupSource(trimmed, optimizedSource);
}

function sanitizeSvgMarkupSource(originalSource: string, sourceForSanitization: string): SanitizedSvg | null {
  const clean = DOMPurify.sanitize(sourceForSanitization, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'style'],
    NAMESPACE: SVG_NAMESPACE,
  });
  if (!clean.trim()) {
    return null;
  }

  const doc = new DOMParser().parseFromString(clean, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    return null;
  }

  const serializer = new XMLSerializer();
  const innerMarkup = Array.from(root.childNodes)
    .map((child) => serializer.serializeToString(child))
    .join('')
    .trim();
  if (!innerMarkup) {
    return null;
  }

  return {
    innerMarkup,
    viewBox: resolveViewBox(root),
    sourceStatus: isEquivalentSvgSource(originalSource, clean) ? 'clean' : 'sanitized',
  };
}

async function optimizeSvgMarkup(source: string) {
  const { optimize } = await import('svgo/browser');
  const result = optimize(source, {
    multipass: true,
    path: `${createSvgIdPrefix(source)}.svg`,
    plugins: [
      ...SVG_OPTIMIZER_PLUGINS,
      {
        name: 'prefixIds',
        params: {
          delim: '-',
          prefix: createSvgIdPrefix(source),
          prefixClassNames: false,
          prefixIds: true,
        },
      },
    ],
  });
  return result.data;
}

/**
 * Re-sanitize already-stored inline SVG inner markup at a document-ingestion
 * boundary (import, persistence load). Guards the "stored model is safe"
 * invariant against documents that entered as raw JSON — where interactive
 * input-time sanitization was never applied — before the markup can reach the
 * `dangerouslySetInnerHTML` render sink or the static export.
 *
 * Returns the sanitized inner markup, or null when nothing safe survives.
 * When no browser DOM is available (node/test), returns the input unchanged:
 * markup cannot render to a live DOM there, and the browser ingestion boundary
 * re-runs this before any render or export.
 */
export function sanitizeStoredSvgInnerMarkup(innerMarkup: string): string | null {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return innerMarkup;
  }
  const result = sanitizeSvgMarkup(`<svg xmlns="http://www.w3.org/2000/svg">${innerMarkup}</svg>`);
  return result ? result.innerMarkup : null;
}

export { isValidViewBox };

function normalizeSvgRootNamespace(source: string) {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    return source;
  }

  if (root.getAttribute('xmlns') === SVG_NAMESPACE) {
    return source;
  }

  const match = source.match(/<svg\b[^>]*>/i);
  if (!match || match.index == null) {
    return source;
  }

  const openTag = match[0];
  const normalizedOpenTag = /\sxmlns\s*=/.test(openTag)
    ? openTag.replace(/\sxmlns\s*=\s*(["']).*?\1/, ` xmlns="${SVG_NAMESPACE}"`)
    : openTag.replace(/^<svg\b/i, `<svg xmlns="${SVG_NAMESPACE}"`);
  return `${source.slice(0, match.index)}${normalizedOpenTag}${source.slice(match.index + openTag.length)}`;
}

function createSvgIdPrefix(source: string) {
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0;
  }
  return `svg-${(hash >>> 0).toString(36)}`;
}

function resolveViewBox(root: Element): string | undefined {
  const viewBox = root.getAttribute('viewBox')?.trim();
  if (viewBox && isValidViewBox(viewBox)) {
    return viewBox;
  }

  const width = Number.parseFloat(root.getAttribute('width') ?? '');
  const height = Number.parseFloat(root.getAttribute('height') ?? '');
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return `0 0 ${width} ${height}`;
  }

  return undefined;
}

function isEquivalentSvgSource(before: string, after: string) {
  const beforeRoot = parseSvgRoot(before);
  const afterRoot = parseSvgRoot(after);
  if (!beforeRoot || !afterRoot) {
    return false;
  }

  return serializeSvgRootForComparison(beforeRoot) === serializeSvgRootForComparison(afterRoot);
}

function parseSvgRoot(source: string) {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    return null;
  }
  return root;
}

function serializeSvgRootForComparison(root: Element) {
  const clone = root.cloneNode(true) as Element;
  clone.removeAttribute('xmlns');
  return new XMLSerializer()
    .serializeToString(clone)
    .replace(/\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/, '');
}
