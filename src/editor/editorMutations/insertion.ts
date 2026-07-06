import type { SectionTemplateId } from '../../model/defaults';
import type { ContainerSubtype, DocumentModel, NodeId } from '../../model/types';
import { isContainerNode } from '../../model/types';
import { insertContainerDoc, insertLeafDoc, insertSectionTemplateDoc, type LeafInsertionRole } from '../../api/documentApi';
import type { EditorState } from '../types';
import { applySelectionToDocument } from './shared';

export function insertWrapper(state: EditorState, role: ContainerSubtype): EditorState {
  const insertType = isNestableContainerRole(role) ? 'containerWrapper' : 'siteWrapper';
  const parentId = state.selectedId
    ? getInsertionParent(state.document, state.selectedId, insertType)
    : isNestableContainerRole(role)
      ? findFirstSection(state.document) ?? state.document.rootId
      : state.document.rootId;
  const document = insertContainerDoc(state.document, role, parentId, { pageId: state.activePageId });
  if (document === state.document) {
    return state;
  }
  const insertedId = Object.keys(document.nodes).find((nodeId) => !state.document.nodes[nodeId]);
  if (!insertedId) {
    return state;
  }
  return applySelectionToDocument(state, document, [insertedId]);
}

export function insertSectionTemplate(state: EditorState, templateId: SectionTemplateId): EditorState {
  const document = insertSectionTemplateDoc(state.document, templateId, {
    selectedId: state.selectedId,
    pageId: state.activePageId,
  });
  if (document === state.document) {
    return state;
  }

  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    return state;
  }

  const insertedId = root.children.find((childId) => !state.document.nodes[childId]);
  if (!insertedId) {
    return state;
  }

  return applySelectionToDocument(state, document, [insertedId]);
}

export function insertLeaf(state: EditorState, role: LeafInsertionRole): EditorState {
  const parentId = state.selectedId
    ? getInsertionParent(state.document, state.selectedId, 'leaf')
    : findFirstSection(state.document) ?? state.document.rootId;
  const document = insertLeafDoc(state.document, role, parentId);
  if (document === state.document) {
    return state;
  }

  const insertedId = Object.keys(document.nodes).find((nodeId) => !state.document.nodes[nodeId]);
  if (!insertedId) {
    return state;
  }

  return applySelectionToDocument(state, document, [insertedId]);
}

function findFirstSection(document: DocumentModel): NodeId | null {
  for (const node of Object.values(document.nodes)) {
    if (isContainerNode(node) && (node.subtype === 'section' || isNestableContainerRole(node.subtype))) {
      return node.id;
    }
  }
  return null;
}

function isNestableContainerRole(role: ContainerSubtype) {
  return role === 'container' || role === 'nav' || role === 'aside' || role === 'article';
}

function getInsertionParent(
  document: DocumentModel,
  selectedId: NodeId,
  insertType: 'siteWrapper' | 'containerWrapper' | 'leaf',
): NodeId {
  const selected = document.nodes[selectedId];
  if (selected.contentType === 'site') {
    return insertType === 'containerWrapper'
      ? findFirstSection(document) ?? selected.id
      : selected.id;
  }
  if (insertType === 'leaf') {
    return isContainerNode(selected) ? selected.id : (selected.parentId ?? document.rootId);
  }
  if (insertType === 'containerWrapper') {
    if (isContainerNode(selected)) {
      return selected.id;
    }
    return selected.parentId ?? document.rootId;
  }
  if (isContainerNode(selected)) {
    return document.rootId;
  }
  return document.rootId;
}
