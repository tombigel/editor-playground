import type { DocumentModel, NodeId } from '../model/types';
import type {
  AnimationDefinition,
  AnimationTimingOptions,
  AnimationTriggerType,
  DocumentAnimationSettings,
  HoverOutAction,
  HoverAnimationDefinition,
  InteractConfig,
  KeyframeAnimationEffect,
  OngoingTimingOptions,
  PresetInfo,
  PresetParam,
  PresetParamSchema,
  ReducedMotionResponse,
} from './types';
import type { Interaction, Effect, TriggerType } from '@wix/interact/web';
import { cssEasings } from '@wix/motion';

// ── Version ──────────────────────────────────────────────────────────────────
// Tracks the @wix/interact version this API was built against.
// If a future major version introduces breaking config changes, a v2 API
// can coexist while the v1 config builder remains stable.

export const INTERACT_VERSION = '2.4.0';

type TimeAnimationTriggerType = 'once' | 'repeat' | 'alternate' | 'state';

export const SCROLL_DEFAULT_RANGE_START = { name: 'entry', offset: { unit: 'percentage', value: 0 } };
export const SCROLL_DEFAULT_RANGE_END = { name: 'exit', offset: { unit: 'percentage', value: 100 } };

// ── Easing catalog ──────────────────────────────────────────────────────────
// Derived from @wix/motion's cssEasings export (Robert Penner set + CSS standard).

function getEasingGroup(name: string): string {
  if (['linear', 'ease', 'easeIn', 'easeOut', 'easeInOut'].includes(name)) return 'Standard';
  return name.replace(/(In|Out|InOut)$/, '');
}

