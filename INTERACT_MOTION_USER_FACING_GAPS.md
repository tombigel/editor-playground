# Interact and Motion User-Facing Gaps

Evidence-based discrepancy ledger for the user-facing gaps and mismatches across `@wix/interact`, `@wix/motion`, and `@wix/motion-presets`.

## Trust Order

1. Shipped code/runtime behavior
2. `@wix/motion-presets` rules
3. `@wix/interact` rules
4. Docs in either package

The higher-priority source decides support and parameters. Every lower-priority conflict is recorded here.

## Findings

### 1. `BounceMouse` and `SpinMouse` exist in shipped code but are omitted from motion preset rules

- Winning source:
  - Shipped code/runtime behavior
- Losing source(s):
  - `@wix/motion-presets` rules
- Discrepancy:
  - The shipped package exports `BounceMouse` and `SpinMouse`, and `@wix/interact` `pointermove` rules reference both, but upstream `motion-presets` mouse rules omit them.
- User-facing impact:
  - A rules-only implementation would incorrectly hide valid shipped presets from the supported surface.
- Required action:
  - Treat both as supported presets in canonical library truth.
  - Record the omission as a motion-rules discrepancy.

### 2. `CustomMouse` is exported by shipped code but omitted from preset rules

- Winning source:
  - Shipped code/runtime behavior
- Losing source(s):
  - `@wix/motion-presets` rules
- Discrepancy:
  - `CustomMouse` is exported by the package, but it is not documented in motion preset rules and does not behave like a normal end-user visual preset.
- User-facing impact:
  - Treating it as a normal preset would expose a mostly no-op implementation hook as if it were standard preset surface.
- Required action:
  - Keep it in the audit model with status `implementation-hook`.
  - Keep it out of normal preset selection surfaces.

### 3. `DVD` is typed and ruled, but not exported by the shipped package

- Winning source:
  - Shipped code/runtime behavior
- Losing source(s):
  - `@wix/motion-presets` rules
  - public `@wix/motion-presets` types
- Discrepancy:
  - `DVD` appears in ongoing preset rules and in public type unions, but it is not exported from the shipped ongoing preset index or top-level runtime bundle.
- User-facing impact:
  - A type- or rule-driven implementation would offer a preset that cannot be registered through the normal shipped package surface.
- Required action:
  - Mark it `typed-but-not-exported`.
  - Remove it from normal playable/registerable preset surface.

### 4. `TurnScroll.rotation` exists in shipped code but is missing from motion and interact rules

- Winning source:
  - Shipped code/runtime behavior
- Losing source(s):
  - `@wix/motion-presets` rules
  - `@wix/interact` rules
- Discrepancy:
  - The shipped `TurnScroll` type surface includes `rotation`, but neither preset rules nor interact rules document it.
- User-facing impact:
  - Any schema or editor derived from the rules alone will under-model a valid shipped parameter.
- Required action:
  - Include `rotation` in canonical preset schema.
  - Document the rules gap.

### 5. `viewProgress` still inherits stale `ViewEnterParams` shape

- Winning source:
  - Shipped runtime behavior
- Losing source(s):
  - public `@wix/interact` typing surface
  - parts of `@wix/interact` rules
- Discrepancy:
  - The typing surface reuses `ViewEnterParams` for `viewProgress`, but shipped behavior ignores `threshold` and `inset` and uses effect `rangeStart`/`rangeEnd` instead.
- User-facing impact:
  - A type-driven trigger editor can expose controls that have no effect for scroll progress animations.
- Required action:
  - Keep `threshold` and `inset` out of `viewProgress` UI and schema surface.
  - Record the reuse as a lower-priority typing/rule drift.

### 6. Scroll `continuous` is not a uniform contract across shipped presets

- Winning source:
  - Shipped code/runtime behavior
- Losing source(s):
  - high-level rule generalizations
- Discrepancy:
  - Shipped scroll preset source handles `continuous` in different ways. Some presets contain explicit continuous branches, while `ParallaxScroll` does not branch on `range` at all.
- User-facing impact:
  - Treating `continuous` as a single reliable semantic across all scroll presets overstates what the package actually does.
