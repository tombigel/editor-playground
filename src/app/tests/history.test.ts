import { describe, expect, it } from 'vitest';
import { createInitialState, insertLeaf, updateTextField } from '../../editor/editorStore';
import { setPageTopLevelWrapperPlacement } from '../../api/documentApi';
import { createPage } from '../../model/pageDefaults';
import { buildHistoryEntry, clampHistoryLimit, deepEqual } from '../history';

describe('app/history', () => {
  it('treats structurally identical nested objects as equal', () => {
    expect(
      deepEqual(
        {
          pendingRoleSwap: {
            requestedId: 'section_1',
            targetRole: 'header',
            existingId: 'header_1',
          },
        },
        {
          pendingRoleSwap: {
            requestedId: 'section_1',
            targetRole: 'header',
            existingId: 'header_1',
          },
        },
      ),
    ).toBe(true);
  });

  it('builds no history entry when only pending role swap identity changes', () => {
    const swap = { requestedId: 'section_1', targetRole: 'header' as const, existingId: 'header_1' };
    const before = { ...createInitialState(), pendingRoleSwap: swap };
    const after = { ...before, pendingRoleSwap: { ...swap } };

    expect(before.pendingRoleSwap).not.toBe(after.pendingRoleSwap);
    expect(buildHistoryEntry(before, after, null, Date.now())).toBeNull();
  });

  it('tracks nested node changes without relying on string serialization', () => {
    const inserted = insertLeaf(createInitialState(), 'text');
    if (!inserted.selectedId) {
      throw new Error('Expected selected text node');
    }

    const updated = updateTextField(inserted, inserted.selectedId, 'content', 'Updated copy');
    const entry = buildHistoryEntry(inserted, updated, 'text', Date.now());

    expect(entry?.nodePatches).toHaveLength(1);
    expect(entry?.nodePatches[0]?.id).toBe(inserted.selectedId);
  });

  it('tracks multi-selection changes in history entries', () => {
    const before = insertLeaf(insertLeaf(createInitialState(), 'text'), 'text');
    const firstId = Object.keys(before.document.nodes).find(
      (nodeId) => before.document.nodes[nodeId]?.type === 'leaf' && nodeId !== before.selectedId,
    );
    if (!firstId || !before.selectedId) {
      throw new Error('Expected multiple selected candidates');
    }
    const ids = [before.selectedId, firstId];
    const beforeWithMulti = {
      ...before,
      selectedIds: ids,
    };
    const after = {
      ...before,
      selectedId: ids[1],
      selectedIds: [...ids].reverse(),
    };

    const entry = buildHistoryEntry(beforeWithMulti, after, null, Date.now());

    expect(entry?.selectedBefore).toBe(ids[0]);
    expect(entry?.selectedAfter).toBe(ids[1]);
    expect(entry?.selectedIdsBefore).toEqual(ids);
    expect(entry?.selectedIdsAfter).toEqual([...ids].reverse());
  });

  it('tracks shared region placement changes in history entries', () => {
    const state = createInitialState();
    const homePage = state.document.pages?.[0];
    const section = Object.values(state.document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!homePage || !section || section.type !== 'wrapper') {
      throw new Error('Expected home page and section wrapper');
    }

    const aboutPage = createPage({ displayName: 'About', slug: 'about' });
    const before = {
      ...state,
      document: {
        ...state.document,
        pages: [...(state.document.pages ?? []), aboutPage],
      },
    };
    const after = {
      ...before,
      document: setPageTopLevelWrapperPlacement(before.document, homePage.id, section.id, 'global'),
    };

    const entry = buildHistoryEntry(before, after, null, Date.now());

    expect(entry?.sharedRegionIdsBefore).toEqual(before.document.sharedRegionIds);
    expect(entry?.sharedRegionIdsAfter).toContain(section.id);
  });

  it('clamps history limits to the configured bounds', () => {
    expect(clampHistoryLimit(Number.NaN, 100, 1, 500)).toBe(100);
    expect(clampHistoryLimit(0, 100, 1, 500)).toBe(1);
    expect(clampHistoryLimit(999, 100, 1, 500)).toBe(500);
  });
});
