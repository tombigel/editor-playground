import { forceOpaqueColorValue } from '../../model/colors';
import { isGradientText } from '../../model/gradient';
import type {
  BorderRadiusField,
  BorderWidthField,
  ContainerSubtype,
  DocumentModel,
  NodeId,
  ShadowStyleField,
  WrapperStyleField,
} from '../../model/types';
import { isContainerNode } from '../../model/types';
import { parseSpacingValue, parseUnitValue } from '../../model/units';
import { cloneDocument } from './shared';

export function setWrapperStyleFieldDoc(
  document: DocumentModel,
  nodeId: NodeId,
  field: WrapperStyleField,
  value: string,
): DocumentModel {
  const next = cloneDocument(document);
  const node = next.nodes[nodeId];
  if (!isContainerNode(node)) {
    return document;
  }

  node.style = node.style ?? {};

  if (field === 'sectionBorderBottomWidth') {
    node.style.sectionBorderBottomWidth = value ? parseUnitValue(value) : undefined;
    return next;
  }

  if (field === 'background' && isStructuralWrapperSubtype(node.subtype)) {
    node.style.background = value ? forceOpaqueColorValue(value) : undefined;
    return next;
  }

  if (field === 'backgroundGradient') {
    // Gradient text must stay verbatim (alpha stops, var()/color-mix() colors);
    // the structural-wrapper force-opaque rule applies to the base color only.
    if (value && !isGradientText(value)) {
      return document;
    }
    node.style.backgroundGradient = value || undefined;
    // A repeating gradient whose stops span 0-100% renders identically to a
    // non-repeating one; only a background-size makes the tiling visible. Seed
    // a real size on first repeat so the toggle has an immediate effect and the
    // size controls show data that exists in the model.
    if (value?.startsWith('repeating-') && !node.style.backgroundSize) {
      node.style.backgroundSize = '40px 40px';
    }
    return next;
  }

  if (field === 'backgroundSize') {
    node.style.backgroundSize = value.trim() || undefined;
    return next;
  }

  if (field === 'backgroundClipText') {
    node.style.backgroundClipText = value === 'true' ? true : undefined;
    return next;
  }

  if (isWrapperPaddingField(field)) {
    node.style[field] = value ? parseSpacingValue(value) : undefined;
    return next;
  }

  if (isBorderWidthField(field) || isBorderRadiusField(field)) {
    node.style[field] = value ? parseUnitValue(value) : undefined;
    return next;
  }

  if (isShadowStyleField(field)) {
    if (field === 'shadowColor') {
      node.style.shadowColor = value || undefined;
    } else {
      const parsed = parseShadowLength(value);
      if (parsed != null) {
        node.style[field] = parsed;
      }
    }
    return next;
  }

  node.style[field] = value || undefined;
  return next;
}

function parseShadowLength(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isStructuralWrapperSubtype(subtype: ContainerSubtype) {
  return subtype === 'section' || subtype === 'header' || subtype === 'footer';
}

function isBorderWidthField(field: WrapperStyleField): field is BorderWidthField {
  return (
    field === 'borderWidth' ||
    field === 'borderTopWidth' ||
    field === 'borderRightWidth' ||
    field === 'borderBottomWidth' ||
    field === 'borderLeftWidth'
  );
}

function isBorderRadiusField(field: WrapperStyleField): field is BorderRadiusField {
  return (
    field === 'borderRadius' ||
    field === 'borderTopLeftRadius' ||
    field === 'borderTopRightRadius' ||
    field === 'borderBottomRightRadius' ||
    field === 'borderBottomLeftRadius'
  );
}

function isShadowStyleField(field: WrapperStyleField): field is ShadowStyleField {
  return (
    field === 'shadowColor' ||
    field === 'shadowBlur' ||
    field === 'shadowSpread' ||
    field === 'shadowOffsetX' ||
    field === 'shadowOffsetY'
  );
}

function isWrapperPaddingField(
  field: WrapperStyleField,
): field is Extract<WrapperStyleField, 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'> {
  return field === 'paddingTop' || field === 'paddingRight' || field === 'paddingBottom' || field === 'paddingLeft';
}
