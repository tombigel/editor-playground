# API Reference - Editor

## Animations

Primary sources:

- `src/animations/animationApi.ts`
- `src/api/animationApi.ts`

Animation APIs cover model updates, preset application, runtime preview support, and shared configuration needed by the editor and site renderers.

## Drag and Drop

Primary source: `src/api/dragDropApi.ts`

The drag-and-drop API is headless. It owns session lifecycle and drop-target resolution so the editor stage does not become the single source of truth for move semantics.

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

- `EditorNavigationUrlState` parses and serializes query parameters for active page, selected node, focused mode, panel target, settings/help target, tour topic/step, and view flags.
- `EditorNodeTarget` resolves stable node queries such as name, type, sticky capability, and selectable/visible nodes instead of requiring generated ids.
- `EditorViewFlags` applies editor-only UI flags without mutating the document model.
- `EditorPanelState` and `EditorPanelRequest` describe transient panel operations for settings, help, components, pages, fonts, shortcuts, section templates, and text types.

The app shell should consume these APIs for URL-driven or scripted navigation before feature-specific UI, including showcase tours.

## Editor Mutations

The editor should delegate important document mutations to pure APIs first, then layer on selection/history behavior through `editorApi` and related state helpers.

## Rule Of Thumb

If a behavior matters outside the current editor shell, it should exist in a headless API first and only then be surfaced through editor state.
