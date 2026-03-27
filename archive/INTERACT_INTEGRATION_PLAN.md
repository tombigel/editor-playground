# Plan: @wix/interact Integration — Phase 1

## Context

Integrating `@wix/interact` to add entrance, click, hover, scroll, and mouse-driven animations to exported sites. Phase 1 is backend-only: data model, API layer, site export infrastructure, tests, and dev console access. No editor UI changes.

The library is `@wix/interact@2.1.4` with `@wix/motion-presets` as the preset catalog. Presets are discriminated union types keyed on a `type` field.

The interact config IS the data layer — we store preset configs and keyframe effects directly on document nodes.

---

## Preset Catalog (from @wix/motion-presets)

### Entrance (19) — `entrance` trigger; also allowed on `click`/`hover`
`FadeIn`, `ArcIn`, `BlurIn`, `BounceIn`, `CurveIn`, `DropIn`, `ExpandIn`, `FlipIn`, `FloatIn`, `FoldIn`, `GlideIn`, `RevealIn`, `ShapeIn`, `ShuttersIn`, `SlideIn`, `SpinIn`, `TiltIn`, `TurnIn`, `WinkIn`

### Ongoing (14) — `ongoing` trigger (page load); also allowed on `click`/`hover`
`Bounce`, `Breathe`, `Cross`, `DVD`, `Flash`, `Flip`, `Fold`, `Jello`, `Poke`, `Pulse`, `Rubber`, `Spin`, `Swing`, `Wiggle`

Ongoing animations are continuous loops that start on page load. Implemented as a `viewEnter` trigger — optionally with a small negative threshold so the animation starts just before the element enters the viewport (optimization).

### Scroll (19) — `scroll` trigger only
`ArcScroll`, `BlurScroll`, `FadeScroll`, `FlipScroll`, `GrowScroll`, `MoveScroll`, `PanScroll`, `ParallaxScroll`, `RevealScroll`, `ShapeScroll`, `ShrinkScroll`, `ShuttersScroll`, `SkewPanScroll`, `SlideScroll`, `Spin3dScroll`, `SpinScroll`, `StretchScroll`, `TiltScroll`, `TurnScroll`

Background scroll presets (`BgCloseUp`, `BgParallax`, etc.) — **skipped for Phase 1**.

### Mouse (12) — `mouse` trigger only
`AiryMouse`, `BlobMouse`, `BlurMouse`, `BounceMouse`, `CustomMouse`, `ScaleMouse`, `SkewMouse`, `SpinMouse`, `SwivelMouse`, `Tilt3DMouse`, `Track3DMouse`, `TrackMouse`

---

## Trigger rules summary

| Trigger | Allowed named presets | Keyframe | Interact mapping |
|---|---|---|---|
| `entrance` | `EntranceAnimation` | yes | `viewEnter` |
| `ongoing` | `OngoingAnimation` | yes | `viewEnter` (with optional negative threshold) |
| `scroll` | `ScrollAnimation` | yes | `viewProgress` |
| `mouse` | `MouseAnimation` | yes | `pointerMove`; trigger ≠ target common |
| `click` | `EntranceAnimation \| OngoingAnimation` | yes | `click` |
| `hover` | `EntranceAnimation \| OngoingAnimation` | yes | `hover`; entrance reverses on out; ongoing stop/keep |

**Keyframe effects:** not restricted by trigger type — any trigger can accept any keyframe effect.

---

## Design decisions

### Single animation per node
Each node holds **at most one** `AnimationDefinition` (`animation?: AnimationDefinition`, singular). Multiple animations per node are out of scope for Phase 1.

### Trigger/target separation
`AnimationDefinition` carries an optional `triggerId?: NodeId`. When set, the user interacts with the trigger node but the animation plays on the node that owns the definition. This models mouse-follow effects (the mouse zone is the trigger, a distant element is the target) as well as click/hover affordances on one element that animate another.

Both the trigger node and the target node get `data-interact-key` attributes in the site export. The config builder is responsible for wiring the interact config correctly once the `@wix/interact` cross-element trigger API is confirmed.

