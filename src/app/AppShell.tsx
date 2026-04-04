import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';
import { ChevronDown, CircleQuestionMark, Eye, FilePlus2, Magnet, Play, Redo2, ScanEye, Settings, Type, Undo2 } from 'lucide-react';
import type {
  DocumentNode,
  EditorState,
  StickyGeometrySnapshot,
} from '../api/editorApi';
import type { DocumentFontFamily } from '../model/types';
import {
  addDocumentFontFamily,
  purgeUnusedDocumentFonts,
  removeDocumentFontFamily,
  toggleDocumentFontFavorite,
} from '../api/fontApi';
import { InsertPanel } from '../panels/InsertPanel';
import { EditorPanelHeader } from '../panels/EditorPanelHeader';
import { HelpDialog } from '../panels/HelpDialog';
import {
  INSPECTOR_COLLAPSED_WIDTH_PX,
  INSPECTOR_EXPANDED_WIDTH_PX,
  INSPECTOR_TRANSITION_MS,
} from '../panels/inspectorLayout';
const LayersPanel = lazy(() =>
  import('../panels/LayersPanel').then((m) => ({ default: m.LayersPanel }))
);
const SettingsPanel = lazy(() =>
  import('../panels/SettingsPanel').then((m) => ({ default: m.SettingsPanel }))
);
const ManageFontsPanel = lazy(() =>
  import('../panels/fontManagement/ManageFontsPanel').then((m) => ({ default: m.ManageFontsPanel }))
);
const PagesPanel = lazy(() =>
  import('../panels/PagesPanel').then((m) => ({ default: m.PagesPanel }))
);
const EditorSidebar = lazy(() =>
  import('../panels/EditorSidebar').then((m) => ({ default: m.EditorSidebar }))
);
import { FocusedModePanel } from '../panels/FocusedModePanel';
import { BackToEditorButton } from '../panels/BackToEditorButton';
import { SiteRenderer } from '../site/SiteRenderer';
import type { ActionResult } from '../panels/settingsTransfer';
import { Stage } from '../api/editorViewApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PopoverSurface } from '@/components/ui/popover';
import { getShortcutLabel, type ShortcutPlatform } from '@/lib/shortcuts';
import {
  getAccentColorForDarkThemeSelection,
  getAccentColorForLightThemeSelection,
  resolveAccentSurfaceColors,
  resolveEditorAccentColor,
  resolveStickyGuideColors,
  type ResolvedTheme,
} from '@/lib/theme';
import {
  clampFocusedPanelOffset,
  FOCUSED_PANEL_RIGHT_OFFSET_PX,
  FOCUSED_PANEL_TOP_OFFSET_PX,
} from '../editor/focusedPanelPosition';
import { useDebugLogger } from '../editor/useDebugLogger';
import { RailToggleButton, SectionTemplatePopover, SpacerIcon, TopbarIconAction } from './AppChrome';
import type { HistoryAction, HistoryState } from './editorState';

const stickyIconUrl = '/sticky_512.png';

type Props = {
  state: EditorState;
  historyState: Pick<HistoryState, 'past' | 'future' | 'historyLimit'>;
  selectedNode: DocumentNode | null;
  selectedNodes: DocumentNode[];
  orderState: { show: boolean; canBack: boolean; canForward: boolean };
  sectionOrderState: { canBack: boolean; canForward: boolean };
  resolvedTheme: ResolvedTheme;
  shortcutPlatform: ShortcutPlatform;
  topbarClass: string;
  stageSelectableIds: string[];
  settingsOpen: boolean;
  manageFontsOpen?: boolean;
  helpOpen: boolean;
  layersOpen?: boolean;
  layersPosition?: { top: number; left: number };
  sectionTemplateOpen: boolean;
  sectionTemplatePosition: { top: number; left: number };
  settingsPanelRef: Ref<HTMLDivElement>;
  layersPanelRef?: Ref<HTMLDivElement>;
  sectionTemplatePanelRef: Ref<HTMLDivElement>;
  documentJson: string;
  dispatch: Dispatch<HistoryAction>;
  onStickyGeometryChange: (geometry: StickyGeometrySnapshot) => void;
  onOpenLayers?: (trigger: HTMLElement) => void;
  onLayersOpenChange?: (open: boolean) => void;
  onLayersPositionChange?: (position: { top: number; left: number }) => void;
  onCloseLayers?: () => void;
  onOpenSectionTemplates: (trigger: HTMLElement) => void;
  onSectionTemplateOpenChange: (open: boolean) => void;
  onCloseSectionTemplates: () => void;
  onSettingsOpenChange: (open: boolean) => void;
  onManageFontsOpenChange?: (open: boolean) => void;
  onHelpOpenChange: (open: boolean) => void;
  onImportDocument: (raw: string) => Promise<ActionResult>;
  onResetData: () => void;
  onResetAll: () => void;
};

