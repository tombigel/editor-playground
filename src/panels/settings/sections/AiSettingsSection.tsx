import { useCallback, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ControlGroup,
  LabeledControlRow,
  NoticeSurface,
  PlainGroup,
  SectionHeading,
} from '@/components/ui/settings-panel';
import { AI_PROVIDER_KEY_STORAGE_KEY } from '@/panels/AiPanel';
import {
  AUTO_MODEL_ID,
  CURATED_MODELS,
  FLOOR_MODEL_SENTINEL,
  FREE_MODEL_SENTINEL,
  getFreeCuratedModel,
  type CuratedModelTier,
} from '@/ai/providers/curatedModels';

const TIER_ORDER: CuratedModelTier[] = ['low-cost', 'good', 'free'];

const TIER_LABEL: Record<CuratedModelTier, string> = {
  'low-cost': 'Low-cost',
  good: 'Premium',
  free: 'Free',
};
import {
  loadPersistedConversationState,
  persistConversationState,
} from '@/ai/conversationStore';

/**
 * Reads the stored OpenRouter API key using the exact same shape
 * `AiPanel.tsx`'s `readStoredApiKey` uses: a plain (non-JSON) trimmed string,
 * or `null` when absent/blank. Kept local rather than imported so this
 * section has no runtime dependency on `AiPanel`'s internal helper — only on
 * the shared storage key constant, which IS imported to guarantee both sides
 * agree on where the key lives.
 */
function readStoredApiKey(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    const raw = window.localStorage.getItem(AI_PROVIDER_KEY_STORAGE_KEY);
    return raw && raw.trim().length > 0 ? raw.trim() : '';
  } catch {
    return '';
  }
}

function writeStoredApiKey(value: string): void {
  if (typeof window === 'undefined') {
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

function getSelectedModelLabel(modelId: string): string {
  if (modelId === AUTO_MODEL_ID) {
    return 'Auto';
  }
  if (modelId === FLOOR_MODEL_SENTINEL) {
    return 'Floor';
  }
  if (modelId === FREE_MODEL_SENTINEL) {
    return 'Free';
  }
  const curated = CURATED_MODELS.find((model) => model.id === modelId);
  if (curated) {
    return `${TIER_LABEL[curated.tier]} · ${curated.name}`;
  }
  return modelId.trim().length > 0 ? `Custom: ${modelId}` : 'Free';
}

function selectionResolvesToFreeTier(modelId: string): boolean {
  const freeModel = getFreeCuratedModel();
  return modelId === FREE_MODEL_SENTINEL || (freeModel ? modelId === freeModel.id : false);
}

export function AiSettingsSection() {
  const [apiKey, setApiKey] = useState<string>(() => readStoredApiKey());
  const [selectedModelId, setSelectedModelIdState] = useState<string>(() =>
    readSelectedModelId(),
  );

  const handleApiKeyChange = useCallback((value: string) => {
    setApiKey(value);
    writeStoredApiKey(value);
  }, []);

  const handleClearApiKey = useCallback(() => {
    setApiKey('');
    writeStoredApiKey('');
  }, []);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModelIdState(modelId);
    writeSelectedModelId(modelId);
  }, []);

  const selectedModelLabel = getSelectedModelLabel(selectedModelId);
  const showFreeTierNotice = apiKey.length > 0 && selectionResolvesToFreeTier(selectedModelId);

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
          </LabeledControlRow>
          <LabeledControlRow label="Model" controlWidth="280px">
            <Select value={selectedModelId} onValueChange={handleModelChange}>
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
                        Always uses the free-tier model. Rate-limited, no fallback.
                      </span>
                    </span>
                  </SelectItem>
                  <SelectItem value={FLOOR_MODEL_SENTINEL}>
                    <span className="flex flex-col">
                      <span>Floor</span>
                      <span className="editor-text-muted text-[11px]">
                        Cheapest paid curated model, routed to the cheapest provider.
                      </span>
                    </span>
                  </SelectItem>
                  <SelectItem value={AUTO_MODEL_ID}>
                    <span className="flex flex-col">
                      <span>Auto</span>
                      <span className="editor-text-muted text-[11px]">
                        Tries the cheapest model first, then falls back on retryable errors.
                      </span>
                    </span>
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator />
                {TIER_ORDER.flatMap((tier, tierIndex) => {
                  const modelsInTier = CURATED_MODELS.filter((model) => model.tier === tier);
                  if (modelsInTier.length === 0) {
                    return [];
                  }
                  return [
                    tierIndex > 0 ? <SelectSeparator key={`${tier}-sep`} /> : null,
                    ...modelsInTier.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <span className="flex flex-col">
                          <span>
                            {TIER_LABEL[tier]} · {model.provider} — {model.name}
                          </span>
                          <span className="editor-text-muted text-[11px]">{model.label}</span>
                        </span>
                      </SelectItem>
                    )),
                  ];
                })}
              </SelectContent>
            </Select>
          </LabeledControlRow>
        </ControlGroup>
        <NoticeSurface tone="info" icon={<KeyRound className="h-3.5 w-3.5" />} className="mt-3">
          Your OpenRouter API key is stored only in this browser&rsquo;s local
          storage and is sent directly from your browser to OpenRouter — never
          to any other server. This tool is bring-your-own-model by design: no
          proxy or backend ever sees or stores your key. That is a deliberate
          client-only tradeoff, not a security oversight.
        </NoticeSurface>
        <NoticeSurface tone="message" className="mt-2">
          Models are grouped by cost/value tier — Low-cost models benchmark
          close to frontier quality at a fraction of the price; Premium models
          are top-of-market frontier options; Free is rate-limited and best
          for trying the assistant out. OpenRouter still requires a free API
          key for free-tier models (no credit card needed). Tier picks are
          chosen from published OpenRouter pricing and benchmarks across
          providers, not defaulted to any single vendor.
        </NoticeSurface>
        {showFreeTierNotice ? (
          <NoticeSurface tone="info" className="mt-2">
            You&rsquo;re on the free tier, which is rate-limited by OpenRouter.
            For higher limits, switch to Floor, Auto, or a specific paid model above.
          </NoticeSurface>
        ) : null}
      </PlainGroup>
    </>
  );
}
