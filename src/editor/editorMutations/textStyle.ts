import { normalizeDocumentFontState } from '../../fonts';
import type { EditorTextField, NodeId, WrapperStyleField } from '../../model/types';
import {
  applyMarkdownToTextNodeDoc,
  setNodeVisibilityDoc,
  setTextNodeContentDoc,
  setWrapperStyleFieldDoc,
} from '../../api/documentApi';
import type { EditorState } from '../types';
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
  const document = setWrapperStyleFieldDoc(state.document, nodeId, field, value);
  return document === state.document ? state : { ...state, document };
}