### Hover behavior
Hover with an **entrance** preset: plays forward on hover-in, reverses (alternate direction) on hover-out — this is handled by `@wix/interact`'s alternate mode. No extra data needed; the config builder sets it.

Hover with an **ongoing** preset: plays on hover-in, stops on hover-out. The `ongoingOnOut` field controls whether the animation resets (`'reset'`) or stays at its current state (`'keep'` = fill forward).

Hover with a **keyframe** effect: treated like entrance (alternate on out), unless `ongoingOnOut` is explicitly set.

---

## Architecture Summary

```
src/animations/
  types/index.ts                      ← new: all animation types
  animationApi.ts                     ← new: pure DocumentModel → DocumentModel functions
  tests/
    animationApi.test.ts              ← new: unit tests
    siteExportAnimations.test.ts      ← new: integration tests

src/api/
  animationApi.ts                     ← new: pass-through barrel (mirrors fontApi.ts)

src/model/types/index.ts              ← extend: add animation field + animationSettings to DocumentModel

src/site/SiteRenderer.tsx             ← extend: add data-interact-key to animated nodes
src/site/siteExport.tsx               ← extend: inject interact script + config init script

src/app/useAppRuntime.ts              ← extend: dev-only window.playgroundAnimationApi exposure

docs/PLAYGROUND_SPEC.md               ← extend: animation model section
```

---

## Step 1: Install packages

```
npm install @wix/interact @wix/motion-presets
```

---

## Step 2: `src/animations/types/index.ts` (new)

```typescript
import type {
  EntranceAnimation,
  OngoingAnimation,
  ScrollAnimation,
  MouseAnimation,
} from '@wix/motion-presets';
import type { NodeId } from '../../model/types';

// ── Triggers ──────────────────────────────────────────────────────────────────

export type AnimationTriggerType = 'entrance' | 'ongoing' | 'scroll' | 'click' | 'hover' | 'mouse';

// ── Named effect wrappers (category-typed) ────────────────────────────────────

// The `kind` discriminant is ours; the rest of the shape comes verbatim from
// @wix/motion-presets discriminated union types.

export type NamedEntranceEffect   = { kind: 'named' } & EntranceAnimation;
export type NamedOngoingEffect    = { kind: 'named' } & OngoingAnimation;
export type NamedScrollEffect     = { kind: 'named' } & ScrollAnimation;  // BackgroundScrollAnimation excluded from Phase 1
export type NamedMouseEffect      = { kind: 'named' } & MouseAnimation;
export type NamedAnimationEffect  = NamedEntranceEffect | NamedOngoingEffect | NamedScrollEffect | NamedMouseEffect;

// ── Keyframe effect (WAAPI-style, unrestricted by trigger type) ───────────────

export type KeyframeAnimationEffect = {
  kind: 'keyframe';
  name: string;        // user-defined label
  keyframes: Array<{
    offset: number;    // 0–1
    easing?: string;
    [cssProperty: string]: unknown;
  }>;
  duration?: number;   // ms
  easing?: string;
};

// ── Per-trigger AnimationDefinition variants ──────────────────────────────────
// Each variant restricts which named effects are allowed while keyframe is
// always permitted. Discriminated on `trigger`.

export type EntranceAnimationDefinition = {
  trigger: 'entrance';
  triggerId?: NodeId;
  effect: NamedEntranceEffect | KeyframeAnimationEffect;
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
  triggerId?: NodeId;   // the mouse-zone element; if absent, node itself is the zone
  effect: NamedMouseEffect | KeyframeAnimationEffect;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

// Ongoing animations loop continuously, starting on page load.
// Interact mapping: viewEnter with optional negative threshold (pre-entry optimization).
export type OngoingAnimationDefinition = {
  trigger: 'ongoing';
  triggerId?: NodeId;
  effect: NamedOngoingEffect | KeyframeAnimationEffect;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

export type ClickAnimationDefinition = {
  trigger: 'click';
  triggerId?: NodeId;
  effect: NamedEntranceEffect | NamedOngoingEffect | KeyframeAnimationEffect;
  reducedMotion?: ReducedMotionResponse;
  requiresSticky?: boolean;
};

// Hover-specific: entrance preset reverses on hover-out (interact alternate mode).
// Ongoing preset stops on out; ongoingOnOut controls fill behavior.
// Keyframe behaves like entrance (alternate) unless ongoingOnOut is set.
export type HoverAnimationDefinition = {
  trigger: 'hover';
  triggerId?: NodeId;
  effect: NamedEntranceEffect | NamedOngoingEffect | KeyframeAnimationEffect;
  ongoingOnOut?: 'reset' | 'keep';   // only meaningful when effect is ongoing/keyframe
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
// Priority chain: global → perTrigger → per-animation (first match wins)

export type ReducedMotionResponse =
  | 'disable'
  | { alternative: NamedAnimationEffect | KeyframeAnimationEffect };

export type PerTriggerReducedMotionSettings = Partial<
  Record<AnimationTriggerType, ReducedMotionResponse>
>;

export type DocumentAnimationA11y = {
  reducedMotion?: ReducedMotionResponse;            // global
  perTrigger?: PerTriggerReducedMotionSettings;
};

export type DocumentAnimationSettings = {
  a11y?: DocumentAnimationA11y;
};
```

