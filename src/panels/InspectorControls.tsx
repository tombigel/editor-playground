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
import {
  convertRenderedPxToBorderRadiusUnit,
  convertRenderedPxToFontRelativeUnit,
  convertRenderedPxToGeometryUnit,
  convertRenderedPxToSpacingUnit,
  formatDisplayValue,
} from '../model/conversion';
import { forceOpaqueColorValue } from '../model/colors';
import type { BorderStyle, ShadowStyle, ViewportMeasurement, WrapperNode } from '../model/types';
import { parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue } from '../api/documentApi';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
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
type NumericSizeFieldMode = Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>;
type FontSizeMode = 'px' | 'em' | 'rem';
type SpacingMode = 'px' | 'em' | 'rem';
export type SpacingAxis = 'block' | 'inline' | 'top' | 'right' | 'bottom' | 'left';
export type SizeFieldDescriptor =
  | { kind: 'numeric'; mode: NumericSizeFieldMode; input: string }
  | { kind: 'keyword'; mode: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content' | 'auto'>; input: '' }
  | { kind: 'aspect-ratio'; mode: 'aspect-ratio'; input: string };

const WIDTH_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content'>[] = [
  'fit-content',
  'min-content',
  'max-content',
];
const HEIGHT_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'auto' | 'aspect-ratio'>[] = ['auto', 'aspect-ratio'];
const FONT_SIZE_UNIT_OPTIONS: FontSizeMode[] = ['px', 'em', 'rem'];
const COMPACT_UNIT_SUFFIX_WIDTH = 36;
const COMPACT_UNIT_ICON_SUFFIX_WIDTH = 40;

