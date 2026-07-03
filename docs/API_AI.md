# API Reference - AI

## Overview

`src/api/ai/` is a curated command/query surface purpose-built for AI-driven editor control. It follows the same API-first principle as the rest of `src/api/` (see `CLAUDE.md`): every AI-exposed operation is a thin, structurally-typed wrapper over an existing pure `DocumentModel -> DocumentModel` function, never a new mutation path invented for the model's benefit. This surface is the API-layer half of the roadmap's AI initiative (`docs/PLAYGROUND_ROADMAP.md`): `RI-13` (umbrella), `RI-46` ("AI command/interface layer over the public API"), with `RI-47` (bring-your-own-model connection layer) and `RI-48` (conversational editor UI) building on top of it in later work.

This is deliberately a curated subset, not the full `documentApi`/`editorApi` surface: **12 mutation commands** out of 100+ available document functions, plus **8 read-only query tools**. Page/site structure, clipboard/paste, animation, and font operations are intentionally excluded from v1 (see "Deliberately out of scope for v1" below).

### Draft, approve, apply

The AI layer never mutates a document directly. The flow is:

1. **Query tools execute immediately.** They are read-only projections (`getDocumentTree`, `searchNodesByText`, etc.) and can run freely without any approval step — there is nothing to undo.
2. **Mutation tools are never applied directly.** A model requesting a mutation (e.g. `setRect`, `deleteNode`) produces a proposed `AiDocumentCommand[]` batch. That batch is validated and staged as a **draft** — a proposal the user can inspect, not a change that has happened.
3. **Only the UI approval path commits a draft.** `editorApi.applyAiCommands` (see `docs/API_EDITOR.md`) is the single function that turns an approved draft into an actual document mutation. Manual approval and the optional safe auto-approve preference both call the same UI-layer approval path, revalidate against the current document, and commit the entire batch as **one undoable history entry**. Auto approve never applies destructive deletes, stale drafts, or trimmed oversized drafts.

This mirrors the `documentApi` -> `editorApi` layering used everywhere else in the codebase: `src/api/ai/commands.ts` is the pure model layer (`applyAiDocumentCommands`), and `editorApi.applyAiCommands` is the thin selection/history wrapper the eventual editor UI calls.

### Request routing and command-aware context

Before a user message is sent to a model, the AI panel runs a shallow request router (`src/ai/requestRouting.ts`). This is not a full natural-language parser. It detects only high-confidence local routes:

- help requests such as `help`, `/help`, `how do I`, `show shortcuts`, or `docs`
- history controls such as `undo`, `revert`, `cancel last change`, `redo`, `reapply`, or `undo the undo`
- draft controls such as `approve`, `make the change`, `reject`, or `cancel` when a pending draft exists (only short bare confirmations; longer mixed-intent replies are sent to the model)
- likely direct editor operations containing words such as `move`, `nudge`, `delete`, `hide`, `show`, `rename`, `resize`, `set`, or `change`

Help detection takes precedence over history and draft controls, so question-form phrasing (e.g. "how do I undo…") opens help instead of mutating history. Draft-control, history-control, and help routes are handled locally by the app: draft approval/rejection uses the same approve/reject path as the draft card, undo/redo dispatches the editor's existing history actions when the corresponding stack is available, and help requests open the existing Help or Shortcuts surfaces. Bare `help` / `/help`, prompt guidance, "what can you do", and AI tool questions open the user-facing [AI Conversation Guide](./AI_CONVERSATION_GUIDE.md); the technical `docs/API_AI.md` page remains the API contract. If safe auto approve is enabled, newly staged non-destructive drafts are approved through that same path without waiting for a separate click; delete drafts, stale drafts, and overflow-trimmed drafts stay staged for manual review. Redo is intentionally narrower than undo: explicit `redo` / `reapply` wording or phrases such as `undo the undo` redo, while `undo`, `revert`, and `cancel last change` undo. Direct-operation routes still go to the selected model, but the request history is enriched with current selection context, selected node summaries, rect values, visibility, and text previews. The system prompt tells the model to draft an available mutation tool call immediately when the target/action/value are clear, and to ask one concise clarification when they are fuzzy.

