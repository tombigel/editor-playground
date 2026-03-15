import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
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
  RefreshCcw,
  Settings,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import type { ComputedWrapperStickyState, DocumentNode } from '../api/documentApi';
import { formatValue } from '../api/documentApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PopoverTooltip } from '@/components/ui/popover';
import { ShortcutHelpContent } from './ShortcutHelpContent';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ThemeMode } from '@/lib/theme';

type SectionId = 'display' | 'transfer' | 'advanced' | 'diagnostics' | 'shortcuts';

type ActionResult = {
  ok: boolean;
  message: string;
};

type Props = {
  documentJson: string;
  errors: string[];
  stickyState: Record<string, ComputedWrapperStickyState>;
  selectedNode: DocumentNode | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  snapEnabled: boolean;
  themeMode: ThemeMode;
  undoDepth: number;
  redoDepth: number;
  historyLimit: number;
  onClose: () => void;
  onPreviewStickyChange: (value: boolean) => void;
  onSpacerVisibilityChange: (value: 'selected' | 'all') => void;
  onShowGridLanesChange: (value: boolean) => void;
  onSnapEnabledChange: (value: boolean) => void;
  onThemeModeChange: (value: ThemeMode) => void;
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

type SaveFilePickerHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFilePickerHandle>;
};

