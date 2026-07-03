import { Settings, Sparkles, Trash2 } from "lucide-react";
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
import { PopoverTooltip } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NoticeSurface } from "@/components/ui/settings-panel";
import { applyAiCommands } from "@/api/editorApi";
import type { AiDocumentCommand } from "@/api/ai/types";
import type { DocumentModel } from "@/model/types";
import type { EditorState } from "@/editor/types/index";
import {
	createOpenRouterAdapter,
	type OpenRouterAdapterOptions,
} from "@/ai/providers/openRouterAdapter";
import {
	AUTO_MODEL_ID,
	CURATED_MODELS,
	FLOOR_MODEL_SENTINEL,
	FREE_MODEL_SENTINEL,
} from "@/ai/providers/curatedModels";
import {
	OPENROUTER_AUTO_MODEL_ID,
	OPENROUTER_FREE_MODEL_ID,
} from "@/ai/providers/resolveModelSelection";
import type { ProviderAdapter } from "@/ai/types/index";
import type { ConversationMessage } from "@/ai/types/index";
import {
	buildDirectOperationContextMessage,
	classifyAiRequest,
	type AiHelpTarget,
	type AiHistoryControlAction,
	type AiRequestRoute,
} from "@/ai/requestRouting";
import {
	AiConversationProvider,
	type AiConversationApi,
	useAiConversation,
} from "@/ai/conversationStore";
import { DARK_TOOLTIP_CLASS } from "@/lib/utils";
import { EditorPanelHeader } from "./EditorPanelHeader";
import { AiMessageList } from "./ai/AiMessageList";
import { AiDraftDiffCard } from "./ai/AiDraftDiffCard";
import { useAiChat } from "./ai/useAiChat";

export const STALE_DRAFT_MESSAGE =
	"This proposal is out of date and can't be applied — ask the assistant to try again.";

/**
 * The single UI-layer entry point into `editorApi.applyAiCommands`.
 *
 * This is intentionally the ONLY place under `src/panels/` that calls
 * `applyAiCommands` — the whole feature's safety guarantee ("an AI proposal
 * only becomes a committed, undoable document change through one audited
 * path"). It runs the batch against `editorState` purely to detect staleness:
 * `applyAiCommands` re-validates every command against the current document
 * and, when it rejects the batch (e.g. a referenced node was deleted since the
 * draft was created), returns the SAME `EditorState` reference — a true no-op
 * (see `src/editor/editorMutations/core.ts`).
 *
 * Returns `{ stale: true }` when nothing changed, so the caller surfaces the
 * stale state instead of silently clearing the draft; otherwise `{ stale:
 * false }` and the caller commits the batch through the history-tracked
 * dispatch. The recomputed state here is discarded — the dispatch path is the
 * source of truth for the committed, undoable entry.
 */
export function applyApprovedDraft(
	editorState: EditorState,
	commands: AiDocumentCommand[],
): { stale: boolean } {
	const nextState = applyAiCommands(editorState, commands);
	return { stale: nextState === editorState };
}

export type AutoApproveDraftDecision =
	| { action: "approve" }
	| { action: "manual"; reason: "destructive" | "overflowed" | "empty" };

export function getAutoApproveDraftDecision(
	commands: AiDocumentCommand[],
	options: { draftOverflowed: boolean },
): AutoApproveDraftDecision {
	if (commands.length === 0) {
		return { action: "manual", reason: "empty" };
	}
	if (options.draftOverflowed) {
		return { action: "manual", reason: "overflowed" };
	}
	if (commands.some((command) => command.type === "deleteNode")) {
		return { action: "manual", reason: "destructive" };
	}
	return { action: "approve" };
}

function describeAutoApproveManualReason(
	reason: Exclude<AutoApproveDraftDecision, { action: "approve" }>["reason"],
): string {
	switch (reason) {
		case "destructive":
			return "Auto approve paused because this draft deletes content. Review it, then approve or reject it.";
		case "overflowed":
			return "Auto approve paused because the draft was trimmed. Ask for a smaller edit, or review the staged proposal.";
		case "empty":
			return "Auto approve paused because there is no safe draft to apply. Ask for the next edit when ready.";
	}
}

/**
 * localStorage key holding the user's OpenRouter API key.
 *
 * COORDINATION NOTE (Task 11): the Settings "AI Assistant" section — which
 * does not exist yet at Task 9 — MUST write the key to this exact key so the
 * panel can read it. Do not change this string without updating both sides.
 * Versioned (`.v1`) to match the app's other persisted-state key conventions.
 */
