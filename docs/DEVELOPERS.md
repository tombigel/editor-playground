# Developers

This section is the development-facing subtree for architecture, workflows, planning, and execution memory.

## Architecture

- [Playground Spec](./PLAYGROUND_SPEC.md)
- [Editor Style Guide](./EDITOR_STYLE_GUIDE.md)
- [Sticky - Principles, Guidelines and Model](./STICKY_RENDER_MODEL.md)
- [Interact A11y](./Interact%20Accessibility%20Discussion.md)

## Workflows

- [How to add docs?](./HELP_BROWSER.md)
- [Console Testing Guide - Animations and Rich Text](./CONSOLE_TEST_GUIDE.md)
- [Deployment](./DEPLOYMENT.md)
- [Project Skills](./SKILLS.md)
- [Changelog](../CHANGELOG.md)

## Commit Conventions

Commits use [Conventional Commits](https://www.conventionalcommits.org/) format, enforced by commitlint. The commit description is automatically added to `CHANGELOG.md` under `[Unreleased]`, categorized by prefix (`feat:` → Added, `fix:` → Fixed, others → Changed). See `/version-bump` skill for full details.

## Planning

- [Playground Roadmap](./PLAYGROUND_ROADMAP.md)
- [Next Stage Brief — Authoring Foundation](./NEXT_STAGE_BRIEF.md)
- execution ledgers, audits, and active workstream briefs/tasklists

## Build Notes

### End-to-end test lanes

The default E2E lane is `pnpm run test:e2e`. It includes the stable stage, settings, smoke, and accessibility coverage that can block a release.

Rich-text stage authoring coverage runs in a separate package: `pnpm run test:e2e:richtext`. This lane exercises Slate selection, floating-toolbar focus, list editing, inline links, and standalone rich text workflows that are still being hardened. Keep it visible during release prep, but do not merge those tests back into the default E2E lane until the selection and toolbar readiness hooks are deterministic.

Known quarantined rich-text cases are marked with `richTextTodo` in `src/stage/tests/Stage.e2e.test.ts`: mouse text selection, multi-block block-type conversion, toolbar font-size persistence, and rich-list Enter behavior. These should be fixed before treating rich-text authoring as release-blocking.

`pnpm run test:e2e:smoke` remains the fast E2E gate included in `pnpm run check`.

### PrismJS in the production bundle

PrismJS language component files (`prismjs/components/prism-*.js`) reference `Prism` as a bare global with no `import` or `require`. This works when loaded via a `<script>` tag (the original design), but breaks in the Rollup production build: the components end up in an ESM chunk where `Prism` is out of scope.

The fix is `prismGlobalsPlugin` in `vite.config.ts`, which injects `import Prism from 'prismjs'` at the top of each language component file during the transform step. This gives Rollup an explicit dependency edge so prismjs core always evaluates before the components.

Setting `window.Prism` manually in `codeHighlight.ts` does not work because static imports are hoisted — the language component side effects execute before any module-body code runs.

## Working Principle

Stable reference should stay in [Reference](./REFERENCE.md). Development guidance and active planning stay here even when they are browseable through the same Help browser.
