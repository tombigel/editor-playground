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
  RichTableCellStyle,
  RichTableStyle,
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
    style: block.style,
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

export type TableSelectionDescriptor =
  | { type: 'cell'; rowIndex: number; columnIndex: number }
  | { type: 'row'; rowIndex: number }
  | { type: 'column'; columnIndex: number }
  | { type: 'table' };

export type TableBorderScope =
  | 'all'
  | 'outer'
  | 'inner'
  | 'horizontal'
  | 'vertical'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left';

export type TableCellStylePatch = Partial<Record<keyof RichTableCellStyle, string | null>>;
export type TableCellBorderPatch = {
  width?: string | null;
  color?: string | null;
};

type TableSelectionRect = {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
};

const TABLE_STYLE_KEYS = [
  'tableBackground',
  'tableBorderColor',
  'tableBorderWidth',
  'cellBorderColor',
  'cellBorderWidth',
  'cellPadding',
  'headerBackground',
  'headerColor',
] as const satisfies ReadonlyArray<keyof RichTableStyle>;

const TABLE_CELL_STYLE_KEYS = [
  'background',
  'padding',
  'borderTopWidth',
  'borderTopColor',
  'borderRightWidth',
  'borderRightColor',
  'borderBottomWidth',
  'borderBottomColor',
  'borderLeftWidth',
  'borderLeftColor',
] as const satisfies ReadonlyArray<keyof RichTableCellStyle>;

