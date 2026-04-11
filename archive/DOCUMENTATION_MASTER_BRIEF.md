# Documentation Master Brief

This document is the immutable source brief for the documentation IA and help-browser upgrade workstream.

Execution rules:

- Every fresh agent must read this file first.
- The historical execution ledger is archived at [`archive/DOCUMENTATION_TASKLIST.md`](../archive/DOCUMENTATION_TASKLIST.md).
- If scope changes, update this brief first, then revive or replace the archived tasklist, then code.
- Use the tasklist as the director and memory model for the workstream while it is active.
- Each quantum runs with an exact file allowlist, read-first notes, verification commands, and carried-forward follow-ups.

## Locked IA Decisions

- The help-browser root IA is:
  - `About`
  - `Keyboard shortcuts`
  - `Guides`
  - `Reference`
  - `Developers`
- `About` and `Keyboard shortcuts` remain top-level surfaces.
- The documentation browser defaults to `About` when opened without an explicit entry target.
- `Guides`, `Reference`, and `Developers` render as top-level menu headings instead of clickable root pages.
- `Guides` is the user-facing docs root and starts with a `Getting Started` placeholder guide.
- `Reference` contains stable reference docs, starting with `Overview` and `API Reference`.
- `Developers` contains `Overview`, architecture, workflows, roadmap, briefs, tasklists, and other development-facing material.
- `How to add docs?` moves under `Developers / Workflows`.
- Markdown source files stay flat in `docs/`.
- Images and other documentation assets live under `docs/assets/`.
- Hierarchy is virtual and registry-driven.
- Use a typed registry module, not frontmatter, as the source of truth for hierarchy and nav behavior.
- Aliases are required for moved pages and split anchors.

## IA Refresh Addendum

Follow-up refinement approved after the original rollout:

- keep relative markdown links as the canonical internal cross-doc technique
- replace the left-rail root tree with grouped headings closer to the design-system nav
- remove `Usage` as a root doc and replace it with `Guides`
- let `About` link to relevant help entries instead of showing raw markdown paths
- preserve the existing `Reference` and `Developers` landing markdown as `Overview` child pages

## Non-Goals

- Do not introduce MDX.
- Do not require raw HTML authoring in markdown docs.
- Do not replace the help browser with an external docs generator.
- Do not move markdown files into nested source directories.
- Do not implement search, versioning, or last-updated metadata in this phase.

## Original User Prompt

The following prompt is preserved verbatim from the original user request and subsequent IA clarifications for this workstream:

```text
plan extending documentation to have more levels of nesting and inner pages, making it more "real" docs.
first stages is API reference and moving everything that is development related into a developers sub tree.
i want to keep flat md documents, but have internal linking, submenus, highlighted code snippets and the option for images. what else im not thinking of?

so what are we left with as top level documents?

so no, we want to have the shortcuts as a top level
about, usage (time to start some real editor usage documentation) (how to add docs can move to developers)

add to the plan

use our execution rules from the text component plans
```

## Approved Implementation Plan

The following implementation plan is preserved verbatim from the approved user instruction:

