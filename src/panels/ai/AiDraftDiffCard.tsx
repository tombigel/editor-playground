import { AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getNodeById } from "@/api/ai/queryTools";
import { flattenTextContent } from "@/api/textConversion";
import type { DocumentModel, DocumentNode } from "@/model/types";
import type { AiDocumentCommand } from "@/api/ai/types";
import type { DraftBatch } from "@/ai/types/index";

/**
 * DESIGN-SYSTEM-FIRST JUSTIFICATION (per `/design-system-first` gate)
 * ------------------------------------------------------------------
 * This is the one genuinely new UI component the agentic-interface feature
 * needs. No existing `src/components/ui/` primitive covers a "per-command
 * approve/reject diff row with destructive-command differentiation":
 *
 *   - `Card`/`ListCard` are generic containers — they carry no per-item
 *     approve/reject action semantics and no before/after diff shape.
 *   - `NoticeSurface`/`InlineNotice` are single-message banners, not a list of
 *     structured, individually-summarized proposed operations.
 *
 * So this component COMPOSES from the existing DS primitives (`Card` as the
 * outer container, `Button` in its `default`/`ghost`/`destructive` variants
 * for the actions) rather than introducing any new base primitive. The novel
 * part — a diff row per proposed command, with destructive (`deleteNode`)
 * proposals rendered visually distinct so they cannot be approved by reflex —
 * is genuinely specific to this feature and belongs here, not in the shared
 * base layer.
 *
 * This component is strictly READ-ONLY with respect to the document: it only
 * looks up node state (via `getNodeById`) to render a meaningful "before"
 * value. It never mutates. Approval flows out through `onApprove`, whose sole
 * UI-layer call site of `editorApi.applyAiCommands` lives in `AiPanel`.
 */

export type AiDraftDiffCardProps = {
	draftBatch: DraftBatch;
	document: DocumentModel;
	onApprove: (commands: AiDocumentCommand[]) => void;
	onReject: () => void;
	/**
	 * Set when a prior approval was rejected at apply time because the draft is
	 * stale (a referenced node changed/was removed since the draft was created).
	 * The draft is intentionally NOT cleared in that case; this surfaces the
	 * situation and offers a way to dismiss and regenerate.
	 */
	staleError?: string | null;
};

type CommandSummary = {
	/** Short verb-phrase label of the operation, e.g. "Set text". */
	action: string;
	/** Human-readable identification of the affected node/parent. */
	target: string;
	/** Current value where a meaningful "before" exists (else null). */
	before: string | null;
	/** Proposed value where a meaningful "after" exists (else null). */
	after: string | null;
	/** True for irreversible/removal operations that must stand out. */
	destructive: boolean;
};

function nodeLabel(node: DocumentNode | undefined, fallbackId: string): string {
	if (!node) {
		return fallbackId;
	}
	return node.name && node.name.trim().length > 0 ? node.name : node.id;
}

function currentTextValue(node: DocumentNode | undefined): string | null {
	if (!node || node.contentType !== "text") {
		return null;
	}
	const flat = flattenTextContent(node.content).trim();
	return flat.length > 0 ? flat : null;
}

/**
 * Resolves a single AI command into a display-only summary, reading the live
 * document for a meaningful "before" value where one applies. Pure and
 * side-effect-free — never mutates the document.
 */
export function summarizeCommand(
	command: AiDocumentCommand,
	document: DocumentModel,
): CommandSummary {
	switch (command.type) {
		case "setText": {
			const node = getNodeById(document, command.nodeId);
			const before =
				command.field === "name"
					? nodeLabel(node, command.nodeId)
					: currentTextValue(node);
			return {
				action: `Set ${command.field}`,
				target: nodeLabel(node, command.nodeId),
				before,
				after: command.value,
				destructive: false,
			};
		}
		case "setRect": {
			const node = getNodeById(document, command.nodeId);
			const before =
				node && node.contentType !== "site"
					? String(node.rect[command.field].base.raw)
					: null;
			return {
				action: `Set ${command.field}`,
				target: nodeLabel(node, command.nodeId),
				before,
				after: command.value,
				destructive: false,
			};
		}
		case "setSticky": {
			const node = getNodeById(document, command.nodeId);
			return {
				action: "Update sticky settings",
				target: nodeLabel(node, command.nodeId),
				before: null,
				after: null,
				destructive: false,
			};
		}
		case "setTextDocumentContent": {
			const node = getNodeById(document, command.nodeId);
			return {
				action: "Replace text content",
				target: nodeLabel(node, command.nodeId),
				before: currentTextValue(node),
				after: null,
				destructive: false,
			};
		}
		case "setNodeVisibility": {
			const node = getNodeById(document, command.nodeId);
			return {
				action: command.visible ? "Show node" : "Hide node",
				target: nodeLabel(node, command.nodeId),
				before: node ? (node.visible ? "visible" : "hidden") : null,
				after: command.visible ? "visible" : "hidden",
				destructive: false,
			};
		}
		case "insertText": {
			const parent = getNodeById(document, command.parentId);
			return {
				action: "Insert new text",
				target: `into ${nodeLabel(parent, command.parentId)}`,
				before: null,
				after: null,
				destructive: false,
			};
		}
		case "insertContainer": {
			const parent = getNodeById(document, command.parentId);
			return {
				action: `Insert new ${command.subtype}`,
				target: `into ${nodeLabel(parent, command.parentId)}`,
				before: null,
				after: null,
				destructive: false,
			};
		}
		case "insertSectionTemplate": {
			return {
				action: "Insert section template",
				target: command.templateId,
				before: null,
				after: null,
				destructive: false,
			};
		}
		case "reparentNode": {
			const node = getNodeById(document, command.nodeId);
			const parent = getNodeById(document, command.newParentId);
			return {
				action: "Move node",
				target: `${nodeLabel(node, command.nodeId)} → ${nodeLabel(parent, command.newParentId)}`,
				before: null,
				after: null,
				destructive: false,
			};
		}
		case "reorderNode": {
			const node = getNodeById(document, command.nodeId);
			return {
				action: `Reorder node (${command.action})`,
				target: nodeLabel(node, command.nodeId),
				before: null,
				after: null,
				destructive: false,
			};
		}
		case "setContainerChildBoundary": {
			const node = getNodeById(document, command.containerId);
			return {
				action: "Set container child boundary",
				target: nodeLabel(node, command.containerId),
				before: null,
				after: command.childBoundary,
				destructive: false,
			};
		}
		case "deleteNode": {
			const node = getNodeById(document, command.nodeId);
			return {
				action: "Delete node",
				target: nodeLabel(node, command.nodeId),
				before: null,
				after: null,
				destructive: true,
			};
		}
		default: {
			// Exhaustiveness guard — a new command variant must add a summary.
			const _exhaustive: never = command;
			return {
				action: "Unknown operation",
				target: JSON.stringify(_exhaustive),
				before: null,
				after: null,
				destructive: false,
			};
		}
	}
}

