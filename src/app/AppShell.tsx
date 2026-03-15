import type { Dispatch, Ref } from 'react';
import { CircleQuestionMark, Eye, Magnet, Redo2, Settings, Undo2 } from 'lucide-react';
import type {
  DocumentNode,
  EditorState,
  StickyGeometrySnapshot,
  StickyLayoutState,
} from '../api/editorApi';
import { InsertPanel } from '../panels/InsertPanel';
import { InspectorPanel } from '../panels/InspectorPanel';
import { ShortcutHelpDialog } from '../panels/ShortcutHelpDialog';
import { SettingsPanel } from '../panels/SettingsPanel';
import type { ActionResult } from '../panels/settingsTransfer';
import { Stage } from '../api/editorViewApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PopoverSurface } from '@/components/ui/popover';
import { getShortcutLabel, type ShortcutPlatform } from '@/lib/shortcuts';
import type { ResolvedTheme } from '@/lib/theme';
import { RailToggleButton, SectionTemplatePopover, SpacerIcon, TopbarIconAction } from './AppChrome';
import type { HistoryAction, HistoryState } from './editorState';

type Props = {
  state: EditorState;
  historyState: Pick<HistoryState, 'past' | 'future' | 'historyLimit'>;
  selectedNode: DocumentNode | null;
  orderState: { show: boolean; canBack: boolean; canForward: boolean };
  sectionOrderState: { canBack: boolean; canForward: boolean };
  resolvedTheme: ResolvedTheme;
  shortcutPlatform: ShortcutPlatform;
  topbarClass: string;
  stageSelectableIds: string[];
  settingsOpen: boolean;
  shortcutHelpOpen: boolean;
  sectionTemplateOpen: boolean;
  sectionTemplatePosition: { top: number; left: number };
  settingsPanelRef: Ref<HTMLDivElement>;
  sectionTemplatePanelRef: Ref<HTMLDivElement>;
  documentJson: string;
  errors: string[];
  stickyLayout: StickyLayoutState;
  dispatch: Dispatch<HistoryAction>;
  onStickyGeometryChange: (geometry: StickyGeometrySnapshot) => void;
  onOpenSectionTemplates: (trigger: HTMLElement) => void;
  onSectionTemplateOpenChange: (open: boolean) => void;
  onCloseSectionTemplates: () => void;
  onSettingsOpenChange: (open: boolean) => void;
  onShortcutHelpOpenChange: (open: boolean) => void;
  onImportDocument: (raw: string) => Promise<ActionResult>;
  onResetData: () => void;
  onResetAll: () => void;
};

