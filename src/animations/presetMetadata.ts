// ── Preset metadata ───────────────────────────────────────────────────────────
// Human-readable labels and descriptions for all animation presets and triggers.

export type PresetMetadata = {
  preset: string;
  label: string;
  description: string;
  category: 'entrance' | 'ongoing' | 'scroll' | 'mouse';
};

export const PRESET_METADATA: Record<string, PresetMetadata> = {
  // ── Entrance ────────────────────────────────────────────────────────────────
  FadeIn: { preset: 'FadeIn', label: 'Fade In', description: 'Element fades in from transparent to fully visible.', category: 'entrance' },
  ArcIn: { preset: 'ArcIn', label: 'Arc In', description: 'Element swings in along a curved arc path.', category: 'entrance' },
  BlurIn: { preset: 'BlurIn', label: 'Blur In', description: 'Element comes into focus from a blurred state.', category: 'entrance' },
  BounceIn: { preset: 'BounceIn', label: 'Bounce In', description: 'Element bounces into view with an elastic overshoot.', category: 'entrance' },
  CurveIn: { preset: 'CurveIn', label: 'Curve In', description: 'Element enters along a smooth curved trajectory.', category: 'entrance' },
  DropIn: { preset: 'DropIn', label: 'Drop In', description: 'Element drops into place from above.', category: 'entrance' },
  ExpandIn: { preset: 'ExpandIn', label: 'Expand In', description: 'Element grows from a small scale to full size.', category: 'entrance' },
  FlipIn: { preset: 'FlipIn', label: 'Flip In', description: 'Element flips into view along a 3D axis.', category: 'entrance' },
  FloatIn: { preset: 'FloatIn', label: 'Float In', description: 'Element drifts gently in from a direction.', category: 'entrance' },
  FoldIn: { preset: 'FoldIn', label: 'Fold In', description: 'Element unfolds into position from a folded state.', category: 'entrance' },
  GlideIn: { preset: 'GlideIn', label: 'Glide In', description: 'Element smoothly glides in from off-screen.', category: 'entrance' },
  RevealIn: { preset: 'RevealIn', label: 'Reveal In', description: 'Element is revealed by a wipe from one edge.', category: 'entrance' },
  ShapeIn: { preset: 'ShapeIn', label: 'Shape In', description: 'Element appears through an expanding geometric mask.', category: 'entrance' },
  ShuttersIn: { preset: 'ShuttersIn', label: 'Shutters In', description: 'Element opens in like window shutters or blinds.', category: 'entrance' },
  SlideIn: { preset: 'SlideIn', label: 'Slide In', description: 'Element slides in from a chosen direction.', category: 'entrance' },
  SpinIn: { preset: 'SpinIn', label: 'Spin In', description: 'Element spins in while scaling up into view.', category: 'entrance' },
  TiltIn: { preset: 'TiltIn', label: 'Tilt In', description: 'Element tilts in from a side with a 3D perspective.', category: 'entrance' },
  TurnIn: { preset: 'TurnIn', label: 'Turn In', description: 'Element pivots into place from a corner angle.', category: 'entrance' },
  WinkIn: { preset: 'WinkIn', label: 'Wink In', description: 'Element flicks open like a wink from a flat state.', category: 'entrance' },

  // ── Ongoing ──────────────────────────────────────────────────────────────────
  Bounce: { preset: 'Bounce', label: 'Bounce', description: 'Element bounces up and down in a continuous loop.', category: 'ongoing' },
  Breathe: { preset: 'Breathe', label: 'Breathe', description: 'Element gently expands and contracts like breathing.', category: 'ongoing' },
  Cross: { preset: 'Cross', label: 'Cross', description: 'Element moves back and forth along a diagonal path.', category: 'ongoing' },
  DVD: { preset: 'DVD', label: 'DVD', description: 'Element bounces around the container like a DVD screensaver.', category: 'ongoing' },
  Flash: { preset: 'Flash', label: 'Flash', description: 'Element flashes by rapidly toggling its opacity.', category: 'ongoing' },
  Flip: { preset: 'Flip', label: 'Flip', description: 'Element continuously flips along a chosen axis.', category: 'ongoing' },
  Fold: { preset: 'Fold', label: 'Fold', description: 'Element repeatedly folds and unfolds along an edge.', category: 'ongoing' },
  Jello: { preset: 'Jello', label: 'Jello', description: 'Element wobbles with a jelly-like skew oscillation.', category: 'ongoing' },
  Poke: { preset: 'Poke', label: 'Poke', description: 'Element nudges repeatedly in a direction.', category: 'ongoing' },
  Pulse: { preset: 'Pulse', label: 'Pulse', description: 'Element pulses in scale with a steady rhythm.', category: 'ongoing' },
  Rubber: { preset: 'Rubber', label: 'Rubber', description: 'Element stretches and snaps back like a rubber band.', category: 'ongoing' },
  Spin: { preset: 'Spin', label: 'Spin', description: 'Element rotates continuously in a chosen direction.', category: 'ongoing' },
  Swing: { preset: 'Swing', label: 'Swing', description: 'Element swings back and forth from its anchor point.', category: 'ongoing' },
  Wiggle: { preset: 'Wiggle', label: 'Wiggle', description: 'Element wiggles with a quick rotational shake.', category: 'ongoing' },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  ArcScroll: { preset: 'ArcScroll', label: 'Arc Scroll', description: 'Element arcs along a curved path as the page scrolls.', category: 'scroll' },
  BlurScroll: { preset: 'BlurScroll', label: 'Blur Scroll', description: 'Element transitions between blurred and sharp as you scroll.', category: 'scroll' },
  FadeScroll: { preset: 'FadeScroll', label: 'Fade Scroll', description: 'Element fades in or out as it moves through the viewport.', category: 'scroll' },
  FlipScroll: { preset: 'FlipScroll', label: 'Flip Scroll', description: 'Element flips on a 3D axis driven by scroll position.', category: 'scroll' },
  GrowScroll: { preset: 'GrowScroll', label: 'Grow Scroll', description: 'Element scales up from small to full size as you scroll.', category: 'scroll' },
  MoveScroll: { preset: 'MoveScroll', label: 'Move Scroll', description: 'Element translates along an angle tied to scroll progress.', category: 'scroll' },
  PanScroll: { preset: 'PanScroll', label: 'Pan Scroll', description: 'Element pans horizontally relative to vertical scroll.', category: 'scroll' },
  ParallaxScroll: { preset: 'ParallaxScroll', label: 'Parallax Scroll', description: 'Element moves at a different speed than the scroll, creating depth.', category: 'scroll' },
  RevealScroll: { preset: 'RevealScroll', label: 'Reveal Scroll', description: 'Element is progressively revealed by a wipe as you scroll.', category: 'scroll' },
  ShapeScroll: { preset: 'ShapeScroll', label: 'Shape Scroll', description: 'Element is masked by an expanding geometric shape tied to scroll.', category: 'scroll' },
  ShrinkScroll: { preset: 'ShrinkScroll', label: 'Shrink Scroll', description: 'Element scales down from full size as you scroll.', category: 'scroll' },
  ShuttersScroll: { preset: 'ShuttersScroll', label: 'Shutters Scroll', description: 'Element opens like blinds driven by scroll position.', category: 'scroll' },
  SkewPanScroll: { preset: 'SkewPanScroll', label: 'Skew Pan Scroll', description: 'Element skews and pans sideways as you scroll.', category: 'scroll' },
  SlideScroll: { preset: 'SlideScroll', label: 'Slide Scroll', description: 'Element slides in from a direction driven by scroll progress.', category: 'scroll' },
  Spin3dScroll: { preset: 'Spin3dScroll', label: 'Spin 3D Scroll', description: 'Element rotates in 3D space as the page scrolls.', category: 'scroll' },
  SpinScroll: { preset: 'SpinScroll', label: 'Spin Scroll', description: 'Element spins flat as it travels through the viewport.', category: 'scroll' },
  StretchScroll: { preset: 'StretchScroll', label: 'Stretch Scroll', description: 'Element stretches along one axis tied to scroll position.', category: 'scroll' },
  TiltScroll: { preset: 'TiltScroll', label: 'Tilt Scroll', description: 'Element tilts with parallax depth driven by scroll.', category: 'scroll' },
  TurnScroll: { preset: 'TurnScroll', label: 'Turn Scroll', description: 'Element turns like a page as you scroll through it.', category: 'scroll' },

  // ── Mouse ────────────────────────────────────────────────────────────────────
  AiryMouse: { preset: 'AiryMouse', label: 'Airy Mouse', description: 'Element drifts lightly after the pointer with an airy lag.', category: 'mouse' },
  BlobMouse: { preset: 'BlobMouse', label: 'Blob Mouse', description: 'Element morphs and scales like a blob following the cursor.', category: 'mouse' },
  BlurMouse: { preset: 'BlurMouse', label: 'Blur Mouse', description: 'Element blurs and shifts in response to pointer movement.', category: 'mouse' },
  BounceMouse: { preset: 'BounceMouse', label: 'Bounce Mouse', description: 'Element bounces elastically toward the pointer position.', category: 'mouse' },
  CustomMouse: { preset: 'CustomMouse', label: 'Custom Mouse', description: 'Custom pointer-driven animation with user-defined parameters.', category: 'mouse' },
  ScaleMouse: { preset: 'ScaleMouse', label: 'Scale Mouse', description: 'Element scales up or down based on pointer proximity.', category: 'mouse' },
  SkewMouse: { preset: 'SkewMouse', label: 'Skew Mouse', description: 'Element skews in the direction the pointer is moving.', category: 'mouse' },
  SpinMouse: { preset: 'SpinMouse', label: 'Spin Mouse', description: 'Element rotates as the pointer moves across it.', category: 'mouse' },
  SwivelMouse: { preset: 'SwivelMouse', label: 'Swivel Mouse', description: 'Element pivots around a fixed axis tracking the pointer.', category: 'mouse' },
  Tilt3DMouse: { preset: 'Tilt3DMouse', label: 'Tilt 3D Mouse', description: 'Element tilts in 3D space following pointer position.', category: 'mouse' },
  Track3DMouse: { preset: 'Track3DMouse', label: 'Track 3D Mouse', description: 'Element translates in 3D depth tracking the cursor.', category: 'mouse' },
  TrackMouse: { preset: 'TrackMouse', label: 'Track Mouse', description: 'Element follows the pointer position directly.', category: 'mouse' },
};

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

// ── Trigger metadata ──────────────────────────────────────────────────────────

export type TriggerMetadata = {
  trigger: string;
  label: string;
  description: string;
};

export const TRIGGER_METADATA: Record<string, TriggerMetadata> = {
  entrance: { trigger: 'entrance', label: 'Entrance', description: 'Plays once when the element enters the viewport' },
  ongoing: { trigger: 'ongoing', label: 'Ongoing', description: 'Loops continuously while the element is visible' },
  scroll: { trigger: 'scroll', label: 'Scroll', description: 'Driven by scroll position through the viewport' },
  click: { trigger: 'click', label: 'Click', description: 'Triggered by clicking or activating the element' },
  hover: { trigger: 'hover', label: 'Hover', description: 'Triggered by hovering over or focusing the element' },
  mouse: { trigger: 'mouse', label: 'Mouse', description: 'Follows pointer movement relative to the element' },
};

export function getTriggerLabel(trigger: string): string {
  return TRIGGER_METADATA[trigger]?.label ?? splitCamelCase(trigger);
}
