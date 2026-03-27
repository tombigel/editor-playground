import type { ShortcutId } from '@/lib/shortcuts';
import type { ShortcutExecutionHandlers, ShortcutUiState } from './types';
export type { ShortcutExecutionHandlers, ShortcutUiState } from './types';

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
    case 'toggleAnimationPreview':
      handlers.setAnimationPreview({ enabled: !state.animationPreview.enabled });
      return;
    case 'toggleSpacerVisibility':
      handlers.setSpacerVisibility(state.spacerVisibility === 'all' ? 'selected' : 'all');
      return;
    case 'toggleSnapEnabled':
      handlers.setSnapSettings({
        guideSnap: {
          enabled: !state.snapSettings.guideSnap.enabled,
          threshold: state.snapSettings.guideSnap.threshold,
          power: state.snapSettings.guideSnap.power,
          maxSpeedPxPerSecond: state.snapSettings.guideSnap.maxSpeedPxPerSecond,
        },
      });
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
    case 'toggleBoldSelection':
      handlers.toggleBoldSelection();
      return;
    case 'toggleItalicSelection':
      handlers.toggleItalicSelection();
      return;
    case 'toggleUnderlineSelection':
      handlers.toggleUnderlineSelection();
      return;
    case 'toggleStrikethroughSelection':
      handlers.toggleStrikethroughSelection();
      return;
    case 'alignSelectionLeft':
      handlers.alignSelection('left');
      return;
    case 'alignSelectionCenterX':
      handlers.alignSelection('center-x');
      return;
    case 'alignSelectionRight':
      handlers.alignSelection('right');
      return;
    case 'alignSelectionTop':
      handlers.alignSelection('top');
      return;
    case 'alignSelectionCenterY':
      handlers.alignSelection('center-y');
      return;
    case 'alignSelectionBottom':
      handlers.alignSelection('bottom');
      return;
    case 'distributeSelectionHorizontal':
      handlers.distributeSelection('horizontal');
      return;
    case 'distributeSelectionVertical':
      handlers.distributeSelection('vertical');
      return;
    case 'distributeSelectionLeft':
      handlers.distributeSelection('left');
      return;
    case 'distributeSelectionRight':
      handlers.distributeSelection('right');
      return;
    case 'distributeSelectionTop':
      handlers.distributeSelection('top');
      return;
    case 'distributeSelectionBottom':
      handlers.distributeSelection('bottom');
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
