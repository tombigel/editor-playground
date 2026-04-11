# Documentation Tasklist

This file is the live director and memory model for the documentation IA and help-browser upgrade workstream.

Execution rules:

- Every fresh agent must read [`DOCUMENTATION_MASTER_BRIEF.md`](./DOCUMENTATION_MASTER_BRIEF.md) first.
- Each quantum updates only its own section and the shared progress summary.
- If scope changes, update the master brief first, then this tasklist, then code.
- If new issues are discovered, add them to `Discovered Issues` instead of solving them ad hoc.
- Execute one quantum at a time, verify it, then move to the next quantum.

## Shared Progress Summary

- Overall status: `done`
- Current quantum: `none`
- Last completed quantum: `Q7`
- Next quantum after current: `none`
- Locked assumptions:
  - Root IA is `About`, `Keyboard shortcuts`, `Guides`, `Reference`, `Developers`.
  - `Guides`, `Reference`, and `Developers` render as grouped headings, not clickable root pages.
  - Markdown files stay flat in `docs/`; docs assets may live in `docs/assets/`.
  - The help browser remains an in-app docs surface, not an external docs generator.
  - Registry metadata is the source of truth for hierarchy, labels, ordering, and aliases.
  - `How to add docs?` moves under `Developers / Workflows`.
  - `Reference` and `Developers` keep their existing markdown landing content as `Overview` child pages.

## Discovered Issues

- None recorded currently.

## Q7: Refresh the help browser IA around grouped roots and guides

- Objective:
  - Replace the old `Usage` root with a `Guides` group.
  - Render grouped roots as section headings in the left nav.
  - Convert the help-browser `About` page from raw paths to real help-entry links.
- Status: `done`
- Allowed files:
  - `docs/DOCUMENTATION_MASTER_BRIEF.md`
  - `docs/DOCUMENTATION_TASKLIST.md`
  - `docs/GETTING_STARTED.md`
  - `docs/HELP_BROWSER.md`
  - `docs/PLAYGROUND_SPEC.md`
  - `src/panels/helpDocRegistry.ts`
  - `src/panels/helpDocs.ts`
  - `src/panels/HelpDialog.tsx`
  - `src/panels/AboutContent.tsx`
  - `src/panels/AboutDialog.tsx`
  - `src/app/EditorTopbar.tsx`
  - `src/app/AppShell.tsx`
  - help-doc related tests
- Read-first files and target lines:
  - `docs/DOCUMENTATION_MASTER_BRIEF.md:1-120`
  - `docs/DOCUMENTATION_TASKLIST.md:1-220`
  - `docs/HELP_BROWSER.md:1-120`
  - `docs/PLAYGROUND_SPEC.md:1210-1260`
  - `src/panels/helpDocRegistry.ts:1-220`
  - `src/panels/helpDocs.ts:1-280`
  - `src/panels/HelpDialog.tsx:1-360`
- Implementation notes:
  - Keep relative `.md` links as the canonical internal-link mechanism.
  - Add a flat `Getting Started` markdown file under a new `Guides` root section.
  - Preserve old `docs/USAGE.md` links through registry aliasing.
  - Keep `Reference` and `Developers` content as `Overview` child pages.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/AboutContent.test.tsx src/app/tests/AppShell.test.tsx`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/AboutContent.test.tsx src/app/tests/AppShell.test.tsx`: passed, 4 files / 26 tests
  - `npm run build`: passed
- Commit SHA:
  - Not committed in this session
- Open follow-ups carried forward:
  - None currently.

## Q0: Bootstrap the documentation memory layer

- Objective:
  - Save the original user prompt verbatim together with the approved implementation plan in `docs/`.
  - Create the persistent tasklist that directs the remaining work.
- Status: `done`
- Allowed files:
  - `docs/DOCUMENTATION_MASTER_BRIEF.md`
  - `docs/DOCUMENTATION_TASKLIST.md`
- Read-first files and target lines:
  - `AGENTS.md:1-79`
  - `docs/PLAYGROUND_SPEC.md:1200-1265`
  - `docs/TEXT_COMPONENT_MASTER_BRIEF.md:1-220`
  - `docs/TEXT_COMPONENT_TASKLIST.md:1-220`
  - Original user prompt and approved implementation plan from conversation history
- Implementation notes:
  - Mirror the text-workstream execution contract closely.
  - Seed all remaining quanta with allowlists, read-first notes, verification slots, and carry-forward fields.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/HelpMarkdownDocument.test.tsx`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/HelpMarkdownDocument.test.tsx`: passed, 3 files / 11 tests
  - `npm run build`: passed
