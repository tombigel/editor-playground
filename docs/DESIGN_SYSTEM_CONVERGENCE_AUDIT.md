# Design System Convergence Audit

Repo-wide backlog for converging editor implementation onto the shared design system.

This document is the execution source of truth for the UI cleanup pass. It tracks which editor-facing surfaces already align with the design system, which ones still depend on bespoke markup or CSS, and what migration decision applies to each surface.

Canonical authority for convergence decisions:

- [`docs/EDITOR_STYLE_GUIDE.md`](./EDITOR_STYLE_GUIDE.md)
- the design-system showcase under `src/design-system/`
- the shared UI surface under `src/components/ui/`

## How To Use This Backlog

For each surface:

1. audit the current implementation and editor CSS dependencies
2. choose the smallest valid migration decision
3. execute the work in the assigned wave
4. update showcase, tests, and docs when the surface becomes shared
5. remove dead CSS only after the consumer has migrated

This document should stay current as the cleanup progresses. If a future task introduces a new editor-facing surface, add it here before implementing bespoke UI.

## Migration Decision Rubric

Use exactly one primary decision per surface:

- `reuse existing DS`: the surface can adopt an existing design-system primitive or composite with little or no shared API change
- `extend DS primitive`: the surface should keep using a shared primitive, but that primitive needs a new variant, prop, state, or subcomponent
- `add DS composite`: the surface reveals a repeatable editor pattern that should become a shared composite in `src/components/ui` and the showcase
- `keep specialized`: the surface has domain-specific structure or behavior that should remain local; it may still adopt shared primitives where possible

Decision rules:

- prefer `reuse existing DS` over every other option
- choose `extend DS primitive` before `add DS composite` when the missing capability is still fundamentally primitive-level
- choose `add DS composite` only when the pattern is clearly reusable across multiple editor surfaces
- choose `keep specialized` only when abstraction would be fake or would hide domain-specific behavior

## Priority Labels

- `P0 foundation`: shared primitives, token contracts, shell contracts, and other high-leverage dependencies
- `P1 shell`: app shell, floating panels, topbar, sidebar, navigation chrome, panel headers
- `P2 inspector/settings`: shared control rows, section cards, warning/info surfaces, mixed-value states
- `P3 specialized`: layers, help browser, page management, font management, other domain-heavy panels
- `P4 cleanup`: CSS deletion, contract tightening, stale test cleanup, follow-up polish

## Status Labels

- `not audited`: listed but not yet classified
- `audited`: current state captured, still waiting for a migration step
- `ready`: clear migration path exists and can be implemented
- `in progress`: actively being migrated
- `done`: consumer migrated and cleanup completed for the intended scope
- `exception`: intentionally kept specialized, with rationale recorded in notes

## Definition Of Done Per Surface

A surface is only `done` when all applicable items are true:

- shared component ownership is identified
- the editor consumer is migrated to the chosen shared surface or explicitly marked `exception`
- the design-system showcase is updated if a shared primitive or composite changed
- tests are updated or added for the resulting contract
- dead CSS or redundant local class usage is removed
- docs are updated if the change affects editor-facing behavior or shared UI contracts

## Surface Inventory