---

## Step 3: `src/model/types/index.ts` — model extension

```typescript
import type { AnimationDefinition, DocumentAnimationSettings } from '../animations/types';

export type DocumentModel = {
  rootId: NodeId;
  nodes: Record<NodeId, DocumentNode>;
  fontLibrary: FontLibrary;
  animationSettings?: DocumentAnimationSettings;   // ← new
};
```

Add `animation?: AnimationDefinition` (singular) to: `WrapperNode`, `TextLeaf`, `ImageLeaf`, `LinkLeaf`, `ButtonLeaf`.

`SiteNode` does NOT get animation.

No migration needed — optional field, existing documents load unchanged.

---

## Step 4: `src/animations/animationApi.ts` (new)

All functions are pure `DocumentModel → DocumentModel`. Clone-then-return; return original on no-op.

The API has two layers:
- **High-level** — human-readable, assembles `AnimationDefinition` internally from flat params
- **Low-level** — direct read/write of the raw `AnimationDefinition` stored on the node

### High-level API (preferred)

```typescript
/**
 * Set a named preset animation on a target node.
 *
 * `preset` is the preset name string (e.g. 'SlideIn', 'FadeIn', 'TrackMouse').
 * `options` are the preset-specific parameters (direction, power, range, etc.).
 * The function looks up the preset category, validates it against `trigger`,
 * and assembles the full AnimationDefinition internally.
 *
 * @param target  - node that will be animated
 * @param trigger - what starts the animation
 * @param preset  - preset name from getMotionPresets()
 * @param options - preset parameters (direction, intensity, etc.) — optional
 * @param source  - node the user interacts with; defaults to target when absent
 * @param ongoingOnOut - hover+ongoing fill behavior: 'reset' | 'keep'
 * @param reducedMotion - per-animation a11y override
 * @param requiresSticky - flag that this animation requires sticky to be active
 */
setPresetAnimation(
  doc: DocumentModel,
  target: NodeId,
  params: {
    trigger: AnimationTriggerType;
    preset: string;
    options?: Record<string, unknown>;
    source?: NodeId;
    ongoingOnOut?: 'reset' | 'keep';
    reducedMotion?: ReducedMotionResponse;
    requiresSticky?: boolean;
  }
): DocumentModel

/**
 * Set a custom keyframe animation on a target node.
 *
 * Keyframe animations are not restricted by trigger type.
 *
 * @param name      - user-defined label for this keyframe set
 * @param keyframes - WAAPI-style keyframes array
 */
setKeyframeAnimation(
  doc: DocumentModel,
  target: NodeId,
  params: {
    trigger: AnimationTriggerType;
    name: string;
    keyframes: Array<{ offset: number; easing?: string; [key: string]: unknown }>;
    duration?: number;
    easing?: string;
    source?: NodeId;
    ongoingOnOut?: 'reset' | 'keep';
    reducedMotion?: ReducedMotionResponse;
    requiresSticky?: boolean;
  }
): DocumentModel

/**
 * Update mutable properties of an existing animation without replacing the effect.
 * Throws if the node has no animation.
 */
updateAnimationOptions(
  doc: DocumentModel,
  target: NodeId,
  updates: {
    source?: NodeId;
    ongoingOnOut?: 'reset' | 'keep';
    reducedMotion?: ReducedMotionResponse;
    requiresSticky?: boolean;
  }
): DocumentModel

/**
 * Remove the animation from a node. Returns original if already absent.
 */
clearAnimation(doc: DocumentModel, target: NodeId): DocumentModel

/**
 * Set document-level animation settings (a11y policy).
 */
setDocumentAnimationSettings(
  doc: DocumentModel,
  settings: DocumentAnimationSettings
): DocumentModel
```

