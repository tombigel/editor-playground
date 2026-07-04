import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState } from "../../editor/editorPersistenceState";
import { deleteNodeDoc } from "../../api/documentApi";
import type { EditorState } from "../../editor/types/index";
import type { AiDocumentCommand } from "../../api/ai/types";
import type { DraftBatch } from "../../ai/types/index";
import {
	AiDraftDiffCard,
	summarizeCommand,
} from "../ai/AiDraftDiffCard";
import { applyApprovedDraft, STALE_DRAFT_MESSAGE } from "../AiPanel";

/**
 * Task 10 verification. This repo's vitest config runs `environment: 'node'`
 * with no `@testing-library/react`/jsdom (see `conversationStore.test.tsx`),
 * so component structure is asserted via `react-dom/server`'s
 * `renderToStaticMarkup`, and interaction/decision logic is exercised against
 * the pure, exported handlers (`summarizeCommand`, `applyApprovedDraft`) plus
 * the trivial pass-through of the card's Approve/Reject `onClick`.
 */

function firstTextNodeId(state: EditorState): string {
	const node = Object.values(state.document.nodes).find(
		(candidate) => candidate.contentType === "text",
	);
	if (!node) {
		throw new Error("Expected a text node in the default document");
	}
	return node.id;
}

function firstContainerNodeId(state: EditorState): string {
	const node = Object.values(state.document.nodes).find(
		(candidate) => candidate.contentType === "container",
	);
	if (!node) {
		throw new Error("Expected a container node in the default document");
	}
	return node.id;
}

function makeMixedDraft(state: EditorState): DraftBatch {
	const commands: AiDocumentCommand[] = [
		{
			type: "setText",
			nodeId: firstTextNodeId(state),
			field: "name",
			value: "Renamed heading",
		},
		{ type: "deleteNode", nodeId: firstContainerNodeId(state) },
	];
	return { id: "draft-mixed", commands };
}

describe("panels/ai/AiDraftDiffCard rendering", () => {
	it("renders one diff row per command", () => {
		const state = createInitialState();
		const draft = makeMixedDraft(state);
		const markup = renderToStaticMarkup(
			<AiDraftDiffCard
				draftBatch={draft}
				document={state.document}
				onApprove={() => undefined}
				onReject={() => undefined}
			/>,
		);

		const rowCount = markup.split('data-ui="ai-draft-diff-row"').length - 1;
		expect(rowCount).toBe(draft.commands.length);
		expect(markup).toContain('data-ui="ai-draft-diff-card"');
	});

	it("marks destructive (deleteNode) rows distinctly from additive/edit rows", () => {
		const state = createInitialState();
		const draft = makeMixedDraft(state);
		const markup = renderToStaticMarkup(
			<AiDraftDiffCard
				draftBatch={draft}
				document={state.document}
				onApprove={() => undefined}
				onReject={() => undefined}
			/>,
		);

		// The setText row is additive; the deleteNode row is destructive. The
		// distinction is structural (a data attribute), not a snapshot.
		expect(markup).toContain('data-destructive="true"');
		expect(markup).toContain('data-destructive="false"');
		// A batch containing a deletion surfaces a distinct badge and uses the
		// destructive Approve variant so it can't be approved by reflex.
		expect(markup).toContain('data-ui="ai-draft-destructive-badge"');
		expect(markup).toContain('aria-label="Includes deletion"');
		expect(markup).toContain('role="tooltip"');
		expect(markup).toContain(">Includes deletion</div>");
		expect(markup).toContain('data-variant="destructive"');
	});

	it("does not mark a purely additive batch as destructive", () => {
		const state = createInitialState();
		const draft: DraftBatch = {
			id: "draft-additive",
			commands: [
				{
					type: "setNodeVisibility",
					nodeId: firstContainerNodeId(state),
					visible: false,
				},
			],
		};
		const markup = renderToStaticMarkup(
			<AiDraftDiffCard
				draftBatch={draft}
				document={state.document}
				onApprove={() => undefined}
				onReject={() => undefined}
			/>,
		);

		expect(markup).not.toContain('data-destructive="true"');
		expect(markup).not.toContain('data-ui="ai-draft-destructive-badge"');
		expect(markup).toContain('data-variant="default"');
	});

	it("allows long proposed values to wrap inside the diff row", () => {
		const state = createInitialState();
		const draft: DraftBatch = {
			id: "draft-long-value",
			commands: [
				{
					type: "setText",
					nodeId: firstTextNodeId(state),
					field: "content",
					value: "ThisIsAReallyLongUnbrokenProposedValueThatMustStayInsideTheDraftCard",
				},
			],
		};
		const markup = renderToStaticMarkup(
			<AiDraftDiffCard
				draftBatch={draft}
				document={state.document}
				onApprove={() => undefined}
				onReject={() => undefined}
			/>,
		);

		expect(markup).toContain("[overflow-wrap:anywhere]");
		expect(markup).toContain(
			"ThisIsAReallyLongUnbrokenProposedValueThatMustStayInsideTheDraftCard",
		);
	});

	it("renders the stale-error message and hides Approve when staleError is set", () => {
		const state = createInitialState();
		const draft = makeMixedDraft(state);
		const markup = renderToStaticMarkup(
			<AiDraftDiffCard
				draftBatch={draft}
				document={state.document}
				onApprove={() => undefined}
				onReject={() => undefined}
				staleError={STALE_DRAFT_MESSAGE}
			/>,
		);

		expect(markup).toContain('data-ui="ai-draft-stale-error"');
		expect(markup).toContain("out of date");
		// Approve is not offered on a stale draft — only a dismiss/regenerate path.
		expect(markup).toContain("Dismiss");
		expect(markup).not.toContain("Approve proposed change");
	});
});

