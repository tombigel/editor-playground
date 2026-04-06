import { useEffect } from 'react';
import { getAdjacentStageSelection, type DocumentModel } from '../api/editorApi';
import { findMatchingShortcut, type ShortcutPlatform } from '@/lib/shortcuts';
import { executeEditorShortcut, type ShortcutUiState } from './shortcutController';
import { getShortcutFocusContext } from './useEditorEnvironment';
import type { ShortcutExecutionHandlers } from './types';

type UseEditorKeyboardShortcutsArgs = {
  document: DocumentModel;
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

      event.preventDefault();
      executeEditorShortcut(shortcut, ui, event.shiftKey, handlers);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    document,
    hasDismissiblePanels,
    onSelect,
    selectedId,
    selectedIds,
    shortcutPlatform,
    handlers,
    ui,
  ]);
}