| Surface | Files | Existing DS usage | Bespoke markup / controls to audit | CSS dependencies to audit | Primary decision | Priority | Wave | Status | Done criteria / notes |
|---|---|---|---|---|---|---|---|---|---|
| App shell | `src/app/AppShell.tsx` | Uses shared button, dialog, popover in places | Grid shell, rail framing, workspace framing, local buttons and layout wrappers | `editor-chrome.css`, utility editor classes | `keep specialized` | `P3 specialized` | `Wave E` | `audited` | App-level grid/orchestration should stay local; consume shared shell pieces without turning the whole app shell into a DS component |
| Topbar | `src/app/EditorTopbar.tsx` | Uses menubar and page switcher | Topbar framing, action cluster, preview button, local layout wrappers | `editor-chrome.css` | `keep specialized` | `P1 shell` | `Wave B` | `audited` | Product-specific layout stays local; should consume improved shell/button/page-switcher contracts |
| Insert rail | `src/panels/InsertPanel.tsx` | Uses shared button and tooltip | Rail entry rows, section separators, local icon/text wrappers | `editor-chrome.css` | `add DS composite` | `P1 shell` | `Wave B` | `audited` | Rail entry/toggle/status chrome is repeated enough to justify a shared composite layer |
| Editor sidebar | `src/panels/EditorSidebar.tsx` | Uses shared button | Sidebar shell, header framing, selection summary, local close/header actions | `editor-chrome.css`, `inspector.css` | `reuse existing DS` | `P1 shell` | `Wave B` | `audited` | Becomes mostly a consumer once shared panel shell and header contracts exist |
| Focused panel | `src/panels/FocusedModePanel.tsx` | Limited shared surface use | Floating panel shell, header summary, badges, close affordance | `editor-chrome.css`, `inspector.css` | `add DS composite` | `P0 foundation` | `Wave A` | `audited` | Strong anchor for shared floating shell with header, badges, and scrollable body |
| Panel headers | `src/panels/EditorPanelHeader.tsx` and consumers | Shared button usage only | Header icon/title/description/actions/close pattern | `editor-chrome.css` | `add DS composite` | `P0 foundation` | `Wave A` | `audited` | Clearest existing local shared contract to move under DS ownership |
| Settings helpers | `src/components/ui/settings-panel.tsx`, `src/panels/settings/**` | Already shared but narrow | Setting row, action row, compact select row, info tooltip contracts | `editor-chrome.css` | `extend DS primitive` | `P2 inspector/settings` | `Wave C` | `audited` | Expand toward inspector-compatible rows and group variants rather than replacing the helper layer |
| Inspector common sections | `src/panels/inspector/CommonSections.tsx`, `src/panels/InspectorPanel.tsx`, `src/panels/InspectorControls.tsx` | Uses button, card, input, label, popover, switch | Summary blocks, cards, warnings, pills, inline editors, repeated groups | `inspector.css`, `editor-chrome.css` | `add DS composite` | `P2 inspector/settings` | `Wave C` | `audited` | High-volume source of repeated inspector cards, warnings, pills, and grouped rows |
| Font controls | `src/panels/controls/FontControls.tsx` | Uses button, input, popover, select, value-with-unit | Custom font picker layout, weight list, size shell, custom inline field structure | `editor-chrome.css`, `inspector.css` | `extend DS primitive` | `P0 foundation` | `Wave A` | `audited` | Most missing behavior belongs in shared primitive contracts: font picker, embedded popover lists, compact numeric shells |
| Size fields | `src/panels/controls/SizeFields.tsx` | Uses input, label, select, slider, value-with-unit | Custom inline field shell, suffix segment behavior, stats/pill rows | `editor-chrome.css`, `inspector.css` | `extend DS primitive` | `P0 foundation` | `Wave A` | `audited` | Shared compact-field and suffix-segment behavior should absorb the local shell |
| Number fields | `src/panels/controls/NumberFields.tsx` | Uses input, label, number-input, value-with-unit | Mixed label/layout rows and field grouping | `editor-chrome.css`, `inspector.css` | `reuse existing DS` | `P2 inspector/settings` | `Wave D` | `audited` | Mostly a consumer migration after compact numeric primitives stabilize |
| Interaction controls | `src/panels/controls/InteractionControls.tsx` | Uses button, label, tooltip | Group wrappers, option rows, warning/info snippets | `editor-chrome.css`, `inspector.css` | `add DS composite` | `P2 inspector/settings` | `Wave C` | `audited` | Missing inspector-level row/group/warning composition matters more than new base primitives |
| Sticky controls | `src/panels/inspector/StickySection.tsx`, `src/panels/MultiStickySection.tsx` | Uses button, label, select, switch | Status surfaces, segmented controls, info copy, mixed-state presentation | `editor-chrome.css`, `inspector.css` | `add DS composite` | `P2 inspector/settings` | `Wave C` | `audited` | Multi-select status and grouped controls should become shared inspector composition patterns |
| Layers panel | `src/panels/LayersPanel.tsx` | Uses button, input, popover tooltip | Floating shell, row structure, title editing, badges, actions, empty state | `layers-panel.css`, `editor-chrome.css` | `keep specialized` | `P3 specialized` | `Wave E` | `audited` | Drag/drop and hierarchy logic stay local; only row chrome and shell pieces should be shared |
| Help dialog | `src/panels/HelpDialog.tsx`, `src/panels/HelpMarkdownDocument.tsx` | Uses button, dialog | Dialog shell, left nav, doc browser framing, local toolbar patterns | `editor-chrome.css`, `help-docs.css` | `keep specialized` | `P3 specialized` | `Wave E` | `audited` | Document browser split-pane behavior is local, though it should consume shared shell/nav/info contracts |
| Page editor content | `src/panels/PageEditorContent.tsx` | Uses button, input, label, searchable-select, select, switch, settings helpers | Warning blocks, slug rows, alias chips, section group structure | `editor-chrome.css` | `reuse existing DS` | `P3 specialized` | `Wave E` | `audited` | Straightforward consumer once warning/info/group/pill/select contracts are formalized |
| Page tree content | `src/panels/PageTreeContent.tsx` | Uses button, tooltip, tree-row | Local tree framing, action patterns, page-specific row states | `editor-chrome.css` | `reuse existing DS` | `P3 specialized` | `Wave E` | `audited` | Should consume improved tree-row and pill contracts while keeping page behavior local |
| Page/site/export settings | `src/panels/PagesSiteSettingsContent.tsx`, `src/panels/PagesExportSettingsContent.tsx`, `src/panels/PagesPanel.tsx` | Uses label, input, select, switch, tabs, settings helpers | Warning cards, validation list, local tabs framing, section shells | `editor-chrome.css` | `reuse existing DS` | `P3 specialized` | `Wave E` | `audited` | Consumer cleanup after shell, tabs, warning/info, and settings contracts are ready |
| Manage fonts panel | `src/panels/fontManagement/ManageFontsPanel.tsx` | Uses button, input, tooltip, label, select, switch | Catalog rows, filter toggles, status cards, pager, preview rows | `editor-chrome.css` | `keep specialized` | `P3 specialized` | `Wave E` | `audited` | Search/catalog domain remains local but may reveal reusable pager and list-row contracts |
| Dialogs / tooltips / pills / warnings | `src/components/ui/dialog.tsx`, `src/components/ui/popover.tsx`, editor consumers across `src/app` and `src/panels` | Shared primitives exist | Local warning cards, pills, tooltip styling, status surfaces repeated in consumers | `editor-chrome.css` | `extend DS primitive` | `P0 foundation` | `Wave A` | `audited` | Dialog/popover base is present; warning/info/pill/status roles still need formal runtime contracts |
| Tree row | `src/components/ui/tree-row.tsx` | Shared component exists | Layers/page consumers may still need local row structure and actions | `layers-panel.css`, `editor-chrome.css` | `extend DS primitive` | `P0 foundation` | `Wave A` | `audited` | Needs clearer variant model for layers mode, page-tree mode, title editing, badges, and actions |
| Page switcher | `src/components/ui/page-switcher-select.tsx` and topbar consumer | Shared component exists | Topbar-specific row layout and create-page affordance may still be specialized | `editor-chrome.css` | `extend DS primitive` | `P0 foundation` | `Wave A` | `audited` | Shared already, but current styling and affordances are still too topbar-specific |
| Color picker | `src/components/ui/color-picker.tsx` | Shared primitive exists | Injected style handling, theme sync, third-party overrides | `editor-chrome.css`, internal injected CSS | `extend DS primitive` | `P0 foundation` | `Wave A` | `audited` | DS should own third-party styling contract instead of relying on broad injected `!important` rules; upstream gaps tracked in `docs/COLOR_PICKER_UPSTREAM_CONTRIBUTIONS.md` |
| Tabs / select / searchable-select / value-with-unit | `src/components/ui/tabs.tsx`, `src/components/ui/select.tsx`, `src/components/ui/searchable-select.tsx`, `src/components/ui/value-with-unit.tsx` | Shared primitives exist | Consumer-side size/layout overrides, missing compact or embedded variants | `editor-chrome.css` | `extend DS primitive` | `P0 foundation` | `Wave A` | `audited` | These primitives are close but still force local overrides for compact, embedded, and mixed-state editor usage |

