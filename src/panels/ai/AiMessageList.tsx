import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { NoticeSurface } from "@/components/ui/settings-panel";
import type { ConversationMessage } from "@/ai/types/index";
import { CURATED_MODELS } from "@/ai/providers/curatedModels";

/**
 * Read-only transcript renderer for the AI assistant panel (Task 9).
 *
 * Renders `ConversationMessage[]` from `useAiConversation()` with each role
 * styled distinctly:
 *   - `user`   — accent-tinted bubble, right-aligned.
 *   - `assistant` — surface bubble, markdown-rendered (react-markdown + gfm,
 *      already a dependency; the same stack HelpMarkdownDocument uses).
 *   - `tool`   — muted monospace block showing a routed query/tool result.
 *   - `system` — not shown (system prompt is transport-only).
 *
 * The optional `streamingText` renders as an in-progress assistant bubble
 * below the persisted transcript while a turn is streaming.
 */

type AiMessageListProps = {
	messages: ConversationMessage[];
	streamingText: string;
	streaming: boolean;
};

export function AiMessageList({
	messages,
	streamingText,
	streaming,
}: AiMessageListProps) {
	const visible = messages.filter((message) => message.role !== "system");

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
				<AiMessageBubble key={message.id} message={message} />
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

function AiMessageBubble({ message }: { message: ConversationMessage }) {
	if (message.role === "user") {
		return (
			<div
				className="max-w-[85%] self-end rounded-lg border border-[color:color-mix(in_srgb,var(--editor-accent)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--editor-accent)_12%,var(--editor-surface-background))] px-3 py-2 text-sm text-[color:var(--editor-utility-text-strong)]"
				data-ai-role="user"
			>
				{message.content}
			</div>
		);
	}

	if (message.role === "tool") {
		return (
			<div
				className="editor-bg-subtle editor-border-subtle editor-text-muted max-w-[85%] self-start overflow-x-auto rounded-lg border px-3 py-2 font-mono text-xs"
				data-ai-role="tool"
			>
				<div className="editor-text-muted mb-1 text-[10px] uppercase tracking-wide">
					Tool result
				</div>
				<pre className="whitespace-pre-wrap break-words">{message.content}</pre>
			</div>
		);
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
