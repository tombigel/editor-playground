import { describe, expect, it } from 'vitest';
import { createInitialState, insertLeaf, insertWrapper } from '../../api/editorApi';
import { editorReducer, historyReducer, type HistoryState } from '../editorState';

function createTestHistoryState(): HistoryState {
  return {
    present: createInitialState(),
    past: [],
    future: [],
    historyLimit: 100,
    activeResize: null,
  };
}

describe('app/editorState', () => {
  it('keeps preview toggles out of undo history', () => {
    const initial = createTestHistoryState();

    const next = historyReducer(initial, { type: 'setPreviewSticky', value: false });

    expect(next.present.ui.previewSticky).toBe(false);
    expect(next.past).toHaveLength(0);
    expect(next.future).toHaveLength(0);
  });

  it('keeps focused mode actions out of undo history', () => {
    const initial = createTestHistoryState();

    const next = historyReducer(initial, { type: 'setFocusedMode', value: 'sticky' });

    expect(next.present.ui.focusedMode).toBe('sticky');
    expect(next.past).toHaveLength(0);
    expect(next.future).toHaveLength(0);
  });

  it('clears temporary inspector state when entering and leaving focused mode', () => {
    const initial = createInitialState();
    const entered = editorReducer(initial, { type: 'setFocusedMode', value: 'sticky' });
    const opened = editorReducer(entered, { type: 'setTemporaryInspectorOpen', value: true });
    const exited = editorReducer(opened, { type: 'setFocusedMode', value: null });

    expect(entered.ui.temporaryInspectorOpen).toBe(false);
    expect(entered.ui.inspectorCollapsed).toBe(true);
    expect(opened.ui.temporaryInspectorOpen).toBe(true);
    expect(exited.ui.temporaryInspectorOpen).toBe(false);
    expect(exited.ui.inspectorCollapsed).toBe(false);
  });

  it('prevents temporary inspector open when no focused mode is active', () => {
    const initial = createInitialState();
    const next = editorReducer(initial, { type: 'setTemporaryInspectorOpen', value: true });

    expect(next.ui.temporaryInspectorOpen).toBe(false);
  });

  it('updates startup mode without changing the current focused mode', () => {
    const initial = createInitialState();
    const next = editorReducer(initial, { type: 'setStartupFocusedMode', value: 'sticky' });

    expect(next.ui.startupFocusedMode).toBe('sticky');
    expect(next.ui.focusedMode).toBeNull();
  });

  it('coalesces resize streams into a single history entry when the resize ends', () => {
    let present = createInitialState();
    present = insertLeaf(present, 'text');
    if (!present.selectedId) {
      throw new Error('Expected selected leaf after insertion');
    }

    const before = {
      present,
      past: [],
      future: [],
      historyLimit: 100,
      activeResize: null,
    } satisfies HistoryState;

    const resizing = historyReducer(before, { type: 'beginResize', id: present.selectedId });
    const duringResize = historyReducer(resizing, {
      type: 'resize',
      id: present.selectedId,
      width: '320px',
      height: '160px',
    });
    const completed = historyReducer(duringResize, { type: 'endResize', id: present.selectedId });

    expect(duringResize.past).toHaveLength(0);
    expect(completed.activeResize).toBeNull();
    expect(completed.past).toHaveLength(1);
  });

  it('forces container wrappers to keep self sticky targeting', () => {
    let state = createInitialState();
    state = insertWrapper(state, 'section');
    state = insertWrapper(state, 'container');
    if (!state.selectedId) {
      throw new Error('Expected selected container after insertion');
    }

    const next = editorReducer(state, { type: 'stickyTarget', value: 'contentWrapper' });
    const sticky = next.document.nodes[state.selectedId];

    expect(sticky?.type).toBe('wrapper');
    if (sticky?.type !== 'wrapper') {
      throw new Error('Expected wrapper node');
    }
    expect(sticky.sticky?.target).toBe('self');
  });
});
