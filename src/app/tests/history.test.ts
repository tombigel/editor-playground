import { describe, expect, it } from 'vitest';
import { createInitialState, insertLeaf, updateTextField } from '../../editor/editorStore';
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
    const before = createInitialState();
    const after = {
      ...before,
      pendingRoleSwap: before.pendingRoleSwap ? { ...before.pendingRoleSwap } : null,
    };

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

  it('clamps history limits to the configured bounds', () => {
    expect(clampHistoryLimit(Number.NaN, 100, 1, 500)).toBe(100);
    expect(clampHistoryLimit(0, 100, 1, 500)).toBe(1);
    expect(clampHistoryLimit(999, 100, 1, 500)).toBe(500);
  });
});
