import type { MediaObjectFit } from './types';

/** Validate a `viewBox` string: four finite numbers with positive width/height. */
export function isValidViewBox(value: string): boolean {
  const parts = value.trim().split(/[\s,]+/);
  if (parts.length !== 4) {
    return false;
  }
  const numbers = parts.map((part) => Number.parseFloat(part));
  return numbers.every((n) => Number.isFinite(n)) && numbers[2] > 0 && numbers[3] > 0;
}

const POSITION_TO_ALIGN: Record<string, string> = {
  'left top': 'xMinYMin',
  'center top': 'xMidYMin',
  'right top': 'xMaxYMin',
  'left center': 'xMinYMid',
  'center center': 'xMidYMid',
  'right center': 'xMaxYMid',
  'left bottom': 'xMinYMax',
  'center bottom': 'xMidYMax',
  'right bottom': 'xMaxYMax',
};

/**
 * Map the shared media fit/position controls to an SVG `preserveAspectRatio`.
 * `fill` disables aspect preservation; `cover` uses `slice`; everything else
 * (contain, none, scale-down) keeps the whole graphic visible via `meet`.
 */
export function mediaFitToPreserveAspectRatio(
  objectFit: MediaObjectFit | undefined,
  objectPosition: string | undefined,
): string {
  if (objectFit === 'fill') {
    return 'none';
  }
  const align = POSITION_TO_ALIGN[objectPosition?.trim() ?? ''] ?? 'xMidYMid';
  return `${align} ${objectFit === 'cover' ? 'slice' : 'meet'}`;
}
