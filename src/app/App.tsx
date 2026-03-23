import { useReducer, useState } from 'react';
import type { StickyGeometrySnapshot } from '../api/editorApi';
import {
  BOLD_FONT_WEIGHT,
  DEFAULT_FONT_WEIGHT,
  getDocumentDefaultFontFamily,
  getDocumentFontFamily,
  isBoldFontWeight,
  resolveNearestSupportedFontWeight,
} from '../api/fontApi';
import { getShortcutPlatform } from '@/lib/shortcuts';
import { AppShell } from './AppShell';
import { importSettingsDocument, resetEditorData, resetEditorState, toActionResult } from './appSettingsActions';
import { createHistoryState, historyReducer } from './editorState';
import type { AlignmentAction, BulkEditOperation, DistributionMode } from './types';
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

  function collectSelectionRects() {
    if (typeof window === 'undefined') {
      return {};
    }

    return Object.fromEntries(
      state.selectedIds.flatMap((nodeId) => {
        const element = window.document.getElementById(`stage-node-${nodeId}`);
        if (!element) {
          return [];
        }
        const rect = element.getBoundingClientRect();
        return [[nodeId, { left: rect.left, top: rect.top, width: rect.width, height: rect.height }]];
      }),
    );
  }

  function getSelectedTypographyNodes() {
    return viewModel.selectedNodes.filter(
      (node): node is Extract<(typeof viewModel.selectedNodes)[number], { type: 'leaf'; role: 'text' | 'link' | 'button' }> =>
        node.type === 'leaf' && (node.role === 'text' || node.role === 'link' || node.role === 'button'),
    );
  }

  function dispatchSelectedTextEdit(
    field: 'fontWeight' | 'fontStyle' | 'textDecorationLine',
    resolveValue: (nodes: ReturnType<typeof getSelectedTypographyNodes>) => string,
  ) {
    const nodes = getSelectedTypographyNodes();
    if (nodes.length === 0) {
      return;
    }
    const operations: BulkEditOperation[] = [
      { kind: 'text', targetIds: nodes.map((node) => node.id), field, value: resolveValue(nodes) },
    ];
    dispatch({ type: 'bulkEdit', operations });
  }

  function dispatchBoldToggleSelection() {
    const nodes = getSelectedTypographyNodes();
    if (nodes.length === 0) {
      return;
    }

    const disableBold = nodes.every((node) => isBoldFontWeight(node.style?.fontWeight));
    const targetWeight = disableBold ? DEFAULT_FONT_WEIGHT : BOLD_FONT_WEIGHT;
    const operations: BulkEditOperation[] = nodes.map((node) => ({
      kind: 'text',
      targetIds: [node.id],
      field: 'fontWeight',
      value: String(
        resolveNearestSupportedFontWeight(
          targetWeight,
          node.style?.fontFamily
            ? getDocumentFontFamily(state.document, node.style.fontFamily)
            : getDocumentDefaultFontFamily(state.document),
        ),
      ),
    }));

    dispatch({ type: 'bulkEdit', operations });
  }

  function toggleTextDecoration(value: string, target: 'underline' | 'line-through') {
    const hasUnderline = value.includes('underline');
    const hasLineThrough = value.includes('line-through');
    const nextUnderline = target === 'underline' ? !hasUnderline : hasUnderline;
    const nextLineThrough = target === 'line-through' ? !hasLineThrough : hasLineThrough;
    if (nextUnderline && nextLineThrough) {
      return 'underline line-through';
    }
    if (nextUnderline) {
      return 'underline';
    }
    if (nextLineThrough) {
      return 'line-through';
    }
    return 'none';
  }

  useAppRuntime(state, viewModel.resolvedTheme);

  useEditorKeyboardShortcuts({
    document: state.document,
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    ui: {
      previewSticky: state.ui.previewSticky,
      spacerVisibility: state.ui.spacerVisibility,
      snapSettings: state.ui.snapSettings,
    },
    hasDismissiblePanels: panels.hasDismissiblePanels || state.ui.temporaryInspectorOpen,
    shortcutPlatform,
    onSelect: (id) => dispatch({ type: 'select', id }),
    onClosePanels: () => {
      panels.closeTransientPanels();
      dispatch({ type: 'setTemporaryInspectorOpen', value: false });
    },
    onUndo: () => dispatch({ type: 'undo' }),
    onRedo: () => dispatch({ type: 'redo' }),
    onToggleSettings: () => panels.setSettingsOpen((open) => !open),
    onOpenShortcutHelp: () => panels.setShortcutHelpOpen(true),
    onSetPreviewSticky: (value) => dispatch({ type: 'setPreviewSticky', value }),
    onSetSpacerVisibility: (value) => dispatch({ type: 'setSpacerVisibility', value }),
    onSetSnapSettings: (value) => dispatch({ type: 'setSnapSettings', value }),
    onNudgeSelection: (deltaX, deltaY) => dispatch({ type: 'nudgeSelection', deltaX, deltaY }),
    onDeleteSelection: () => dispatch({ type: 'delete' }),
    onToggleBoldSelection: () => dispatchBoldToggleSelection(),
    onToggleItalicSelection: () =>
      dispatchSelectedTextEdit('fontStyle', (nodes) =>
        nodes.every((node) => (node.style?.fontStyle ?? 'normal') === 'italic') ? 'normal' : 'italic',
      ),
    onToggleUnderlineSelection: () =>
      dispatchSelectedTextEdit('textDecorationLine', (nodes) => {
        const shared = nodes
          .map((node) => node.style?.textDecorationLine ?? 'none')
          .reduce<string | null>((current, value) => (current == null || current === value ? value : ''), null) ?? 'none';
        return toggleTextDecoration(shared, 'underline');
      }),
    onToggleStrikethroughSelection: () =>
      dispatchSelectedTextEdit('textDecorationLine', (nodes) => {
        const shared = nodes
          .map((node) => node.style?.textDecorationLine ?? 'none')
          .reduce<string | null>((current, value) => (current == null || current === value ? value : ''), null) ?? 'none';
        return toggleTextDecoration(shared, 'line-through');
      }),
    onAlignSelection: (mode: AlignmentAction) =>
      dispatch({ type: 'alignSelection', mode, rects: collectSelectionRects() }),
    onDistributeSelection: (mode: DistributionMode) =>
      dispatch({ type: 'distributeSelection', mode, rects: collectSelectionRects() }),
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
      selectedNodes={viewModel.selectedNodes}
      orderState={viewModel.orderState}
      sectionOrderState={viewModel.sectionOrderState}
      resolvedTheme={viewModel.resolvedTheme}
      shortcutPlatform={shortcutPlatform}
      topbarClass={viewModel.topbarClass}
      stageSelectableIds={viewModel.stageSelectableIds}
      settingsOpen={panels.settingsOpen}
      manageFontsOpen={panels.manageFontsOpen}
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
      onManageFontsOpenChange={panels.setManageFontsOpen}
      onShortcutHelpOpenChange={panels.setShortcutHelpOpen}
      onImportDocument={handleImportDocument}
      onResetData={handleResetData}
      onResetAll={handleResetAll}
    />
  );
}
