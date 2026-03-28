import type { DocumentModel, NodeId } from '../model/types';
import type {
  AnimationDefinition,
  AnimationTriggerType,
  DocumentAnimationSettings,
  HoverOutAction,
  HoverAnimationDefinition,
  InteractConfig,
  KeyframeAnimationEffect,
  PresetInfo,
  PresetParam,
  PresetParamSchema,
  ReducedMotionResponse,
} from './types';
import type { Interaction, Effect, TriggerType } from '@wix/interact/web';

// ── Version ──────────────────────────────────────────────────────────────────
// Tracks the @wix/interact version this API was built against.
// If a future major version introduces breaking config changes, a v2 API
// can coexist while the v1 config builder remains stable.

export const INTERACT_VERSION = '2.1.4';

export const SCROLL_DEFAULT_RANGE_START = { name: 'entry', offset: { unit: 'percentage', value: 0 } };
export const SCROLL_DEFAULT_RANGE_END = { name: 'exit', offset: { unit: 'percentage', value: 100 } };

// ── Preset catalog ───────────────────────────────────────────────────────────
// These arrays mirror @wix/motion-presets discriminated union members.
// The package does not export its type unions or parameter value types from
// its public API, so we maintain local copies here.
// A validation test (animationApiAlignment.test.ts) asserts at test-time that
// our lists match the installed library's runtime exports.

const ENTRANCE_PRESETS = [
  'FadeIn', 'ArcIn', 'BlurIn', 'BounceIn', 'CurveIn', 'DropIn', 'ExpandIn',
  'FlipIn', 'FloatIn', 'FoldIn', 'GlideIn', 'RevealIn', 'ShapeIn',
  'ShuttersIn', 'SlideIn', 'SpinIn', 'TiltIn', 'TurnIn', 'WinkIn',
] as const;

const ONGOING_PRESETS = [
  'Bounce', 'Breathe', 'Cross', 'DVD', 'Flash', 'Flip', 'Fold',
  'Jello', 'Poke', 'Pulse', 'Rubber', 'Spin', 'Swing', 'Wiggle',
] as const;

const SCROLL_PRESETS = [
  'ArcScroll', 'BlurScroll', 'FadeScroll', 'FlipScroll', 'GrowScroll',
  'MoveScroll', 'PanScroll', 'ParallaxScroll', 'RevealScroll', 'ShapeScroll',
  'ShrinkScroll', 'ShuttersScroll', 'SkewPanScroll', 'SlideScroll',
  'Spin3dScroll', 'SpinScroll', 'StretchScroll', 'TiltScroll', 'TurnScroll',
] as const;

const MOUSE_PRESETS = [
  'AiryMouse', 'BlobMouse', 'BlurMouse', 'BounceMouse', 'CustomMouse',
  'ScaleMouse', 'SkewMouse', 'SpinMouse', 'SwivelMouse', 'Tilt3DMouse',
  'Track3DMouse', 'TrackMouse',
] as const;

type PresetCategory = 'entrance' | 'ongoing' | 'scroll' | 'mouse';

const presetToCategory = new Map<string, PresetCategory>();
for (const p of ENTRANCE_PRESETS) presetToCategory.set(p, 'entrance');
for (const p of ONGOING_PRESETS) presetToCategory.set(p, 'ongoing');
for (const p of SCROLL_PRESETS) presetToCategory.set(p, 'scroll');
for (const p of MOUSE_PRESETS) presetToCategory.set(p, 'mouse');

const TRIGGER_ALLOWED_CATEGORIES: Record<AnimationTriggerType, PresetCategory[]> = {
  entrance: ['entrance'],
  ongoing: ['ongoing'],
  scroll: ['scroll'],
  mouse: ['mouse'],
  click: ['entrance', 'ongoing'],
  activate: ['entrance', 'ongoing'],
  hover: ['entrance', 'ongoing'],
  interest: ['entrance', 'ongoing'],
};

