import { Pencil, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	createFocusedModeEntry,
	InspectorSectionCard,
} from "../CommonSections";
import type { TextInspectorNode } from "../types";
import type { FocusModeCardProps } from "./shared";

export function RichTextContentSection({
	node,
	focusedMode,
	onEnterFocusedMode,
	onActivateRichEdit,
	onSplitRichTextNode,
	showSplitAction = false,
	headerContent,
	headerAction,
	contentClassName = "px-3 pt-2 pb-3",
}: {
	node: TextInspectorNode;
	onActivateRichEdit?: (nodeId: string) => void;
	onSplitRichTextNode?: (nodeId: string) => void;
	showSplitAction?: boolean;
} & FocusModeCardProps) {
	return (
		<InspectorSectionCard
			title="Content"
			headerContent={headerContent}
			headerAction={headerAction}
			contentClassName={contentClassName}
			focusedModeEntry={createFocusedModeEntry(
				focusedMode ?? null,
				"content",
				onEnterFocusedMode,
			)}
		>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-7 w-full gap-1.5 text-[11px]"
				onClick={() => onActivateRichEdit?.(node.id)}
			>
				<Pencil size={12} />
				Edit rich text
			</Button>
			{showSplitAction ? (
				<div className="mt-2 space-y-1.5">
					<p className="editor-text-muted text-[11px] leading-relaxed">
						Split this rich text into sibling text, code, and list nodes.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 w-full gap-1.5 text-[11px]"
						onClick={() => onSplitRichTextNode?.(node.id)}
					>
						<Scissors size={12} />
						Split into text nodes
					</Button>
				</div>
			) : null}
		</InspectorSectionCard>
	);
}
