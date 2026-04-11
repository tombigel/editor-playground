import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Proportions } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabeledControlRow, ValuePill } from '@/components/ui/settings-panel';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ValueWithUnit, type ValueWithUnitOption } from '@/components/ui/value-with-unit';
import type { SizeFieldAxis, SizeFieldMode } from '../inspector/stageConversions';
import {
  buildSizeFieldValue,
  clamp,
  convertStageMeasurementToInput,
  describeSizeFieldValue,
  getInitialAspectDraft,
  getInitialNumericDraft,
  getInitialSizeFieldMode,
  getSizeModeOptions,
  isNumericSizeFieldMode,
  resolveSizeFieldMode,
} from '../inspector/stageConversions';
import { COMPACT_UNIT_SUFFIX_WIDTH, COMPACT_UNIT_ICON_SUFFIX_WIDTH } from './NumberFields';

type NumericSizeFieldMode = Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>;

export function resolveSizeMeasurementInput({
  nodeId,
  axis,
  mode,
  resolveMeasurementInput,
}: {
  nodeId: string;
  axis: SizeFieldAxis;
  mode: NumericSizeFieldMode;
  resolveMeasurementInput?: (mode: NumericSizeFieldMode) => string | null;
}) {
  if (resolveMeasurementInput) {
    return resolveMeasurementInput(mode);
  }
  return convertStageMeasurementToInput(nodeId, axis, mode);
}

// ---------------------------------------------------------------------------
// size mode options (internal)
// ---------------------------------------------------------------------------

function buildSizeModeFieldOptions(
  axis: SizeFieldAxis,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
): ValueWithUnitOption[] {
  const { scalarUnits, viewportUnits, keywords } = getSizeModeOptions(axis, { isSectionHeight });
  const hasKeywords = Boolean(keywords?.length);
  const hasViewportUnits = viewportUnits.length > 0;
  const options: ValueWithUnitOption[] = [];

  options.push(
    ...scalarUnits.map((option) => ({
      type: 'option' as const,
      value: option,
      label: option,
      inputMode: 'numeric' as const,
    })),
  );

  if (hasKeywords) {
    options.push({ type: 'separator', id: `${axis}-keywords` });
    options.push(
      ...(keywords ?? []).map((option) => ({
        type: 'option' as const,
        value: option,
        label: option === 'aspect-ratio' ? 'Aspect ratio' : option,
        inputMode: 'keyword' as const,
      })),
    );
  }

  if (hasViewportUnits) {
    options.push({ type: 'separator', id: `${axis}-viewport` });
    options.push(
      ...viewportUnits.map((option) => ({
        type: 'option' as const,
        value: option,
        label: option,
        inputMode: 'numeric' as const,
      })),
    );
  }

  return options;
}

