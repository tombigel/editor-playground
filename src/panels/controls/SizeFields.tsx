import { memo, useEffect, useId, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Proportions } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
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

// ---------------------------------------------------------------------------
// renderSizeModeOptions (internal)
// ---------------------------------------------------------------------------

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
}: {
  label: string;
  nodeId: string;
  axis: SizeFieldAxis;
  value: string;
  onChange: (value: string) => void;
  isSectionHeight?: boolean;
  disabled?: boolean;
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
  const showKeywordTriggerOnly = !showNumericInput && !showAspectInput;
  const hasStaticNumericUnitSuffix = showNumericInput && modeOptions.selectableModes.length === 1;
  const suffixWidth = showAspectInput ? COMPACT_UNIT_ICON_SUFFIX_WIDTH : COMPACT_UNIT_SUFFIX_WIDTH;
  const usesIconSuffix = mode === 'aspect-ratio';
  const numericMin = axis === 'width' || axis === 'height' ? 0 : undefined;
  const shellClass = invalid
    ? 'editor-inline-field editor-inline-field-invalid focus-within:border-red-400'
    : 'editor-inline-field focus-within:border-[color:var(--editor-accent)]';

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
      <Label htmlFor={fieldId} className="text-[11px] font-medium">{label}</Label>
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
              id={fieldId}
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
});

// ---------------------------------------------------------------------------
// RangeField
// ---------------------------------------------------------------------------

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onValueChange,
  mixed = false,
}: {
  label: string | null;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (value: number) => void;
  mixed?: boolean;
}) {
  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] font-medium">{label}</Label>
          <span className={`editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium ${mixed ? 'border border-dashed' : ''}`}>
            {mixed ? '-' : `${value}${unit}`}
          </span>
        </div>
      ) : (
        <div className="flex justify-end">
          <span className={`editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium ${mixed ? 'border border-dashed' : ''}`}>
            {mixed ? '-' : `${value}${unit}`}
          </span>
        </div>
      )}
      <Slider aria-label={label ?? undefined} value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onValueChange(next ?? value)} />
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

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-medium">Offset Range</Label>
        <span className={`editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium ${mixed ? 'border border-dashed' : ''}`}>
          {mixed ? '-' : `Span ${Math.round(rangeSpan)}${unit}`}
        </span>
      </div>
      <div className="editor-text-muted grid grid-cols-2 gap-1 text-[10px]">
        <span className="editor-bg-subtle inline-flex items-center gap-1 rounded-md px-2 py-0.5">
          <ArrowUp className="editor-text-muted h-3 w-3" />
          {mixed ? 'Top -' : `Top ${Math.round(topValue)}${unit}`}
        </span>
        <span className="editor-bg-subtle inline-flex items-center justify-end gap-1 rounded-md px-2 py-0.5 text-right">
          {mixed ? 'Bottom -' : `Bottom ${Math.round(bottomValue)}${unit}`}
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
