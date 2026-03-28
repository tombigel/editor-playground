import type { CSSProperties, ReactNode } from 'react';
import { SlidersHorizontal, TriangleAlert } from 'lucide-react';
import type { FocusedMode } from '../../api/editorApi';
import { FOCUSED_MODE_VALUES, getFocusedModeLabel } from '../../editor/focusedModes';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  CompactSelectRow,
  type CompactSelectOption,
} from '@/components/ui/settings-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import type { ActionResult } from '../settingsTransfer';

export {
  ActionRow,
  CompactSelectRow,
  InfoTooltip,
  NumericRow,
  PlainGroup,
  SectionHeading,
  SettingRow,
} from '@/components/ui/settings-panel';
export type { CompactSelectOption } from '@/components/ui/settings-panel';

export function TransferSubsection({
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
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function StatusMessage({
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
      {result.ok ? null : <TriangleAlert className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />}
      {result.message}
    </div>
  );
}

export function ThemePresetRow({
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
  const paletteOptions =
    paletteTheme === 'light'
      ? EDITOR_LIGHT_THEME_OPTIONS
      : EDITOR_DARK_THEME_OPTIONS;
  const paletteValue = paletteTheme === 'light' ? lightTheme : darkTheme;
  const themeOptions: CompactSelectOption[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <div className="editor-border-subtle border-t py-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CompactSelectRow
          title="Theme"
          value={themeMode}
          ariaLabel="Theme"
          options={themeOptions}
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

export function AccentSwatchRow({
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
      <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
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

export function FocusedModeStartupRow({
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
          onValueChange={(next) =>
            onChange(next === 'normal' ? null : (next as Exclude<FocusedMode, null>))
          }
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
