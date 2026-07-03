import { Pencil, RotateCcw } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { PopoverTooltip } from "@/components/ui/popover";
import { NoticeSurface } from "@/components/ui/settings-panel";
import type { ConversationMessage } from "@/ai/types/index";
import { CURATED_MODELS } from "@/ai/providers/curatedModels";
import { cn, DARK_TOOLTIP_CLASS } from "@/lib/utils";

/**
 * Read-only transcript renderer for the AI assistant panel (Task 9).
 *
 * Renders `ConversationMessage[]` from `useAiConversation()` with each role
 * styled distinctly:
 *   - `user`   — accent-tinted bubble, right-aligned.
 *   - `assistant` — surface bubble, markdown-rendered (react-markdown + gfm,
 *      already a dependency; the same stack HelpMarkdownDocument uses).
 *   - internal tool messages — hidden from the human transcript; they are
 *     provider context, not assistant copy.
 *   - `system` — not shown (system prompt is transport-only).
 *
 * The optional `streamingText` renders as an in-progress assistant bubble
 * below the persisted transcript while a turn is streaming.
 */

type AiMessageListProps = {
	messages: ConversationMessage[];
	streamingText: string;
	streaming: boolean;
	onEditPrompt?: (message: ConversationMessage) => void;
	onRerunPrompt?: (message: ConversationMessage) => void;
};

export function AiMessageList({
	messages,
	streamingText,
	streaming,
	onEditPrompt,
	onRerunPrompt,
}: AiMessageListProps) {
	const visible = messages.filter(
		(message) => message.role !== "system" && !message.internal,
	);

	if (visible.length === 0 && !streaming) {
		return (
			<NoticeSurface
				tone="info"
				className="border-dashed py-8 text-center text-sm"
			>
				Ask a question about your document to get started.
			</NoticeSurface>
		);
	}

	return (
		<div className="flex flex-col gap-2.5">
			{visible.map((message) => (
				<AiMessageBubble
					key={message.id}
					message={message}
					onEditPrompt={onEditPrompt}
					onRerunPrompt={onRerunPrompt}
				/>
			))}
			{streaming ? (
				<div
					className="editor-bg-subtle editor-border-subtle editor-text-strong self-start rounded-lg border px-3 py-2 text-sm"
					data-ai-role="assistant"
					data-ai-streaming="true"
				>
					{streamingText.length > 0 ? (
						<Markdown remarkPlugins={[remarkGfm]}>{streamingText}</Markdown>
					) : (
						<span className="editor-text-muted text-xs">Thinking…</span>
					)}
				</div>
			) : null}
		</div>
	);
}

function AiMessageBubble({
	message,
	onEditPrompt,
	onRerunPrompt,
}: {
	message: ConversationMessage;
	onEditPrompt?: (message: ConversationMessage) => void;
	onRerunPrompt?: (message: ConversationMessage) => void;
}) {
	if (message.role === "user") {
		return (
			<div className="group flex max-w-[85%] flex-col items-end gap-1 self-end">
				<div
					className="rounded-lg border border-[color:color-mix(in_srgb,var(--editor-accent)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--editor-accent)_12%,var(--editor-surface-background))] px-3 py-2 text-sm text-[color:var(--editor-utility-text-strong)]"
					data-ai-role="user"
				>
					{message.content}
				</div>
				{onEditPrompt || onRerunPrompt ? (
					<div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
						{onEditPrompt ? (
							<PopoverTooltip
								content="Edit prompt"
								side="bottom"
								align="end"
								className={DARK_TOOLTIP_CLASS}
							>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="editor-icon-button-subtle h-7 w-7 rounded-lg border"
									onClick={() => onEditPrompt(message)}
									aria-label="Edit prompt"
								>
									<Pencil className="h-3.5 w-3.5" aria-hidden="true" />
								</Button>
							</PopoverTooltip>
						) : null}
						{onRerunPrompt ? (
							<PopoverTooltip
								content="Rerun prompt"
								side="bottom"
								align="end"
								className={DARK_TOOLTIP_CLASS}
							>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="editor-icon-button-subtle h-7 w-7 rounded-lg border"
									onClick={() => onRerunPrompt(message)}
									aria-label="Rerun prompt"
								>
									<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
								</Button>
							</PopoverTooltip>
						) : null}
					</div>
				) : null}
			</div>
		);
	}

	if (message.role === "tool") {
		return null;
	}

	// assistant
	const respondingModelName = getRespondingModelName(message.respondingModelId);
	return (
		<div
			className={cn(
				"editor-bg-surface editor-border-subtle editor-text-strong max-w-[85%] self-start rounded-lg border px-3 py-2 text-sm",
			)}
			data-ai-role="assistant"
		>
			{message.content.length > 0 ? (
				<Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
			) : (
				<span className="editor-text-muted text-xs">
					Proposed a change (see draft below).
				</span>
			)}
			{respondingModelName ? (
				<div className="editor-text-muted mt-2 text-[11px]">
					Answered by {respondingModelName}
				</div>
			) : null}
		</div>
	);
}

function getRespondingModelName(modelId: string | undefined): string | null {
	if (!modelId) {
		return null;
	}
	const normalizedId = modelId.endsWith(":floor")
		? modelId.slice(0, -":floor".length)
		: modelId;
	const curated = CURATED_MODELS.find((model) => model.id === normalizedId);
	return curated?.name ?? modelId;
}
