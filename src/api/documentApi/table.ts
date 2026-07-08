import {
  createRichTableBlock,
  createRichTableCell,
  createRichTableRow,
  createTextDocumentContent,
  getSingleTableBlockContent,
} from '../../model/richContent';
import type {
  DocumentModel,
  NodeId,
  RichTableBlock,
  TableColumnAlignment,
} from '../../model/types';
import { isTextNode } from '../../model/types';
import { setTextDocumentContentDoc } from './text';

function getTableBlock(document: DocumentModel, nodeId: NodeId): RichTableBlock | null {
  const node = document.nodes[nodeId];
  if (!node || !isTextNode(node) || node.subtype !== 'table') {
    return null;
  }
  return getSingleTableBlockContent(node.content) ?? null;
}

function commitTableBlock(
  document: DocumentModel,
  nodeId: NodeId,
  block: RichTableBlock,
): DocumentModel {
  return setTextDocumentContentDoc(document, nodeId, createTextDocumentContent([block]));
}

function getColumnCount(block: RichTableBlock): number {
  return Math.max(1, ...block.children.map((row) => row.children.length));
}

function getTableBlockOptions(block: RichTableBlock) {
  return {
    direction: block.direction,
    columnAlignments: block.columnAlignments,
    columnWidths: block.columnWidths,
    rowHeights: block.rowHeights,
  };
}

function getTableColumnWidths(block: RichTableBlock, columnCount: number): Array<string | null> {
  return Array.from({ length: columnCount }, (_, index) => block.columnWidths?.[index] ?? null);
}

function getTableRowHeights(block: RichTableBlock): Array<string | null> {
  return Array.from({ length: block.children.length }, (_, index) => block.rowHeights?.[index] ?? null);
}

function normalizeTableCssLength(value: string | null): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeInsertIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) {
    return length;
  }
  return Math.min(length, Math.max(0, Math.trunc(index)));
}

function normalizeExistingIndex(index: number, length: number): number | null {
  if (!Number.isFinite(index)) {
    return null;
  }
  const normalized = Math.trunc(index);
  return normalized >= 0 && normalized < length ? normalized : null;
}

export function insertTableRowDoc(
  document: DocumentModel,
  nodeId: NodeId,
  rowIndex: number,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  if (!block) {
    return document;
  }

  const columnCount = getColumnCount(block);
  const nextRows = structuredClone(block.children);
  const insertIndex = normalizeInsertIndex(rowIndex, nextRows.length);
  if (insertIndex === 0 && nextRows[0]?.header === true) {
    nextRows[0].header = false;
  }
  const nextRowHeights = getTableRowHeights(block);
  nextRowHeights.splice(insertIndex, 0, null);
  nextRows.splice(insertIndex, 0, createRichTableRow(
    Array.from({ length: columnCount }, () => createRichTableCell()),
    { header: insertIndex === 0 && block.children[0]?.header === true },
  ));
  return commitTableBlock(document, nodeId, createRichTableBlock(nextRows, {
    ...getTableBlockOptions(block),
    rowHeights: nextRowHeights,
  }));
}

export function insertTableColumnDoc(
  document: DocumentModel,
  nodeId: NodeId,
  columnIndex: number,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  if (!block) {
    return document;
  }

  const columnCount = getColumnCount(block);
  const insertIndex = normalizeInsertIndex(columnIndex, columnCount);
  const nextRows = structuredClone(block.children).map((row) => {
    row.children.splice(insertIndex, 0, createRichTableCell());
    return row;
  });
  const nextAlignments = [...(block.columnAlignments ?? Array.from({ length: columnCount }, () => null))];
  nextAlignments.splice(insertIndex, 0, null);
  const nextColumnWidths = getTableColumnWidths(block, columnCount);
  nextColumnWidths.splice(insertIndex, 0, null);
  return commitTableBlock(document, nodeId, createRichTableBlock(nextRows, {
    ...getTableBlockOptions(block),
    columnAlignments: nextAlignments,
    columnWidths: nextColumnWidths,
  }));
}

export function removeTableRowDoc(
  document: DocumentModel,
  nodeId: NodeId,
  rowIndex: number,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  if (!block || block.children.length <= 1) {
    return document;
  }

  const removeIndex = normalizeExistingIndex(rowIndex, block.children.length);
  if (removeIndex == null) {
    return document;
  }

  const nextRows = structuredClone(block.children);
  const nextRowHeights = getTableRowHeights(block);
  nextRows.splice(removeIndex, 1);
  nextRowHeights.splice(removeIndex, 1);
  if (removeIndex === 0 && nextRows[0]) {
    nextRows[0].header = block.children[0]?.header === true ? true : nextRows[0].header;
  }
  return commitTableBlock(document, nodeId, createRichTableBlock(nextRows, {
    ...getTableBlockOptions(block),
    rowHeights: nextRowHeights,
  }));
}

