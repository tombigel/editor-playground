import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BetweenHorizontalStart,
  ChevronDown,
  ListEnd,
  ListStart,
  PanelBottom,
  PanelTop,
  Proportions,
} from 'lucide-react';
import type { WrapperNode } from '../api/documentApi';
import { parseFontSizeValue, parseHeightValue, parseUnitValue, parseWidthValue } from '../api/documentApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

export type SizeFieldAxis = 'x' | 'y' | 'width' | 'height';
type SizeFieldMode =
  | 'px'
  | '%'
  | 'vw'
  | 'vh'
  | 'vmin'
  | 'vmax'
  | 'fit-content'
  | 'min-content'
  | 'max-content'
  | 'auto'
  | 'aspect-ratio';
type FontSizeMode = 'px' | 'em' | 'rem';
export type SizeFieldDescriptor =
  | { kind: 'numeric'; mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>; input: string }
  | { kind: 'keyword'; mode: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content' | 'auto'>; input: '' }
  | { kind: 'aspect-ratio'; mode: 'aspect-ratio'; input: string };

const WIDTH_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content'>[] = [
  'fit-content',
  'min-content',
  'max-content',
];
const HEIGHT_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'auto' | 'aspect-ratio'>[] = ['auto', 'aspect-ratio'];
const FONT_SIZE_UNIT_OPTIONS: FontSizeMode[] = ['px', 'em', 'rem'];

