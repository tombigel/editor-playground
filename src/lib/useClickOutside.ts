import { useEffect, type RefObject } from 'react';

export const OUTSIDE_CLICK_EXEMPT_ATTR = 'data-editor-outside-click-exempt';
const OUTSIDE_CLICK_EXEMPT_SELECTOR = `[${OUTSIDE_CLICK_EXEMPT_ATTR}="true"]`;

export function isOutsideClickExemptTarget(target: EventTarget | null) {
  return typeof Element !== 'undefined' && target instanceof Element && Boolean(target.closest(OUTSIDE_CLICK_EXEMPT_SELECTOR));
}

/**
 * Calls `onClickOutside` when a pointer event occurs outside all provided refs.
 * Pointer events that begin inside an editor outside-click-exempt surface are
 * neutral: they do not count as inside the refs, but they also do not dismiss
 * the current surface. This lets top-layer guide/utility overlays stay
 * interactive without closing unrelated panels that use outside-click behavior.
 * Only active when `enabled` is true (default).
 */
export function useClickOutside(
  refs: RefObject<Element | null> | RefObject<Element | null>[],
  onClickOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const refList = Array.isArray(refs) ? refs : [refs];

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (isOutsideClickExemptTarget(event.target)) return;

      const isInside = refList.some(
        (ref) => ref.current?.contains(target),
      );

      if (!isInside) {
        onClickOutside();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [refs, onClickOutside, enabled]);
}
