import { LIBRARY_PRESET_TRUTH } from './libraryTruth.generated';

export type PresetMetadata = {
  preset: string;
  label: string;
  description: string;
  category: 'entrance' | 'ongoing' | 'scroll' | 'mouse';
};

const DESCRIPTION_OVERRIDES: Record<string, string> = {
  FadeIn: 'Element fades in from transparent to fully visible.',
  ArcIn: 'Element swings in along a curved arc path.',
  BlurIn: 'Element comes into focus from a blurred state.',
  BounceIn: 'Element bounces into view with an elastic overshoot.',
  CurveIn: 'Element enters along a smooth curved trajectory.',
  DropIn: 'Element drops into place from above.',
  ExpandIn: 'Element grows from a small scale to full size.',
  FlipIn: 'Element flips into view along a 3D axis.',
  FloatIn: 'Element drifts gently in from a direction.',
  FoldIn: 'Element unfolds into position from a folded state.',
  GlideIn: 'Element smoothly glides in from off-screen.',
  RevealIn: 'Element is revealed by a wipe from one edge.',
  ShapeIn: 'Element appears through an expanding geometric mask.',
  ShuttersIn: 'Element opens in like window shutters or blinds.',
  SlideIn: 'Element slides in from a chosen direction.',
  SpinIn: 'Element spins in while scaling up into view.',
  TiltIn: 'Element tilts in from a side with a 3D perspective.',
  TurnIn: 'Element pivots into place from a corner angle.',
  WinkIn: 'Element flicks open like a wink from a flat state.',
  Bounce: 'Element bounces up and down in a continuous loop.',
  Breathe: 'Element gently expands and contracts like breathing.',
  Cross: 'Element moves back and forth along a diagonal path.',
  Flash: 'Element flashes by rapidly toggling its opacity.',
  Flip: 'Element continuously flips along a chosen axis.',
  Fold: 'Element repeatedly folds and unfolds along an edge.',
  Jello: 'Element wobbles with a jelly-like skew oscillation.',
  Poke: 'Element nudges repeatedly in a direction.',
  Pulse: 'Element pulses in scale with a steady rhythm.',
  Rubber: 'Element stretches and snaps back like a rubber band.',
  Spin: 'Element rotates continuously in a chosen direction.',
  Swing: 'Element swings back and forth from its anchor point.',
  Wiggle: 'Element wiggles with a quick rotational shake.',
  ArcScroll: 'Element arcs along a curved path as the page scrolls.',
  BlurScroll: 'Element transitions between blurred and sharp as you scroll.',
  FadeScroll: 'Element fades in or out as it moves through the viewport.',
  FlipScroll: 'Element flips on a 3D axis driven by scroll position.',
  GrowScroll: 'Element scales up from small to full size as you scroll.',
  MoveScroll: 'Element translates along an angle tied to scroll progress.',
  PanScroll: 'Element pans horizontally relative to vertical scroll.',
  ParallaxScroll: 'Element moves at a different speed than the scroll, creating depth.',
  RevealScroll: 'Element is progressively revealed by a wipe as you scroll.',
  ShapeScroll: 'Element is masked by an expanding geometric shape tied to scroll.',
  ShrinkScroll: 'Element scales down from full size as you scroll.',
  ShuttersScroll: 'Element opens like blinds driven by scroll position.',
  SkewPanScroll: 'Element skews and pans sideways as you scroll.',
  SlideScroll: 'Element slides in from a direction driven by scroll progress.',
  Spin3dScroll: 'Element rotates in 3D space as the page scrolls.',
  SpinScroll: 'Element spins flat as it travels through the viewport.',
  StretchScroll: 'Element stretches along one axis tied to scroll position.',
  TiltScroll: 'Element tilts with parallax depth driven by scroll.',
  TurnScroll: 'Element turns like a page as you scroll through it.',
  AiryMouse: 'Element drifts lightly after the pointer with an airy lag.',
  BlobMouse: 'Element morphs and scales like a blob following the cursor.',
  BlurMouse: 'Element blurs and shifts in response to pointer movement.',
  BounceMouse: 'Element follows the pointer with elastic overshoot.',
  ScaleMouse: 'Element scales up or down based on pointer proximity.',
  SkewMouse: 'Element skews in the direction the pointer is moving.',
  SpinMouse: 'Element rotates in response to pointer position.',
  SwivelMouse: 'Element pivots around a fixed axis tracking the pointer.',
  Tilt3DMouse: 'Element tilts in 3D space following pointer position.',
  Track3DMouse: 'Element translates in 3D depth tracking the cursor.',
  TrackMouse: 'Element follows the pointer position directly.',
};

export const PRESET_METADATA: Record<string, PresetMetadata> = Object.fromEntries(
  Object.values(LIBRARY_PRESET_TRUTH)
    .filter(
      (truth): truth is typeof truth & { uiCategory: PresetMetadata['category'] } =>
        Boolean(truth.uiExposed && truth.uiCategory),
    )
    .map((truth) => [
      truth.preset,
      {
        preset: truth.preset,
        label: truth.label,
        description:
          DESCRIPTION_OVERRIDES[truth.preset] ??
          truth.description ??
          `${truth.label} preset from the audited library truth.`,
        category: truth.uiCategory,
      },
    ]),
);

function splitCamelCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2')
    .replace(/(\d+)([a-zA-Z])/g, '$1 $2');
}

export function getPresetMetadata(preset: string): PresetMetadata | null {
  return PRESET_METADATA[preset] ?? null;
}

export function getPresetLabel(preset: string): string {
  return PRESET_METADATA[preset]?.label ?? splitCamelCase(preset);
}

export type TriggerMetadata = { trigger: string; label: string; description: string };

export const TRIGGER_METADATA: Record<string, TriggerMetadata> = {
  entrance: { trigger: 'entrance', label: 'Entrance', description: 'Plays once when the element enters the viewport' },
  ongoing: { trigger: 'ongoing', label: 'Ongoing', description: 'Loops continuously while the element is visible' },
  scroll: { trigger: 'scroll', label: 'Scroll', description: 'Driven by scroll position through the viewport' },
  click: { trigger: 'click', label: 'Click', description: 'Legacy alias for activate in the playground model' },
  activate: { trigger: 'activate', label: 'Activate', description: 'Triggered by pointer activation and keyboard Enter/Space on a focusable element' },
  hover: { trigger: 'hover', label: 'Hover', description: 'Legacy alias for interest in the playground model' },
  interest: { trigger: 'interest', label: 'Interest', description: 'Triggered by hover and by keyboard focus on a focusable element' },
  mouse: { trigger: 'mouse', label: 'Mouse', description: 'Follows pointer movement relative to the element' },
};

export function getTriggerLabel(trigger: string): string {
  return TRIGGER_METADATA[trigger]?.label ?? splitCamelCase(trigger);
}