// ── Preset param value enums ─────────────────────────────────────────────────
// Mirrors @wix/motion EffectFourDirections, EffectTwoSides, etc.
// These types are not publicly exported by the package (see note above).
// The alignment test validates these against the installed library.

const FOUR_DIRECTIONS = ['top', 'right', 'bottom', 'left'] as const;
const TWO_SIDES = ['left', 'right'] as const;
const FOUR_CORNERS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const;
const EIGHT_DIRECTIONS = [...FOUR_DIRECTIONS, ...FOUR_CORNERS] as const;
const NINE_DIRECTIONS = ['right', 'top-right', 'top', 'top-left', 'left', 'bottom-left', 'bottom', 'bottom-right', 'center'] as const;
const SCROLL_RANGE = ['in', 'out', 'continuous'] as const;
const MOUSE_AXIS = ['both', 'horizontal', 'vertical'] as const;
const MOUSE_PIVOT_AXIS = ['top', 'bottom', 'right', 'left', 'center-horizontal', 'center-vertical'] as const;
const SHAPE_TYPES = ['circle', 'ellipse', 'rectangle', 'diamond', 'window'] as const;

function directionParam(values: readonly string[]): PresetParam {
  return { name: 'direction', type: 'string', required: false, enum: values };
}
function numberParam(name: string, extra?: Partial<PresetParam>): PresetParam {
  return { name, type: 'number', required: false, ...extra };
}
function scrollRangeParam(): PresetParam {
  return { name: 'range', type: 'string', required: false, enum: SCROLL_RANGE };
}
function mouseAxisParam(): PresetParam {
  return { name: 'axis', type: 'string', required: false, enum: MOUSE_AXIS };
}
function boolParam(name: string): PresetParam {
  return { name, type: 'boolean', required: false };
}