function renderSizeModeOptions(
  axis: SizeFieldAxis,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
) {
  return (
    <>
      {buildSizeModeFieldOptions(axis, { isSectionHeight }).map((option) =>
        option.type === 'separator' ? (
          <SelectSeparator key={option.id} />
        ) : (
          <SelectItem key={`${axis}-${option.value}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// SizeInlineField
// ---------------------------------------------------------------------------

export const SizeInlineField = memo(function SizeInlineField({
  label,
  nodeId,
  axis,
  value,
  onChange,
  isSectionHeight = false,
  disabled = false,
  resolveMeasurementInput,
}: {
  label: string;
  nodeId: string;
  axis: SizeFieldAxis;
  value: string;
  onChange: (value: string) => void;
  isSectionHeight?: boolean;
  disabled?: boolean;
  resolveMeasurementInput?: (mode: NumericSizeFieldMode) => string | null;
}) {
  const fieldId = useId();
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
  const hasStaticNumericUnitSuffix = showNumericInput && modeOptions.selectableModes.length === 1;
  const suffixWidth = showAspectInput ? COMPACT_UNIT_ICON_SUFFIX_WIDTH : COMPACT_UNIT_SUFFIX_WIDTH;
  const numericMin = axis === 'width' || axis === 'height' ? 0 : undefined;
  const shellClass = invalid
    ? 'editor-inline-field editor-inline-field-invalid focus-within:border-red-400'
    : 'editor-inline-field focus-within:border-[color:var(--editor-accent)]';
  const fieldOptions = buildSizeModeFieldOptions(axis, { isSectionHeight });

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

    const convertedNumeric = resolveSizeMeasurementInput({
      nodeId,
      axis,
      mode: resolvedMode,
      resolveMeasurementInput,
    });
    if (convertedNumeric == null) {
      return;
    }
    setNumericDraft(convertedNumeric);
    if (commitDraft(resolvedMode, convertedNumeric)) {
      setMode(resolvedMode);
    }
  }

  function resolveValueWithUnitModeChange(nextMode: string) {
    const resolvedMode = nextMode as SizeFieldMode;

    if (resolvedMode === 'aspect-ratio') {
      const nextAspect = descriptor.kind === 'aspect-ratio' ? descriptor.input : aspectDraft || '16/9';
      setAspectDraft(nextAspect);
      const nextRaw = buildSizeFieldValue(axis, resolvedMode, nextAspect, { isSectionHeight });
      if (!nextRaw) {
        setInvalid(true);
        return null;
      }
      setMode(resolvedMode);
      setInvalid(false);
      return nextRaw;
    }

    if (
      resolvedMode === 'auto' ||
      resolvedMode === 'fit-content' ||
      resolvedMode === 'min-content' ||
      resolvedMode === 'max-content'
    ) {
      const nextRaw = buildSizeFieldValue(axis, resolvedMode, '', { isSectionHeight });
      if (!nextRaw) {
        setInvalid(true);
        return null;
      }
      setMode(resolvedMode);
      setInvalid(false);
      return nextRaw;
    }

    const convertedNumeric = resolveSizeMeasurementInput({
      nodeId,
      axis,
      mode: resolvedMode,
      resolveMeasurementInput,
    });
    if (convertedNumeric == null) {
      return null;
    }
    const nextRaw = buildSizeFieldValue(axis, resolvedMode, convertedNumeric, { isSectionHeight });
    if (!nextRaw) {
      setInvalid(true);
      return null;
    }
    setNumericDraft(convertedNumeric);
    setMode(resolvedMode);
    setInvalid(false);
    return nextRaw;
  }

  return (
    <LabeledControlRow
      label={label}
      className="gap-1.5"
      labelClassName="w-4 shrink-0 flex-none text-right text-[12px] font-medium"
      controlClassName="ml-0 flex-1"
    >
      {showAspectInput ? (
        <div
          className={`group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${shellClass}`}
        >
          <Input
            id={fieldId}
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
            className="editor-inline-field-value h-full flex-1 overflow-visible rounded-l-sm border-0 bg-transparent px-3 text-[12px] shadow-none focus-visible:border-0 focus-visible:ring-0"
          />
          <div className="group/unitsuffix relative shrink-0" style={{ width: `${suffixWidth}px`, minWidth: `${suffixWidth}px` }}>
            <Select value={mode} onValueChange={handleModeChange} disabled={disabled}>
              <SelectTrigger
                className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full w-full justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[11px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:ring-0 disabled:cursor-default disabled:opacity-60"
              >
                <span className="flex w-full items-center justify-center">
                  <Proportions className="h-3.5 w-3.5" />
                </span>
              </SelectTrigger>
              <SelectContent>{renderSizeModeOptions(axis, { isSectionHeight })}</SelectContent>
            </Select>
            <div
              className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/unitsuffix:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100 peer-disabled/unittrigger:opacity-0"
              style={{ width: `${suffixWidth}px` }}
            >
              <ChevronDown className="editor-text-strong h-3 w-3" />
            </div>
          </div>
        </div>
      ) : (
        <ValueWithUnit
          id={fieldId}
          mode={hasStaticNumericUnitSuffix ? 'number-fixed' : 'number-or-keyword-select'}
          value={value}
          onChange={(nextValue) => {
            if (!disabled) {
              onChange(nextValue);
            }
          }}
          options={fieldOptions}
          inputValue={numericDraft}
          selectedOption={mode}
          min={numericMin}
          step="any"
          disabled={disabled}
          invalid={invalid}
          segmentWidth={suffixWidth}
          expandToFill
          onInputValueChange={(next) => {
            setNumericDraft(next);
            const nextRaw = buildSizeFieldValue(axis, mode, next, { isSectionHeight });
            setInvalid(!nextRaw);
            if (nextRaw && !disabled) {
              onChange(nextRaw);
            }
          }}
          onResolveOptionValue={resolveValueWithUnitModeChange}
        />
      )}
    </LabeledControlRow>
  );
});

// ---------------------------------------------------------------------------
// RangeField helpers
// ---------------------------------------------------------------------------

function deriveStep(min: number, max: number): number {
  const range = max - min;
  if (range <= 1) return 0.01;
  if (range <= 10) return 0.1;
  return 1;
}

function formatRangeValue(value: number, step: number): string {
  if (step < 0.1) return parseFloat(value.toFixed(2)).toString();
  if (step < 1) return parseFloat(value.toFixed(1)).toString();
  return String(Math.round(value));
}

// ---------------------------------------------------------------------------
// RangeField
// ---------------------------------------------------------------------------

// Shared input-as-pill classes
const PILL_INPUT_CLASS =
  'w-[5ch] bg-transparent text-right text-[10px] font-medium tabular-nums [appearance:textfield] ' +
  '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ' +
  'focus:outline-none';

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onValueChange,
  mixed = false,
}: {
  label: string | null;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onValueChange: (value: number) => void;
  mixed?: boolean;
}) {
  const effectiveStep = useMemo(() => step ?? deriveStep(min, max), [step, min, max]);

  // Local value for smooth slider dragging
  const [localValue, setLocalValue] = useState(value);
  const dragging = useRef(false);
  // Draft string for the input — kept in sync when not focused
  const [draft, setDraft] = useState(() => formatRangeValue(value, effectiveStep));
  const inputFocused = useRef(false);

  useEffect(() => {
    if (!dragging.current && !inputFocused.current) {
      setLocalValue(value);
      setDraft(formatRangeValue(value, effectiveStep));
    }
  }, [value, effectiveStep]);

  function commit() {
    inputFocused.current = false;
    const parsed = parseFloat(draft);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      setDraft(formatRangeValue(clamped, effectiveStep));
      if (clamped !== value) onValueChange(clamped);
    } else {
      setDraft(formatRangeValue(value, effectiveStep));
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex min-h-5 items-center justify-between gap-2">
        {label ? <Label className="text-[11px] font-medium">{label}</Label> : null}
        <span className="editor-pill-subtle ml-auto inline-flex shrink-0 items-center gap-px rounded-md px-2 py-0.5 text-[10px] font-medium focus-within:ring-1 focus-within:ring-[var(--editor-accent)]">
          {mixed ? (
            <span className={PILL_INPUT_CLASS}>-</span>
          ) : (
            <input
              type="number"
              value={draft}
              min={min}
              max={max}
              step={effectiveStep}
              aria-label={label ?? undefined}
              className={PILL_INPUT_CLASS}
              onFocus={(e) => { inputFocused.current = true; e.target.select(); }}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                if (e.key === 'Escape') {
                  setDraft(formatRangeValue(value, effectiveStep));
                  inputFocused.current = false;
                  e.currentTarget.blur();
                }
              }}
            />
          )}
          {unit ? <span className="shrink-0">{unit}</span> : null}
        </span>
      </div>
      <Slider
        tabIndex={-1}
        aria-label={label ?? undefined}
        value={[localValue]}
        min={min}
        max={max}
        step={effectiveStep}
        onValueChange={([next]) => {
          dragging.current = true;
          const v = next ?? localValue;
          setLocalValue(v);
          if (!inputFocused.current) setDraft(formatRangeValue(v, effectiveStep));
          onValueChange(v);
        }}
        onValueCommit={() => { dragging.current = false; }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StickyOffsetBandField
// ---------------------------------------------------------------------------

export function StickyOffsetBandField({
  topOffset,
  bottomOffset,
  min,
  max,
  step,
  unit,
  onValueChange,
  mixed = false,
}: {
  topOffset: number;
  bottomOffset: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (topOffset: number, bottomOffset: number) => void;
  mixed?: boolean;
}) {
  const topValue = clamp(topOffset, min, max);
  const bottomValue = clamp(bottomOffset, min, max);
  const sliderEndFromTop = clamp(max - bottomValue, min, max);
  const sliderStart = Math.min(topValue, sliderEndFromTop);
  const sliderEnd = Math.max(topValue, sliderEndFromTop);
  const rangeSpan = Math.max(0, sliderEnd - sliderStart);

  const [topDraft, setTopDraft] = useState(() => String(Math.round(topValue)));
  const [bottomDraft, setBottomDraft] = useState(() => String(Math.round(bottomValue)));
  const topFocused = useRef(false);
  const bottomFocused = useRef(false);

  useEffect(() => {
    if (!topFocused.current) setTopDraft(String(Math.round(clamp(topOffset, min, max))));
  }, [topOffset, min, max]);

  useEffect(() => {
    if (!bottomFocused.current) setBottomDraft(String(Math.round(clamp(bottomOffset, min, max))));
  }, [bottomOffset, min, max]);

  function commitTop() {
    topFocused.current = false;
    const parsed = parseFloat(topDraft);
    if (Number.isFinite(parsed)) {
      const clamped = clamp(Math.round(parsed), min, max);
      setTopDraft(String(clamped));
      if (clamped !== Math.round(topValue)) onValueChange(clamped, bottomValue);
    } else {
      setTopDraft(String(Math.round(topValue)));
    }
  }

  function commitBottom() {
    bottomFocused.current = false;
    const parsed = parseFloat(bottomDraft);
    if (Number.isFinite(parsed)) {
      const clamped = clamp(Math.round(parsed), min, max);
      setBottomDraft(String(clamped));
      if (clamped !== Math.round(bottomValue)) onValueChange(topValue, clamped);
    } else {
      setBottomDraft(String(Math.round(bottomValue)));
    }
  }

  const CHIP_INPUT_CLASS =
    'w-[3ch] bg-transparent text-[10px] tabular-nums [appearance:textfield] ' +
    '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ' +
    'focus:outline-none';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-medium">Offset Range</Label>
        <ValuePill mixed={mixed} value={`Span ${Math.round(rangeSpan)}${unit}`} />
      </div>
      <div className="editor-text-muted flex justify-between gap-1 text-[10px]">
        {/* Top chip */}
        <span className="editor-bg-subtle inline-flex items-center gap-1 rounded-md px-2 py-0.5 focus-within:ring-1 focus-within:ring-[var(--editor-accent)]">
          <ArrowUp className="editor-text-muted h-3 w-3 shrink-0" />
          {mixed ? <span className="tabular-nums">-</span> : (
            <input
              type="number"
              value={topDraft}
              min={min}
              max={max}
              step={step}
              aria-label="Top offset"
              className={CHIP_INPUT_CLASS}
              onFocus={(e) => { topFocused.current = true; e.target.select(); }}
              onChange={(e) => setTopDraft(e.target.value)}
              onBlur={commitTop}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                if (e.key === 'Escape') { setTopDraft(String(Math.round(topValue))); topFocused.current = false; e.currentTarget.blur(); }
              }}
            />
          )}
          <span className="shrink-0">{unit}</span>
        </span>
        {/* Bottom chip */}
        <span className="editor-bg-subtle inline-flex items-center justify-end gap-1 rounded-md px-2 py-0.5 focus-within:ring-1 focus-within:ring-[var(--editor-accent)]">
          {mixed ? <span className="tabular-nums">-</span> : (
            <input
              type="number"
              value={bottomDraft}
              min={min}
              max={max}
              step={step}
              aria-label="Bottom offset"
              className={CHIP_INPUT_CLASS}
              onFocus={(e) => { bottomFocused.current = true; e.target.select(); }}
              onChange={(e) => setBottomDraft(e.target.value)}
              onBlur={commitBottom}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                if (e.key === 'Escape') { setBottomDraft(String(Math.round(bottomValue))); bottomFocused.current = false; e.currentTarget.blur(); }
              }}
            />
          )}
          <span className="shrink-0">{unit}</span>
          <ArrowDown className="editor-text-muted h-3 w-3 shrink-0" />
        </span>
      </div>
      <Slider
        tabIndex={-1}
        value={[sliderStart, sliderEnd]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => {
          if (next.length < 2) return;
          const rawStart = next[0] ?? sliderStart;
          const rawEnd = next[1] ?? sliderEnd;
          const nextTop = clamp(Math.round(Math.min(rawStart, rawEnd)), min, max);
          const nextBottom = clamp(Math.round(max - Math.max(rawStart, rawEnd)), min, max);
          if (!topFocused.current) setTopDraft(String(nextTop));
          if (!bottomFocused.current) setBottomDraft(String(nextBottom));
          onValueChange(nextTop, nextBottom);
        }}
      />
    </div>
  );
}