### Low-level API (direct data access)

```typescript
/**
 * Set (replace) a full AnimationDefinition on a node. Pass undefined to clear.
 * Use when you already have a built definition or need precise control.
 */
setNodeAnimation(
  doc: DocumentModel,
  nodeId: NodeId,
  def: AnimationDefinition | undefined
): DocumentModel

/**
 * Read the AnimationDefinition stored on a node.
 */
getNodeAnimation(doc: DocumentModel, nodeId: NodeId): AnimationDefinition | undefined

/**
 * Return all node IDs that have an animation definition.
 */
getAnimatedNodes(doc: DocumentModel): NodeId[]
```

### Preset catalog

```typescript
/**
 * Returns all valid preset names grouped by category.
 * Use this to discover available presets and validate `preset` strings.
 */
getMotionPresets(): {
  entrance: string[];   // 19 presets
  ongoing: string[];    // 14 presets
  scroll: string[];     // 19 presets (background scroll excluded Phase 1)
  mouse: string[];      // 12 presets
}

/**
 * Returns the category of a preset, or null if unknown.
 * Used internally by setPresetAnimation to validate trigger/preset compatibility.
 */
getPresetCategory(preset: string): 'entrance' | 'ongoing' | 'scroll' | 'mouse' | null

/**
 * Returns detailed preset info for a given trigger type.
 * Each entry includes the preset name, its category, and its parameter schema.
 * For click/hover triggers, returns both entrance and ongoing presets.
 *
 * Designed for editor UI integration — provides everything needed to render
 * a preset picker with parameter controls.
 */
getPresetsForTrigger(trigger: AnimationTriggerType): PresetInfo[]

/**
 * Returns the parameter schema for a specific preset.
 * Returns null if the preset is unknown.
 *
 * The schema describes each parameter's name, type, default value,
 * and constraints (enum values, min/max for numbers).
 * Derived by inspecting the @wix/motion-presets discriminated union types.
 */
getPresetParams(preset: string): PresetParamSchema | null
```

Supporting types (in `src/animations/types/index.ts`):

```typescript
// ── Preset catalog types (for editor integration) ─────────────────────────────

export type PresetParamType = 'string' | 'number' | 'boolean';

export type PresetParam = {
  name: string;
  type: PresetParamType;
  required: boolean;
  default?: unknown;
  enum?: Array<string | number>;   // allowed values (e.g. direction: 'top' | 'bottom' | 'left' | 'right')
  min?: number;                     // for numeric params
  max?: number;                     // for numeric params
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
```

### Interact config builder

```typescript
/**
 * Build the full @wix/interact config for all animated nodes in the document.
 * Returns { interactions: [] } when no nodes have animations.
 */
buildDocumentInteractConfig(doc: DocumentModel): InteractConfig
```

`InteractConfig` type will be derived from the installed `@wix/interact` package exports. If the package doesn't export a config type directly, define a local type in `src/animations/types/index.ts` matching the shape `{ interactions: Array<{...}> }` based on what `create()` accepts.

### Internal implementation notes

