import { useEffect, type RefObject } from 'react';

/**
 * Calls `onClickOutside` when a pointer event occurs outside all provided refs.
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
