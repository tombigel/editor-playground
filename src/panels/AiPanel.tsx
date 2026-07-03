import { Sparkles } from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FormEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	type Ref,
} from "react";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NoticeSurface } from "@/components/ui/settings-panel";
import type { DocumentModel } from "@/model/types";
import type { EditorState } from "@/editor/types/index";
import { createOpenRouterAdapter } from "@/ai/providers/openRouterAdapter";
import { CURATED_MODELS } from "@/ai/providers/curatedModels";
import type { ProviderAdapter } from "@/ai/types/index";
import {
	AiConversationProvider,
	useAiConversation,
} from "@/ai/conversationStore";
import { EditorPanelHeader } from "./EditorPanelHeader";
import { AiMessageList } from "./ai/AiMessageList";
import { useAiChat } from "./ai/useAiChat";

/**
 * localStorage key holding the user's OpenRouter API key.
 *
 * COORDINATION NOTE (Task 11): the Settings "AI Assistant" section — which
 * does not exist yet at Task 9 — MUST write the key to this exact key so the
 * panel can read it. Do not change this string without updating both sides.
 * Versioned (`.v1`) to match the app's other persisted-state key conventions.
 */
export const AI_PROVIDER_KEY_STORAGE_KEY = "editor-playground.ai-provider-key.v1";

function readStoredApiKey(): string | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const raw = window.localStorage.getItem(AI_PROVIDER_KEY_STORAGE_KEY);
		return raw && raw.trim().length > 0 ? raw.trim() : null;
	} catch {
		return null;
	}
}

const PANEL_VIEWPORT_MARGIN_PX = 16;

type PanelDragState = {
	pointerId: number;
	originX: number;
	originY: number;
	originTop: number;
	originLeft: number;
};

export type AiPanelProps = {
	open: boolean;
	position: { top: number; left: number };
	onPositionChange: (position: { top: number; left: number }) => void;
	panelRef?: Ref<HTMLDivElement>;
	document: DocumentModel;
	editorState: EditorState;
	onOpenChange: (open: boolean) => void;
	onClose: () => void;
	onOpenSettings?: () => void;
	/**
	 * Test seam: inject a mocked `ProviderAdapter` instead of building a real
	 * OpenRouter adapter from a stored key. Task 9 verifies against a mock since
	 * no key-entry UI exists until Task 11.
	 */
	adapterOverride?: ProviderAdapter;
};

export function AiPanel({
	open,
	position,
	onPositionChange,
	panelRef,
	document,
	editorState,
	onOpenChange,
	onClose,
	onOpenSettings,
	adapterOverride,
}: AiPanelProps) {
	const surfaceRef = useRef<HTMLDivElement | null>(null);
	const [panelDragState, setPanelDragState] = useState<PanelDragState | null>(
		null,
	);

	useEffect(() => {
		if (!panelDragState || typeof window === "undefined") {
			return;
		}
		const currentPanelDrag = panelDragState;

		function handlePointerMove(event: PointerEvent) {
			if (event.pointerId !== currentPanelDrag.pointerId) {
				return;
			}
			event.preventDefault();
			const rect = surfaceRef.current?.getBoundingClientRect();
			const panelWidth = rect?.width ?? 360;
			const panelHeight = rect?.height ?? 480;
			const nextLeft = clampToViewport(
				currentPanelDrag.originLeft + (event.clientX - currentPanelDrag.originX),
				panelWidth,
				window.innerWidth,
			);
			const nextTop = clampToViewport(
				currentPanelDrag.originTop + (event.clientY - currentPanelDrag.originY),
				panelHeight,
				window.innerHeight,
			);
			onPositionChange({ top: nextTop, left: nextLeft });
		}

		function handlePointerEnd(event: PointerEvent) {
			if (event.pointerId !== currentPanelDrag.pointerId) {
				return;
			}
			setPanelDragState(null);
		}

		window.addEventListener("pointermove", handlePointerMove, {
			passive: false,
		});
		window.addEventListener("pointerup", handlePointerEnd);
		window.addEventListener("pointercancel", handlePointerEnd);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerEnd);
			window.removeEventListener("pointercancel", handlePointerEnd);
		};
	}, [onPositionChange, panelDragState]);

	function setCombinedRef(node: HTMLDivElement | null) {
		surfaceRef.current = node;
		if (typeof panelRef === "function") {
			panelRef(node);
		} else if (panelRef) {
			panelRef.current = node;
		}
	}

	function handleHeaderPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		const target = event.target as HTMLElement | null;
		if (
			event.button !== 0 ||
			!target ||
			target.closest(
				'button, input, textarea, select, [data-prevent-panel-drag="true"]',
			)
		) {
			return;
		}
		event.preventDefault();
		setPanelDragState({
			pointerId: event.pointerId,
			originX: event.clientX,
			originY: event.clientY,
			originTop: position.top,
			originLeft: position.left,
		});
	}

	return (
		<FloatingPanelShell
			ref={setCombinedRef}
			open={open}
			onOpenChange={onOpenChange}
			className="editor-ai-panel flex w-[360px] flex-col"
			style={{ top: `${position.top}px`, left: `${position.left}px` }}
			header={
				<div
					className="editor-panel-drag-zone"
					onPointerDown={handleHeaderPointerDown}
				>
					<EditorPanelHeader
						icon={Sparkles}
						title="AI Assistant"
						description="Ask about your document."
						closeLabel="Close AI assistant panel"
						onClose={onClose}
						className="cursor-grab px-3 py-2.5 active:cursor-grabbing"
					/>
				</div>
			}
			bodyClassName="contents"
		>
			<AiConversationProvider>
				<AiPanelBody
					document={document}
					editorState={editorState}
					onOpenSettings={onOpenSettings}
					adapterOverride={adapterOverride}
				/>
			</AiConversationProvider>
		</FloatingPanelShell>
	);
}