function formatEasingLabel(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

export const NAMED_EASINGS: { value: string; label: string; group: string }[] = Object.keys(cssEasings).map((name) => ({
  value: name,
  label: formatEasingLabel(name),
  group: getEasingGroup(name),
}));

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
function pxParam(name: string, extra?: Partial<PresetParam>): PresetParam {
  return { name, type: 'number', required: false, unit: 'px', ...extra };
}
function degParam(name: string, extra?: Partial<PresetParam>): PresetParam {
  return { name, type: 'number', required: false, unit: '°', ...extra };
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
// Defaults and ranges sourced from @wix/motion-presets rules:
// https://github.com/wix/interact/tree/master/packages/motion-presets/rules/presets
const PRESET_PARAMS: Record<string, PresetParam[]> = {
  // ── Entrance ────────────────────────────────────────────────────────────────
  FadeIn: [],
  ArcIn: [directionParam(FOUR_DIRECTIONS), pxParam('depth', { default: 200 }), pxParam('perspective', { default: 800, min: 200, max: 2000 })],
  BlurIn: [pxParam('blur', { default: 6, min: 0, max: 50 })],
  BounceIn: [directionParam([...FOUR_DIRECTIONS, 'center']), numberParam('distanceFactor', { default: 1, min: 1, max: 3 }), pxParam('perspective', { default: 800, min: 200, max: 2000 })],
  CurveIn: [directionParam(['left', 'right', 'pseudoLeft', 'pseudoRight']), pxParam('depth', { default: 300 }), pxParam('perspective', { default: 200, min: 100, max: 1000 })],
  DropIn: [numberParam('initialScale', { default: 1.6, min: 1, max: 3 })],
  ExpandIn: [numberParam('initialScale', { default: 0, min: 0, max: 1 }), degParam('direction', { default: 90 }), pxParam('distance')],
  FlipIn: [directionParam(FOUR_DIRECTIONS), degParam('initialRotate', { default: 90, min: 0, max: 360 }), pxParam('perspective', { default: 800, min: 200, max: 2000 })],
  FloatIn: [directionParam(FOUR_DIRECTIONS)],
  FoldIn: [directionParam(FOUR_DIRECTIONS), degParam('initialRotate', { default: 90, min: 0, max: 360 }), pxParam('perspective', { default: 800, min: 200, max: 2000 })],
  GlideIn: [degParam('direction', { default: 180 }), pxParam('distance')],
  RevealIn: [directionParam(FOUR_DIRECTIONS)],
  ShapeIn: [{ name: 'shape', type: 'string', required: false, enum: SHAPE_TYPES, default: 'rectangle' }],
  ShuttersIn: [directionParam(FOUR_DIRECTIONS), numberParam('shutters', { default: 12, min: 2, max: 30 }), boolParam('staggered')],
  SlideIn: [directionParam(FOUR_DIRECTIONS), numberParam('initialTranslate', { default: 1, min: 0, max: 1 })],
  SpinIn: [numberParam('spins', { default: 0.5, min: 0, max: 5 }), directionParam(['clockwise', 'counter-clockwise']), numberParam('initialScale', { default: 0, min: 0, max: 2 })],
  TiltIn: [directionParam(TWO_SIDES), pxParam('depth', { default: 200 }), pxParam('perspective', { default: 800, min: 200, max: 2000 })],
  TurnIn: [directionParam(['top-right', 'top-left', 'bottom-right', 'bottom-left'])],
  WinkIn: [directionParam(['vertical', 'horizontal'])],

  // ── Ongoing ─────────────────────────────────────────────────────────────────
  Bounce: [numberParam('intensity', { default: 0, min: 0, max: 1 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Breathe: [directionParam(['vertical', 'horizontal', 'center']), pxParam('distance', { default: 25 }), pxParam('perspective', { default: 800, min: 200, max: 2000 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Cross: [directionParam(EIGHT_DIRECTIONS), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  DVD: [],
  Flash: [numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Flip: [directionParam(['vertical', 'horizontal']), pxParam('perspective', { default: 800, min: 200, max: 2000 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Fold: [directionParam(FOUR_DIRECTIONS), degParam('angle', { default: 15, min: 0, max: 90 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Jello: [numberParam('intensity', { default: 0.25, min: 0, max: 1 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Poke: [directionParam(FOUR_DIRECTIONS), numberParam('intensity', { default: 0.5, min: 0, max: 1 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Pulse: [numberParam('intensity', { default: 0, min: 0, max: 1 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Rubber: [numberParam('intensity', { default: 0.5, min: 0, max: 1 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Spin: [directionParam(['clockwise', 'counter-clockwise']), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Swing: [directionParam(FOUR_DIRECTIONS), degParam('swing', { default: 20, min: 0, max: 90 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],
  Wiggle: [numberParam('intensity', { default: 0.5, min: 0, max: 1 }), numberParam('iterationDelay', { default: 0, min: 0, max: 5000, unit: 'ms' })],

  // ── Scroll ──────────────────────────────────────────────────────────────────
  ArcScroll: [directionParam(['vertical', 'horizontal']), scrollRangeParam(), pxParam('perspective', { default: 500, min: 200, max: 2000 })],
  BlurScroll: [scrollRangeParam(), pxParam('blur', { default: 6, min: 0, max: 50 })],
  FadeScroll: [scrollRangeParam(), numberParam('opacity', { default: 0, min: 0, max: 1 })],
  FlipScroll: [directionParam(['vertical', 'horizontal']), scrollRangeParam(), degParam('rotate', { default: 240, min: 0, max: 720 }), pxParam('perspective', { default: 800, min: 200, max: 2000 })],
  GrowScroll: [directionParam(NINE_DIRECTIONS), scrollRangeParam(), numberParam('scale', { default: 0, min: 0, max: 5 }), numberParam('speed', { default: 0 })],
  MoveScroll: [degParam('angle', { default: 120, min: 0, max: 360 }), scrollRangeParam(), pxParam('distance', { default: 400 })],
  PanScroll: [directionParam(TWO_SIDES), pxParam('distance', { default: 400 }), boolParam('startFromOffScreen'), scrollRangeParam()],
  ParallaxScroll: [numberParam('parallaxFactor', { default: 0.5, min: 0, max: 2 }), scrollRangeParam()],
  RevealScroll: [directionParam(FOUR_DIRECTIONS), scrollRangeParam()],
  ShapeScroll: [{ name: 'shape', type: 'string', required: false, enum: SHAPE_TYPES, default: 'circle' }, scrollRangeParam(), numberParam('intensity', { default: 0.5, min: 0, max: 1 })],
  ShrinkScroll: [directionParam(NINE_DIRECTIONS), scrollRangeParam(), numberParam('scale', { default: 1.2, min: 0, max: 5 }), numberParam('speed', { default: 0 })],
  ShuttersScroll: [directionParam(FOUR_DIRECTIONS), numberParam('shutters', { default: 12, min: 2, max: 30 }), boolParam('staggered'), scrollRangeParam()],
  SkewPanScroll: [directionParam(TWO_SIDES), scrollRangeParam(), degParam('skew', { default: 10, min: 0, max: 45 })],
  SlideScroll: [directionParam(FOUR_DIRECTIONS), scrollRangeParam()],
  Spin3dScroll: [scrollRangeParam(), degParam('rotate', { default: -100, min: -360, max: 360 }), numberParam('speed', { default: 0 }), pxParam('perspective', { default: 1000, min: 200, max: 2000 })],
  SpinScroll: [directionParam(['clockwise', 'counter-clockwise']), numberParam('spins', { default: 0.15, min: 0, max: 5 }), scrollRangeParam(), numberParam('scale', { default: 1, min: 0, max: 3 })],
  StretchScroll: [scrollRangeParam(), numberParam('stretch', { default: 0.6, min: 0, max: 3 })],
  TiltScroll: [directionParam(TWO_SIDES), scrollRangeParam(), numberParam('parallaxFactor', { default: 0, min: 0, max: 2 }), pxParam('perspective', { default: 400, min: 200, max: 2000 })],
  TurnScroll: [directionParam(TWO_SIDES), { name: 'spin', type: 'string', required: false, enum: ['clockwise', 'counter-clockwise'] }, scrollRangeParam(), numberParam('scale', { default: 1, min: 0, max: 3 })],

  // ── Mouse ───────────────────────────────────────────────────────────────────
  AiryMouse: [mouseAxisParam(), pxParam('distance', { default: 200 }), degParam('angle', { default: 30, min: 0, max: 90 }), boolParam('inverted')],
  BlobMouse: [pxParam('distance', { default: 200 }), numberParam('scale', { default: 1.4, min: 0, max: 3 }), boolParam('inverted')],
  BlurMouse: [pxParam('distance', { default: 80 }), degParam('angle', { default: 5, min: 0, max: 90 }), numberParam('scale', { default: 0.3, min: 0, max: 2 }), pxParam('blur', { default: 20, min: 0, max: 50 }), pxParam('perspective', { default: 600, min: 200, max: 2000 }), boolParam('inverted')],
  BounceMouse: [mouseAxisParam(), boolParam('inverted')],
  CustomMouse: [],
  ScaleMouse: [mouseAxisParam(), pxParam('distance', { default: 80 }), numberParam('scale', { default: 1.4, min: 0, max: 3 }), boolParam('inverted')],
  SkewMouse: [pxParam('distance', { default: 200 }), degParam('angle', { default: 25, min: 0, max: 45 }), mouseAxisParam(), boolParam('inverted')],
  SpinMouse: [mouseAxisParam(), boolParam('inverted')],
  SwivelMouse: [degParam('angle', { default: 5, min: 0, max: 90 }), pxParam('perspective', { default: 800, min: 200, max: 2000 }), { name: 'pivotAxis', type: 'string', required: false, enum: MOUSE_PIVOT_AXIS, default: 'center-horizontal' }, boolParam('inverted')],
  Tilt3DMouse: [degParam('angle', { default: 5, min: 0, max: 90 }), pxParam('perspective', { default: 800, min: 200, max: 2000 }), boolParam('inverted')],
  Track3DMouse: [pxParam('distance', { default: 200 }), degParam('angle', { default: 5, min: 0, max: 90 }), mouseAxisParam(), pxParam('perspective', { default: 800, min: 200, max: 2000 }), boolParam('inverted')],
  TrackMouse: [mouseAxisParam(), pxParam('distance', { default: 200 }), boolParam('inverted')],
};

// ── Internal helpers ─────────────────────────────────────────────────────────

function assertNode(doc: DocumentModel, nodeId: NodeId): void {
  if (!doc.nodes[nodeId]) {
    throw new Error(`Node "${nodeId}" not found in document`);
  }
}

function assertNotSiteRoot(doc: DocumentModel, nodeId: NodeId): void {
  if (doc.nodes[nodeId]?.contentType === 'site') {
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
  return node.contentType !== 'site';
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
  if (!node || node.contentType === 'site') return undefined;
  return (node as unknown as { animation?: AnimationDefinition }).animation;
}

export function getAnimatedNodes(doc: DocumentModel): NodeId[] {
  return Object.keys(doc.nodes).filter((id) => {
    const node = doc.nodes[id];
    if (!node || node.contentType === 'site') return false;
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
    timing?: AnimationTimingOptions | OngoingTimingOptions;
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
    timing: params.timing,
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
    timing?: AnimationTimingOptions | OngoingTimingOptions;
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
    timing: params.timing,
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
    timing?: AnimationTimingOptions | OngoingTimingOptions;
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
  if ('reducedMotion' in updates) {
    if (updates.reducedMotion) {
      updated.reducedMotion = updates.reducedMotion;
    } else {
      delete updated.reducedMotion;
    }
  }
  if (updates.requiresSticky !== undefined) updated.requiresSticky = updates.requiresSticky;
  if (updates.timing !== undefined) {
    // Merge timing: spread existing timing with new values
    const existingTiming = (updated.timing as Record<string, unknown> | undefined) ?? {};
    updated.timing = { ...existingTiming, ...updates.timing };
  }

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

/** Extract timing from definition variants that support it */
function getDefinitionTiming(animDef: AnimationDefinition): (AnimationTimingOptions & { iterations?: number; alternate?: boolean }) | undefined {
  if ('timing' in animDef) return animDef.timing;
  return undefined;
}

function buildEffectFromDefinition(animDef: AnimationDefinition): Effect {
  const { effect } = animDef;
  const timing = getDefinitionTiming(animDef);
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
      duration: timing?.duration ?? 1000,
    };

    if (timing?.delay) timeEffect.delay = timing.delay;
    if (timing?.easing) timeEffect.easing = timing.easing;

    if (isHoverLikeTrigger(animDef.trigger) && hoverOutAction === 'reverse') {
      timeEffect.fill = 'both';
    }

    // Interact's hover state mode is play/pause oriented; give ongoing presets
    // infinite iterations so they can truly resume instead of finishing once.
    if (hoverOutAction === 'keep' && isHoverOngoing) {
      timeEffect.iterations = timing?.iterations ?? Infinity;
    }

    if (animDef.trigger === 'ongoing') {
      timeEffect.iterations = timing?.iterations ?? Infinity;
    }

    if (timing?.alternate) timeEffect.alternate = true;

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
    duration: timing?.duration ?? effect.duration ?? 1000,
    easing: timing?.easing ?? effect.easing,
  };

  if (timing?.delay) timeEffect.delay = timing.delay;

  if (isHoverLikeTrigger(animDef.trigger) && hoverOutAction === 'reverse') {
    timeEffect.fill = 'both';
  }

  if (animDef.trigger === 'ongoing') {
    timeEffect.iterations = timing?.iterations ?? Infinity;
  }

  if (timing?.alternate) timeEffect.alternate = true;

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

    // Add trigger params and effect triggerType for specific trigger kinds
    let effectTriggerType: TimeAnimationTriggerType | undefined;
    if (animDef.trigger === 'entrance') {
      effectTriggerType = 'once';
    } else if (animDef.trigger === 'ongoing') {
      effectTriggerType = 'once';
    } else if (isHoverLikeTrigger(animDef.trigger)) {
      const outAction = getHoverOutAction(animDef);
      effectTriggerType = outAction === 'reverse' ? 'alternate' : outAction === 'keep' ? 'state' : 'repeat';
    } else if (animDef.trigger === 'mouse') {
      interaction.params = { hitArea: 'self' };
    }
    if (effectTriggerType) {
      for (const e of interactionEffects) {
        (e as Record<string, unknown>).triggerType = effectTriggerType;
      }
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
    timing?: AnimationTimingOptions | OngoingTimingOptions;
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
  // Timing is only relevant for time-based triggers
  if (parts.timing && trigger !== 'scroll' && trigger !== 'mouse') {
    base.timing = parts.timing;
  }
  return base as AnimationDefinition;
}
