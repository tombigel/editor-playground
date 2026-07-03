import { describe, expect, it, vi } from 'vitest';
import { SHORTCUT_DEFINITIONS } from '../../lib/shortcuts';
import { executeEditorShortcut, type ShortcutExecutionHandlers, type ShortcutUiState } from '../shortcutController';
import { DEFAULT_SNAP_SETTINGS } from '../../editor/types';

function createHandlers() {
  return {
    app: {
      openDocumentation: vi.fn(),
      openPreviewSite: vi.fn(),
    },
    history: {
      undo: vi.fn(),
      redo: vi.fn(),
    },
    panels: {
      closePanels: vi.fn(),
      toggleSettings: vi.fn(),
      openShortcuts: vi.fn(),
      toggleAiPanel: vi.fn(),
      toggleFontsPanel: vi.fn(),
      toggleComponentsPanel: vi.fn(),
      togglePagesPanel: vi.fn(),
    },
    viewState: {
      setShowHidden: vi.fn(),
      setPreviewSticky: vi.fn(),
      setAnimationPreview: vi.fn(),
      setSpacerVisibility: vi.fn(),
      setSnapSettings: vi.fn(),
      setShowGridLanes: vi.fn(),
      setShowDebugInfo: vi.fn(),
    },
    selection: {
      nudgeSelection: vi.fn(),
      deleteSelection: vi.fn(),
      copySelection: vi.fn(),
      pasteClipboard: vi.fn(),
      duplicateSelection: vi.fn(),
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
    },
  } satisfies ShortcutExecutionHandlers;
}

function getShortcut(shortcutId: (typeof SHORTCUT_DEFINITIONS)[number]['id']) {
  const shortcut = SHORTCUT_DEFINITIONS.find((item) => item.id === shortcutId);
  if (!shortcut) {
    throw new Error(`Missing shortcut ${shortcutId}`);
  }
  return shortcut;
}

const baseState: ShortcutUiState = {
  showHidden: true,
  previewSticky: true,
  animationPreview: {
    enabled: false,
    mode: 'passive',
    triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true },
  },
  spacerVisibility: 'selected',
  snapSettings: DEFAULT_SNAP_SETTINGS,
  showGridLanes: false,
  showDebugInfo: false,
};

describe('app/shortcutController', () => {
  it('toggles view-state shortcuts against current UI state', () => {
    const handlers = createHandlers();

    executeEditorShortcut(getShortcut('togglePreviewSticky'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleSpacerVisibility'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleSnapEnabled'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleShowHidden'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleShowGridLanes'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleShowDebugInfo'), baseState, false, handlers);

    expect(handlers.viewState.setPreviewSticky).toHaveBeenCalledWith(false);
    expect(handlers.viewState.setSpacerVisibility).toHaveBeenCalledWith('all');
    expect(handlers.viewState.setSnapSettings).toHaveBeenCalledWith({
      guideSnap: {
        enabled: false,
        threshold: 8,
        power: 1,
        maxSpeedPxPerSecond: 1200,
      },
    });
    expect(handlers.viewState.setShowHidden).toHaveBeenCalledWith(false);
    expect(handlers.viewState.setShowGridLanes).toHaveBeenCalledWith(true);
    expect(handlers.viewState.setShowDebugInfo).toHaveBeenCalledWith(true);
  });

  it('maps shift-modified nudge shortcuts to larger movement deltas', () => {
    const handlers = createHandlers();

    executeEditorShortcut(getShortcut('nudgeSelectionLeft'), baseState, true, handlers);
    executeEditorShortcut(getShortcut('nudgeSelectionDown'), baseState, false, handlers);

    expect(handlers.selection.nudgeSelection).toHaveBeenNthCalledWith(1, -10, 0);
    expect(handlers.selection.nudgeSelection).toHaveBeenNthCalledWith(2, 0, 1);
  });

  it('routes panel and arrange shortcuts to the matching handlers', () => {
    const handlers = createHandlers();

    executeEditorShortcut(getShortcut('dismissPanels'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('openSettings'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('showShortcutHelp'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('openDocumentation'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleAiPanel'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('openPreviewSite'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleFontsPanel'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleComponentsPanel'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('togglePagesPanel'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleBoldSelection'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('copySelection'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('pasteClipboard'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('duplicateSelection'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('toggleUnderlineSelection'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('alignSelectionLeft'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('distributeSelectionBottom'), baseState, false, handlers);
    executeEditorShortcut(getShortcut('orderBringToFront'), baseState, false, handlers);

    expect(handlers.panels.closePanels).toHaveBeenCalledOnce();
    expect(handlers.panels.toggleSettings).toHaveBeenCalledOnce();
    expect(handlers.panels.openShortcuts).toHaveBeenCalledOnce();
    expect(handlers.app.openDocumentation).toHaveBeenCalledOnce();
    expect(handlers.panels.toggleAiPanel).toHaveBeenCalledOnce();
    expect(handlers.app.openPreviewSite).toHaveBeenCalledOnce();
    expect(handlers.panels.toggleFontsPanel).toHaveBeenCalledOnce();
    expect(handlers.panels.toggleComponentsPanel).toHaveBeenCalledOnce();
    expect(handlers.panels.togglePagesPanel).toHaveBeenCalledOnce();
    expect(handlers.selection.toggleBoldSelection).toHaveBeenCalledOnce();
    expect(handlers.selection.copySelection).toHaveBeenCalledOnce();
    expect(handlers.selection.pasteClipboard).toHaveBeenCalledOnce();
    expect(handlers.selection.duplicateSelection).toHaveBeenCalledOnce();
    expect(handlers.selection.toggleUnderlineSelection).toHaveBeenCalledOnce();
    expect(handlers.selection.alignSelection).toHaveBeenCalledWith('left');
    expect(handlers.selection.distributeSelection).toHaveBeenCalledWith('bottom');
    expect(handlers.selection.orderBringToFront).toHaveBeenCalledOnce();
  });
});
