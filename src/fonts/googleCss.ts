import type { DocumentModel, DocumentFontFamily } from '../model/types';
import { isTextNode } from '../model/types';
import { extractPrimaryFontFamily } from './defaults';
import { getDocumentFontFamily } from './documentFonts';
import { DEFAULT_FONT_WEIGHT, resolveNearestSupportedFontWeight } from './weights';

type FontRequest = {
  family: string;
  weights: number[];
  isVariable: boolean;
  variableRange?: { min: number; max: number };
};

const GOOGLE_FONTS_CSS_API_URL = 'https://fonts.googleapis.com/css2';

export function buildGoogleFontsStylesheetHref(requests: FontRequest[]) {
  if (requests.length === 0) {
    return null;
  }

  const url = new URL(GOOGLE_FONTS_CSS_API_URL);
  for (const request of requests) {
    const familyQuery = extractPrimaryFontFamily(request.family);
    if (!familyQuery) {
      continue;
    }
    if (request.isVariable && request.variableRange) {
      url.searchParams.append('family', `${familyQuery}:wght@${request.variableRange.min}..${request.variableRange.max}`);
      continue;
    }
    const weights = [...new Set(request.weights)].sort((left, right) => left - right);
    url.searchParams.append('family', `${familyQuery}:wght@${weights.join(';')}`);
  }
  url.searchParams.set('display', 'swap');
  return url.toString();
}

export function collectDocumentFontRequests(document: DocumentModel) {
  const requests = new Map<string, FontRequest>();

  for (const node of Object.values(document.nodes)) {
    if (!isTextNode(node)) {
      continue;
    }

    const familyName = node.style?.fontFamily ? extractPrimaryFontFamily(node.style.fontFamily) : '';
    if (!familyName) {
      continue;
    }

    const family = getDocumentFontFamily(document, familyName);
    const request = requests.get(familyName) ?? createFontRequest(familyName, family);
    if (!request.isVariable) {
      request.weights.push(node.style?.fontWeight ?? 400);
    }
    requests.set(familyName, request);
  }

  return [...requests.values()].map((request) => ({
    ...request,
    weights: [...new Set(request.weights)].sort((left, right) => left - right),
  }));
}

export function buildDocumentGoogleFontsStylesheetHref(document: DocumentModel) {
  return buildGoogleFontsStylesheetHref(collectDocumentFontRequests(document));
}

export function buildEditorGoogleFontsStylesheetHref(document: DocumentModel) {
  const requestMap = new Map(collectDocumentFontRequests(document).map((request) => [request.family, request]));

  for (const family of document.fontLibrary.usedFamilies) {
    const existing = requestMap.get(family.family);
    const previewWeight = resolveNearestSupportedFontWeight(DEFAULT_FONT_WEIGHT, family);
    const weightAxis = family.axes?.find((axis) => axis.tag === 'wght');

    if (existing) {
      if (!existing.isVariable) {
        existing.weights.push(previewWeight);
      }
      continue;
    }

    requestMap.set(family.family, {
      family: family.family,
      weights: family.isVariable ? [] : [previewWeight],
      isVariable: Boolean(family.isVariable && weightAxis),
      variableRange: weightAxis ? { min: weightAxis.min, max: weightAxis.max } : undefined,
    });
  }

  return buildGoogleFontsStylesheetHref([...requestMap.values()]);
}

export function buildFontPreviewStylesheetHref(families: DocumentFontFamily[]) {
  return buildGoogleFontsStylesheetHref(
    [...new Map(families.map((family) => [family.family, family])).values()].map((family) => ({
      family: family.family,
      weights: [resolveNearestSupportedFontWeight(DEFAULT_FONT_WEIGHT, family)],
      isVariable: false,
      variableRange: undefined,
    })),
  );
}

export function buildFontPickerPreviewStylesheetHref(options: {
  families: DocumentFontFamily[];
  activeFamilyName?: string;
  activeWeights?: number[];
}) {
  const activeWeightSet = [...new Set((options.activeWeights ?? []).filter((weight) => Number.isFinite(weight) && weight > 0))]
    .sort((left, right) => left - right);

  return buildGoogleFontsStylesheetHref(
    [...new Map(options.families.map((family) => [family.family, family])).values()].map((family) => {
      const weightAxis = family.axes?.find((axis) => axis.tag === 'wght');
      const isActiveFamily = family.family === options.activeFamilyName;

      if (isActiveFamily && family.isVariable && weightAxis) {
        return {
          family: family.family,
          weights: [],
          isVariable: true,
          variableRange: { min: weightAxis.min, max: weightAxis.max },
        };
      }

      if (isActiveFamily) {
        return {
          family: family.family,
          weights: activeWeightSet.length > 0 ? activeWeightSet : [resolveNearestSupportedFontWeight(DEFAULT_FONT_WEIGHT, family)],
          isVariable: false,
          variableRange: undefined,
        };
      }

      return {
        family: family.family,
        weights: [resolveNearestSupportedFontWeight(DEFAULT_FONT_WEIGHT, family)],
        isVariable: false,
        variableRange: undefined,
      };
    }),
  );
}

function createFontRequest(familyName: string, family: DocumentFontFamily | undefined): FontRequest {
  const weightAxis = family?.axes?.find((axis) => axis.tag === 'wght');
  return {
    family: familyName,
    weights: [],
    isVariable: Boolean(family?.isVariable && weightAxis),
    variableRange: weightAxis ? { min: weightAxis.min, max: weightAxis.max } : undefined,
  };
}
