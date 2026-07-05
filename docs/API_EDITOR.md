# API Reference - Editor

## Animations

Primary sources:

- `src/animations/animationApi.ts`
- `src/api/animationApi.ts`

Animation APIs cover model updates, preset application, runtime preview support, and shared configuration needed by the editor and site renderers.

## Drag and Drop

Primary source: `src/api/dragDropApi.ts`

The drag-and-drop API is headless. It owns session lifecycle and drop-target resolution so the editor stage does not become the single source of truth for move semantics.

Each drag update stores one resolved placement on the session: target parent, local coordinates, preview position, active guides, drop highlight, axis lock, snap-bypass state, parent-expansion request, and duplicate-requested stub state. Pointer-up commits that placement directly, so the final document mutation cannot diverge from the last visible preview because of a second snap or drop-target pass.

Drag modifiers follow design-tool conventions:

- `Shift`: lock the dominant drag axis while held.
- `Cmd` on macOS / `Ctrl` elsewhere: bypass guide snapping and magnetic boundary snapping while held.
- `Alt` / `Option`: records duplicate-drag intent for a future drag-to-duplicate handoff. Keyboard/menu duplication now uses the duplicate document APIs; drag commit remains a normal move or reparent until that handoff is wired.

Boundary rules remain model/API-owned. The inspector labels this control **Child overflow**. Missing container policy resolves to `anchor` / **Allow overflow**, which keeps the child origin inside the wrapper content box while allowing overflow. `box` / **Keep inside** keeps the full child box inside the content box.

For default `anchor` / **Allow overflow** placement, the resolver can place the child below the current bottom edge and records `resolvedPlacement.parentExpansion` with the required parent height. `finishDragSession()` includes that request on the move/reparent intent so editor callers can apply movement and height growth in one document mutation. Parents authored with `auto` height keep `auto` when this request is applied. `box` / **Keep inside** placement keeps the full child box inside the content box instead.

## Editor State

Primary sources:

- `src/api/editorApi.ts`
- `src/api/editorNavigationApi.ts`
- `src/app/editorState.ts`
- `src/editor/editorMutations.ts`

Editor APIs wrap document-level operations with:

- selection changes
- undo/redo history
- panel/view concerns
- view-model-friendly return shapes

## Editor Navigation And URL State

`editorNavigationApi` is the headless navigation surface for editor deep links and scripted workflows. It keeps navigation out of DOM-click workarounds by representing editor movement as typed state:

- `EditorNavigationUrlState` parses and serializes query parameters for active page, selected node, focused mode, panel target, settings/help target, tour topic/step, and view flags. Supported URL keys are `page`, `select`, `focus-mode`, `panel`, `settings`, `help`, `page-target`, `pages-tab`, `tour`, `step`, `show-hidden`, `sticky-preview`, `animation-preview`, `grid`, `debug`, and `spacers`.
- `EditorNodeTarget` resolves stable node queries such as name, type, sticky capability, and selectable/visible nodes instead of requiring generated ids.
- `EditorViewFlags` applies editor-only UI flags without mutating the document model.
- `EditorPanelState` and `EditorPanelRequest` describe transient panel operations for settings, help, components, pages, fonts, shortcuts, section templates, text types, and media types.

The app shell should consume these APIs for URL-driven or scripted navigation before feature-specific UI, including showcase tours.

`showcaseTourApi` provides the read-only tour layer on top of that contract. Tour configs validate topics and steps, resolve URL-derived `tour` / `step` state, and expose next/back/jump behavior, while every editor movement remains a typed `EditorNavigationUrlState`, `EditorNodeTarget`, or `EditorPanelRequest`.

## Editor Mutations

The editor should delegate important document mutations to pure APIs first, then layer on selection/history behavior through `editorApi` and related state helpers.

`applyAiCommands(state, commands: AiDocumentCommand[])` commits a batch of AI-proposed commands (see `docs/API_AI.md`) as a single, atomic `EditorState` update: it delegates to `applyAiDocumentCommands` (`src/api/ai/commands.ts`), which re-validates every command against the *current* document and applies all-or-nothing. Dispatching the corresponding `{ type: 'applyAiCommands' }` action through `historyReducer` produces exactly one undo/redo history entry for the whole batch — undo reverts every command in the batch together, never one field at a time. If the batch is rejected (a stale draft referencing a node that no longer exists, for example), `applyAiCommands` returns the state unchanged: no document mutation, no history entry.

## Rule Of Thumb

If a behavior matters outside the current editor shell, it should exist in a headless API first and only then be surfaced through editor state.
