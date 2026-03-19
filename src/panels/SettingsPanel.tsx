import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bug,
  Clipboard,
  Eye,
  FileDown,
  FileUp,
  Grid3X3,
  Keyboard,
  Info,
  Magnet,
  Settings,
  SlidersHorizontal,
  Type,
} from 'lucide-react';
import type { DocumentModel, DocumentNode, FocusedMode, StickyLayoutState } from '../api/editorApi';
import type { DocumentFontFamily } from '../model/types';
import { formatValue } from '../api/documentApi';
import { FOCUSED_MODE_VALUES, getFocusedModeLabel } from '../editor/focusedModes';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditorPanelHeader } from './EditorPanelHeader';
import { ShortcutHelpContent } from './ShortcutHelpContent';
import { ManageFontsPanel } from './fontManagement/ManageFontsPanel';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  EDITOR_ACCENT_SWATCHES,
  EDITOR_DARK_THEME_OPTIONS,
  EDITOR_LIGHT_THEME_OPTIONS,
  isEditorAccentSwatch,
  type EditorDarkTheme,
  type EditorLightTheme,
  type ResolvedTheme,
  type ThemeMode,
} from '@/lib/theme';
import {
  copyExportDocument,
  pasteClipboardImport,
  saveExportDocument,
  saveExportSiteZip,
  type ActionResult,
} from './settingsTransfer';

type SectionId = 'display' | 'fonts' | 'transfer' | 'advanced' | 'diagnostics' | 'shortcuts';
const DEFAULT_EXPORT_BASENAME = 'sticky-playground';

type Props = {
  document: DocumentModel;
  documentJson: string;
  errors: string[];
  stickyLayout: StickyLayoutState;
  selectedNode: DocumentNode | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  snapEnabled: boolean;
  themeMode: ThemeMode;
  accentColor: string;
  lightTheme: EditorLightTheme;
  darkTheme: EditorDarkTheme;
  resolvedTheme: ResolvedTheme;
  startupFocusedMode: FocusedMode;
  undoDepth: number;
  redoDepth: number;
  historyLimit: number;
  onClose: () => void;
  onAddFont?: (family: DocumentFontFamily) => void;
  onRemoveFont?: (familyName: string) => void;
  onToggleFontFavorite?: (familyName: string) => void;
  onPurgeUnusedFonts?: () => void;
  onPreviewStickyChange: (value: boolean) => void;
  onSpacerVisibilityChange: (value: 'selected' | 'all') => void;
  onShowGridLanesChange: (value: boolean) => void;
  onSnapEnabledChange: (value: boolean) => void;
  onThemeModeChange: (value: ThemeMode) => void;
  onAccentColorChange: (value: string) => void;
  onLightThemeChange: (value: EditorLightTheme) => void;
  onDarkThemeChange: (value: EditorDarkTheme) => void;
  onStartupFocusedModeChange: (value: FocusedMode) => void;
  onClearHistory: () => void;
  onHistoryLimitChange: (value: number) => void;
  onImport: (raw: string) => Promise<ActionResult> | ActionResult;
  onResetData: () => void;
  onResetAll: () => void;
};

const SECTION_META: Array<{
  id: SectionId;
  label: string;
  icon: LucideIcon;
  description: string;
}> = [
  {
    id: 'display',
    label: 'UI',
    icon: Eye,
    description: 'Theme, preview, and guides.',
  },
  {
    id: 'fonts',
    label: 'Fonts',
    icon: Type,
    description: 'Document font library.',
  },
  {
    id: 'transfer',
    label: 'Import / Export',
    icon: ArrowDownToLine,
    description: 'Move document JSON.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: SlidersHorizontal,
    description: 'History and reset.',
  },
  {
    id: 'diagnostics',
    label: 'Debug Info',
    icon: Bug,
    description: 'Validation and sticky math.',
  },
  {
    id: 'shortcuts',
    label: 'Shortcuts',
    icon: Keyboard,
    description: 'Keyboard and pointer reference.',
  },
];

