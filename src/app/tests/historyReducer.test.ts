import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../../api/editorApi';
import {
  DEFAULT_HISTORY_LIMIT,
  historyReducer,
  MAX_HISTORY_LIMIT,
  MIN_HISTORY_LIMIT,
  type HistoryState,
} from '../editorState';
import type { EditorState } from '../../editor/types';

function createTestHistoryState(present = createInitialState()): HistoryState {
  return {
    present,
    past: [],
    future: [],
    historyLimit: DEFAULT_HISTORY_LIMIT,
    activeResize: null,
  };
}

function withInsertedLeaf(state: HistoryState): { state: HistoryState; leafId: string } {
  const next = historyReducer(state, { type: 'insertLeaf', role: 'text' });
  const leafId = next.present.selectedId;
  if (!leafId) {
    throw new Error('Expected insertLeaf to select the new leaf');
  }
  return { state: next, leafId };
}

function getRectNode(document: EditorState['document'], nodeId: string) {
  const node = document.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    throw new Error(`Expected rect node ${nodeId}`);
  }
  return node;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('app/historyReducer resize lifecycle', () => {
  it('streams resize actions into present without history entries, then commits one entry on endResize', () => {
    const { state: withLeaf, leafId } = withInsertedLeaf(createTestHistoryState());
    const pastLengthBefore = withLeaf.past.length;
    const originalWidth = getRectNode(withLeaf.present.document, leafId).rect.width.base.raw;

    const began = historyReducer(withLeaf, { type: 'beginResize', id: leafId });
    expect(began.activeResize).toEqual({ nodeId: leafId, before: withLeaf.present });

    const streamed1 = historyReducer(began, { type: 'resize', id: leafId, width: '300px', height: '90px' });
    const streamed2 = historyReducer(streamed1, { type: 'resize', id: leafId, width: '320px', height: '95px' });
    expect(getRectNode(streamed2.present.document, leafId).rect.width.base.raw).toBe('320px');
    expect(streamed2.past).toHaveLength(pastLengthBefore);

    const ended = historyReducer(streamed2, { type: 'endResize', id: leafId });
    expect(ended.activeResize).toBeNull();
    expect(ended.past).toHaveLength(pastLengthBefore + 1);
    expect(ended.future).toEqual([]);

    const undone = historyReducer(ended, { type: 'undo' });
    expect(getRectNode(undone.present.document, leafId).rect.width.base.raw).toBe(originalWidth);
  });

  it('ignores a second beginResize while a resize is already active', () => {
    const { state: withLeaf, leafId } = withInsertedLeaf(createTestHistoryState());
    const began = historyReducer(withLeaf, { type: 'beginResize', id: leafId });

    expect(historyReducer(began, { type: 'beginResize', id: 'other_node' })).toBe(began);
  });

  it('ignores endResize when no resize is active or the node id does not match', () => {
    const { state: withLeaf, leafId } = withInsertedLeaf(createTestHistoryState());

    expect(historyReducer(withLeaf, { type: 'endResize', id: leafId })).toBe(withLeaf);

    const began = historyReducer(withLeaf, { type: 'beginResize', id: leafId });
    expect(historyReducer(began, { type: 'endResize', id: 'other_node' })).toBe(began);
  });

  it('clears activeResize without a history entry when the resize changed nothing', () => {
    const { state: withLeaf, leafId } = withInsertedLeaf(createTestHistoryState());
    const pastLengthBefore = withLeaf.past.length;

    const began = historyReducer(withLeaf, { type: 'beginResize', id: leafId });
    const ended = historyReducer(began, { type: 'endResize', id: leafId });

    expect(ended.activeResize).toBeNull();
    expect(ended.past).toHaveLength(pastLengthBefore);
    expect(ended.present).toBe(withLeaf.present);
  });

  it('blocks undo and redo while a resize is active', () => {
    const { state: withLeaf, leafId } = withInsertedLeaf(createTestHistoryState());
    const began = historyReducer(withLeaf, { type: 'beginResize', id: leafId });

    expect(historyReducer(began, { type: 'undo' })).toBe(began);
    expect(historyReducer(began, { type: 'redo' })).toBe(began);
  });
});

