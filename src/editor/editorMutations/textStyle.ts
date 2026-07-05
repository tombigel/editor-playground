import { normalizeDocumentFontState } from '../../fonts';
import type {
  BorderRadiusField,
  BorderWidthField,
  EditorTextField,
  NodeId,
  ShadowStyleField,
  WrapperStyleField,
} from '../../model/types';
import { isContainerNode } from '../../model/types';
import { forceOpaqueColorValue } from '../../model/colors';
import { isGradientText } from '../../model/gradient';
import { parseSpacingValue, parseUnitValue } from '../../model/units';
import {
  applyMarkdownToTextNodeDoc,
  setNodeVisibilityDoc,
  setTextNodeContentDoc,
} from '../../api/documentApi';
import type { EditorState } from '../types';
import { cloneDocument, isStructuralWrapper } from '../editorPersistence';
import { applySelectionToDocument } from './shared';

export function updateTextField(
  state: EditorState,
  nodeId: NodeId,
  field: EditorTextField,
  value: string,
): EditorState {
  const document = setTextNodeContentDoc(state.document, nodeId, field, value);
  if (document === state.document) {
    return state;
  }
  return { ...state, document: normalizeDocumentFontState(document) };
}

export function applyTextNodeMarkdown(
  state: EditorState,
  nodeId: NodeId,
  markdown: string,
): EditorState {
  const document = applyMarkdownToTextNodeDoc(state.document, nodeId, markdown);
  if (document === state.document) {
    return state;
  }
  return { ...state, document: normalizeDocumentFontState(document) };
}

export function setNodeVisibility(
  state: EditorState,
  nodeId: NodeId,
  visible: boolean,
): EditorState {
  const document = setNodeVisibilityDoc(state.document, nodeId, visible);
  return document === state.document ? state : applySelectionToDocument(state, document);
}

export function updateWrapperStyleField(
  state: EditorState,
  nodeId: NodeId,
  field: WrapperStyleField,
  value: string,
): EditorState {
  const document = cloneDocument(state.document);
  const node = document.nodes[nodeId];
  if (!isContainerNode(node)) {
    return state;
  }

  node.style = node.style ?? {};

  if (field === 'sectionBorderBottomWidth') {
    node.style.sectionBorderBottomWidth = value ? parseUnitValue(value) : undefined;
    return { ...state, document };
  }

  if (field === 'background' && isStructuralWrapper(node.subtype)) {
    node.style.background = value ? forceOpaqueColorValue(value) : undefined;
    return { ...state, document };
  }

  if (field === 'backgroundGradient') {
    // Gradient text must stay verbatim (alpha stops, var()/color-mix() colors);
    // the structural-wrapper force-opaque rule applies to the base color only.
    if (value && !isGradientText(value)) {
      return state;
    }
    node.style.backgroundGradient = value || undefined;
    return { ...state, document };
  }

  if (field === 'backgroundSize') {
    node.style.backgroundSize = value.trim() || undefined;
    return { ...state, document };
  }

  if (field === 'backgroundClipText') {
    node.style.backgroundClipText = value === 'true' ? true : undefined;
    return { ...state, document };
  }

  if (isWrapperPaddingField(field)) {
    node.style[field] = value ? parseSpacingValue(value) : undefined;
    return { ...state, document };
  }

  if (isBorderWidthField(field) || isBorderRadiusField(field)) {
    node.style[field] = value ? parseUnitValue(value) : undefined;
    return { ...state, document };
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
    return { ...state, document };
  }

  node.style[field] = value || undefined;
  return { ...state, document };
}

function parseShadowLength(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBorderWidthField(field: EditorTextField | WrapperStyleField): field is BorderWidthField {
  return (
    field === 'borderWidth' ||
    field === 'borderTopWidth' ||
    field === 'borderRightWidth' ||
    field === 'borderBottomWidth' ||
    field === 'borderLeftWidth'
  );
}

function isBorderRadiusField(field: EditorTextField | WrapperStyleField): field is BorderRadiusField {
  return (
    field === 'borderRadius' ||
    field === 'borderTopLeftRadius' ||
    field === 'borderTopRightRadius' ||
    field === 'borderBottomRightRadius' ||
    field === 'borderBottomLeftRadius'
  );
}

function isShadowStyleField(field: EditorTextField | WrapperStyleField): field is ShadowStyleField {
  return (
    field === 'shadowColor' ||
    field === 'shadowBlur' ||
    field === 'shadowSpread' ||
    field === 'shadowOffsetX' ||
    field === 'shadowOffsetY'
  );
}

function isWrapperPaddingField(
  field: EditorTextField | WrapperStyleField,
): field is Extract<WrapperStyleField, 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'> {
  return field === 'paddingTop' || field === 'paddingRight' || field === 'paddingBottom' || field === 'paddingLeft';
}