// Note: `distance` and `depth` params accept numbers (px) but @wix/interact
// also accepts UnitLengthPercentage objects like { value: 200, unit: 'px' }.
// Values are passed through to interact as-is via the options spread.
const PRESET_PARAMS: Record<string, PresetParam[]> = {
  // Entrance
  FadeIn: [],
  ArcIn: [directionParam(FOUR_DIRECTIONS), numberParam('depth'), numberParam('perspective')],
  BlurIn: [numberParam('blur')],
  BounceIn: [directionParam([...FOUR_DIRECTIONS, 'center']), numberParam('distanceFactor'), numberParam('perspective')],
  CurveIn: [directionParam(['left', 'right', 'pseudoLeft', 'pseudoRight']), numberParam('depth'), numberParam('perspective')],
  DropIn: [numberParam('initialScale')],
  ExpandIn: [numberParam('initialScale'), numberParam('direction'), numberParam('distance')],
  FlipIn: [directionParam(FOUR_DIRECTIONS), numberParam('initialRotate'), numberParam('perspective')],
  FloatIn: [directionParam(FOUR_DIRECTIONS)],
  FoldIn: [directionParam(FOUR_DIRECTIONS), numberParam('initialRotate'), numberParam('perspective')],
  GlideIn: [numberParam('direction'), numberParam('distance')],
  RevealIn: [directionParam(FOUR_DIRECTIONS)],
  ShapeIn: [{ name: 'shape', type: 'string', required: false, enum: SHAPE_TYPES }],
  ShuttersIn: [directionParam(FOUR_DIRECTIONS), numberParam('shutters'), boolParam('staggered')],
  SlideIn: [directionParam(FOUR_DIRECTIONS), numberParam('initialTranslate')],
  SpinIn: [numberParam('spins'), directionParam(['clockwise', 'counter-clockwise']), numberParam('initialScale')],
  TiltIn: [directionParam(TWO_SIDES), numberParam('depth'), numberParam('perspective')],
  TurnIn: [directionParam(['top-right', 'top-left', 'bottom-right', 'bottom-left'])],
  WinkIn: [directionParam(['vertical', 'horizontal'])],

  // Ongoing
  Bounce: [numberParam('intensity')],
  Breathe: [directionParam(['vertical', 'horizontal', 'center']), numberParam('distance'), numberParam('perspective')],
  Cross: [directionParam(EIGHT_DIRECTIONS)],
  DVD: [],
  Flash: [],
  Flip: [directionParam(['vertical', 'horizontal']), numberParam('perspective')],
  Fold: [directionParam(FOUR_DIRECTIONS), numberParam('angle')],
  Jello: [numberParam('intensity')],
  Poke: [directionParam(FOUR_DIRECTIONS), numberParam('intensity')],
  Pulse: [numberParam('intensity')],
  Rubber: [numberParam('intensity')],
  Spin: [directionParam(['clockwise', 'counter-clockwise'])],
  Swing: [numberParam('swing'), directionParam(FOUR_DIRECTIONS)],
  Wiggle: [numberParam('intensity')],

  // Scroll
  ArcScroll: [directionParam(['vertical', 'horizontal']), scrollRangeParam(), numberParam('perspective')],
  BlurScroll: [scrollRangeParam(), numberParam('blur')],
  FadeScroll: [scrollRangeParam(), numberParam('opacity')],
  FlipScroll: [directionParam(['vertical', 'horizontal']), scrollRangeParam(), numberParam('rotate'), numberParam('perspective')],
  GrowScroll: [directionParam(NINE_DIRECTIONS), scrollRangeParam(), numberParam('scale'), numberParam('speed')],
  MoveScroll: [numberParam('angle'), scrollRangeParam(), numberParam('distance')],
  PanScroll: [directionParam(TWO_SIDES), numberParam('distance'), boolParam('startFromOffScreen'), scrollRangeParam()],
  ParallaxScroll: [numberParam('parallaxFactor'), scrollRangeParam()],
  RevealScroll: [directionParam(FOUR_DIRECTIONS), scrollRangeParam()],
  ShapeScroll: [{ name: 'shape', type: 'string', required: false, enum: SHAPE_TYPES }, scrollRangeParam(), numberParam('intensity')],
  ShrinkScroll: [directionParam(NINE_DIRECTIONS), scrollRangeParam(), numberParam('scale'), numberParam('speed')],
  ShuttersScroll: [directionParam(FOUR_DIRECTIONS), numberParam('shutters'), boolParam('staggered'), scrollRangeParam()],
  SkewPanScroll: [directionParam(TWO_SIDES), scrollRangeParam(), numberParam('skew')],
  SlideScroll: [directionParam(FOUR_DIRECTIONS), scrollRangeParam()],
  Spin3dScroll: [scrollRangeParam(), numberParam('rotate'), numberParam('speed'), numberParam('perspective')],
  SpinScroll: [directionParam(['clockwise', 'counter-clockwise']), numberParam('spins'), scrollRangeParam(), numberParam('scale')],
  StretchScroll: [scrollRangeParam(), numberParam('stretch')],
  TiltScroll: [directionParam(TWO_SIDES), scrollRangeParam(), numberParam('parallaxFactor'), numberParam('perspective')],
  TurnScroll: [directionParam(TWO_SIDES), { name: 'spin', type: 'string', required: false, enum: ['clockwise', 'counter-clockwise'] }, scrollRangeParam(), numberParam('scale'), numberParam('rotation')],

  // Mouse (all except CustomMouse have inverted?: boolean)
  AiryMouse: [mouseAxisParam(), numberParam('distance'), numberParam('angle'), boolParam('inverted')],
  BlobMouse: [numberParam('distance'), numberParam('scale'), boolParam('inverted')],
  BlurMouse: [numberParam('distance'), numberParam('angle'), numberParam('scale'), numberParam('blur'), numberParam('perspective'), boolParam('inverted')],
  BounceMouse: [mouseAxisParam(), boolParam('inverted')],
  CustomMouse: [],
  ScaleMouse: [mouseAxisParam(), numberParam('distance'), numberParam('scale'), boolParam('inverted')],
  SkewMouse: [numberParam('distance'), numberParam('angle'), mouseAxisParam(), boolParam('inverted')],
  SpinMouse: [mouseAxisParam(), boolParam('inverted')],
  SwivelMouse: [numberParam('angle'), numberParam('perspective'), { name: 'pivotAxis', type: 'string', required: false, enum: MOUSE_PIVOT_AXIS }, boolParam('inverted')],
  Tilt3DMouse: [numberParam('angle'), numberParam('perspective'), boolParam('inverted')],
  Track3DMouse: [numberParam('distance'), numberParam('angle'), mouseAxisParam(), numberParam('perspective'), boolParam('inverted')],
  TrackMouse: [mouseAxisParam(), numberParam('distance'), boolParam('inverted')],
};