export function SettingsPanel({
  documentJson,
  errors,
  stickyState,
  selectedNode,
  previewSticky,
  spacerVisibility,
  showGridLanes,
  snapEnabled,
  themeMode,
  undoDepth,
  redoDepth,
  historyLimit,
  onClose,
  onPreviewStickyChange,
  onSpacerVisibilityChange,
  onShowGridLanesChange,
  onSnapEnabledChange,
  onThemeModeChange,
  onClearHistory,
  onHistoryLimitChange,
  onImport,
  onResetData,
  onResetAll,
}: Props) {
  const [activeSection, setActiveSection] = useState<SectionId>('display');
  const [importBuffer, setImportBuffer] = useState('');
  const [exportStatus, setExportStatus] = useState<ActionResult | null>(null);
  const [importStatus, setImportStatus] = useState<ActionResult | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const displayRef = useRef<HTMLElement | null>(null);
  const transferRef = useRef<HTMLElement | null>(null);
  const advancedRef = useRef<HTMLElement | null>(null);
  const diagnosticsRef = useRef<HTMLElement | null>(null);
  const shortcutsRef = useRef<HTMLElement | null>(null);

  const sectionRefs = useMemo(
    () => ({
      display: displayRef,
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
    try {
      await navigator.clipboard.writeText(documentJson);
      setExportStatus({ ok: true, message: 'Document JSON copied.' });
    } catch {
      setExportStatus({ ok: false, message: 'Clipboard copy failed.' });
    }
  }

  async function handleSaveExport() {
    const blob = new Blob([documentJson], { type: 'application/json' });
    const suggestedName = 'sticky-playground-document.json';

    try {
      const saveWindow = window as SavePickerWindow;
      if (saveWindow.showSaveFilePicker) {
        const handle = await saveWindow.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'JSON document',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setExportStatus({ ok: true, message: 'Document saved to file.' });
        return;
      }

      const enteredName = window.prompt('File name', suggestedName);
      if (enteredName === null) {
        return;
      }
      const fileName = normalizeFileName(enteredName, suggestedName);
      downloadBlob(blob, fileName);
      setExportStatus({ ok: true, message: `Downloaded ${fileName}.` });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setExportStatus({ ok: false, message: 'File export failed.' });
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setImportBuffer(text);
      setImportStatus({ ok: true, message: 'Clipboard JSON pasted into the import box.' });
    } catch {
      setImportStatus({ ok: false, message: 'Clipboard read failed.' });
    }
  }

  async function runImport(raw: string) {
    const result = await onImport(raw);
    setImportStatus(result);
  }

  async function handleImportBuffer() {
    await runImport(importBuffer);
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
  const hasStickyRegistrations = Object.values(stickyState).length > 0;

  return (
    <div className="editor-settings-panel fixed left-1/2 top-1/2 w-[min(920px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-2xl shadow-[0_22px_64px_rgba(15,23,42,0.18)]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-950">Settings</div>
            <div className="text-xs text-slate-500">Controls, transfer, diagnostics.</div>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="rounded-lg" onClick={onClose} aria-label="Close settings">
          <span className="text-lg leading-none">×</span>
        </Button>
      </div>

      <div className="grid h-[min(78vh,720px)] min-h-0 grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-slate-50/70">
          <div className="sticky top-0 px-3 py-4">
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
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
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-inset ${
                      active ? 'settings-nav-link bg-white text-slate-950 shadow-sm' : 'settings-nav-link text-slate-600 hover:bg-white/80 hover:text-slate-950'
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{section.label}</div>
                      <div className="mt-0.5 text-xs leading-5 text-slate-500">{section.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div ref={scrollRef} className="min-h-0 overflow-y-auto" onScroll={updateActiveSection}>
          <div className="px-6 py-5">
            <section ref={displayRef} className="border-b border-slate-200 pb-6">
              <SectionHeading eyebrow="UI" title="Appearance and guides" description="Theme, stage toggles, and guides." />
              <ThemeModeRow value={themeMode} onChange={onThemeModeChange} />
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

            <section ref={transferRef} className="border-b border-slate-200 py-6">
              <SectionHeading
                eyebrow="Import / Export"
                title="Document transfer"
                description="Import or export document JSON."
              />
              <PlainGroup title="Export">
                <ActionRow
                  icon={FileDown}
                  title="Save to file"
                  description="Uses the browser save picker when available."
                  actions={
                    <Button type="button" variant="outline" size="sm" onClick={handleSaveExport}>
                      Save
                    </Button>
                  }
                />
                <ActionRow
                  icon={Clipboard}
                  title="Copy to clipboard"
                  description="Copies the current document JSON."
                  actions={
                    <Button type="button" variant="outline" size="sm" onClick={handleCopyExport}>
                      Copy JSON
                    </Button>
                  }
                />
                <StatusMessage result={exportStatus} fallback="Exports include the document model only." />
              </PlainGroup>

              <PlainGroup title="Import" className="mt-6">
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
                <div className="border-t border-slate-200 px-4 py-4">
                  <div className="mb-2 text-xs font-medium text-slate-600">Imported JSON</div>
                  <Textarea
                    value={importBuffer}
                    onChange={(event) => setImportBuffer(event.target.value)}
                    placeholder="Paste exported document JSON here."
                    className="min-h-[220px] rounded-lg border-slate-200 font-mono text-xs leading-5"
                  />
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="max-w-[420px] text-xs leading-5 text-slate-500">
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
                <StatusMessage result={importStatus} fallback="Invalid JSON leaves the current stage unchanged." />
              </PlainGroup>
            </section>

            <section ref={advancedRef} className="border-b border-slate-200 py-6">
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
                <div className="space-y-2 text-sm text-slate-600">
                  {errors.length === 0 ? <p>No errors.</p> : errors.map((error) => <p key={error}>{error}</p>)}
                </div>
              </PlainGroup>

              <div className="mt-6">
                <div className="mb-3 text-sm font-medium text-slate-900">Sticky math</div>
                {hasStickyRegistrations ? (
                  <div className="space-y-3 text-xs text-slate-600">
                    {Object.values(stickyState).map((entry) => (
                      <div key={entry.wrapperId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="font-medium text-slate-900">{entry.wrapperId}</div>
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
                  <div className="text-sm text-slate-600">No sticky registrations.</div>
                )}
              </div>

              {selectedNode && selectedNode.type !== 'site' ? (
                <div className="mt-6">
                  <div className="mb-3 text-sm font-medium text-slate-900">Selected node</div>
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

            <section ref={shortcutsRef} className="border-t border-slate-200 py-6">
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

function ThemeModeRow({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
}) {
  const options: ThemeMode[] = ['light', 'dark', 'auto'];

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0 pr-4">
        <div className="text-sm font-medium text-slate-950">Theme</div>
        <div className="mt-1 text-sm text-slate-600">Switch the editor between light, dark, or system mode.</div>
      </div>
      <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={value === option ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(option)}
            className="min-w-[64px] rounded-md capitalize"
          >
            {option}
          </Button>
        ))}
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
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</div>
      <div className="mt-1 text-lg font-medium text-slate-950">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
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
      <div className="mb-3 text-sm font-medium text-slate-900">{title}</div>
      <div className="rounded-lg border border-slate-200 bg-white">{children}</div>
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
    <div className="flex items-start justify-between gap-4 border-t border-slate-200 py-4 first:border-t-0">
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-slate-950">{title}</div>
            {tooltip ? <InfoTooltip>{tooltip}</InfoTooltip> : null}
          </div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
          {note ? <div className="mt-1 text-xs text-slate-500">{note}</div> : null}
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
    <div className="flex flex-col gap-3 border-t border-slate-200 py-3 first:border-t-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
      <div className={`min-w-0 ${icon ? 'flex gap-3' : ''}`}>
        {Icon ? (
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-950">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
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
    <div className="flex items-center justify-between gap-4 border-t border-slate-200 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-950">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{description}</div>
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  );
}

function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <PopoverTooltip
      side="bottom"
      align="end"
      className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-5 text-slate-600 shadow-[0_16px_30px_rgba(15,23,42,0.14)]"
      content={children}
    >
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-600 focus-visible:border-slate-300 focus-visible:bg-slate-50/80 focus-visible:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-label="More information"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </PopoverTooltip>
  );
}

function StatusMessage({
  result,
  fallback,
}: {
  result: ActionResult | null;
  fallback: string;
}) {
  if (!result) {
    return <div className="px-4 py-3 text-xs text-slate-500">{fallback}</div>;
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

function normalizeFileName(input: string, fallback: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.endsWith('.json') ? trimmed : `${trimmed}.json`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}
