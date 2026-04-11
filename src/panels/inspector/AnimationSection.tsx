import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { FocusedMode } from '../../api/editorApi';
import type { AnimationTriggerType } from '../../api/animationApi';
import type { InspectorActionHandlers, NonSiteInspectorNode } from './types';
import type { InspectorSectionHeaderAction } from './CommonSections';
import { Rocket } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { NumberInput } from '@/components/ui/number-input';
import { SliderNumberField } from '@/components/ui/slider-number-field';
import { NoticeSurface } from '@/components/ui/settings-panel';
import { FormField, SwitchBlock } from '../InspectorControls';
import { createFocusedModeEntry, InspectorSectionCard } from './CommonSections';
import { hasAnimation, getAnimationSummary, isScrollAnimation, requiresStickyForAnimation } from '../../animations/selectors';
import { getPresetsForTrigger, getPresetParams, NAMED_EASINGS } from '../../animations/animationApi';
import { getPresetLabel } from '../../animations/presetMetadata';
import type { HoverOutAction, AnimationTimingOptions, OngoingTimingOptions } from '../../animations/types';
import type { PresetParam } from '../../animations/types';

// ── Trigger display labels ────────────────────────────────────────────────────

const TRIGGER_OPTIONS: { value: AnimationTriggerType; label: string }[] = [
  { value: 'entrance', label: 'Entrance' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'click', label: 'Click' },
  { value: 'hover', label: 'Hover' },
  { value: 'mouse', label: 'Mouse' },
];

function defaultPresetForTrigger(trigger: AnimationTriggerType): string {
  switch (trigger) {
    case 'entrance': return 'FadeIn';
    case 'ongoing': return 'Pulse';
    case 'scroll': return 'FadeScroll';
    case 'click': return 'FadeIn';
    case 'hover': return 'FadeIn';
    case 'mouse': return 'TrackMouse';
    default: return 'FadeIn';
  }
}

// ── Timing options per trigger ───────────────────────────────────────────────

/** Triggers that support timing options (duration, delay, easing) */
function hasTiming(trigger: AnimationTriggerType): boolean {
  return trigger === 'entrance' || trigger === 'ongoing' || trigger === 'click' || trigger === 'hover';
}