// ── Internal helpers ─────────────────────────────────────────────────────────

function assertNode(doc: DocumentModel, nodeId: NodeId): void {
  if (!doc.nodes[nodeId]) {
    throw new Error(`Node "${nodeId}" not found in document`);
  }
}

function assertNotSiteRoot(doc: DocumentModel, nodeId: NodeId): void {
  if (doc.nodes[nodeId]?.type === 'site') {
    throw new Error('Cannot set animation on site root node');
  }
}

function cloneDocWithNode(doc: DocumentModel, nodeId: NodeId): { doc: DocumentModel; node: Record<string, unknown> } {
  const cloned: DocumentModel = {
    ...doc,
    nodes: { ...doc.nodes },
  };
  cloned.nodes[nodeId] = { ...cloned.nodes[nodeId] } as typeof doc.nodes[string];
  return { doc: cloned, node: cloned.nodes[nodeId] as unknown as Record<string, unknown> };
}

function hasAnimationField(node: Record<string, unknown>): node is Record<string, unknown> & { animation?: AnimationDefinition } {
  return node.type !== 'site';
}

// ── Low-level API ────────────────────────────────────────────────────────────

export function setNodeAnimation(
  doc: DocumentModel,
  nodeId: NodeId,
  def: AnimationDefinition | undefined,
): DocumentModel {
  assertNode(doc, nodeId);
  assertNotSiteRoot(doc, nodeId);

  const { doc: cloned, node } = cloneDocWithNode(doc, nodeId);
  if (hasAnimationField(node)) {
    if (def === undefined) {
      delete node.animation;
    } else {
      node.animation = def;
    }
  }
  return cloned;
}

export function getNodeAnimation(
  doc: DocumentModel,
  nodeId: NodeId,
): AnimationDefinition | undefined {
  const node = doc.nodes[nodeId];
  if (!node || node.type === 'site') return undefined;
  return (node as unknown as { animation?: AnimationDefinition }).animation;
}

export function getAnimatedNodes(doc: DocumentModel): NodeId[] {
  return Object.keys(doc.nodes).filter((id) => {
    const node = doc.nodes[id];
    if (!node || node.type === 'site') return false;
    return (node as unknown as { animation?: AnimationDefinition }).animation !== undefined;
  });
}

// ── Preset catalog API ───────────────────────────────────────────────────────

export function getMotionPresets(): {
  entrance: string[];
  ongoing: string[];
  scroll: string[];
  mouse: string[];
} {
  return {
    entrance: [...ENTRANCE_PRESETS],
    ongoing: [...ONGOING_PRESETS],
    scroll: [...SCROLL_PRESETS],
    mouse: [...MOUSE_PRESETS],
  };
}

export function getPresetCategory(preset: string): PresetCategory | null {
  return presetToCategory.get(preset) ?? null;
}

export function getPresetsForTrigger(trigger: AnimationTriggerType): PresetInfo[] {
  const allowed = TRIGGER_ALLOWED_CATEGORIES[trigger];
  const results: PresetInfo[] = [];
  for (const [name, category] of presetToCategory) {
    if (allowed.includes(category)) {
      results.push({
        preset: name,
        category,
        params: PRESET_PARAMS[name] ?? [],
      });
    }
  }
  return results;
}