export function SizeInlineField({
  label,
  nodeId,
  axis,
  value,
  onChange,
}: {
  label: string;
  nodeId: string;
  axis: SizeFieldAxis;
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<SizeFieldMode>(() => describeSizeFieldValue(value, axis).mode);
  const [numericDraft, setNumericDraft] = useState(() => getInitialNumericDraft(value, axis));
  const [aspectDraft, setAspectDraft] = useState(() => getInitialAspectDraft(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const descriptor = describeSizeFieldValue(value, axis);
    setMode(descriptor.mode);
    if (descriptor.kind === 'numeric') {
      setNumericDraft(descriptor.input);
    }
    if (descriptor.kind === 'aspect-ratio') {
      setAspectDraft(descriptor.input);
    }
    setInvalid(false);
  }, [axis, value]);

  const descriptor = describeSizeFieldValue(value, axis);
  const showNumericInput =
    mode === 'px' || mode === '%' || mode === 'vw' || mode === 'vh' || mode === 'vmin' || mode === 'vmax';
  const showAspectInput = mode === 'aspect-ratio';
  const showKeywordTriggerOnly = !showNumericInput && !showAspectInput;
  const suffixWidthClass = showAspectInput ? 'w-[52px] min-w-[52px]' : 'w-[44px] min-w-[44px]';
  const usesIconSuffix = mode === 'aspect-ratio';
  const shellClass = invalid
    ? 'editor-inline-field editor-inline-field-invalid focus-within:border-red-400'
    : 'editor-inline-field focus-within:border-blue-500';

  function commitDraft(nextMode: SizeFieldMode, nextInput?: string) {
    const candidateInput = nextInput ?? (nextMode === 'aspect-ratio' ? aspectDraft : numericDraft);
    const nextRaw = buildSizeFieldValue(axis, nextMode, candidateInput);
    if (!nextRaw) {
      setInvalid(true);
      return false;
    }
    setInvalid(false);
    onChange(nextRaw);
    return true;
  }

  function handleModeChange(nextMode: string) {
    const resolvedMode = nextMode as SizeFieldMode;
    setMode(resolvedMode);

    if (resolvedMode === 'aspect-ratio') {
      const nextAspect = descriptor.kind === 'aspect-ratio' ? descriptor.input : aspectDraft || '16/9';
      setAspectDraft(nextAspect);
      commitDraft(resolvedMode, nextAspect);
      return;
    }

    if (
      resolvedMode === 'auto' ||
      resolvedMode === 'fit-content' ||
      resolvedMode === 'min-content' ||
      resolvedMode === 'max-content'
    ) {
      commitDraft(resolvedMode);
      return;
    }

    const convertedNumeric = convertStageMeasurementToInput(nodeId, axis, resolvedMode);
    const nextNumeric =
      convertedNumeric ?? (descriptor.kind === 'numeric' ? descriptor.input : numericDraft || getDefaultNumericDraft(axis));
    setNumericDraft(nextNumeric);
    commitDraft(resolvedMode, nextNumeric);
  }

  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
      <Label className="text-[11px] font-medium">{label}</Label>
      {showKeywordTriggerOnly ? (
        <div
          className={`group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${shellClass}`}
        >
          <Select value={mode} onValueChange={handleModeChange}>
            <SelectTrigger className="peer/keywordtrigger h-full w-full justify-start rounded-sm border-0 bg-transparent px-2.5 pr-8 text-left text-[10px] tracking-[-0.01em] whitespace-nowrap shadow-none [&>svg]:hidden focus:border-0 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{renderSizeModeOptions(axis)}</SelectContent>
          </Select>
          <div className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex w-9 items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/keywordtrigger:opacity-100 peer-data-[state=open]/keywordtrigger:opacity-100">
            <ChevronDown className="editor-text-strong h-3.5 w-3.5" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-9 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/keywordtrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/keywordtrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]" />
        </div>
      ) : (
        <div
          className={`group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${shellClass}`}
        >
          {showNumericInput ? (
            <Input
              type="number"
              step="any"
              value={numericDraft}
              onChange={(e) => {
                const next = e.target.value;
                setNumericDraft(next);
                const nextRaw = buildSizeFieldValue(axis, mode, next);
                setInvalid(!nextRaw);
                if (nextRaw) {
                  onChange(nextRaw);
                }
              }}
              className="editor-inline-field-value peer/valueinput h-full flex-1 overflow-visible rounded-l-sm border-0 bg-transparent px-3 text-[11px] shadow-none [appearance:textfield] focus-visible:border-0 focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          ) : (
            <Input
              value={aspectDraft}
              onChange={(e) => {
                const next = e.target.value;
                setAspectDraft(next);
                const nextRaw = buildSizeFieldValue(axis, 'aspect-ratio', next);
                setInvalid(!nextRaw);
                if (nextRaw) {
                  onChange(nextRaw);
                }
              }}
              className="editor-inline-field-value peer/valueinput h-full flex-1 overflow-visible rounded-l-sm border-0 bg-transparent px-3 text-[11px] shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          )}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
            style={{ right: usesIconSuffix ? '52px' : '44px' }}
          />
          <div className={`group/unitsuffix relative ${suffixWidthClass}`}>
            <Select value={mode} onValueChange={handleModeChange}>
              <SelectTrigger
                className={`editor-inline-field-trigger peer/unittrigger relative z-10 h-full ${suffixWidthClass} justify-center rounded-r-sm rounded-l-none border-0 border-l bg-transparent px-0 text-center text-[10px] font-medium shadow-none [&>span]:w-full [&>span]:justify-center [&>svg]:hidden focus:border-0 focus:ring-0`}
              >
                {usesIconSuffix ? (
                  <span className="flex w-full items-center justify-center">
                    <Proportions className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>{renderSizeModeOptions(axis)}</SelectContent>
            </Select>
            <div
              className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/unitsuffix:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100"
              style={{ width: usesIconSuffix ? '52px' : '44px' }}
            >
              <ChevronDown className="editor-text-strong h-3.5 w-3.5" />
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
              style={{ width: usesIconSuffix ? '52px' : '44px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function NumericUnitInlineField({
  value,
  units,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  units: ('px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax')[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const parsed = value ? parseUnitValue(value) : null;
  const initialUnit = parsed && units.includes(parsed.parsed.unit) ? parsed.parsed.unit : units[0];
  const [draft, setDraft] = useState(parsed ? String(parsed.parsed.value) : '');
  const [unit, setUnit] = useState(initialUnit);
  const hasUnitSelector = units.length > 1;
  const suffixWidth = '44px';

  useEffect(() => {
    const nextParsed = value ? parseUnitValue(value) : null;
    const nextUnit = nextParsed && units.includes(nextParsed.parsed.unit) ? nextParsed.parsed.unit : units[0];
    setDraft(nextParsed ? String(nextParsed.parsed.value) : '');
    setUnit(nextUnit);
  }, [units, value]);

  function commit(nextDraft: string, nextUnit: typeof unit) {
    if (!nextDraft) {
      onChange('');
      return;
    }

    const nextValue = Number.parseFloat(nextDraft);
    if (!Number.isFinite(nextValue)) {
      return;
    }

    onChange(`${nextDraft}${nextUnit}`);
  }

  return (
    <div className={`editor-inline-field group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] focus-within:border-blue-500 ${className}`.trim()}>
      <Input
        type="number"
        step="any"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          commit(nextDraft, unit);
        }}
        className="editor-inline-field-value peer/valueinput h-full overflow-visible rounded-l-sm border-0 bg-transparent text-[11px] [appearance:textfield] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ right: suffixWidth }}
      />
      {hasUnitSelector ? (
        <>
          <Select
            value={unit}
            onValueChange={(nextUnit) => {
              const resolvedUnit = nextUnit as typeof unit;
              setUnit(resolvedUnit);
              commit(draft, resolvedUnit);
            }}
          >
            <SelectTrigger
              className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full justify-center rounded-r-sm rounded-l-none border-0 border-l bg-transparent px-0 text-center text-[10px] font-medium shadow-none [&>span]:w-full [&>span]:justify-center [&>svg]:hidden focus:border-0 focus:ring-0"
              style={{ width: suffixWidth }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div
            className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100"
            style={{ width: suffixWidth }}
          >
            <ChevronDown className="editor-text-strong h-3.5 w-3.5" />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
            style={{ width: suffixWidth }}
          />
        </>
      ) : (
        <div
          className="editor-inline-field-trigger pointer-events-none relative z-10 flex h-full items-center justify-center rounded-r-sm rounded-l-none border-0 border-l bg-transparent px-0 text-center text-[11px] font-medium shadow-none"
          style={{ width: suffixWidth }}
        >
          {unit}
        </div>
      )}
    </div>
  );
}

export function HoverColorField({
  value,
  onChange,
  ariaLabel,
  fallback = '#ffffff',
  inputWidthClass = 'w-[4.75rem]',
  gapPx = 8,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  ariaLabel: string;
  fallback?: string;
  inputWidthClass?: string;
  gapPx?: number;
}) {
  const normalizedValue = normalizeHexColor(value, fallback);
  const gapStyle = { width: `${gapPx}px`, right: '100%' };
  const inputOffsetStyle = { right: `calc(100% + ${gapPx}px)` };

  return (
    <div className="group/colorfield relative flex h-8 w-8 shrink-0 items-center justify-end overflow-visible">
      <div aria-hidden="true" className="absolute top-1/2 z-20 h-8 -translate-y-1/2" style={gapStyle} />
      <div
        className={`pointer-events-none absolute top-1/2 z-30 origin-right -translate-y-1/2 rounded-sm opacity-0 shadow-[0_3px_10px_rgba(18,32,51,0.06)] translate-x-1.5 scale-[0.985] transition-[opacity,transform] duration-120 ease-out group-hover/colorfield:pointer-events-auto group-hover/colorfield:opacity-100 group-hover/colorfield:translate-x-0 group-hover/colorfield:scale-100 group-hover/colorfield:duration-220 group-hover/colorfield:ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within/colorfield:pointer-events-auto group-focus-within/colorfield:opacity-100 group-focus-within/colorfield:translate-x-0 group-focus-within/colorfield:scale-100 group-focus-within/colorfield:duration-220 group-focus-within/colorfield:ease-[cubic-bezier(0.22,1,0.36,1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.16)] ${inputWidthClass}`}
        style={inputOffsetStyle}
      >
        <Input
          value={normalizedValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full rounded-sm font-mono text-[11px] uppercase"
        />
      </div>
      <input
        type="color"
        aria-label={ariaLabel}
        className="editor-icon-button-subtle relative z-10 h-8 w-8 cursor-pointer rounded-sm border p-0 shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none"
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function renderSizeModeOptions(axis: SizeFieldAxis) {
  const isLengthOnlyAxis = axis === 'x' || axis === 'y';
  const scalarUnits = isLengthOnlyAxis ? ['px'] : ['px', '%'];
  const viewportUnits = ['vw', 'vh', 'vmin', 'vmax'];
  const keywords =
    axis === 'width'
      ? WIDTH_KEYWORD_OPTIONS
      : axis === 'height'
        ? HEIGHT_KEYWORD_OPTIONS
        : null;

  return (
    <>
      {scalarUnits.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
      {keywords ? <SelectSeparator /> : null}
      {keywords?.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
      <SelectSeparator />
      {viewportUnits.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
    </>
  );
}

export function OrderIconButton({
  label,
  shortcut,
  onClick,
  disabled,
  compact = false,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={
        <>
          <div className="leading-3.5 font-medium">{label}</div>
          {shortcut ? (
            <div className="editor-tooltip-shortcut mt-0.5 font-mono text-[10px] font-light leading-3">{shortcut}</div>
          ) : null}
        </>
      }
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`${compact ? 'h-8 w-8' : 'h-8 w-8'} p-0 text-xs`}
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

function TypeIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Button
        type="button"
        variant={active ? 'default' : 'outline'}
        size="sm"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className="h-8 w-8 p-0 text-xs"
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

export function TextStyleIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Button
        type="button"
        variant={active ? 'default' : 'outline'}
        size="sm"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className="h-8 w-8 p-0 text-xs"
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function FontSizeField({
  nodeId,
  value,
  onChange,
}: {
  nodeId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseFontSizeValue(value);
  const fontSizeSuffixWidth = '44px';
  return (
    <div className="editor-inline-field group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] focus-within:border-blue-500">
      <Input
        type="number"
        min={1}
        step="any"
        value={String(parsed.parsed.value)}
        onChange={(e) => {
          const next = Number.parseFloat(e.target.value);
          if (Number.isFinite(next) && next > 0) {
            onChange(`${next}${parsed.parsed.unit}`);
          }
        }}
        className="editor-inline-field-value peer/valueinput h-full overflow-visible rounded-l-sm border-0 bg-transparent text-[11px] [appearance:textfield] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ right: fontSizeSuffixWidth }}
      />
      <Select
        value={parsed.parsed.unit}
        onValueChange={(nextUnit) => {
          const converted = convertStageFontSizeToInput(nodeId, nextUnit as FontSizeMode);
          onChange(`${converted ?? parsed.parsed.value}${nextUnit as FontSizeMode}`);
        }}
      >
        <SelectTrigger
          className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full justify-center rounded-r-sm rounded-l-none border-0 border-l bg-transparent px-0 text-center text-[10px] font-medium shadow-none [&>span]:w-full [&>span]:justify-center [&>svg]:hidden focus:border-0 focus:ring-0"
          style={{ width: fontSizeSuffixWidth }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZE_UNIT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div
        className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100"
        style={{ width: fontSizeSuffixWidth }}
      >
        <ChevronDown className="editor-text-strong h-3.5 w-3.5" />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ width: fontSizeSuffixWidth }}
      />
    </div>
  );
}

export function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      value={formatFieldNumber(clampFieldNumber(value))}
      onChange={(e) => {
        const next = Number.parseFloat(e.target.value);
        if (Number.isFinite(next) && next >= min && next <= max) {
          onChange(next);
        }
      }}
      className="h-8 rounded-sm px-2 text-center text-[11px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onValueChange,
}: {
  label: string | null;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] font-medium">{label}</Label>
          <span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">
            {value}
            {unit}
          </span>
        </div>
      ) : (
        <div className="flex justify-end">
          <span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">
            {value}
            {unit}
          </span>
        </div>
      )}
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onValueChange(next ?? value)} />
    </div>
  );
}

export function StickyOffsetBandField({
  topOffset,
  bottomOffset,
  min,
  max,
  step,
  unit,
  onValueChange,
}: {
  topOffset: number;
  bottomOffset: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (topOffset: number, bottomOffset: number) => void;
}) {
  const topValue = clamp(topOffset, min, max);
  const bottomValue = clamp(bottomOffset, min, max);
  const sliderEndFromTop = clamp(max - bottomValue, min, max);
  const sliderStart = Math.min(topValue, sliderEndFromTop);
  const sliderEnd = Math.max(topValue, sliderEndFromTop);
  const rangeSpan = Math.max(0, sliderEnd - sliderStart);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-medium">Offset Range</Label>
        <span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">
          Span {Math.round(rangeSpan)}
          {unit}
        </span>
      </div>
      <div className="editor-text-muted grid grid-cols-2 gap-1 text-[10px]">
        <span className="editor-bg-subtle inline-flex items-center gap-1 rounded-md px-2 py-0.5">
          <ArrowUp className="editor-text-muted h-3 w-3" />
          Top {Math.round(topValue)}
          {unit}
        </span>
        <span className="editor-bg-subtle inline-flex items-center justify-end gap-1 rounded-md px-2 py-0.5 text-right">
          Bottom {Math.round(bottomValue)}
          {unit}
          <ArrowDown className="editor-text-muted h-3 w-3" />
        </span>
      </div>
      <Slider
        value={[sliderStart, sliderEnd]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => {
          if (next.length < 2) {
            return;
          }
          const rawStart = next[0] ?? sliderStart;
          const rawEnd = next[1] ?? sliderEnd;
          const nextStart = Math.min(rawStart, rawEnd);
          const nextEnd = Math.max(rawStart, rawEnd);
          const nextTop = clamp(Math.round(nextStart), min, max);
          const nextBottom = clamp(Math.round(max - nextEnd), min, max);
          onValueChange(nextTop, nextBottom);
        }}
      />
    </div>
  );
}

export function WrapperActions({
  node,
  canSectionBack,
  canSectionForward,
  onSectionBack,
  onSectionForward,
  onPromote,
  onDemote,
}: {
  node: WrapperNode;
  canSectionBack: boolean;
  canSectionForward: boolean;
  onSectionBack: () => void;
  onSectionForward: () => void;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  const currentType =
    node.role === 'section' || node.role === 'header' || node.role === 'footer' ? node.role : null;

  if (node.role === 'section') {
    return (
      <div className="space-y-1.5">
        <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">Order</Label>
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
            <OrderIconButton compact label="Move Section Up" onClick={onSectionBack} disabled={!canSectionBack}>
              <ListStart className="h-3.5 w-3.5" />
            </OrderIconButton>
            <OrderIconButton compact label="Move Section Down" onClick={onSectionForward} disabled={!canSectionForward}>
              <ListEnd className="h-3.5 w-3.5" />
            </OrderIconButton>
          </div>
        </div>
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">Section type</Label>
          <SectionTypeSelector currentType={currentType} onPromote={onPromote} onDemote={onDemote} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-1">
      <Label className="text-[11px] font-medium">Section type</Label>
      <SectionTypeSelector currentType={currentType} onPromote={onPromote} onDemote={onDemote} />
    </div>
  );
}

function SectionTypeSelector({
  currentType,
  onPromote,
  onDemote,
}: {
  currentType: 'section' | 'header' | 'footer' | null;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
      <TypeIconButton
        label="Set type to Section"
        active={currentType === 'section'}
        onClick={currentType === 'section' ? () => {} : onDemote}
      >
        <BetweenHorizontalStart className="h-3.5 w-3.5" />
      </TypeIconButton>
      <TypeIconButton
        label="Set type to Header"
        active={currentType === 'header'}
        onClick={currentType === 'header' ? () => {} : () => onPromote('header')}
      >
        <PanelTop className="h-3.5 w-3.5" />
      </TypeIconButton>
      <TypeIconButton
        label="Set type to Footer"
        active={currentType === 'footer'}
        onClick={currentType === 'footer' ? () => {} : () => onPromote('footer')}
      >
        <PanelBottom className="h-3.5 w-3.5" />
      </TypeIconButton>
    </div>
  );
}

export function describeSizeFieldValue(value: string, axis: SizeFieldAxis): SizeFieldDescriptor {
  const parsed =
    axis === 'width'
      ? parseWidthValue(value)
      : axis === 'height'
        ? parseHeightValue(value)
        : parseUnitValue(value);
  if ('unit' in parsed.parsed) {
    return {
      kind: 'numeric',
      mode: parsed.parsed.unit,
      input: formatNumericFieldInput(parsed.parsed.value, parsed.parsed.unit),
    };
  }
  if (parsed.parsed.keyword === 'aspect-ratio') {
    return {
      kind: 'aspect-ratio',
      mode: 'aspect-ratio',
      input: extractAspectRatioExpression(parsed.raw),
    };
  }
  return {
    kind: 'keyword',
    mode: parsed.parsed.keyword,
    input: '',
  };
}

export function buildSizeFieldValue(axis: SizeFieldAxis, mode: SizeFieldMode, input: string) {
  if (axis === 'x' || axis === 'y') {
    if (mode !== 'px' && mode !== 'vw' && mode !== 'vh' && mode !== 'vmin' && mode !== 'vmax') {
      return null;
    }
    const numeric = input.trim();
    if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) {
      return null;
    }
    const nextRaw = `${numeric}${mode}`;
    try {
      parseUnitValue(nextRaw);
      return nextRaw;
    } catch {
      return null;
    }
  }

  if (mode === 'fit-content' || mode === 'min-content' || mode === 'max-content') {
    return axis === 'width' ? mode : null;
  }
  if (mode === 'auto') {
    return axis === 'height' ? mode : null;
  }
  if (mode === 'aspect-ratio') {
    if (axis !== 'height') {
      return null;
    }
    const normalized = normalizeAspectRatioExpression(input);
    return normalized ? `aspect-ratio(${normalized})` : null;
  }

  const numeric = input.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) {
    return null;
  }
  const nextRaw = `${numeric}${mode}`;
  try {
    if (axis === 'width') {
      parseWidthValue(nextRaw);
    } else {
      parseHeightValue(nextRaw);
    }
    return nextRaw;
  } catch {
    return null;
  }
}

export function normalizeAspectRatioExpression(input: string) {
  const trimmed = input.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed) > 0 ? trimmed : null;
  }

  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!fractionMatch) {
    return null;
  }

  const left = Number(fractionMatch[1]);
  const right = Number(fractionMatch[2]);
  if (left <= 0 || right <= 0) {
    return null;
  }

  return `${fractionMatch[1]}/${fractionMatch[2]}`;
}

export function convertRenderedPxToUnitValue(
  px: number,
  axis: SizeFieldAxis,
  mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
  parentSizePx?: number,
  viewportSizePx?: number,
) {
  if (!Number.isFinite(px)) {
    return null;
  }

  if (mode === 'px') {
    return roundGeometryValue(px);
  }

  if (mode === '%') {
    if ((axis === 'x' || axis === 'y') || !parentSizePx || parentSizePx <= 0) {
      return null;
    }
    return roundGeometryValue((px / parentSizePx) * 100);
  }

  if (mode === 'vw' || mode === 'vh') {
    if (!viewportSizePx || viewportSizePx <= 0) {
      return null;
    }
    return roundGeometryValue((px / viewportSizePx) * 100);
  }

  if (!viewportSizePx || viewportSizePx <= 0) {
    return null;
  }
  return roundGeometryValue((px / viewportSizePx) * 100);
}

export function convertStageMeasurementToInput(
  nodeId: string,
  axis: SizeFieldAxis,
  mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
  ownerDocument: Document = document,
) {
  const measurement = measureStageGeometry(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const px =
    axis === 'x'
      ? measurement.offsetX
      : axis === 'y'
        ? measurement.offsetY
        : axis === 'width'
          ? measurement.width
          : measurement.height;
  const parentSize =
    axis === 'width'
      ? measurement.parentWidth
      : axis === 'height'
        ? measurement.parentHeight
        : undefined;
  const viewportSize =
    mode === 'vw'
      ? measurement.viewportWidth
      : mode === 'vh'
        ? measurement.viewportHeight
        : mode === 'vmin'
          ? Math.min(measurement.viewportWidth ?? 0, measurement.viewportHeight ?? 0)
          : mode === 'vmax'
            ? Math.max(measurement.viewportWidth ?? 0, measurement.viewportHeight ?? 0)
            : undefined;

  const converted = convertRenderedPxToUnitValue(px, axis, mode, parentSize, viewportSize);
  return converted == null ? null : formatNumericFieldInput(converted, mode);
}

export function convertRenderedPxToFontSizeValue(
  px: number,
  mode: FontSizeMode,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  if (!Number.isFinite(px) || px <= 0) {
    return null;
  }

  if (mode === 'px') {
    return clampFieldNumber(px);
  }

  const base = mode === 'rem' ? reference.rootFontSizePx : reference.inheritedFontSizePx;
  if (!Number.isFinite(base) || base <= 0) {
    return null;
  }
  return clampFieldNumber(px / base);
}

export function convertStageFontSizeToInput(
  nodeId: string,
  mode: FontSizeMode,
  ownerDocument: Document = document,
) {
  const measurement = measureStageFontSize(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToFontSizeValue(measurement.fontSizePx, mode, {
    rootFontSizePx: measurement.rootFontSizePx,
    inheritedFontSizePx: measurement.inheritedFontSizePx,
  });
  return converted == null ? null : formatFieldNumber(converted);
}

function measureStageGeometry(nodeId: string, ownerDocument: Document) {
  const element = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const parentContent =
    element.parentElement?.closest<HTMLElement>('[data-content-wrapper-for]') ??
    element.parentElement;
  const parentRect = parentContent?.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
    offsetX: parentRect ? rect.left - parentRect.left : rect.left,
    offsetY: parentRect ? rect.top - parentRect.top : rect.top,
    parentWidth: parentRect?.width,
    parentHeight: parentRect?.height,
    viewportWidth: ownerDocument.defaultView?.innerWidth,
    viewportHeight: ownerDocument.defaultView?.innerHeight,
  };
}

function measureStageFontSize(nodeId: string, ownerDocument: Document) {
  const element = ownerDocument.getElementById(`stage-node-${nodeId}`);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const parentComputed = defaultView.getComputedStyle(element.parentElement ?? element);
  const rootComputed = defaultView.getComputedStyle(ownerDocument.documentElement);
  const fontSizePx = Number.parseFloat(computed.fontSize);
  const inheritedFontSizePx = Number.parseFloat(parentComputed.fontSize);
  const rootFontSizePx = Number.parseFloat(rootComputed.fontSize);
  if (!Number.isFinite(fontSizePx) || !Number.isFinite(inheritedFontSizePx) || !Number.isFinite(rootFontSizePx)) {
    return null;
  }

  return {
    fontSizePx,
    inheritedFontSizePx,
    rootFontSizePx,
  };
}

function roundGeometryValue(value: number) {
  return Math.round(value * 1000) / 1000;
}

function formatNumericFieldInput(
  value: number,
  unit: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
) {
  return formatFieldNumber(unit === 'px' ? clampFieldNumber(value) : clampFieldNumber(value));
}

function clampFieldNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function formatFieldNumber(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function extractAspectRatioExpression(raw: string) {
  const match = raw.trim().match(/^aspect-ratio\(\s*(.+?)\s*\)$/);
  return match?.[1] ?? '16/9';
}

function getInitialNumericDraft(value: string, axis: SizeFieldAxis) {
  const descriptor = describeSizeFieldValue(value, axis);
  return descriptor.kind === 'numeric' ? descriptor.input : getDefaultNumericDraft(axis);
}

function getInitialAspectDraft(value: string) {
  try {
    const descriptor = describeSizeFieldValue(value, 'height');
    return descriptor.kind === 'aspect-ratio' ? descriptor.input : '16/9';
  } catch {
    return '16/9';
  }
}

function getDefaultNumericDraft(axis: SizeFieldAxis) {
  if (axis === 'width') {
    return '240';
  }
  if (axis === 'height') {
    return '120';
  }
  return '0';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  return fallback;
}
