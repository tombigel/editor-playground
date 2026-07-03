# AI Conversation Guide

The AI assistant is a chat panel for inspecting and changing the current editor document. It can answer questions about the document, propose small edits, and help with undo/redo and draft approval. It is not a general site builder yet: every real edit has to fit the limited tool set listed below, and proposed edits become drafts before they touch the document.

Type `help` or `/help` in the AI panel to open this guide.

Use `Cmd + K` on macOS or `Ctrl + K` on Windows/Linux to open or close the AI panel.

## Models

The AI panel currently uses **OpenRouter only**. OpenRouter is the service that actually runs the model. Editor Playground sends your chat request directly from your browser to OpenRouter using your own OpenRouter API key.

That means:

- you need an OpenRouter key even for free models
- the key is stored in your browser's local storage
- Editor Playground does not proxy the request through its own server
- model limits, outages, prices, and rate limits come from OpenRouter and the selected model

Open Settings -> AI Assistant to add a key, pick a model, check the connection, and refresh usage.

### Automatic choices

The first model choices let OpenRouter pick for you:

| Choice | Plain-English version | Best when |
| --- | --- | --- |
| `Free` | OpenRouter picks an available free model. | You are trying the assistant out and can tolerate rate limits. |
| `Floor` | OpenRouter picks through Auto Router, biased toward the cheapest viable model. | You want low cost without hand-picking a model. |
| `Auto` | OpenRouter picks through Auto Router based on the prompt. | You want OpenRouter to choose what it thinks fits the request. |

For automatic choices, the AI panel may show the real model that answered after the response finishes. Before the first response, it only knows that OpenRouter will choose on send.

### Curated direct models

The picker also includes a short curated list so you do not have to choose from OpenRouter's full catalog.

| Tier | Models currently listed | Plain-English version |
| --- | --- | --- |
| `Free` | Laguna XS 2.1, Qwen3 Next 80B | Free and rate-limited. Good for experiments, not guaranteed for heavy use. |
| `Low-cost` | GLM 5.2, Kimi K2 Thinking | Paid, cheaper models chosen for strong cost/value. Usually the practical default for regular use. |
| `Good` | GPT-5.4, Claude Sonnet 5 | Frontier models. Better for hard reasoning and coding, priced accordingly. |

Prices shown in the picker are OpenRouter-style token prices per 1M input/output tokens. In normal-person terms: longer chats, larger documents, and bigger answers cost more than short direct requests.

### Custom model

Choose **Custom Model** only if you already know the exact OpenRouter model id you want to use. The value is sent to OpenRouter as typed. If the id is wrong, unavailable, or does not support the needed tool-calling behavior, the assistant may fail or act less usefully.

### Prompt caching

Prompt caching is an optional cost/performance hint for providers that support it. It marks the assistant's fixed base instructions as cacheable. It does not cache your whole conversation, it does not apply to every provider, and it is fine to leave off unless you know you want it.

## What it can do now

### Answer questions about the document

The assistant can inspect the document tree, selection, active page, page list, validation errors, node ids, node names, node types, visibility, text content, and basic geometry.

Useful prompts:

- `What is selected right now?`
- `List the text blocks on this page.`
- `Find text nodes that mention pricing.`
- `What validation problems are in this document?`
- `Which sections are hidden?`

### Propose simple layout and content edits

When the target and value are clear, the assistant can stage a draft for these operations:

- move or resize a node by setting `x`, `y`, `width`, or `height`
- rename a node
- change plain text or structured text content
- insert text blocks, containers, or existing section templates
- delete nodes
- hide or show nodes
- reparent or reorder nodes
- change sticky settings
- change a container child boundary

Drafts are not applied automatically unless safe auto approve is enabled. You can review the draft card, then approve or reject it.

Useful prompts:

- `Move the selected text 20px right.`
- `Resize this image to 320px wide.`
- `Rename the selected section to Hero.`
- `Hide this block.`
- `Insert a text block in the selected section.`
- `Delete the selected container.`

### Use local controls from chat

Some short messages never go to the model. The app handles them locally.

| Prompt | What happens |
| --- | --- |
| `help` or `/help` | Opens this guide. |
| `show shortcuts` | Opens keyboard shortcuts. |
| `undo`, `revert`, `cancel last change` | Runs editor undo when undo history exists. |
| `redo`, `reapply`, `undo the undo` | Runs editor redo when redo history exists. |
| `approve`, `make the change`, `yes` | Approves a pending draft, only when a draft exists. |
| `reject`, `cancel`, `no` | Rejects a pending draft, only when a draft exists. |

Question-style prompts such as `how do I undo?` open help instead of changing history.

## Prompting tips

Be specific about the target and the value. The assistant sees the current selection, so selecting the thing first makes short prompts work better.

Good patterns:

- `Move the selected block 24px down.`
- `Set this section width to 960px.`
- `Change the selected heading text to "Built for launch week".`
- `Find all image nodes, then tell me which one is selected.`
- `Hide the selected node, but do not delete it.`

When you want analysis, ask for analysis. When you want an edit, use a clear verb and a concrete target.

If the assistant asks a clarification question, answer with the missing target, value, or direction. If it stages the wrong draft, reject it and restate the request with the selected node, node name, or exact value.

## Prompts that currently will not work

These are reasonable things to ask for, but they are outside the current AI command surface:

- `Paste the thing I copied.`
- `Import this design from Figma.`
- `Add a new page.`
- `Delete the current page.`
- `Change site settings.`
- `Install or manage fonts.`
- `Animate this section.`
- `Make a scroll animation.`
- `Drag this into that container like I would with the mouse.`
- `Edit the code block language/theme/tab size.`
- `Change list marker style.`
- `Export the site and deploy it.`
- `Use a web browser to look up copy or images.`

For those requests, use the editor controls directly or ask a coding agent to add the missing capability to the AI tool surface.

## Safety model

The assistant can query the document freely because query tools are read-only. Mutations are different: model-proposed changes are validated, shown as drafts, and only become real editor changes through the approve path. Approved drafts are revalidated against the current document at apply time, so stale drafts are rejected instead of partially applying.

Safe auto approve is still conservative. It can apply non-destructive, valid drafts through the same approval path, but deletes, stale drafts, empty drafts, and oversized trimmed drafts stay manual.

## Technical reference

For the exact API, tool names, validation rules, and out-of-scope command list, see [API Reference - AI](./API_AI.md).
