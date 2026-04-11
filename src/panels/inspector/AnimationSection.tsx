import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { FocusedMode } from '../../api/editorApi';
import type { AnimationTriggerType } from '../../api/animationApi';
import type { InspectorActionHandlers, NonSiteInspectorNode } from './types';
import type { InspectorSectionHeaderAction } from './CommonSections';
import { Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { LabeledControlRow, NoticeSurface } from '@/components/ui/settings-panel';
import { FormField, SwitchBlock } from '../InspectorControls';
import { createFocusedModeEntry, InspectorSectionCard } from './CommonSections';
import { hasAnimation, getAnimationSummary, isScrollAnimation, requiresStickyForAnimation } from '../../animations/selectors';
import { getPresetsForTrigger, getPresetParams } from '../../animations/animationApi';
import { getPresetLabel } from '../../animations/presetMetadata';
import type { HoverOutAction } from '../../animations/types';
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
            ? <Sparkles className="h-3.5 w-3.5 shrink-0 editor-text-accent" />
            : <Sparkles className="h-3.5 w-3.5 shrink-0 editor-text-muted" />
        }
        title={enabled ? 'Enabled' : 'Disabled'}
        description="Add motion effects to this element."
        checked={enabled}
        onCheckedChange={handleToggle}
      />

      {enabled ? (
        <>
          <FormField label="Trigger">
            <Select
              value={summary?.trigger ?? 'entrance'}
              onValueChange={handleTriggerChange}
            >
              <SelectTrigger>
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

          {/* T09: Preset picker */}
          {summary?.effectKind === 'named' ? (
            <PresetPicker
              trigger={(summary?.trigger ?? 'entrance') as AnimationTriggerType}
              currentPreset={summary?.effectName ?? ''}
              onPresetChange={(preset) =>
                actions.onAnimationPresetChange(
                  (summary?.trigger ?? 'entrance') as AnimationTriggerType,
                  preset,
                )
              }
            />
          ) : summary ? (
            <FormField label="Effect">
              <div className="flex items-center gap-2">
                <span className="editor-text-strong text-xs font-medium">{summary.effectName}</span>
                <span className="editor-bg-subtle editor-border-subtle editor-text-muted rounded border px-1.5 py-0.5 text-[10px]">
                  keyframe
                </span>
              </div>
            </FormField>
          ) : null}

          {/* T10: Dynamic preset options */}
          {summary?.effectKind === 'named' ? (
            <PresetOptions
              preset={summary.effectName}
              currentParams={node.animation?.effect.kind === 'named' ? node.animation.effect : {}}
              trigger={(summary.trigger ?? 'entrance') as AnimationTriggerType}
              onParamChange={(params) =>
                actions.onAnimationPresetChange(
                  (summary.trigger ?? 'entrance') as AnimationTriggerType,
                  summary.effectName,
                  params,
                )
              }
            />
          ) : null}

          {/* T12: Hover out-action selector */}
          {(summary?.trigger === 'hover' || summary?.trigger === 'interest') ? (
            <FormField label="On leave">
              <Select
                value={('outAction' in node && (node as { outAction?: HoverOutAction }).outAction) ?? 'reverse'}
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

          {/* T14: Requires sticky toggle */}
          {isScrollAnimation(node) ? (
            <>
              <LabeledControlRow
                label="Requires sticky"
                className="gap-3"
                labelClassName="text-[11px] font-medium"
                controlClassName="shrink-0"
              >
                <Switch
                  checked={requiresStickyForAnimation(node)}
                  onCheckedChange={(checked) => actions.onAnimationOptionsChange({ requiresSticky: checked })}
                />
              </LabeledControlRow>
              {requiresStickyForAnimation(node) && !node.sticky?.enabled ? (
                <NoticeSurface tone="info" className="px-2.5 py-1.5 text-[11px] leading-4">
                  Enable sticky to use this animation effectively.
                </NoticeSurface>
              ) : null}
            </>
          ) : null}

          {/* T13: Reduced-motion toggle */}
          <LabeledControlRow
            label="Disable under reduced motion"
            className="gap-3"
            labelClassName="text-[11px] font-medium"
            controlClassName="shrink-0"
          >
            <Switch
              checked={node.animation?.reducedMotion === 'disable'}
              onCheckedChange={(checked) =>
                actions.onAnimationOptionsChange({ reducedMotion: checked ? 'disable' : undefined })
              }
            />
          </LabeledControlRow>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px]"
              onClick={actions.onAnimationClear}
              aria-label="Clear animation"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </>
      ) : null}
    </InspectorSectionCard>
  );
}

// ── T09: Preset picker ────────────────────────────────────────────────────────

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
    return presets.map((p) => ({
      value: p.preset,
      label: getPresetLabel(p.preset),
      keywords: [p.preset, p.category],
    }));
  }, [trigger]);

  return (
    <FormField label="Effect">
      <SearchableSelect
        value={currentPreset}
        options={options}
        placeholder="Select preset"
        searchPlaceholder="Search presets…"
        emptyText="No matching presets."
        onValueChange={onPresetChange}
      />
    </FormField>
  );
}

// ── T10: Dynamic preset options ───────────────────────────────────────────────

function PresetOptions({
  preset,
  currentParams,
  trigger,
  onParamChange,
}: {
  preset: string;
  currentParams: Record<string, unknown>;
  trigger: AnimationTriggerType;
  onParamChange: (params: Record<string, unknown>) => void;
}) {
  const schema = useMemo(() => getPresetParams(preset), [preset]);
  if (!schema || schema.params.length === 0) return null;

  function handleParamUpdate(paramName: string, value: unknown) {
    onParamChange({ ...currentParams, [paramName]: value });
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
      <FormField label={label}>
        <Select
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
    return (
      <FormField label={label}>
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
      <LabeledControlRow
        label={label}
        className="gap-3"
        labelClassName="text-[11px] font-medium"
        controlClassName="shrink-0"
      >
        <Switch
          checked={Boolean(value ?? param.default ?? false)}
          onCheckedChange={onChange}
        />
      </LabeledControlRow>
    );
  }

  return null;
}
