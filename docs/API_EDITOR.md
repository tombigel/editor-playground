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
- `src/app/editorState.ts`
- `src/editor/editorMutations.ts`

Editor APIs wrap document-level operations with:

- selection changes
- undo/redo history
- panel/view concerns
- view-model-friendly return shapes

## Editor Mutations

The editor should delegate important document mutations to pure APIs first, then layer on selection/history behavior through `editorApi` and related state helpers.

## Rule Of Thumb

If a behavior matters outside the current editor shell, it should exist in a headless API first and only then be surfaced through editor state.
