import type { NodeId } from '../../model/types';
import type { InteractConfig } from '@wix/interact/web';

// Re-export the InteractConfig from @wix/interact/web so consumers don't need a direct dependency
export type { InteractConfig } from '@wix/interact/web';

// ── Triggers ──────────────────────────────────────────────────────────────────

export type AnimationTriggerType =
  | 'entrance'
  | 'ongoing'
  | 'scroll'
  | 'click'
  | 'activate'
  | 'hover'
  | 'interest'
  | 'mouse';

// ── Named effect base types ──────────────────────────────────────────────────
// @wix/motion-presets does not export its preset union types from the public
// API. We define local base types that match the library's shape:
// every preset is `{ type: string }` plus category-specific optional params.
// The `kind: 'named'` discriminant is ours and distinguishes named effects
// from keyframe effects in AnimationDefinition.

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

// ── Keyframe effect (WAAPI-style, unrestricted by trigger type) ───────────────

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
// Timing options apply to time-based triggers (entrance, ongoing, click, hover).
// Scroll and mouse triggers are driven by position, not time.

export type AnimationTimingOptions = {
  duration?: number;   // Animation duration in ms
  delay?: number;      // Animation start delay in ms
  easing?: string;     // CSS easing function
};

export type OngoingTimingOptions = AnimationTimingOptions & {
  iterations?: number;   // Number of iterations (Infinity for infinite)
  alternate?: boolean;   // Alternate direction on each iteration
};

// ── Per-trigger AnimationDefinition variants ──────────────────────────────────
// Each variant restricts which named effects are allowed while keyframe is
// always permitted. Discriminated on `trigger`.

export type EntranceAnimationDefinition = {
  trigger: 'entrance';
  triggerId?: NodeId;
  effect: NamedEntranceEffect | KeyframeAnimationEffect;
  timing?: AnimationTimingOptions;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type OngoingAnimationDefinition = {
  trigger: 'ongoing';
  triggerId?: NodeId;
  effect: NamedOngoingEffect | KeyframeAnimationEffect;
  timing?: OngoingTimingOptions;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type ScrollAnimationDefinition = {
  trigger: 'scroll';
  triggerId?: NodeId;
  effect: NamedScrollEffect | KeyframeAnimationEffect;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type MouseAnimationDefinition = {
  trigger: 'mouse';
  triggerId?: NodeId;
  effect: NamedMouseEffect | KeyframeAnimationEffect;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type ClickAnimationDefinition = {
  trigger: 'click' | 'activate';
  triggerId?: NodeId;
  effect: NamedEntranceEffect | NamedOngoingEffect | KeyframeAnimationEffect;
  timing?: AnimationTimingOptions;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type HoverOutAction = 'keep' | 'reverse' | 'none';

export type HoverAnimationDefinition = {
  trigger: 'hover' | 'interest';
  triggerId?: NodeId;
  effect: NamedEntranceEffect | NamedOngoingEffect | KeyframeAnimationEffect;
  timing?: AnimationTimingOptions;
  outAction?: HoverOutAction;
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

// ── A11y ──────────────────────────────────────────────────────────────────────
// Priority chain: global -> perTrigger -> per-animation (first match wins)

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

// ── Preset catalog types (for editor integration) ─────────────────────────────

export type PresetParamType = 'string' | 'number' | 'boolean';

export type PresetParam = {
  name: string;
  type: PresetParamType;
  required: boolean;
  default?: unknown;
  enum?: readonly (string | number)[];
  min?: number;
  max?: number;
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

// ── Animation Preview Runtime ────────────────────────────────────────────────

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
