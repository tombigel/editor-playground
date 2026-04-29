import type {
  AnimationDefinition,
  AnimationTimingOptions,
  AnimationTriggerType,
  DocumentAnimationSettings,
  EntranceAnimationDefinition,
  EntranceType,
  FillMode,
  ScrollAnimationDefinition,
  ScrubTransitionEasing,
  ClickAnimationDefinition,
  ClickType,
  MouseAnimationDefinition,
  MouseHitArea,
  HoverOutAction,
  HoverAnimationDefinition,
  InteractConfig,
  KeyframeAnimationEffect,
  OngoingTimingOptions,
  PresetInfo,
  PresetParamSchema,
  ReducedMotionResponse,
} from './types';
import type { DocumentModel, NodeId } from '../model/types';
import type { Interaction, Effect, TriggerType } from '@wix/interact/web';
import { cssEasings } from '@wix/motion';
import {
  getLibraryPresetTruth,
  getPlayablePresetCategory,
  getUiPresetNamesByCategory,
} from './libraryTruth';
import { INTERACT_ROOT_KEY, collectInteractKeysFromConfig } from './interactIntegration';

export const INTERACT_VERSION = '2.2.1';

export const SCROLL_DEFAULT_RANGE_START = { name: 'cover', offset: { unit: 'percentage', value: 0 } };
export const SCROLL_DEFAULT_RANGE_END = { name: 'cover', offset: { unit: 'percentage', value: 100 } };

// ── Easing catalog ──────────────────────────────────────────────────────────

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

type PresetCategory = 'entrance' | 'ongoing' | 'scroll' | 'mouse';

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

function canonicalizeAnimationTrigger(trigger: AnimationTriggerType): AnimationTriggerType {
  if (trigger === 'click') return 'activate';
  if (trigger === 'hover') return 'interest';
  return trigger;
}
// ── Internal helpers ────────────────────────────────────────────────────────

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
  const cloned: DocumentModel = { ...doc, nodes: { ...doc.nodes } };
  cloned.nodes[nodeId] = { ...cloned.nodes[nodeId] } as typeof doc.nodes[string];
  return { doc: cloned, node: cloned.nodes[nodeId] as unknown as Record<string, unknown> };
}

function hasAnimationField(node: Record<string, unknown>): node is Record<string, unknown> & { animation?: AnimationDefinition } {
  return node.contentType !== 'site';
}

// ── Low-level API ───────────────────────────────────────────────────────────

export function setNodeAnimation(doc: DocumentModel, nodeId: NodeId, def: AnimationDefinition | undefined): DocumentModel {
  assertNode(doc, nodeId);
  assertNotSiteRoot(doc, nodeId);
  const { doc: cloned, node } = cloneDocWithNode(doc, nodeId);
  if (hasAnimationField(node)) {
    if (def === undefined) { delete node.animation; } else { node.animation = def; }
  }
  return cloned;
}

