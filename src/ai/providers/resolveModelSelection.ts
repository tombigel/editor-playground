import {
  AUTO_MODEL_ID,
  FLOOR_MODEL_SENTINEL,
  FREE_MODEL_SENTINEL,
} from './curatedModels';
import type { OpenRouterAdapterOptions } from './openRouterAdapter';

export const OPENROUTER_FREE_MODEL_ID = 'openrouter/free';
export const OPENROUTER_AUTO_MODEL_ID = 'openrouter/auto';
export const OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF = 10;

export type ResolvedModelSelection =
  | { kind: 'single'; modelId: string; applyFloorSuffix: boolean; adapterOptions?: OpenRouterAdapterOptions }
  | { kind: 'auto-fallback'; candidateModelIds: string[] };

export function withFloorSuffix(modelId: string): string {
  return modelId.endsWith(':floor') ? modelId : `${modelId}:floor`;
}

export function resolveModelSelection(rawSelection: string): ResolvedModelSelection {
  if (rawSelection === AUTO_MODEL_ID) {
    return {
      kind: 'single',
      modelId: OPENROUTER_AUTO_MODEL_ID,
      applyFloorSuffix: false,
    };
  }

  if (rawSelection === FREE_MODEL_SENTINEL) {
    return {
      kind: 'single',
      modelId: OPENROUTER_FREE_MODEL_ID,
      applyFloorSuffix: false,
    };
  }

  if (rawSelection === FLOOR_MODEL_SENTINEL) {
    return {
      kind: 'single',
      modelId: OPENROUTER_AUTO_MODEL_ID,
      applyFloorSuffix: false,
      adapterOptions: { autoRouterCostQualityTradeoff: OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF },
    };
  }

  return { kind: 'single', modelId: rawSelection, applyFloorSuffix: false };
}
