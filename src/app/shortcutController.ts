import type { ShortcutId } from '@/lib/shortcuts';

export type ShortcutUiState = {
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  snapEnabled: boolean;
};

export type ShortcutExecutionHandlers = {
  closePanels: () => void;
  undo: () => void;
  redo: () => void;
  toggleSettings: () => void;
  openShortcutHelp: () => void;
  setPreviewSticky: (value: boolean) => void;
  setSpacerVisibility: (value: 'selected' | 'all') => void;
  setSnapEnabled: (value: boolean) => void;
  nudgeSelection: (deltaX: number, deltaY: number) => void;
  deleteSelection: () => void;
  orderBack: () => void;
  orderForward: () => void;
  orderSendToBack: () => void;
  orderBringToFront: () => void;
};

export function executeEditorShortcut(
  shortcutId: ShortcutId,
  state: ShortcutUiState,
  shiftKey: boolean,
  handlers: ShortcutExecutionHandlers,
) {
  switch (shortcutId) {
    case 'dismissPanels':
      handlers.closePanels();
      return;
    case 'undo':
      handlers.undo();
      return;
    case 'redo':
      handlers.redo();
      return;
    case 'openSettings':
      handlers.toggleSettings();
      return;
    case 'showShortcutHelp':
      handlers.openShortcutHelp();
      return;
    case 'togglePreviewSticky':
      handlers.setPreviewSticky(!state.previewSticky);
      return;
    case 'toggleSpacerVisibility':
      handlers.setSpacerVisibility(state.spacerVisibility === 'all' ? 'selected' : 'all');
      return;
    case 'toggleSnapEnabled':
      handlers.setSnapEnabled(!state.snapEnabled);
      return;
    case 'nudgeSelectionLeft':
      handlers.nudgeSelection(shiftKey ? -10 : -1, 0);
      return;
    case 'nudgeSelectionRight':
      handlers.nudgeSelection(shiftKey ? 10 : 1, 0);
      return;
    case 'nudgeSelectionUp':
      handlers.nudgeSelection(0, shiftKey ? -10 : -1);
      return;
    case 'nudgeSelectionDown':
      handlers.nudgeSelection(0, shiftKey ? 10 : 1);
      return;
    case 'deleteSelection':
      handlers.deleteSelection();
      return;
    case 'orderBack':
      handlers.orderBack();
      return;
    case 'orderForward':
      handlers.orderForward();
      return;
    case 'orderSendToBack':
      handlers.orderSendToBack();
      return;
    case 'orderBringToFront':
      handlers.orderBringToFront();
      return;
    default:
      assertNever(shortcutId);
  }
}

function assertNever(value: never) {
  throw new Error(`Unhandled shortcut: ${String(value)}`);
}