export function AppShell({
  state,
  historyState,
  selectedNode,
  orderState,
  sectionOrderState,
  resolvedTheme,
  shortcutPlatform,
  topbarClass,
  stageSelectableIds,
  settingsOpen,
  shortcutHelpOpen,
  sectionTemplateOpen,
  sectionTemplatePosition,
  settingsPanelRef,
  sectionTemplatePanelRef,
  documentJson,
  errors,
  stickyLayout,
  dispatch,
  onStickyGeometryChange,
  onOpenSectionTemplates,
  onSectionTemplateOpenChange,
  onCloseSectionTemplates,
  onSettingsOpenChange,
  onShortcutHelpOpenChange,
  onImportDocument,
  onResetData,
  onResetAll,
}: Props) {
  return (
    <div
      className="editor-shell h-screen w-screen overflow-hidden"
      data-editor-theme={resolvedTheme}
      data-theme-mode={state.ui.themeMode}
    >
      <div className="grid h-full grid-rows-[56px_minmax(0,1fr)]">
        <header className={topbarClass}>
          <div className="flex h-full items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/sticky_512.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-[0.01em]">Sticky Playground</div>
                <div className="truncate text-[11px] text-white/55">
                  Editor bootstrap · mesh layout · spacer-based sticky behavior
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <TopbarIconAction
                icon={Undo2}
                label="Undo"
                shortcut={getShortcutLabel('undo', shortcutPlatform)}
                theme={resolvedTheme}
                disabled={historyState.past.length === 0}
                onClick={() => dispatch({ type: 'undo' })}
              />
              <TopbarIconAction
                icon={Redo2}
                label="Redo"
                shortcut={getShortcutLabel('redo', shortcutPlatform)}
                theme={resolvedTheme}
                disabled={historyState.future.length === 0}
                onClick={() => dispatch({ type: 'redo' })}
              />
              <TopbarIconAction
                icon={CircleQuestionMark}
                label="Keyboard shortcuts"
                shortcut={getShortcutLabel('showShortcutHelp', shortcutPlatform)}
                theme={resolvedTheme}
                active={shortcutHelpOpen}
                expanded={shortcutHelpOpen}
                onClick={() => onShortcutHelpOpenChange(!shortcutHelpOpen)}
              />
              <TopbarIconAction
                icon={Settings}
                label="Settings"
                shortcut={getShortcutLabel('openSettings', shortcutPlatform)}
                theme={resolvedTheme}
                active={settingsOpen}
                expanded={settingsOpen}
                hasPopup="dialog"
                panelTrigger="settings"
                onClick={() => onSettingsOpenChange(!settingsOpen)}
              />
            </div>
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[84px_minmax(0,1fr)_300px]">
          <aside className="editor-rail-shell editor-border-subtle relative z-[360] overflow-visible border-r shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] backdrop-blur">
            <div className="flex h-full flex-col gap-4 overflow-visible p-3">
              <div className="editor-bg-subtle editor-border-subtle overflow-visible rounded-2xl border p-2">
                <InsertPanel
                  onOpenSectionTemplates={onOpenSectionTemplates}
                  onInsertWrapper={(role) => dispatch({ type: 'insertWrapper', role })}
                  onInsertLeaf={(role) => dispatch({ type: 'insertLeaf', role })}
                />
              </div>
              <div className="mt-auto flex justify-center">
                <div className="flex flex-col gap-2">
                  <RailToggleButton
                    icon={Eye}
                    pressed={state.ui.previewSticky}
                    label={state.ui.previewSticky ? 'Sticky preview on' : 'Sticky preview off'}
                    shortcut={getShortcutLabel('togglePreviewSticky', shortcutPlatform)}
                    onClick={() => dispatch({ type: 'setPreviewSticky', value: !state.ui.previewSticky })}
                  />
                  <RailToggleButton
                    icon={SpacerIcon}
                    pressed={state.ui.spacerVisibility === 'all'}
                    label={state.ui.spacerVisibility === 'all' ? 'Show all spacers' : 'Show selected spacers'}
                    shortcut={getShortcutLabel('toggleSpacerVisibility', shortcutPlatform)}
                    onClick={() =>
                      dispatch({
                        type: 'setSpacerVisibility',
                        value: state.ui.spacerVisibility === 'all' ? 'selected' : 'all',
                      })
                    }
                  />
                  <RailToggleButton
                    icon={Magnet}
                    pressed={state.ui.snapEnabled}
                    label={state.ui.snapEnabled ? 'Snap to guides on' : 'Snap to guides off'}
                    shortcut={getShortcutLabel('toggleSnapEnabled', shortcutPlatform)}
                    detail="Alt reverses while dragging"
                    onClick={() => dispatch({ type: 'setSnapEnabled', value: !state.ui.snapEnabled })}
                  />
                </div>
              </div>
            </div>
          </aside>

          <main className="editor-workspace-shell relative min-h-0 overflow-hidden">
            <Stage
              document={state.document}
              selectedId={state.selectedId}
              previewSticky={state.ui.previewSticky}
              spacerVisibility={state.ui.spacerVisibility}
              showGridLanes={state.ui.showGridLanes}
              snapEnabled={state.ui.snapEnabled}
              onStageFocus={() => {
                if (!state.selectedId && stageSelectableIds.length > 0) {
                  dispatch({ type: 'select', id: stageSelectableIds[0] });
                }
              }}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onMove={(id, x, y) => dispatch({ type: 'move', id, x, y })}
              onReparent={(id, parentId, x, y) => dispatch({ type: 'reparent', id, parentId, x, y })}
              onResize={(id, width, height) => dispatch({ type: 'resize', id, width, height })}
              onResizeStart={(id) => dispatch({ type: 'beginResize', id })}
              onResizeEnd={(id) => dispatch({ type: 'endResize', id })}
              onStickyGeometryChange={onStickyGeometryChange}
            />
          </main>

          <aside className="editor-inspector-shell editor-border-subtle min-h-0 overflow-hidden border-l shadow-[-8px_0_24px_rgba(18,32,51,0.03)]">
            <InspectorPanel
              node={selectedNode}
              showOrderControls={orderState.show}
              canOrderBack={orderState.canBack}
              canOrderForward={orderState.canForward}
              canSendToBack={orderState.canBack}
              canBringToFront={orderState.canForward}
              orderBackShortcut={getShortcutLabel('orderBack', shortcutPlatform)}
              orderForwardShortcut={getShortcutLabel('orderForward', shortcutPlatform)}
              sendToBackShortcut={getShortcutLabel('orderSendToBack', shortcutPlatform)}
              bringToFrontShortcut={getShortcutLabel('orderBringToFront', shortcutPlatform)}
              canSectionBack={sectionOrderState.canBack}
              canSectionForward={sectionOrderState.canForward}
              onOrderBack={() => dispatch({ type: 'orderBack' })}
              onOrderForward={() => dispatch({ type: 'orderForward' })}
              onSendToBack={() => dispatch({ type: 'orderSendToBack' })}
              onBringToFront={() => dispatch({ type: 'orderBringToFront' })}
              onSectionBack={() => dispatch({ type: 'orderBack' })}
              onSectionForward={() => dispatch({ type: 'orderForward' })}
              onTextChange={(field, value) => dispatch({ type: 'text', field, value })}
              onWrapperStyleChange={(field, value) => dispatch({ type: 'wrapperStyle', field, value })}
              onRectChange={(field, value) => dispatch({ type: 'rect', field, value })}
              onPromote={(role) => dispatch({ type: 'promote', role })}
              onDemote={() => dispatch({ type: 'demote' })}
              onStickyEnabled={(value) => dispatch({ type: 'stickyEnabled', value })}
              onStickyTarget={(value) => dispatch({ type: 'stickyTarget', value })}
              onStickyEdges={(value) => dispatch({ type: 'stickyEdges', value })}
              onStickyOffset={(value) => dispatch({ type: 'stickyOffset', value })}
              onStickyOffsetTop={(value) => dispatch({ type: 'stickyOffsetTop', value })}
              onStickyOffsetBottom={(value) => dispatch({ type: 'stickyOffsetBottom', value })}
              onStickyDurationMode={(value) => dispatch({ type: 'stickyDurationMode', value })}
              onStickyDuration={(value) => dispatch({ type: 'stickyDuration', value })}
              onStickyDurationTop={(value) => dispatch({ type: 'stickyDurationTop', value })}
              onStickyDurationBottom={(value) => dispatch({ type: 'stickyDurationBottom', value })}
            />
          </aside>
        </div>
      </div>

      <SectionTemplatePopover
        panelRef={sectionTemplatePanelRef}
        open={sectionTemplateOpen}
        position={sectionTemplatePosition}
        onOpenChange={onSectionTemplateOpenChange}
        onClose={onCloseSectionTemplates}
        onInsertTemplate={(templateId) => {
          dispatch({ type: 'insertSectionTemplate', templateId });
          onCloseSectionTemplates();
        }}
      />

      {settingsOpen ? (
        <PopoverSurface ref={settingsPanelRef} open={settingsOpen} onOpenChange={onSettingsOpenChange}>
          <SettingsPanel
            document={state.document}
            documentJson={documentJson}
            errors={errors}
            stickyLayout={stickyLayout}
            selectedNode={selectedNode}
            previewSticky={state.ui.previewSticky}
            spacerVisibility={state.ui.spacerVisibility}
            showGridLanes={state.ui.showGridLanes}
            snapEnabled={state.ui.snapEnabled}
            themeMode={state.ui.themeMode}
            undoDepth={historyState.past.length}
            redoDepth={historyState.future.length}
            historyLimit={historyState.historyLimit}
            onClose={() => onSettingsOpenChange(false)}
            onPreviewStickyChange={(value) => dispatch({ type: 'setPreviewSticky', value })}
            onSpacerVisibilityChange={(value) => dispatch({ type: 'setSpacerVisibility', value })}
            onShowGridLanesChange={(value) => dispatch({ type: 'setShowGridLanes', value })}
            onSnapEnabledChange={(value) => dispatch({ type: 'setSnapEnabled', value })}
            onThemeModeChange={(value) => dispatch({ type: 'setThemeMode', value })}
            onClearHistory={() => dispatch({ type: 'clearHistory' })}
            onHistoryLimitChange={(value) => dispatch({ type: 'setHistoryLimit', value })}
            onImport={onImportDocument}
            onResetData={onResetData}
            onResetAll={onResetAll}
          />
        </PopoverSurface>
      ) : null}

      <Dialog
        open={Boolean(state.pendingRoleSwap)}
        onOpenChange={(open) => {
          if (!open) {
            dispatch({ type: 'cancelPromote' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace current {state.pendingRoleSwap?.targetRole}?</DialogTitle>
            <DialogDescription>
              A {state.pendingRoleSwap?.targetRole} already exists. Demote the current one and promote this wrapper
              instead?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({ type: 'cancelPromote' })}>
              Cancel
            </Button>
            <Button onClick={() => dispatch({ type: 'confirmPromote' })}>Replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={onShortcutHelpOpenChange} />
    </div>
  );
}
