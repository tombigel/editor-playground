import { useMemo } from 'react';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { NumberInput } from '@/components/ui/number-input';
import type { AnimationTimingOptions, AnimationTriggerType, OngoingTimingOptions } from '../../../api/animationApi';
import { NAMED_EASINGS } from '../../../api/animationApi';
import { FormField } from '../../InspectorControls';
import { hasIterations, isNamedOngoingEffect } from './utils';

export function TimingControls({
  trigger,
  effectKind,
  preset,
  timing,
  currentEffectParams,
  onTimingChange,
  onEffectParamsChange,
}: {
  trigger: AnimationTriggerType;
  effectKind: 'named' | 'keyframe';
  preset: string | null;
  timing: (AnimationTimingOptions & { iterations?: number; alternate?: boolean }) | undefined;
  currentEffectParams: Record<string, unknown>;
  onTimingChange: (updates: AnimationTimingOptions | OngoingTimingOptions) => void;
  onEffectParamsChange: (params: Record<string, unknown>) => void;
}) {
  const usesPresetIterationDelay = isNamedOngoingEffect(effectKind, preset);
  const iterationDelayValue =
    typeof currentEffectParams.iterationDelay === 'number'
      ? currentEffectParams.iterationDelay
      : (timing?.delay ?? 0);
  const showIterations = hasIterations(trigger, effectKind, preset);
  const easingOptions = useMemo<SearchableSelectOption[]>(() =>
    NAMED_EASINGS.map((e, i, arr) => ({
      value: e.value,
      label: e.label,
      keywords: [e.value, e.group],
      dividerAfter: i < arr.length - 1 && arr[i + 1].group !== e.group,
    })),
  []);

  return (
    <>
      <FormField label="Duration" layout="inline">
        <NumberInput
          value={timing?.duration ?? 1000}
          min={0}
          max={30000}
          step={100}
          unitLabel="ms"
          onChange={(value) => onTimingChange({ duration: value })}
        />
      </FormField>

      <FormField label={usesPresetIterationDelay ? 'Iteration delay' : 'Delay'} layout="inline">
        <NumberInput
          value={usesPresetIterationDelay ? iterationDelayValue : (timing?.delay ?? 0)}
          min={0}
          max={10000}
          step={100}
          unitLabel="ms"
          onChange={(value) => {
            if (usesPresetIterationDelay) {
              const { kind: _kind, type: _type, ...rest } = currentEffectParams;
              onEffectParamsChange({ ...rest, iterationDelay: value });
              onTimingChange({ delay: undefined });
              return;
            }
            onTimingChange({ delay: value });
          }}
        />
      </FormField>

      <FormField label="Easing" layout="inline">
        <SearchableSelect
          value={timing?.easing ?? 'ease'}
          options={easingOptions}
          placeholder="Select easing"
          searchPlaceholder="Search easings..."
          emptyText="No matching easings."
          triggerClassName="text-xs"
          onValueChange={(value) => onTimingChange({ easing: value })}
        />
      </FormField>

      {showIterations ? (
        <>
          <FormField label="Iterations" layout="inline">
            <NumberInput
              value={timing?.iterations === Infinity ? 0 : (timing?.iterations ?? 0)}
              min={0}
              max={100}
              step={1}
              onChange={(value) => onTimingChange({ iterations: value === 0 ? Infinity : value })}
            />
          </FormField>
          <FormField label="Alternate" layout="inline">
            <Switch
              checked={timing?.alternate ?? false}
              onCheckedChange={(checked) => onTimingChange({ alternate: checked })}
            />
          </FormField>
        </>
      ) : null}
    </>
  );
}

