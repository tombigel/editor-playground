/**
 * @module animationRuntime
 *
 * Stateful runtime API for animation preview.
 * Uses @wix/interact/web with imperative add/remove for the editor stage,
 * where wrapping elements in <interact-element> is not feasible.
 */

import { Interact, add, remove } from '@wix/interact/web';
import type { InteractConfig } from '@wix/interact/web';
import type { DocumentModel } from '../model/types';
import type { AnimationInvokeAction, AnimationPreviewHandle, AnimationTriggerType } from './types';
import { buildDocumentInteractConfig } from './animationApi';

// ── Preset registration (once per session) ──────────────────────────────────

let presetsRegistered = false;
let loadPromise: Promise<void> | null = null;

/**
 * Starts loading @wix/motion-presets if not already in flight.
 * Safe to call multiple times — only one load is ever started.
 */
export function preloadMotionPresets(): void {
  if (loadPromise) return;
  loadPromise = import('@wix/motion-presets').then((m) => {
    if (!presetsRegistered) {
      // Type mismatch between @wix/motion-presets exports and registerEffects signature —
      // the runtime accepts it fine, the types just don't align across packages.
      Interact.registerEffects(m as unknown as Parameters<typeof Interact.registerEffects>[0]);
      presetsRegistered = true;
    }
  });
}

async function ensurePresetsRegistered(): Promise<void> {
  if (presetsRegistered) return;
  preloadMotionPresets();
  await loadPromise;
}

// ── createAnimationPreview ────────────────────────────────────────────────────

/**
 * Registers all stage elements that have `data-interact-key` with Interact
 * via the imperative `add(element, key)` API.
 * Returns the set of registered keys for later cleanup.
 */
function registerInteractElements(): Set<string> {
  if (typeof document === 'undefined') return new Set();
  const keys = new Set<string>();
  const elements = document.querySelectorAll<HTMLElement>('[data-interact-key]');
  for (const el of elements) {
    const key = el.getAttribute('data-interact-key');
    if (key) {
      add(el, key);
      keys.add(key);
    }
  }
  return keys;
}

/** Unregisters previously registered keys via `remove(key)`. */
function unregisterInteractElements(keys: Set<string>) {
  for (const key of keys) {
    remove(key);
  }
}

export async function createAnimationPreview(config: InteractConfig): Promise<AnimationPreviewHandle> {
  await ensurePresetsRegistered();

  let instance: Interact | null = Interact.create(config);
  let registeredKeys = registerInteractElements();
  let currentConfig = config;

  return {
    updateConfig(newConfig: InteractConfig): void {
      if (JSON.stringify(newConfig) === JSON.stringify(currentConfig)) return;
      // Tear down old instance and elements
      instance?.destroy();
      unregisterInteractElements(registeredKeys);
      // Create new instance, then re-register elements (DOM may have changed)
      instance = Interact.create(newConfig);
      registeredKeys = registerInteractElements();
      currentConfig = newConfig;
    },

    invoke(nodeId: string, action: AnimationInvokeAction): void {
      if (typeof document === 'undefined') return;
      const el = document.querySelector<HTMLElement>(`[data-interact-key="${nodeId}"]`);
      if (!el) return;

      if (action === 'click') {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      } else if (action === 'hoverIn') {
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      } else if (action === 'hoverOut') {
        el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
      }
    },

    destroy(): void {
      instance?.destroy();
      unregisterInteractElements(registeredKeys);
      registeredKeys = new Set();
      instance = null;
    },

    isActive(): boolean {
      return instance !== null;
    },
  };
}

// ── filterInteractConfig ──────────────────────────────────────────────────────

const TRIGGER_TYPE_TO_INTERACT: Record<string, AnimationTriggerType[]> = {
  viewEnter: ['entrance', 'ongoing'],
  viewProgress: ['scroll'],
  click: ['click', 'activate'],
  activate: ['click', 'activate'],
  hover: ['hover', 'interest'],
  interest: ['hover', 'interest'],
  pointerMove: ['mouse'],
};

function isInteractionEnabled(
  interactionTrigger: string,
  triggers: Partial<Record<AnimationTriggerType, boolean>>,
): boolean {
  if (interactionTrigger === 'activate' || interactionTrigger === 'click') {
    return triggers.activate ?? triggers.click ?? true;
  }
  if (interactionTrigger === 'interest' || interactionTrigger === 'hover') {
    return triggers.interest ?? triggers.hover ?? true;
  }

  const mappedTypes = TRIGGER_TYPE_TO_INTERACT[interactionTrigger];
  if (!mappedTypes) {
    return true;
  }
  return mappedTypes.some((type) => triggers[type] !== false);
}

export function filterInteractConfig(
  config: InteractConfig,
  triggers: Partial<Record<AnimationTriggerType, boolean>>,
): InteractConfig {
  const filteredInteractions = config.interactions.filter((interaction) => {
    return isInteractionEnabled(interaction.trigger, triggers);
  });

  return {
    ...config,
    interactions: filteredInteractions,
  };
}

// ── buildPreviewConfig ────────────────────────────────────────────────────────

export function buildPreviewConfig(
  doc: DocumentModel,
  triggers: Partial<Record<AnimationTriggerType, boolean>>,
): InteractConfig {
  return filterInteractConfig(buildDocumentInteractConfig(doc), triggers);
}