export function getNodeAnimation(doc: DocumentModel, nodeId: NodeId): AnimationDefinition | undefined {
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

// ── Preset catalog API ──────────────────────────────────────────────────────

export function getMotionPresets() {
  return {
    entrance: getUiPresetNamesByCategory('entrance'),
    ongoing: getUiPresetNamesByCategory('ongoing'),
    scroll: getUiPresetNamesByCategory('scroll'),
    mouse: getUiPresetNamesByCategory('mouse'),
  };
}

export function getPresetCategory(preset: string): PresetCategory | null {
  return getPlayablePresetCategory(preset);
}

export function getPresetsForTrigger(trigger: AnimationTriggerType): PresetInfo[] {
  const allowed = TRIGGER_ALLOWED_CATEGORIES[trigger];
  const results: PresetInfo[] = [];
  for (const category of allowed) {
    for (const preset of getUiPresetNamesByCategory(category)) {
      const truth = getLibraryPresetTruth(preset);
      if (!truth) continue;
      results.push({
        preset,
        category,
        params: truth.codeParams.map((param) =>
          param.name === 'range' ? { ...param, label: 'Phase' } : param,
        ),
      });
    }
  }
  return results;
}

export function getPresetParams(preset: string): PresetParamSchema | null {
  const category = getPresetCategory(preset);
  if (!category) return null;
  const truth = getLibraryPresetTruth(preset);
  if (!truth) return null;
  return {
    preset,
    category,
    params: truth.codeParams.map((param) =>
      param.name === 'range' ? { ...param, label: 'Phase' } : param,
    ),
  };
}

// ── High-level API ──────────────────────────────────────────────────────────

export function setPresetAnimation(
  doc: DocumentModel, target: NodeId,
  params: { trigger: AnimationTriggerType; preset: string; options?: Record<string, unknown>; timing?: AnimationTimingOptions | OngoingTimingOptions; source?: NodeId; outAction?: HoverOutAction; reducedMotion?: ReducedMotionResponse; requiresSticky?: boolean },
): DocumentModel {
  assertNode(doc, target); assertNotSiteRoot(doc, target);
  const trigger = canonicalizeAnimationTrigger(params.trigger);
  const category = getPresetCategory(params.preset);
  if (!category) throw new Error(`Unknown preset "${params.preset}". Call getMotionPresets() to see available presets.`);
  const allowed = TRIGGER_ALLOWED_CATEGORIES[trigger];
  if (!allowed.includes(category)) throw new Error(`Preset "${params.preset}" (${category}) is not compatible with trigger "${params.trigger}"`);
  const effect = { kind: 'named' as const, type: params.preset, ...(params.options ?? {}) };
  return setNodeAnimation(doc, target, buildDefinition(trigger, { effect, timing: params.timing, triggerId: params.source, outAction: params.outAction, reducedMotion: params.reducedMotion, requiresSticky: params.requiresSticky }));
}

export function setKeyframeAnimation(
  doc: DocumentModel, target: NodeId,
  params: { trigger: AnimationTriggerType; name: string; keyframes: Array<{ offset: number; easing?: string; [key: string]: unknown }>; duration?: number; easing?: string; timing?: AnimationTimingOptions | OngoingTimingOptions; source?: NodeId; outAction?: HoverOutAction; reducedMotion?: ReducedMotionResponse; requiresSticky?: boolean },
): DocumentModel {
  assertNode(doc, target); assertNotSiteRoot(doc, target);
  const effect: KeyframeAnimationEffect = { kind: 'keyframe', name: params.name, keyframes: params.keyframes, duration: params.duration, easing: params.easing };
  return setNodeAnimation(doc, target, buildDefinition(canonicalizeAnimationTrigger(params.trigger), { effect, timing: params.timing, triggerId: params.source, outAction: params.outAction, reducedMotion: params.reducedMotion, requiresSticky: params.requiresSticky }));
}

function assertKeyframeAnimation(animation: AnimationDefinition | undefined, target: NodeId): asserts animation is AnimationDefinition & { effect: KeyframeAnimationEffect } {
  if (!animation || animation.effect.kind !== 'keyframe') {
    throw new Error(`Node "${target}" does not have a keyframe animation`);
  }
}

function cloneKeyframes(keyframes: KeyframeAnimationEffect['keyframes']): KeyframeAnimationEffect['keyframes'] {
  return keyframes.map((keyframe) => ({ ...keyframe }));
}

function makeStarterKeyframeName(trigger: AnimationTriggerType): string {
  const label = trigger.charAt(0).toUpperCase() + trigger.slice(1);
  return `Custom${label}Keyframes`;
}

export function createStarterKeyframeEffect(
  trigger: AnimationTriggerType,
  name = makeStarterKeyframeName(trigger),
): KeyframeAnimationEffect {
  return {
    kind: 'keyframe',
    name,
    keyframes: [
      { offset: 0, opacity: 0, transform: 'translateY(24px)' },
      { offset: 100, opacity: 1, transform: 'translateY(0px)' },
    ],
  };
}

export function convertNamedEffectToKeyframes(doc: DocumentModel, target: NodeId): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);
  const existing = getNodeAnimation(doc, target);
  if (!existing || existing.effect.kind !== 'named') {
    throw new Error(`Node "${target}" does not have a named effect animation`);
  }
  const starter = createStarterKeyframeEffect(existing.trigger);
  const next = {
    ...existing,
    effect: starter,
  } satisfies AnimationDefinition;
  return setNodeAnimation(doc, target, next);
}