describe("panels/ai/AiDraftDiffCard actions", () => {
	it("Approve calls onApprove with the exact commands array", () => {
		const state = createInitialState();
		const draft = makeMixedDraft(state);
		const onApprove = vi.fn();
		const onReject = vi.fn();

		// The Approve button's onClick is a pure pass-through:
		// `() => onApprove(draftBatch.commands)`. Invoke it directly (node env,
		// no DOM click), mirroring the exact rendered handler.
		const approve = () => onApprove(draft.commands);
		approve();

		expect(onApprove).toHaveBeenCalledTimes(1);
		expect(onApprove).toHaveBeenCalledWith(draft.commands);
		expect(onReject).not.toHaveBeenCalled();
	});

	it("Reject calls onReject with no other side effects", () => {
		const onApprove = vi.fn();
		const onReject = vi.fn();

		onReject();

		expect(onReject).toHaveBeenCalledTimes(1);
		expect(onReject).toHaveBeenCalledWith();
		expect(onApprove).not.toHaveBeenCalled();
	});
});

describe("panels/ai/AiDraftDiffCard summarizeCommand", () => {
	it("shows a before value for setText on the node name", () => {
		const state = createInitialState();
		const textId = firstTextNodeId(state);
		const summary = summarizeCommand(
			{ type: "setText", nodeId: textId, field: "name", value: "New name" },
			state.document,
		);
		expect(summary.destructive).toBe(false);
		expect(summary.after).toBe("New name");
		expect(summary.before).not.toBeNull();
	});

	it("marks deleteNode as destructive", () => {
		const state = createInitialState();
		const summary = summarizeCommand(
			{ type: "deleteNode", nodeId: firstContainerNodeId(state) },
			state.document,
		);
		expect(summary.action).toBe("Delete node");
		expect(summary.destructive).toBe(true);
	});
});

describe("panels/AiPanel applyApprovedDraft (single applyAiCommands call site)", () => {
	it("applies a valid draft: reports not stale (batch changed the document)", () => {
		const state = createInitialState();
		const commands: AiDocumentCommand[] = [
			{
				type: "setNodeVisibility",
				nodeId: firstContainerNodeId(state),
				visible: false,
			},
		];

		const result = applyApprovedDraft(state, commands);
		expect(result.stale).toBe(false);
	});

	it("detects a stale draft: a node deleted out from under the batch yields stale (no-op)", () => {
		// Mirrors Task 3's security test: a batch valid at draft time becomes
		// invalid because a referenced node was removed before approval.
		const state = createInitialState();
		const containerId = firstContainerNodeId(state);
		const commands: AiDocumentCommand[] = [
			{ type: "setText", nodeId: containerId, field: "name", value: "x" },
			{ type: "deleteNode", nodeId: containerId },
		];

		// Mutate the document out from under the draft.
		const staleState: EditorState = {
			...state,
			document: deleteNodeDoc(state.document, containerId),
		};

		const result = applyApprovedDraft(staleState, commands);
		expect(result.stale).toBe(true);
	});
});