export function AppShell({
  state,
  historyState,
  selectedNode,
  selectedNodes,
  orderState,
  sectionOrderState,
  resolvedTheme,
  shortcutPlatform,
  topbarClass,
  stageSelectableIds,
  settingsOpen,
  manageFontsOpen = false,
  helpOpen,
  layersOpen = false,
  layersPosition = { top: 112, left: 102 },
  sectionTemplateOpen,
  sectionTemplatePosition,
  settingsPanelRef,
  layersPanelRef,
  sectionTemplatePanelRef,
  documentJson,
  dispatch,
  onStickyGeometryChange,
  onOpenLayers = () => undefined,
  onLayersOpenChange = () => undefined,
  onLayersPositionChange = () => undefined,
  onCloseLayers = () => undefined,
  onOpenSectionTemplates,
  onSectionTemplateOpenChange,
  onCloseSectionTemplates,
  onSettingsOpenChange,
  onManageFontsOpenChange = () => undefined,
  onHelpOpenChange,
  onImportDocument,
  onResetData,
  onResetAll,
}: Props) {
  const isPreview = useMemo(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('mode') === 'preview',
    [],
  );

  const [showStorageWarning, setShowStorageWarning] = useState(false);
  const [linkPopupVisible, setLinkPopupVisible] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [requestedPageSettingsId, setRequestedPageSettingsId] = useState<string | null>(null);
  const [pageSwitcherOpen, setPageSwitcherOpen] = useState(false);
  const pageSwitcherTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [pageSwitcherStyle, setPageSwitcherStyle] = useState<CSSProperties>({ top: 0, left: 0, visibility: 'hidden' });

  const focusedPanelRef = useRef<HTMLDivElement | null>(null);
  const focusedPanelDragRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    originOffset: EditorState['ui']['focusedPanelOffset'];
  } | null>(null);
  const focusedPanelOffsetDraftRef = useRef(state.ui.focusedPanelOffset);
  const storageWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusedPanelOffsetDraft, setFocusedPanelOffsetDraft] = useState(state.ui.focusedPanelOffset);
  const [focusedPanelDragging, setFocusedPanelDragging] = useState(false);
  const siteNode = state.document.nodes[state.document.rootId];
  const globalStickyElevation = siteNode?.type === 'site' ? (siteNode.stickyElevation ?? true) : true;
  const isSidebarCollapsed = state.ui.inspectorCollapsed && !state.ui.temporaryInspectorOpen;
  const leftRailWidth = `${INSPECTOR_COLLAPSED_WIDTH_PX}px`;
  const sidebarWidth = isSidebarCollapsed
    ? `${INSPECTOR_COLLAPSED_WIDTH_PX}px`
    : `${INSPECTOR_EXPANDED_WIDTH_PX}px`;
  const focusedPanelRightOffsetPx = INSPECTOR_COLLAPSED_WIDTH_PX + FOCUSED_PANEL_RIGHT_OFFSET_PX;
  const sidebarTransitionTiming = isSidebarCollapsed ? 'ease-in' : 'ease-out';
  const resolvedAccent = resolveEditorAccentColor(state.ui.accentColor);
  const stickyGuideColors = resolveStickyGuideColors(resolvedAccent);
  const accentSurfaceColors = resolveAccentSurfaceColors(resolvedAccent, stickyGuideColors);

  useEffect(() => {
    focusedPanelOffsetDraftRef.current = focusedPanelOffsetDraft;
  }, [focusedPanelOffsetDraft]);

  useEffect(() => {
    if (!focusedPanelDragging) {
      setFocusedPanelOffsetDraft(state.ui.focusedPanelOffset);
    }
  }, [focusedPanelDragging, state.ui.focusedPanelOffset]);

  useEffect(() => {
    if (!focusedPanelDragging || typeof document === 'undefined') {
      return;
    }

    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [focusedPanelDragging]);

  useEffect(() => {
    if (!focusedPanelDragging) {
      return;
    }

    function finishFocusedPanelDrag(nextOffset: EditorState['ui']['focusedPanelOffset']) {
      focusedPanelDragRef.current = null;
      setFocusedPanelDragging(false);
      if (nextOffset.x !== state.ui.focusedPanelOffset.x || nextOffset.y !== state.ui.focusedPanelOffset.y) {
        dispatch({ type: 'setFocusedPanelOffset', value: nextOffset });
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (
        !focusedPanelDragRef.current ||
        event.pointerId !== focusedPanelDragRef.current.pointerId ||
        !focusedPanelRef.current
      ) {
        return;
      }

      const panelRect = focusedPanelRef.current.getBoundingClientRect();
      const nextOffset = clampFocusedPanelOffset({
        offset: focusedPanelDragRef.current.originOffset,
        deltaX: event.clientX - focusedPanelDragRef.current.originX,
        deltaY: event.clientY - focusedPanelDragRef.current.originY,
        containerWidth: window.innerWidth,
        containerHeight: Math.max(0, window.innerHeight - 56),
        panelWidth: panelRect.width,
        panelHeight: panelRect.height,
        rightOffset: focusedPanelRightOffsetPx,
      });
      setFocusedPanelOffsetDraft(nextOffset);
    }

    function handlePointerEnd(event: PointerEvent) {
      if (!focusedPanelDragRef.current || event.pointerId !== focusedPanelDragRef.current.pointerId) {
        return;
      }
      finishFocusedPanelDrag(focusedPanelOffsetDraftRef.current);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [dispatch, focusedPanelDragging, focusedPanelRightOffsetPx, state.ui.focusedPanelOffset]);

  useDebugLogger(state.ui.showDebugInfo, state.document, state.selectedId);

  useEffect(() => {
    const timer = setTimeout(() => {
      const size = JSON.stringify(state.document).length * 2;
      if (size > 4 * 1024 * 1024) {
        setShowStorageWarning(true);
      }
    }, 2000);
    storageWarningTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [state.document]);

  useEffect(() => {
    const node = state.selectedId ? state.document.nodes[state.selectedId] : null;
    if (node?.type === 'leaf' && node.role === 'link') {
      setLinkPopupVisible(true);
    } else {
      setLinkPopupVisible(false);
    }
  }, [state.selectedId, state.document.nodes]);

  useEffect(() => {
    if (!pageSwitcherOpen || !pageSwitcherTriggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const rect = pageSwitcherTriggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 240;
      const margin = 12;
      setPageSwitcherStyle({
        top: Math.max(margin, rect.bottom + 8),
        left: Math.max(margin, Math.min(window.innerWidth - width - margin, rect.left)),
        visibility: 'visible',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [pageSwitcherOpen]);

  function handleStageSelect(id: string, mode: 'replace' | 'toggle' = 'replace') {
    if (mode !== 'toggle') {
      const node = state.document.nodes[id];
      if (node?.type === 'leaf' && node.role === 'link' && id === state.selectedId) {
        setLinkPopupVisible((v) => !v);
      }
    }
    dispatch(mode === 'toggle' ? { type: 'toggleSelect', id } : { type: 'select', id });
  }

  function handleFocusedPanelDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    focusedPanelDragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      originOffset: focusedPanelOffsetDraft,
    };
    setFocusedPanelDragging(true);
  }

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

  function handleAddDocumentFont(family: DocumentFontFamily) {
    dispatch({ type: 'importDocument', document: addDocumentFontFamily(state.document, family) });
  }

  function handleRemoveDocumentFont(familyName: string) {
    dispatch({ type: 'importDocument', document: removeDocumentFontFamily(state.document, familyName) });
  }

  function handleToggleDocumentFontFavorite(familyName: string) {
    dispatch({ type: 'importDocument', document: toggleDocumentFontFavorite(state.document, familyName) });
  }

  function handlePurgeUnusedFonts() {
    dispatch({ type: 'importDocument', document: purgeUnusedDocumentFonts(state.document) });
  }

  function handleOpenPagesPanel() {
    setRequestedPageSettingsId(null);
    setPagesOpen(true);
  }

  function handleOpenCurrentPageSettings() {
    if (!state.activePageId) return;
    setRequestedPageSettingsId(state.activePageId);
    setPagesOpen(true);
  }

  async function handleExportSite() {
    const { renderSiteExportBundles, buildRouteManifest, buildHostingConfigs } = await import('../api/siteApi');
    const { saveExportSiteZip } = await import('../panels/settingsTransfer');
    const exportOptions = { outputStructure: state.document.siteSettings?.outputStructure };
    const bundles = renderSiteExportBundles(state.document, exportOptions);
    const manifest = buildRouteManifest(state.document, exportOptions);
    const hostingConfigs = buildHostingConfigs(state.document, exportOptions);
    const files: Record<string, string> = {
      'route-manifest.json': JSON.stringify(manifest, null, 2),
      ...hostingConfigs,
    };
    for (const bundle of bundles) {
      files[bundle.path] = bundle.htmlDocument;
    }
    await saveExportSiteZip(files, { fileName: 'sticky-playground-site.zip' });
  }

  const selectedLinkNode = (() => {
    if (!state.selectedId) return null;
    const node = state.document.nodes[state.selectedId];
    if (node?.type === 'leaf' && node.role === 'link') return node;
    return null;
  })();

  if (isPreview) {
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, overflow: 'auto' }}>
          <SiteRenderer
            document={state.document}
            includeAnimations
            pageId={state.activePageId ?? undefined}
          />
        </div>
        <BackToEditorButton />
      </>
    );
  }

  return (
    <div
      className="editor-shell h-screen w-screen overflow-hidden"
      data-editor-theme={resolvedTheme}
      data-theme-mode={state.ui.themeMode}
      data-editor-light-theme={state.ui.lightTheme}
      data-editor-dark-theme={state.ui.darkTheme}
      style={
        {
          '--editor-accent': resolvedAccent,
          '--editor-accent-foreground': accentSurfaceColors.accentForeground,
          '--editor-accent-foreground-muted': accentSurfaceColors.accentForegroundMuted,
          '--editor-sticky-offset-guide-color': stickyGuideColors.offsetGuideColor,
          '--editor-sticky-padding-guide-color': stickyGuideColors.paddingGuideColor,
          '--editor-sticky-offset-label-background': stickyGuideColors.offsetLabelBackground,
          '--editor-sticky-auto-guide-color': stickyGuideColors.autoGuideColor,
          '--editor-sticky-auto-label-background': stickyGuideColors.autoLabelBackground,
          '--editor-sticky-distance-label-text': accentSurfaceColors.stickyDistanceLabelText,
          '--editor-sticky-offset-label-text': accentSurfaceColors.stickyOffsetLabelText,
          '--editor-sticky-auto-label-text': accentSurfaceColors.stickyAutoLabelText,
        } as CSSProperties
      }
    >
      <div className="grid h-full grid-rows-[56px_minmax(0,1fr)]">
        <header className={topbarClass}>
          <div className="flex h-full items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src={stickyIconUrl} alt="" className="h-8 w-8 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-[0.01em]">Sticky Playground</div>
                <div className="editor-topbar-subtitle truncate text-[11px]">
                  Editor bootstrap · mesh layout · spacer-based sticky behavior
                </div>
              </div>
            </div>
            {(state.document.pages?.length ?? 0) > 0 && (
              <>
                <Button
                  ref={pageSwitcherTriggerRef}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="editor-topbar-page-switcher"
                  aria-haspopup="listbox"
                  aria-expanded={pageSwitcherOpen}
                  onClick={() => setPageSwitcherOpen((v) => !v)}
                >
                  <span className="editor-topbar-page-switcher-indicator" aria-hidden="true" />
                  <span className="editor-topbar-page-switcher-label">
                    {state.document.pages?.find((p) => p.id === state.activePageId)?.displayName ?? 'Untitled'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </Button>
                <PopoverSurface
                  open={pageSwitcherOpen}
                  onOpenChange={setPageSwitcherOpen}
                  className="editor-topbar-page-switcher-menu fixed z-[400] w-[240px] rounded-lg border p-1 shadow-lg"
                  style={pageSwitcherStyle}
                >
                  <div role="listbox" aria-label="Switch page" className="flex flex-col gap-0.5">
                    {(state.document.pages ?? []).map((page) => {
                      const depth = (() => {
                        let d = 0;
                        let cur = page;
                        while (cur.parentPageId) {
                          d++;
                          cur = state.document.pages?.find((p) => p.id === cur.parentPageId) ?? cur;
                          if (d > 8) break;
                        }
                        return d;
                      })();
                      const isActive = page.id === state.activePageId;
                      return (
                        <Button
                          key={page.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          role="option"
                          aria-selected={isActive}
                          data-active={isActive ? 'true' : 'false'}
                          className="editor-topbar-page-switcher-row"
                          style={{ paddingLeft: `${10 + depth * 14}px` }}
                          onClick={() => {
                            dispatch({ type: 'setActivePage', pageId: page.id });
                            setPageSwitcherOpen(false);
                          }}
                        >
                          <span className="editor-topbar-page-switcher-row-indicator" aria-hidden="true" />
                          <span className="min-w-0 truncate">{page.displayName || 'Untitled'}</span>
                        </Button>
                      );
                    })}
                    <div className="editor-border-subtle my-1 border-t" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="editor-topbar-page-switcher-create"
                      onClick={() => {
                        dispatch({ type: 'addPage' });
                        setPageSwitcherOpen(false);
                      }}
                    >
                      <FilePlus2 className="h-3.5 w-3.5 shrink-0" />
                      <span>New page</span>
                    </Button>
                  </div>
                </PopoverSurface>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              <TopbarIconAction
                icon={Undo2}
                label="Undo"
                shortcut={getShortcutLabel('undo', shortcutPlatform)}
                disabled={historyState.past.length === 0}
                onClick={() => dispatch({ type: 'undo' })}
              />
              <TopbarIconAction
                icon={Redo2}
                label="Redo"
                shortcut={getShortcutLabel('redo', shortcutPlatform)}
                disabled={historyState.future.length === 0}
                onClick={() => dispatch({ type: 'redo' })}
              />
              <TopbarIconAction
                icon={Eye}
                label="Preview site"
                onClick={() => {
                  const previewUrl = `${window.location.origin}${window.location.pathname}?mode=preview`;
                  window.open(previewUrl, 'sticky-preview');
                }}
              />
              <TopbarIconAction
                icon={CircleQuestionMark}
                label="Help"
                shortcut={getShortcutLabel('showShortcutHelp', shortcutPlatform)}
                active={helpOpen}
                expanded={helpOpen}
                hasPopup="dialog"
                onClick={() => onHelpOpenChange(!helpOpen)}
              />
              <TopbarIconAction
                icon={Settings}
                label="Settings"
                shortcut={getShortcutLabel('openSettings', shortcutPlatform)}
                active={settingsOpen}
                expanded={settingsOpen}
                hasPopup="dialog"
                panelTrigger="settings"
                onClick={() => onSettingsOpenChange(!settingsOpen)}
              />
            </div>
          </div>
        </header>

        <div
          className="grid min-h-0 transition-[grid-template-columns] ease-out"
          style={{
            gridTemplateColumns: `${leftRailWidth} minmax(0,1fr) ${sidebarWidth}`,
            transitionDuration: `${INSPECTOR_TRANSITION_MS}ms`,
            transitionTimingFunction: sidebarTransitionTiming,
          }}
        >
          <nav aria-label="Editor tools" className="editor-rail-shell editor-border-subtle relative z-[360] overflow-visible border-r shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] backdrop-blur">
            <div className="flex h-full flex-col overflow-visible p-3">
              <InsertPanel
                onOpenSectionTemplates={onOpenSectionTemplates}
                onInsertWrapper={(role) => dispatch({ type: 'insertWrapper', role })}
                onInsertLeaf={(role) => dispatch({ type: 'insertLeaf', role })}
                layersOpen={layersOpen}
                onOpenLayers={onOpenLayers}
                onCloseLayers={onCloseLayers}
                pagesOpen={pagesOpen}
                onOpenPages={() => handleOpenPagesPanel()}
                onClosePages={() => setPagesOpen(false)}
              />
              <div className="mt-auto flex justify-center pt-3">
                <div className="flex flex-col gap-2">
                  <RailToggleButton
                    icon={ScanEye}
                    pressed={state.ui.previewSticky}
                    label={state.ui.previewSticky ? 'Sticky preview on' : 'Sticky preview off'}
                    shortcut={getShortcutLabel('togglePreviewSticky', shortcutPlatform)}
                    onClick={() => dispatch({ type: 'setPreviewSticky', value: !state.ui.previewSticky })}
                  />
                  <RailToggleButton
                    icon={Play}
                    pressed={state.ui.animationPreview.enabled}
                    label={state.ui.animationPreview.enabled ? 'Animation preview on' : 'Animation preview off'}
                    shortcut={getShortcutLabel('toggleAnimationPreview', shortcutPlatform)}
                    onClick={() => dispatch({ type: 'setAnimationPreview', value: { enabled: !state.ui.animationPreview.enabled } })}
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
                    pressed={state.ui.snapSettings.guideSnap.enabled}
                    label={state.ui.snapSettings.guideSnap.enabled ? 'Snap to guides on' : 'Snap to guides off'}
                    shortcut={getShortcutLabel('toggleSnapEnabled', shortcutPlatform)}
                    detail="Alt reverses while dragging"
                    onClick={() =>
                      dispatch({
                        type: 'setSnapSettings',
                        value: { guideSnap: {
                          enabled: !state.ui.snapSettings.guideSnap.enabled,
                          threshold: state.ui.snapSettings.guideSnap.threshold,
                          power: state.ui.snapSettings.guideSnap.power,
                          maxSpeedPxPerSecond: state.ui.snapSettings.guideSnap.maxSpeedPxPerSecond,
                        } },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </nav>

          <main className="editor-workspace-shell relative min-h-0 overflow-hidden">
            {showStorageWarning && (
              <div
                className="editor-bg-subtle editor-border-subtle flex items-center justify-between border-b px-4 py-2 text-xs"
                style={{ position: 'relative', zIndex: 10 }}
                role="alert"
              >
                <span className="editor-text-strong">
                  Document is large (&gt;4 MB). Consider exporting and clearing unused data to avoid localStorage limits.
                </span>
                <button
                  type="button"
                  className="editor-text-muted ml-4 shrink-0 font-medium hover:opacity-70"
                  aria-label="Dismiss storage warning"
                  onClick={() => setShowStorageWarning(false)}
                >
                  ✕
                </button>
              </div>
            )}
            <Stage
              document={state.document}
              selectedId={state.selectedId}
              selectedIds={state.selectedIds}
              activePageId={state.activePageId}
              previewSticky={state.ui.previewSticky}
              animationPreview={state.ui.animationPreview}
              spacerVisibility={state.ui.spacerVisibility}
              showGridLanes={state.ui.showGridLanes}
              snapSettings={state.ui.snapSettings}
              onStageFocus={() => {
                if (state.selectedIds.length === 0 && stageSelectableIds.length > 0) {
                  dispatch({ type: 'select', id: stageSelectableIds[0] });
                }
              }}
              onSelect={handleStageSelect}
              onSelectMany={(ids, mode) => dispatch({ type: 'selectMany', ids, mode })}
              onClearSelection={() => dispatch({ type: 'clearSelection' })}
              onMove={(id, x, y) => {
                setLinkPopupVisible(false);
                dispatch({ type: 'move', id, x, y });
              }}
              onMoveSelection={(moves) => dispatch({ type: 'moveSelection', moves })}
              onReparent={(id, parentId, x, y) => dispatch({ type: 'reparent', id, parentId, x, y })}
              onReparentSelection={(parentId, moves) => dispatch({ type: 'reparentSelection', parentId, moves })}
              onResize={(id, width, height) => dispatch({ type: 'resize', id, width, height })}
              onResizeStart={(id) => dispatch({ type: 'beginResize', id })}
              onResizeEnd={(id) => dispatch({ type: 'endResize', id })}
              onStickyGeometryChange={onStickyGeometryChange}
              followLinkPopup={linkPopupVisible && selectedLinkNode ? {
                node: selectedLinkNode,
                document: state.document,
                onNavigateToPage: (pageId) => {
                  dispatch({ type: 'setActivePage', pageId });
                  setLinkPopupVisible(false);
                },
                onScrollToAnchor: (nodeId) => {
                  const el = window.document.querySelector(`[data-node-id="${nodeId}"]`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  setLinkPopupVisible(false);
                },
              } : null}
            />
          </main>

          <Suspense fallback={null}>
          <EditorSidebar
            selectedNodes={selectedNodes}
            document={state.document}
            node={selectedNode}
            focusedMode={state.ui.focusedMode}
            inspectorCollapsed={state.ui.inspectorCollapsed}
            temporaryInspectorOpen={state.ui.temporaryInspectorOpen}
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
            onAlignSelection={(mode) => dispatch({ type: 'alignSelection', mode, rects: collectSelectionRects() })}
            onDistributeSelection={(mode) =>
              dispatch({ type: 'distributeSelection', mode, rects: collectSelectionRects() })
            }
            onBulkEdit={(operations) => dispatch({ type: 'bulkEdit', operations })}
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
            onStickyElevation={(value) => dispatch({ type: 'stickyElevation', value })}
            onStickyElevated={(value) => dispatch({ type: 'stickyElevated', value })}
            globalStickyElevation={globalStickyElevation}
            showDebugInfo={state.ui.showDebugInfo}
            onEnterFocusedMode={(value) => dispatch({ type: 'setFocusedMode', value })}
            onOpenManageFonts={() => onManageFontsOpenChange(true)}
            onInspectorCollapsedChange={(value) => dispatch({ type: 'setInspectorCollapsed', value })}
            onTemporaryInspectorOpenChange={(value) => dispatch({ type: 'setTemporaryInspectorOpen', value })}
            activePageId={state.activePageId}
            onSetPageDisplayName={(pageId, displayName) => dispatch({ type: 'setPageDisplayName', pageId, displayName })}
            onSetPageSlug={(pageId, slug) => dispatch({ type: 'setPageSlug', pageId, slug })}
            onSetPageVisibility={(pageId, visible) => dispatch({ type: 'setPageVisibility', pageId, visible })}
            onSetPageViewTransition={(pageId, transition) => dispatch({ type: 'setPageViewTransition', pageId, transition })}
            onOpenPageSettings={handleOpenCurrentPageSettings}
            onOpenPagesPanel={handleOpenPagesPanel}
          />
          </Suspense>
        </div>
      </div>

      {state.ui.focusedMode && selectedNodes.length > 0 ? (
        <div
          ref={focusedPanelRef}
          className="pointer-events-none absolute z-[340] w-[270px] max-w-[calc(100vw-40px)]"
          data-focused-panel-dragging={focusedPanelDragging ? 'true' : 'false'}
          style={{
            top: `${56 + FOCUSED_PANEL_TOP_OFFSET_PX}px`,
            right: `${focusedPanelRightOffsetPx}px`,
            transform: `translate(${focusedPanelOffsetDraft.x}px, ${focusedPanelOffsetDraft.y}px)`,
          }}
        >
          <FocusedModePanel
            document={state.document}
            selectedNodes={selectedNodes}
            node={selectedNode}
            focusedMode={state.ui.focusedMode}
            mode={state.ui.focusedMode}
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
            onStickyElevation={(value) => dispatch({ type: 'stickyElevation', value })}
            onStickyElevated={(value) => dispatch({ type: 'stickyElevated', value })}
            globalStickyElevation={globalStickyElevation}
            onEnterFocusedMode={(value) => dispatch({ type: 'setFocusedMode', value })}
            onOpenManageFonts={() => onManageFontsOpenChange(true)}
            onExitFocusedMode={() => dispatch({ type: 'setFocusedMode', value: null })}
            onHeaderDragPointerDown={handleFocusedPanelDragStart}
            dragging={focusedPanelDragging}
          />
        </div>
      ) : null}

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

      {layersOpen ? (
        <Suspense fallback={null}>
          <LayersPanel
            panelRef={layersPanelRef}
            open={layersOpen}
            position={layersPosition}
            document={state.document}
            activePageId={state.activePageId}
            selectedIds={state.selectedIds}
            onOpenChange={onLayersOpenChange}
            onPositionChange={onLayersPositionChange}
            onClose={onCloseLayers}
            onSelectNode={(id, mode) =>
              dispatch(mode === 'toggle' ? { type: 'toggleSelect', id } : { type: 'select', id })
            }
            onRenameNode={(id, value) => dispatch({ type: 'text', field: 'name', value, id })}
            onDeleteNode={(id) => dispatch({ type: 'deleteNode', id })}
            onSetNodeVisibility={(id, value) => dispatch({ type: 'setNodeVisibility', id, value })}
            onMoveNodeInTree={(id, targetParentId, targetIndex) =>
              dispatch({ type: 'moveNodeInTree', id, targetParentId, targetIndex })
            }
            onSetActivePage={(pageId) => dispatch({ type: 'setActivePage', pageId })}
            onAddPage={() => dispatch({ type: 'addPage' })}
            onDeletePage={(pageId) => dispatch({ type: 'deletePage', pageId })}
            onOpenPageSettings={(pageId) => {
              setRequestedPageSettingsId(pageId);
              setPagesOpen(true);
            }}
            onSetPageParent={(pageId, parentPageId) => dispatch({ type: 'setPageParent', pageId, parentPageId })}
            onReorderPage={(pageId, direction) => dispatch({ type: 'reorderPage', pageId, direction })}
            onSetPageVisibility={(pageId, visible) => dispatch({ type: 'setPageVisibility', pageId, visible })}
          />
        </Suspense>
      ) : null}

      {pagesOpen ? (
        <Suspense fallback={null}>
          <PagesPanel
            document={state.document}
            activePageId={state.activePageId}
            openSettingsPageId={requestedPageSettingsId}
            onClose={() => {
              setPagesOpen(false);
              setRequestedPageSettingsId(null);
            }}
            onSetSiteSettings={(patch) => dispatch({ type: 'setSiteSettings', patch })}
            onSetActivePage={(pageId) => dispatch({ type: 'setActivePage', pageId })}
            onAddPage={() => dispatch({ type: 'addPage' })}
            onDeletePage={(pageId) => dispatch({ type: 'deletePage', pageId })}
            onSetPageDisplayName={(pageId, displayName) => dispatch({ type: 'setPageDisplayName', pageId, displayName })}
            onSetPageSlug={(pageId, slug) => dispatch({ type: 'setPageSlug', pageId, slug })}
            onAddPageAlias={(pageId, alias) => dispatch({ type: 'addPageSlugAlias', pageId, alias })}
            onRemovePageAlias={(pageId, alias) => dispatch({ type: 'removePageSlugAlias', pageId, alias })}
            onSyncPageLinks={(oldUrl, newUrl) => dispatch({ type: 'syncPageLinks', oldUrl, newUrl })}
            onSetPageVisibility={(pageId, visible) => dispatch({ type: 'setPageVisibility', pageId, visible })}
            onSetPageViewTransition={(pageId, transition) => dispatch({ type: 'setPageViewTransition', pageId, transition })}
            onSetPageParent={(pageId, parentPageId) => dispatch({ type: 'setPageParent', pageId, parentPageId })}
            onReorderPage={(pageId, direction) => dispatch({ type: 'reorderPage', pageId, direction })}
            onExport={handleExportSite}
          />
        </Suspense>
      ) : null}

      {settingsOpen ? (
        <PopoverSurface ref={settingsPanelRef} open={settingsOpen} onOpenChange={onSettingsOpenChange}>
          <Suspense fallback={null}>
          <SettingsPanel
            document={state.document}
            documentJson={documentJson}
            previewSticky={state.ui.previewSticky}
            spacerVisibility={state.ui.spacerVisibility}
            showGridLanes={state.ui.showGridLanes}
            snapSettings={state.ui.snapSettings}
            themeMode={state.ui.themeMode}
            accentColor={resolvedAccent}
            lightTheme={state.ui.lightTheme}
            darkTheme={state.ui.darkTheme}
            startupFocusedMode={state.ui.startupFocusedMode}
            resolvedTheme={resolvedTheme}
            undoDepth={historyState.past.length}
            redoDepth={historyState.future.length}
            historyLimit={historyState.historyLimit}
            onClose={() => onSettingsOpenChange(false)}
            onAddFont={handleAddDocumentFont}
            onRemoveFont={handleRemoveDocumentFont}
            onToggleFontFavorite={handleToggleDocumentFontFavorite}
            onPurgeUnusedFonts={handlePurgeUnusedFonts}
            animationPreview={state.ui.animationPreview}
            onAnimationPreviewChange={(value) => dispatch({ type: 'setAnimationPreview', value })}
            onPreviewStickyChange={(value) => dispatch({ type: 'setPreviewSticky', value })}
            onSpacerVisibilityChange={(value) => dispatch({ type: 'setSpacerVisibility', value })}
            showDebugInfo={state.ui.showDebugInfo}
            onShowGridLanesChange={(value) => dispatch({ type: 'setShowGridLanes', value })}
            onShowDebugInfoChange={(value) => dispatch({ type: 'setShowDebugInfo', value })}
            onSnapSettingsChange={(value) => dispatch({ type: 'setSnapSettings', value })}
            onThemeModeChange={(value) => dispatch({ type: 'setThemeMode', value })}
            onAccentColorChange={(value) => dispatch({ type: 'setAccentColor', value })}
            onLightThemeChange={(value) => {
              dispatch({ type: 'setLightTheme', value });
              if (value === 'paper') {
                dispatch({
                  type: 'setAccentColor',
                  value: getAccentColorForLightThemeSelection(value, state.ui.accentColor),
                });
              }
            }}
            onDarkThemeChange={(value) => {
              dispatch({ type: 'setDarkTheme', value });
              if (value === 'monokai') {
                dispatch({
                  type: 'setAccentColor',
                  value: getAccentColorForDarkThemeSelection(value, state.ui.accentColor),
                });
              }
            }}
            onStartupFocusedModeChange={(value) => dispatch({ type: 'setStartupFocusedMode', value })}
            onClearHistory={() => dispatch({ type: 'clearHistory' })}
            onHistoryLimitChange={(value) => dispatch({ type: 'setHistoryLimit', value })}
            globalStickyElevation={globalStickyElevation}
            onStickyElevationChange={(value) => dispatch({ type: 'stickyElevation', value })}
            onImport={onImportDocument}
            onResetData={onResetData}
            onResetAll={onResetAll}
            onSiteSettingsChange={(patch) => dispatch({ type: 'setSiteSettings', patch })}
          />
          </Suspense>
        </PopoverSurface>
      ) : null}

      <Dialog open={manageFontsOpen} onOpenChange={onManageFontsOpenChange}>
        <DialogContent showCloseButton={false} className="flex max-h-[min(84vh,820px)] max-w-[920px] min-h-0 flex-col overflow-hidden p-0">
          <EditorPanelHeader
            icon={Type}
            title="Manage Fonts"
            description="Add, remove, favorite, and purge document fonts."
            closeLabel="Close manage fonts"
            onClose={() => onManageFontsOpenChange(false)}
          />
          <div className="editor-scrollbar min-h-0 overflow-y-auto p-5 pt-4">
            <Suspense fallback={null}>
              <ManageFontsPanel
                document={state.document}
                onAddFont={handleAddDocumentFont}
                onRemoveFont={handleRemoveDocumentFont}
                onToggleFavorite={handleToggleDocumentFontFavorite}
                onPurgeUnused={handlePurgeUnusedFonts}
              />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

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

      <HelpDialog open={helpOpen} onOpenChange={onHelpOpenChange} />

    </div>
  );
}