export function renameKeyframeEffect(doc: DocumentModel, target: NodeId, name: string): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);
  const existing = getNodeAnimation(doc, target);
  assertKeyframeAnimation(existing, target);
  return setNodeAnimation(doc, target, {
    ...existing,
    effect: {
      ...existing.effect,
      name,
    },
  });
}

export function replaceAnimationKeyframes(
  doc: DocumentModel,
  target: NodeId,
  keyframes: KeyframeAnimationEffect['keyframes'],
): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);
  const existing = getNodeAnimation(doc, target);
  assertKeyframeAnimation(existing, target);
  return setNodeAnimation(doc, target, {
    ...existing,
    effect: {
      ...existing.effect,
      keyframes: cloneKeyframes(keyframes),
    },
  });
}

export function updateKeyframeAnimationEffect(
  doc: DocumentModel,
  target: NodeId,
  updates: Partial<Pick<KeyframeAnimationEffect, 'name' | 'duration' | 'easing'>>,
): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);
  const existing = getNodeAnimation(doc, target);
  assertKeyframeAnimation(existing, target);
  return setNodeAnimation(doc, target, {
    ...existing,
    effect: {
      ...existing.effect,
      ...updates,
    },
  });
}

export function insertAnimationKeyframe(
  doc: DocumentModel,
  target: NodeId,
  keyframe: KeyframeAnimationEffect['keyframes'][number],
): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);
  const existing = getNodeAnimation(doc, target);
  assertKeyframeAnimation(existing, target);
  return replaceAnimationKeyframes(doc, target, [...existing.effect.keyframes, { ...keyframe }]);
}

export function updateAnimationKeyframe(
  doc: DocumentModel,
  target: NodeId,
  index: number,
  keyframe: KeyframeAnimationEffect['keyframes'][number],
): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);
  const existing = getNodeAnimation(doc, target);
  assertKeyframeAnimation(existing, target);
  if (index < 0 || index >= existing.effect.keyframes.length) {
    throw new Error(`Keyframe index ${index} is out of bounds`);
  }
  const nextKeyframes = cloneKeyframes(existing.effect.keyframes);
  nextKeyframes[index] = { ...keyframe };
  return replaceAnimationKeyframes(doc, target, nextKeyframes);
}

export function removeAnimationKeyframe(doc: DocumentModel, target: NodeId, index: number): DocumentModel {
  assertNode(doc, target);
  assertNotSiteRoot(doc, target);
  const existing = getNodeAnimation(doc, target);
  assertKeyframeAnimation(existing, target);
  if (existing.effect.keyframes.length <= 2) {
    throw new Error('Keyframe animations must keep at least two keyframes');
  }
  if (index < 0 || index >= existing.effect.keyframes.length) {
    throw new Error(`Keyframe index ${index} is out of bounds`);
  }
  return replaceAnimationKeyframes(
    doc,
    target,
    existing.effect.keyframes.filter((_, keyframeIndex) => keyframeIndex !== index),
  );
}

