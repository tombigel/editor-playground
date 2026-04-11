import type { ShortcutDefinition } from '@/lib/shortcuts';
import type { ShortcutExecutionHandlers, ShortcutUiState } from './types';
export type { ShortcutExecutionHandlers, ShortcutUiState } from './types';

type ShortcutExecutionHandler = (
  state: ShortcutUiState,
  shiftKey: boolean,
  handlers: ShortcutExecutionHandlers,
) => void;

const SHORTCUT_EXECUTION_REGISTRY: Record<
  ShortcutDefinition['execution']['actionId'],
  ShortcutExecutionHandler
> = {
  dismissPanels: (_state, _shiftKey, handlers) => {
    handlers.panels.closePanels();
  },
  undo: (_state, _shiftKey, handlers) => {
    handlers.history.undo();
  },
  redo: (_state, _shiftKey, handlers) => {
    handlers.history.redo();
  },
  openSettings: (_state, _shiftKey, handlers) => {
    handlers.panels.toggleSettings();
  },
  showShortcutHelp: (_state, _shiftKey, handlers) => {
    handlers.panels.openShortcuts();
  },
  toggleFontsPanel: (_state, _shiftKey, handlers) => {
    handlers.panels.toggleFontsPanel();
  },
  toggleComponentsPanel: (_state, _shiftKey, handlers) => {
    handlers.panels.toggleComponentsPanel();
  },
  togglePagesPanel: (_state, _shiftKey, handlers) => {
    handlers.panels.togglePagesPanel();
  },
  togglePreviewSticky: (state, _shiftKey, handlers) => {
    handlers.viewState.setPreviewSticky(!state.previewSticky);
  },
  toggleAnimationPreview: (state, _shiftKey, handlers) => {
    handlers.viewState.setAnimationPreview({ enabled: !state.animationPreview.enabled });
  },
  toggleSpacerVisibility: (state, _shiftKey, handlers) => {
    handlers.viewState.setSpacerVisibility(
      state.spacerVisibility === 'all' ? 'selected' : 'all',
    );
  },
  toggleSnapEnabled: (state, _shiftKey, handlers) => {
    handlers.viewState.setSnapSettings({
      guideSnap: {
        enabled: !state.snapSettings.guideSnap.enabled,
        threshold: state.snapSettings.guideSnap.threshold,
        power: state.snapSettings.guideSnap.power,
        maxSpeedPxPerSecond: state.snapSettings.guideSnap.maxSpeedPxPerSecond,
      },
    });
  },
  nudgeSelectionLeft: (_state, shiftKey, handlers) => {
    handlers.selection.nudgeSelection(shiftKey ? -10 : -1, 0);
  },
  nudgeSelectionRight: (_state, shiftKey, handlers) => {
    handlers.selection.nudgeSelection(shiftKey ? 10 : 1, 0);
  },
  nudgeSelectionUp: (_state, shiftKey, handlers) => {
    handlers.selection.nudgeSelection(0, shiftKey ? -10 : -1);
  },
  nudgeSelectionDown: (_state, shiftKey, handlers) => {
    handlers.selection.nudgeSelection(0, shiftKey ? 10 : 1);
  },
  deleteSelection: (_state, _shiftKey, handlers) => {
    handlers.selection.deleteSelection();
  },
  toggleBoldSelection: (_state, _shiftKey, handlers) => {
    handlers.selection.toggleBoldSelection();
  },
  toggleItalicSelection: (_state, _shiftKey, handlers) => {
    handlers.selection.toggleItalicSelection();
  },
  toggleUnderlineSelection: (_state, _shiftKey, handlers) => {
    handlers.selection.toggleUnderlineSelection();
  },
  toggleStrikethroughSelection: (_state, _shiftKey, handlers) => {
    handlers.selection.toggleStrikethroughSelection();
  },
  alignSelectionLeft: (_state, _shiftKey, handlers) => {
    handlers.selection.alignSelection('left');
  },
  alignSelectionCenterX: (_state, _shiftKey, handlers) => {
    handlers.selection.alignSelection('center-x');
  },
  alignSelectionRight: (_state, _shiftKey, handlers) => {
    handlers.selection.alignSelection('right');
  },
  alignSelectionTop: (_state, _shiftKey, handlers) => {
    handlers.selection.alignSelection('top');
  },
  alignSelectionCenterY: (_state, _shiftKey, handlers) => {
    handlers.selection.alignSelection('center-y');
  },
  alignSelectionBottom: (_state, _shiftKey, handlers) => {
    handlers.selection.alignSelection('bottom');
  },
  distributeSelectionHorizontal: (_state, _shiftKey, handlers) => {
    handlers.selection.distributeSelection('horizontal');
  },
  distributeSelectionVertical: (_state, _shiftKey, handlers) => {
    handlers.selection.distributeSelection('vertical');
  },
  distributeSelectionLeft: (_state, _shiftKey, handlers) => {
    handlers.selection.distributeSelection('left');
  },
  distributeSelectionRight: (_state, _shiftKey, handlers) => {
    handlers.selection.distributeSelection('right');
  },
  distributeSelectionTop: (_state, _shiftKey, handlers) => {
    handlers.selection.distributeSelection('top');
  },
  distributeSelectionBottom: (_state, _shiftKey, handlers) => {
    handlers.selection.distributeSelection('bottom');
  },
  orderBack: (_state, _shiftKey, handlers) => {
    handlers.selection.orderBack();
  },
  orderForward: (_state, _shiftKey, handlers) => {
    handlers.selection.orderForward();
  },
  orderSendToBack: (_state, _shiftKey, handlers) => {
    handlers.selection.orderSendToBack();
  },
  orderBringToFront: (_state, _shiftKey, handlers) => {
    handlers.selection.orderBringToFront();
  },
};

export function executeEditorShortcut(
  shortcut: ShortcutDefinition,
  state: ShortcutUiState,
  shiftKey: boolean,
  handlers: ShortcutExecutionHandlers,
) {
  SHORTCUT_EXECUTION_REGISTRY[shortcut.execution.actionId](state, shiftKey, handlers);
}