## Cross-Cutting Findings

- Duplicated floating shell pattern:
  `PopoverSurface` or floating shell + `EditorPanelHeader` + scrollable body appears in the section template popover, layers panel, pages panel, focused panel, and dialog-like editor surfaces. This should be formalized as a shared shell composite in `Wave A`.
- Duplicated header pattern:
  `EditorPanelHeader` is already a local shared helper and is the clearest immediate candidate to become a DS-owned runtime composite in `Wave A`.
- Warning, info, and pill surfaces:
  warning blocks and pill-like status surfaces recur in page editing, export settings, focused panel headers, inspector content, and settings/help contexts. The showcase has visual examples, but runtime code still depends on local classes rather than a first-class shared contract.
- Mixed-value patterns:
  `ValueWithUnit` and `NumberInput` already cover part of the mixed-value problem well. Other mixed states are still expressed through local dashed borders, bespoke grouped shells, and consumer-specific status UI. Shared primitives are close, but inspector/settings composites are still missing.
- Global versus consumer CSS:
  `editor-scrollbar`, theme scopes, token-backed utility roles, and dialog/popover reset rules are legitimate global contracts. Many `editor-layers-*`, `editor-template-*`, `editor-insert-*`, and settings-nav selectors are consumer- or subsystem-specific and should either move behind shared component ownership or remain local only where specialization is real.