describe('app/historyReducer undo/redo', () => {
  it('is a no-op with an empty past (undo) or empty future (redo)', () => {
    const state = createTestHistoryState();
    expect(historyReducer(state, { type: 'undo' })).toBe(state);
    expect(historyReducer(state, { type: 'redo' })).toBe(state);
  });

  it('round-trips a node deletion restoring both the document and the selection', () => {
    const { state: withLeaf, leafId } = withInsertedLeaf(createTestHistoryState());

    const deleted = historyReducer(withLeaf, { type: 'deleteNode', id: leafId });
    expect(deleted.present.document.nodes[leafId]).toBeUndefined();

    const undone = historyReducer(deleted, { type: 'undo' });
    expect(undone.present.document.nodes[leafId]).toBeDefined();
    expect(undone.present.selectedId).toBe(leafId);
    expect(undone.present.selectedIds).toEqual([leafId]);
    expect(undone.future).toHaveLength(1);

    const redone = historyReducer(undone, { type: 'redo' });
    expect(redone.present.document.nodes[leafId]).toBeUndefined();
    expect(redone.future).toEqual([]);
  });

  it('clears the redo future when a new tracked action lands after an undo', () => {
    const { state: withLeaf, leafId } = withInsertedLeaf(createTestHistoryState());
    const deleted = historyReducer(withLeaf, { type: 'deleteNode', id: leafId });
    const undone = historyReducer(deleted, { type: 'undo' });
    expect(undone.future).toHaveLength(1);

    const diverged = historyReducer(undone, { type: 'insertLeaf', role: 'text' });
    expect(diverged.future).toEqual([]);
  });
});

describe('app/historyReducer history management actions', () => {
  it('clearHistory empties past, future, and activeResize while keeping present', () => {
    const { state: withLeaf, leafId } = withInsertedLeaf(createTestHistoryState());
    const began = historyReducer(withLeaf, { type: 'beginResize', id: leafId });

    const cleared = historyReducer(began, { type: 'clearHistory' });
    expect(cleared.past).toEqual([]);
    expect(cleared.future).toEqual([]);
    expect(cleared.activeResize).toBeNull();
    expect(cleared.present).toBe(began.present);
  });

  it('resetData resets the document and history but preserves the current ui settings', () => {
    const base = createTestHistoryState();
    const withTheme = historyReducer(base, { type: 'setAccentColor', value: '#ff6600' });
    const { state: withLeaf, leafId } = withInsertedLeaf(withTheme);

    const reset = historyReducer(withLeaf, { type: 'resetData' });
    expect(reset.present.document.nodes[leafId]).toBeUndefined();
    expect(reset.present.ui.accentColor).toBe('#ff6600');
    expect(reset.past).toEqual([]);
    expect(reset.future).toEqual([]);
    expect(reset.activeResize).toBeNull();
  });

  it('resetAll also resets ui settings and restores the default history limit', () => {
    const base = createTestHistoryState();
    const withTheme = historyReducer(base, { type: 'setAccentColor', value: '#ff6600' });
    const withLimit = historyReducer(withTheme, { type: 'setHistoryLimit', value: 5 });
    expect(withLimit.historyLimit).toBe(5);

    const reset = historyReducer(withLimit, { type: 'resetAll' });
    expect(reset.present.ui.accentColor).not.toBe('#ff6600');
    expect(reset.historyLimit).toBe(DEFAULT_HISTORY_LIMIT);
    expect(reset.past).toEqual([]);
    expect(reset.future).toEqual([]);
  });

  it('setHistoryLimit clamps out-of-range and non-finite values', () => {
    const state = createTestHistoryState();

    expect(historyReducer(state, { type: 'setHistoryLimit', value: 0 }).historyLimit).toBe(MIN_HISTORY_LIMIT);
    expect(historyReducer(state, { type: 'setHistoryLimit', value: 100000 }).historyLimit).toBe(MAX_HISTORY_LIMIT);
    expect(historyReducer(state, { type: 'setHistoryLimit', value: Number.NaN }).historyLimit).toBe(
      DEFAULT_HISTORY_LIMIT,
    );
  });

  it('setHistoryLimit trims the oldest past entries beyond the new limit', () => {
    let state = createTestHistoryState();
    for (let i = 0; i < 3; i += 1) {
      state = historyReducer(state, { type: 'insertLeaf', role: 'text' });
    }
    expect(state.past).toHaveLength(3);
    const newestEntry = state.past[2];

    const limited = historyReducer(state, { type: 'setHistoryLimit', value: 2 });
    expect(limited.past).toHaveLength(2);
    expect(limited.past[1]).toBe(newestEntry);
  });
});

