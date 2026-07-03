import {
  AUTO_MODEL_ID,
  FLOOR_MODEL_SENTINEL,
  FREE_MODEL_SENTINEL,
} from './curatedModels';
import type { OpenRouterAdapterOptions } from './openRouterAdapter';

export const OPENROUTER_FREE_MODEL_ID = 'openrouter/free';
export const OPENROUTER_AUTO_MODEL_ID = 'openrouter/auto';
export const OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF = 10;

export type ResolvedModelSelection = { modelId: string; adapterOptions?: OpenRouterAdapterOptions };

export function resolveModelSelection(rawSelection: string): ResolvedModelSelection {
  if (rawSelection === AUTO_MODEL_ID) {
    return {
      modelId: OPENROUTER_AUTO_MODEL_ID,
    };
  }

  if (rawSelection === FREE_MODEL_SENTINEL) {
    return {
      modelId: OPENROUTER_FREE_MODEL_ID,
    };
  }

  if (rawSelection === FLOOR_MODEL_SENTINEL) {
    return {
      modelId: OPENROUTER_AUTO_MODEL_ID,
      adapterOptions: { autoRouterCostQualityTradeoff: OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF },
    };
  }

  return { modelId: rawSelection };
}