- Required action:
  - Preserve preset-level behavior notes in canonical truth.
  - Avoid oversimplified rule text in future schema generation or UI copy.

### 7. Handwritten local catalogs can drift from audited library truth

- Winning source:
  - Canonical generated truth from the audit
- Losing source(s):
  - handwritten project catalog/schema copies
- Discrepancy:
  - Handwritten preset inventories and schemas can drift from shipped exports, shipped params, and known non-playable entries.
- User-facing impact:
  - An implementation can present an inaccurate view of the installed library surface.
- Required action:
  - Replace handwritten preset inventory and schema truth with the generated audit artifact.

### 8. FOUC prevention requires manual `generate(config)` and `data-interact-initial` wiring outside the animation definition model

- Winning source:
  - Shipped `@wix/interact` runtime and rules
- Losing source(s):
  - assumptions that the raw `AnimationDefinition` or `Interact.create()` alone is enough
- Discrepancy:
  - FOUC prevention is not automatic. The library requires a separate `generate(config)` pass plus `data-interact-initial="true"` on the matching element, and only for `viewEnter` + `type:'once'` with the same source and target element.
- Where documented:
  - `@wix/interact` rules: `integration.md`, `viewenter.md`, `full-lean.md`
  - `@wix/interact` docs: `docs/api/functions.md`, `docs/integration/react.md`, `docs/examples/entrance-animations.md`
  - example implementation: `src/useAnimationPreview.ts`, `src/App.tsx`
- Where not documented:
  - `@wix/motion-presets` rules do not document FOUC handling at all, which is correct for preset-level docs but leaves this requirement invisible if someone reads only preset guidance.
  - The generated library truth and animation definition model do not carry a first-class “requires FOUC CSS generation” contract.
  - A raw animation-definition view does not make the extra runtime step visible.
- User-facing impact:
  - A consumer copying only the shown config or only the animation definition can still get a flash before entrance animations start.
- Required action:
  - Keep manual FOUC CSS injection and `data-interact-initial` handling in any integration that needs this behavior.
  - Keep this requirement visible in the ledger because it is a runtime integration rule, not something the animation model can express by itself.

### 9. Shared parent `perspective` handling is an integration concern, not a first-class preset contract

- Winning source:
  - Shipped code/runtime behavior plus `@wix/interact` rules
- Losing source(s):
  - any assumption that the preset `perspective` param alone covers every 3D rendering setup
- Discrepancy:
  - Many presets expose a `perspective` parameter in shipped code, but some integrations also apply a manual parent CSS `perspective` wrapper to make 3D rendering reliable and adjustable. That wrapper is not represented in the animation definition or generated Interact config.
- Where documented:
  - `@wix/interact` `full-lean.md` documents the distinction between `transform: perspective(...)` inside effects and the static CSS `perspective` property on a parent container.
  - `@wix/motion-presets` rules document per-preset `perspective` parameters on 3D presets such as `ArcIn`, `FlipIn`, `TiltIn`, `Tilt3DMouse`, `Track3DMouse`, and `SwivelMouse`.
  - example implementation: `src/App.tsx`, `src/App.css`, `src/AnimationControls.tsx`
- Where not documented:
  - `@wix/motion-presets` rules do not document when a consumer should add a shared parent CSS `perspective` container; they only describe the preset parameter itself.
  - Neither the preset rules nor the generated truth artifact describes when a consuming app should add a shared parent `perspective` container.
  - A config-only output does not reveal this extra CSS dependency.
- User-facing impact:
  - A preview or implementation can look correct in one integration but not another if equivalent parent CSS perspective handling is omitted where a shared viewpoint is needed.
- Required action:
  - Treat shared parent perspective handling as integration-owned setup, not as a preset parameter replacement.
  - Keep this distinction documented so consumers do not confuse preset `perspective` options with parent CSS `perspective`.

## Current Canonical Sources In Repo

- Generated truth:
  - `src/animations/libraryTruth.generated.ts`
- Generator:
  - `scripts/extract-wix-library-truth.mjs`
