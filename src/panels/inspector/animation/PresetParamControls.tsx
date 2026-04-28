import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { NumberInput } from '@/components/ui/number-input';
import { getPresetParams } from '../../../api/animationApi';
import type { AnimationTriggerType, PresetParam } from '../../../api/animationApi';
import { FormField, RangeField } from '../../InspectorControls';

export function PresetParamControls({
  preset,
  trigger,
  currentParams,
  onParamChange,
}: {
  preset: string;
  trigger: AnimationTriggerType;
  currentParams: Record<string, unknown>;
  onParamChange: (params: Record<string, unknown>) => void;
}) {
  const schema = useMemo(() => getPresetParams(preset), [preset]);
  if (!schema) return null;
  const visibleParams = schema.params.filter(
    (param) => !(schema.category === 'ongoing' && param.name === 'iterationDelay'),
  );
  if (visibleParams.length === 0) return null;

  function handleParamUpdate(paramName: string, value: unknown) {
    const { kind: _kind, type: _type, ...rest } = currentParams;
    onParamChange({ ...rest, [paramName]: value });
  }

  return (
    <>
      {visibleParams.map((param) => (
        <PresetParamControl
          key={`${trigger}-${preset}-${param.name}`}
          param={param}
          value={currentParams[param.name]}
          onChange={(value) => handleParamUpdate(param.name, value)}
        />
      ))}
    </>
  );
}

function PresetParamControl({
  param,
  value,
  onChange,
}: {
  param: PresetParam;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = (param.label ?? param.name)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());

  if (param.type === 'string' && param.enum && param.enum.length > 0) {
    return (
      <FormField label={label} layout="inline">
        <Select
          size="compact"
          value={String(value ?? param.default ?? param.enum[0])}
          onValueChange={(nextValue) => onChange(nextValue)}
        >
          <SelectTrigger size="compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {param.enum.map((option) => (
              <SelectItem key={String(option)} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    );
  }

  if (param.type === 'number') {
    if (param.min != null && param.max != null) {
      return (
        <RangeField
          label={label}
          value={typeof value === 'number' ? value : (param.default as number) ?? param.min}
          min={param.min}
          max={param.max}
          step={param.step}
          unit={param.unit}
          onValueChange={(nextValue) => onChange(nextValue)}
        />
      );
    }
    return (
      <FormField label={label} layout="inline">
        <NumberInput
          value={typeof value === 'number' ? value : (param.default as number) ?? 0}
          min={param.min ?? 0}
          max={param.max ?? 10000}
          step={param.step ?? 1}
          unitLabel={param.unit}
          onChange={(nextValue) => onChange(nextValue)}
        />
      </FormField>
    );
  }

  if (param.type === 'boolean') {
    return (
      <FormField label={label} layout="inline">
        <Switch
          checked={Boolean(value ?? param.default ?? false)}
          onCheckedChange={(checked) => onChange(checked)}
        />
      </FormField>
    );
  }

  return null;
}

