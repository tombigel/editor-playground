import type { DocumentModel, NodeId } from '../../model/types';
import { isMediaNode } from '../../model/types';
import { DEFAULT_VIDEO_ASPECT_RATIO } from '../../model/styleDefaults';
import { parseHeightValue } from '../../model/units';
import { cloneDocument } from './shared';

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
