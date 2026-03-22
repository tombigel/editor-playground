import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Info,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react';
import type { FocusedMode } from '../../api/editorApi';
import { FOCUSED_MODE_VALUES, getFocusedModeLabel } from '../../editor/focusedModes';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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

export function SectionHeading({
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

export function PlainGroup({
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
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}

export function SettingRow({
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

export function ActionRow({
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
          <div className="editor-icon-surface mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
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

export function NumericRow({
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
          className="text-sm"
        />
      </div>
    </div>
  );
}

export function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="editor-bg-subtle editor-border-subtle rounded-lg border px-3 py-2">
      <div className="editor-text-muted text-[11px] font-medium">{label}</div>
      <div className="editor-text-strong mt-1 text-sm">{value}</div>
    </div>
  );
}

export function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <PopoverTooltip
      side="bottom"
      align="end"
      className="editor-tooltip-panel w-64 rounded-lg border px-3 py-2 text-xs font-normal leading-5"
      content={children}
    >
      <button
        type="button"
        className="editor-icon-button-subtle inline-flex h-5 w-5 items-center justify-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-label="More information"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </PopoverTooltip>
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

export function ThemeModeRow({
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
        <div className="editor-text-strong text-sm font-medium">Theme</div>
        <div className="editor-text-muted mt-1 text-sm">Switch the editor between light, dark, or system mode.</div>
      </div>
      <div className="editor-bg-subtle editor-border-subtle inline-flex shrink-0 rounded-lg border p-1">
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

export function CompactSelectRow({
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