export function getPresetParams(preset: string): PresetParamSchema | null {
  const category = getPresetCategory(preset);
  if (!category) return null;
  return {
    preset,
    category,
    params: PRESET_PARAMS[preset] ?? [],
  };
}

// ── High-level API ───────────────────────────────────────────────────────────

export function setPresetAnimation(
  doc: DocumentModel,
  target: NodeId,
  params: {
    trigger: AnimationTriggerType;
    preset: string;
    options?: Record<string, unknown>;
    source?: NodeId;
    outAction?: HoverOutAction;
    reducedMotion?: ReducedMotionResponse;
    requiresSticky?: boolean;
  },
): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);

  const category = getPresetCategory(params.preset);
  if (!category) {
    throw new Error(
      `Unknown preset "${params.preset}". Call getMotionPresets() to see available presets.`,
    );
  }

  const allowed = TRIGGER_ALLOWED_CATEGORIES[params.trigger];
  if (!allowed.includes(category)) {
    throw new Error(
      `Preset "${params.preset}" (${category}) is not compatible with trigger "${params.trigger}"`,
    );
  }

  const effect = {
    kind: 'named' as const,
    type: params.preset,
    ...(params.options ?? {}),
  };

  const def: AnimationDefinition = buildDefinition(params.trigger, {
    effect,
    triggerId: params.source,
    outAction: params.outAction,
    reducedMotion: params.reducedMotion,
    requiresSticky: params.requiresSticky,
  });

  return setNodeAnimation(doc, target, def);
}

export function setKeyframeAnimation(
  doc: DocumentModel,
  target: NodeId,
  params: {
    trigger: AnimationTriggerType;
    name: string;
    keyframes: Array<{ offset: number; easing?: string; [key: string]: unknown }>;
    duration?: number;
    easing?: string;
    source?: NodeId;
    outAction?: HoverOutAction;
    reducedMotion?: ReducedMotionResponse;
    requiresSticky?: boolean;
  },
): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);

  const effect: KeyframeAnimationEffect = {
    kind: 'keyframe',
    name: params.name,
    keyframes: params.keyframes,
    duration: params.duration,
    easing: params.easing,
  };

  const def: AnimationDefinition = buildDefinition(params.trigger, {
    effect,
    triggerId: params.source,
    outAction: params.outAction,
    reducedMotion: params.reducedMotion,
    requiresSticky: params.requiresSticky,
  });

  return setNodeAnimation(doc, target, def);
}

export function updateAnimationOptions(
  doc: DocumentModel,
  target: NodeId,
  updates: {
    source?: NodeId;
    outAction?: HoverOutAction;
    reducedMotion?: ReducedMotionResponse;
    requiresSticky?: boolean;
  },
): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);

  const existing = getNodeAnimation(doc, target);
  if (!existing) {
    throw new Error(`Node "${target}" has no animation to update`);
  }

  const updated = { ...existing } as Record<string, unknown>;
  if (updates.source !== undefined) updated.triggerId = updates.source;
  if (updates.outAction !== undefined) updated.outAction = updates.outAction;
  if (updates.reducedMotion !== undefined) updated.reducedMotion = updates.reducedMotion;
  if (updates.requiresSticky !== undefined) updated.requiresSticky = updates.requiresSticky;

  return setNodeAnimation(doc, target, updated as AnimationDefinition);
}

export function clearAnimation(doc: DocumentModel, target: NodeId): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);

  const existing = getNodeAnimation(doc, target);
  if (!existing) return doc;

  return setNodeAnimation(doc, target, undefined);
}

export function setDocumentAnimationSettings(
  doc: DocumentModel,
  settings: DocumentAnimationSettings,
): DocumentModel {
  return {
    ...doc,
    animationSettings: settings,
  };
}

// ── Config builder ───────────────────────────────────────────────────────────

function isHoverLikeTrigger(trigger: AnimationTriggerType): trigger is 'hover' | 'interest' {
  return trigger === 'hover' || trigger === 'interest';
}

