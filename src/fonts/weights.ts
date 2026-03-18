import type { DocumentFontFamily } from '../model/types';

export const DEFAULT_FONT_WEIGHT = 400;
export const BOLD_FONT_WEIGHT = 800;
export const BOLD_ACTIVE_WEIGHT = 700;
export const FONT_WEIGHT_MIN = 100;
export const FONT_WEIGHT_MAX = 900;

export function isBoldFontWeight(weight: number | undefined) {
  return (weight ?? DEFAULT_FONT_WEIGHT) >= BOLD_ACTIVE_WEIGHT;
}

export function clampFontWeight(weight: number) {
  return Math.min(FONT_WEIGHT_MAX, Math.max(FONT_WEIGHT_MIN, Math.round(weight)));
}

export function parseFontWeightInput(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return clampFontWeight(parsed);
}

export function getSupportedFontWeights(fontFamily: Pick<DocumentFontFamily, 'variants' | 'axes' | 'isVariable'> | undefined) {
  if (!fontFamily) {
    return [] as number[];
  }
  if (fontFamily.isVariable && fontFamily.axes?.some((axis) => axis.tag === 'wght')) {
    const weightAxis = fontFamily.axes.find((axis) => axis.tag === 'wght');
    if (weightAxis) {
      const min = clampFontWeight(weightAxis.min);
      const max = clampFontWeight(weightAxis.max);
      const steppedWeights: number[] = [];
      const steppedMin = Math.ceil(min / 100) * 100;
      const steppedMax = Math.floor(max / 100) * 100;

      for (let weight = steppedMin; weight <= steppedMax; weight += 100) {
        steppedWeights.push(weight);
      }

      return [...new Set([min, ...steppedWeights, max])].sort((left, right) => left - right);
    }
  }
  const weights = fontFamily.variants.flatMap((variant) => {
    if (variant === 'regular' || variant === 'italic') {
      return [DEFAULT_FONT_WEIGHT];
    }
    const match = variant.match(/(\d{3})/);
    return match ? [clampFontWeight(Number.parseInt(match[1], 10))] : [];
  });
  return [...new Set(weights)].sort((left, right) => left - right);
}

export function getFontWeightLabel(weight: number) {
  if (weight <= 150) {
    return 'Thin';
  }
  if (weight <= 250) {
    return 'Extra Light';
  }
  if (weight <= 350) {
    return 'Light';
  }
  if (weight <= 450) {
    return 'Normal';
  }
  if (weight <= 550) {
    return 'Medium';
  }
  if (weight <= 650) {
    return 'Semi Bold';
  }
  if (weight <= 750) {
    return 'Bold';
  }
  if (weight <= 850) {
    return 'Extra Bold';
  }
  return 'Black';
}

export function listFontWeightOptions(
  fontFamily: Pick<DocumentFontFamily, 'variants' | 'axes' | 'isVariable'> | undefined,
  currentWeight: number | undefined,
) {
  const supportedWeights = getSupportedFontWeights(fontFamily);
  const weights = supportedWeights.length > 0 ? supportedWeights : [100, 200, 300, 400, 500, 600, 700, 800, 900];
  const resolvedWeights =
    currentWeight && !weights.includes(currentWeight) ? [...weights, currentWeight].sort((left, right) => left - right) : weights;

  return resolvedWeights.map((weight) => ({
    value: weight,
    label: getFontWeightLabel(weight),
  }));
}

export function resolveNearestSupportedFontWeight(
  targetWeight: number,
  fontFamily: Pick<DocumentFontFamily, 'variants' | 'axes' | 'isVariable'> | undefined,
) {
  const clampedTarget = clampFontWeight(targetWeight);
  const supportedWeights = getSupportedFontWeights(fontFamily);
  if (supportedWeights.length === 0) {
    return clampedTarget;
  }
  if (fontFamily?.isVariable && fontFamily.axes?.some((axis) => axis.tag === 'wght')) {
    const axis = fontFamily.axes.find((entry) => entry.tag === 'wght');
    if (!axis) {
      return clampedTarget;
    }
    return Math.min(clampFontWeight(axis.max), Math.max(clampFontWeight(axis.min), clampedTarget));
  }

  return supportedWeights.reduce((closest, candidate) => {
    const candidateDistance = Math.abs(candidate - clampedTarget);
    const closestDistance = Math.abs(closest - clampedTarget);
    if (candidateDistance < closestDistance) {
      return candidate;
    }
    if (candidateDistance === closestDistance) {
      return candidate > closest ? candidate : closest;
    }
    return closest;
  }, supportedWeights[0]);
}

export function toggleBoldFontWeight(
  currentWeight: number | undefined,
  fontFamily: Pick<DocumentFontFamily, 'variants' | 'axes' | 'isVariable'> | undefined,
) {
  return isBoldFontWeight(currentWeight)
    ? resolveNearestSupportedFontWeight(DEFAULT_FONT_WEIGHT, fontFamily)
    : resolveNearestSupportedFontWeight(BOLD_FONT_WEIGHT, fontFamily);
}
