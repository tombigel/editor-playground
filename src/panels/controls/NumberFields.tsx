import { useEffect, useId, useState } from 'react';
import { parseUnitValue } from '../../api/documentApi';
import { formatDisplayValue } from '../../model/conversion';
import { Input } from '@/components/ui/input';
import { LabeledFieldStack } from '@/components/ui/settings-panel';
import { NumberInput } from '@/components/ui/number-input';
import { ValueWithUnit, type ValueWithUnitOption } from '@/components/ui/value-with-unit';
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
export { NumberInput, MINIMAL_UNIT_SUFFIX_WIDTH } from '@/components/ui/number-input';

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
  mixedUnit = units.length > 1 ? mixed : false,
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
  mixedUnit?: boolean;
  'aria-label'?: string;
}) {
  const parsed = value ? parseUnitValue(value) : null;
  const initialUnit = parsed && units.includes(parsed.parsed.unit) ? parsed.parsed.unit : units[0];
  const [draft, setDraft] = useState(mixed ? '' : parsed ? String(parsed.parsed.value) : '');
  const [unit, setUnit] = useState(initialUnit);
  const [invalid, setInvalid] = useState(false);
  const options: ValueWithUnitOption[] = units.map((option) => ({
    type: 'option',
    value: option,
    label: option,
    inputMode: 'numeric',
  }));

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
    <ValueWithUnit
      mode={units.length > 1 ? 'number-select' : 'number-fixed'}
      value={value}
      onChange={onChange}
      options={options}
      inputValue={draft}
      selectedOption={unit}
      placeholder={placeholder}
      min={min}
      max={max}
      step="any"
      mixed={mixed}
      mixedSegment={mixedUnit}
      ariaLabel={ariaLabel}
      className={className}
      invalid={invalid}
      segmentWidth={COMPACT_UNIT_SUFFIX_WIDTH}
      onInputBlur={() => {
        const nextParsed = value ? parseUnitValue(value) : null;
        setDraft(mixed ? '' : nextParsed ? String(nextParsed.parsed.value) : '');
        setInvalid(false);
      }}
      onInputValueChange={(nextDraft) => {
        setDraft(nextDraft);
        commit(nextDraft, unit);
      }}
      onResolveOptionValue={(nextUnit, currentValue) => {
        const resolvedUnit = nextUnit as typeof unit;
        if (onUnitChangeValue) {
          const nextValue = onUnitChangeValue(resolvedUnit, currentValue);
          if (!nextValue) {
            return null;
          }
          const nextParsed = parseUnitValue(nextValue);
          setDraft(formatDisplayValue(nextParsed.parsed.value));
          setUnit(nextParsed.parsed.unit);
          setInvalid(false);
          return nextValue;
        }

        const validation = validateNumberInputDraft(
          draft,
          min ?? Number.NEGATIVE_INFINITY,
          max ?? Number.POSITIVE_INFINITY,
        );
        if (validation.nextValue == null) {
          setInvalid(true);
          return null;
        }
        setUnit(resolvedUnit);
        setInvalid(false);
        return `${draft}${resolvedUnit}`;
      }}
    />
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
    <LabeledFieldStack label={label} className="min-w-0 w-full">
      <NumberInput id={fieldId} value={value} mixed={mixed} min={min} max={max} step={step} onChange={onChange} unitLabel={unitLabel} />
    </LabeledFieldStack>
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
    <LabeledFieldStack label={label}>
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
        className="h-8 rounded-sm px-2 text-center text-[12px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </LabeledFieldStack>
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
    <LabeledFieldStack label={label}>
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
    </LabeledFieldStack>
  );
}