- Showcase gaps:
  the showcase demonstrates focused panel visuals, warning/info states, settings nav, and layers visuals, but it does not yet prove a reusable runtime shell/header contract used by real editor consumers. Template-card variants and font-management row/pager items are also still missing.
- First execution implication:
  the strongest first move is not broad consumer migration. `Wave A` should formalize shell, header, status, compact-field, and row contracts first so later panel work becomes mostly `reuse existing DS`.

## Known Hotspots To Classify Early

These were classified as the highest-leverage or highest-risk hotspots:

- `src/components/ui/color-picker.tsx`
  `extend DS primitive`, `Wave A`
- `src/panels/controls/FontControls.tsx`
  `extend DS primitive`, `Wave A`
- `src/panels/controls/SizeFields.tsx`
  `extend DS primitive`, `Wave A`
- `src/panels/LayersPanel.tsx`
  `keep specialized`, `Wave E`
- `src/app/AppChrome.tsx`
  consumer work depends on missing shell and status composites; primary consumer migration sits in `Wave B`
- `src/panels/EditorSidebar.tsx`
  `reuse existing DS`, `Wave B`
- `src/styles/editor-chrome.css`
  cleanup deferred to `Wave F` after migrations land

## Wave Targets

These are the execution waves this backlog should eventually map to:

- `Wave A`: foundation primitives and shell contracts
- `Wave B`: shell and navigation consumers
- `Wave C`: inspector and settings composites
- `Wave D`: dense control migrations
- `Wave E`: specialized panels
- `Wave F`: CSS deletion and AI workflow guardrails

## Current Wave Mapping Summary

- `Wave A`
  focused panel, panel headers, font controls, size fields, dialogs/tooltips/pills/warnings, tree row, page switcher, color picker, tabs/select/searchable-select/value-with-unit
- `Wave B`
  topbar, insert rail, editor sidebar
- `Wave C`
  settings helpers, inspector common sections, interaction controls, sticky controls
- `Wave D`
  number fields
- `Wave E`
  app shell, layers panel, help dialog, page editor content, page tree content, page/site/export settings, manage fonts panel
- `Wave F`
  `editor-chrome.css` cleanup and remaining contract tightening after prior migrations