export function SizeInlineField({
  label,
  nodeId,
  axis,
  value,
  onChange,
  isSectionHeight = false,
  disabled = false,
}: {
  label: string;
  nodeId: string;
  axis: SizeFieldAxis;
  value: string;
  onChange: (value: string) => void;
  isSectionHeight?: boolean;
  disabled?: boolean;
}) {
  const modeOptions = getSizeModeOptions(axis, { isSectionHeight });
  const [mode, setMode] = useState<SizeFieldMode>(() => getInitialSizeFieldMode(value, axis, isSectionHeight));
  const [numericDraft, setNumericDraft] = useState(() => getInitialNumericDraft(value, axis, nodeId, isSectionHeight));
  const [aspectDraft, setAspectDraft] = useState(() => getInitialAspectDraft(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const descriptor = describeSizeFieldValue(value, axis);
    setMode(resolveSizeFieldMode(descriptor, axis, isSectionHeight));
    if (descriptor.kind === 'numeric') {
      setNumericDraft(getInitialNumericDraft(value, axis, nodeId, isSectionHeight));
    }
    if (descriptor.kind === 'aspect-ratio') {
      setAspectDraft(descriptor.input);
    }
    setInvalid(false);
  }, [axis, isSectionHeight, nodeId, value]);

  const descriptor = describeSizeFieldValue(value, axis);
  const showNumericInput = isNumericSizeFieldMode(mode);
  const showAspectInput = mode === 'aspect-ratio';
  const showKeywordTriggerOnly = !showNumericInput && !showAspectInput;
  const hasStaticNumericUnitSuffix = showNumericInput && modeOptions.selectableModes.length === 1;
  const suffixWidth = showAspectInput ? COMPACT_UNIT_ICON_SUFFIX_WIDTH : COMPACT_UNIT_SUFFIX_WIDTH;
  const usesIconSuffix = mode === 'aspect-ratio';
  const numericMin = axis === 'width' || axis === 'height' ? 0 : undefined;
  const shellClass = invalid
    ? 'editor-inline-field editor-inline-field-invalid focus-within:border-red-400'
    : 'editor-inline-field focus-within:border-blue-500';

  function commitDraft(nextMode: SizeFieldMode, nextInput?: string) {
    const candidateInput = nextInput ?? (nextMode === 'aspect-ratio' ? aspectDraft : numericDraft);
    const nextRaw = buildSizeFieldValue(axis, nextMode, candidateInput, { isSectionHeight });
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

    if (resolvedMode === 'aspect-ratio') {
      const nextAspect = descriptor.kind === 'aspect-ratio' ? descriptor.input : aspectDraft || '16/9';
      setAspectDraft(nextAspect);
      if (commitDraft(resolvedMode, nextAspect)) {
        setMode(resolvedMode);
      }
      return;
    }

    if (
      resolvedMode === 'auto' ||
      resolvedMode === 'fit-content' ||
      resolvedMode === 'min-content' ||
      resolvedMode === 'max-content'
    ) {
      if (commitDraft(resolvedMode)) {
        setMode(resolvedMode);
      }
      return;
    }

    const convertedNumeric = convertStageMeasurementToInput(nodeId, axis, resolvedMode);
    if (convertedNumeric == null) {
      return;
    }
    setNumericDraft(convertedNumeric);
    if (commitDraft(resolvedMode, convertedNumeric)) {
      setMode(resolvedMode);
    }
  }

  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
      <Label className="text-[11px] font-medium">{label}</Label>
      {showKeywordTriggerOnly ? (
        <div
          className={`group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${shellClass}`}
        >
          <Select value={mode} onValueChange={handleModeChange} disabled={disabled}>
          <SelectTrigger className="peer/keywordtrigger h-full w-full justify-start rounded-sm border-0 bg-transparent px-2.5 pr-8 text-left text-[10px] tracking-[-0.01em] whitespace-nowrap shadow-none [&>svg]:hidden focus:border-0 focus:ring-0 disabled:cursor-default disabled:opacity-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{renderSizeModeOptions(axis, { isSectionHeight })}</SelectContent>
          </Select>
          <div
            className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/keywordtrigger:opacity-100 peer-data-[state=open]/keywordtrigger:opacity-100 peer-disabled/keywordtrigger:opacity-0"
            style={{ width: `${COMPACT_UNIT_SUFFIX_WIDTH}px` }}
          >
            <ChevronDown className="editor-text-strong h-3 w-3" />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/keywordtrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/keywordtrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
            style={{ width: `${COMPACT_UNIT_SUFFIX_WIDTH}px` }}
          />
        </div>
      ) : (
        <div
          className={`group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${shellClass}`}
        >
          {showNumericInput ? (
            <Input
              type="number"
              step="any"
              min={numericMin}
              value={numericDraft}
              onChange={(e) => {
                const next = e.target.value;
                setNumericDraft(next);
                const nextRaw = buildSizeFieldValue(axis, mode, next, { isSectionHeight });
                setInvalid(!nextRaw);
                if (nextRaw && !disabled) {
                  onChange(nextRaw);
                }
              }}
              disabled={disabled}
              className="editor-inline-field-value peer/valueinput h-full flex-1 overflow-visible rounded-l-sm border-0 bg-transparent px-3 text-[11px] shadow-none [appearance:textfield] [padding-inline-end:0] focus-visible:border-0 focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
            style={{ right: `${suffixWidth}px` }}
          />
          <div className="group/unitsuffix relative shrink-0" style={{ width: `${suffixWidth}px`, minWidth: `${suffixWidth}px` }}>
            {hasStaticNumericUnitSuffix ? (
              <div
                className="editor-inline-field-trigger editor-inline-field-trigger-static pointer-events-none relative z-10 flex h-full w-full items-center justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center text-[10px] font-medium tracking-[-0.01em] shadow-none"
              >
                {mode}
              </div>
            ) : (
              <>
                <Select value={mode} onValueChange={handleModeChange} disabled={disabled}>
                  <SelectTrigger
                    className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full w-full justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[10px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:ring-0 disabled:cursor-default disabled:opacity-60"
                  >
                    {usesIconSuffix ? (
                      <span className="flex w-full items-center justify-center">
                        <Proportions className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>{renderSizeModeOptions(axis, { isSectionHeight })}</SelectContent>
                </Select>
                <div
                  className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/unitsuffix:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100 peer-disabled/unittrigger:opacity-0"
                  style={{ width: `${suffixWidth}px` }}
                >
                  <ChevronDown className="editor-text-strong h-3 w-3" />
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
                  style={{ width: `${suffixWidth}px` }}
                />
              </>
            )}
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
  onUnitChangeValue,
  min,
  max,
}: {
  value: string;
  units: ('px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax')[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onUnitChangeValue?: (nextUnit: string, currentValue: string) => string | null;
  min?: number;
  max?: number;
}) {
  const parsed = value ? parseUnitValue(value) : null;
  const initialUnit = parsed && units.includes(parsed.parsed.unit) ? parsed.parsed.unit : units[0];
  const [draft, setDraft] = useState(parsed ? String(parsed.parsed.value) : '');
  const [unit, setUnit] = useState(initialUnit);
  const hasUnitSelector = units.length > 1;
  const suffixWidth = `${COMPACT_UNIT_SUFFIX_WIDTH}px`;

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
    if (min != null && nextValue < min) {
      return;
    }
    if (max != null && nextValue > max) {
      return;
    }

    onChange(`${nextDraft}${nextUnit}`);
  }

  return (
    <div className={`editor-inline-field group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] focus-within:border-blue-500 ${className}`.trim()}>
      <Input
        type="number"
        step="any"
        min={min}
        max={max}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          commit(nextDraft, unit);
        }}
        className="editor-inline-field-value peer/valueinput h-full overflow-visible rounded-l-sm border-0 bg-transparent text-[11px] [appearance:textfield] [padding-inline-end:0] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
              if (onUnitChangeValue) {
                const nextValue = onUnitChangeValue(resolvedUnit, value);
                if (!nextValue) {
                  return;
                }
                const nextParsed = parseUnitValue(nextValue);
                setDraft(formatDisplayValue(nextParsed.parsed.value));
                setUnit(nextParsed.parsed.unit);
                onChange(nextValue);
                return;
              }
              setUnit(resolvedUnit);
              commit(draft, resolvedUnit);
            }}
          >
            <SelectTrigger
              className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full shrink-0 justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[10px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:ring-0"
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
            className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100 peer-disabled/unittrigger:opacity-0"
            style={{ width: suffixWidth }}
          >
            <ChevronDown className="editor-text-strong h-3 w-3" />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
            style={{ width: suffixWidth }}
          />
        </>
      ) : (
        <div
          className="editor-inline-field-trigger editor-inline-field-trigger-static pointer-events-none relative z-10 flex h-full items-center justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center text-[10px] font-medium tracking-[-0.01em] shadow-none"
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
  const resolvedValue = showOpacity ? value : forceOpaqueColorValue(value);
  const resolvedFallback = showOpacity ? fallback : forceOpaqueColorValue(fallback) || '#ffffff';

  return (
    <div className="flex justify-end">
      <ColorPicker
        value={resolvedValue}
        fallback={resolvedFallback}
        allowAlpha={showOpacity}
        ariaLabel={ariaLabel}
        className="editor-color-picker editor-icon-button-subtle h-8 w-8 overflow-hidden rounded-sm border shadow-sm"
        onChange={(nextValue) => onChange(showOpacity ? nextValue : forceOpaqueColorValue(nextValue) || resolvedFallback)}
      />
    </div>
  );
}

export function BorderControlGroup({
  nodeId,
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
  nodeId: string;
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
        <LabeledUnitField
          label="Width"
          value={widthValue}
          units={['px']}
          onChange={onWidthChange}
          placeholder={widthPlaceholder}
          min={0}
        />
        {showRadius ? (
          <LabeledUnitField
            nodeId={nodeId}
            label="Radius"
            value={radiusValue}
            units={['px', '%']}
            onChange={onRadiusChange}
            placeholder={radiusPlaceholder}
            min={0}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ShadowControlGroup({
  label = 'Shadow',
  color,
  blur,
  spread,
  distance,
  angle,
  onColorChange,
  onBlurChange,
  onSpreadChange,
  onDistanceChange,
  onAngleChange,
  colorFallback,
  supportsSpread = false,
}: {
  label?: string;
  color: string;
  blur: number;
  spread?: number;
  distance: number;
  angle: number;
  onColorChange: (value: string) => void;
  onBlurChange: (value: number) => void;
  onSpreadChange?: (value: number) => void;
  onDistanceChange: (value: number) => void;
  onAngleChange: (value: number) => void;
  colorFallback: string;
  supportsSpread?: boolean;
}) {
  return (
    <div className="w-full space-y-1.5">
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
        <Label className="text-[11px] font-medium">{label}</Label>
        <div className="ml-auto flex items-center gap-2">
          <HoverColorField value={color || undefined} onChange={onColorChange} ariaLabel="Shadow color" fallback={colorFallback} />
        </div>
      </div>
      <div className={`grid w-full gap-1.5 ${supportsSpread ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <LabeledNumberField label="Blur" value={blur} onChange={onBlurChange} min={0} max={200} step={1} />
        {supportsSpread ? (
          <LabeledNumberField label="Spread" value={spread ?? 0} onChange={(value) => onSpreadChange?.(value)} min={-200} max={200} step={1} />
        ) : null}
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
    <div className="min-w-0 w-full space-y-0.5">
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

export function LabeledUnitField({
  nodeId,
  label,
  value,
  units,
  onChange,
  placeholder,
  min,
}: {
  nodeId?: string;
  label: string;
  value: string;
  units: ('px' | '%')[];
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
}) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      <NumericUnitInlineField
        value={value}
        units={units}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        onUnitChangeValue={
          nodeId
            ? (nextUnit) => convertStageBorderRadiusToValue(nodeId, nextUnit as 'px' | '%')
            : undefined
        }
      />
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
  fallback: { color: string; blur: number; spread: number; distance: number; angle: number },
) {
  const fallbackVector = offsetsFromDistanceAndAngle(fallback.distance, fallback.angle);
  const offsetX = style?.shadowOffsetX ?? fallbackVector.offsetX;
  const offsetY = style?.shadowOffsetY ?? fallbackVector.offsetY;
  return {
    color: style?.shadowColor ?? fallback.color,
    blur: style?.shadowBlur ?? fallback.blur,
    spread: style?.shadowSpread ?? fallback.spread,
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

export function getSizeModeOptions(
  axis: SizeFieldAxis,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
) {
  const scalarUnits: NumericSizeFieldMode[] = axis === 'x' || axis === 'y' ? ['px'] : ['px', '%'];
  const viewportUnits: NumericSizeFieldMode[] = axis === 'height' && isSectionHeight ? ['vh', 'vmin', 'vmax'] : [];
  const keywords =
    axis === 'width'
      ? WIDTH_KEYWORD_OPTIONS
      : axis === 'height'
        ? HEIGHT_KEYWORD_OPTIONS
        : null;
  const selectableModes: SizeFieldMode[] = [...scalarUnits, ...(keywords ?? []), ...viewportUnits];

  return {
    scalarUnits,
    viewportUnits,
    keywords,
    selectableModes,
  };
}

function renderSizeModeOptions(
  axis: SizeFieldAxis,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
) {
  const { scalarUnits, viewportUnits, keywords } = getSizeModeOptions(axis, { isSectionHeight });
  const hasKeywords = Boolean(keywords?.length);
  const hasViewportUnits = viewportUnits.length > 0;

  return (
    <>
      {scalarUnits.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
      {hasKeywords ? <SelectSeparator /> : null}
      {keywords?.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
      {hasViewportUnits ? <SelectSeparator /> : null}
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
  const fontSizeSuffixWidth = `${COMPACT_UNIT_SUFFIX_WIDTH}px`;
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
        className="editor-inline-field-value peer/valueinput h-full overflow-visible rounded-l-sm border-0 bg-transparent text-[11px] [appearance:textfield] [padding-inline-end:0] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ right: fontSizeSuffixWidth }}
      />
      <Select
        value={parsed.parsed.unit}
        onValueChange={(nextUnit) => {
          const converted = convertStageFontSizeToInput(nodeId, nextUnit as FontSizeMode);
          if (converted == null) {
            return;
          }
          onChange(`${converted}${nextUnit as FontSizeMode}`);
        }}
      >
        <SelectTrigger
          className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full shrink-0 justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[10px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:ring-0"
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
        className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100 peer-disabled/unittrigger:opacity-0"
        style={{ width: fontSizeSuffixWidth }}
      >
        <ChevronDown className="editor-text-strong h-3 w-3" />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ width: fontSizeSuffixWidth }}
      />
    </div>
  );
}

export function SpacingField({
  nodeId,
  axis,
  value,
  onChange,
}: {
  nodeId: string;
  axis: SpacingAxis;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseSpacingValue(value);
  const suffixWidth = `${COMPACT_UNIT_SUFFIX_WIDTH}px`;

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
        className="editor-inline-field-value peer/valueinput h-full overflow-visible rounded-l-sm border-0 bg-transparent text-[11px] [appearance:textfield] [padding-inline-end:0] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ right: suffixWidth }}
      />
      <Select
        value={parsed.parsed.unit}
        onValueChange={(nextUnit) => {
          const converted = convertStageSpacingToInput(nodeId, axis, nextUnit as SpacingMode);
          if (converted == null) {
            return;
          }
          onChange(`${converted}${nextUnit as SpacingMode}`);
        }}
      >
        <SelectTrigger
          className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full shrink-0 justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[10px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:ring-0"
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
        className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100 peer-disabled/unittrigger:opacity-0"
        style={{ width: suffixWidth }}
      >
        <ChevronDown className="editor-text-strong h-3 w-3" />
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
      className="h-8 w-full rounded-sm px-2 text-center text-[11px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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

export function buildSizeFieldValue(
  axis: SizeFieldAxis,
  mode: SizeFieldMode,
  input: string,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
) {
  const allowedNumericModes = getAllowedNumericSizeModes(axis, isSectionHeight);

  if (axis === 'x' || axis === 'y') {
    if (mode !== 'px') {
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

  if (isNumericSizeFieldMode(mode) && !allowedNumericModes.includes(mode)) {
    return null;
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
  const numericValue = Number.parseFloat(numeric);
  if ((axis === 'width' || axis === 'height') && numericValue < 0) {
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
  const viewport =
    mode === 'vw'
      ? { width: viewportSizePx ?? 0, height: 1 }
      : mode === 'vh'
        ? { width: 1, height: viewportSizePx ?? 0 }
        : mode === 'vmin' || mode === 'vmax'
          ? { width: viewportSizePx ?? 0, height: viewportSizePx ?? 0 }
          : null;
  return convertRenderedPxToGeometryUnit(px, axis, mode, {
    referenceSizePx: parentSizePx,
    viewport,
  });
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
        ? measurement.parentHeightReliable
          ? measurement.parentHeight
          : undefined
        : undefined;
  const viewportSize =
    mode === 'vw'
      ? measurement.viewport?.width
      : mode === 'vh'
        ? measurement.viewport?.height
        : mode === 'vmin'
          ? measurement.viewport
            ? Math.min(measurement.viewport.width, measurement.viewport.height)
            : undefined
          : mode === 'vmax'
            ? measurement.viewport
              ? Math.max(measurement.viewport.width, measurement.viewport.height)
              : undefined
            : undefined;

  const converted = convertRenderedPxToUnitValue(px, axis, mode, parentSize, viewportSize);
  return converted == null ? null : formatNumericFieldInput(converted, mode);
}

export function convertRenderedPxToFontSizeValue(
  px: number,
  mode: FontSizeMode,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  return convertRenderedPxToFontRelativeUnit(px, mode, reference);
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

export function convertRenderedPxToSpacingValue(
  px: number,
  mode: SpacingMode,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  return convertRenderedPxToSpacingUnit(px, mode, reference);
}

export function convertStageSpacingToInput(
  nodeId: string,
  axis: SpacingAxis,
  mode: SpacingMode,
  ownerDocument: Document = document,
) {
  const measurement = measureStageSpacing(nodeId, axis, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToSpacingValue(measurement.spacingPx, mode, {
    rootFontSizePx: measurement.rootFontSizePx,
    inheritedFontSizePx: measurement.fontSizePx,
  });
  return converted == null ? null : formatFieldNumber(converted);
}

export function convertRenderedPxToBorderRadiusValue(
  px: number,
  mode: 'px' | '%',
  box: { width: number; height: number },
) {
  return convertRenderedPxToBorderRadiusUnit(px, mode, box);
}

export function convertStageBorderRadiusToValue(
  nodeId: string,
  mode: 'px' | '%',
  ownerDocument: Document = document,
) {
  const measurement = measureStageBorderRadius(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToBorderRadiusValue(measurement.radiusPx, mode, measurement.box);
  return converted == null ? null : `${formatFieldNumber(converted)}${mode}`;
}

function measureStageGeometry(nodeId: string, ownerDocument: Document) {
  const root = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!root) {
    return null;
  }

  const element = getStageGeometryMeasurementTarget(nodeId, ownerDocument) ?? root;
  const rect = element.getBoundingClientRect();
  const parentContent =
    element.parentElement?.closest<HTMLElement>('[data-content-wrapper-for]') ??
    root.parentElement?.closest<HTMLElement>('[data-content-wrapper-for]') ??
    element.parentElement ??
    root.parentElement;
  const parentRect = parentContent?.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
    offsetX: parentRect ? rect.left - parentRect.left : rect.left,
    offsetY: parentRect ? rect.top - parentRect.top : rect.top,
    parentWidth: parentRect?.width,
    parentHeight: parentRect?.height,
    parentHeightReliable: isReliablePercentHeightReference(parentContent),
    viewport: measureEditorViewport(ownerDocument),
  };
}

function measureStageFontSize(nodeId: string, ownerDocument: Document) {
  const element = getStageStyleMeasurementTarget(nodeId, ownerDocument);
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

function measureStageSpacing(nodeId: string, axis: SpacingAxis, ownerDocument: Document) {
  const element = getStageStyleMeasurementTarget(nodeId, ownerDocument);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const rootComputed = defaultView.getComputedStyle(ownerDocument.documentElement);
  const top = Number.parseFloat(computed.paddingTop);
  const bottom = Number.parseFloat(computed.paddingBottom);
  const left = Number.parseFloat(computed.paddingLeft);
  const right = Number.parseFloat(computed.paddingRight);
  const fontSizePx = Number.parseFloat(computed.fontSize);
  const rootFontSizePx = Number.parseFloat(rootComputed.fontSize);
  const spacingPx =
    axis === 'block'
      ? Number.isFinite(top) && Number.isFinite(bottom) && top > 0 && bottom > 0
        ? (top + bottom) / 2
        : Number.isFinite(top) && top > 0
          ? top
          : Number.isFinite(bottom) && bottom > 0
            ? bottom
            : null
      : axis === 'inline'
        ? Number.isFinite(left) && Number.isFinite(right) && left > 0 && right > 0
          ? (left + right) / 2
          : Number.isFinite(left) && left > 0
            ? left
            : Number.isFinite(right) && right > 0
              ? right
              : null
        : axis === 'top'
          ? Number.isFinite(top)
            ? top
            : null
          : axis === 'right'
            ? Number.isFinite(right)
              ? right
              : null
            : axis === 'bottom'
              ? Number.isFinite(bottom)
                ? bottom
                : null
              : Number.isFinite(left)
                ? left
                : null;

  if (spacingPx == null || !Number.isFinite(fontSizePx) || !Number.isFinite(rootFontSizePx)) {
    return null;
  }

  return {
    spacingPx,
    fontSizePx,
    rootFontSizePx,
  };
}

function measureStageBorderRadius(nodeId: string, ownerDocument: Document) {
  const element = getStageStyleMeasurementTarget(nodeId, ownerDocument);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const radiusPx = parseComputedBorderRadiusPx(computed.borderTopLeftRadius, {
    width: rect.width,
    height: rect.height,
  });
  if (radiusPx == null) {
    return null;
  }

  return {
    radiusPx,
    box: {
      width: rect.width,
      height: rect.height,
    },
  };
}

function measureEditorViewport(ownerDocument: Document): ViewportMeasurement | null {
  const stageShell = ownerDocument.querySelector
    ? ownerDocument.querySelector<HTMLElement>('.stage-shell')
    : null;
  const defaultView = ownerDocument.defaultView;
  if (!stageShell || !defaultView) {
    return null;
  }

  const rawWidth = stageShell.clientWidth || stageShell.getBoundingClientRect().width;
  const rawHeight = stageShell.clientHeight || stageShell.getBoundingClientRect().height;
  if (rawWidth <= 0 || rawHeight <= 0) {
    return null;
  }

  const computed = defaultView.getComputedStyle(stageShell);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const width = rawWidth - paddingLeft - paddingRight;
  const height = rawHeight - paddingTop - paddingBottom;

  return width > 0 && height > 0 ? { width, height } : null;
}

function isReliablePercentHeightReference(parentContent: Element | null | undefined) {
  const wrapper = parentContent?.parentElement;
  if (!wrapper?.classList) {
    return true;
  }
  return !(
    wrapper.classList.contains('role-section') ||
    wrapper.classList.contains('role-header') ||
    wrapper.classList.contains('role-footer')
  );
}

function getStageStyleMeasurementTarget(nodeId: string, ownerDocument: Document) {
  const root = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!root) {
    return null;
  }

  const contentWrapper = 'querySelector' in root
    ? root.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
    : null;
  if (contentWrapper) {
    return contentWrapper;
  }

  const leafContent = 'querySelector' in root
    ? root.querySelector<HTMLElement>('.stage-leaf-body > *')
    : null;
  return leafContent ?? root;
}

function getStageGeometryMeasurementTarget(nodeId: string, ownerDocument: Document) {
  const root = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!root) {
    return null;
  }

  const contentWrapper = 'querySelector' in root
    ? root.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
    : null;
  return contentWrapper ?? root;
}

function parseComputedBorderRadiusPx(
  raw: string,
  box: { width: number; height: number },
) {
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }

  const [horizontalRaw, verticalRaw = horizontalRaw] = normalized.split(/\s+/);
  const horizontal = resolveComputedRadiusSegmentPx(horizontalRaw, box.width, box);
  const vertical = resolveComputedRadiusSegmentPx(verticalRaw, box.height, box);
  if (horizontal == null || vertical == null) {
    return null;
  }
  return (horizontal + vertical) / 2;
}

function resolveComputedRadiusSegmentPx(
  raw: string,
  axisSize: number,
  box: { width: number; height: number },
) {
  if (raw.endsWith('px')) {
    const px = Number.parseFloat(raw);
    return Number.isFinite(px) ? px : null;
  }
  if (raw.endsWith('%')) {
    const percent = Number.parseFloat(raw);
    if (!Number.isFinite(percent)) {
      return null;
    }
    const basis = raw === `${percent}%` && box.width !== box.height ? axisSize : (box.width + box.height) / 2;
    return (percent / 100) * basis;
  }
  return null;
}

function formatNumericFieldInput(
  value: number,
  unit: NumericSizeFieldMode,
) {
  return formatFieldNumber(value);
}

function clampFieldNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function formatFieldNumber(value: number) {
  return formatDisplayValue(value);
}

function extractAspectRatioExpression(raw: string) {
  const match = raw.trim().match(/^aspect-ratio\(\s*(.+?)\s*\)$/);
  return match?.[1] ?? '16/9';
}

function getInitialSizeFieldMode(value: string, axis: SizeFieldAxis, isSectionHeight: boolean) {
  return resolveSizeFieldMode(describeSizeFieldValue(value, axis), axis, isSectionHeight);
}

function getInitialNumericDraft(
  value: string,
  axis: SizeFieldAxis,
  nodeId: string,
  isSectionHeight: boolean,
) {
  const descriptor = describeSizeFieldValue(value, axis);
  if (descriptor.kind !== 'numeric') {
    return getDefaultNumericDraft(axis);
  }
  if (getAllowedNumericSizeModes(axis, isSectionHeight).includes(descriptor.mode)) {
    return descriptor.input;
  }
  if (typeof document === 'undefined') {
    return descriptor.input;
  }
  const fallbackMode = getDefaultNumericMode(axis, isSectionHeight);
  return convertStageMeasurementToInput(nodeId, axis, fallbackMode, document) ?? descriptor.input;
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

function resolveSizeFieldMode(descriptor: SizeFieldDescriptor, axis: SizeFieldAxis, isSectionHeight: boolean): SizeFieldMode {
  if (descriptor.kind !== 'numeric') {
    return descriptor.mode;
  }
  return getAllowedNumericSizeModes(axis, isSectionHeight).includes(descriptor.mode)
    ? descriptor.mode
    : getDefaultNumericMode(axis, isSectionHeight);
}

function getAllowedNumericSizeModes(axis: SizeFieldAxis, isSectionHeight: boolean): NumericSizeFieldMode[] {
  const { scalarUnits, viewportUnits } = getSizeModeOptions(axis, { isSectionHeight });
  return [...scalarUnits, ...viewportUnits];
}

function getDefaultNumericMode(axis: SizeFieldAxis, isSectionHeight: boolean): NumericSizeFieldMode {
  return getAllowedNumericSizeModes(axis, isSectionHeight)[0] ?? 'px';
}

function isNumericSizeFieldMode(mode: SizeFieldMode): mode is NumericSizeFieldMode {
  return mode === 'px' || mode === '%' || mode === 'vw' || mode === 'vh' || mode === 'vmin' || mode === 'vmax';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readUnifiedParsedValue(values: Array<string | undefined>) {
  const defined = values.filter((value): value is string => Boolean(value));
  return defined.length === values.length && defined.every((value) => value === defined[0]) ? defined[0] : '';
}

function roundShadowNumber(value: number) {
  return Math.round(value * 100) / 100;
}
