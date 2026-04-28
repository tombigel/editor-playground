import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import type { AnimationTriggerType } from '../../../api/animationApi';
import { getPresetCategory, getPresetLabel, getPresetsForTrigger } from '../../../api/animationApi';
import { FormField } from '../../InspectorControls';
import {
  decodePresetOptionValue,
  defaultPresetForTrigger,
  encodePresetOptionValue,
  entrancePresetInLabel,
  entrancePresetOutLabel,
  TRIGGER_OPTIONS,
} from './utils';

export function TriggerEffectControls({
  trigger,
  currentPreset,
  effectKind,
  effectName,
  currentEffectParams,
  onPresetChange,
}: {
  trigger: AnimationTriggerType;
  currentPreset: string;
  effectKind: 'named' | 'keyframe';
  effectName: string;
  currentEffectParams: Record<string, unknown>;
  onPresetChange: (trigger: AnimationTriggerType, preset: string, params?: Record<string, unknown>) => void;
}) {
  const presetOptions = useMemo<SearchableSelectOption[]>(() => {
    const presets = getPresetsForTrigger(trigger);
    const groupedTrigger = trigger === 'activate' || trigger === 'interest';
    if (!groupedTrigger) {
      return presets.map((presetInfo) => ({
        value: presetInfo.preset,
        label: getPresetLabel(presetInfo.preset),
        keywords: [presetInfo.preset, presetInfo.category],
      }));
    }

    const entrancePresets = presets.filter((presetInfo) => presetInfo.category === 'entrance');
    const loopPresets = presets.filter((presetInfo) => presetInfo.category !== 'entrance');
    return [
      ...entrancePresets.map((presetInfo) => ({
        value: encodePresetOptionValue(presetInfo.preset, false),
        label: entrancePresetInLabel(presetInfo.preset),
        keywords: [presetInfo.preset, 'in', presetInfo.category],
        group: 'In',
      })),
      ...entrancePresets.map((presetInfo) => ({
        value: encodePresetOptionValue(presetInfo.preset, true),
        label: entrancePresetOutLabel(presetInfo.preset),
        keywords: [presetInfo.preset, 'out', presetInfo.category],
        group: 'Out',
      })),
      ...loopPresets.map((presetInfo) => ({
        value: presetInfo.preset,
        label: getPresetLabel(presetInfo.preset),
        keywords: [presetInfo.preset, presetInfo.category],
        group: 'Loop',
      })),
    ];
  }, [trigger]);

  const currentPresetValue = useMemo(() => {
    if ((trigger === 'activate' || trigger === 'interest') && getPresetCategory(currentPreset) === 'entrance') {
      const playReversed =
        typeof currentEffectParams.playReversed === 'boolean'
          ? currentEffectParams.playReversed
          : trigger === 'activate';
      return encodePresetOptionValue(currentPreset, playReversed);
    }
    return currentPreset;
  }, [currentEffectParams.playReversed, currentPreset, trigger]);

  return (
    <>
      <FormField label="Trigger" layout="inline">
        <Select
          size="compact"
          value={trigger}
          onValueChange={(value) => {
            const nextTrigger = value as AnimationTriggerType;
            onPresetChange(nextTrigger, defaultPresetForTrigger(nextTrigger));
          }}
        >
          <SelectTrigger size="compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {effectKind === 'named' ? (
        <FormField label="Effect" layout="inline">
          <SearchableSelect
            value={currentPresetValue}
            options={presetOptions}
            placeholder="Select preset"
            searchPlaceholder="Search presets..."
            emptyText="No matching presets."
            triggerClassName="text-xs"
            onValueChange={(value) => {
              const { preset, playReversed } = decodePresetOptionValue(value);
              if ((trigger === 'activate' || trigger === 'interest') && getPresetCategory(preset) === 'entrance') {
                onPresetChange(trigger, preset, { playReversed });
                return;
              }
              onPresetChange(trigger, preset);
            }}
          />
        </FormField>
      ) : (
        <FormField label="Effect" layout="inline">
          <div className="flex items-center gap-2">
            <span className="editor-text-strong text-xs font-medium">{effectName}</span>
            <span className="editor-bg-subtle editor-border-subtle editor-text-muted rounded border px-1.5 py-0.5 text-[10px]">
              keyframe
            </span>
          </div>
        </FormField>
      )}
    </>
  );
}