**Preset param schemas — derivation strategy:**
The param schemas are hand-authored lookup tables in `animationApi.ts`, derived from the `@wix/motion-presets` TypeScript types. Each preset's discriminated union member (e.g. `{ type: 'SlideIn'; direction?: 'top' | 'bottom' | 'left' | 'right'; power?: 'soft' | 'medium' | 'hard' }`) is mapped to a `PresetParam[]` array. This is a one-time authoring cost — when new presets are added to the library, the lookup table is extended. The `getPresetParams` function simply indexes into this table.

**`setPresetAnimation` internal flow:**
1. Call `getPresetCategory(preset)` to look up the category
2. Validate that the category is allowed for the `trigger`:
   - `entrance` trigger → `entrance` category only
   - `ongoing` trigger → `ongoing` category only
   - `scroll` trigger → `scroll` category only
   - `mouse` trigger → `mouse` category only
   - `click`/`hover` triggers → `entrance` or `ongoing` category
3. Build `effect = { kind: 'named', type: preset, ...options }`
4. Build the typed `AnimationDefinition` variant matching `trigger`
5. Call `setNodeAnimation(doc, target, def)`
6. Throw on invalid preset/trigger combination (see error handling below)

**`buildDocumentInteractConfig` — trigger mapping:**

| Our trigger | @wix/interact trigger type | Notes |
|---|---|---|
| `entrance` | `viewEnter` | — |
| `ongoing` | `viewEnter` | Optional negative threshold so loop starts pre-entry |
| `scroll` | `viewProgress` | — |
| `click` | `click` | — |
| `hover` | `hover` | — |
| `mouse` | `pointerMove` | — |

**Effect serialization:**
- Named effects: strip `kind`, pass `{ type, ...options }` directly to interact
- Keyframe effects: map to interact's keyframe effect format
- Hover + entrance effect → set interact alternate/reverse mode on hover-out
- Hover + ongoing or `ongoingOnOut` set → configure fill mode (`'keep'` = fill forward, `'reset'` = no fill)

**`source` / `triggerId` handling:** When `source` differs from `target`, both nodes get `data-interact-key` in the export. The config builder links them — exact interact API for cross-element triggers to be confirmed from installed package.

**A11y resolution (first match wins):**
1. `doc.animationSettings?.a11y?.reducedMotion`
2. `doc.animationSettings?.a11y?.perTrigger?.[trigger]`
3. `animationDef.reducedMotion`

### Error handling

The API throws on programming mistakes (bad input that should never happen in correct code). It returns the original document silently only for true idempotent no-ops.

**Throws `Error` with a descriptive message:**
- Node not found: `'Node "${nodeId}" not found in document'`
- Site root: `'Cannot set animation on site root node'`
- Unknown preset (in `setPresetAnimation`): `'Unknown preset "${preset}". Call getMotionPresets() to see available presets.'`
- Invalid preset/trigger combination: `'Preset "${preset}" (${category}) is not compatible with trigger "${trigger}"'`
- `updateAnimationOptions` on a node with no animation: `'Node "${target}" has no animation to update'`

**Silent no-op (returns original document):**
- `clearAnimation` on a node with no animation — idempotent, not an error

**@wix/interact handles at runtime** (not our concern at the data layer):
- DOM elements missing their `data-interact-key`
- Animations failing to play due to CSS conflicts
- Scroll/pointer events not firing

---

## Step 5: `src/api/animationApi.ts` (new pass-through barrel)

Mirrors `src/api/fontApi.ts` — re-exports all functions and types from the animations subsystem. No logic.

Exports: `setPresetAnimation`, `setKeyframeAnimation`, `updateAnimationOptions`, `clearAnimation`, `setNodeAnimation`, `getNodeAnimation`, `getAnimatedNodes`, `setDocumentAnimationSettings`, `getMotionPresets`, `getPresetCategory`, `getPresetsForTrigger`, `getPresetParams`, `buildDocumentInteractConfig`, and all types from `src/animations/types/index.ts`.

---

## Step 6: Site export — `src/site/SiteRenderer.tsx`