const TRIGGER_MAP: Record<AnimationTriggerType, TriggerType> = {
  entrance: 'viewEnter',
  ongoing: 'viewEnter',
  scroll: 'viewProgress',
  click: 'activate',
  activate: 'activate',
  hover: 'interest',
  interest: 'interest',
  mouse: 'pointerMove',
};

function resolveReducedMotion(
  doc: DocumentModel,
  animDef: AnimationDefinition,
): ReducedMotionResponse | undefined {
  // Priority: global -> perTrigger -> per-animation
  const a11y = doc.animationSettings?.a11y;
  if (a11y?.reducedMotion) return a11y.reducedMotion;
  if (a11y?.perTrigger?.[animDef.trigger]) return a11y.perTrigger[animDef.trigger];
  return animDef.reducedMotion;
}

function getHoverOutAction(animDef: AnimationDefinition): HoverOutAction {
  if (!isHoverLikeTrigger(animDef.trigger)) return 'none';
  return (animDef as HoverAnimationDefinition).outAction ?? 'reverse';
}

function buildEffectFromDefinition(animDef: AnimationDefinition): Effect {
  const { effect } = animDef;
  const hoverOutAction = isHoverLikeTrigger(animDef.trigger) ? getHoverOutAction(animDef) : null;
  const isHoverOngoing =
    isHoverLikeTrigger(animDef.trigger) && effect.kind === 'named' && getPresetCategory(effect.type) === 'ongoing';

  if (effect.kind === 'named') {
    // Strip `kind`, pass rest as namedEffect
    const { kind, ...namedEffect } = effect;

    const isScrubTrigger = animDef.trigger === 'scroll';

    if (isScrubTrigger) {
      return {
        namedEffect,
        easing: 'linear',
        rangeStart: SCROLL_DEFAULT_RANGE_START,
        rangeEnd: SCROLL_DEFAULT_RANGE_END,
      } as unknown as Effect;
    }

    const timeEffect: Record<string, unknown> = {
      namedEffect,
      duration: 1000,
    };

    if (isHoverLikeTrigger(animDef.trigger) && hoverOutAction === 'reverse') {
      timeEffect.fill = 'both';
    }

    // Interact's hover state mode is play/pause oriented; give ongoing presets
    // infinite iterations so they can truly resume instead of finishing once.
    if (hoverOutAction === 'keep' && isHoverOngoing) {
      timeEffect.iterations = Infinity;
    }

    if (animDef.trigger === 'ongoing') {
      timeEffect.iterations = Infinity;
    }

    return timeEffect as unknown as Effect;
  }

  // Keyframe effect
  const keyframeEffect = {
    name: effect.name,
    keyframes: effect.keyframes.map((kf: { offset: number; easing?: string; [k: string]: unknown }) => {
      const { offset, easing: kfEasing, ...props } = kf;
      return { offset: String(offset), ...props, ...(kfEasing ? { easing: kfEasing } : {}) };
    }),
  };

  const isScrubTrigger = animDef.trigger === 'scroll';

  if (isScrubTrigger) {
    return {
      keyframeEffect,
      easing: effect.easing ?? 'linear',
      rangeStart: SCROLL_DEFAULT_RANGE_START,
      rangeEnd: SCROLL_DEFAULT_RANGE_END,
    } as unknown as Effect;
  }

  const timeEffect: Record<string, unknown> = {
    keyframeEffect,
    duration: effect.duration ?? 1000,
    easing: effect.easing,
  };

  if (isHoverLikeTrigger(animDef.trigger) && hoverOutAction === 'reverse') {
    timeEffect.fill = 'both';
  }

  if (animDef.trigger === 'ongoing') {
    timeEffect.iterations = Infinity;
  }

  return timeEffect as unknown as Effect;
}

