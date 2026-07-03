import { useCallback, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ControlGroup,
  LabeledControlRow,
  NoticeSurface,
  PlainGroup,
  SectionHeading,
} from '@/components/ui/settings-panel';
import { AI_PROVIDER_KEY_STORAGE_KEY } from '@/panels/AiPanel';
import { CURATED_MODELS } from '@/ai/providers/curatedModels';
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
  return persisted.selectedModelId ?? CURATED_MODELS[0]?.id ?? '';
}

function writeSelectedModelId(modelId: string): void {
  const persisted = loadPersistedConversationState();
  persistConversationState({ ...persisted, selectedModelId: modelId });
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

  const selectedModel =
    CURATED_MODELS.find((model) => model.id === selectedModelId) ?? CURATED_MODELS[0];

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
            <Select value={selectedModel?.id} onValueChange={handleModelChange}>
              <SelectTrigger aria-label="Model">
                <SelectValue>{selectedModel?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CURATED_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.provider} — {model.label}
                  </SelectItem>
                ))}
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
      </PlainGroup>
    </>
  );
}