Add `data-interact-key={node.id}` to the outermost DOM element of any node where:
- `node.animation !== undefined` (it is a target), OR
- Some other node has `node.animation.triggerId === node.id` (it is a trigger for another node's animation)

The second condition requires a pre-pass over the document. A helper `collectInteractKeys(document): Set<NodeId>` in `siteShared.ts` builds this set once and the renderer checks membership.

---

## Step 7: Site export — `src/site/siteExport.tsx`

Extend `renderSiteHtmlDocument`. Call `buildDocumentInteractConfig(document)` — if `interactions.length > 0`, inject:

**In `<head>`** (after CSS link):
```html
<script type="module" src="https://unpkg.com/@wix/interact@2.1.4/dist/es/index.js"></script>
```

**In `<body>`** (after bodyHtml):
```html
<script type="module">
import { create } from 'https://unpkg.com/@wix/interact@2.1.4/dist/es/index.js';
create({"interactions":[...]});
</script>
```

If no animated nodes: no script tags emitted.

New `SiteExportOptions` field: `includeAnimations?: boolean` (default `true`) — suppresses injection for clean test baselines.

---

## Step 8: Dev console — `src/app/useAppRuntime.ts`

```typescript
useEffect(() => {
  if (!import.meta.env.DEV) return;

  (window as Record<string, unknown>).playgroundAnimationApi = {
    // ── High-level (human-friendly) ────────────────────────────────────────
    setPresetAnimation: (target: NodeId, params) =>
      setPresetAnimation(state.document, target, params),
    setKeyframeAnimation: (target: NodeId, params) =>
      setKeyframeAnimation(state.document, target, params),
    updateAnimationOptions: (target: NodeId, updates) =>
      updateAnimationOptions(state.document, target, updates),
    clearAnimation: (target: NodeId) =>
      clearAnimation(state.document, target),
    setDocumentAnimationSettings: (settings: DocumentAnimationSettings) =>
      setDocumentAnimationSettings(state.document, settings),

    // ── Low-level ──────────────────────────────────────────────────────────
    setNodeAnimation: (nodeId: NodeId, def: AnimationDefinition | undefined) =>
      setNodeAnimation(state.document, nodeId, def),
    getNodeAnimation: (nodeId: NodeId) =>
      getNodeAnimation(state.document, nodeId),
    getAnimatedNodes: () =>
      getAnimatedNodes(state.document),

    // ── Catalog & config ───────────────────────────────────────────────────
    getMotionPresets,
    getPresetCategory,
    getPresetsForTrigger,
    getPresetParams,
    buildDocumentInteractConfig: () =>
      buildDocumentInteractConfig(state.document),

    // ── Apply to live editor state ─────────────────────────────────────────
    applyDocument: (doc: DocumentModel) =>
      dispatch({ type: 'importDocument', document: doc }),
  };

  return () => {
    delete (window as Record<string, unknown>).playgroundAnimationApi;
  };
}, [state.document, dispatch]);
```

**Dev console usage:**
```js
// Entrance animation (preset)
const doc = playgroundAnimationApi.setPresetAnimation('node-3', {
  trigger: 'entrance',
  preset: 'SlideIn',
  options: { direction: 'bottom' }
});
playgroundAnimationApi.applyDocument(doc);

// Hover animation — entrance preset reverses on out automatically
const doc2 = playgroundAnimationApi.setPresetAnimation('node-3', {
  trigger: 'hover',
  preset: 'FadeIn'
});
playgroundAnimationApi.applyDocument(doc2);

// Hover animation — ongoing preset, keep state when mouse leaves
const doc3 = playgroundAnimationApi.setPresetAnimation('node-4', {
  trigger: 'hover',
  preset: 'Pulse',
  options: { intensity: 1.5 },
  ongoingOnOut: 'keep'
});
playgroundAnimationApi.applyDocument(doc3);

// Mouse animation with separate trigger/target
const doc4 = playgroundAnimationApi.setPresetAnimation('node-5', {
  trigger: 'mouse',
  preset: 'TrackMouse',
  options: { distance: '20px' },
  source: 'node-2'  // node-2 is the mouse zone, node-5 is what moves
});
playgroundAnimationApi.applyDocument(doc4);

// Custom keyframe animation
const doc5 = playgroundAnimationApi.setKeyframeAnimation('node-6', {
  trigger: 'scroll',
  name: 'my-reveal',
  keyframes: [
    { offset: 0, opacity: 0, transform: 'translateY(40px)' },
    { offset: 1, opacity: 1, transform: 'translateY(0)' }
  ],
  duration: 600
});
playgroundAnimationApi.applyDocument(doc5);

// Low-level read
playgroundAnimationApi.getNodeAnimation('node-3');
playgroundAnimationApi.getAnimatedNodes();

// Preset catalog
playgroundAnimationApi.getMotionPresets();
// → { entrance: ['FadeIn', 'SlideIn', ...], ongoing: ['Pulse', 'Bounce', ...], scroll: ['FadeScroll', ...], mouse: [...] }

// Presets available for a trigger (with param schemas)
playgroundAnimationApi.getPresetsForTrigger('hover');
// → [{ preset: 'FadeIn', category: 'entrance', params: [...] }, { preset: 'Pulse', category: 'ongoing', params: [...] }, ...]

// Params for a specific preset
playgroundAnimationApi.getPresetParams('SlideIn');
// → { preset: 'SlideIn', category: 'entrance', params: [{ name: 'direction', type: 'string', required: false, enum: ['top', 'bottom', 'left', 'right'], default: 'bottom' }, ...] }

// Clear
playgroundAnimationApi.applyDocument(
  playgroundAnimationApi.clearAnimation('node-3')
);
```

---

## Step 9: Tests

### `src/animations/tests/animationApi.test.ts`

**High-level API:**
- `setPresetAnimation`: sets animation from preset name + trigger + options; overwrites existing; throws on unknown nodeId; throws on site root; throws on unknown preset; throws on invalid preset/trigger combo ('FadeScroll' on 'entrance', 'SlideIn' on 'scroll'); 'SlideIn' on 'entrance' → valid; 'SlideIn' on 'click' → valid
- `setKeyframeAnimation`: sets keyframe animation; any trigger accepted; throws on unknown nodeId or site root
- `updateAnimationOptions`: merges updates onto existing animation; throws if node has no animation; throws on unknown nodeId or site root
- `clearAnimation`: removes animation; silent no-op if already absent
- `setDocumentAnimationSettings`: replaces immutably
- `getPresetCategory`: returns correct category for known presets; returns null for unknown
- `getPresetsForTrigger`: returns entrance presets for 'entrance'; returns entrance+ongoing for 'click'/'hover'; returns scroll presets for 'scroll'; returns mouse presets for 'mouse'; returns ongoing presets for 'ongoing'; each entry includes params schema
- `getPresetParams`: returns param schema for known preset (e.g. 'SlideIn' has direction param with enum values); returns null for unknown preset

**Low-level API:**
- `setNodeAnimation`: sets definition; overwrites existing; undefined clears animation; throws on unknown nodeId or site root
- `getNodeAnimation`: returns `undefined` for unanimated node
- `getAnimatedNodes`: returns IDs of animated nodes; empty array for clean document

**Config builder:**
- `buildDocumentInteractConfig`: `interactions: []` for unanimated doc; correct trigger mapping (entrance→viewEnter, scroll→viewProgress); `source` node and `target` node both referenced when source≠target; hover entrance effect has alternate/reverse config; hover ongoing with `ongoingOnOut: 'keep'` has fill-forward config

**A11y:**
- Global response overrides per-trigger; per-trigger overrides per-animation; absent at all levels = no reduced-motion handling

### `src/animations/tests/siteExportAnimations.test.ts`
- No animations → no script tags in HTML
- One animated node → interact `<script>` in `<head>`, init `<script>` in `<body>`
- Config round-trip: parsed inline config equals `buildDocumentInteractConfig(doc)`
- `data-interact-key` on animated node in body HTML
- `triggerId` set → both trigger and target nodes have `data-interact-key`
- `includeAnimations: false` suppresses injection

---

## Step 10: `docs/PLAYGROUND_SPEC.md`

Add **Animation Model** section covering:
- `DocumentModel.animationSettings` and the three-level a11y hierarchy
- `animation?: AnimationDefinition` (singular) on all non-site nodes
- Six trigger types and their interact mapping; preset constraints per trigger
- Named vs keyframe effect distinction; keyframe unrestricted by trigger
- `triggerId` for trigger/target separation
- Hover behavior: entrance reverses on out; ongoing stops with `ongoingOnOut: 'reset' | 'keep'`
- `requiresSticky` flag semantics
- Site export: `data-interact-key`, script injection, trigger-node key collection

---

## TDD Rationale

**Yes, use TDD here.** This API is made entirely of pure functions with no I/O or side effects — the perfect case for test-driven development. Writing tests first means:
- The spec is locked before any implementation choices are made
- Each function signature is validated against real usage before it exists
- Fewer iterations: the tests replace exploratory manual testing via the dev console during development
- Integration points (site export, dev console) are verified automatically on every change

The TDD order: write all tests → implement to green → barrel export → site/dev-console wiring.

---

## Implementation Order + Subagent Strategy

TDD approach: tests are written first and drive implementation. Steps that are independent run in parallel subagents.

### Phase A — Foundation (sequential, main agent)
1. `npm install @wix/interact @wix/motion-presets`
2. **Haiku** — `src/animations/types/index.ts` (pure type declarations, no logic)
3. **Haiku** — `src/model/types/index.ts` additions (adding optional fields to existing types)

### Phase B — Tests first (parallel subagents, after Phase A)
4. **Sonnet** — `src/animations/tests/animationApi.test.ts` (write all tests against the types, before implementation exists — tests will fail until Phase C)
5. **Sonnet** — `src/animations/tests/siteExportAnimations.test.ts` (write integration tests)

### Phase C — Implementation (sequential, after tests exist)
6. **Sonnet** — `src/animations/animationApi.ts` (implement to make animationApi tests pass)
7. **Haiku** — `src/api/animationApi.ts` (barrel re-export, trivial)

### Phase D — Site export (parallel subagents, after Phase C)
8. **Haiku** — `src/site/siteShared.ts` + `src/site/SiteRenderer.tsx` (`collectInteractKeys` helper + `data-interact-key` attribute)
9. **Sonnet** — `src/site/siteExport.tsx` (script injection using `buildDocumentInteractConfig`)
   - Run siteExportAnimations tests after step 9 to verify

### Phase E — Dev wiring + docs (parallel, after Phase D)
10. **Haiku** — `src/app/useAppRuntime.ts` (dev console exposure, mechanical wiring)
11. **Haiku** — `docs/PLAYGROUND_SPEC.md` (documentation update)

---

## Verification

- `npm test` — all new tests pass, no regressions
- `npm run build` — no TypeScript errors
- TypeScript correctly rejects `{ trigger: 'entrance', effect: { kind: 'named', type: 'Pulse' } }` (ongoing preset on entrance trigger)
- TypeScript correctly rejects `{ trigger: 'scroll', effect: { kind: 'named', type: 'FadeIn' } }` (entrance preset on scroll trigger)
- TypeScript accepts keyframe effect on any trigger
- Dev console: `getMotionPresets()` returns categorized lists
- Dev console: set animation, `applyDocument()`, verify live document has animation
- Dev console: `buildDocumentInteractConfig()` returns valid interact config
- Exported HTML: animated nodes have `data-interact-key`; trigger-only nodes also have it when `triggerId` is used; scripts present when animations exist; clean output when no animations

---

## Out of scope for Phase 1

- Editor inspector UI
- `editorApi.ts` wrappers with undo/redo history
- `DocumentCommand` union extension
- `src/model/validation.ts` animation validation
- Responsive animation settings per breakpoint
- Multiple animations per node per trigger type
- Background scroll presets (`BgCloseUp`, `BgParallax`, etc.) — deferred to later phase
