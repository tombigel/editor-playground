import {
  AUTO_MODEL_ID,
  FLOOR_MODEL_SENTINEL,
  FREE_MODEL_SENTINEL,
  getFloorCuratedModel,
  getFreeCuratedModel,
  getModelsInAscendingPriceOrder,
} from './curatedModels';

export type ResolvedModelSelection =
  | { kind: 'single'; modelId: string; applyFloorSuffix: boolean }
  | { kind: 'auto-fallback'; candidateModelIds: string[] };

export function withFloorSuffix(modelId: string): string {
  return modelId.endsWith(':floor') ? modelId : `${modelId}:floor`;
}

export function resolveModelSelection(rawSelection: string): ResolvedModelSelection {
  if (rawSelection === AUTO_MODEL_ID) {
    return {
      kind: 'auto-fallback',
      candidateModelIds: getModelsInAscendingPriceOrder().map((model) => model.id),
    };
  }

  if (rawSelection === FREE_MODEL_SENTINEL) {
    return {
      kind: 'single',
      modelId: getFreeCuratedModel()?.id ?? rawSelection,
      applyFloorSuffix: false,
    };
  }

  if (rawSelection === FLOOR_MODEL_SENTINEL) {
    return {
      kind: 'single',
      modelId: getFloorCuratedModel()?.id ?? rawSelection,
      applyFloorSuffix: true,
    };
  }

  return { kind: 'single', modelId: rawSelection, applyFloorSuffix: false };
}