type AiPanelBodyProps = {
	document: DocumentModel;
	editorState: EditorState;
	onOpenSettings?: () => void;
	adapterOverride?: ProviderAdapter;
};

function AiPanelBody({
	document,
	editorState,
	onOpenSettings,
	adapterOverride,
}: AiPanelBodyProps) {
	const conversation = useAiConversation();
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement | null>(null);

	const storedKey = adapterOverride ? "mock" : readStoredApiKey();
	const modelId =
		conversation.selectedModelId ?? CURATED_MODELS[0]?.id ?? null;

	const adapter = useMemo<ProviderAdapter | null>(() => {
		if (adapterOverride) {
			return adapterOverride;
		}
		if (!storedKey || !modelId) {
			return null;
		}
		return createOpenRouterAdapter(storedKey, modelId);
	}, [adapterOverride, modelId, storedKey]);

	const { streaming, streamingText, streamError, sendMessage, cancel } =
		useAiChat({ conversation, adapter, document, editorState });

	const messageCount = conversation.messages.length;

	// biome-ignore lint/correctness/useExhaustiveDependencies: messageCount/streamingText are intentional triggers that re-run the scroll-to-bottom on new content
	useEffect(() => {
		const el = scrollRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	}, [messageCount, streamingText]);

	const handleSubmit = useCallback(
		(event?: FormEvent<HTMLFormElement>) => {
			event?.preventDefault();
			if (!input.trim() || streaming || !adapter) {
				return;
			}
			const text = input;
			setInput("");
			void sendMessage(text);
		},
		[adapter, input, sendMessage, streaming],
	);

	const handleKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	if (!adapter) {
		return (
			<div className="flex flex-col gap-3 p-3">
				<NoticeSurface tone="info" className="text-sm">
					Add your OpenRouter API key in Settings to start chatting.
				</NoticeSurface>
				{onOpenSettings ? (
					<Button
						type="button"
						variant="secondary"
						size="sm"
						className="self-start"
						onClick={onOpenSettings}
					>
						Open Settings
					</Button>
				) : null}
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-col">
			<div
				ref={scrollRef}
				className="editor-scrollbar editor-scrollbar-gutter flex max-h-[52vh] min-h-[180px] flex-col overflow-y-auto p-3"
			>
				<AiMessageList
					messages={conversation.messages}
					streamingText={streamingText}
					streaming={streaming}
				/>
			</div>
			{streamError ? (
				<div className="px-3 pb-1">
					<NoticeSurface tone="warning" className="text-xs">
						{streamError}
					</NoticeSurface>
				</div>
			) : null}
			{conversation.draftOverflowed ? (
				<div className="px-3 pb-1">
					<NoticeSurface tone="warning" className="text-xs">
						The proposed change was too large and was trimmed. Ask for a
						smaller edit.
					</NoticeSurface>
				</div>
			) : null}
			<form
				className="editor-border-subtle flex items-end gap-2 border-t p-3"
				onSubmit={handleSubmit}
			>
				<Textarea
					value={input}
					onChange={(event) => setInput(event.currentTarget.value)}
					onKeyDown={handleKeyDown}
					placeholder="Ask about your document…"
					rows={2}
					className="min-h-[2.25rem] flex-1 resize-none"
					aria-label="Message the AI assistant"
					disabled={streaming}
				/>
				{streaming ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={cancel}
						aria-label="Stop generating"
					>
						Stop
					</Button>
				) : (
					<Button
						type="submit"
						variant="default"
						size="sm"
						disabled={!input.trim()}
						aria-label="Send message"
					>
						Send
					</Button>
				)}
			</form>
		</div>
	);
}

function clampToViewport(value: number, size: number, viewportSize: number) {
	return Math.round(
		Math.max(
			PANEL_VIEWPORT_MARGIN_PX,
			Math.min(viewportSize - size - PANEL_VIEWPORT_MARGIN_PX, value),
		),
	);
}
