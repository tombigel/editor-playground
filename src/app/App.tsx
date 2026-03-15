import { useReducer, useState } from 'react';
import { type StickyGeometrySnapshot } from '../api/editorApi';
import { getShortcutPlatform } from '@/lib/shortcuts';
import { AppShell } from './AppShell';
import { importSettingsDocument, resetEditorData, resetEditorState, toActionResult } from './appSettingsActions';
import { createHistoryState, historyReducer } from './editorState';
import { useAppPanels } from './useAppPanels';
import { useAppRuntime } from './useAppRuntime';
import { useAppViewModel } from './useAppViewModel';
import { useEditorKeyboardShortcuts } from './useEditorKeyboardShortcuts';

export function App() {
  const [historyState, dispatch] = useReducer(historyReducer, undefined, createHistoryState);
  const state = historyState.present;
  const [stickyGeometry, setStickyGeometry] = useState<StickyGeometrySnapshot>({});
  const panels = useAppPanels();
  const shortcutPlatform = getShortcutPlatform();
  const viewModel = useAppViewModel(state, stickyGeometry);

  useAppRuntime(state, viewModel.resolvedTheme);

  useEditorKeyboardShortcuts({
    document: state.document,
    selectedId: state.selectedId,
    ui: {
      previewSticky: state.ui.previewSticky,
      spacerVisibility: state.ui.spacerVisibility,
      snapEnabled: state.ui.snapEnabled,
    },
    hasDismissiblePanels: panels.hasDismissiblePanels,
    shortcutPlatform,
    onSelect: (id) => dispatch({ type: 'select', id }),
    onClosePanels: panels.closeTransientPanels,
    onUndo: () => dispatch({ type: 'undo' }),
    onRedo: () => dispatch({ type: 'redo' }),
    onToggleSettings: () => panels.setSettingsOpen((open) => !open),
    onOpenShortcutHelp: () => panels.setShortcutHelpOpen(true),
    onSetPreviewSticky: (value) => dispatch({ type: 'setPreviewSticky', value }),
    onSetSpacerVisibility: (value) => dispatch({ type: 'setSpacerVisibility', value }),
    onSetSnapEnabled: (value) => dispatch({ type: 'setSnapEnabled', value }),
    onNudgeSelection: (deltaX, deltaY) => dispatch({ type: 'nudgeSelection', deltaX, deltaY }),
    onDeleteSelection: () => dispatch({ type: 'delete' }),
    onOrderBack: () => dispatch({ type: 'orderBack' }),
    onOrderForward: () => dispatch({ type: 'orderForward' }),
    onOrderSendToBack: () => dispatch({ type: 'orderSendToBack' }),
    onOrderBringToFront: () => dispatch({ type: 'orderBringToFront' }),
  });

  async function handleImportDocument(raw: string) {
    const result = importSettingsDocument(raw);
    if (result.ok) {
      dispatch({ type: 'importDocument', document: result.document });
    }
    return toActionResult(result);
  }

  function handleResetData() {
    resetEditorData(state.ui);
    dispatch({ type: 'resetData' });
  }

  function handleResetAll() {
    resetEditorState();
    dispatch({ type: 'resetAll' });
  }

  return (
    <AppShell
      state={state}
      historyState={historyState}
      selectedNode={viewModel.selectedNode}
      orderState={viewModel.orderState}
      sectionOrderState={viewModel.sectionOrderState}
      resolvedTheme={viewModel.resolvedTheme}
      shortcutPlatform={shortcutPlatform}
      topbarClass={viewModel.topbarClass}
      stageSelectableIds={viewModel.stageSelectableIds}
      settingsOpen={panels.settingsOpen}
      shortcutHelpOpen={panels.shortcutHelpOpen}
      sectionTemplateOpen={panels.sectionTemplateOpen}
      sectionTemplatePosition={panels.sectionTemplatePosition}
      settingsPanelRef={panels.settingsPanelRef}
      sectionTemplatePanelRef={panels.sectionTemplatePanelRef}
      documentJson={viewModel.documentJson}
      errors={viewModel.errors}
      stickyLayout={viewModel.stickyLayout}
      dispatch={dispatch}
      onStickyGeometryChange={setStickyGeometry}
      onOpenSectionTemplates={panels.openSectionTemplates}
      onSectionTemplateOpenChange={panels.handleSectionTemplateOpenChange}
      onCloseSectionTemplates={panels.closeSectionTemplatePopover}
      onSettingsOpenChange={panels.setSettingsOpen}
      onShortcutHelpOpenChange={panels.setShortcutHelpOpen}
      onImportDocument={handleImportDocument}
      onResetData={handleResetData}
      onResetAll={handleResetAll}
    />
  );
}