```text
# Documentation IA And Help Browser Upgrade With Execution Ledger

## Summary

Upgrade the existing help browser into a more real docs surface while keeping markdown source files flat in `docs/`. The root IA should be:

- `About`
- `Usage`
- `Reference`
- `Developers`
- `Keyboard shortcuts`

Stage 1 includes both platform and content:
- add a typed docs registry for virtual hierarchy
- add tree nav, breadcrumbs, and in-page TOC
- move `How to add docs?` under `Developers`
- create a new top-level `Usage` section for real editor guidance
- split `API Reference` into a nested `Reference` subtree
- reorganize development material under `Developers`

This workstream should follow the same execution rules as the text-component plans: brief first, persistent tasklist, one quantum at a time, exact file allowlists, read-first notes, verification before commit, and fresh-agent execution.

## Execution Contract

Before any implementation quantum starts, create:

- `docs/DOCUMENTATION_MASTER_BRIEF.md`
- `docs/DOCUMENTATION_TASKLIST.md`

`docs/DOCUMENTATION_MASTER_BRIEF.md` should contain:
- the original user prompt verbatim
- the approved implementation plan verbatim
- locked IA decisions
- non-goals
- execution safeguards

`docs/DOCUMENTATION_TASKLIST.md` should be the live director and memory model with:
- `Shared Progress Summary`
- `Discovered Issues`
- one section per quantum with:
  - `Objective`
  - `Status: pending | in_progress | blocked | done`
  - `Allowed files`
  - `Read-first files and target lines`
  - `Implementation notes`
  - `Verification commands`
  - `Verification result`
  - `Commit SHA`
  - `Open follow-ups carried forward`

Rules, copied in spirit from the text plans:
- Every fresh agent must read the master brief first, then the tasklist.
- Each quantum updates only its own section plus the shared progress summary.
- If scope changes, update the brief first, then the tasklist, then code.
- If new issues are found, record them in `Discovered Issues` instead of solving them ad hoc.
- One quantum at a time, verify it, commit it, stop, then start the next.
- Every quantum uses an exact file allowlist.
- Every target file must be read first and the target ranges recorded before editing.
- Verification before commit is mandatory:
  - `npm run typecheck`
  - relevant `vitest` runs
  - `npm run build`

## IA And Platform Decisions

Root nav stays:

- `About`
- `Usage`
- `Reference`
- `Developers`
- `Keyboard shortcuts`

Section behavior:
- `About` and `Keyboard shortcuts` remain top-level surfaces.
- `Usage` is the user-facing docs root.
- `Reference` contains stable reference docs, starting with `API Reference`.
- `Developers` contains architecture, workflows, roadmap, briefs, tasklists, and other dev-facing docs.
- `How to add docs?` moves to `Developers / Workflows`.

Sourcing/model:
- markdown files stay flat in `docs/`
- images/assets live in `docs/assets/`
- hierarchy is virtual and registry-driven
- use a typed registry module, not frontmatter, as the source of truth
- support aliases for moved pages and split anchors

Help browser UX:
- left tree nav
- breadcrumbs above content
- center markdown pane
- right in-page TOC
- TOC collapses before the main tree on narrow widths

Markdown capabilities:
- relative `.md` links
- heading anchors
- syntax-highlighted fenced code using existing Prism/highlight utilities
- responsive images from `docs/assets/**`
- no MDX or raw-HTML dependency in v1

## Quanta

### Q0: Bootstrap the documentation memory layer

Purpose:
- create the master brief and tasklist before implementation starts

Allowed files:
- `docs/DOCUMENTATION_MASTER_BRIEF.md`
- `docs/DOCUMENTATION_TASKLIST.md`

Deliverables:
- immutable brief with verbatim prompt and approved plan
- seeded tasklist with all quanta below

Verification:
- `npm run typecheck`
- targeted help-doc tests if needed
- `npm run build`

### Q1: Introduce the docs registry and asset pipeline

Purpose:
- replace flat help-doc ordering with a typed registry
- support virtual hierarchy and docs assets

Expected files:
- `scripts/sync-public-assets.mjs`
- `src/panels/helpDocs.ts`
- new registry module under `src/panels/`
- `src/panels/generated/helpDocsManifest.json`
- help-doc tests
- `docs/HELP_BROWSER.md`
- `docs/DOCUMENTATION_TASKLIST.md`

Deliverables:
- registry-driven entries
- support for `docs/assets/**`
- alias-ready metadata model

### Q2: Rebuild the help browser as a docs shell

Purpose:
- move from flat nav to tree + breadcrumbs + TOC

Expected files:
- `src/panels/HelpDialog.tsx`
- `src/panels/HelpMarkdownDocument.tsx`
- `src/styles/help-docs.css`
- relevant tests
- `docs/PLAYGROUND_SPEC.md`
- `docs/DOCUMENTATION_TASKLIST.md`

Deliverables:
- root IA rendering
- tree navigation
- breadcrumbs
- heading TOC
- responsive collapse behavior

### Q3: Add top-level Usage and move How to add docs under Developers

Purpose:
- introduce real user-facing docs
- separate user docs from developer docs

Expected files:
- new `docs/USAGE.md`
- `docs/HELP_BROWSER.md`
- registry definitions
- help-doc tests
- `docs/PLAYGROUND_SPEC.md`
- `docs/DOCUMENTATION_TASKLIST.md`

Deliverables:
- `Usage` landing page covering getting started and core workflows
- `How to add docs?` no longer at root
- `Developers / Workflows` contains docs-authoring guidance

### Q4: Split API Reference into a nested Reference subtree

Purpose:
- turn the monolithic `docs/API.md` into a real reference section

Expected files:
- `docs/API.md`
- new flat API child docs such as:
  - `docs/API_OVERVIEW.md`
  - `docs/API_DOCUMENT_MODEL.md`
  - `docs/API_TEXT.md`
  - `docs/API_EDITOR.md`
  - `docs/API_RENDERING_AND_EXPORT.md`
  - `docs/API_TYPES.md`
- registry definitions
- alias resolution/tests
- `docs/DOCUMENTATION_TASKLIST.md`

Deliverables:
- `Reference / API Reference` landing page
- child pages for the current API sections
- backward-compatible internal link handling for old `docs/API.md#...` links

### Q5: Build the Developers subtree and curate visibility

Purpose:
- reorganize dev-facing docs into a coherent tree without hiding planning work completely

Expected files:
- registry definitions
- `docs/DEVELOPERS.md`
- selected docs updated for cross-links
- help-doc tests
- `docs/DOCUMENTATION_TASKLIST.md`

Developers mapping:
- `Architecture`: `PLAYGROUND_SPEC`, `EDITOR_STYLE_GUIDE`, `STICKY_RENDER_MODEL`
- `Workflows`: `HELP_BROWSER`, `CONSOLE_TEST_GUIDE`, `SKILLS`
- `Planning`: roadmap, briefs, tasklists, audit reports

Deliverables:
- planning docs remain browseable but visually secondary
- stable dev docs appear first in Developers

### Q6: Finish rendering details and harden link stability

Purpose:
- close the quality gaps that make docs feel unfinished

Expected files:
- `src/panels/HelpMarkdownDocument.tsx`
- registry/link helpers
- styles/tests
- `docs/DOCUMENTATION_TASKLIST.md`

Deliverables:
- syntax-highlighted fenced code
- markdown image support
- moved-page aliases
- split-anchor aliases
- TOC extraction that ignores fenced code headings

## Test Plan

Each implementation quantum should add or update targeted tests for:
- registry tree building and ordering
- root IA rendering
- breadcrumb behavior
- TOC extraction and anchor scrolling
- relative markdown links
- alias resolution for moved/split docs
- image asset resolution
- sync-script copying of `docs/*.md` and `docs/assets/**`

Acceptance criteria for the whole workstream:
- top-level nav shows exactly `About`, `Usage`, `Reference`, `Developers`, `Keyboard shortcuts`
- `How to add docs?` lives under `Developers / Workflows`
- `Usage` is enough for a first real editor session
- `API Reference` is a landing page with nested children
- existing internal links continue to work after the API split
- fenced code is highlighted
- markdown images render correctly
- `npm run build` passes

## Assumptions And Defaults

- Flat-source means flat markdown files; assets may live under `docs/assets/`
- Registry metadata is the source of truth for hierarchy and nav behavior
- `About` and `Keyboard shortcuts` remain root entries rather than being absorbed into docs trees
- `Usage` starts as practical onboarding, not a full manual
- Search/versioning/last-updated are deferred
- This workstream should be executed with the same discipline as the text-component plans, including the brief/tasklist memory model and quantum-by-quantum delivery
```

## Execution Safeguards

1. File allowlist: every quantum names exact files. Only edit those.
2. Read-first: read each target before editing and record the target lines in the tasklist.
3. Verify before handoff: run `npm run typecheck`, relevant `vitest` commands, and `npm run build`.
4. Sequential delivery: execute one quantum at a time and verify it before moving on.
5. Fresh context: each quantum is executable by a fresh agent that reads this brief and the tasklist first.
