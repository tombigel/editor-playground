import {
	CheckCircle2,
	ExternalLink,
	KeyRound,
	LoaderCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
	loadPersistedConversationState,
	persistConversationState,
} from "@/ai/conversationStore";
import {
	AUTO_MODEL_ID,
	CURATED_MODELS,
	type CuratedModelTier,
	FLOOR_MODEL_SENTINEL,
	FREE_MODEL_SENTINEL,
	isAutoGroupSentinel,
} from "@/ai/providers/curatedModels";
import {
	checkOpenRouterConnection,
	type OpenRouterAdapterOptions,
} from "@/ai/providers/openRouterAdapter";
import {
	resolveModelSelection,
} from "@/ai/providers/resolveModelSelection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ControlGroup,
	InfoTooltip,
	LabeledControlRow,
	NoticeSurface,
	PlainGroup,
	SectionHeading,
} from "@/components/ui/settings-panel";
import { Switch } from "@/components/ui/switch";
import { AI_PROVIDER_KEY_STORAGE_KEY } from "@/panels/AiPanel";

const TIER_ORDER: CuratedModelTier[] = ["low-cost", "good", "free"];
const CUSTOM_MODEL_SENTINEL = "custom-model";

const TIER_LABEL: Record<CuratedModelTier, string> = {
	"low-cost": "Low-cost",
	good: "Premium",
	free: "Free",
};

type ConnectionCheckState =
	| { status: "idle" }
	| { status: "checking" }
	| { status: "success"; modelId: string }
	| { status: "error"; modelId: string | null; message: string };

/**
 * Reads the stored OpenRouter API key using the exact same shape
 * `AiPanel.tsx`'s `readStoredApiKey` uses: a plain (non-JSON) trimmed string,
 * or `null` when absent/blank. Kept local rather than imported so this
 * section has no runtime dependency on `AiPanel`'s internal helper — only on
 * the shared storage key constant, which IS imported to guarantee both sides
 * agree on where the key lives.
 */
function readStoredApiKey(): string {
	if (typeof window === "undefined") {
		return "";
	}
	try {
		const raw = window.localStorage.getItem(AI_PROVIDER_KEY_STORAGE_KEY);
		return raw && raw.trim().length > 0 ? raw.trim() : "";
	} catch {
		return "";
	}
}

function writeStoredApiKey(value: string): void {
	if (typeof window === "undefined") {
		return;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		window.localStorage.removeItem(AI_PROVIDER_KEY_STORAGE_KEY);
		return;
	}
	window.localStorage.setItem(AI_PROVIDER_KEY_STORAGE_KEY, trimmed);
}

/**
 * Reads the persisted `selectedModelId`, falling back to the first curated
 * model so the picker always shows a valid selection.
 *
 * COORDINATION NOTE (Task 11): `AiConversationProvider` (the React context
 * `useAiConversation()` reads from) is mounted fresh only while the AI panel
 * is open — it is not lifted above Settings in the app shell. Settings and
 * the AI panel are therefore different React trees and cannot share a single
 * store instance without a larger structural change. The least invasive
 * correct bridge is to read/write the exact same localStorage key
 * (`editor-playground.ai-conversation.v1`) and shape that
 * `conversationStore.tsx` already exports
 * (`loadPersistedConversationState`/`persistConversationState`), reusing
 * those functions directly rather than re-deriving the JSON shape here. Since
 * the provider always re-reads localStorage on mount, a selection made here
 * is picked up the next time the AI panel opens.
 */
function readSelectedModelId(): string {
	const persisted = loadPersistedConversationState();
	return persisted.selectedModelId ?? FREE_MODEL_SENTINEL;
}

function writeSelectedModelId(modelId: string): void {
	const persisted = loadPersistedConversationState();
	persistConversationState({ ...persisted, selectedModelId: modelId });
}

function clearSelectedModelId(): void {
	const persisted = loadPersistedConversationState();
	persistConversationState({ ...persisted, selectedModelId: null });
}

function readPromptCachingEnabled(): boolean {
	return loadPersistedConversationState().promptCachingEnabled;
}

