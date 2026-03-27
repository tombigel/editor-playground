import { useEffect, useState } from 'react';
import { formatDisplayValue } from '@/model/conversion';
import { Input } from '@/components/ui/input';
import { ValueWithUnit, type ValueWithUnitOption } from '@/components/ui/value-with-unit';

export const MINIMAL_UNIT_SUFFIX_WIDTH = 24;

function clampFieldNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function formatFieldNumber(value: number) {
  return formatDisplayValue(value);
}

function validateNumberInputDraft(draft: string, min: number, max: number) {
  if (draft.trim() === '') {
    return { isValid: false, nextValue: null };
  }

  const nextValue = Number.parseFloat(draft);
  if (!Number.isFinite(nextValue) || nextValue < min || nextValue > max) {
    return { isValid: false, nextValue: null };
  }

  return { isValid: true, nextValue };
}

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
    const fixedUnitOptions: ValueWithUnitOption[] = [
      {
        type: 'option',
        value: unitLabel,
        label: unitLabel,
        inputMode: 'numeric',
      },
    ];

    return (
      <ValueWithUnit
        id={id}
        mode="number-fixed"
        value={`${draft}${unitLabel}`}
        onChange={() => {}}
        options={fixedUnitOptions}
        inputValue={draft}
        selectedOption={unitLabel}
        min={min}
        max={max}
        step={step}
        mixed={mixed}
        mixedSegment={false}
        invalid={invalid}
        segmentWidth={unitLabel === '°' ? MINIMAL_UNIT_SUFFIX_WIDTH - 2 : MINIMAL_UNIT_SUFFIX_WIDTH}
        onInputBlur={handleBlur}
        onInputValueChange={(nextDraft) => {
          setIsEditing(true);
          handleDraftChange(nextDraft);
        }}
      />
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
      onChange={(event) => handleDraftChange(event.target.value)}
      className={`h-8 w-full rounded-sm px-2 text-center text-[12px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
        invalid ? 'border-red-400 focus-visible:ring-red-200' : ''
      }`}
    />
  );
}
