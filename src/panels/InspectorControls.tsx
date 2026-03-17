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
import type { BorderStyle, ShadowStyle, WrapperNode } from '../model/types';
import { parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue } from '../api/documentApi';
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
type SpacingMode = 'px' | 'em' | 'rem';
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
  disabled = false,
}: {
  label: string;
  nodeId: string;
  axis: SizeFieldAxis;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
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
    if (!disabled) {
      onChange(nextRaw);
    }
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
          <Select value={mode} onValueChange={handleModeChange} disabled={disabled}>
            <SelectTrigger className="peer/keywordtrigger h-full w-full justify-start rounded-sm border-0 bg-transparent px-2.5 pr-8 text-left text-[10px] tracking-[-0.01em] whitespace-nowrap shadow-none [&>svg]:hidden focus:border-0 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60">
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
                if (nextRaw && !disabled) {
                  onChange(nextRaw);
                }
              }}
              disabled={disabled}
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
                if (nextRaw && !disabled) {
                  onChange(nextRaw);
                }
              }}
              disabled={disabled}
              className="editor-inline-field-value peer/valueinput h-full flex-1 overflow-visible rounded-l-sm border-0 bg-transparent px-3 text-[11px] shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          )}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
            style={{ right: usesIconSuffix ? '52px' : '44px' }}
          />
          <div className={`group/unitsuffix relative ${suffixWidthClass}`}>
            <Select value={mode} onValueChange={handleModeChange} disabled={disabled}>
              <SelectTrigger
                className={`editor-inline-field-trigger peer/unittrigger relative z-10 h-full ${suffixWidthClass} justify-center rounded-r-sm rounded-l-none border-0 border-l bg-transparent px-0 text-center text-[10px] font-medium shadow-none [&>span]:w-full [&>span]:justify-center [&>svg]:hidden focus:border-0 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60`}
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
  showOpacity = true,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  ariaLabel: string;
  fallback?: string;
  showOpacity?: boolean;
}) {
  const resolvedColor = normalizeColorFieldValue(value, fallback);

  return (
    <div className="flex h-8 min-w-[8.75rem] items-center justify-end gap-2">
      {showOpacity ? (
        <div className="flex-1">
          <Slider
            aria-label={`${ariaLabel} opacity`}
            value={[resolvedColor.opacityPercent]}
            min={0}
            max={100}
            step={1}
            onValueChange={(nextValue) => {
              const nextOpacity = nextValue[0] ?? resolvedColor.opacityPercent;
              onChange(formatRgbColorValue(resolvedColor.red, resolvedColor.green, resolvedColor.blue, nextOpacity / 100));
            }}
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <div className="editor-icon-button-subtle relative h-8 w-8 shrink-0 overflow-hidden rounded-sm border shadow-sm">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(148,163,184,0.12)_25%,transparent_25%,transparent_75%,rgba(148,163,184,0.12)_75%,rgba(148,163,184,0.12)),linear-gradient(45deg,rgba(148,163,184,0.12)_25%,transparent_25%,transparent_75%,rgba(148,163,184,0.12)_75%,rgba(148,163,184,0.12))] bg-[length:8px_8px] bg-[position:0_0,4px_4px]" />
        <div className="absolute inset-[3px] rounded-[3px]" style={{ backgroundColor: resolvedColor.css }} />
        <input
          type="color"
          aria-label={ariaLabel}
          className="absolute inset-0 cursor-pointer opacity-0 focus-visible:outline-none"
          value={resolvedColor.hex}
          onChange={(event) => {
            const nextColor = normalizeColorFieldValue(event.target.value, resolvedColor.hex);
            onChange(formatRgbColorValue(nextColor.red, nextColor.green, nextColor.blue, resolvedColor.alpha));
          }}
        />
      </div>
    </div>
  );
}