function writePromptCachingEnabled(enabled: boolean): void {
	const persisted = loadPersistedConversationState();
	persistConversationState({ ...persisted, promptCachingEnabled: enabled });
}

function getSelectedModelLabel(modelId: string): string {
	if (modelId === AUTO_MODEL_ID) {
		return "Auto";
	}
	if (modelId === FLOOR_MODEL_SENTINEL) {
		return "Floor";
	}
	if (modelId === FREE_MODEL_SENTINEL) {
		return "Free";
	}
	const curated = CURATED_MODELS.find((model) => model.id === modelId);
	if (curated) {
		return `${TIER_LABEL[curated.tier]} · ${curated.name}`;
	}
	if (modelId === CUSTOM_MODEL_SENTINEL || modelId.trim().length > 0) {
		return "Custom Model";
	}
	return "Free";
}

function selectionMayUseFreeTier(modelId: string): boolean {
	const curated = CURATED_MODELS.find((model) => model.id === modelId);
	return (
		modelId === FREE_MODEL_SENTINEL ||
		modelId.endsWith(":free") ||
		curated?.tier === "free"
	);
}

export function isCustomModelId(modelId: string): boolean {
	return (
		modelId.trim().length > 0 &&
		modelId !== CUSTOM_MODEL_SENTINEL &&
		!isAutoGroupSentinel(modelId) &&
		!CURATED_MODELS.some((model) => model.id === modelId)
	);
}