export function buildDocumentInteractConfig(doc: DocumentModel): InteractConfig {
  const interactions: Interaction[] = [];
  const effects: Record<string, Effect> = {};
  const conditions: Record<string, { type: 'media'; predicate: string }> = {};

  const animatedNodes = getAnimatedNodes(doc);

  for (const nodeId of animatedNodes) {
    const animDef = getNodeAnimation(doc, nodeId);
    if (!animDef) continue;
    const reducedMotion = resolveReducedMotion(doc, animDef);

    const triggerKey = animDef.triggerId ?? nodeId;
    const interactTrigger = TRIGGER_MAP[animDef.trigger];
    let interactionConditions: string[] | undefined;

    const effect = buildEffectFromDefinition(animDef);

    // If key differs from trigger node, set target key on effect
    if (animDef.triggerId && animDef.triggerId !== nodeId) {
      (effect as Record<string, unknown>).key = nodeId;
    }

    const interactionEffects: (Effect & { interactionId?: string })[] = [effect];

    if (reducedMotion === 'disable') {
      // Wrap the entire interaction in a prefers-reduced-motion condition
      const conditionId = 'no-reduced-motion';
      conditions[conditionId] = {
        type: 'media',
        predicate: '(prefers-reduced-motion: no-preference)',
      };
      // Put conditions on the interaction, not just the effect
      interactionConditions = [conditionId];
    } else if (reducedMotion && typeof reducedMotion === 'object' && reducedMotion.alternative) {
      // Has alternative: show main under no-preference, alternative under reduce
      const noMotionCondId = 'no-reduced-motion';
      const reducedCondId = 'reduced-motion';
      conditions[noMotionCondId] = { type: 'media', predicate: '(prefers-reduced-motion: no-preference)' };
      conditions[reducedCondId] = { type: 'media', predicate: '(prefers-reduced-motion: reduce)' };
      (effect as Record<string, unknown>).conditions = [noMotionCondId];

      // Build the alternative effect
      const altDef: AnimationDefinition = {
        ...animDef,
        effect: reducedMotion.alternative as AnimationDefinition['effect'],
      };
      const altEffect = buildEffectFromDefinition(altDef);
      if (animDef.triggerId && animDef.triggerId !== nodeId) {
        (altEffect as Record<string, unknown>).key = nodeId;
      }
      (altEffect as Record<string, unknown>).conditions = [reducedCondId];
      interactionEffects.push(altEffect);
    }

    const interaction: Interaction = {
      key: triggerKey,
      trigger: interactTrigger,
      effects: interactionEffects,
      ...(interactionConditions ? { conditions: interactionConditions } : {}),
    };

    // Add trigger params for specific types
    if (animDef.trigger === 'entrance') {
      interaction.params = { type: 'once' };
    } else if (animDef.trigger === 'ongoing') {
      interaction.params = { type: 'once', threshold: -0.1 };
    } else if (isHoverLikeTrigger(animDef.trigger)) {
      const outAction = getHoverOutAction(animDef);
      interaction.params =
        outAction === 'reverse'
          ? { type: 'alternate' }
          : outAction === 'keep'
            ? { type: 'state' }
            : { type: 'repeat' };
    } else if (animDef.trigger === 'mouse') {
      interaction.params = { hitArea: 'self' };
    }

    interactions.push(interaction);
  }

  return {
    effects,
    interactions,
    ...(Object.keys(conditions).length > 0 ? { conditions } : {}),
  };
}

// ── Internal: build AnimationDefinition variant ──────────────────────────────

function buildDefinition(
  trigger: AnimationTriggerType,
  parts: {
    effect: AnimationDefinition['effect'];
    triggerId?: NodeId;
    outAction?: HoverOutAction;
    reducedMotion?: ReducedMotionResponse;
    requiresSticky?: boolean;
  },
): AnimationDefinition {
  const base: Record<string, unknown> = {
    trigger,
    effect: parts.effect,
  };
  if (parts.triggerId) base.triggerId = parts.triggerId;
  if (parts.reducedMotion) base.reducedMotion = parts.reducedMotion;
  if (parts.requiresSticky) base.requiresSticky = parts.requiresSticky;
  if (isHoverLikeTrigger(trigger) && parts.outAction) {
    base.outAction = parts.outAction;
  }
  return base as AnimationDefinition;
}
