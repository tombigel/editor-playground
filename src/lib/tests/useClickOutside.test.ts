import { describe, expect, it } from 'vitest';
import { isOutsideClickExemptTarget, OUTSIDE_CLICK_EXEMPT_ATTR } from '../useClickOutside';

describe('useClickOutside', () => {
  it('detects targets inside outside-click-exempt surfaces', () => {
    const originalElement = globalThis.Element;
    class FakeElement {
      constructor(private readonly exempt: boolean) {}

      closest(selector: string) {
        return selector === `[${OUTSIDE_CLICK_EXEMPT_ATTR}="true"]` && this.exempt ? this : null;
      }
    }
    globalThis.Element = FakeElement as unknown as typeof Element;

    try {
      expect(isOutsideClickExemptTarget(new FakeElement(true) as unknown as EventTarget)).toBe(true);
      expect(isOutsideClickExemptTarget(new FakeElement(false) as unknown as EventTarget)).toBe(false);
      expect(isOutsideClickExemptTarget(null)).toBe(false);
      expect(isOutsideClickExemptTarget({} as EventTarget)).toBe(false);
    } finally {
      globalThis.Element = originalElement;
    }
  });
});
