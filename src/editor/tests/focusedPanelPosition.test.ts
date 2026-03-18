import { describe, expect, it } from 'vitest';
import { clampFocusedPanelOffset, normalizeFocusedPanelOffset } from '../focusedPanelPosition';

describe('editor/focusedPanelPosition', () => {
  it('normalizes invalid persisted offsets back to zero', () => {
    expect(normalizeFocusedPanelOffset({ x: Number.NaN, y: Number.POSITIVE_INFINITY })).toEqual({ x: 0, y: 0 });
  });

  it('keeps the focused panel inside the viewport bounds while dragging', () => {
    expect(
      clampFocusedPanelOffset({
        offset: { x: 0, y: 0 },
        deltaX: -900,
        deltaY: 900,
        containerWidth: 900,
        containerHeight: 640,
        panelWidth: 270,
        panelHeight: 240,
        rightOffset: 80,
      }),
    ).toEqual({ x: -530, y: 360 });
  });
});
