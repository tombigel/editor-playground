import type { NodeId } from '../../model/types';
import type { InteractConfig } from '@wix/interact/web';

export type { InteractConfig } from '@wix/interact/web';

// ── Triggers ─────────────────────────────────────────────────────────────────

export type AnimationTriggerType =
  | 'entrance'
  | 'ongoing'
  | 'scroll'
  | 'click'
  | 'activate'
  | 'hover'
  | 'interest'
  | 'mouse';

// ── Named effect base types ─────────────────────────────────────────────────

type PresetEffectBase = { type: string } & Record<string, unknown>;

export type NamedEntranceEffect = { kind: 'named' } & PresetEffectBase;
export type NamedOngoingEffect = { kind: 'named' } & PresetEffectBase;
export type NamedScrollEffect = { kind: 'named' } & PresetEffectBase;
export type NamedMouseEffect = { kind: 'named' } & PresetEffectBase;
export type NamedAnimationEffect =
  | NamedEntranceEffect
  | NamedOngoingEffect
  | NamedScrollEffect
  | NamedMouseEffect;

// ── Keyframe effect ─────────────────────────────────────────────────────────

export type KeyframeAnimationEffect = {
  kind: 'keyframe';
  name: string;
  keyframes: Array<{
    offset: number;
    easing?: string;
    [cssProperty: string]: unknown;
  }>;
  duration?: number;
  easing?: string;
};

// ── Timing options ──────────────────────────────────────────────────────────

export type AnimationTimingOptions = {
  duration?: number;
  delay?: number;
  easing?: string;
};

export type OngoingTimingOptions = AnimationTimingOptions & {
  iterations?: number;
  alternate?: boolean;
};

// ── Per-trigger AnimationDefinition variants ─────────────────────────────────

export type EntranceType = 'once' | 'repeat' | 'alternate';

export type FillMode = 'none' | 'forwards' | 'backwards' | 'both';

/** Valid easing names for the pointerMove lerp transition from shipped @wix/motion types. */
export type ScrubTransitionEasing =
  | 'linear'
  | 'hardBackOut'
  | 'easeOut'
  | 'elastic'
  | 'bounce';

export type EntranceAnimationDefinition = {
  trigger: 'entrance';
  triggerId?: NodeId;
  effect: NamedEntranceEffect | KeyframeAnimationEffect;
  timing?: AnimationTimingOptions;
  entranceType?: EntranceType;
  /** IntersectionObserver threshold 0–1. Default 0.2 (library default). */
  threshold?: number;
  /** CSS rootMargin-style string to expand (+) or shrink (−) the trigger zone. e.g. "-20% 0px". */
  inset?: string;
  /** Override the default fill:"both". */
  fill?: FillMode;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type OngoingAnimationDefinition = {
  trigger: 'ongoing';
  triggerId?: NodeId;
  effect: NamedOngoingEffect | KeyframeAnimationEffect;
  timing?: OngoingTimingOptions;
  /** CSS rootMargin-style string to expand (+) or shrink (−) the trigger zone. e.g. "-20% 0px". */
  inset?: string;
  /** Override the default fill behavior for time-based ongoing effects. */
  fill?: FillMode;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type ScrollAnimationDefinition = {
  trigger: 'scroll';
  triggerId?: NodeId;
  effect: NamedScrollEffect | KeyframeAnimationEffect;
  /** rangeStart offset percentage 0–100, default 0 */
  scrollRangeStart?: number;
  /** rangeEnd offset percentage 0–100, default 100 */
  scrollRangeEnd?: number;
  /** Play the animation in reverse as scroll increases. */
  reversed?: boolean;
  /** Fill mode at the scroll range boundaries. */
  fill?: FillMode;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type MouseHitArea = 'self' | 'root';

export type MouseAnimationDefinition = {
  trigger: 'mouse';
  triggerId?: NodeId;
  effect: NamedMouseEffect | KeyframeAnimationEffect;
  hitArea?: MouseHitArea;
  /** Pointer axis tracked: 'x' only, 'y' only, or undefined = both. */
  mouseAxis?: 'x' | 'y';
  /** Center the pointer range to the element's midpoint. */
  centeredToTarget?: boolean;
  /** Lerp smoothing duration in ms (0 = off). Interpolates toward pointer position. */
  transitionDuration?: number;
  /** Easing for the lerp transition from the shipped ScrubTransitionEasing union. */
  transitionEasing?: ScrubTransitionEasing;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type ClickType = 'once' | 'repeat' | 'state' | 'alternate';

export type ClickAnimationDefinition = {
  trigger: 'click' | 'activate';
  triggerId?: NodeId;
  effect: NamedEntranceEffect | NamedOngoingEffect | KeyframeAnimationEffect;
  timing?: AnimationTimingOptions | OngoingTimingOptions;
  clickType?: ClickType;
  /** Override the default fill behavior for activate/click effects. */
  fill?: FillMode;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type HoverOutAction = 'reverse' | 'reset' | 'pause';

export type HoverAnimationDefinition = {
  trigger: 'hover' | 'interest';
  triggerId?: NodeId;
  effect: NamedEntranceEffect | NamedOngoingEffect | KeyframeAnimationEffect;
  timing?: AnimationTimingOptions | OngoingTimingOptions;
  outAction?: HoverOutAction;
  /** Override the default fill behavior for hover/interest effects. */
  fill?: FillMode;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type AnimationDefinition =
  | EntranceAnimationDefinition
  | OngoingAnimationDefinition
  | ScrollAnimationDefinition
  | MouseAnimationDefinition
  | ClickAnimationDefinition
  | HoverAnimationDefinition;

// ── A11y ────────────────────────────────────────────────────────────────────

export type ReducedMotionResponse =
  | 'disable'
  | { alternative: NamedAnimationEffect | KeyframeAnimationEffect };

export type PerTriggerReducedMotionSettings = Partial<
  Record<AnimationTriggerType, ReducedMotionResponse>
>;

export type DocumentAnimationA11y = {
  reducedMotion?: ReducedMotionResponse;
  perTrigger?: PerTriggerReducedMotionSettings;
};

export type DocumentAnimationSettings = {
  a11y?: DocumentAnimationA11y;
};

// ── Preset catalog types ────────────────────────────────────────────────────

export type PresetParamType = 'string' | 'number' | 'boolean';

export type PresetParam = {
  name: string;
  /** Optional display label. Falls back to name if omitted. */
  label?: string;
  type: PresetParamType;
  required: boolean;
  default?: unknown;
  enum?: readonly (string | number)[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
};

export type PresetParamSchema = {
  preset: string;
  category: 'entrance' | 'ongoing' | 'scroll' | 'mouse';
  params: PresetParam[];
};

export type PresetInfo = {
  preset: string;
  category: 'entrance' | 'ongoing' | 'scroll' | 'mouse';
  params: PresetParam[];
};

// ── Animation Preview Runtime ───────────────────────────────────────────────

export type AnimationInvokeAction = 'click' | 'hoverIn' | 'hoverOut';

export type AnimationPreviewHandle = {
  /** Swap the running config. No-ops if config is deep-equal to current. */
  updateConfig: (config: InteractConfig) => void;
  /** Play a one-shot click or hover animation on a node. */
  invoke: (nodeId: string, action: AnimationInvokeAction) => void;
  /** Tear down the Interact instance and clean up. */
  destroy: () => void;
  /** Whether an Interact instance is currently active. */
  isActive: () => boolean;
};
