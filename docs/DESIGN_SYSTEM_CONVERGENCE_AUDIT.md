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

| Surface | Files | Existing DS usage | Bespoke markup / controls to audit | CSS dependencies to audit | Primary decision | Priority | Status | Done criteria / notes |
|---|---|---|---|---|---|---|---|---|
| App shell | `src/app/AppShell.tsx` | Uses shared button, dialog, popover in places | Grid shell, rail framing, workspace framing, local buttons and layout wrappers | `editor-chrome.css`, utility editor classes | `not audited` | `P1 shell` | `not audited` | Classify shell framing versus global layout contracts |
| Topbar | `src/app/EditorTopbar.tsx` | Uses menubar and page switcher | Topbar framing, action cluster, preview button, local layout wrappers | `editor-chrome.css` | `not audited` | `P1 shell` | `not audited` | Audit whether topbar shell becomes shared or remains a consumer of shared parts |
| Insert rail | `src/panels/InsertPanel.tsx` | Uses shared button and tooltip | Rail entry rows, section separators, local icon/text wrappers | `editor-chrome.css` | `not audited` | `P1 shell` | `not audited` | Likely consumes shared shell/header/status surface pieces |
| Editor sidebar | `src/panels/EditorSidebar.tsx` | Uses shared button | Sidebar shell, header framing, selection summary, local close/header actions | `editor-chrome.css`, `inspector.css` | `not audited` | `P1 shell` | `not audited` | Audit overlap with focused panel and general panel shell |
| Focused panel | `src/panels/FocusedModePanel.tsx` | Limited shared surface use | Floating panel shell, header summary, badges, close affordance | `editor-chrome.css`, `inspector.css` | `not audited` | `P1 shell` | `not audited` | Candidate for shared floating shell and header |
| Panel headers | `src/panels/EditorPanelHeader.tsx` and consumers | Shared button usage only | Header icon/title/description/actions/close pattern | `editor-chrome.css` | `not audited` | `P0 foundation` | `not audited` | Strong candidate for shared composite |
| Settings helpers | `src/components/ui/settings-panel.tsx`, `src/panels/settings/**` | Already shared but narrow | Setting row, action row, compact select row, info tooltip contracts | `editor-chrome.css` | `not audited` | `P2 inspector/settings` | `not audited` | Audit whether settings helpers should expand into inspector/shared control roles |
| Inspector common sections | `src/panels/inspector/CommonSections.tsx`, `src/panels/InspectorPanel.tsx`, `src/panels/InspectorControls.tsx` | Uses button, card, input, label, popover, switch | Summary blocks, cards, warnings, pills, inline editors, repeated groups | `inspector.css`, `editor-chrome.css` | `not audited` | `P2 inspector/settings` | `not audited` | High-volume consumer of repeated editor patterns |
| Font controls | `src/panels/controls/FontControls.tsx` | Uses button, input, popover, select, value-with-unit | Custom font picker layout, weight list, size shell, custom inline field structure | `editor-chrome.css`, `inspector.css` | `not audited` | `P0 foundation` | `not audited` | Known hotspot with likely primitive and composite follow-up |
| Size fields | `src/panels/controls/SizeFields.tsx` | Uses input, label, select, slider, value-with-unit | Custom inline field shell, suffix segment behavior, stats/pill rows | `editor-chrome.css`, `inspector.css` | `not audited` | `P0 foundation` | `not audited` | Known hotspot; likely depends on better shared compact field contracts |
| Number fields | `src/panels/controls/NumberFields.tsx` | Uses input, label, number-input, value-with-unit | Mixed label/layout rows and field grouping | `editor-chrome.css`, `inspector.css` | `not audited` | `P2 inspector/settings` | `not audited` | Audit overlap with size and interaction controls |
| Interaction controls | `src/panels/controls/InteractionControls.tsx` | Uses button, label, tooltip | Group wrappers, option rows, warning/info snippets | `editor-chrome.css`, `inspector.css` | `not audited` | `P2 inspector/settings` | `not audited` | Candidate for shared inspector row/group components |
| Sticky controls | `src/panels/inspector/StickySection.tsx`, `src/panels/MultiStickySection.tsx` | Uses button, label, select, switch | Status surfaces, segmented controls, info copy, mixed-state presentation | `editor-chrome.css`, `inspector.css` | `not audited` | `P2 inspector/settings` | `not audited` | Multi-select parity matters here |
| Layers panel | `src/panels/LayersPanel.tsx` | Uses button, input, popover tooltip | Floating shell, row structure, title editing, badges, actions, empty state | `layers-panel.css`, `editor-chrome.css` | `not audited` | `P3 specialized` | `not audited` | Known hotspot; likely mixed `tree-row` extension plus local drag logic |
| Help dialog | `src/panels/HelpDialog.tsx`, `src/panels/HelpMarkdownDocument.tsx` | Uses button, dialog | Dialog shell, left nav, doc browser framing, local toolbar patterns | `editor-chrome.css`, `help-docs.css` | `not audited` | `P3 specialized` | `not audited` | Audit shared split-pane/list contracts versus local document browser behavior |
| Page editor content | `src/panels/PageEditorContent.tsx` | Uses button, input, label, searchable-select, select, switch, settings helpers | Warning blocks, slug rows, alias chips, section group structure | `editor-chrome.css` | `not audited` | `P3 specialized` | `not audited` | Candidate for reuse of warning/info and compact rows |
| Page tree content | `src/panels/PageTreeContent.tsx` | Uses button, tooltip, tree-row | Local tree framing, action patterns, page-specific row states | `editor-chrome.css` | `not audited` | `P3 specialized` | `not audited` | Audit overlap with layers tree row contracts |
| Page/site/export settings | `src/panels/PagesSiteSettingsContent.tsx`, `src/panels/PagesExportSettingsContent.tsx`, `src/panels/PagesPanel.tsx` | Uses label, input, select, switch, tabs, settings helpers | Warning cards, validation list, local tabs framing, section shells | `editor-chrome.css` | `not audited` | `P3 specialized` | `not audited` | Likely consumers of shared shell/info/group surfaces |
| Manage fonts panel | `src/panels/fontManagement/ManageFontsPanel.tsx` | Uses button, input, tooltip, label, select, switch | Catalog rows, filter toggles, status cards, pager, preview rows | `editor-chrome.css` | `not audited` | `P3 specialized` | `not audited` | Likely reveals pager/list-row shared contracts |
| Dialogs / tooltips / pills / warnings | `src/components/ui/dialog.tsx`, `src/components/ui/popover.tsx`, editor consumers across `src/app` and `src/panels` | Shared primitives exist | Local warning cards, pills, tooltip styling, status surfaces repeated in consumers | `editor-chrome.css` | `not audited` | `P0 foundation` | `not audited` | Audit whether warning/info/pill surfaces belong in DS composite layer |
| Tree row | `src/components/ui/tree-row.tsx` | Shared component exists | Layers/page consumers may still need local row structure and actions | `layers-panel.css`, `editor-chrome.css` | `not audited` | `P0 foundation` | `not audited` | Audit variant model for layers mode versus page-tree mode |
| Page switcher | `src/components/ui/page-switcher-select.tsx` and topbar consumer | Shared component exists | Topbar-specific row layout and create-page affordance may still be specialized | `editor-chrome.css` | `not audited` | `P0 foundation` | `not audited` | Audit whether current specialization is acceptable or should become variant-driven |
| Color picker | `src/components/ui/color-picker.tsx` | Shared primitive exists | Injected style handling, theme sync, third-party overrides | `editor-chrome.css`, internal injected CSS | `not audited` | `P0 foundation` | `not audited` | Known hotspot; audit `!important` and shadow DOM style ownership |
| Tabs / select / searchable-select / value-with-unit | `src/components/ui/tabs.tsx`, `src/components/ui/select.tsx`, `src/components/ui/searchable-select.tsx`, `src/components/ui/value-with-unit.tsx` | Shared primitives exist | Consumer-side size/layout overrides, missing compact or embedded variants | `editor-chrome.css` | `not audited` | `P0 foundation` | `not audited` | Audit primitive API gaps before migrating dense consumers |

