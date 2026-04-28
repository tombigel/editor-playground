import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { NumberInput } from '@/components/ui/number-input';
import type {
  AnimationTriggerType,
  ClickType,
  EntranceType,
  FillMode,
  HoverOutAction,
  MouseHitArea,
  ScrubTransitionEasing,
} from '../../../api/animationApi';
import { getDefaultHoverOutActionForEffect, getPresetCategory, NAMED_EASINGS } from '../../../api/animationApi';
import type { AnimationOptionsUpdate } from '../../../app/types';
import type { NonSiteInspectorNode } from '../types';
import { FormField, RangeBandField } from '../../InspectorControls';
import { ANIMATION_DIVIDER_CLASS, FILL_OPTIONS } from './utils';

function SelectField({
  value,
  options,
  onValueChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
}) {
  return (
    <Select size="compact" value={value} onValueChange={onValueChange}>
      <SelectTrigger size="compact">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FillSelect({
  value,
  onValueChange,
}: {
  value: FillMode;
  onValueChange: (value: FillMode) => void;
}) {
  return <SelectField value={value} options={FILL_OPTIONS} onValueChange={(nextValue) => onValueChange(nextValue as FillMode)} />;
}

export function AdvancedAnimationControls({
  node,
  trigger,
  effectName,
  effectKind,
  onOptionsChange,
}: {
  node: NonSiteInspectorNode;
  trigger: AnimationTriggerType;
  effectName: string | null;
  effectKind: 'named' | 'keyframe';
  onOptionsChange: (options: AnimationOptionsUpdate) => void;
}) {
  const animation = node.animation;
  if (!animation) return null;
  const fill = 'fill' in animation ? animation.fill : undefined;

  if (trigger === 'scroll') {
    const scrollRangeStart = 'scrollRangeStart' in animation ? animation.scrollRangeStart ?? 0 : 0;
    const scrollRangeEnd = 'scrollRangeEnd' in animation ? animation.scrollRangeEnd ?? 100 : 100;
    return (
      <>
        <RangeBandField
          label="Range"
          startLabel="Start"
          endLabel="End"
          startValue={scrollRangeStart}
          endValue={scrollRangeEnd}
          min={0}
          max={100}
          step={1}
          unit="%"
          onValueChange={(start, end) => onOptionsChange({ scrollRangeStart: start, scrollRangeEnd: end })}
        />
        <FormField label="Reversed" layout="inline">
          <Switch
            checked={'reversed' in animation ? animation.reversed ?? false : false}
            onCheckedChange={(checked) => onOptionsChange({ scrollReversed: checked })}
          />
        </FormField>
        <div aria-hidden="true" className={ANIMATION_DIVIDER_CLASS} />
        <FormField label="Fill" layout="inline">
          <FillSelect value={fill ?? 'both'} onValueChange={(value) => onOptionsChange({ scrollFill: value })} />
        </FormField>
      </>
    );
  }

  if (trigger === 'entrance') {
    return (
      <>
        <FormField label="Type" layout="inline">
          <SelectField
            value={'entranceType' in animation ? animation.entranceType ?? 'once' : 'once'}
            options={[
              { value: 'once', label: 'Once' },
              { value: 'repeat', label: 'Repeat' },
              { value: 'alternate', label: 'Alternate' },
            ]}
            onValueChange={(value) => onOptionsChange({ entranceType: value as EntranceType })}
          />
        </FormField>
        <FormField label="Threshold" layout="inline">
          <NumberInput
            value={'threshold' in animation ? animation.threshold ?? 0.2 : 0.2}
            min={0}
            max={1}
            step={0.05}
            onChange={(value) => onOptionsChange({ entranceThreshold: value })}
          />
        </FormField>
        <div aria-hidden="true" className={ANIMATION_DIVIDER_CLASS} />
        <FormField label="Fill" layout="inline">
          <FillSelect value={fill ?? 'both'} onValueChange={(value) => onOptionsChange({ entranceFill: value })} />
        </FormField>
      </>
    );
  }

  if (trigger === 'ongoing') {
    return (
      <>
        <div aria-hidden="true" className={ANIMATION_DIVIDER_CLASS} />
        <FormField label="Fill" layout="inline">
          <FillSelect value={fill ?? 'none'} onValueChange={(value) => onOptionsChange({ ongoingFill: value })} />
        </FormField>
      </>
    );
  }

  if (trigger === 'activate') {
    const defaultClickType =
      effectKind === 'named' && effectName && getPresetCategory(effectName) === 'ongoing' ? 'state' : 'repeat';
    return (
      <>
        <FormField label="Type" layout="inline">
          <SelectField
            value={'clickType' in animation ? animation.clickType ?? defaultClickType : defaultClickType}
            options={[
              { value: 'once', label: 'Once' },
              { value: 'repeat', label: 'Repeat' },
              { value: 'state', label: 'Toggle' },
              { value: 'alternate', label: 'Alternate' },
            ]}
            onValueChange={(value) => onOptionsChange({ clickType: value as ClickType })}
          />
        </FormField>
        <div aria-hidden="true" className={ANIMATION_DIVIDER_CLASS} />
        <FormField label="Fill" layout="inline">
          <FillSelect value={fill ?? 'none'} onValueChange={(value) => onOptionsChange({ clickFill: value })} />
        </FormField>
      </>
    );
  }

  if (trigger === 'interest') {
    const defaultOutAction = getDefaultHoverOutActionForEffect(animation.effect);
    const outAction = 'outAction' in animation ? animation.outAction ?? defaultOutAction : defaultOutAction;
    return (
      <>
        <FormField label="On leave" layout="inline">
          <SelectField
            value={outAction}
            options={[
              { value: 'reverse', label: 'Reverse' },
              { value: 'reset', label: 'Reset' },
              { value: 'pause', label: 'Pause' },
            ]}
            onValueChange={(value) => onOptionsChange({ outAction: value as HoverOutAction })}
          />
        </FormField>
        <div aria-hidden="true" className={ANIMATION_DIVIDER_CLASS} />
        <FormField label="Fill" layout="inline">
          <FillSelect value={fill ?? (outAction === 'reverse' ? 'both' : 'none')} onValueChange={(value) => onOptionsChange({ hoverFill: value })} />
        </FormField>
      </>
    );
  }

  if (trigger === 'mouse') {
    return (
      <>
        <FormField label="Trigger area" layout="inline">
          <SelectField
            value={'hitArea' in animation ? animation.hitArea ?? 'self' : 'self'}
            options={[
              { value: 'self', label: 'Element' },
              { value: 'root', label: 'Viewport' },
            ]}
            onValueChange={(value) => onOptionsChange({ mouseHitArea: value as MouseHitArea })}
          />
        </FormField>
        <FormField label="Axis" layout="inline">
          <SelectField
            value={'mouseAxis' in animation ? animation.mouseAxis ?? 'both' : 'both'}
            options={[
              { value: 'both', label: 'Both' },
              { value: 'x', label: 'X only' },
              { value: 'y', label: 'Y only' },
            ]}
            onValueChange={(value) => onOptionsChange({ mouseAxis: value === 'both' ? undefined : value as 'x' | 'y' })}
          />
        </FormField>
        <div aria-hidden="true" className={ANIMATION_DIVIDER_CLASS} />
        <FormField label="Centered" layout="inline">
          <Switch
            checked={'centeredToTarget' in animation ? animation.centeredToTarget ?? false : false}
            onCheckedChange={(checked) => onOptionsChange({ mouseCenteredToTarget: checked })}
          />
        </FormField>
        <FormField label="Lerp" layout="inline">
          <NumberInput
            value={'transitionDuration' in animation ? animation.transitionDuration ?? 0 : 0}
            min={0}
            max={2000}
            step={50}
            unitLabel="ms"
            onChange={(value) => onOptionsChange({ mouseTransitionDuration: value })}
          />
        </FormField>
        <FormField label="Lerp easing" layout="inline">
          <SelectField
            value={'transitionEasing' in animation ? animation.transitionEasing ?? 'linear' : 'linear'}
            options={NAMED_EASINGS.map((easing) => ({ value: easing.value, label: easing.label }))}
            onValueChange={(value) => onOptionsChange({ mouseTransitionEasing: value as ScrubTransitionEasing })}
          />
        </FormField>
      </>
    );
  }

  return null;
}
