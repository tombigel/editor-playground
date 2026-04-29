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
  getDefaultHoverOutActionForEffect,
  buildDocumentInteractConfig,
  collectDocumentInteractKeys,
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
  MouseHitArea,
  HoverOutAction,
  EntranceType,
  ClickType,
  FillMode,
  ScrubTransitionEasing,
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
  createInteractDebugApi,
  ensureInteractRuntimeReady,
  filterInteractConfig,
  buildPreviewConfig,
  preloadMotionPresets,
} from '../animations/animationRuntime';

export {
  INTERACT_ROOT_KEY,
  INTERACT_CDN_VERSION,
  MOTION_PRESETS_CDN_VERSION,
  INTERACT_CDN_URL,
  MOTION_PRESETS_CDN_URL,
  buildInteractDiagnostics,
  buildInteractExportScript,
  collectDomInteractKeys,
  collectInteractKeysFromConfig,
} from '../animations/interactIntegration';

export type {
  InteractDiagnostics,
} from '../animations/interactIntegration';

export type {
  AnimationInvokeAction,
  AnimationPreviewHandle,
} from '../animations/types';

export {
  hasAnimation,
  getAnimationSummary,
  isScrollAnimation,
  requiresStickyForAnimation,
  getScrollRange,
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