- Commit SHA:
  - Not committed in this session
- Open follow-ups carried forward:
  - Q1 starts only after the brief/tasklist exist and Q0 verification passes.

## Q1: Introduce the docs registry and asset pipeline

- Objective:
  - Replace flat help-doc ordering with a typed registry.
  - Support virtual hierarchy, metadata, and docs assets.
- Status: `done`
- Allowed files:
  - `scripts/sync-public-assets.mjs`
  - `src/panels/helpDocs.ts`
  - `src/panels/helpDocRegistry.ts`
  - `src/panels/generated/helpDocsManifest.json`
  - `src/panels/tests/helpDocs.test.ts`
  - `docs/HELP_BROWSER.md`
  - `docs/DOCUMENTATION_TASKLIST.md`
- Read-first files and target lines:
  - `scripts/sync-public-assets.mjs:1-80`
  - `src/panels/helpDocs.ts:1-200`
  - `src/panels/generated/helpDocsManifest.json:1-120`
  - `src/panels/tests/helpDocs.test.ts:1-120`
- Implementation notes:
  - Introduce registry-driven root entries and section nodes.
  - Preserve flat markdown sourcing while copying `docs/assets/**`.
  - Add alias-ready metadata for moved docs and split anchors.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/panels/tests/helpDocs.test.ts`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/HelpMarkdownDocument.test.tsx src/app/tests/AppShell.test.tsx`: passed, 4 files / 27 tests
  - `npm run build`: passed
- Commit SHA:
  - Not committed in this session
- Open follow-ups carried forward:
  - Q2 should consume the registry directly instead of recreating grouping rules inside the dialog component.

## Q2: Rebuild the help browser as a docs shell

- Objective:
  - Move from flat nav to tree navigation, breadcrumbs, and in-page TOC.
- Status: `done`
- Allowed files:
  - `src/panels/HelpDialog.tsx`
  - `src/panels/HelpMarkdownDocument.tsx`
  - `src/styles/help-docs.css`
  - `src/panels/tests/HelpDialog.test.tsx`
  - `src/panels/tests/HelpMarkdownDocument.test.tsx`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/DOCUMENTATION_TASKLIST.md`
- Read-first files and target lines:
  - `src/panels/HelpDialog.tsx:1-320`
  - `src/panels/HelpMarkdownDocument.tsx:1-220`
  - `src/styles/help-docs.css:1-140`
  - `src/components/ui/tree-row.tsx:1-220`
  - `src/panels/tests/HelpDialog.test.tsx:1-120`
  - `src/panels/tests/HelpMarkdownDocument.test.tsx:1-120`
- Implementation notes:
  - Reuse shared dialog/tree primitives and existing editor tokens.
  - Add a TOC rail that collapses before the primary nav on narrow widths.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/panels/tests/HelpDialog.test.tsx src/panels/tests/HelpMarkdownDocument.test.tsx`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/HelpMarkdownDocument.test.tsx src/app/tests/AppShell.test.tsx`: passed, 4 files / 27 tests
  - `npm run build`: passed
- Commit SHA:
  - Not committed in this session
- Open follow-ups carried forward:
  - Q6 should finish remaining markdown rendering details and link hardening.

## Q3: Add top-level Usage and move How to add docs under Developers

- Objective:
  - Introduce real user-facing docs.
  - Separate user docs from developer docs.
- Status: `done`
- Allowed files:
  - `docs/USAGE.md`
  - `docs/HELP_BROWSER.md`
  - `src/panels/helpDocRegistry.ts`
  - `src/panels/tests/helpDocs.test.ts`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/DOCUMENTATION_TASKLIST.md`
- Read-first files and target lines:
  - `docs/HELP_BROWSER.md:1-120`
  - `docs/PLAYGROUND_SPEC.md:1214-1242`
  - `src/panels/helpDocRegistry.ts:1-220`
  - `src/panels/tests/helpDocs.test.ts:1-120`