/** Only ongoing supports iterations and alternate */
function hasIterations(trigger: AnimationTriggerType): boolean {
  return trigger === 'ongoing';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AnimationSection({
  node,
  actions,
  focusedMode,
  headerContent,
  headerAction,
  contentClassName,
}: {
  node: NonSiteInspectorNode;
  actions: Pick<
    InspectorActionHandlers,
    | 'onAnimationPresetChange'
    | 'onAnimationOptionsChange'
    | 'onAnimationClear'
    | 'onEnterFocusedMode'
  >;
  focusedMode: FocusedMode;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
  contentClassName?: string;
}) {
  const enabled = hasAnimation(node);
  const summary = getAnimationSummary(node);

  function handleToggle(checked: boolean) {
    if (checked) {
      actions.onAnimationPresetChange('entrance', 'FadeIn');
    } else {
      actions.onAnimationClear();
    }
  }

  function handleTriggerChange(value: string) {
    const trigger = value as AnimationTriggerType;
    actions.onAnimationPresetChange(trigger, defaultPresetForTrigger(trigger));
  }

  const trigger = (summary?.trigger ?? 'entrance') as AnimationTriggerType;
  const timing = (node.animation && 'timing' in node.animation ? node.animation.timing : undefined) as
    | (AnimationTimingOptions & { iterations?: number; alternate?: boolean })
    | undefined;

  return (
    <InspectorSectionCard
      title="Animation"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode, 'animation', actions.onEnterFocusedMode)}
    >
      <SwitchBlock
        icon={
          enabled
            ? <Rocket className="h-3.5 w-3.5 shrink-0 editor-text-accent" />
            : <Rocket className="h-3.5 w-3.5 shrink-0 editor-text-muted" />
        }
        title={enabled ? 'Enabled' : 'Disabled'}
        description="Add motion effects to this element."
        checked={enabled}
        onCheckedChange={handleToggle}
      />

      {enabled ? (
        <>
          <FormField label="Trigger" layout="inline">
            <Select
              size="compact"
              value={trigger}
              onValueChange={handleTriggerChange}
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

          {/* Preset picker */}
          {summary?.effectKind === 'named' ? (
            <PresetPicker
              trigger={trigger}
              currentPreset={summary?.effectName ?? ''}
              onPresetChange={(preset) =>
                actions.onAnimationPresetChange(trigger, preset)
              }
            />
          ) : summary ? (
            <FormField label="Effect" layout="inline">
              <div className="flex items-center gap-2">
                <span className="editor-text-strong text-xs font-medium">{summary.effectName}</span>
                <span className="editor-bg-subtle editor-border-subtle editor-text-muted rounded border px-1.5 py-0.5 text-[10px]">
                  keyframe
                </span>
              </div>
            </FormField>
          ) : null}

          {/* Timing options: duration, delay first — always before preset params */}
          {hasTiming(trigger) ? (
            <TimingControls
              trigger={trigger}
              timing={timing}
              onTimingChange={(updates) =>
                actions.onAnimationOptionsChange({ timing: updates })
              }
            />
          ) : null}

          {/* Dynamic preset options */}
          {summary?.effectKind === 'named' ? (
            <PresetOptions
              preset={summary.effectName}
              currentParams={node.animation?.effect.kind === 'named' ? node.animation.effect : {}}
              onParamChange={(params) =>
                actions.onAnimationPresetChange(trigger, summary.effectName, params)
              }
            />
          ) : null}

          {/* Hover out-action selector */}
          {(summary?.trigger === 'hover' || summary?.trigger === 'interest') ? (
            <FormField label="On leave" layout="inline">
              <Select
                size="compact"
                value={(node.animation && 'outAction' in node.animation ? (node.animation as { outAction?: HoverOutAction }).outAction : undefined) ?? 'reverse'}
                onValueChange={(value) => actions.onAnimationOptionsChange({ outAction: value as HoverOutAction })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reverse">Reverse</SelectItem>
                  <SelectItem value="keep">Keep</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          {/* Requires sticky toggle */}
          {isScrollAnimation(node) ? (
            <>
              <FormField label="Requires sticky" layout="inline">
                <Switch
                  checked={requiresStickyForAnimation(node)}
                  onCheckedChange={(checked) => actions.onAnimationOptionsChange({ requiresSticky: checked })}
                />
              </FormField>
              {requiresStickyForAnimation(node) && !node.sticky?.enabled ? (
                <NoticeSurface tone="info" className="px-2.5 py-1.5 text-[11px] leading-4">
                  Enable sticky to use this animation effectively.
                </NoticeSurface>
              ) : null}
            </>
          ) : null}

          {/* Reduced-motion toggle */}
          <FormField label="Disable under reduced motion" layout="inline">
            <Switch
              checked={node.animation?.reducedMotion === 'disable'}
              onCheckedChange={(checked) =>
                actions.onAnimationOptionsChange({ reducedMotion: checked ? 'disable' : undefined })
              }
            />
          </FormField>
        </>
      ) : null}
    </InspectorSectionCard>
  );
}

// ── Preset picker ────────────────────────────────────────────────────────────

function PresetPicker({
  trigger,
  currentPreset,
  onPresetChange,
}: {
  trigger: AnimationTriggerType;
  currentPreset: string;
  onPresetChange: (preset: string) => void;
}) {
  const options = useMemo<SearchableSelectOption[]>(() => {
    const presets = getPresetsForTrigger(trigger);
    const needsGroups = trigger === 'click' || trigger === 'hover';
    return presets.map((p) => ({
      value: p.preset,
      label: getPresetLabel(p.preset),
      keywords: [p.preset, p.category],
      group: needsGroups ? (p.category === 'entrance' ? 'Entrance' : 'Loop') : undefined,
    }));
  }, [trigger]);

  return (
    <FormField label="Effect" layout="inline">
      <SearchableSelect
        value={currentPreset}
        options={options}
        placeholder="Select preset"
        searchPlaceholder="Search presets…"
        emptyText="No matching presets."
        triggerClassName="text-xs"
        onValueChange={onPresetChange}
      />
    </FormField>
  );
}

// ── Dynamic preset options ───────────────────────────────────────────────────

function PresetOptions({
  preset,
  currentParams,
  onParamChange,
}: {
  preset: string;
  currentParams: Record<string, unknown>;
  onParamChange: (params: Record<string, unknown>) => void;
}) {
  const schema = useMemo(() => getPresetParams(preset), [preset]);
  if (!schema || schema.params.length === 0) return null;

  function handleParamUpdate(paramName: string, value: unknown) {
    const { kind: _, type: __, ...rest } = currentParams;
    onParamChange({ ...rest, [paramName]: value });
  }

  return (
    <>
      {schema.params.map((param) => (
        <PresetParamControl
          key={param.name}
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
  const label = param.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

  if (param.type === 'string' && param.enum && param.enum.length > 0) {
    return (
      <FormField label={label} layout="inline">
        <Select
          size="compact"
          value={String(value ?? param.default ?? param.enum[0])}
          onValueChange={onChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {param.enum.map((opt) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    );
  }

  if (param.type === 'number') {
    const hasRange = param.min != null && param.max != null;
    if (hasRange) {
      return (
        <FormField label={label} layout="inline">
          <SliderNumberField
            value={typeof value === 'number' ? value : (param.default as number) ?? param.min!}
            min={param.min!}
            max={param.max!}
            unitLabel={param.unit}
            onChange={(v) => onChange(v)}
          />
        </FormField>
      );
    }
    return (
      <FormField label={label} layout="inline">
        <NumberInput
          value={typeof value === 'number' ? value : (param.default as number) ?? 0}
          min={param.min ?? 0}
          max={param.max ?? 1000}
          step={1}
          onChange={(v) => onChange(v)}
        />
      </FormField>
    );
  }

  if (param.type === 'boolean') {
    return (
      <FormField label={label} layout="inline">
        <Switch
          checked={Boolean(value ?? param.default ?? false)}
          onCheckedChange={onChange}
        />
      </FormField>
    );
  }

  return null;
}

// ── Timing controls ──────────────────────────────────────────────────────────

function TimingControls({
  trigger,
  timing,
  onTimingChange,
}: {
  trigger: AnimationTriggerType;
  timing: (AnimationTimingOptions & { iterations?: number; alternate?: boolean }) | undefined;
  onTimingChange: (updates: AnimationTimingOptions | OngoingTimingOptions) => void;
}) {
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
          onChange={(v) => onTimingChange({ duration: v })}
        />
      </FormField>

      <FormField label="Delay" layout="inline">
        <NumberInput
          value={timing?.delay ?? 0}
          min={0}
          max={10000}
          step={100}
          unitLabel="ms"
          onChange={(v) => onTimingChange({ delay: v })}
        />
      </FormField>

      <FormField label="Easing" layout="inline">
        <SearchableSelect
          value={timing?.easing ?? 'ease'}
          options={easingOptions}
          placeholder="Select easing"
          searchPlaceholder="Search easings…"
          emptyText="No matching easings."
          triggerClassName="text-xs"
          onValueChange={(value) => onTimingChange({ easing: value })}
        />
      </FormField>

      {hasIterations(trigger) ? (
        <>
          <FormField label="Iterations" layout="inline">
            <NumberInput
              value={timing?.iterations === Infinity ? 0 : (timing?.iterations ?? 0)}
              min={0}
              max={100}
              step={1}
              onChange={(v) => onTimingChange({ iterations: v === 0 ? Infinity : v })}
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