export function removeTableColumnDoc(
  document: DocumentModel,
  nodeId: NodeId,
  columnIndex: number,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  const columnCount = block ? getColumnCount(block) : 0;
  if (!block || columnCount <= 1) {
    return document;
  }

  const removeIndex = normalizeExistingIndex(columnIndex, columnCount);
  if (removeIndex == null) {
    return document;
  }

  const nextRows = structuredClone(block.children).map((row) => {
    row.children.splice(removeIndex, 1);
    return row;
  });
  const nextAlignments = [...(block.columnAlignments ?? Array.from({ length: columnCount }, () => null))];
  nextAlignments.splice(removeIndex, 1);
  const nextColumnWidths = getTableColumnWidths(block, columnCount);
  nextColumnWidths.splice(removeIndex, 1);
  return commitTableBlock(document, nodeId, createRichTableBlock(nextRows, {
    ...getTableBlockOptions(block),
    columnAlignments: nextAlignments,
    columnWidths: nextColumnWidths,
  }));
}

export function setTableHeaderRowDoc(
  document: DocumentModel,
  nodeId: NodeId,
  enabled: boolean,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  if (!block) {
    return document;
  }

  const nextRows = structuredClone(block.children).map((row, index) => {
    if (index === 0) {
      return { ...row, ...(enabled ? { header: true } : { header: false }) };
    }
    const { header: _header, ...rest } = row;
    return rest;
  });
  return commitTableBlock(document, nodeId, createRichTableBlock(nextRows, getTableBlockOptions(block)));
}

export function setTableColumnAlignmentDoc(
  document: DocumentModel,
  nodeId: NodeId,
  columnIndex: number,
  alignment: TableColumnAlignment,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  const columnCount = block ? getColumnCount(block) : 0;
  if (!block) {
    return document;
  }

  const normalizedIndex = normalizeExistingIndex(columnIndex, columnCount);
  if (normalizedIndex == null) {
    return document;
  }

  const normalizedAlignment = alignment === 'left' || alignment === 'center' || alignment === 'right'
    ? alignment
    : null;
  const nextAlignments = Array.from({ length: columnCount }, (_, index) => block.columnAlignments?.[index] ?? null);
  nextAlignments[normalizedIndex] = normalizedAlignment;
  return commitTableBlock(document, nodeId, createRichTableBlock(structuredClone(block.children), {
    ...getTableBlockOptions(block),
    columnAlignments: nextAlignments,
  }));
}

export function setTableDirectionDoc(
  document: DocumentModel,
  nodeId: NodeId,
  direction: 'ltr' | 'rtl' | null,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  if (!block) {
    return document;
  }

  const normalizedDirection = direction === 'ltr' || direction === 'rtl' ? direction : undefined;
  return commitTableBlock(document, nodeId, createRichTableBlock(structuredClone(block.children), {
    ...getTableBlockOptions(block),
    direction: normalizedDirection,
  }));
}

export function setTableColumnWidthDoc(
  document: DocumentModel,
  nodeId: NodeId,
  columnIndex: number,
  width: string | null,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  const columnCount = block ? getColumnCount(block) : 0;
  if (!block) {
    return document;
  }

  const normalizedIndex = normalizeExistingIndex(columnIndex, columnCount);
  if (normalizedIndex == null) {
    return document;
  }

  const nextColumnWidths = getTableColumnWidths(block, columnCount);
  nextColumnWidths[normalizedIndex] = normalizeTableCssLength(width);
  return commitTableBlock(document, nodeId, createRichTableBlock(structuredClone(block.children), {
    ...getTableBlockOptions(block),
    columnWidths: nextColumnWidths,
  }));
}

export function setTableRowHeightDoc(
  document: DocumentModel,
  nodeId: NodeId,
  rowIndex: number,
  height: string | null,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  if (!block) {
    return document;
  }

  const normalizedIndex = normalizeExistingIndex(rowIndex, block.children.length);
  if (normalizedIndex == null) {
    return document;
  }

  const nextRowHeights = getTableRowHeights(block);
  nextRowHeights[normalizedIndex] = normalizeTableCssLength(height);
  return commitTableBlock(document, nodeId, createRichTableBlock(structuredClone(block.children), {
    ...getTableBlockOptions(block),
    rowHeights: nextRowHeights,
  }));
}
