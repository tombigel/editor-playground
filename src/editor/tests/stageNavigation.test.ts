import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { getAdjacentStageSelection, getStageSelectableNodeIds } from '../stageNavigation';

describe('editor/stageNavigation', () => {
  it('returns stage-selectable nodes in pre-order DOM traversal', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }

    const firstTopLevelId = root.children[0];
    const firstTopLevel = document.nodes[firstTopLevelId];
    if (!firstTopLevel || firstTopLevel.contentType === 'site') {
      throw new Error('Expected top-level wrapper');
    }

    const ids = getStageSelectableNodeIds(document, { showHidden: false });

    expect(ids[0]).toBe(firstTopLevelId);
    expect(ids[1]).toBe(firstTopLevel.children[0]);
  });

  it('finds adjacent stage selections and stops at the boundaries', () => {
    const document = createInitialDocument();
    const ids = getStageSelectableNodeIds(document, { showHidden: false });
    const first = ids[0] ?? null;
    const second = ids[1] ?? null;
    const last = ids[ids.length - 1] ?? null;

    expect(getAdjacentStageSelection(document, null, 'forward', { showHidden: false })).toBe(first);
    expect(getAdjacentStageSelection(document, first, 'forward', { showHidden: false })).toBe(second);
    expect(getAdjacentStageSelection(document, first, 'backward', { showHidden: false })).toBeNull();
    expect(getAdjacentStageSelection(document, last, 'forward', { showHidden: false })).toBeNull();
  });

  it('skips hidden nodes and their descendants when hidden ghosts are disabled', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const hiddenChildId = section.children[0];
    section.visible = false;

    const ids = getStageSelectableNodeIds(document, { showHidden: false });

    expect(ids).not.toContain(section.id);
    expect(ids).not.toContain(hiddenChildId);
    expect(getAdjacentStageSelection(document, hiddenChildId, 'forward', { showHidden: false })).not.toBe(hiddenChildId);
  });

  it('includes hidden nodes when hidden ghosts are enabled', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const hiddenChildId = section.children[0];
    section.visible = false;

    const ids = getStageSelectableNodeIds(document, { showHidden: true });

    expect(ids).toContain(section.id);
    expect(ids).toContain(hiddenChildId);
  });
});
