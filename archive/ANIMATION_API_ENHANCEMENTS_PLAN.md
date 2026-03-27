# Animation API Enhancements Plan (Implemented)

> Archived: 2026-03-28. This reflects what was actually built, including all fixes discovered during implementation.

## Context

The animation API (`src/animations/animationApi.ts`) handles CRUD for node animations and builds `@wix/interact` configs for site export. After reviewing the [official motion-presets reference docs](https://github.com/wix/interact/tree/master/packages/motion-presets/rules/presets) and the [Interact integration rules](https://github.com/wix/interact/blob/master/packages/interact/rules/integration.md), three gaps were addressed:

1. **Missing defaults** — scroll effects lacked `rangeStart`/`rangeEnd` at the effect level
2. **Incomplete docs** — `docs/API.md` didn't document config builder defaults or the distinction between preset params and animation options
3. **No preview** — animations only worked in exported HTML; the editor stage had no live preview

Additionally, the `PRESET_PARAMS` catalog had discrepancies vs the official docs, and all Interact integration was migrated from `@wix/interact` to `@wix/interact/web` with custom elements and imperative element registration.

## Integration: `@wix/interact/web`

All implementations use the `web` entry point of `@wix/interact`:

| Context | Integration method | Notes |
|---------|-------------------|-------|
| **Site export** (SiteRenderer) | `<interact-element data-interact-key="...">` wrapping animated nodes | Custom element per the web integration docs; Interact targets the first child |
| **Site export** (siteExport.tsx) | CDN import from `@wix/interact/web` + `@wix/motion-presets` | Script registers presets via `Interact.registerEffects()` before `Interact.create()` |
| **Editor preview** (animationRuntime.ts) | Imperative `add(element, key)` / `remove(key)` | Stage elements can't be wrapped in `<interact-element>` due to editor drag/resize/ref system |

**Key learnings:**
- `Interact.create(config)` must be called **before** `add(element, key)` — elements register against an existing instance
- `Interact.registerEffects(motionPresets)` must be called before any `create()` to enable named presets
- The `@wix/motion-presets` type signature doesn't match `registerEffects` — requires `as unknown as ...` cast

### React 19 peer dep conflict

`@wix/interact` declares `peerOptional: react@^18.3.1` but the project uses React 19. Resolved via `package.json` overrides:
```json
"overrides": {
  "react": "$react",
  "react-dom": "$react-dom"
}
```

### Custom element JSX declaration

Added `interact-element` to `src/components/ui/types/custom-elements.d.ts` (merges with existing `color-input` declaration):
```ts
'interact-element': React.ClassAttributes<HTMLElement> & React.HTMLAttributes<HTMLElement> & {
  'data-interact-key'?: string;
  'data-interact-initial'?: string;
};
```

---

## Task 1: Defaults & Preset Catalog Alignment

### A. Scroll range defaults

**File:** `src/animations/animationApi.ts`

Added `rangeStart`/`rangeEnd` to scroll effects in `buildEffectFromDefinition`:

```ts
export const SCROLL_DEFAULT_RANGE_START = { name: 'entry', offset: { unit: 'percentage', value: 0 } };
export const SCROLL_DEFAULT_RANGE_END = { name: 'exit', offset: { unit: 'percentage', value: 100 } };
```

**Fix applied during implementation:** Initial format `offset: '0%'` (string) caused `Failed to set 'rangeStart' property on 'Animation': Animation range must be a name <length-percent> pair`. Correct format is `{ unit: 'percentage', value: 0 }` per the [viewprogress rules](https://github.com/wix/interact/blob/master/packages/interact/rules/viewprogress.md).

Applied to both named scroll effects and keyframe scroll effects.

### B. Preset catalog fixes

- **Removed** `Blink` from `ONGOING_PRESETS` — doesn't exist in official library
- **Added missing params** across 15+ presets: `depth` (ArcIn, CurveIn, TiltIn), `distance` (GlideIn, ExpandIn, Breathe, all mouse presets, MoveScroll, PanScroll)
- `distance`/`depth` modeled as `numberParam()` (px) with a comment noting `UnitLengthPercentage` support

### C. Tests

- 6 new tests: scroll range defaults (preset + keyframe), mouse hitArea regression
- Updated alignment test: removed `Blink` from expected ongoing presets

---

## Task 2: API Documentation

**File:** `docs/API.md`

Added 6 subsections after the Config builder table:
1. Animation Options vs Preset Parameters
2. Config Builder Defaults table (all 6 trigger types)
3. Duration Guidelines (functional <500ms, decorative ≤1200ms, hero ≤2000ms)
4. Special Hover Behavior (alternate, fill forwards)
5. Reduced Motion Priority Chain (global → perTrigger → per-animation)
6. Official Preset Documentation links

---

## Task 3: Animation Preview

### Architecture: API-first

```
API layer (src/animations/)
  animationApi.ts          — pure model functions (existing)
  animationRuntime.ts      — interact lifecycle (NEW)
  → re-exported via src/api/animationApi.ts

  Responsibilities:
  • Create/destroy Interact instances (via @wix/interact/web)
  • Register/unregister DOM elements (via add/remove)
  • Register motion presets (via Interact.registerEffects)
  • Filter configs by trigger type
  • One-shot animation invocation
  • Config diffing (skip no-op updates)

Editor layer (src/stage/, src/app/, src/panels/)
  useStageAnimations.ts    — thin React hook, calls runtime API
  SettingsPanel.tsx         — UI toggle
  Stage.tsx / StageScene.tsx — data-interact-key attrs

  Responsibilities:
  • Manage preview state (enabled, mode, trigger toggles)
  • Call runtime API on state changes
  • Add data-interact-key to DOM
```

### Runtime API — `src/animations/animationRuntime.ts`

```ts
// Factory — creates instance, registers DOM elements, returns handle
function createAnimationPreview(config: InteractConfig): AnimationPreviewHandle

// Pure — filters config by trigger type
function filterInteractConfig(config, triggers): InteractConfig

// Convenience — build + filter in one step
function buildPreviewConfig(doc, triggers): InteractConfig
```

**`createAnimationPreview` lifecycle:**
1. `ensurePresetsRegistered()` — one-time `Interact.registerEffects(motionPresets)`
2. `Interact.create(config)` — creates the instance
3. `registerInteractElements()` — scans DOM for `[data-interact-key]`, calls `add(el, key)` for each
4. Returns handle with `updateConfig`, `invoke`, `destroy`, `isActive`

**Fix applied during implementation:** Initial order was `add()` then `create()` — caused "No instance found for key" error. Correct order: `create()` first, then `add()`.

**`invoke`** dispatches synthetic DOM events:
- `'click'` → `MouseEvent('click', { bubbles: true })`
- `'hoverIn'` → `PointerEvent('pointerenter', { bubbles: true })`
- `'hoverOut'` → `PointerEvent('pointerleave', { bubbles: true })`

Guards against SSR with `typeof document === 'undefined'`.

### Editor state — `AnimationPreviewState`

```ts
type AnimationPreviewState = {
  enabled: boolean;
  mode: 'passive' | 'interactive';
  triggers: Record<AnimationTriggerType, boolean>;
};
```

Default: `{ enabled: false, mode: 'passive', triggers: { all: true } }`

Follows the `previewSticky` pattern exactly:
- State in `src/editor/types/index.ts`
- Persistence in `src/editor/editorPersistence.ts`
- Reducer in `src/app/editorState.ts`
- Action: `{ type: 'setAnimationPreview'; value: Partial<AnimationPreviewState> }`
- Shortcut: Shift+A (`src/lib/shortcuts.ts`)
- Rail toggle button + Settings panel toggle

### React hook — `src/stage/useStageAnimations.ts`

Thin wrapper bridging React lifecycle → runtime API:

- Computes effective triggers: in passive mode, forces `click: false` (hover allowed — uses `pointerenter`/`pointerleave` which don't conflict with editor drag)
- **Always destroys + recreates** on document change (not `updateConfig`) because `add()` registers DOM elements at `create()` time — new/removed animated nodes need a fresh DOM scan
- **50ms debounce** (not 300ms) — enough for React to commit DOM, fast enough to feel instant
- Passes `animationPreview` object directly to `useMemo` deps (biome lint requires it vs destructured props)

**Fix applied during implementation:** Initial 300ms debounce + `updateConfig` pattern meant preview only worked after page refresh. Changed to destroy+recreate with 50ms debounce.

### Stage DOM — `data-interact-key` attributes

Stage renderers (wrapper + leaf) accept `interactKeys?: Set<NodeId>` and add `data-interact-key={node.id}` to elements when in the set. `StageScene` computes the set via `collectInteractKeys(document)` when `animationPreview?.enabled`.

### Site renderer — `<interact-element>` wrapper

`SiteRenderer.tsx` wraps animated nodes in `<interact-element data-interact-key="...">` instead of putting the attribute on the element itself. Interact targets the **first child** of the custom element.

```tsx
function wrapInteract(nodeId, element) {
  if (activeInteractKeys.has(nodeId)) {
    return (
      <interact-element data-interact-key={nodeId}>
        {element}
      </interact-element>
    );
  }
  return element;
}
```

### Console API

`window.playgroundAnimationApi` (dev mode) exposes:
- `createAnimationPreview`, `filterInteractConfig`, `buildPreviewConfig` — direct runtime API
- `setAnimationPreview(settings)` — dispatches to editor state

---

## Execution Strategy (Subagents)

Used `haiku` for mechanical edits, `sonnet` for moderate complexity, `opus` only where design judgment was needed.

| Round | Agents | Model(s) | Work |
|-------|--------|----------|------|
| 1 | 3 parallel | haiku, sonnet, haiku | Scroll defaults, catalog fixes, tests |
| 2 | 1 | sonnet | API docs |
| 3 | 3 parallel | sonnet, haiku, haiku | Runtime API, runtime tests, editor state |
| 4 | 2 parallel | haiku, haiku | Stage DOM attrs, React hook |
| 5 | manual | — | Wiring (AppShell, Stage, SettingsPanel, useAppRuntime) + fixes |

---

## Files modified

| File | Task | Layer |
|------|------|-------|
| `src/animations/animationApi.ts` | 1 (defaults + catalog + `@wix/interact/web`) | API |
| `src/animations/animationRuntime.ts` | 3 (NEW — runtime API with `add`/`remove`) | API |
| `src/animations/types/index.ts` | 1, 3 (types + `@wix/interact/web`) | API |
| `src/animations/tests/animationApi.test.ts` | 1 | API |
| `src/animations/tests/animationApiAlignment.test.ts` | 1 | API |
| `src/animations/tests/animationRuntime.test.ts` | 3 (NEW) | API |
| `src/animations/tests/siteExportAnimations.test.ts` | 3 (updated assertions) | API |
| `src/api/animationApi.ts` | 3 (re-export runtime functions) | API |
| `docs/API.md` | 2 | docs |
| `src/components/ui/types/custom-elements.d.ts` | 3 (`interact-element` JSX type) | types |
| `src/site/SiteRenderer.tsx` | 3 (`<interact-element>` wrapping) | site |
| `src/site/siteExport.tsx` | 3 (`/web` CDN + `registerEffects`) | site |
| `src/editor/types/index.ts` | 3 (`AnimationPreviewState`) | editor |
| `src/editor/editorPersistence.ts` | 3 | editor |
| `src/app/types/index.ts` | 3 | editor |
| `src/app/editorState.ts` | 3 | editor |
| `src/app/App.tsx` | 3 | editor |
| `src/app/AppShell.tsx` | 3 (rail button + stage/settings wiring) | editor |
| `src/app/useAppRuntime.ts` | 3 (console API) | editor |
| `src/app/useEditorKeyboardShortcuts.ts` | 3 | editor |
| `src/app/shortcutController.ts` | 3 | editor |
| `src/lib/shortcuts.ts` | 3 (Shift+A) | editor |
| `src/panels/SettingsPanel.tsx` | 3 (Play icon toggle) | editor |
| `src/panels/tests/SettingsPanel.test.tsx` | 3 (new props) | editor |
| `src/stage/Stage.tsx` | 3 (hook + prop) | editor |
| `src/stage/StageScene.tsx` | 3 (`interactKeys` compute + thread) | editor |
| `src/stage/types/index.ts` | 3 (`AnimationPreviewState` prop) | editor |
| `src/stage/stageRenderers/wrapperRenderer.tsx` | 3 (`data-interact-key`) | editor |
| `src/stage/stageRenderers/leafRenderer.tsx` | 3 (`data-interact-key`) | editor |
| `src/stage/useStageAnimations.ts` | 3 (NEW — thin hook) | editor |
| `package.json` | 3 (React override for `@wix/interact`) | config |

## Verification

- 956 tests pass across 70 test files
- Zero TypeScript errors
- Zero biome lint errors
- Full `npm run build` passes (lint + typecheck + test:coverage + check:architecture + vite build)
