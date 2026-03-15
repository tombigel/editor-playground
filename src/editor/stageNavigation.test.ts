import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../model/defaults';
import { getAdjacentStageSelection, getStageSelectableNodeIds } from './stageNavigation';

describe('editor/stageNavigation', () => {
  it('returns stage-selectable nodes in pre-order DOM traversal', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }

    const firstTopLevelId = root.children[0];
    const firstTopLevel = document.nodes[firstTopLevelId];
    if (!firstTopLevel || firstTopLevel.type === 'site') {
      throw new Error('Expected top-level wrapper');
    }

    const ids = getStageSelectableNodeIds(document);

    expect(ids[0]).toBe(firstTopLevelId);
    expect(ids[1]).toBe(firstTopLevel.children[0]);
  });

  it('finds adjacent stage selections and stops at the boundaries', () => {
    const document = createInitialDocument();
    const ids = getStageSelectableNodeIds(document);
    const first = ids[0] ?? null;
    const second = ids[1] ?? null;
    const last = ids[ids.length - 1] ?? null;

    expect(getAdjacentStageSelection(document, null, 'forward')).toBe(first);
    expect(getAdjacentStageSelection(document, first, 'forward')).toBe(second);
    expect(getAdjacentStageSelection(document, first, 'backward')).toBeNull();
    expect(getAdjacentStageSelection(document, last, 'forward')).toBeNull();
  });
});