export function SettingsPanel({
  document,
  documentJson,
  errors,
  stickyLayout,
  selectedNode,
  previewSticky,
  spacerVisibility,
  showGridLanes,
  snapEnabled,
  themeMode,
  accentColor,
  lightTheme,
  darkTheme,
  resolvedTheme,
  startupFocusedMode,
  undoDepth,
  redoDepth,
  historyLimit,
  onClose,
  onAddFont = () => undefined,
  onRemoveFont = () => undefined,
  onToggleFontFavorite = () => undefined,
  onPurgeUnusedFonts = () => undefined,
  onPreviewStickyChange,
  onSpacerVisibilityChange,
  onShowGridLanesChange,
  onSnapEnabledChange,
  onThemeModeChange,
  onAccentColorChange,
  onLightThemeChange,
  onDarkThemeChange,
  onStartupFocusedModeChange,
  onClearHistory,
  onHistoryLimitChange,
  onImport,
  onResetData,
  onResetAll,
}: Props) {
  const [activeSection, setActiveSection] = useState<SectionId>('display');
  const [importBuffer, setImportBuffer] = useState('');
  const [exportFileName, setExportFileName] = useState(DEFAULT_EXPORT_BASENAME);
  const [exportStatus, setExportStatus] = useState<ActionResult | null>(null);
  const [importStatus, setImportStatus] = useState<ActionResult | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const displayRef = useRef<HTMLElement | null>(null);
  const fontsRef = useRef<HTMLElement | null>(null);
  const transferRef = useRef<HTMLElement | null>(null);
  const advancedRef = useRef<HTMLElement | null>(null);
  const diagnosticsRef = useRef<HTMLElement | null>(null);
  const shortcutsRef = useRef<HTMLElement | null>(null);

  const sectionRefs = useMemo(
    () => ({
      display: displayRef,
      fonts: fontsRef,
      transfer: transferRef,
      advanced: advancedRef,
      diagnostics: diagnosticsRef,
      shortcuts: shortcutsRef,
    }),
    [],
  );

  useEffect(() => {
    if (!exportStatus) {
      return;
    }
    const timeout = window.setTimeout(() => setExportStatus(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [exportStatus]);

  useEffect(() => {
    if (!importStatus) {
      return;
    }
    const timeout = window.setTimeout(() => setImportStatus(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [importStatus]);

  function scrollToSection(sectionId: SectionId) {
    const element = sectionRefs[sectionId].current;
    if (!element) {
      return;
    }
    setActiveSection(sectionId);
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateActiveSection() {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const candidates = SECTION_META.map((section) => {
      const element = sectionRefs[section.id].current;
      if (!element) {
        return { id: section.id, distance: Number.POSITIVE_INFINITY };
      }
      return {
        id: section.id,
        distance: Math.abs(element.offsetTop - container.scrollTop - 16),
      };
    });

    candidates.sort((left, right) => left.distance - right.distance);
    setActiveSection(candidates[0]?.id ?? 'display');
  }

  async function handleCopyExport() {
    setExportStatus(await copyExportDocument(documentJson));
  }

  async function handleSaveExport() {
    const result = await saveExportDocument(documentJson, {
      fileName: exportFileName,
    });
    if (result) {
      setExportStatus(result);
    }
  }

  async function handleSaveSiteZip() {
    const bundle = await loadSiteExportBundle();
    const zipFileName = bundle.htmlFileName.replace(/\.[a-z0-9]+$/i, '.zip');
    const result = await saveExportSiteZip(
      {
        [bundle.htmlFileName]: bundle.htmlDocument,
        [bundle.cssFileName]: bundle.css,
      },
      {
        fileName: zipFileName,
      },
    );
    if (result) {
      setExportStatus(result);
    }
  }

  async function handlePasteFromClipboard() {
    const result = await pasteClipboardImport();
    if (result.text != null) {
      setImportBuffer(result.text);
    }
    setImportStatus(result.status);
  }

  async function runImport(raw: string) {
    const result = await onImport(raw);
    setImportStatus(result);
  }

  async function handleImportBuffer() {
    await runImport(importBuffer);
  }

  async function loadSiteExportBundle() {
    const { renderSiteExportBundle } = await import('../api/siteApi');
    return renderSiteExportBundle(document, {
      title: getSiteTitle(exportFileName),
      htmlFileName: exportFileName,
    });
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      setImportBuffer(raw);
      await runImport(raw);
    } catch {
      setImportStatus({ ok: false, message: 'File import failed.' });
    }
  }

  const spacerToggleOn = spacerVisibility === 'all';
  const hasStickyRegistrations = Object.values(stickyLayout).length > 0;

  return (
    <div className="editor-settings-panel fixed left-1/2 top-1/2 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-2xl shadow-[0_22px_64px_rgba(15,23,42,0.18)]">
      <div className="editor-bg-surface editor-border-subtle overflow-hidden rounded-2xl border">
      <EditorPanelHeader
        icon={Settings}
        title="Settings"
        description="Controls, transfer, diagnostics."
        closeLabel="Close settings"
        onClose={onClose}
        className="px-5"
      />

      <div className="grid h-[min(76vh,680px)] min-h-0 grid-cols-[180px_minmax(0,1fr)]">
        <aside className="editor-bg-subtle editor-border-subtle border-r">
          <div className="sticky top-0 px-3 py-4">
            <div className="editor-text-muted mb-3 px-2 text-[11px] font-medium">
              On This Page
            </div>
            <nav className="space-y-1">
              {SECTION_META.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    data-active={active ? 'true' : 'false'}
                    className={`settings-nav-link flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)] focus-visible:ring-inset ${
                      active ? 'shadow-sm' : ''
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{section.label}</div>
                      <div className="settings-nav-link-copy mt-0.5 text-xs leading-5">{section.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div
          ref={scrollRef}
          className="editor-scrollbar min-h-0 overflow-y-auto"
          onScroll={updateActiveSection}
        >
          <div className="px-6 py-5">
            <section ref={displayRef} className="editor-border-subtle border-b pb-6">
              <SectionHeading eyebrow="UI" title="Appearance and guides" description="Theme, stage toggles, and guides." />
              <ThemePresetRow
                themeMode={themeMode}
                resolvedTheme={resolvedTheme}
                lightTheme={lightTheme}
                darkTheme={darkTheme}
                onThemeModeChange={onThemeModeChange}
                onLightThemeChange={onLightThemeChange}
                onDarkThemeChange={onDarkThemeChange}
              />
              <AccentSwatchRow value={accentColor} onChange={onAccentColorChange} />
              <FocusedModeStartupRow
                value={startupFocusedMode}
                onChange={onStartupFocusedModeChange}
              />
              <SettingRow
                icon={Eye}
                title="Sticky preview"
                description="Applies CSS sticky behavior in preview."
                checked={previewSticky}
                onCheckedChange={onPreviewStickyChange}
              />
              <SettingRow
                icon={ArrowDownToLine}
                title="Show spacers"
                description={spacerToggleOn ? 'Shows spacer visuals for all sticky nodes.' : 'Shows spacer visuals for the current selection.'}
                checked={spacerToggleOn}
                onCheckedChange={(checked) => onSpacerVisibilityChange(checked ? 'all' : 'selected')}
                tooltip="On shows all spacer guides. Off scopes them to the current selection."
              />
              <SettingRow
                icon={Grid3X3}
                title="Grid lanes"
                description="Shows mesh guides inside wrappers."
                checked={showGridLanes}
                onCheckedChange={onShowGridLanesChange}
              />
              <SettingRow
                icon={Magnet}
                title="Snap to guides"
                description="Snaps drag movement to page and node guides."
                note="Hold Alt while dragging to invert the current mode."
                checked={snapEnabled}
                onCheckedChange={onSnapEnabledChange}
              />
            </section>

            <section ref={fontsRef} className="editor-border-subtle border-b py-6">
              <SectionHeading
                eyebrow="Fonts"
                title="Document font library"
                description="Manage available families, favorites, and cleanup for this document."
              />
              <ManageFontsPanel
                document={document}
                onAddFont={onAddFont}
                onRemoveFont={onRemoveFont}
                onToggleFavorite={onToggleFontFavorite}
                onPurgeUnused={onPurgeUnusedFonts}
              />
            </section>

            <section ref={transferRef} className="editor-border-subtle border-b py-6">
              <SectionHeading
                eyebrow="Import / Export"
                title="Document transfer"
                description="Import JSON or export the current document as JSON or a rendered site ZIP."
              />
              <PlainGroup title="Export">
                <div className="space-y-4">
                  <TransferSubsection
                    title="Base file name"
                    description="Used for fallback downloads and as the suggested native save name. JSON exports use `.json`; rendered site exports use `.zip`."
                  >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_280px] sm:items-center">
                    <Input
                      value={exportFileName}
                      onChange={(event) => setExportFileName(event.target.value)}
                      placeholder={DEFAULT_EXPORT_BASENAME}
                      className="h-9 text-sm"
                    />
                  </div>
                  </TransferSubsection>

                  <TransferSubsection
                    title="Document JSON"
                    description="Model export for re-importing into the editor."
                  >
                    <ActionRow
                      icon={FileDown}
                      title="Save JSON"
                      description="Uses the browser save picker when available, otherwise downloads a `.json` file."
                      actions={
                        <Button type="button" variant="outline" size="sm" onClick={handleSaveExport}>
                          Save JSON
                        </Button>
                      }
                    />
                    <ActionRow
                      icon={Clipboard}
                      title="Copy JSON"
                      description="Copies the current document model to the clipboard."
                      actions={
                        <Button type="button" variant="outline" size="sm" onClick={handleCopyExport}>
                          Copy JSON
                        </Button>
                      }
                    />
                  </TransferSubsection>

                  <TransferSubsection
                    title="Rendered Site"
                    description="Generated site structure export for hosting or SSR."
                  >
                    <ActionRow
                      icon={FileDown}
                      title="Save site ZIP"
                      description="Exports the rendered site as one ZIP archive containing the generated HTML and CSS bundle."
                      actions={
                        <Button type="button" variant="outline" size="sm" onClick={handleSaveSiteZip}>
                          Save Site ZIP
                        </Button>
                      }
                    />
                  </TransferSubsection>
                </div>
                <StatusMessage result={exportStatus} fallback="Exports include document JSON or a rendered site ZIP containing separate HTML and CSS files." />
              </PlainGroup>

              <PlainGroup title="Import" className="mt-6">
                <TransferSubsection
                  title="Document JSON"
                  description="Bring a saved document model back into the editor."
                >
                  <ActionRow
                    icon={FileUp}
                    title="Import from file"
                    description="Replaces the current document from a JSON file."
                    actions={
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        Choose file
                      </Button>
                    }
                  />
                  <ActionRow
                    icon={Clipboard}
                    title="Paste from clipboard"
                    description="Pastes JSON into the import editor."
                    actions={
                      <Button type="button" variant="outline" size="sm" onClick={handlePasteFromClipboard}>
                        Paste
                      </Button>
                    }
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleFileSelection}
                  />
                  <div className="editor-border-subtle mt-4 border-t pt-4">
                    <div className="editor-text-muted mb-2 text-xs font-medium">Imported JSON</div>
                    <Textarea
                      value={importBuffer}
                      onChange={(event) => setImportBuffer(event.target.value)}
                      placeholder="Paste exported document JSON here."
                      className="min-h-[220px] rounded-lg font-mono text-xs leading-5"
                    />
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="editor-text-muted max-w-[420px] text-xs leading-5">
                        Import validates, normalizes, replaces the active document, and supports undo.
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0"
                        onClick={handleImportBuffer}
                        disabled={importBuffer.trim().length === 0}
                      >
                        <ArrowUpFromLine className="h-4 w-4" />
                        Import JSON
                      </Button>
                    </div>
                  </div>
                </TransferSubsection>
                <StatusMessage result={importStatus} fallback="Invalid JSON leaves the current stage unchanged." />
              </PlainGroup>
            </section>

            <section ref={advancedRef} className="editor-border-subtle border-b py-6">
              <SectionHeading
                eyebrow="Advanced"
                title="Editing behavior"
                description="History and reset tools."
              />
              <NumericRow
                title="Undo retention"
                description={`Current stack: ${undoDepth} undo / ${redoDepth} redo`}
                value={historyLimit}
                onChange={onHistoryLimitChange}
              />
              <ActionRow
                title="Clear undo history"
                description="Clears undo and redo without changing the document."
                actions={
                  <div className="flex w-full justify-end">
                    <Button type="button" variant="outline" size="sm" className="w-[120px]" onClick={onClearHistory}>
                      Clear
                    </Button>
                  </div>
                }
                actionsClassName="sm:min-w-[248px]"
              />
              <ActionRow
                title="Reset stage"
                description="Reset document data, or reset document data plus editor preferences."
                actions={
                  <div className="flex w-full flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onResetData}>
                      Reset data
                    </Button>
                    <Button type="button" variant="destructive" size="sm" className="flex-1" onClick={onResetAll}>
                      Reset all
                    </Button>
                  </div>
                }
                actionsClassName="sm:min-w-[248px]"
              />
            </section>

            <section ref={diagnosticsRef} className="py-6">
              <SectionHeading
                eyebrow="Debug Info"
                title="Validation and sticky math"
                description="Validation and computed sticky ranges."
              />
              <PlainGroup title="Validation">
                <div className="editor-text-muted space-y-2 text-sm">
                  {errors.length === 0 ? <p>No errors.</p> : errors.map((error) => <p key={error}>{error}</p>)}
                </div>
              </PlainGroup>

              <div className="mt-6">
                <div className="editor-text-strong mb-3 text-sm font-medium">Sticky math</div>
                {hasStickyRegistrations ? (
                  <div className="editor-text-muted space-y-3 text-xs">
                    {Object.values(stickyLayout).map((entry) => (
                      <div key={entry.wrapperId} className="editor-bg-subtle editor-border-subtle rounded-lg border px-3 py-3">
                        <div className="editor-text-strong font-medium">{entry.wrapperId}</div>
                        <div className="mt-1">extra extent: {Math.round(entry.totalExtraExtentPx)}px</div>
                        <div className="mt-2 space-y-1">
                          {entry.registrations.map((registration) => (
                            <div key={registration.ownerId}>
                              {registration.ownerId}: start {Math.round(registration.startPx)}px, end{' '}
                              {Math.round(registration.endPx)}px, overflow {Math.round(registration.extentPx)}px
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="editor-text-muted text-sm">No sticky registrations.</div>
                )}
              </div>

              {selectedNode && selectedNode.type !== 'site' ? (
                <div className="mt-6">
                  <div className="editor-text-strong mb-3 text-sm font-medium">Selected node</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <MetricCell label="Width" value={formatValue(selectedNode.rect.width.base.parsed)} />
                    <MetricCell label="Height" value={formatValue(selectedNode.rect.height.base.parsed)} />
                    <MetricCell
                      label="Duration"
                      value={
                        selectedNode.sticky
                          ? selectedNode.sticky.durationMode === 'auto'
                            ? 'auto'
                            : `${formatValue(selectedNode.sticky.duration.parsed)} · top ${formatValue(
                                (selectedNode.sticky.durationTop ?? selectedNode.sticky.duration).parsed,
                              )} · bottom ${formatValue(
                                (selectedNode.sticky.durationBottom ?? selectedNode.sticky.duration).parsed,
                              )}`
                          : 'not sticky'
                      }
                    />
                  </div>
                </div>
              ) : null}
            </section>

            <section ref={shortcutsRef} className="editor-border-subtle border-t py-6">
              <SectionHeading
                eyebrow="Shortcuts"
                title="Keyboard and pointer reference"
                description="The same guide opened by the question-mark shortcut."
              />
              <ShortcutHelpContent compact />
            </section>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function ThemePresetRow({
  themeMode,
  resolvedTheme,
  lightTheme,
  darkTheme,
  onThemeModeChange,
  onLightThemeChange,
  onDarkThemeChange,
}: {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  lightTheme: EditorLightTheme;
  darkTheme: EditorDarkTheme;
  onThemeModeChange: (value: ThemeMode) => void;
  onLightThemeChange: (value: EditorLightTheme) => void;
  onDarkThemeChange: (value: EditorDarkTheme) => void;
}) {
  const paletteTheme = themeMode === 'auto' ? resolvedTheme : themeMode;
  const paletteOptions = paletteTheme === 'light' ? EDITOR_LIGHT_THEME_OPTIONS : EDITOR_DARK_THEME_OPTIONS;
  const paletteValue = paletteTheme === 'light' ? lightTheme : darkTheme;

  return (
    <div className="editor-border-subtle border-t py-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CompactSelectRow
          title="Theme"
          value={themeMode}
          ariaLabel="Theme"
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(next) => onThemeModeChange(next as ThemeMode)}
        />
        <CompactSelectRow
          title="Palette"
          value={paletteValue}
          ariaLabel="Palette"
          options={paletteOptions.map((option) => ({
            value: option.value,
            label: option.label,
            description: option.description,
          }))}
          onChange={(next) =>
            paletteTheme === 'light'
              ? onLightThemeChange(next as EditorLightTheme)
              : onDarkThemeChange(next as EditorDarkTheme)
          }
        />
      </div>
    </div>
  );
}

function AccentSwatchRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const isCustom = !isEditorAccentSwatch(value);

  return (
    <div className="editor-border-subtle border-t py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="editor-text-strong text-sm font-medium">Accent</div>
        </div>
        <span className="editor-text-muted rounded-md border px-2 py-1 font-mono text-[11px] leading-none">{value}</span>
      </div>
      <div className="editor-scrollbar mt-3 grid grid-flow-col auto-cols-max items-center gap-2 overflow-x-auto pt-1 pb-1">
        {EDITOR_ACCENT_SWATCHES.map((swatch) => {
          const active = swatch.value.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={swatch.value}
              type="button"
              onClick={() => onChange(swatch.value)}
              aria-label={swatch.label}
              title={swatch.label}
              data-active={active ? 'true' : 'false'}
              className="editor-accent-swatch"
              style={{ '--swatch-color': swatch.value } as CSSProperties}
            />
          );
        })}
        <div className="relative h-8 w-8 shrink-0">
          <ColorPicker
            value={value}
            fallback={isCustom ? value : '#1668ff'}
            allowAlpha={false}
            ariaLabel="Custom accent color"
            onChange={onChange}
            className={`editor-color-picker editor-icon-button-subtle h-8 w-8 overflow-hidden rounded-md border shadow-sm ${isCustom ? 'editor-accent-swatch-custom-active' : ''}`}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <SlidersHorizontal className="h-3.5 w-3.5 text-white/92 mix-blend-plus-lighter drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)]" />
          </span>
        </div>
      </div>
    </div>
  );
}

function CompactSelectRow({
  title,
  description,
  value,
  ariaLabel,
  options,
  onChange,
}: {
  title: string;
  description?: string;
  value: string;
  ariaLabel: string;
  options: Array<{ value: string; label: string; description?: string }>;
  onChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="editor-bg-subtle editor-border-subtle rounded-xl border px-3 py-3">
      <div className="editor-text-strong text-sm font-medium">{title}</div>
      {description ? <div className="editor-text-muted mt-1 text-xs leading-5">{description}</div> : null}
      <div className={description ? 'mt-2' : 'mt-1.5'}>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger aria-label={ariaLabel} className="h-8 text-xs">
            <span className="truncate">{selectedOption?.label ?? value}</span>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex min-w-0 flex-col">
                  <span>{option.label}</span>
                  {option.description ? (
                    <span className="editor-text-muted mt-0.5 text-[11px] leading-4">{option.description}</span>
                  ) : null}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FocusedModeStartupRow({
  value,
  onChange,
}: {
  value: FocusedMode;
  onChange: (value: FocusedMode) => void;
}) {
  return (
    <div className="editor-border-subtle flex items-center justify-between gap-4 border-t py-4">
      <div className="min-w-0 pr-4">
        <div className="editor-text-strong text-sm font-medium">Startup mode</div>
        <div className="editor-text-muted mt-1 text-sm">
          Chooses which focused mode the editor opens with. This only changes editor chrome, not document or export output.
        </div>
      </div>
      <div className="w-[180px] shrink-0">
        <Select
          value={value ?? 'normal'}
          onValueChange={(next) => onChange(next === 'normal' ? null : (next as Exclude<FocusedMode, null>))}
        >
          <SelectTrigger aria-label="Startup mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            {FOCUSED_MODE_VALUES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {getFocusedModeLabel(mode)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <div className="editor-text-muted text-[11px] font-medium">{eyebrow}</div>
      <div className="editor-text-strong mt-1 text-lg font-medium">{title}</div>
      <div className="editor-text-muted mt-1 text-sm">{description}</div>
    </div>
  );
}

function PlainGroup({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="editor-text-strong mb-3 text-sm font-medium">{title}</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function TransferSubsection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="editor-border-subtle editor-bg-surface rounded-xl border px-4 py-4">
      <div>
        <div className="editor-text-strong text-sm font-medium">{title}</div>
        <div className="editor-text-muted mt-1 text-sm">{description}</div>
      </div>
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  note,
  tooltip,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  note?: string;
  tooltip?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  const Icon = icon;

  return (
    <div className="editor-border-subtle flex items-start justify-between gap-4 border-t py-4 first:border-t-0">
      <div className="flex min-w-0 gap-3">
        <div className="editor-icon-surface mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="editor-text-strong text-sm font-medium">{title}</div>
            {tooltip ? <InfoTooltip>{tooltip}</InfoTooltip> : null}
          </div>
          <div className="editor-text-muted mt-1 text-sm">{description}</div>
          {note ? <div className="editor-text-muted mt-1 text-xs">{note}</div> : null}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ActionRow({
  icon,
  title,
  description,
  actions,
  actionsClassName,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actions: ReactNode;
  actionsClassName?: string;
}) {
  const Icon = icon;

  return (
    <div className="editor-border-subtle flex flex-col gap-3 border-t py-3 first:border-t-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
      <div className={`min-w-0 ${icon ? 'flex gap-3' : ''}`}>
        {Icon ? (
          <div className="editor-icon-surface mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="editor-text-strong text-sm font-medium">{title}</div>
          <div className="editor-text-muted mt-1 text-sm">{description}</div>
        </div>
      </div>
      <div className={`shrink-0 sm:justify-self-end ${actionsClassName ?? ''}`}>{actions}</div>
    </div>
  );
}

function NumericRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="editor-border-subtle flex items-center justify-between gap-4 border-t py-4">
      <div className="min-w-0">
        <div className="editor-text-strong text-sm font-medium">{title}</div>
        <div className="editor-text-muted mt-1 text-sm">{description}</div>
      </div>
      <div className="w-[96px] shrink-0">
        <Input
          type="number"
          min={1}
          max={500}
          value={value}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            if (Number.isFinite(next)) {
              onChange(next);
            }
          }}
          className="h-9 text-center text-sm"
        />
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="editor-bg-subtle editor-border-subtle rounded-lg border px-3 py-2">
      <div className="editor-text-muted text-[11px] font-medium">{label}</div>
      <div className="editor-text-strong mt-1 text-sm">{value}</div>
    </div>
  );
}

function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <PopoverTooltip
      side="bottom"
      align="end"
      className="editor-tooltip-panel w-64 rounded-lg border px-3 py-2 text-xs font-normal leading-5"
      content={children}
    >
      <button
        type="button"
        className="editor-icon-button-subtle inline-flex h-5 w-5 items-center justify-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--editor-focus-ring-offset)]"
        aria-label="More information"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </PopoverTooltip>
  );
}

function getSiteTitle(fileName: string) {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return 'Sticky Playground Site';
  }
  return trimmed.replace(/\.[a-z0-9]+$/i, '') || 'Sticky Playground Site';
}

function StatusMessage({
  result,
  fallback,
}: {
  result: ActionResult | null;
  fallback: string;
}) {
  if (!result) {
    return <div className="editor-text-muted px-4 py-3 text-xs">{fallback}</div>;
  }

  return (
    <div
      className={`mx-4 my-4 rounded-lg px-3 py-2 text-xs leading-5 ${
        result.ok
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {result.ok ? null : <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />}
      {result.message}
    </div>
  );
}