function DiffRow({ summary }: { summary: CommandSummary }) {
	return (
		<li
			data-ui="ai-draft-diff-row"
			data-destructive={summary.destructive ? "true" : "false"}
			className={cn(
				"editor-bg-subtle flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
				summary.destructive
					? "editor-danger-surface editor-danger-text border-l-2 border-l-[color:var(--editor-danger-border)]"
					: "editor-border-subtle editor-text-strong",
			)}
		>
			{summary.destructive ? (
				<Trash2
					className="mt-0.5 h-3.5 w-3.5 shrink-0"
					aria-hidden="true"
				/>
			) : null}
			<div className="min-w-0 flex-1">
				<div className="font-medium">
					{summary.action}{" "}
					<span className="editor-text-muted font-normal">
						{summary.target}
					</span>
				</div>
				{summary.before !== null || summary.after !== null ? (
					<div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
						{summary.before !== null ? (
							<span className="editor-text-muted line-through decoration-1">
								{summary.before}
							</span>
						) : null}
						{summary.before !== null && summary.after !== null ? (
							<span className="editor-text-muted" aria-hidden="true">
								→
							</span>
						) : null}
						{summary.after !== null ? (
							<span className="editor-text-strong">{summary.after}</span>
						) : null}
					</div>
				) : null}
			</div>
		</li>
	);
}

export function AiDraftDiffCard({
	draftBatch,
	document,
	onApprove,
	onReject,
	staleError,
}: AiDraftDiffCardProps) {
	const summaries = draftBatch.commands.map((command) =>
		summarizeCommand(command, document),
	);
	const hasDestructive = summaries.some((summary) => summary.destructive);

	return (
		<Card data-ui="ai-draft-diff-card" className="rounded-lg">
			<CardContent className="flex flex-col gap-3 p-3">
				<div className="flex items-center justify-between gap-2">
					<div className="editor-text-strong text-xs font-semibold">
						Proposed change
						<span className="editor-text-muted ml-1 font-normal">
							({draftBatch.commands.length}{" "}
							{draftBatch.commands.length === 1 ? "step" : "steps"})
						</span>
					</div>
					{hasDestructive ? (
						<span
							data-ui="ai-draft-destructive-badge"
							className="editor-danger-text inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"
						>
							<AlertTriangle className="h-3 w-3" aria-hidden="true" />
							Includes deletion
						</span>
					) : null}
				</div>

				<ul className="flex flex-col gap-1.5">
					{summaries.map((summary, index) => (
						<DiffRow
							// biome-ignore lint/suspicious/noArrayIndexKey: draft commands are positional and never reordered within a batch render
							key={index}
							summary={summary}
						/>
					))}
				</ul>

				{staleError ? (
					<div
						data-ui="ai-draft-stale-error"
						className="editor-warning-surface editor-warning-text flex items-start gap-2 rounded-lg border px-3 py-2 text-xs"
					>
						<AlertTriangle
							className="mt-0.5 h-3.5 w-3.5 shrink-0"
							aria-hidden="true"
						/>
						<span className="min-w-0 flex-1">{staleError}</span>
					</div>
				) : null}

				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onReject}
						aria-label="Reject proposed change"
					>
						{staleError ? "Dismiss" : "Reject"}
					</Button>
					{staleError ? null : (
						<Button
							type="button"
							variant={hasDestructive ? "destructive" : "default"}
							size="sm"
							onClick={() => onApprove(draftBatch.commands)}
							aria-label="Approve proposed change"
						>
							Approve
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
