import { useEffect, useId, useMemo, useState } from 'react';
import { parseUnitValue } from '../../api/documentApi';
import { formatDisplayValue } from '../../api/documentViewApi';
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

export type InspectorLengthUnit = 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax' | 'em' | 'rem';

function parseInspectorLengthValue(raw: string) {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)(px|%|vw|vh|vmin|vmax|em|rem)$/);
  if (!match) throw new Error(`Invalid inspector length value: ${raw}`);
  return { parsed: { value: Number(match[1]), unit: match[2] as InspectorLengthUnit } };
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
  mixedUnit = units.length > 1 ? mixed : false,
  'aria-label': ariaLabel,
}: {
  value: string;
  units: InspectorLengthUnit[];
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
	const unitsKey = units.join('|');
	const resolvedUnits = useMemo(() => unitsKey.split('|') as InspectorLengthUnit[], [unitsKey]);
	const parsed = value ? parseInspectorLengthValue(value) : null;
	const initialUnit = parsed && resolvedUnits.includes(parsed.parsed.unit) ? parsed.parsed.unit : resolvedUnits[0];
  const [draft, setDraft] = useState(mixed ? '' : parsed ? String(parsed.parsed.value) : '');
  const [unit, setUnit] = useState(initialUnit);
  const [invalid, setInvalid] = useState(false);
	const options: ValueWithUnitOption[] = useMemo(
		() =>
			resolvedUnits.map((option) => ({
				type: 'option' as const,
				value: option,
				label: option,
				inputMode: 'numeric' as const,
			})),
		[resolvedUnits],
	);

  useEffect(() => {
    const nextParsed = value ? parseInspectorLengthValue(value) : null;
		const nextUnit = nextParsed && resolvedUnits.includes(nextParsed.parsed.unit) ? nextParsed.parsed.unit : resolvedUnits[0];
    setDraft(mixed ? '' : nextParsed ? String(nextParsed.parsed.value) : '');
    setUnit(nextUnit);
    setInvalid(false);
	}, [mixed, resolvedUnits, value]);

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
		mode={resolvedUnits.length > 1 ? 'number-select' : 'number-fixed'}
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
        const nextParsed = value ? parseInspectorLengthValue(value) : null;
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
          const nextParsed = parseInspectorLengthValue(nextValue);
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
        className="h-7 rounded-sm px-2 text-center text-[12px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
  ariaLabel = label,
  value,
  units,
  onChange,
  placeholder,
  min,
  onUnitChangeValue,
}: {
  nodeId?: string;
  label: string;
  ariaLabel?: string;
  value: string;
  units: InspectorLengthUnit[];
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  onUnitChangeValue?: (nextUnit: string, currentValue: string) => string | null;
}) {
  return (
    <LabeledFieldStack label={label}>
      <NumericUnitInlineField
        value={value}
        units={units}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        aria-label={ariaLabel}
        onUnitChangeValue={
          onUnitChangeValue ?? (nodeId && units.every((unit) => unit === 'px' || unit === '%')
            ? (nextUnit) => convertStageBorderRadiusToValue(nodeId, nextUnit as 'px' | '%')
            : undefined)
        }
      />
    </LabeledFieldStack>
  );
}