The chat loop treats read-only query tool results as internal provider context rather than human transcript content. If a model turn only gathers data, the panel records the assistant tool call and the tool result for OpenRouter-compatible follow-up history, hides both from the visible transcript, and sends a follow-up turn so the model can summarize the result in normal language. The system prompt requires concise human-readable answers with a clear next action, and forbids raw JSON, full node objects, complete tool results, or long data dumps unless the user explicitly asks for raw/debug/exhaustive output.

## Query Tools

Source: `src/api/ai/queryTools.ts`

All read-only. None of these return a full `DocumentModel`, and none mutate their inputs — each is a thin wrapper/composition over an existing, already-tested selector.

| Tool | Purpose | Wraps |
| --- | --- | --- |
| `getDocumentTree` | Returns a lightweight, nested tree projection of the whole document (ids, content types, subtypes, names, visibility, parent/child structure) starting at `document.rootId`. Omits style/rect/content payloads by design. | `document.nodes` traversal from `rootId` |
| `getNodeById` | Returns the full node data for a single node id, or `undefined` if missing. | `getNode` (`model/selectors`) |
| `getSelection` | Returns the current editor selection (`selectedId`, `selectedIds`). | `EditorState.selectedId` / `selectedIds` |
| `searchNodesByType` | Finds all nodes matching a top-level content type (`container` \| `text` \| `media`) or concrete subtype (`section`, `image`, `block`, etc.). | `document.nodes` filter |
| `searchNodesByText` | Finds text nodes whose flattened text content includes a query string (case-insensitive). | `flattenTextContent` (`textConversion.ts`) |
| `getPageList` | Returns the list of pages in the site. | `document.pages` |
| `getActivePage` | Resolves the currently active page from `editorState.activePageId`, falling back to the home page. | `getHomePage` (`pageApi.ts`) |
| `getValidationErrors` | Returns a flat list of human-readable document + link validation errors. | `validateDocument`, `validateLinks` (`model/validation`) |

`AiDocumentTreeNode` is the return shape of `getDocumentTree`: `{ id, contentType, subtype, name, visible, children }`, recursively nested.

`AiNodeSearchType` is the accepted `nodeType` vocabulary for `searchNodesByType`: top-level content types (`container`, `text`, `media`) plus concrete subtypes (`section`, `header`, `footer`, `group`, `block`, `rich`, `code`, `list`, `image`, `video`, `svg`, `embed`).

## Mutation Commands

Source: `src/api/ai/commands.ts`, `src/api/ai/types/index.ts`, `src/api/ai/validation.ts`

`AiDocumentCommand` is a 12-variant discriminated union. Each variant delegates to exactly one existing `documentApi` (`*Doc`) function — `src/api/ai/commands.ts` introduces no new mutation logic, only dispatch and validation wrapping. `validateAiCommand` (`src/api/ai/validation.ts`) runs a pre-flight check on every command before it can be applied; the notes below describe its actual per-variant rule, not just the field shape.