export function BorderControlGroup({
  colorValue,
  widthValue,
  radiusValue,
  onColorChange,
  onWidthChange,
  onRadiusChange,
  showRadius = true,
  colorFallback = '#d8e0ea',
  widthPlaceholder = '1',
  radiusPlaceholder = '16',
}: {
  colorValue: string;
  widthValue: string;
  radiusValue: string;
  onColorChange: (value: string) => void;
  onWidthChange: (value: string) => void;
  onRadiusChange: (value: string) => void;
  showRadius?: boolean;
  colorFallback?: string;
  widthPlaceholder?: string;
  radiusPlaceholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-end">
        <HoverColorField value={colorValue || undefined} onChange={onColorChange} ariaLabel="Border color" fallback={colorFallback} />
      </div>
      <div className={`grid gap-1.5 ${showRadius ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <LabeledFixedUnitField
          label="Width"
          value={widthValue}
          unit="px"
          onChange={onWidthChange}
          placeholder={widthPlaceholder}
          min={0}
          step="any"
        />
        {showRadius ? (
          <LabeledUnitField
            label="Radius"
            value={radiusValue}
            units={['px', '%']}
            onChange={onRadiusChange}
            placeholder={radiusPlaceholder}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ShadowControlGroup({
  color,
  blur,
  distance,
  angle,
  onColorChange,
  onBlurChange,
  onDistanceChange,
  onAngleChange,
  colorFallback,
}: {
  color: string;
  blur: number;
  distance: number;
  angle: number;
  onColorChange: (value: string) => void;
  onBlurChange: (value: number) => void;
  onDistanceChange: (value: number) => void;
  onAngleChange: (value: number) => void;
  colorFallback: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-end">
        <HoverColorField value={color || undefined} onChange={onColorChange} ariaLabel="Shadow color" fallback={colorFallback} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <LabeledNumberField label="Blur" value={blur} onChange={onBlurChange} min={0} max={200} step={1} />
        <LabeledNumberField label="Distance" value={distance} onChange={onDistanceChange} min={0} max={400} step={1} />
        <LabeledNumberField label="Angle" value={angle} onChange={onAngleChange} min={-180} max={180} step={1} />
      </div>
    </div>
  );
}

export function LabeledNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      <NumberInput value={value} min={min} max={max} step={step} onChange={onChange} />
    </div>
  );
}

export function LabeledImplicitUnitField({
  label,
  value,
  units,
  onChange,
  placeholder,
  min,
  step,
}: {
  label: string;
  value: string;
  units: ('px' | '%')[];
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  step?: number | 'any';
}) {
  const parsed = value ? parseUnitValue(value) : null;
  const resolvedUnit = parsed && units.includes(parsed.parsed.unit as 'px' | '%') ? parsed.parsed.unit : units[0];
  const [draft, setDraft] = useState(parsed ? formatFieldNumber(clampFieldNumber(parsed.parsed.value)) : '');

  useEffect(() => {
    const nextParsed = value ? parseUnitValue(value) : null;
    setDraft(nextParsed ? formatFieldNumber(clampFieldNumber(nextParsed.parsed.value)) : '');
  }, [value]);

  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      <Input
        type="number"
        min={min}
        step={step}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          if (nextDraft.trim() === '') {
            onChange('');
            return;
          }
          const nextValue = Number.parseFloat(nextDraft);
          if (Number.isFinite(nextValue)) {
            onChange(`${nextValue}${resolvedUnit}`);
          }
        }}
        className="h-8 rounded-sm px-2 text-center text-[11px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}

export function LabeledFixedUnitField({
  label,
  value,
  unit,
  onChange,
  placeholder,
  min,
  step,
}: {
  label: string;
  value: string;
  unit: 'px' | '%';
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  step?: number | 'any';
}) {
  const parsed = value ? parseUnitValue(value) : null;
  const [draft, setDraft] = useState(parsed ? formatFieldNumber(clampFieldNumber(parsed.parsed.value)) : '');

  useEffect(() => {
    const nextParsed = value ? parseUnitValue(value) : null;
    setDraft(nextParsed ? formatFieldNumber(clampFieldNumber(nextParsed.parsed.value)) : '');
  }, [value]);

  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      <div className="group/inlinefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] editor-inline-field focus-within:border-blue-500">
        <Input
          type="number"
          min={min}
          step={step}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => {
            const nextDraft = event.target.value;
            setDraft(nextDraft);
            if (nextDraft.trim() === '') {
              onChange('');
              return;
            }
            const nextValue = Number.parseFloat(nextDraft);
            if (Number.isFinite(nextValue)) {
              onChange(`${nextValue}${unit}`);
            }
          }}
          className="editor-inline-field-value h-full flex-1 overflow-visible rounded-l-sm border-0 bg-transparent px-3 text-[11px] text-center shadow-none [appearance:textfield] focus-visible:border-0 focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div className="editor-inline-field-trigger editor-text-strong flex h-full w-[44px] min-w-[44px] items-center justify-center rounded-r-sm rounded-l-none border-0 border-l bg-transparent px-0 text-center text-[10px] font-medium">
          {unit}
        </div>
      </div>
    </div>
  );
}

export function LabeledUnitField({
  label,
  value,
  units,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  units: ('px' | '%')[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      <NumericUnitInlineField value={value} units={units} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

export function readUnifiedBorderColor(style: BorderStyle | undefined) {
  if (!style) {
    return '';
  }
  if (style.borderColor) {
    return style.borderColor;
  }
  const values = [style.borderTopColor, style.borderRightColor, style.borderBottomColor, style.borderLeftColor].filter(
    (value): value is string => Boolean(value),
  );
  return values.length === 4 && values.every((value) => value === values[0]) ? values[0] : '';
}

export function readUnifiedBorderWidth(style: BorderStyle | undefined) {
  if (!style) {
    return '';
  }
  if (style.borderWidth) {
    return style.borderWidth.raw;
  }
  return readUnifiedParsedValue([
    style.borderTopWidth?.raw,
    style.borderRightWidth?.raw,
    style.borderBottomWidth?.raw,
    style.borderLeftWidth?.raw,
  ]);
}

export function readUnifiedBorderRadius(style: BorderStyle | undefined) {
  if (!style) {
    return '';
  }
  if (style.borderRadius) {
    return style.borderRadius.raw;
  }
  return readUnifiedParsedValue([
    style.borderTopLeftRadius?.raw,
    style.borderTopRightRadius?.raw,
    style.borderBottomRightRadius?.raw,
    style.borderBottomLeftRadius?.raw,
  ]);
}

export function readShadowFieldValues(
  style: ShadowStyle | undefined,
  fallback: { color: string; blur: number; distance: number; angle: number },
) {
  const fallbackVector = offsetsFromDistanceAndAngle(fallback.distance, fallback.angle);
  const offsetX = style?.shadowOffsetX ?? fallbackVector.offsetX;
  const offsetY = style?.shadowOffsetY ?? fallbackVector.offsetY;
  return {
    color: style?.shadowColor ?? fallback.color,
    blur: style?.shadowBlur ?? fallback.blur,
    distance: roundShadowNumber(Math.sqrt(offsetX ** 2 + offsetY ** 2)),
    angle: roundShadowNumber((Math.atan2(offsetY, offsetX) * 180) / Math.PI),
  };
}

export function offsetsFromDistanceAndAngle(distance: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    offsetX: Math.cos(radians) * distance,
    offsetY: Math.sin(radians) * distance,
  };
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

export function SpacingField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseSpacingValue(value);
  const suffixWidth = '44px';

  return (
    <div className="editor-inline-field group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] focus-within:border-blue-500">
      <Input
        type="number"
        min={0}
        step="any"
        value={String(parsed.parsed.value)}
        onChange={(e) => {
          const next = Number.parseFloat(e.target.value);
          if (Number.isFinite(next) && next >= 0) {
            onChange(`${next}${parsed.parsed.unit}`);
          }
        }}
        className="editor-inline-field-value peer/valueinput h-full overflow-visible rounded-l-sm border-0 bg-transparent text-[11px] [appearance:textfield] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ right: suffixWidth }}
      />
      <Select
        value={parsed.parsed.unit}
        onValueChange={(nextUnit) => {
          onChange(`${parsed.parsed.value}${nextUnit as SpacingMode}`);
        }}
      >
        <SelectTrigger
          className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full justify-center rounded-r-sm rounded-l-none border-0 border-l bg-transparent px-0 text-center text-[10px] font-medium shadow-none [&>span]:w-full [&>span]:justify-center [&>svg]:hidden focus:border-0 focus:ring-0"
          style={{ width: suffixWidth }}
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
        style={{ width: suffixWidth }}
      >
        <ChevronDown className="editor-text-strong h-3.5 w-3.5" />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ width: suffixWidth }}
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

function readUnifiedParsedValue(values: Array<string | undefined>) {
  const defined = values.filter((value): value is string => Boolean(value));
  return defined.length === values.length && defined.every((value) => value === defined[0]) ? defined[0] : '';
}

type ParsedColorChannels = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

export function formatRgbColorValue(red: number, green: number, blue: number, alpha: number) {
  return `rgb(${clampColorChannel(red)} ${clampColorChannel(green)} ${clampColorChannel(blue)} / ${formatAlphaValue(alpha)})`;
}

export function parseColorFieldValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hexMatch = trimmed.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (hexMatch) {
    return parseHexColorValue(hexMatch[1]);
  }

  const functionMatch = trimmed.match(/^rgba?\((.+)\)$/i);
  if (!functionMatch) {
    return null;
  }

  return parseFunctionalColorValue(functionMatch[1]);
}

export function normalizeColorFieldValue(value: string | undefined, fallback: string) {
  const parsed = parseColorFieldValue(value) ?? parseColorFieldValue(fallback) ?? { red: 255, green: 255, blue: 255, alpha: 1 };

  return {
    ...parsed,
    hex: formatHexColorValue(parsed.red, parsed.green, parsed.blue),
    css: formatRgbColorValue(parsed.red, parsed.green, parsed.blue, parsed.alpha),
    opacityPercent: Math.round(parsed.alpha * 100),
  };
}

function roundShadowNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function parseHexColorValue(value: string): ParsedColorChannels | null {
  if (value.length === 3 || value.length === 4) {
    const expanded = value
      .split('')
      .map((part) => `${part}${part}`)
      .join('');

    return parseHexColorValue(expanded);
  }

  if (value.length !== 6 && value.length !== 8) {
    return null;
  }

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const alpha = value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) / 255 : 1;

  if (![red, green, blue, alpha].every((part) => Number.isFinite(part))) {
    return null;
  }

  return {
    red: clampColorChannel(red),
    green: clampColorChannel(green),
    blue: clampColorChannel(blue),
    alpha: clamp(alpha, 0, 1),
  };
}

function parseFunctionalColorValue(value: string): ParsedColorChannels | null {
  const normalized = value.trim();
  const slashParts = normalized.split('/');
  const channelTokens = splitColorTokens(slashParts[0] ?? '');
  const alphaToken =
    slashParts.length > 1
      ? slashParts[1]?.trim()
      : channelTokens.length === 4
        ? channelTokens[3]
        : undefined;
  const rgbTokens = alphaToken && channelTokens.length === 4 ? channelTokens.slice(0, 3) : channelTokens;

  if (rgbTokens.length !== 3) {
    return null;
  }

  const red = parseColorChannel(rgbTokens[0]);
  const green = parseColorChannel(rgbTokens[1]);
  const blue = parseColorChannel(rgbTokens[2]);
  const alpha = parseAlphaChannel(alphaToken);

  if (red === null || green === null || blue === null || alpha === null) {
    return null;
  }

  return { red, green, blue, alpha };
}

function splitColorTokens(value: string) {
  return value
    .trim()
    .split(value.includes(',') ? /\s*,\s*/ : /\s+/)
    .filter(Boolean);
}

function parseColorChannel(value: string | undefined) {
  if (!value) {
    return null;
  }
  if (value.endsWith('%')) {
    const parsed = Number.parseFloat(value.slice(0, -1));
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return clampColorChannel((parsed / 100) * 255);
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clampColorChannel(parsed);
}

function parseAlphaChannel(value: string | undefined) {
  if (!value) {
    return 1;
  }
  if (value.endsWith('%')) {
    const parsed = Number.parseFloat(value.slice(0, -1));
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return clamp(parsed / 100, 0, 1);
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clamp(parsed, 0, 1);
}

function formatHexColorValue(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) => clampColorChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

function clampColorChannel(value: number) {
  return Math.round(clamp(value, 0, 255));
}

function formatAlphaValue(value: number) {
  return clamp(value, 0, 1).toFixed(3).replace(/\.?0+$/, '');
}