describe('app/historyReducer tracked vs untracked actions', () => {
  it.each([
    ['setShowHidden', { type: 'setShowHidden', value: true } as const, (ui: EditorState['ui']) => ui.showHidden === true],
    ['setThemeMode', { type: 'setThemeMode', value: 'dark' } as const, (ui: EditorState['ui']) => ui.themeMode === 'dark'],
    [
      'setInspectorCollapsed',
      { type: 'setInspectorCollapsed', value: true } as const,
      (ui: EditorState['ui']) => ui.inspectorCollapsed === true,
    ],
    [
      'setFocusedPanelOffset',
      { type: 'setFocusedPanelOffset', value: { x: 12, y: 20 } } as const,
      (ui: EditorState['ui']) => ui.focusedPanelOffset.x === 12 && ui.focusedPanelOffset.y === 20,
    ],
  ])('%s updates present without pushing a history entry', (_name, action, uiMatches) => {
    const state = createTestHistoryState();
    const next = historyReducer(state, action);

    expect(uiMatches(next.present.ui)).toBe(true);
    expect(next.past).toEqual([]);
    expect(next.future).toEqual([]);
  });

  it('returns the same state reference when the editor action changes nothing', () => {
    const state = createTestHistoryState();
    // Deleting with an empty selection is a documented editorReducer no-op.
    expect(historyReducer(state, { type: 'delete' })).toBe(state);
  });
});

describe('app/historyReducer text debounce merging', () => {
  it('merges consecutive text edits on the same field into a single undo entry', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000);
    const { state: withLeaf, leafId } = withInsertedLeaf(createTestHistoryState());
    const pastLengthBefore = withLeaf.past.length;

    now.mockReturnValue(2_000);
    const first = historyReducer(withLeaf, { type: 'text', field: 'content', value: 'Hello' });
    now.mockReturnValue(2_200);
    const second = historyReducer(first, { type: 'text', field: 'content', value: 'Hello world' });

    // Two edits within the 450ms debounce window collapse into one entry.
    expect(second.past).toHaveLength(pastLengthBefore + 1);

    // A third edit outside the debounce window starts a new entry.
    now.mockReturnValue(5_000);
    const third = historyReducer(second, { type: 'text', field: 'content', value: 'Hello world!' });
    expect(third.past).toHaveLength(pastLengthBefore + 2);

    // Undoing the merged entry restores the pre-edit text in one step.
    const undoneOnce = historyReducer(third, { type: 'undo' });
    const undoneTwice = historyReducer(undoneOnce, { type: 'undo' });
    const node = undoneTwice.present.document.nodes[leafId];
    if (node.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(JSON.stringify(node.content)).not.toContain('Hello');
  });

  it('does not merge text edits on different fields', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000);
    const { state: withLeaf } = withInsertedLeaf(createTestHistoryState());
    const pastLengthBefore = withLeaf.past.length;

    now.mockReturnValue(2_000);
    const first = historyReducer(withLeaf, { type: 'text', field: 'content', value: 'Hello' });
    now.mockReturnValue(2_100);
    const second = historyReducer(first, { type: 'text', field: 'name', value: 'Renamed' });

    expect(second.past).toHaveLength(pastLengthBefore + 2);
  });
});
