# Console Testing Guide - Animations and Rich Text

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

## Interact Runtime Debugging

```js
// Compare the current Interact config keys with the live DOM registrations
playgroundAnimationApi.interactDebug.diagnostics()

// List live data-interact-key attributes
playgroundAnimationApi.interactDebug.keys()

// Inspect registered Interact controllers
playgroundAnimationApi.interactDebug.controllers()
playgroundAnimationApi.interactDebug.getController(nodeId)
playgroundAnimationApi.interactDebug.activeEffects(nodeId)

// Toggle state effects when an effectId is present
playgroundAnimationApi.interactDebug.toggleEffect(nodeId, 'selected', 'toggle')

// Control currently active Web Animations under one key, or all keys when omitted
playgroundAnimationApi.interactDebug.pause(nodeId)
playgroundAnimationApi.interactDebug.play(nodeId)
playgroundAnimationApi.interactDebug.replay(nodeId)
playgroundAnimationApi.interactDebug.reset(nodeId)
playgroundAnimationApi.interactDebug.stop()
```

## Cleanup

```js
doc = playgroundAnimationApi.clearAnimation(nodeId)
playgroundAnimationApi.applyDocument(doc)
```

## Rich Text Nodes

`playgroundDocApi` (DEV only) exposes `getDocument()`, `getNode(id)`, and `applyDocument(doc)`
for general document manipulation.

### Insert a rich text node

```js
// 1. Pick a section to attach the node to
const sectionId = document.querySelector('[data-node-type="section"]')
  ?.id.replace('stage-node-', '')
  ?? Object.values(playgroundDocApi.getDocument().nodes)
       .find(n => n.contentType === 'container' && n.subtype === 'section')?.id

// 2. Build a rich text node with marks
const richNode = {
  id: 'rich_test_1',
  contentType: 'text',
  subtype: 'rich',
  parentId: sectionId,
  children: [],
  name: 'Rich Test',
  visible: true,
  locked: false,
  rect: {
    x: { base: { raw: '40px', parsed: { value: 40, unit: 'px' } } },
    y: { base: { raw: '40px', parsed: { value: 40, unit: 'px' } } },
    width: { base: { raw: 'fit-content', parsed: { keyword: 'fit-content' } } },
    height: { base: { raw: 'auto', parsed: { keyword: 'auto' } } },
  },
  content: [
    { text: 'Hello ' },
    { text: 'bold', bold: true },
    { text: ' and ' },
    { text: 'red', color: '#e53e3e' },
    { text: ' world.' },
  ],
}

let doc = playgroundDocApi.getDocument()
const section = doc.nodes[sectionId]
doc = {
  ...doc,
  nodes: {
    ...doc.nodes,
    [richNode.id]: richNode,
    [sectionId]: { ...section, children: [...section.children, richNode.id] },
  },
}
playgroundDocApi.applyDocument(doc)
```

### Convert an existing text node to rich text

```js
// 1. Find a block text node on the stage (or pick one by name)
doc = playgroundDocApi.getDocument()
const blockNode = Object.values(doc.nodes).find(
  n => n.contentType === 'text' && n.subtype === 'block' && !n.link
)

// 2. Convert it in place — swap subtype and rewrite content as RichContent
const richVersion = {
  ...blockNode,
  subtype: 'rich',
  content: [
    { text: blockNode.content },  // wrap the existing string as a plain leaf
  ],
}
playgroundDocApi.applyDocument({ ...doc, nodes: { ...doc.nodes, [richVersion.id]: richVersion } })

// 3. Now add marks to parts of the text
doc = playgroundDocApi.getDocument()
const updated = { ...doc.nodes[richVersion.id] }
updated.content = [
  { text: 'Hello ', color: '#718096' },
  { text: blockNode.content, bold: true },
]
playgroundDocApi.applyDocument({ ...doc, nodes: { ...doc.nodes, [updated.id]: updated } })
```

### Add an inline link

```js
// Mutate the existing node's content (get fresh doc reference first)
doc = playgroundDocApi.getDocument()
const node = { ...doc.nodes['rich_test_1'] }
node.content = [
  { text: 'Visit ' },
  {
    type: 'link',
    linkType: 'external',
    href: 'https://example.com',
    openInNewTab: true,
    children: [{ text: 'example.com' }],
  },
  { text: ' for more.' },
]
playgroundDocApi.applyDocument({ ...doc, nodes: { ...doc.nodes, [node.id]: node } })
```

### Inspect the rendered output

After inserting, the node renders inline in the site view. Switch to **Preview** tab to see
the final HTML with `<span>` marks and `<a>` links applied.

## Notes

- Every mutation (`setPresetAnimation`, `setKeyframeAnimation`, `clearAnimation`, etc.) returns a **new document model**. You must call `applyDocument(doc)` to push it into the editor state.
- Animations update the **model only**. They play in the editor stage only when animation preview is enabled, and they render in site preview/export with the same config from `buildDocumentInteractConfig()`.
- `playgroundAnimationApi` is only available when the dev server is running (`import.meta.env.DEV`).