## Cross-Cutting Audit Questions

Answer these during classification and keep the findings attached to affected surfaces:

- Which floating shells are duplicated and should become a shared shell contract?
- Which header layouts and close-action patterns are duplicated?
- Which warning, info, pill, and mixed-state surfaces are repeated often enough to become shared?
- Which primitives force consumer-side class overrides because they do not expose the right variant?
- Which selectors in `editor-chrome.css`, `inspector.css`, and `layers-panel.css` are true global contracts versus consumer-specific leftovers?
- Which showcase entries do not yet represent a real editor consumer?
- Which real editor consumers still have no corresponding shared design-system surface?

## Known Hotspots To Classify Early

These should be reviewed before broader consumer migration starts:

- `src/components/ui/color-picker.tsx`
- `src/panels/controls/FontControls.tsx`
- `src/panels/controls/SizeFields.tsx`
- `src/panels/LayersPanel.tsx`
- `src/app/AppChrome.tsx`
- `src/panels/EditorSidebar.tsx`
- `src/styles/editor-chrome.css`

## Wave Targets

These are the execution waves this backlog should eventually map to:

- `Wave A`: foundation primitives and shell contracts
- `Wave B`: shell and navigation consumers
- `Wave C`: inspector and settings composites
- `Wave D`: dense control migrations
- `Wave E`: specialized panels
- `Wave F`: CSS deletion and AI workflow guardrails