function mergeTableStyle(
  style: RichTableStyle | undefined,
  patch: Partial<Record<keyof RichTableStyle, string | null>>,
): RichTableStyle | undefined {
  const next: RichTableStyle = { ...(style ?? {}) };
  for (const key of TABLE_STYLE_KEYS) {
    if (!(key in patch)) {
      continue;
    }
    const value = patch[key];
    if (typeof value === 'string' && value.trim()) {
      next[key] = value.trim();
    } else {
      delete next[key];
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function mergeTableCellStyle(
  style: RichTableCellStyle | undefined,
  patch: TableCellStylePatch,
): RichTableCellStyle | undefined {
  const next: RichTableCellStyle = { ...(style ?? {}) };
  for (const key of TABLE_CELL_STYLE_KEYS) {
    if (!(key in patch)) {
      continue;
    }
    const value = patch[key];
    if (typeof value === 'string' && value.trim()) {
      next[key] = value.trim();
    } else {
      delete next[key];
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function resolveTableSelectionRect(
  block: RichTableBlock,
  selection: TableSelectionDescriptor,
): TableSelectionRect | null {
  const rowCount = block.children.length;
  const columnCount = getColumnCount(block);
  if (rowCount <= 0 || columnCount <= 0) {
    return null;
  }

  if (selection.type === 'table') {
    return {
      rowStart: 0,
      rowEnd: rowCount - 1,
      columnStart: 0,
      columnEnd: columnCount - 1,
    };
  }

  if (selection.type === 'row') {
    const rowIndex = normalizeExistingIndex(selection.rowIndex, rowCount);
    return rowIndex == null
      ? null
      : {
          rowStart: rowIndex,
          rowEnd: rowIndex,
          columnStart: 0,
          columnEnd: columnCount - 1,
        };
  }

  if (selection.type === 'column') {
    const columnIndex = normalizeExistingIndex(selection.columnIndex, columnCount);
    return columnIndex == null
      ? null
      : {
          rowStart: 0,
          rowEnd: rowCount - 1,
          columnStart: columnIndex,
          columnEnd: columnIndex,
        };
  }

  const rowIndex = normalizeExistingIndex(selection.rowIndex, rowCount);
  const columnIndex = normalizeExistingIndex(selection.columnIndex, columnCount);
  return rowIndex == null || columnIndex == null
    ? null
    : {
        rowStart: rowIndex,
        rowEnd: rowIndex,
        columnStart: columnIndex,
        columnEnd: columnIndex,
      };
}

function patchCellsInRect(
  block: RichTableBlock,
  rect: TableSelectionRect,
  patchCell: (style: RichTableCellStyle | undefined, rowIndex: number, columnIndex: number) => RichTableCellStyle | undefined,
) {
  const nextRows = structuredClone(block.children);
  for (let rowIndex = rect.rowStart; rowIndex <= rect.rowEnd; rowIndex += 1) {
    const row = nextRows[rowIndex];
    if (!row) {
      continue;
    }
    for (let columnIndex = rect.columnStart; columnIndex <= rect.columnEnd; columnIndex += 1) {
      const cell = row.children[columnIndex];
      if (!cell) {
        continue;
      }
      const nextStyle = patchCell(cell.style, rowIndex, columnIndex);
      if (nextStyle) {
        cell.style = nextStyle;
      } else {
        delete cell.style;
      }
    }
  }
  return nextRows;
}

function edgePatch(edge: 'Top' | 'Right' | 'Bottom' | 'Left', patch: TableCellBorderPatch): TableCellStylePatch {
  const stylePatch: TableCellStylePatch = {};
  if ('width' in patch) {
    stylePatch[`border${edge}Width` as keyof RichTableCellStyle] = normalizeTableCssLength(patch.width ?? null);
  }
  if ('color' in patch) {
    stylePatch[`border${edge}Color` as keyof RichTableCellStyle] = normalizeTableCssLength(patch.color ?? null);
  }
  return stylePatch;
}

function borderEdgesForCell(
  scope: TableBorderScope,
  rect: TableSelectionRect,
  rowIndex: number,
  columnIndex: number,
): Array<'Top' | 'Right' | 'Bottom' | 'Left'> {
  switch (scope) {
    case 'all':
      return ['Top', 'Right', 'Bottom', 'Left'];
    case 'outer':
      return [
        ...(rowIndex === rect.rowStart ? ['Top' as const] : []),
        ...(columnIndex === rect.columnEnd ? ['Right' as const] : []),
        ...(rowIndex === rect.rowEnd ? ['Bottom' as const] : []),
        ...(columnIndex === rect.columnStart ? ['Left' as const] : []),
      ];
    case 'inner':
      return [
        ...(rowIndex < rect.rowEnd ? ['Bottom' as const] : []),
        ...(columnIndex < rect.columnEnd ? ['Right' as const] : []),
      ];
    case 'horizontal':
      return rowIndex < rect.rowEnd ? ['Bottom'] : [];
    case 'vertical':
      return columnIndex < rect.columnEnd ? ['Right'] : [];
    case 'top':
      return rowIndex === rect.rowStart ? ['Top'] : [];
    case 'right':
      return columnIndex === rect.columnEnd ? ['Right'] : [];
    case 'bottom':
      return rowIndex === rect.rowEnd ? ['Bottom'] : [];
    case 'left':
      return columnIndex === rect.columnStart ? ['Left'] : [];
  }
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

export function setTableStyleDoc(
  document: DocumentModel,
  nodeId: NodeId,
  patch: Partial<Record<keyof RichTableStyle, string | null>>,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  if (!block) {
    return document;
  }

  return commitTableBlock(document, nodeId, createRichTableBlock(structuredClone(block.children), {
    ...getTableBlockOptions(block),
    style: mergeTableStyle(block.style, patch),
  }));
}

export function setTableCellStyleDoc(
  document: DocumentModel,
  nodeId: NodeId,
  rowIndex: number,
  columnIndex: number,
  patch: TableCellStylePatch,
): DocumentModel {
  return setTableSelectionStyleDoc(document, nodeId, {
    type: 'cell',
    rowIndex,
    columnIndex,
  }, patch);
}

export function setTableSelectionStyleDoc(
  document: DocumentModel,
  nodeId: NodeId,
  selection: TableSelectionDescriptor,
  patch: TableCellStylePatch,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  if (!block) {
    return document;
  }

  const rect = resolveTableSelectionRect(block, selection);
  if (!rect) {
    return document;
  }

  const nextRows = patchCellsInRect(block, rect, (style) => mergeTableCellStyle(style, patch));
  return commitTableBlock(document, nodeId, createRichTableBlock(nextRows, getTableBlockOptions(block)));
}

export function setTableSelectionBorderDoc(
  document: DocumentModel,
  nodeId: NodeId,
  selection: TableSelectionDescriptor,
  scope: TableBorderScope,
  patch: TableCellBorderPatch,
): DocumentModel {
  const block = getTableBlock(document, nodeId);
  if (!block) {
    return document;
  }

  const rect = resolveTableSelectionRect(block, selection);
  if (!rect) {
    return document;
  }

  const nextRows = patchCellsInRect(block, rect, (style, rowIndex, columnIndex) => {
    const edges = borderEdgesForCell(scope, rect, rowIndex, columnIndex);
    if (edges.length === 0) {
      return style;
    }
    const mergedPatch = edges.reduce<TableCellStylePatch>(
      (nextPatch, edge) => ({ ...nextPatch, ...edgePatch(edge, patch) }),
      {},
    );
    return mergeTableCellStyle(style, mergedPatch);
  });

  return commitTableBlock(document, nodeId, createRichTableBlock(nextRows, getTableBlockOptions(block)));
}
