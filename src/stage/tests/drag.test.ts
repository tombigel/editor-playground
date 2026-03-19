import { describe, expect, it } from 'vitest';
import {
  getDragElementRect,
  didDragPointerMove,
  getShiftLockedPointer,
  resolveDragPointerPosition,
} from '../math/drag';
import type { DragState } from '../types';

// ---------------------------------------------------------------------------
// Minimal DOM stubs
// ---------------------------------------------------------------------------

function makeFakeElement(rect: { left: number; top: number; width: number; height: number }): HTMLElement {
  return {
    getBoundingClientRect: () => ({
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON() {},
    }),
  } as unknown as HTMLElement;
}

function makeDocumentRef(wrapperElements: Record<string, { left: number; top: number; width: number; height: number }> = {}): Pick<Document, 'querySelectorAll' | 'querySelector'> {
  const elements = new Map<string, HTMLElement>();
  for (const [id, rect] of Object.entries(wrapperElements)) {
    const el = makeFakeElement(rect);
    // findDropWrapperElement looks for data-drop-wrapper-id attribute
    (el as unknown as Record<string, unknown>).dataset = { dropWrapperId: id, nodeId: id };
    elements.set(id, el);
  }

  return {
    querySelectorAll: (_selector: string) => {
      // findDropWrapperElement queries '[data-drop-wrapper-id]' and iterates
      return Array.from(elements.values()) as unknown as NodeListOf<HTMLElement>;
    },
    querySelector: (_selector: string) => {
      return null;
    },
  } as Pick<Document, 'querySelectorAll' | 'querySelector'>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stage/drag', () => {
  describe('getDragElementRect', () => {
    it('returns visual offset when no parentId is given', () => {
      const element = makeFakeElement({ left: 100, top: 50, width: 200, height: 100 });
      const emptyDoc = makeDocumentRef({});
      const result = getDragElementRect(element, 130, 70, undefined, undefined, undefined, emptyDoc);
      expect(result.offsetX).toBe(30); // 130 - 100
      expect(result.offsetY).toBe(20); // 70 - 50
      expect(result.useVisualOffset).toBe(false);
      expect(result.modelShiftX).toBe(0);
      expect(result.modelShiftY).toBe(0);
      expect(result.rect.width).toBe(200);
      expect(result.rect.height).toBe(100);
    });

    it('returns visual offset when parentId is given but no parent element found', () => {
      const element = makeFakeElement({ left: 100, top: 50, width: 200, height: 100 });
      const emptyDoc = makeDocumentRef({});
      const result = getDragElementRect(element, 130, 70, 'parent-1', 10, 10, emptyDoc);
      expect(result.offsetX).toBe(30);
      expect(result.offsetY).toBe(20);
      expect(result.useVisualOffset).toBe(false);
    });

    it('returns model offset when parent is found and no sticky visual shift', () => {
      const parentRect = { left: 80, top: 40, width: 400, height: 300 };
      const element = makeFakeElement({ left: 90, top: 50, width: 200, height: 100 });
      const docRef = makeDocumentRef({ 'parent-1': parentRect });
      // originX = 10, originY = 10 -> modelLeft = 80 + 10 = 90, modelTop = 40 + 10 = 50
      // element left = 90, top = 50 -> no shift (diff is 0)
      const result = getDragElementRect(element, 100, 60, 'parent-1', 10, 10, docRef);
      // modelLeft = 90, modelTop = 50
      // offsetX = clientX - modelLeft = 100 - 90 = 10
      // offsetY = clientY - modelTop = 60 - 50 = 10
      expect(result.offsetX).toBe(10);
      expect(result.offsetY).toBe(10);
      expect(result.useVisualOffset).toBe(false);
      expect(result.modelShiftX).toBe(0);
      expect(result.modelShiftY).toBe(0);
    });

    it('returns visual offset with sticky shift when element is shifted from model position', () => {
      const parentRect = { left: 80, top: 40, width: 400, height: 300 };
      // Element is visually at (200, 150), but model says it should be at (90, 50)
      const element = makeFakeElement({ left: 200, top: 150, width: 200, height: 100 });
      const docRef = makeDocumentRef({ 'parent-1': parentRect });
      // originX = 10, originY = 10 -> modelLeft = 80+10=90, modelTop = 40+10=50
      // stickyShiftX = 200 - 90 = 110, stickyShiftY = 150 - 50 = 100
      const result = getDragElementRect(element, 220, 170, 'parent-1', 10, 10, docRef);
      // hasStickyVisualShift = true (110 > 1 and 100 > 1)
      // visualOffsetX = 220 - 200 = 20, visualOffsetY = 170 - 150 = 20
      expect(result.offsetX).toBe(20);
      expect(result.offsetY).toBe(20);
      expect(result.useVisualOffset).toBe(true);
      expect(result.modelShiftX).toBe(110);
      expect(result.modelShiftY).toBe(100);
    });
  });

  describe('didDragPointerMove', () => {
    it('returns false when pointer has not moved past threshold', () => {
      const dragState = { startClientX: 100, startClientY: 100 };
      expect(didDragPointerMove(dragState, 100, 100)).toBe(false);
      expect(didDragPointerMove(dragState, 101, 100)).toBe(false);
      expect(didDragPointerMove(dragState, 100, 101)).toBe(false);
      expect(didDragPointerMove(dragState, 101, 101)).toBe(false);
    });

    it('returns true when X exceeds threshold', () => {
      const dragState = { startClientX: 100, startClientY: 100 };
      expect(didDragPointerMove(dragState, 102, 100)).toBe(true);
    });

    it('returns true when Y exceeds threshold', () => {
      const dragState = { startClientX: 100, startClientY: 100 };
      expect(didDragPointerMove(dragState, 100, 102)).toBe(true);
    });

    it('returns true for negative movement past threshold', () => {
      const dragState = { startClientX: 100, startClientY: 100 };
      expect(didDragPointerMove(dragState, 98, 100)).toBe(true);
      expect(didDragPointerMove(dragState, 100, 98)).toBe(true);
    });

    it('threshold is exactly 1px (exclusive)', () => {
      const dragState = { startClientX: 0, startClientY: 0 };
      // abs(1) > 1 is false
      expect(didDragPointerMove(dragState, 1, 0)).toBe(false);
      // abs(1.01) > 1 is true
      expect(didDragPointerMove(dragState, 1.01, 0)).toBe(true);
    });
  });

  describe('getShiftLockedPointer', () => {
    it('returns original coordinates when shift is not pressed', () => {
      const dragState = { startClientX: 100, startClientY: 100 };
      const result = getShiftLockedPointer(dragState, 150, 130, false);
      expect(result.clientX).toBe(150);
      expect(result.clientY).toBe(130);
    });

    it('locks to horizontal axis when X delta is larger', () => {
      const dragState = { startClientX: 100, startClientY: 100 };
      // deltaX = 50, deltaY = 20 -> horizontal dominates
      const result = getShiftLockedPointer(dragState, 150, 120, true);
      expect(result.clientX).toBe(150);
      expect(result.clientY).toBe(100); // locked to start
    });

    it('locks to vertical axis when Y delta is larger', () => {
      const dragState = { startClientX: 100, startClientY: 100 };
      // deltaX = 10, deltaY = 40 -> vertical dominates
      const result = getShiftLockedPointer(dragState, 110, 140, true);
      expect(result.clientX).toBe(100); // locked to start
      expect(result.clientY).toBe(140);
    });

    it('locks to horizontal when deltas are equal', () => {
      const dragState = { startClientX: 100, startClientY: 100 };
      const result = getShiftLockedPointer(dragState, 130, 130, true);
      // abs(deltaX) = abs(deltaY) = 30, condition is >=, so horizontal wins
      expect(result.clientX).toBe(130);
      expect(result.clientY).toBe(100);
    });

    it('handles negative deltas', () => {
      const dragState = { startClientX: 100, startClientY: 100 };
      // deltaX = -60, deltaY = -30 -> horizontal dominates
      const result = getShiftLockedPointer(dragState, 40, 70, true);
      expect(result.clientX).toBe(40);
      expect(result.clientY).toBe(100);
    });
  });

  describe('resolveDragPointerPosition', () => {
    function makeDragState(overrides: Partial<Exclude<DragState, null>> = {}): Exclude<DragState, null> {
      return {
        nodeId: 'n1',
        startClientX: 100,
        startClientY: 100,
        currentClientX: 100,
        currentClientY: 100,
        grabOffsetX: 10,
        grabOffsetY: 10,
        useVisualOffset: false,
        modelShiftX: 0,
        modelShiftY: 0,
        previewWidth: 200,
        previewHeight: 100,
        originX: 0,
        originY: 0,
        ...overrides,
      };
    }

    it('returns guides as null when snapping is disabled', () => {
      const state = makeDragState();
      const result = resolveDragPointerPosition(state, 150, 120, {
        shiftKey: false,
        altKey: false,
        snapEnabled: false,
        documentRef: { querySelectorAll: () => [] } as unknown as Document,
        windowRef: { getComputedStyle: () => ({}) } as unknown as Window,
      });
      expect(result.clientX).toBe(150);
      expect(result.clientY).toBe(120);
      expect(result.guideX).toBeNull();
      expect(result.guideY).toBeNull();
    });

    it('inverts snap behavior with altKey', () => {
      const state = makeDragState();
      // snapEnabled = true, altKey = true -> should disable snap -> no guides
      const result = resolveDragPointerPosition(state, 150, 120, {
        shiftKey: false,
        altKey: true,
        snapEnabled: true,
        documentRef: { querySelectorAll: () => [] } as unknown as Document,
        windowRef: { getComputedStyle: () => ({}) } as unknown as Window,
      });
      expect(result.guideX).toBeNull();
      expect(result.guideY).toBeNull();
    });

    it('applies shift-lock before snapping', () => {
      const state = makeDragState({ startClientX: 100, startClientY: 100 });
      // deltaX=50 > deltaY=10 -> horizontal lock -> clientY stays 100
      const result = resolveDragPointerPosition(state, 150, 110, {
        shiftKey: true,
        altKey: false,
        snapEnabled: false,
        documentRef: { querySelectorAll: () => [] } as unknown as Document,
        windowRef: { getComputedStyle: () => ({}) } as unknown as Window,
      });
      expect(result.clientX).toBe(150);
      expect(result.clientY).toBe(100);
    });
  });
});
