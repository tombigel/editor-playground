import { useEffect } from 'react';
import { getAdjacentStageSelection, type DocumentModel } from '../api/editorApi';
import type { PageId } from '../api/documentViewApi';
import { findMatchingShortcut, type ShortcutPlatform } from '@/lib/shortcuts';
import { executeEditorShortcut, type ShortcutUiState } from './shortcutController';
import { shouldUseEditorClipboard } from './editorClipboardContext';
import { getShortcutFocusContext } from './useEditorEnvironment';
import type { ShortcutExecutionHandlers } from './types';

type UseEditorKeyboardShortcutsArgs = {
  document: DocumentModel;
  activePageId: PageId | null;
  selectedId: string | null;
  selectedIds: string[];
  ui: ShortcutUiState;
  hasDismissiblePanels: boolean;
  shortcutPlatform: ShortcutPlatform;
  handlers: ShortcutExecutionHandlers;
  onSelect: (id: string) => void;
};

export function useEditorKeyboardShortcuts({
  document,
  activePageId,
  selectedId,
  selectedIds,
  ui,
  hasDismissiblePanels,
  shortcutPlatform,
  handlers,
  onSelect,
}: UseEditorKeyboardShortcutsArgs) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeElement = window.document.activeElement as HTMLElement | null;
      const focusContext = getShortcutFocusContext(activeElement);

      if (focusContext.hasStageFocus && event.key === 'Tab') {
        const nextSelection = getAdjacentStageSelection(
          document,
          selectedId,
          event.shiftKey ? 'backward' : 'forward',
          {
            activePageId,
            showHidden: ui.showHidden,
            selectedIds,
          },
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
          ...focusContext,
          hasSelection: selectedIds.length > 0,
          hasDismissiblePanels,
        },
        shortcutPlatform,
      );

      if (!shortcut) {
        return;
      }

      if (
        (shortcut.id === 'copySelection' || shortcut.id === 'pasteClipboard') &&
        !shouldUseEditorClipboard(event)
      ) {
        return;
      }

      event.preventDefault();
      executeEditorShortcut(shortcut, ui, event.shiftKey, handlers);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    document,
    activePageId,
    hasDismissiblePanels,
    onSelect,
    selectedId,
    selectedIds,
    shortcutPlatform,
    handlers,
    ui,
  ]);
}
