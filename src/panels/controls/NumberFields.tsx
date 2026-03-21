import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatDisplayValue } from '../../model/conversion';
import { parseUnitValue } from '../../api/documentApi';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  clampFieldNumber,
  convertStageBorderRadiusToValue,
  formatFieldNumber,
  validateNumberInputDraft,
} from '../inspector/stageConversions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const COMPACT_UNIT_SUFFIX_WIDTH = 36;
export const COMPACT_UNIT_ICON_SUFFIX_WIDTH = 40;
export const MINIMAL_UNIT_SUFFIX_WIDTH = 24;

// ---------------------------------------------------------------------------
// NumberInput
// ---------------------------------------------------------------------------

export function NumberInput({
  id,
  value,
  min,
  max,
  step,
  onChange,
  unitLabel,
  mixed = false,
}: {
  id?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unitLabel?: string;
  mixed?: boolean;
}) {
  const formattedValue = formatFieldNumber(clampFieldNumber(value));
  const [draft, setDraft] = useState(mixed ? '' : formattedValue);
  const [invalid, setInvalid] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing) {
      return;
    }
    setDraft(mixed ? '' : formattedValue);
    setInvalid(false);
  }, [formattedValue, isEditing, mixed]);

  function handleDraftChange(nextDraft: string) {
    setDraft(nextDraft);
    const validation = validateNumberInputDraft(nextDraft, min, max);
    setInvalid(!validation.isValid);
    if (validation.nextValue != null) {
      onChange(validation.nextValue);
    }
  }

  function handleBlur() {
    setIsEditing(false);
    setDraft(mixed ? '' : formattedValue);
    setInvalid(false);
  }

  if (unitLabel) {
    const suffixWidth = `${unitLabel === '°' ? MINIMAL_UNIT_SUFFIX_WIDTH - 2 : MINIMAL_UNIT_SUFFIX_WIDTH}px`;
    return (
      <div
        className={`editor-inline-field relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${
          invalid ? 'editor-inline-field-invalid focus-within:border-red-400' : 'focus-within:border-[color:var(--editor-accent)]'
        }`}
      >
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft}
          placeholder="-"
          onFocus={() => setIsEditing(true)}
          onBlur={handleBlur}
          onChange={(e) => handleDraftChange(e.target.value)}
          className="editor-inline-field-value peer/valueinput h-full w-full overflow-visible rounded-l-sm border-0 bg-transparent px-2.5 text-center text-[11px] [appearance:textfield] [padding-inline-end:0] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
          style={{ right: suffixWidth }}
        />
        <div
          className="editor-inline-field-trigger editor-inline-field-trigger-static pointer-events-none relative z-10 flex h-full shrink-0 items-center justify-center rounded-r-sm rounded-l-none border-0 bg-transparent pl-0 pr-0 text-center text-[10px] font-medium tracking-[-0.01em] shadow-none"
          style={{ width: suffixWidth }}
        >
          {unitLabel}
        </div>
      </div>
    );
  }

  return (
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        placeholder="-"
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        onChange={(e) => handleDraftChange(e.target.value)}
        className={`h-8 w-full rounded-sm px-2 text-center text-[11px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
          invalid ? 'border-red-400 focus-visible:ring-red-200' : ''
        }`}
      />
  );
}

// ---------------------------------------------------------------------------
// NumericUnitInlineField
// ---------------------------------------------------------------------------

export function NumericUnitInlineField({
  value,
  units,
  onChange,
  placeholder,
  className = '',
  onUnitChangeValue,
  min,
  max,
  mixed = false,
  'aria-label': ariaLabel,
}: {
  value: string;
  units: ('px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax' | 'em' | 'rem')[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onUnitChangeValue?: (nextUnit: string, currentValue: string) => string | null;
  min?: number;
  max?: number;
  mixed?: boolean;
  'aria-label'?: string;
}) {
  const parsed = value ? parseUnitValue(value) : null;
  const initialUnit = parsed && units.includes(parsed.parsed.unit) ? parsed.parsed.unit : units[0];
  const [draft, setDraft] = useState(mixed ? '' : parsed ? String(parsed.parsed.value) : '');
  const [unit, setUnit] = useState(initialUnit);
  const [invalid, setInvalid] = useState(false);
  const hasUnitSelector = units.length > 1;
  const suffixWidth = `${COMPACT_UNIT_SUFFIX_WIDTH}px`;

  useEffect(() => {
    const nextParsed = value ? parseUnitValue(value) : null;
    const nextUnit = nextParsed && units.includes(nextParsed.parsed.unit) ? nextParsed.parsed.unit : units[0];
    setDraft(mixed ? '' : nextParsed ? String(nextParsed.parsed.value) : '');
    setUnit(nextUnit);
    setInvalid(false);
  }, [mixed, units, value]);

  function commit(nextDraft: string, nextUnit: typeof unit) {
    const validation = validateNumberInputDraft(nextDraft, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY);
    setInvalid(!validation.isValid);
    if (validation.nextValue == null) {
      return false;
    }

    onChange(`${nextDraft}${nextUnit}`);
    return true;
  }

  return (
    <div
      className={`editor-inline-field group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${
        invalid ? 'editor-inline-field-invalid focus-within:border-red-400' : 'focus-within:border-[color:var(--editor-accent)]'
      } ${className}`.trim()}
    >
      <Input
        type="number"
        step="any"
        min={min}
        max={max}
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onBlur={() => {
          const nextParsed = value ? parseUnitValue(value) : null;
          setDraft(mixed ? '' : nextParsed ? String(nextParsed.parsed.value) : '');
          setInvalid(false);
        }}
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
                setInvalid(false);
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

// ---------------------------------------------------------------------------
// LabeledNumberField
// ---------------------------------------------------------------------------

export function LabeledNumberField({
  label,
  value,
  mixed = false,
  onChange,
  min,
  max,
  step,
  unitLabel,
}: {
  label: string;
  value: number;
  mixed?: boolean;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unitLabel?: string;
}) {
  const fieldId = useId();
  return (
    <div className="min-w-0 w-full space-y-0.5">
      <Label htmlFor={fieldId} className="text-[11px] font-medium">{label}</Label>
      <NumberInput id={fieldId} value={value} mixed={mixed} min={min} max={max} step={step} onChange={onChange} unitLabel={unitLabel} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// LabeledImplicitUnitField
// ---------------------------------------------------------------------------

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
  const fieldId = useId();
  const parsed = value ? parseUnitValue(value) : null;
  const resolvedUnit = parsed && units.includes(parsed.parsed.unit as 'px' | '%') ? parsed.parsed.unit : units[0];
  const [draft, setDraft] = useState(parsed ? formatFieldNumber(clampFieldNumber(parsed.parsed.value)) : '');

  useEffect(() => {
    const nextParsed = value ? parseUnitValue(value) : null;
    setDraft(nextParsed ? formatFieldNumber(clampFieldNumber(nextParsed.parsed.value)) : '');
  }, [value]);

  return (
    <div className="space-y-0.5">
      <Label htmlFor={fieldId} className="text-[11px] font-medium">{label}</Label>
      <Input
        id={fieldId}
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

// ---------------------------------------------------------------------------
// LabeledUnitField
// ---------------------------------------------------------------------------

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
        aria-label={label}
        onUnitChangeValue={
          nodeId
            ? (nextUnit) => convertStageBorderRadiusToValue(nodeId, nextUnit as 'px' | '%')
            : undefined
        }
      />
    </div>
  );
}
