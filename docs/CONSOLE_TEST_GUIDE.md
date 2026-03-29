# Animation API – Console Testing Guide

In dev mode, the playground exposes `window.playgroundAnimationApi` with all animation API functions pre-bound to the current document model.

## Quick Start

```js
// 1. Browse available presets
playgroundAnimationApi.getMotionPresets()

// 2. Grab a node ID from the stage
const nodeId = document.querySelector('[id^="stage-node-"]:not([data-node-type="site"])')?.id.replace('stage-node-', '')
```

## Preset Animations

```js
// FadeIn entrance
let doc = playgroundAnimationApi.setPresetAnimation(nodeId, { trigger: 'entrance', preset: 'FadeIn' })
playgroundAnimationApi.applyDocument(doc)

// SlideIn with direction option
doc = playgroundAnimationApi.setPresetAnimation(nodeId, { trigger: 'entrance', preset: 'SlideIn', options: { direction: 'left' } })
playgroundAnimationApi.applyDocument(doc)

// Scroll animation
doc = playgroundAnimationApi.setPresetAnimation(nodeId, { trigger: 'scroll', preset: 'FadeScroll' })
playgroundAnimationApi.applyDocument(doc)

// Interest animation that reverses on leave/focus-out
doc = playgroundAnimationApi.setPresetAnimation(nodeId, { trigger: 'interest', preset: 'Bounce', outAction: 'reverse' })
playgroundAnimationApi.applyDocument(doc)

// Hover alias for the same underlying trigger family
doc = playgroundAnimationApi.setPresetAnimation(nodeId, { trigger: 'hover', preset: 'Bounce', outAction: 'reverse' })
playgroundAnimationApi.applyDocument(doc)

// Activate animation (click alias canonicalizes to activate in Interact)
doc = playgroundAnimationApi.setPresetAnimation(nodeId, { trigger: 'activate', preset: 'Pulse' })
playgroundAnimationApi.applyDocument(doc)

// Hover/interest animation that keeps its state on leave
doc = playgroundAnimationApi.setPresetAnimation(nodeId, { trigger: 'interest', preset: 'SlideIn', outAction: 'keep' })
playgroundAnimationApi.applyDocument(doc)
```

## Custom Keyframe Animation

```js
doc = playgroundAnimationApi.setKeyframeAnimation(nodeId, {
  trigger: 'entrance',
  name: 'myPulse',
  keyframes: [
    { offset: 0, opacity: 0, transform: 'scale(0.8)' },
    { offset: 0.5, opacity: 1, transform: 'scale(1.1)' },
    { offset: 1, opacity: 1, transform: 'scale(1)' },
  ],
  duration: 800,
})
playgroundAnimationApi.applyDocument(doc)
```

## Inspection

```js
// Check animation on a node
playgroundAnimationApi.getNodeAnimation(nodeId)

// List all animated node IDs
playgroundAnimationApi.getAnimatedNodes()

// Build the full @wix/interact config (same as site export)
playgroundAnimationApi.buildDocumentInteractConfig()

// Get params for a specific preset
playgroundAnimationApi.getPresetParams('SpinIn')
```

## Cleanup

```js
doc = playgroundAnimationApi.clearAnimation(nodeId)
playgroundAnimationApi.applyDocument(doc)
```

## Notes

- Every mutation (`setPresetAnimation`, `setKeyframeAnimation`, `clearAnimation`, etc.) returns a **new document model**. You must call `applyDocument(doc)` to push it into the editor state.
- Animations update the **model only** — they won't visually play in the editor stage. They render when you export the site HTML, which embeds `@wix/interact` with the config from `buildDocumentInteractConfig()`.
- `playgroundAnimationApi` is only available when the dev server is running (`import.meta.env.DEV`).
