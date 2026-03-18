import { useEffect } from 'react';
import { getAdjacentStageSelection, type DocumentModel } from '../api/editorApi';
import { findMatchingShortcut, type ShortcutPlatform } from '@/lib/shortcuts';
import { executeEditorShortcut, type ShortcutUiState } from './shortcutController';
import type { AlignmentAction, DistributionMode } from './types';
import { hasStageKeyboardFocus, isInteractiveFocus } from './useEditorEnvironment';

type UseEditorKeyboardShortcutsArgs = {
  document: DocumentModel;
  selectedId: string | null;
  selectedIds: string[];
  ui: ShortcutUiState;
  hasDismissiblePanels: boolean;
  shortcutPlatform: ShortcutPlatform;
  onSelect: (id: string) => void;
  onClosePanels: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleSettings: () => void;
  onOpenShortcutHelp: () => void;
  onSetPreviewSticky: (value: boolean) => void;
  onSetSpacerVisibility: (value: 'selected' | 'all') => void;
  onSetSnapEnabled: (value: boolean) => void;
  onNudgeSelection: (deltaX: number, deltaY: number) => void;
  onDeleteSelection: () => void;
  onToggleBoldSelection: () => void;
  onToggleItalicSelection: () => void;
  onToggleUnderlineSelection: () => void;
  onToggleStrikethroughSelection: () => void;
  onAlignSelection: (mode: AlignmentAction) => void;
  onDistributeSelection: (mode: DistributionMode) => void;
  onOrderBack: () => void;
  onOrderForward: () => void;
  onOrderSendToBack: () => void;
  onOrderBringToFront: () => void;
};

export function useEditorKeyboardShortcuts({
  document,
  selectedId,
  selectedIds,
  ui,
  hasDismissiblePanels,
  shortcutPlatform,
  onSelect,
  onClosePanels,
  onUndo,
  onRedo,
  onToggleSettings,
  onOpenShortcutHelp,
  onSetPreviewSticky,
  onSetSpacerVisibility,
  onSetSnapEnabled,
  onNudgeSelection,
  onDeleteSelection,
  onToggleBoldSelection,
  onToggleItalicSelection,
  onToggleUnderlineSelection,
  onToggleStrikethroughSelection,
  onAlignSelection,
  onDistributeSelection,
  onOrderBack,
  onOrderForward,
  onOrderSendToBack,
  onOrderBringToFront,
}: UseEditorKeyboardShortcutsArgs) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeElement = window.document.activeElement as HTMLElement | null;
      const interactiveFocus = isInteractiveFocus(activeElement);
      const stageFocus = hasStageKeyboardFocus(activeElement);

      if (stageFocus && event.key === 'Tab') {
        const nextSelection = getAdjacentStageSelection(
          document,
          selectedId,
          event.shiftKey ? 'backward' : 'forward',
        );
        if (nextSelection) {
          event.preventDefault();
          onSelect(nextSelection);
        }
        return;
      }

      const shortcut = findMatchingShortcut(
        event,
        {
          interactiveFocus,
          hasSelection: selectedIds.length > 0,
          hasDismissiblePanels,
          hasStageFocus: stageFocus,
        },
        shortcutPlatform,
      );

      if (!shortcut) {
        return;
      }

      event.preventDefault();
      executeEditorShortcut(shortcut.id, ui, event.shiftKey, {
        closePanels: onClosePanels,
        undo: onUndo,
        redo: onRedo,
        toggleSettings: onToggleSettings,
        openShortcutHelp: onOpenShortcutHelp,
        setPreviewSticky: onSetPreviewSticky,
        setSpacerVisibility: onSetSpacerVisibility,
        setSnapEnabled: onSetSnapEnabled,
        nudgeSelection: onNudgeSelection,
        deleteSelection: onDeleteSelection,
        toggleBoldSelection: onToggleBoldSelection,
        toggleItalicSelection: onToggleItalicSelection,
        toggleUnderlineSelection: onToggleUnderlineSelection,
        toggleStrikethroughSelection: onToggleStrikethroughSelection,
        alignSelection: onAlignSelection,
        distributeSelection: onDistributeSelection,
        orderBack: onOrderBack,
        orderForward: onOrderForward,
        orderSendToBack: onOrderSendToBack,
        orderBringToFront: onOrderBringToFront,
      });
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    document,
    hasDismissiblePanels,
    onClosePanels,
    onDeleteSelection,
    onDistributeSelection,
    onNudgeSelection,
    onOpenShortcutHelp,
    onAlignSelection,
    onOrderBack,
    onOrderBringToFront,
    onOrderForward,
    onOrderSendToBack,
    onRedo,
    onSelect,
    onSetPreviewSticky,
    onSetSnapEnabled,
    onSetSpacerVisibility,
    onToggleBoldSelection,
    onToggleItalicSelection,
    onToggleSettings,
    onToggleStrikethroughSelection,
    onToggleUnderlineSelection,
    onUndo,
    selectedId,
    selectedIds,
    shortcutPlatform,
    ui,
  ]);
}
