import type { DocumentModel, NodeId } from '../../model/types';
import { isMediaNode } from '../../model/types';
import { DEFAULT_VIDEO_ASPECT_RATIO } from '../../model/styleDefaults';
import { isValidViewBox } from '../../model/svg';
import { parseHeightValue } from '../../model/units';
import { cloneDocument } from './shared';

export type SvgMarkupPayload = {
  /** Sanitized inner markup of the root svg element. Callers MUST sanitize (see src/lib/svgSanitize.ts). */
  innerMarkup: string;
  /** viewBox extracted from the sanitized source. */
  originalViewBox?: string;
};

/**
 * Replace the inline markup of an svg media node. Resets any author viewBox
 * override, since it referred to the previous graphic.
 */
export function setSvgMarkupDoc(
  document: DocumentModel,
  nodeId: NodeId,
  payload: SvgMarkupPayload,
): DocumentModel {
  if (!payload.innerMarkup.trim()) {
    return document;
  }

  const node = document.nodes[nodeId];
  if (!node || !isMediaNode(node) || node.subtype !== 'svg') {
    return document;
  }

  const next = cloneDocument(document);
  const target = next.nodes[nodeId];
  if (!target || !isMediaNode(target)) {
    return document;
  }

  target.svg = {
    ...target.svg,
    renderMode: 'inline',
    innerMarkup: payload.innerMarkup,
    originalViewBox: payload.originalViewBox,
    viewBox: undefined,
  };
  return next;
}

/**
 * Convert an image media node with an SVG source into an inline svg node.
 * Position, size, styles, sticky, and animation are preserved.
 */
export function convertImageToInlineSvgDoc(
  document: DocumentModel,
  nodeId: NodeId,
  payload: SvgMarkupPayload,
): DocumentModel {
  if (!payload.innerMarkup.trim()) {
    return document;
  }

  const node = document.nodes[nodeId];
  if (!node || !isMediaNode(node) || node.subtype !== 'image') {
    return document;
  }

  const next = cloneDocument(document);
  const target = next.nodes[nodeId];
  if (!target || !isMediaNode(target)) {
    return document;
  }

  target.subtype = 'svg';
  target.name = target.name === 'Image' ? 'SVG' : target.name;
  target.src = undefined;
  target.svg = {
    renderMode: 'inline',
    innerMarkup: payload.innerMarkup,
    originalViewBox: payload.originalViewBox,
    a11y: target.alt ? { title: target.alt } : { hidden: true },
  };
  return next;
}

/** Set or clear (empty string) the author viewBox override on an svg node. */
export function setSvgViewBoxDoc(
  document: DocumentModel,
  nodeId: NodeId,
  viewBox: string,
): DocumentModel {
  const node = document.nodes[nodeId];
  if (!node || !isMediaNode(node) || node.subtype !== 'svg') {
    return document;
  }

  const trimmed = viewBox.trim();
  if (trimmed && !isValidViewBox(trimmed)) {
    return document;
  }

  const next = cloneDocument(document);
  const target = next.nodes[nodeId];
  if (!target || !isMediaNode(target) || !target.svg) {
    return document;
  }

  target.svg = { ...target.svg, viewBox: trimmed || undefined };
  return next;
}

const RATIO_PRECISION = 10000;
const RATIO_TOLERANCE = 1 / RATIO_PRECISION;

/**
 * Record a video node's measured intrinsic aspect ratio and, when the node's
 * height is still following the default or previously adopted intrinsic
 * ratio, adopt the new ratio as the layout aspect. A user-authored aspect or
 * fixed height is never overwritten.
 */
export function adoptVideoIntrinsicRatioDoc(
  document: DocumentModel,
  nodeId: NodeId,
  ratio: number,
): DocumentModel {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return document;
  }

  const node = document.nodes[nodeId];
  if (!node || !isMediaNode(node) || node.subtype !== 'video') {
    return document;
  }

  const rounded = Math.round(ratio * RATIO_PRECISION) / RATIO_PRECISION;
  if (node.video?.intrinsicRatio === rounded) {
    return document;
  }

  const next = cloneDocument(document);
  const target = next.nodes[nodeId];
  if (!target || !isMediaNode(target)) {
    return document;
  }

  const previousIntrinsic = target.video?.intrinsicRatio;
  target.video = { ...target.video, intrinsicRatio: rounded };

  const heightParsed = target.rect.height.base.parsed;
  const heightIsAspect = !('unit' in heightParsed) && heightParsed.keyword === 'aspect-ratio';
  if (heightIsAspect) {
    const followedRatio = previousIntrinsic ?? DEFAULT_VIDEO_ASPECT_RATIO;
    if (Math.abs(heightParsed.ratio - followedRatio) < RATIO_TOLERANCE) {
      target.rect.height.base = parseHeightValue(`aspect-ratio(${rounded})`);
    }
  }

  return next;
}
