import { describe, expect, it } from 'vitest';
import { computeResizeFrame, px, getResizeCommitSize } from '../math/resize';
import { createTextDocumentFromText } from '../../model/richContent';
import type { ResizeState } from '../types';
import type { DocumentNode } from '../../model/types';

function makeResizeState(
  overrides: Partial<Exclude<ResizeState, null>> = {},
): Exclude<ResizeState, null> {
  return {
    nodeId: 'node-1',
    handle: 'se',
    startClientX: 200,
    startClientY: 200,
    originWidth: 100,
    originHeight: 80,
    originX: 50,
    originY: 50,
    ...overrides,
  };
}

describe('stage/resize', () => {
  describe('px', () => {
    it('formats a positive number as a rounded pixel string', () => {
      expect(px(100)).toBe('100px');
    });

    it('rounds fractional values', () => {
      expect(px(99.7)).toBe('100px');
      expect(px(99.4)).toBe('99px');
    });

    it('handles zero', () => {
      expect(px(0)).toBe('0px');
    });

    it('handles negative values', () => {
      expect(px(-5.3)).toBe('-5px');
    });
  });

  describe('computeResizeFrame', () => {
    describe('east handle', () => {
      it('increases width when dragging right', () => {
        const state = makeResizeState({ handle: 'e' });
        const result = computeResizeFrame(state, 250, 200, false);
        expect(result.width).toBe(150);
        expect(result.height).toBe(80);
        expect(result.x).toBe(50);
        expect(result.y).toBe(50);
      });

      it('decreases width when dragging left', () => {
        const state = makeResizeState({ handle: 'e' });
        const result = computeResizeFrame(state, 150, 200, false);
        expect(result.width).toBe(50);
        expect(result.height).toBe(80);
      });
    });

    describe('west handle', () => {
      it('increases width and adjusts x when dragging left', () => {
        const state = makeResizeState({ handle: 'w' });
        const result = computeResizeFrame(state, 150, 200, false);
        expect(result.width).toBe(150);
        expect(result.x).toBe(0);
        expect(result.height).toBe(80);
      });

      it('decreases width and adjusts x when dragging right', () => {
        const state = makeResizeState({ handle: 'w' });
        const result = computeResizeFrame(state, 230, 200, false);
        expect(result.width).toBe(70);
        expect(result.x).toBe(80);
      });
    });

    describe('south handle', () => {
      it('increases height when dragging down', () => {
        const state = makeResizeState({ handle: 's' });
        const result = computeResizeFrame(state, 200, 260, false);
        expect(result.height).toBe(140);
        expect(result.width).toBe(100);
        expect(result.y).toBe(50);
      });
    });

    describe('north handle', () => {
      it('increases height and adjusts y when dragging up', () => {
        const state = makeResizeState({ handle: 'n' });
        const result = computeResizeFrame(state, 200, 150, false);
        expect(result.height).toBe(130);
        expect(result.y).toBe(0);
        expect(result.width).toBe(100);
      });
    });

    describe('corner handles', () => {
      it('se handle adjusts both width and height', () => {
        const state = makeResizeState({ handle: 'se' });
        const result = computeResizeFrame(state, 230, 240, false);
        expect(result.width).toBe(130);
        expect(result.height).toBe(120);
        expect(result.x).toBe(50);
        expect(result.y).toBe(50);
      });

      it('nw handle adjusts width, height, x, and y', () => {
        const state = makeResizeState({ handle: 'nw' });
        const result = computeResizeFrame(state, 170, 170, false);
        expect(result.width).toBe(130);
        expect(result.height).toBe(110);
        expect(result.x).toBe(20);
        expect(result.y).toBe(20);
      });

      it('ne handle adjusts width, height, and y', () => {
        const state = makeResizeState({ handle: 'ne' });
        const result = computeResizeFrame(state, 250, 150, false);
        expect(result.width).toBe(150);
        expect(result.height).toBe(130);
        expect(result.x).toBe(50);
        expect(result.y).toBe(0);
      });

      it('sw handle adjusts width, height, and x', () => {
        const state = makeResizeState({ handle: 'sw' });
        const result = computeResizeFrame(state, 170, 240, false);
        expect(result.width).toBe(130);
        expect(result.height).toBe(120);
        expect(result.x).toBe(20);
        expect(result.y).toBe(50);
      });
    });

    describe('minimum size clamping', () => {
      it('clamps width to MIN_NODE_SIZE (24) by default', () => {
        const state = makeResizeState({ handle: 'e' });
        const result = computeResizeFrame(state, 100, 200, false);
        // delta = -100, so width = 100 + (-100) = 0 => clamped to 24
        expect(result.width).toBe(24);
      });

      it('clamps height to MIN_NODE_SIZE (24) by default', () => {
        const state = makeResizeState({ handle: 's' });
        const result = computeResizeFrame(state, 200, 100, false);
        // delta = -100, so height = 80 + (-100) = -20 => clamped to 24
        expect(result.height).toBe(24);
      });

      it('uses custom minWidth when provided', () => {
        const state = makeResizeState({ handle: 'e', minWidth: 50 });
        const result = computeResizeFrame(state, 110, 200, false);
        // delta = -90, width = 100 + (-90) = 10 => clamped to 50
        expect(result.width).toBe(50);
      });

      it('uses custom minHeight when provided', () => {
        const state = makeResizeState({ handle: 's', minHeight: 40 });
        const result = computeResizeFrame(state, 200, 120, false);
        // delta = -80, height = 80 + (-80) = 0 => clamped to 40
        expect(result.height).toBe(40);
      });

      it('adjusts x when west handle is clamped', () => {
        const state = makeResizeState({ handle: 'w' });
        const result = computeResizeFrame(state, 330, 200, false);
        // delta = 130, width = 100 - 130 = -30 => clamped to 24
        // x should be adjusted: originX + delta = 50 + 130 = 180, then x -= minWidth - width => x -= 24 - (-30) = x -= 54 => 126
        // Actually: width before clamp = -30, minWidth = 24, so x -= (24 - (-30)) = x -= 54 => 180 - 54 = 126
        expect(result.width).toBe(24);
        expect(result.x).toBe(126);
      });

      it('adjusts y when north handle is clamped', () => {
        const state = makeResizeState({ handle: 'n' });
        const result = computeResizeFrame(state, 200, 330, false);
        // delta = 130, height = 80 - 130 = -50 => clamped to 24
        // y = originY + deltaY = 50 + 130 = 180, then y -= (24 - (-50)) => 180 - 74 = 106
        expect(result.height).toBe(24);
        expect(result.y).toBe(106);
      });
    });

    describe('shift key (aspect-ratio lock)', () => {
      it('locks aspect ratio on se corner handle', () => {
        const state = makeResizeState({
          handle: 'se',
          originWidth: 200,
          originHeight: 100,
        });
        // ratio = 200/100 = 2
        // Drag mostly horizontally
        const result = computeResizeFrame(state, 260, 210, true);
        // deltaX = 60, deltaY = 10
        // width = 200 + 60 = 260, height = 100 + 10 = 110
        // widthChange = 60/200 = 0.3, heightChange = 10/100 = 0.1
        // widthChange > heightChange => height = width / ratio = 260 / 2 = 130
        expect(result.width).toBe(260);
        expect(result.height).toBe(130);
      });

      it('locks aspect ratio based on height when height change is dominant', () => {
        const state = makeResizeState({
          handle: 'se',
          originWidth: 200,
          originHeight: 100,
        });
        // ratio = 200/100 = 2
        // Drag mostly vertically
        const result = computeResizeFrame(state, 210, 280, true);
        // deltaX = 10, deltaY = 80
        // width = 200 + 10 = 210, height = 100 + 80 = 180
        // widthChange = 10/200 = 0.05, heightChange = 80/100 = 0.8
        // heightChange > widthChange => width = height * ratio = 180 * 2 = 360
        expect(result.height).toBe(180);
        expect(result.width).toBe(360);
      });

      it('does not lock ratio on non-corner handles', () => {
        const state = makeResizeState({
          handle: 'e',
          originWidth: 200,
          originHeight: 100,
        });
        const result = computeResizeFrame(state, 260, 210, true);
        expect(result.width).toBe(260);
        expect(result.height).toBe(100); // unchanged, not locked
      });

      it('adjusts x for nw handle with aspect ratio lock', () => {
        const state = makeResizeState({
          handle: 'nw',
          originWidth: 200,
          originHeight: 100,
          originX: 100,
          originY: 100,
        });
        // ratio = 2
        const result = computeResizeFrame(state, 150, 180, true);
        // deltaX = -50, deltaY = -20
        // width = 200 - (-50) = 250, height = 100 - (-20) = 120
        // widthChange = 50/200 = 0.25, heightChange = 20/100 = 0.2
        // widthChange >= heightChange => height = width / ratio = 250 / 2 = 125
        // isWest: x = originX + (originWidth - width) = 100 + (200 - 250) = 50
        // isNorth: y = originY + (originHeight - height) = 100 + (100 - 125) = 75
        expect(result.width).toBe(250);
        expect(result.height).toBe(125);
        expect(result.x).toBe(50);
        expect(result.y).toBe(75);
      });

      it('applies scale-up when both axes would be under min size with shift', () => {
        const state = makeResizeState({
          handle: 'se',
          originWidth: 30,
          originHeight: 30,
        });
        // ratio = 1
        // Shrink past min
        const result = computeResizeFrame(state, 190, 190, true);
        // deltaX = -10, deltaY = -10 -> width=20, height=20
        // Both under 24 after first clamp
        // But shift re-scales: scale = max(1, 24/20, 24/20) = 1.2
        // width = 20 * 1.2 = 24, height = 20 * 1.2 = 24
        expect(result.width).toBe(24);
        expect(result.height).toBe(24);
      });
    });

    describe('no movement', () => {
      it('returns original dimensions when pointer does not move', () => {
        const state = makeResizeState({ handle: 'se' });
        const result = computeResizeFrame(state, 200, 200, false);
        expect(result.width).toBe(100);
        expect(result.height).toBe(80);
        expect(result.x).toBe(50);
        expect(result.y).toBe(50);
      });
    });
  });

  describe('getResizeCommitSize', () => {
    it('only changes width for east/west handles', () => {
      const node = makeNodeForCommit('100px', '80px');
      const state = makeResizeState({ handle: 'e' });
      const result = getResizeCommitSize(node, state, 150, 80);
      expect(result.width).toBe('150px');
      expect(result.height).toBe('80px');
    });

    it('only changes height for north/south handles', () => {
      const node = makeNodeForCommit('100px', '80px');
      const state = makeResizeState({ handle: 's' });
      const result = getResizeCommitSize(node, state, 100, 120);
      expect(result.width).toBe('100px');
      expect(result.height).toBe('120px');
    });

    it('changes both for corner handles', () => {
      const node = makeNodeForCommit('100px', '80px');
      const state = makeResizeState({ handle: 'se' });
      const result = getResizeCommitSize(node, state, 150, 120);
      expect(result.width).toBe('150px');
      expect(result.height).toBe('120px');
    });

    it('preserves original raw for unchanged axis', () => {
      const node = makeNodeForCommit('100px', 'auto');
      const state = makeResizeState({ handle: 'e' });
      const result = getResizeCommitSize(node, state, 200, 80);
      expect(result.width).toBe('200px');
      expect(result.height).toBe('auto');
    });
  });
});