export function updateAnimationOptions(
  doc: DocumentModel, target: NodeId,
  updates: {
    effectOptions?: Record<string, unknown>;
    source?: NodeId;
    outAction?: HoverOutAction;
    entranceType?: EntranceType;
    entranceThreshold?: number;
    entranceInset?: string;
    entranceFill?: FillMode;
    ongoingFill?: FillMode;
    ongoingInset?: string;
    clickType?: ClickType;
    clickFill?: FillMode;
    mouseHitArea?: MouseHitArea;
    scrollReversed?: boolean;
    scrollFill?: FillMode;
    hoverFill?: FillMode;
    mouseAxis?: 'x' | 'y' | undefined;
    mouseCenteredToTarget?: boolean;
    mouseTransitionDuration?: number;
    mouseTransitionEasing?: ScrubTransitionEasing;
    timing?: AnimationTimingOptions | OngoingTimingOptions;
    reducedMotion?: ReducedMotionResponse;
    requiresSticky?: boolean;
    scrollRangeStart?: number;
    scrollRangeEnd?: number;
  },
): DocumentModel {
  assertNode(doc, target); assertNotSiteRoot(doc, target);
  const existing = getNodeAnimation(doc, target);
  if (!existing) throw new Error(`Node "${target}" has no animation to update`);
  const updated = { ...existing } as Record<string, unknown>;
  if ('source' in updates) {
    if (updates.source) updated.triggerId = updates.source;
    else delete updated.triggerId;
  }
  if (updates.effectOptions !== undefined && isRecordLike(updated.effect) && updated.effect.kind === 'named') {
    updated.effect = { ...updated.effect, ...updates.effectOptions };
  }
  if (updates.outAction !== undefined) updated.outAction = updates.outAction;
  if (updates.entranceType !== undefined) updated.entranceType = updates.entranceType;
  if (updates.entranceThreshold !== undefined) updated.threshold = updates.entranceThreshold;
  if ('entranceInset' in updates) updated.inset = updates.entranceInset;
  if (updates.entranceFill !== undefined) updated.fill = updates.entranceFill;
  if (updates.ongoingFill !== undefined) updated.fill = updates.ongoingFill;
  if ('ongoingInset' in updates) updated.inset = updates.ongoingInset;
  if (updates.scrollReversed !== undefined) updated.reversed = updates.scrollReversed;
  if (updates.scrollFill !== undefined) updated.fill = updates.scrollFill;
  if (updates.hoverFill !== undefined) updated.fill = updates.hoverFill;
  if ('mouseAxis' in updates) updated.mouseAxis = updates.mouseAxis;
  if (updates.mouseCenteredToTarget !== undefined) updated.centeredToTarget = updates.mouseCenteredToTarget;
  if ('mouseTransitionDuration' in updates) updated.transitionDuration = updates.mouseTransitionDuration;
  if (updates.mouseTransitionEasing !== undefined) updated.transitionEasing = updates.mouseTransitionEasing;
  if (updates.clickType !== undefined) updated.clickType = updates.clickType;
  if (updates.clickFill !== undefined) updated.fill = updates.clickFill;
  if (updates.mouseHitArea !== undefined) updated.hitArea = updates.mouseHitArea;
  if ('reducedMotion' in updates) { if (updates.reducedMotion) { updated.reducedMotion = updates.reducedMotion; } else { delete updated.reducedMotion; } }
  if (updates.requiresSticky !== undefined) updated.requiresSticky = updates.requiresSticky;
  if ('scrollRangeStart' in updates || 'scrollRangeEnd' in updates) {
    const [currentStart, currentEnd] = normalizeScrollRangeValues(
      typeof updated.scrollRangeStart === 'number' ? updated.scrollRangeStart : 0,
      typeof updated.scrollRangeEnd === 'number' ? updated.scrollRangeEnd : 100,
    );
    const hasStartUpdate = updates.scrollRangeStart !== undefined;
    const hasEndUpdate = updates.scrollRangeEnd !== undefined;
    if (hasStartUpdate && hasEndUpdate) {
      const [start, end] = normalizeScrollRangeValues(updates.scrollRangeStart ?? currentStart, updates.scrollRangeEnd ?? currentEnd);
      updated.scrollRangeStart = start;
      updated.scrollRangeEnd = end;
    } else if (hasStartUpdate) {
      updated.scrollRangeStart = Math.min(clampScrollRangePercent(updates.scrollRangeStart ?? currentStart), currentEnd);
      updated.scrollRangeEnd = currentEnd;
    } else if (hasEndUpdate) {
      updated.scrollRangeStart = currentStart;
      updated.scrollRangeEnd = Math.max(clampScrollRangePercent(updates.scrollRangeEnd ?? currentEnd), currentStart);
    }
  }
  if (updates.timing !== undefined) { updated.timing = { ...((updated.timing as Record<string, unknown> | undefined) ?? {}), ...updates.timing }; }
  return setNodeAnimation(doc, target, updated as AnimationDefinition);
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function clearAnimation(doc: DocumentModel, target: NodeId): DocumentModel {
  assertNode(doc, target); assertNotSiteRoot(doc, target);
  if (!getNodeAnimation(doc, target)) return doc;
  return setNodeAnimation(doc, target, undefined);
}

export function setDocumentAnimationSettings(doc: DocumentModel, settings: DocumentAnimationSettings): DocumentModel {
  return { ...doc, animationSettings: settings };
}

// ── Config builder ──────────────────────────────────────────────────────────

function isHoverLikeTrigger(trigger: AnimationTriggerType): trigger is 'hover' | 'interest' {
  return trigger === 'hover' || trigger === 'interest';
}

export function getDefaultHoverOutActionForEffect(effect: AnimationDefinition['effect']): HoverOutAction {
  if (effect.kind === 'named' && getPresetCategory(effect.type) === 'ongoing') {
    return 'pause';
  }
  return 'reverse';
}

const TRIGGER_MAP: Record<AnimationTriggerType, TriggerType> = {
  entrance: 'viewEnter', ongoing: 'viewEnter', scroll: 'viewProgress',
  /** Document "click" uses Interact `click` + global allowA11yTriggers (keyboard like activate). */
  click: 'click', activate: 'activate', hover: 'interest', interest: 'interest', mouse: 'pointerMove',
};

function resolveReducedMotion(doc: DocumentModel, animDef: AnimationDefinition): ReducedMotionResponse | undefined {
  const a11y = doc.animationSettings?.a11y;
  if (a11y?.reducedMotion) return a11y.reducedMotion;
  if (a11y?.perTrigger?.[animDef.trigger]) return a11y.perTrigger[animDef.trigger];
  return animDef.reducedMotion;
}

function getHoverOutAction(animDef: AnimationDefinition): HoverOutAction {
  if (!isHoverLikeTrigger(animDef.trigger)) return 'reset';
  return (animDef as HoverAnimationDefinition).outAction ?? getDefaultHoverOutActionForEffect(animDef.effect);
}

function getDefinitionTiming(animDef: AnimationDefinition): (AnimationTimingOptions & { iterations?: number; alternate?: boolean }) | undefined {
  if ('timing' in animDef) return animDef.timing;
  return undefined;
}

function getScrollRanges(animDef: AnimationDefinition) {
  if (animDef.trigger !== 'scroll') return { rangeStart: SCROLL_DEFAULT_RANGE_START, rangeEnd: SCROLL_DEFAULT_RANGE_END };
  const [startPct, endPct] = normalizeScrollRangeValues(
    animDef.scrollRangeStart ?? 0,
    animDef.scrollRangeEnd ?? 100,
  );
  return {
    rangeStart: { ...SCROLL_DEFAULT_RANGE_START, offset: { unit: 'percentage', value: startPct } },
    rangeEnd: { ...SCROLL_DEFAULT_RANGE_END, offset: { unit: 'percentage', value: endPct } },
  };
}

function normalizeScrollRangeValues(start: number, end: number): [number, number] {
  const normalizedStart = clampScrollRangePercent(Number.isFinite(start) ? start : 0);
  const normalizedEnd = clampScrollRangePercent(Number.isFinite(end) ? end : 100);
  return [Math.min(normalizedStart, normalizedEnd), Math.max(normalizedStart, normalizedEnd)];
}

function clampScrollRangePercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getTimeEffectTriggerType(animDef: AnimationDefinition): ClickType | EntranceType | 'state' | undefined {
  if (animDef.trigger === 'entrance') {
    return (animDef as EntranceAnimationDefinition).entranceType ?? 'once';
  }
  if (animDef.trigger === 'ongoing') {
    return 'state';
  }
  if (animDef.trigger === 'click' || animDef.trigger === 'activate') {
    const explicitClickType = (animDef as ClickAnimationDefinition).clickType;
    if (explicitClickType) return explicitClickType;
    const clickPresetCategory = animDef.effect.kind === 'named' ? getPresetCategory(animDef.effect.type) : 'entrance';
    return clickPresetCategory === 'entrance' ? 'repeat' : 'state';
  }
  if (isHoverLikeTrigger(animDef.trigger)) {
    const outAction = getHoverOutAction(animDef);
    return outAction === 'reverse' ? 'alternate' : outAction === 'pause' ? 'state' : 'repeat';
  }
  return undefined;
}

function isNamedOngoingPreset(effect: AnimationDefinition['effect']): effect is AnimationDefinition['effect'] & { kind: 'named'; type: string } {
  return effect.kind === 'named' && getPresetCategory(effect.type) === 'ongoing';
}

function normalizeKeyframeOffset(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  const normalized = offset > 1 || offset < 0 ? offset / 100 : offset;
  return Math.max(0, Math.min(1, normalized));
}

function buildEffectFromDefinition(animDef: AnimationDefinition): Effect {
  const { effect } = animDef;
  const timing = getDefinitionTiming(animDef);
  const hoverOutAction = isHoverLikeTrigger(animDef.trigger) ? getHoverOutAction(animDef) : null;
  const explicitFill = 'fill' in animDef ? animDef.fill : undefined;
  const triggerType = getTimeEffectTriggerType(animDef);
  const usesPresetIterationDelay = isNamedOngoingPreset(effect);

  if (effect.kind === 'named') {
    const { kind, options: effectOptions, playReversed, ...rest } = effect as typeof effect & {
      playReversed?: boolean;
    };
    const namedEffect = { ...rest, ...(effectOptions ?? {}) };
    const isEntrancePreset = getPresetCategory(namedEffect.type as string) === 'entrance';
    const isClickLike = animDef.trigger === 'click' || animDef.trigger === 'activate';
    const supportsIterationAlternate = animDef.trigger === 'ongoing' || (isClickLike && !isEntrancePreset);
    const shouldReverseNamedPreset =
      isEntrancePreset
        ? (typeof playReversed === 'boolean'
            ? playReversed
            : isClickLike)
        : false;
    if (animDef.trigger === 'scroll') {
      const { rangeStart, rangeEnd } = getScrollRanges(animDef);
      const scrDef = animDef as ScrollAnimationDefinition;
      const scrubEffect: Record<string, unknown> = { namedEffect, easing: 'linear', fill: scrDef.fill ?? 'both', rangeStart, rangeEnd };
      if (scrDef.reversed) scrubEffect.reversed = true;
      return scrubEffect as unknown as Effect;
    }
    if (animDef.trigger === 'mouse') {
      const mouseDef = animDef as MouseAnimationDefinition;
      const mouseEffect: Record<string, unknown> = { namedEffect };
      if (mouseDef.centeredToTarget) mouseEffect.centeredToTarget = true;
      if (mouseDef.transitionDuration) { mouseEffect.transitionDuration = mouseDef.transitionDuration; mouseEffect.transitionEasing = mouseDef.transitionEasing ?? 'linear'; }
      return mouseEffect as unknown as Effect;
    }
    const timeEffect: Record<string, unknown> = { namedEffect, duration: timing?.duration ?? 1000 };
    if (timing?.delay && !usesPresetIterationDelay) timeEffect.delay = timing.delay;
    if (timing?.easing) timeEffect.easing = timing.easing;
    if (triggerType) timeEffect.triggerType = triggerType;
    if (animDef.trigger === 'entrance') {
      timeEffect.fill = explicitFill ?? 'both';
    } else if (animDef.trigger === 'ongoing' && explicitFill) {
      timeEffect.fill = explicitFill;
    }
    if (isHoverLikeTrigger(animDef.trigger) && hoverOutAction === 'reverse') {
      timeEffect.fill = explicitFill ?? 'both';
    } else if (isHoverLikeTrigger(animDef.trigger) && explicitFill) {
      timeEffect.fill = explicitFill;
    }
    if (isClickLike && isEntrancePreset) {
      timeEffect.fill = explicitFill ?? 'none';
      if (shouldReverseNamedPreset) timeEffect.reversed = true;
    } else if (isClickLike && explicitFill) {
      timeEffect.fill = explicitFill;
    }
    if (isHoverLikeTrigger(animDef.trigger) && shouldReverseNamedPreset) {
      timeEffect.reversed = true;
    }
    if (isHoverLikeTrigger(animDef.trigger) && hoverOutAction === 'pause') {
      timeEffect.iterations = timing?.iterations ?? Infinity;
    }
    if (animDef.trigger === 'ongoing' || (isClickLike && !isEntrancePreset)) timeEffect.iterations = timing?.iterations ?? Infinity;
    if (timing?.alternate && supportsIterationAlternate) timeEffect.alternate = true;
    return timeEffect as unknown as Effect;
  }

  const keyframeEffect = {
    name: effect.name,
    keyframes: effect.keyframes.map((kf: { offset: number; easing?: string; [k: string]: unknown }) => {
      const { offset, easing: kfEasing, ...props } = kf;
      return { offset: normalizeKeyframeOffset(offset), ...props, ...(kfEasing ? { easing: kfEasing } : {}) };
    }),
  };

  if (animDef.trigger === 'scroll') {
    const { rangeStart, rangeEnd } = getScrollRanges(animDef);
    const scrDef = animDef as ScrollAnimationDefinition;
    const scrubEffect: Record<string, unknown> = { keyframeEffect, easing: effect.easing ?? 'linear', rangeStart, rangeEnd };
    if (scrDef.reversed) scrubEffect.reversed = true;
    if (scrDef.fill) scrubEffect.fill = scrDef.fill;
    return scrubEffect as unknown as Effect;
  }

  const timeEffect: Record<string, unknown> = { keyframeEffect, duration: timing?.duration ?? effect.duration ?? 1000, easing: timing?.easing ?? effect.easing };
  if (timing?.delay) timeEffect.delay = timing.delay;
  if (triggerType) timeEffect.triggerType = triggerType;
  if (animDef.trigger === 'entrance') {
    timeEffect.fill = explicitFill ?? 'both';
  } else if (animDef.trigger === 'ongoing' && explicitFill) {
    timeEffect.fill = explicitFill;
  }
  if (isHoverLikeTrigger(animDef.trigger) && hoverOutAction === 'reverse') {
    timeEffect.fill = explicitFill ?? 'both';
  } else if (isHoverLikeTrigger(animDef.trigger) && explicitFill) {
    timeEffect.fill = explicitFill;
  }
  if (animDef.trigger === 'click' || animDef.trigger === 'activate') {
    // keyframe effects on click are treated as entrance-style (reversed out)
    timeEffect.fill = explicitFill ?? 'none';
    timeEffect.reversed = true;
  }
  if ((animDef.trigger === 'click' || animDef.trigger === 'activate') && timing?.iterations !== undefined) {
    timeEffect.iterations = timing.iterations;
  }
  if (isHoverLikeTrigger(animDef.trigger) && hoverOutAction === 'pause') {
    timeEffect.iterations = timing?.iterations ?? Infinity;
  }
  if (animDef.trigger === 'ongoing') timeEffect.iterations = timing?.iterations ?? Infinity;
  if (timing?.alternate && animDef.trigger === 'ongoing') timeEffect.alternate = true;
  return timeEffect as unknown as Effect;
}

export function buildDocumentInteractConfig(doc: DocumentModel): InteractConfig {
  const interactions: Interaction[] = [];
  const effects: Record<string, Effect> = {};
  const conditions: Record<string, { type: 'media'; predicate: string }> = {};

  for (const nodeId of getAnimatedNodes(doc)) {
    const animDef = getNodeAnimation(doc, nodeId);
    if (!animDef) continue;
    const reducedMotion = resolveReducedMotion(doc, animDef);
    const triggerKey =
      animDef.trigger === 'mouse' ? (animDef.triggerId ?? INTERACT_ROOT_KEY) : (animDef.triggerId ?? nodeId);
    let interactionConditions: string[] | undefined;
    const effect = buildEffectFromDefinition(animDef);
    const effectTargetsSeparateElement =
      animDef.trigger === 'mouse' || (animDef.triggerId !== undefined && animDef.triggerId !== nodeId);
    if (effectTargetsSeparateElement) (effect as Record<string, unknown>).key = nodeId;
    const interactionEffects: (Effect & { interactionId?: string })[] = [effect];

    if (reducedMotion === 'disable') {
      conditions['no-reduced-motion'] = { type: 'media', predicate: '(prefers-reduced-motion: no-preference)' };
      interactionConditions = ['no-reduced-motion'];
    } else if (reducedMotion && typeof reducedMotion === 'object' && reducedMotion.alternative) {
      conditions['no-reduced-motion'] = { type: 'media', predicate: '(prefers-reduced-motion: no-preference)' };
      conditions['reduced-motion'] = { type: 'media', predicate: '(prefers-reduced-motion: reduce)' };
      (effect as Record<string, unknown>).conditions = ['no-reduced-motion'];
      const altEffect = buildEffectFromDefinition({ ...animDef, effect: reducedMotion.alternative as AnimationDefinition['effect'] });
      if (effectTargetsSeparateElement) (altEffect as Record<string, unknown>).key = nodeId;
      (altEffect as Record<string, unknown>).conditions = ['reduced-motion'];
      interactionEffects.push(altEffect);
    }

    const interaction: Interaction = { key: triggerKey, trigger: TRIGGER_MAP[animDef.trigger], effects: interactionEffects, ...(interactionConditions ? { conditions: interactionConditions } : {}) };
    if (animDef.trigger === 'entrance') {
      const entranceDef = animDef as EntranceAnimationDefinition;
      interaction.params = {
        ...(entranceDef.threshold !== undefined ? { threshold: entranceDef.threshold } : {}),
        ...(entranceDef.inset ? { inset: entranceDef.inset } : {}),
      };
    }
    else if (animDef.trigger === 'ongoing') {
      const ongoingInset = (animDef as import('./types').OngoingAnimationDefinition).inset;
      interaction.params = { threshold: 0, ...(ongoingInset ? { inset: ongoingInset } : {}) };
    } else if (animDef.trigger === 'mouse') {
      const mouseDef = animDef as MouseAnimationDefinition;
      const hitArea = mouseDef.hitArea ?? 'self';
      interaction.params = {
        hitArea,
        ...(mouseDef.mouseAxis ? { axis: mouseDef.mouseAxis } : {}),
      };
    }
    interactions.push(interaction);
  }

  return { effects, interactions, ...(Object.keys(conditions).length > 0 ? { conditions } : {}) };
}

export function collectDocumentInteractKeys(doc: DocumentModel): Set<NodeId> {
  return collectInteractKeysFromConfig(buildDocumentInteractConfig(doc));
}

// ── Internal: build AnimationDefinition variant ─────────────────────────────

function buildDefinition(
  trigger: AnimationTriggerType,
  parts: { effect: AnimationDefinition['effect']; timing?: AnimationTimingOptions | OngoingTimingOptions; triggerId?: NodeId; outAction?: HoverOutAction; reducedMotion?: ReducedMotionResponse; requiresSticky?: boolean },
): AnimationDefinition {
  const base: Record<string, unknown> = { trigger, effect: parts.effect };
  if (parts.triggerId) base.triggerId = parts.triggerId;
  if (parts.reducedMotion) base.reducedMotion = parts.reducedMotion;
  if (parts.requiresSticky) base.requiresSticky = parts.requiresSticky;
  if (isHoverLikeTrigger(trigger) && parts.outAction) base.outAction = parts.outAction;
  if (parts.timing && trigger !== 'scroll' && trigger !== 'mouse') base.timing = parts.timing;
  return base as AnimationDefinition;
}