export function normalizeCustomModelIdInput(value: string): string | null {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function resolveConnectionCheckRequest(
	modelSelection: string,
): { modelId: string; adapterOptions?: OpenRouterAdapterOptions } | null {
	if (modelSelection === CUSTOM_MODEL_SENTINEL) {
		return null;
	}
	const resolved = resolveModelSelection(modelSelection);
	return { modelId: resolved.modelId, adapterOptions: resolved.adapterOptions };
}

export function AiSettingsSection() {
	const [apiKey, setApiKey] = useState<string>(() => readStoredApiKey());
	const [selectedModelId, setSelectedModelIdState] = useState<string>(() =>
		readSelectedModelId(),
	);
	const [customModelIdInput, setCustomModelIdInput] = useState<string>(() => {
		const modelId = readSelectedModelId();
		return isCustomModelId(modelId) ? modelId : "";
	});
	const [promptCachingEnabled, setPromptCachingEnabledState] =
		useState<boolean>(() => readPromptCachingEnabled());
	const [connectionCheck, setConnectionCheck] = useState<ConnectionCheckState>({
		status: "idle",
	});

	const handleApiKeyChange = useCallback((value: string) => {
		setApiKey(value);
		setConnectionCheck({ status: "idle" });
		writeStoredApiKey(value);
	}, []);

	const handleClearApiKey = useCallback(() => {
		setApiKey("");
		setConnectionCheck({ status: "idle" });
		writeStoredApiKey("");
	}, []);

	const handleModelChange = useCallback((modelId: string) => {
		setCustomModelIdInput("");
		setSelectedModelIdState(modelId);
		setConnectionCheck({ status: "idle" });
		writeSelectedModelId(modelId);
	}, []);

	const handleCustomModelIdChange = useCallback((value: string) => {
		setCustomModelIdInput(value);
		const normalized = normalizeCustomModelIdInput(value);
		if (!normalized) {
			setSelectedModelIdState(CUSTOM_MODEL_SENTINEL);
			setConnectionCheck({ status: "idle" });
			clearSelectedModelId();
			return;
		}
		setSelectedModelIdState(normalized);
		setConnectionCheck({ status: "idle" });
		writeSelectedModelId(normalized);
	}, []);

	const handlePromptCachingChange = useCallback((enabled: boolean) => {
		setPromptCachingEnabledState(enabled);
		writePromptCachingEnabled(enabled);
	}, []);

	const selectedModelLabel = getSelectedModelLabel(selectedModelId);
	const modelSelectValue =
		isCustomModelId(selectedModelId) ||
		selectedModelId === CUSTOM_MODEL_SENTINEL
			? CUSTOM_MODEL_SENTINEL
			: selectedModelId;
	const showCustomModelInput = modelSelectValue === CUSTOM_MODEL_SENTINEL;
	const showFreeTierNotice =
		apiKey.length > 0 && selectionMayUseFreeTier(selectedModelId);
	const canCheckConnection =
		apiKey.trim().length > 0 && connectionCheck.status !== "checking";

	const handleCheckConnection = useCallback(async () => {
		const trimmedKey = apiKey.trim();
		const connectionRequest = resolveConnectionCheckRequest(selectedModelId);
		if (trimmedKey.length === 0) {
			setConnectionCheck({
				status: "error",
				modelId: null,
				message: "Add an OpenRouter API key before checking the connection.",
			});
			return;
		}
		if (!connectionRequest) {
			setConnectionCheck({
				status: "error",
				modelId: null,
				message: "Choose a model before checking the connection.",
			});
			return;
		}

		setConnectionCheck({ status: "checking" });
		const result = await checkOpenRouterConnection(
			trimmedKey,
			connectionRequest.modelId,
			connectionRequest.adapterOptions,
		);
		if (result.ok) {
			setConnectionCheck({ status: "success", modelId: result.modelId });
			return;
		}
		setConnectionCheck({
			status: "error",
			modelId: result.modelId,
			message: result.message,
		});
	}, [apiKey, selectedModelId]);

	return (
		<>
			<SectionHeading
				eyebrow="AI Assistant"
				title="Provider, model, and API key"
				description="Bring your own OpenRouter key to chat with the AI assistant."
			/>
			<PlainGroup title="OpenRouter">
				<ControlGroup>
					<LabeledControlRow label="API key" controlWidth="280px">
						<div className="flex w-full flex-col gap-1.5">
							<div className="flex w-full items-center gap-2">
								<Input
									type="password"
									autoComplete="off"
									spellCheck={false}
									value={apiKey}
									onChange={(event) => handleApiKeyChange(event.target.value)}
									placeholder="sk-or-…"
									aria-label="OpenRouter API key"
									className="text-sm"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleClearApiKey}
									disabled={apiKey.length === 0}
								>
									Clear
								</Button>
							</div>
							<a
								href="https://openrouter.ai/keys"
								target="_blank"
								rel="noreferrer"
								className="editor-text-muted inline-flex items-center gap-1 text-[11px] hover:underline"
							>
								Get an OpenRouter key
								<ExternalLink className="h-3 w-3" />
							</a>
						</div>
					</LabeledControlRow>
					<LabeledControlRow
						label={
							<span className="flex items-center gap-1.5">
								Model
								<InfoTooltip>
									Automatic choices use OpenRouter routers. Free lets OpenRouter
									randomly choose an available free model, Floor biases
									OpenRouter Auto toward cost, and Auto lets OpenRouter pick for
									the prompt. Manual tiers below are our curated direct model ids.
								</InfoTooltip>
							</span>
						}
						controlWidth="280px"
					>
						<Select
							value={modelSelectValue}
							onValueChange={(value) => {
								if (value === CUSTOM_MODEL_SENTINEL) {
									setSelectedModelIdState(
										customModelIdInput.trim().length > 0
											? customModelIdInput.trim()
											: CUSTOM_MODEL_SENTINEL,
									);
									setConnectionCheck({ status: "idle" });
									return;
								}
								handleModelChange(value);
							}}
						>
							<SelectTrigger aria-label="Model">
								<SelectValue>{selectedModelLabel}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Automatic</SelectLabel>
									<SelectItem value={FREE_MODEL_SENTINEL}>
										<span className="flex flex-col">
											<span>Free</span>
											<span className="editor-text-muted text-[11px]">
												OpenRouter Free Router: random available free model
												that supports the request.
											</span>
										</span>
									</SelectItem>
									<SelectItem value={FLOOR_MODEL_SENTINEL}>
										<span className="flex flex-col">
											<span>Floor</span>
											<span className="editor-text-muted text-[11px]">
												OpenRouter Auto Router biased toward cheapest viable
												model.
											</span>
										</span>
									</SelectItem>
									<SelectItem value={AUTO_MODEL_ID}>
										<span className="flex flex-col">
											<span>Auto</span>
											<span className="editor-text-muted text-[11px]">
												OpenRouter Auto Router chooses a model for the prompt.
											</span>
										</span>
									</SelectItem>
								</SelectGroup>
								<SelectSeparator />
								{TIER_ORDER.flatMap((tier, tierIndex) => {
									const modelsInTier = CURATED_MODELS.filter(
										(model) => model.tier === tier,
									);
									if (modelsInTier.length === 0) {
										return [];
									}
									return [
										tierIndex > 0 ? (
											<SelectSeparator key={`${tier}-sep`} />
										) : null,
										...modelsInTier.map((model) => (
											<SelectItem key={model.id} value={model.id}>
												<span className="flex flex-col">
													<span>
														{TIER_LABEL[tier]} · {model.provider} — {model.name}
													</span>
													<span className="editor-text-muted text-[11px]">
														{model.label}
													</span>
												</span>
											</SelectItem>
										)),
									];
								})}
								<SelectSeparator />
								<SelectItem value={CUSTOM_MODEL_SENTINEL}>
									Custom Model
								</SelectItem>
							</SelectContent>
						</Select>
					</LabeledControlRow>
					{showCustomModelInput ? (
						<LabeledControlRow label="Custom model id" controlWidth="280px">
							<Input
								type="text"
								autoComplete="off"
								spellCheck={false}
								value={customModelIdInput}
								onChange={(event) =>
									handleCustomModelIdChange(event.target.value)
								}
								placeholder="e.g. mistralai/mistral-large"
								aria-label="Custom OpenRouter model id"
								className="text-sm"
							/>
						</LabeledControlRow>
					) : null}
					<LabeledControlRow
						label={
							<span className="flex items-center gap-1.5">
								Prompt caching
								<InfoTooltip>
									Can reduce repeat-request cost for providers that support
									prompt caching, such as Anthropic. It may have no effect where
									caching is automatic or unsupported.
								</InfoTooltip>
							</span>
						}
						controlWidth="280px"
					>
						<Switch
							checked={promptCachingEnabled}
							onCheckedChange={handlePromptCachingChange}
							aria-label="Prompt caching"
						/>
					</LabeledControlRow>
					<LabeledControlRow label="Connection" controlWidth="280px">
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => void handleCheckConnection()}
								disabled={!canCheckConnection}
							>
								{connectionCheck.status === "checking"
									? "Checking…"
									: "Check connection"}
							</Button>
							<ConnectionCheckIcon state={connectionCheck} />
						</div>
					</LabeledControlRow>
				</ControlGroup>
				<ConnectionCheckNotice state={connectionCheck} />
				<NoticeSurface
					tone="info"
					icon={<KeyRound className="h-3.5 w-3.5" />}
					className="mt-3"
				>
					Your key stays in this browser&rsquo;s local storage and is sent
					directly to OpenRouter. Editor Playground never stores or proxies it.
				</NoticeSurface>
				{showFreeTierNotice ? (
					<NoticeSurface tone="info" className="mt-2">
						You&rsquo;re on the free tier, which is rate-limited by OpenRouter.
						For higher limits, switch to OpenRouter Auto, Floor, or a specific
						paid model above.
					</NoticeSurface>
				) : null}
			</PlainGroup>
		</>
	);
}

function ConnectionCheckIcon({ state }: { state: ConnectionCheckState }) {
	if (state.status === "checking") {
		return (
			<LoaderCircle
				className="editor-text-muted h-4 w-4 animate-spin"
				aria-label="Checking OpenRouter connection"
			/>
		);
	}

	if (state.status === "success") {
		return (
			<CheckCircle2
				className="editor-success-text h-4 w-4"
				aria-label={`OpenRouter connection OK for ${state.modelId}`}
			/>
		);
	}

	return null;
}

function ConnectionCheckNotice({ state }: { state: ConnectionCheckState }) {
	if (state.status === "error") {
		return (
			<NoticeSurface tone="warning" className="mt-3">
				OpenRouter connection failed
				{state.modelId ? ` for ${state.modelId}` : ""}: {state.message}
			</NoticeSurface>
		);
	}

	return null;
}