| Variant | Fields | Wraps | Validation rule |
| --- | --- | --- | --- |
| `setRect` | `nodeId`, `field: 'x' \| 'y' \| 'width' \| 'height'`, `value: string` | `setNodeRect` | Node must exist and not be the site root (no rect); `value` capped at `MAX_TEXT_VALUE_LENGTH` (10,000 chars) |
| `setSticky` | `nodeId`, `patch: Partial<StickyDefinition>` | `setNodeSticky` | Node must exist and not be the site root (no sticky field) |
| `setText` | `nodeId`, `field: EditorTextField`, `value: string` | `setTextNodeContentDoc` | Node must exist and be a text node; `value` capped at `MAX_TEXT_VALUE_LENGTH` |
| `setTextDocumentContent` | `nodeId`, `content: TextDocumentContent`, `options?: SetTextDocumentContentOptions` | `setTextDocumentContentDoc` | Node must exist and be a text node; `content` must have an array `blocks` field (rejects malformed content shapes) |
| `insertText` | `parentId` | `insertTextDoc` | Parent node must exist and be able to hold children (`container` or `site` content type) |
| `insertContainer` | `subtype: ContainerSubtype`, `parentId` | `insertContainerDoc` | Parent node must exist and be able to hold children |
| `insertSectionTemplate` | `templateId: SectionTemplateId`, `options?: { selectedId?, pageId? }` | `insertSectionTemplateDoc` | `templateId` must be a known id in `SECTION_TEMPLATES`; if provided, `options.selectedId` and `options.pageId` must reference existing nodes/pages |
| `deleteNode` | `nodeId` | `deleteNodeDoc` | Node must exist, must not be the site root, and must have a parent (root-level structural nodes cannot be deleted) |
| `setNodeVisibility` | `nodeId`, `visible: boolean` | `setNodeVisibilityDoc` | Node must exist and not be the site root |
| `reparentNode` | `nodeId`, `newParentId` | `reparentNodeDoc` | Node must exist and not be the site root; `newParentId` must reference an existing container node; a node cannot be reparented into itself |
| `reorderNode` | `nodeId`, `action: NodeOrderAction` | `reorderNodeDoc` | Node must exist, not be the site root, and have a parent; `action` must be one of `back`, `forward`, `sendToBack`, `bringToFront` |
| `setContainerChildBoundary` | `containerId`, `childBoundary: ContainerChildBoundary` | `setContainerChildBoundaryDoc` | `containerId` must reference an existing container node; `childBoundary` must be `anchor` or `box` |

Every validation failure returns a specific, human-readable rejection reason (`{ valid: false, reason }`) rather than a generic error — this is what the eventual draft-diff UI surfaces to the user for a rejected command.

`AI_TOOL_MANIFEST` (`src/api/ai/toolManifest.ts`) is the single source of truth for the full 20-tool surface (8 query + 12 mutation) exposed to the model — names, descriptions, and JSON-schema-ish `parameters`. Orchestration code (system prompt generation) is expected to interpolate from this array rather than duplicating tool descriptions by hand.

## All-or-Nothing Apply And Stale Drafts

`applyAiDocumentCommands(document, commands)` re-validates **every command in the batch against the current `document` argument**, immediately before applying anything — not against whatever document existed when the draft was first proposed. It has no notion of "draft time"; it only ever sees the document as it is at the moment it is called. This matters because a draft can go stale: the document may change between when a batch is proposed and when the user clicks Approve (via normal editor use, or even a second approved AI batch), and several underlying `*Doc` functions silently no-op on a missing node id rather than throwing.

If **any** command in the batch fails validation at apply time, the whole batch is rejected: `AiCommandBatchRejectedError` is thrown, carrying one `reason` string per failing command (in batch order), and **zero commands from the batch are applied** — not even the ones that would have validated successfully. This all-or-nothing guarantee is what keeps "what you approved is what happened" true: a user who approves a 5-command batch either gets all 5 changes as one undoable action, or gets none of them plus a clear explanation, never a silent partial result.

`editorApi.applyAiCommands` (`docs/API_EDITOR.md`) builds on this: if the underlying batch is rejected, the editor state is returned unchanged — no document mutation, no history entry. The eventual UI is expected to treat a caught `AiCommandBatchRejectedError` as a "this draft is stale, please regenerate" state, not a silent no-op.

## Deliberately Out Of Scope For v1

The following are intentionally not part of the v1 AI command surface — natural "command #13" additions later, not a redesign:

- Clipboard / paste operations
- Animation operations
- Font management
- Page / site structural operations (add/delete page, reparent page, site settings)
- Drag-drop session APIs
- Code-block / rich-list specific setters (language, theme, tab size, wrap, list marker style, etc. beyond what `setText` / `setTextDocumentContent` already cover)

## Read Next

- [AI Conversation Guide](./AI_CONVERSATION_GUIDE.md) for end-user capabilities, prompt guidance, and examples that currently do not work
- [Editor](./API_EDITOR.md) for the `editorApi.applyAiCommands` commit path (selection/history wrapping over this layer)
- [Types](./API_TYPES.md) for the underlying document type surfaces referenced by AI commands
