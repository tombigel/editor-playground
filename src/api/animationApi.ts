/**
 * @module animationApi
 *
 * Pass-through re-exports from the animations subsystem.
 * Covers preset/keyframe animation CRUD, preset catalog,
 * interact config building, and document-level a11y settings.
 */

export {
  INTERACT_VERSION,
  SCROLL_DEFAULT_RANGE_START,
  SCROLL_DEFAULT_RANGE_END,
  NAMED_EASINGS,
  setPresetAnimation,
  setKeyframeAnimation,
  updateAnimationOptions,
  clearAnimation,
  setDocumentAnimationSettings,
  setNodeAnimation,
  getNodeAnimation,
  getAnimatedNodes,
  getMotionPresets,
  getPresetCategory,
  getPresetsForTrigger,
  getPresetParams,
  buildDocumentInteractConfig,
} from '../animations/animationApi';

export type {
  AnimationTriggerType,
  AnimationDefinition,
  EntranceAnimationDefinition,
  OngoingAnimationDefinition,
  ScrollAnimationDefinition,
  MouseAnimationDefinition,
  ClickAnimationDefinition,
  HoverAnimationDefinition,
  HoverOutAction,
  AnimationTimingOptions,
  OngoingTimingOptions,
  NamedEntranceEffect,
  NamedOngoingEffect,
  NamedScrollEffect,
  NamedMouseEffect,
  NamedAnimationEffect,
  KeyframeAnimationEffect,
  ReducedMotionResponse,
  DocumentAnimationA11y,
  DocumentAnimationSettings,
  PresetParam,
  PresetParamType,
  PresetParamSchema,
  PresetInfo,
  InteractConfig,
} from '../animations/types';

export {
  createAnimationPreview,
  filterInteractConfig,
  buildPreviewConfig,
  preloadMotionPresets,
} from '../animations/animationRuntime';

export type {
  AnimationInvokeAction,
  AnimationPreviewHandle,
} from '../animations/types';

export {
  hasAnimation,
  getAnimationSummary,
  isScrollAnimation,
  requiresStickyForAnimation,
  getAnimatedNodeIds,
} from '../animations/selectors';

export {
  PRESET_METADATA,
  TRIGGER_METADATA,
  getPresetMetadata,
  getPresetLabel,
  getTriggerLabel,
} from '../animations/presetMetadata';

export type {
  PresetMetadata,
  TriggerMetadata,
} from '../animations/presetMetadata';
