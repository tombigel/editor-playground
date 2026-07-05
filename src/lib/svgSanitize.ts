import DOMPurify from 'dompurify';
import { isValidViewBox } from '../model/svg';

export type SanitizedSvg = {
  /** Sanitized inner markup of the root svg element (root tag excluded). */
  innerMarkup: string;
  /** viewBox from the source, or one derived from width/height when absent. */
  viewBox?: string;
  /** Whether DOMPurify returned the original source unchanged or stripped/rewrote it. */
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

  const clean = DOMPurify.sanitize(trimmed, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'style'],
    NAMESPACE: 'http://www.w3.org/2000/svg',
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
    sourceStatus: isEquivalentSvgSource(trimmed, clean) ? 'clean' : 'sanitized',
  };
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
