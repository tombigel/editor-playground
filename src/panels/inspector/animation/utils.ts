import type { AnimationTriggerType } from '../../../api/animationApi';
import { getPresetCategory, getPresetLabel } from '../../../api/animationApi';

export const ANIMATION_DIVIDER_CLASS = 'editor-border-subtle border-t';

export const TRIGGER_OPTIONS: { value: AnimationTriggerType; label: string }[] = [
  { value: 'entrance', label: 'Entrance' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'activate', label: 'Activate' },
  { value: 'interest', label: 'Interest' },
  { value: 'mouse', label: 'Mouse' },
];

export const FILL_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'both', label: 'Both' },
  { value: 'forwards', label: 'Forwards' },
  { value: 'backwards', label: 'Backwards' },
];

export const REVERSED_PRESET_SUFFIX = '__reversed';

export function defaultPresetForTrigger(trigger: AnimationTriggerType): string {
  switch (trigger) {
    case 'entrance': return 'FadeIn';
    case 'ongoing': return 'Pulse';
    case 'scroll': return 'FadeScroll';
    case 'activate': return 'FadeIn';
    case 'interest': return 'FadeIn';
    case 'mouse': return 'TrackMouse';
    default: return 'FadeIn';
  }
}

export function hasTiming(trigger: AnimationTriggerType): boolean {
  return trigger === 'entrance' || trigger === 'ongoing' || trigger === 'activate' || trigger === 'interest';
}

export function isNamedOngoingEffect(effectKind: 'named' | 'keyframe', preset: string | null | undefined) {
  return effectKind === 'named' && preset != null && getPresetCategory(preset) === 'ongoing';
}

export function hasIterations(trigger: AnimationTriggerType, effectKind: 'named' | 'keyframe', preset: string | null | undefined): boolean {
  return trigger === 'ongoing' || ((trigger === 'activate' || trigger === 'interest') && isNamedOngoingEffect(effectKind, preset));
}

export function encodePresetOptionValue(preset: string, reversed: boolean): string {
  return reversed ? `${preset}${REVERSED_PRESET_SUFFIX}` : preset;
}

export function decodePresetOptionValue(value: string): { preset: string; playReversed: boolean } {
  return value.endsWith(REVERSED_PRESET_SUFFIX)
    ? { preset: value.slice(0, -REVERSED_PRESET_SUFFIX.length), playReversed: true }
    : { preset: value, playReversed: false };
}

export function entrancePresetInLabel(preset: string): string {
  const base = getPresetLabel(preset);
  return /\bOut\b/i.test(base) ? base.replace(/\bOut\b/i, 'In') : base;
}

export function entrancePresetOutLabel(preset: string): string {
  const base = getPresetLabel(preset);
  if (/\bIn\b/i.test(base)) return base.replace(/\bIn\b/i, 'Out');
  return `${base} Out`;
}