- Implementation notes:
  - `Usage` should cover getting started and core editor workflows.
  - `How to add docs?` should no longer appear as a root entry.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/HelpMarkdownDocument.test.tsx src/app/tests/AppShell.test.tsx`: passed, 4 files / 27 tests
  - `npm run build`: passed
- Commit SHA:
  - Not committed in this session
- Open follow-ups carried forward:
  - Q5 should place the moved docs-authoring page under `Developers / Workflows`.

## Q4: Split API Reference into a nested Reference subtree

- Objective:
  - Turn the monolithic `docs/API.md` into a real reference section.
- Status: `done`
- Allowed files:
  - `docs/API.md`
  - `docs/API_OVERVIEW.md`
  - `docs/API_DOCUMENT_MODEL.md`
  - `docs/API_TEXT.md`
  - `docs/API_EDITOR.md`
  - `docs/API_RENDERING_AND_EXPORT.md`
  - `docs/API_TYPES.md`
  - `src/panels/helpDocRegistry.ts`
  - `src/panels/helpDocs.ts`
  - `src/panels/tests/helpDocs.test.ts`
  - `docs/DOCUMENTATION_TASKLIST.md`
- Read-first files and target lines:
  - `docs/API.md:1-240`
  - `src/panels/helpDocRegistry.ts:1-260`
  - `src/panels/helpDocs.ts:1-220`
  - `src/panels/tests/helpDocs.test.ts:1-120`
- Implementation notes:
  - Keep `docs/API.md` as the landing page for the reference subtree.
  - Add aliases so old `docs/API.md#...` links continue to resolve after the split.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpMarkdownDocument.test.tsx`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/HelpMarkdownDocument.test.tsx src/app/tests/AppShell.test.tsx`: passed, 4 files / 27 tests
  - `npm run build`: passed
- Commit SHA:
  - Not committed in this session
- Open follow-ups carried forward:
  - Q6 should harden any remaining split-anchor alias cases discovered during integration.

## Q5: Build the Developers subtree and curate visibility

- Objective:
  - Reorganize dev-facing docs into a coherent tree without hiding planning work completely.
- Status: `done`
- Allowed files:
  - `docs/DEVELOPERS.md`
  - `docs/HELP_BROWSER.md`
  - `docs/PLAYGROUND_SPEC.md`
  - `src/panels/helpDocRegistry.ts`
  - `src/panels/tests/helpDocs.test.ts`
  - `src/panels/tests/HelpDialog.test.tsx`
  - `docs/DOCUMENTATION_TASKLIST.md`
- Read-first files and target lines:
  - `docs/PLAYGROUND_SPEC.md:1214-1242`
  - `docs/HELP_BROWSER.md:1-120`
  - `src/panels/helpDocRegistry.ts:1-320`
  - `src/panels/tests/helpDocs.test.ts:1-120`
  - `src/panels/tests/HelpDialog.test.tsx:1-120`
- Implementation notes:
  - Stable architecture/workflow docs should appear before planning docs.
  - Planning docs remain browseable but should be visually secondary.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/HelpMarkdownDocument.test.tsx src/app/tests/AppShell.test.tsx`: passed, 4 files / 27 tests
  - `npm run build`: passed
- Commit SHA:
  - Not committed in this session
- Open follow-ups carried forward:
  - Any further triage of stale planning docs should be treated as a separate maintenance pass, not folded into this IA change.

## Q6: Finish rendering details and harden link stability

- Objective:
  - Close the remaining rendering and navigation quality gaps that make docs feel unfinished.
- Status: `done`
- Allowed files:
  - `src/panels/HelpMarkdownDocument.tsx`
  - `src/panels/helpDocs.ts`
  - `src/styles/help-docs.css`
  - `src/panels/tests/HelpMarkdownDocument.test.tsx`
  - `src/panels/tests/helpDocs.test.ts`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/DOCUMENTATION_TASKLIST.md`
- Read-first files and target lines:
  - `src/panels/HelpMarkdownDocument.tsx:1-220`
  - `src/panels/helpDocs.ts:1-220`
  - `src/styles/help-docs.css:1-140`
  - `src/panels/tests/HelpMarkdownDocument.test.tsx:1-120`
  - `src/panels/tests/helpDocs.test.ts:1-120`
- Implementation notes:
  - Use the existing code-highlighting utilities for fenced code blocks.
  - Support markdown images from docs assets.
  - Ensure TOC extraction ignores fenced code headings.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpMarkdownDocument.test.tsx src/panels/tests/HelpDialog.test.tsx`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/panels/tests/helpDocs.test.ts src/panels/tests/HelpDialog.test.tsx src/panels/tests/HelpMarkdownDocument.test.tsx src/app/tests/AppShell.test.tsx`: passed, 4 files / 27 tests
  - `npm run build`: passed
- Commit SHA:
  - Not committed in this session
- Open follow-ups carried forward:
  - None yet.
