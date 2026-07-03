import type { AiDocumentCommand } from "@/api/ai/types";
import type { DraftBatch } from "@/ai/types/index";
import { AiDraftDiffCard } from "@/panels/ai/AiDraftDiffCard";
import { mockDocument } from "../../mocks";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

const AI_DRAFT_DIFF_CARD_PROPS: PropDefinition[] = [
	{
		name: "draftBatch",
		type: "DraftBatch",
		description:
			"The staged, not-yet-applied AI mutation proposal (`{ id, commands }`) awaiting explicit human approval.",
	},
	{
		name: "document",
		type: "DocumentModel",
		description:
			"Live document, read only to resolve each command's target node and render a meaningful before/after value.",
	},
	{
		name: "onApprove",
		type: "(commands: AiDocumentCommand[]) => void",
		description:
			"Approve action. Its sole UI-layer consumer (AiPanel) calls editorApi.applyAiCommands exactly once, committing the batch as a single undoable entry.",
	},
	{
		name: "onReject",
		type: "() => void",
		description: "Reject/dismiss action. Clears the pending draft; never touches the document.",
	},
	{
		name: "staleError",
		type: "string | null",
		description:
			"Set when a prior approval was rejected at apply time because the draft went stale. Swaps Approve for a Dismiss-and-regenerate affordance.",
	},
];

/**
 * Picks representative real node ids from the mock document so `getNodeById`
 * resolves and the before/after values render against actual node state.
 */
function pickSampleNodeIds(): { textNodeId: string; containerNodeId: string } {
	const nodes = Object.values(mockDocument.nodes);
	const textNode = nodes.find((node) => node.contentType === "text");
	const containerNode = nodes.find(
		(node) => node.contentType === "container",
	);
	return {
		textNodeId: textNode?.id ?? mockDocument.rootId,
		containerNodeId: containerNode?.id ?? mockDocument.rootId,
	};
}

function buildAdditiveDraft(): DraftBatch {
	const { textNodeId, containerNodeId } = pickSampleNodeIds();
	const commands: AiDocumentCommand[] = [
		{ type: "setText", nodeId: textNodeId, field: "name", value: "Hero heading" },
		{ type: "setNodeVisibility", nodeId: containerNodeId, visible: false },
		{ type: "insertText", parentId: containerNodeId },
	];
	return { id: "ds-draft-additive", commands };
}

function buildDestructiveDraft(): DraftBatch {
	const { textNodeId, containerNodeId } = pickSampleNodeIds();
	const commands: AiDocumentCommand[] = [
		{ type: "setText", nodeId: textNodeId, field: "name", value: "Renamed block" },
		{ type: "deleteNode", nodeId: containerNodeId },
	];
	return { id: "ds-draft-destructive", commands };
}

const NOOP = () => undefined;

export function AiSection() {
	return (
		<div>
			<ComponentPreview
				id="composite-ai-draft-diff"
				name="AI Draft Diff Card"
				description="Per-command before/after diff for a staged AI proposal with Approve/Reject. Destructive (deleteNode) rows render visually distinct so a deletion can't be approved by reflex. The stale state swaps Approve for a Dismiss-and-regenerate affordance."
				sourceFile="src/panels/ai/AiDraftDiffCard.tsx"
				props={AI_DRAFT_DIFF_CARD_PROPS}
			>
				<div className="grid gap-4 md:grid-cols-3">
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
							Additive / edit
						</div>
						<div className="w-[340px] max-w-full">
							<AiDraftDiffCard
								draftBatch={buildAdditiveDraft()}
								document={mockDocument}
								onApprove={NOOP}
								onReject={NOOP}
							/>
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
							Includes deletion
						</div>
						<div className="w-[340px] max-w-full">
							<AiDraftDiffCard
								draftBatch={buildDestructiveDraft()}
								document={mockDocument}
								onApprove={NOOP}
								onReject={NOOP}
							/>
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
							Stale draft
						</div>
						<div className="w-[340px] max-w-full">
							<AiDraftDiffCard
								draftBatch={buildAdditiveDraft()}
								document={mockDocument}
								onApprove={NOOP}
								onReject={NOOP}
								staleError="This proposal is out of date and can't be applied — ask the assistant to try again."
							/>
						</div>
					</div>
				</div>
			</ComponentPreview>
		</div>
	);
}
