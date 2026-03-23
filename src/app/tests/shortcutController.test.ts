import { describe, expect, it, vi } from 'vitest';
import { executeEditorShortcut, type ShortcutExecutionHandlers, type ShortcutUiState } from '../shortcutController';
import { DEFAULT_SNAP_SETTINGS } from '../../editor/types';

function createHandlers() {
  return {
    closePanels: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    toggleSettings: vi.fn(),
    openShortcutHelp: vi.fn(),
    setPreviewSticky: vi.fn(),
    setSpacerVisibility: vi.fn(),
    setSnapSettings: vi.fn(),
    nudgeSelection: vi.fn(),
    deleteSelection: vi.fn(),
    toggleBoldSelection: vi.fn(),
    toggleItalicSelection: vi.fn(),
    toggleUnderlineSelection: vi.fn(),
    toggleStrikethroughSelection: vi.fn(),
    alignSelection: vi.fn(),
    distributeSelection: vi.fn(),
    orderBack: vi.fn(),
    orderForward: vi.fn(),
    orderSendToBack: vi.fn(),
    orderBringToFront: vi.fn(),
  } satisfies ShortcutExecutionHandlers;
}

const baseState: ShortcutUiState = {
  previewSticky: true,
  spacerVisibility: 'selected',
  snapSettings: DEFAULT_SNAP_SETTINGS,
};

describe('app/shortcutController', () => {
  it('toggles view-state shortcuts against current UI state', () => {
    const handlers = createHandlers();

    executeEditorShortcut('togglePreviewSticky', baseState, false, handlers);
    executeEditorShortcut('toggleSpacerVisibility', baseState, false, handlers);
    executeEditorShortcut('toggleSnapEnabled', baseState, false, handlers);

    expect(handlers.setPreviewSticky).toHaveBeenCalledWith(false);
    expect(handlers.setSpacerVisibility).toHaveBeenCalledWith('all');
    expect(handlers.setSnapSettings).toHaveBeenCalledWith({ guideSnap: { enabled: false, threshold: 8, power: 1 } });
  });

  it('maps shift-modified nudge shortcuts to larger movement deltas', () => {
    const handlers = createHandlers();

    executeEditorShortcut('nudgeSelectionLeft', baseState, true, handlers);
    executeEditorShortcut('nudgeSelectionDown', baseState, false, handlers);

    expect(handlers.nudgeSelection).toHaveBeenNthCalledWith(1, -10, 0);
    expect(handlers.nudgeSelection).toHaveBeenNthCalledWith(2, 0, 1);
  });

  it('routes panel and arrange shortcuts to the matching handlers', () => {
    const handlers = createHandlers();

    executeEditorShortcut('dismissPanels', baseState, false, handlers);
    executeEditorShortcut('openSettings', baseState, false, handlers);
    executeEditorShortcut('showShortcutHelp', baseState, false, handlers);
    executeEditorShortcut('toggleBoldSelection', baseState, false, handlers);
    executeEditorShortcut('toggleUnderlineSelection', baseState, false, handlers);
    executeEditorShortcut('alignSelectionLeft', baseState, false, handlers);
    executeEditorShortcut('distributeSelectionBottom', baseState, false, handlers);
    executeEditorShortcut('orderBringToFront', baseState, false, handlers);

    expect(handlers.closePanels).toHaveBeenCalledOnce();
    expect(handlers.toggleSettings).toHaveBeenCalledOnce();
    expect(handlers.openShortcutHelp).toHaveBeenCalledOnce();
    expect(handlers.toggleBoldSelection).toHaveBeenCalledOnce();
    expect(handlers.toggleUnderlineSelection).toHaveBeenCalledOnce();
    expect(handlers.alignSelection).toHaveBeenCalledWith('left');
    expect(handlers.distributeSelection).toHaveBeenCalledWith('bottom');
    expect(handlers.orderBringToFront).toHaveBeenCalledOnce();
  });
});