// Helper to create a minimal node for getResizeCommitSize tests
function makeNodeForCommit(widthRaw: string, heightRaw: string) {
  const widthParsed = parseTestDimension(widthRaw);
  const heightParsed = parseTestDimension(heightRaw);
  return {
    id: 'node-1',
    contentType: 'text' as const,
    subtype: 'block' as const,
    parentId: null,
    children: [],
    name: 'Test',
    visible: true,
    locked: false,
    content: createTextDocumentFromText(''),
    htmlTag: 'p' as const,
    rect: {
      x: { base: { raw: '50px', parsed: { value: 50, unit: 'px' as const } } },
      y: { base: { raw: '50px', parsed: { value: 50, unit: 'px' as const } } },
      width: { base: { raw: widthRaw, parsed: widthParsed } },
      height: { base: { raw: heightRaw, parsed: heightParsed } },
    },
  } as Exclude<DocumentNode, { type: 'site' }>;
}

function parseTestDimension(raw: string) {
  const num = parseFloat(raw);
  if (raw.endsWith('px') && Number.isFinite(num)) {
    return { value: num, unit: 'px' as const };
  }
  if (raw.endsWith('%') && Number.isFinite(num)) {
    return { value: num, unit: '%' as const };
  }
  if (raw === 'auto') {
    return { keyword: 'auto' as const };
  }
  return { keyword: 'fit-content' as const };
}