export const AI_PROVIDER_KEY_STORAGE_KEY = "editor-playground.ai-provider-key.v1";

const HELP_ENTRY_BY_TARGET: Record<Exclude<AiHelpTarget, "shortcuts">, string> = {
	gettingStarted: "doc:docs/GETTING_STARTED.md",
	aiApi: "doc:docs/API_AI.md",
	api: "doc:docs/API.md",
};

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

function createLocalMessageId(prefix: string): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return `${prefix}:${crypto.randomUUID()}`;
	}
	return `${prefix}:${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function appendLocalExchange(
	conversation: AiConversationApi,
	userText: string,
	assistantText: string,
) {
	const createdAt = Date.now();
	conversation.appendMessage({
		id: createLocalMessageId("local-user"),
		role: "user",
		content: userText,
		createdAt,
	});
	conversation.appendMessage({
		id: createLocalMessageId("local-assistant"),
		role: "assistant",
		content: assistantText,
		createdAt: createdAt + 1,
	});
}

function createLocalAssistantContextMessage(
	document: DocumentModel,
	editorState: EditorState,
	route: Extract<AiRequestRoute, { kind: "directOperation" }>,
): ConversationMessage {
	return {
		id: createLocalMessageId("system-direct-operation"),
		role: "system",
		content: buildDirectOperationContextMessage(document, editorState, route),
		createdAt: Date.now(),
	};
}

function describeHelpTarget(target: AiHelpTarget): string {
	switch (target) {
		case "shortcuts":
			return "Opened keyboard shortcuts.";
		case "aiApi":
			return "Opened the AI command reference.";
		case "api":
			return "Opened the API documentation.";
		case "gettingStarted":
			return "Opened Getting Started in Help.";
	}
}

function handleHelpRoute(
	target: AiHelpTarget,
	callbacks: {
		onOpenDocumentation?: (entryId: string) => void;
		onOpenShortcuts?: () => void;
	},
) {
	if (target === "shortcuts") {
		callbacks.onOpenShortcuts?.();
		return;
	}
	callbacks.onOpenDocumentation?.(HELP_ENTRY_BY_TARGET[target]);
}

function describeHistoryAction(action: AiHistoryControlAction, available: boolean): string {
	if (!available) {
		return action === "undo" ? "There is nothing to undo." : "There is nothing to redo.";
	}
	return action === "undo" ? "Undid the last change." : "Redid the last undone change.";
}

export function handleLocalAiRoute({
	conversation,
	route,
	text,
	pendingDraft,
	onApproveDraft,
	onRejectDraft,
	onOpenDocumentation,
	onOpenShortcuts,
	onUndo,
	onRedo,
	canUndo = false,
	canRedo = false,
}: {
	conversation: AiConversationApi;
	route: AiRequestRoute;
	text: string;
	pendingDraft: AiConversationApi["pendingDraft"];
	onApproveDraft: (commands: AiDocumentCommand[]) => "applied" | "stale";
	onRejectDraft: () => void;
	onOpenDocumentation?: (entryId: string) => void;
	onOpenShortcuts?: () => void;
	onUndo?: () => void;
	onRedo?: () => void;
	canUndo?: boolean;
	canRedo?: boolean;
}): boolean {
	if (route.kind === "helpRequest") {
		handleHelpRoute(route.target, { onOpenDocumentation, onOpenShortcuts });
		appendLocalExchange(conversation, text, describeHelpTarget(route.target));
		return true;
	}

	if (route.kind === "historyControl") {
		if (route.action === "undo") {
			const available = canUndo && onUndo != null;
			if (available) {
				onUndo();
			}
			appendLocalExchange(conversation, text, describeHistoryAction(route.action, available));
			return true;
		}

		const available = canRedo && onRedo != null;
		if (available) {
			onRedo();
		}
		appendLocalExchange(conversation, text, describeHistoryAction(route.action, available));
		return true;
	}

	if (route.kind !== "draftControl" || !pendingDraft) {
		return false;
	}

	if (route.action === "reject") {
		onRejectDraft();
		appendLocalExchange(conversation, text, "Rejected the pending draft.");
		return true;
	}

	const result = onApproveDraft(pendingDraft.commands);
	appendLocalExchange(
		conversation,
		text,
		result === "applied"
			? "Approved and applied the pending draft."
			: "That proposal is out of date and cannot be applied. Ask me to try again.",
	);
	return true;
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
	onOpenDocumentation?: (entryId: string) => void;
	onOpenShortcuts?: () => void;
	onUndo?: () => void;
	onRedo?: () => void;
	canUndo?: boolean;
	canRedo?: boolean;
	/**
	 * Commits an approved AI draft as a single, history-tracked editor action.
	 * Wired by the app shell to `dispatch({ type: 'applyAiCommands', commands })`
	 * so the batch becomes exactly one undoable entry. The panel only calls this
	 * AFTER its own staleness check (see `AiPanelBody`) confirms the batch still
	 * applies against the current document.
	 */
	onApplyAiCommands?: (commands: AiDocumentCommand[]) => void;
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
	onOpenDocumentation,
	onOpenShortcuts,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
	onApplyAiCommands,
	adapterOverride,
}: AiPanelProps) {
	return (
		<AiConversationProvider>
			<AiPanelShell
				open={open}
				position={position}
				onPositionChange={onPositionChange}
				panelRef={panelRef}
				document={document}
				editorState={editorState}
				onOpenChange={onOpenChange}
				onClose={onClose}
				onOpenSettings={onOpenSettings}
				onOpenDocumentation={onOpenDocumentation}
				onOpenShortcuts={onOpenShortcuts}
				onUndo={onUndo}
				onRedo={onRedo}
				canUndo={canUndo}
				canRedo={canRedo}
				onApplyAiCommands={onApplyAiCommands}
				adapterOverride={adapterOverride}
			/>
		</AiConversationProvider>
	);
}

function AiPanelShell({
	open,
	position,
	onPositionChange,
	panelRef,
	document,
	editorState,
	onOpenChange,
	onClose,
	onOpenSettings,
	onOpenDocumentation,
	onOpenShortcuts,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
	onApplyAiCommands,
	adapterOverride,
}: AiPanelProps) {
	const conversation = useAiConversation();
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

	const canClearConversation =
		conversation.messages.length > 0 || conversation.pendingDraft !== null;

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
						closeTooltip
						className="cursor-grab px-3 py-2.5 active:cursor-grabbing"
						actions={
							<>
								<PopoverTooltip
									content="Clear conversation"
									side="bottom"
									align="end"
									className={DARK_TOOLTIP_CLASS}
								>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="editor-icon-button-subtle rounded-lg border"
										onClick={conversation.clearConversation}
										disabled={!canClearConversation}
										aria-label="Clear AI conversation"
									>
										<Trash2 className="h-4 w-4" aria-hidden="true" />
									</Button>
								</PopoverTooltip>
								{onOpenSettings ? (
									<PopoverTooltip
										content="Open settings"
										side="bottom"
										align="end"
										className={DARK_TOOLTIP_CLASS}
									>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="editor-icon-button-subtle rounded-lg border"
											onClick={onOpenSettings}
											aria-label="Open AI assistant settings"
										>
											<Settings className="h-4 w-4" aria-hidden="true" />
										</Button>
									</PopoverTooltip>
								) : null}
							</>
						}
					/>
				</div>
			}
			bodyClassName="contents"
		>
			<AiPanelBody
				document={document}
				editorState={editorState}
				onOpenSettings={onOpenSettings}
				onOpenDocumentation={onOpenDocumentation}
				onOpenShortcuts={onOpenShortcuts}
				onUndo={onUndo}
				onRedo={onRedo}
				canUndo={canUndo}
				canRedo={canRedo}
				onApplyAiCommands={onApplyAiCommands}
				adapterOverride={adapterOverride}
			/>
		</FloatingPanelShell>
	);
}

type AiPanelBodyProps = {
	document: DocumentModel;
	editorState: EditorState;
	onOpenSettings?: () => void;
	onOpenDocumentation?: (entryId: string) => void;
	onOpenShortcuts?: () => void;
	onUndo?: () => void;
	onRedo?: () => void;
	canUndo?: boolean;
	canRedo?: boolean;
	onApplyAiCommands?: (commands: AiDocumentCommand[]) => void;
	adapterOverride?: ProviderAdapter;
};

function AiPanelBody({
	document,
	editorState,
	onOpenSettings,
	onOpenDocumentation,
	onOpenShortcuts,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
	onApplyAiCommands,
	adapterOverride,
}: AiPanelBodyProps) {
	const conversation = useAiConversation();
	const [input, setInput] = useState("");
	const [staleError, setStaleError] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const reviewedAutoDraftIdRef = useRef<string | null>(null);

	const { pendingDraft, clearPendingDraft } = conversation;

	const handleApproveDraft = useCallback(
		(commands: AiDocumentCommand[]): "applied" | "stale" => {
			// Delegates to `applyApprovedDraft` — the single UI-layer call site of
			// `editorApi.applyAiCommands` — to detect a stale draft. A stale batch
			// must NOT be silently cleared; surface it and keep the draft.
			const { stale } = applyApprovedDraft(editorState, commands);
			if (stale) {
				setStaleError(STALE_DRAFT_MESSAGE);
				return "stale";
			}

			// Not stale: commit through the app-shell dispatch so the batch lands
			// as exactly one undoable history entry, then clear the draft.
			setStaleError(null);
			onApplyAiCommands?.(commands);
			clearPendingDraft();
			return "applied";
		},
		[clearPendingDraft, editorState, onApplyAiCommands],
	);

	const handleRejectDraft = useCallback(() => {
		setStaleError(null);
		clearPendingDraft();
	}, [clearPendingDraft]);

	const storedKey = adapterOverride ? "mock" : readStoredApiKey();
	const modelSelection = conversation.selectedModelId ?? FREE_MODEL_SENTINEL;
	const activeModelText = getActiveModelText(
		modelSelection,
		conversation.messages,
	);

	const buildAdapter = useMemo<
		((modelId: string, adapterOptions?: OpenRouterAdapterOptions) => ProviderAdapter) | null
	>(() => {
		if (adapterOverride) {
			return () => adapterOverride;
		}
		if (!storedKey) {
			return null;
		}
		return (modelId: string, adapterOptions?: OpenRouterAdapterOptions) =>
			createOpenRouterAdapter(storedKey, modelId, {
				cacheSystemPrompt: conversation.promptCachingEnabled,
				...adapterOptions,
			});
	}, [adapterOverride, conversation.promptCachingEnabled, storedKey]);

	const buildContextMessages = useCallback(
		(userText: string) => {
			const route = classifyAiRequest(userText, { hasPendingDraft: false });
			if (route.kind !== "directOperation") {
				return [];
			}
			return [createLocalAssistantContextMessage(document, editorState, route)];
		},
		[document, editorState],
	);

	const { streaming, streamingText, streamError, sendMessage, cancel } =
		useAiChat({
			conversation,
			buildAdapter,
			modelSelection,
			document,
			editorState,
			buildContextMessages,
		});

	const messageCount = conversation.messages.length;

	// biome-ignore lint/correctness/useExhaustiveDependencies: messageCount/streamingText are intentional triggers that re-run the scroll-to-bottom on new content
	useEffect(() => {
		const el = scrollRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	}, [messageCount, streamingText]);

	useEffect(() => {
		if (!pendingDraft) {
			reviewedAutoDraftIdRef.current = null;
			return;
		}
		if (
			!conversation.autoApproveAiDrafts ||
			reviewedAutoDraftIdRef.current === pendingDraft.id
		) {
			return;
		}

		reviewedAutoDraftIdRef.current = pendingDraft.id;
		const decision = getAutoApproveDraftDecision(pendingDraft.commands, {
			draftOverflowed: conversation.draftOverflowed,
		});
		if (decision.action === "manual") {
			conversation.appendMessage({
				id: createLocalMessageId("auto-approve-paused"),
				role: "assistant",
				content: describeAutoApproveManualReason(decision.reason),
				createdAt: Date.now(),
			});
			return;
		}

		const result = handleApproveDraft(pendingDraft.commands);
		conversation.appendMessage({
			id: createLocalMessageId("auto-approve"),
			role: "assistant",
			content:
				result === "applied"
					? "Auto-approved and applied the safe draft. Review the canvas, then ask for the next edit."
					: "Auto approve paused because that proposal is out of date. Ask me to regenerate it.",
			createdAt: Date.now(),
		});
	}, [
		conversation,
		conversation.autoApproveAiDrafts,
		conversation.draftOverflowed,
		handleApproveDraft,
		pendingDraft,
	]);

	const submitPromptText = useCallback(
		(rawText: string): boolean => {
			const text = rawText.trim();
			if (!text || streaming) {
				return false;
			}

			const route = classifyAiRequest(text, {
				hasPendingDraft: pendingDraft !== null,
			});
			const handledLocally = handleLocalAiRoute({
				conversation,
				route,
				text,
				pendingDraft,
				onApproveDraft: handleApproveDraft,
				onRejectDraft: handleRejectDraft,
				onOpenDocumentation,
				onOpenShortcuts,
				onUndo,
				onRedo,
				canUndo,
				canRedo,
			});
			if (handledLocally) {
				return true;
			}

			if (!buildAdapter) {
				return false;
			}

			void sendMessage(text);
			return true;
		},
		[
			buildAdapter,
			conversation,
			handleApproveDraft,
			handleRejectDraft,
			onOpenDocumentation,
			onOpenShortcuts,
			onUndo,
			onRedo,
			canUndo,
			canRedo,
			pendingDraft,
			sendMessage,
			streaming,
		],
	);

	const handleSubmit = useCallback(
		(event?: FormEvent<HTMLFormElement>) => {
			event?.preventDefault();
			if (submitPromptText(input)) {
				setInput("");
			}
		},
		[input, submitPromptText],
	);

	const handleEditPrompt = useCallback((message: ConversationMessage) => {
		setInput(message.content);
		requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
	}, []);

	const handleRerunPrompt = useCallback(
		(message: ConversationMessage) => {
			void submitPromptText(message.content);
		},
		[submitPromptText],
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

	if (!buildAdapter) {
		return (
			<div className="flex flex-col gap-3 p-3">
				<NoticeSurface tone="info" className="text-sm">
					Add a free OpenRouter API key in Settings to start chatting — even
					the free-tier model needs one (no credit card required).
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
					onEditPrompt={handleEditPrompt}
					onRerunPrompt={handleRerunPrompt}
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
			{pendingDraft ? (
				<div className="px-3 pb-2">
					<AiDraftDiffCard
						draftBatch={pendingDraft}
						document={document}
						onApprove={handleApproveDraft}
						onReject={handleRejectDraft}
						staleError={staleError}
					/>
				</div>
			) : null}
			<form
				className="editor-border-subtle flex items-end gap-2 border-t p-3"
				onSubmit={handleSubmit}
			>
				<div className="min-w-0 flex-1">
					<Textarea
						ref={inputRef}
						value={input}
						onChange={(event) => setInput(event.currentTarget.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ask about your document…"
						rows={2}
						className="max-h-36 min-h-20 resize-y"
						aria-label="Message the AI assistant"
						disabled={streaming}
					/>
					<div className="mt-1 flex min-w-0 items-center justify-between gap-2">
						<div className="editor-text-muted min-w-0 truncate text-[11px]">
							Model: {activeModelText}
						</div>
						<div className="editor-text-muted flex shrink-0 items-center gap-1.5 text-[11px]">
							<span>Auto approve</span>
							<Switch
								checked={conversation.autoApproveAiDrafts}
								onCheckedChange={conversation.setAutoApproveAiDrafts}
								aria-label="Auto approve safe AI drafts"
							/>
						</div>
					</div>
				</div>
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

function getActiveModelText(
	modelSelection: string,
	messages: ConversationMessage[],
): string {
	const latestResolvedModelId = getLatestResolvedModelId(messages);
	if (isOpenRouterModeSelection(modelSelection)) {
		return latestResolvedModelId
			? getDisplayModelName(latestResolvedModelId)
			: "OpenRouter will choose on send";
	}
	return getDisplayModelName(modelSelection);
}

function isOpenRouterModeSelection(modelSelection: string): boolean {
	return (
		modelSelection === FREE_MODEL_SENTINEL ||
		modelSelection === FLOOR_MODEL_SENTINEL ||
		modelSelection === AUTO_MODEL_ID ||
		modelSelection === OPENROUTER_FREE_MODEL_ID ||
		modelSelection === OPENROUTER_AUTO_MODEL_ID
	);
}

function getLatestResolvedModelId(
	messages: ConversationMessage[],
): string | null {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		const modelId = message?.respondingModelId;
		if (
			message?.role === "assistant" &&
			modelId &&
			!isOpenRouterModeSelection(modelId)
		) {
			return modelId;
		}
	}
	return null;
}

function getDisplayModelName(modelId: string): string {
	const normalizedId = modelId.endsWith(":floor")
		? modelId.slice(0, -":floor".length)
		: modelId;
	const curated = CURATED_MODELS.find((model) => model.id === normalizedId);
	return curated?.name ?? modelId;
}

function clampToViewport(value: number, size: number, viewportSize: number) {
	return Math.round(
		Math.max(
			PANEL_VIEWPORT_MARGIN_PX,
			Math.min(viewportSize - size - PANEL_VIEWPORT_MARGIN_PX, value),
		),
	);
}
