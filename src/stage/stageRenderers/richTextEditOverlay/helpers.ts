import type { CSSProperties } from "react";
import type { BaseSelection, Path } from "slate";
import { Editor, Element as SlateElement } from "slate";
import type { TableSelectionDescriptor } from "../../../api/documentApi";
import {
	BOLD_FONT_WEIGHT,
	DEFAULT_FONT_WEIGHT,
	isBoldFontWeight,
} from "../../../api/fontApi";
import { formatDisplayValue } from "../../../model/conversion";
import type {
	RichTableBlock,
	RichTableCell,
	RichTableCellStyle,
	TableColumnAlignment,
} from "../../../model/types";
import { parseFontSizeValue } from "../../../model/units";
import {
	getMarkValue,
	getSelectedBlockType,
	getSelectedCodeLanguage,
	getSelectedDirection,
	getSelectedLineHeight,
	getSelectedListKind,
	getSelectedListMarkerStyle,
	getSelectedStructureMode,
	getSelectedTextAlign,
	isLinkActive,
	isMarkActive,
} from "../../../render/richTextEditor";
import {
	RICH_SELECT_IDS,
	type RichEditor,
	type RichEditSelectId,
	type RichEditValueFieldId,
	type RichToolbarState,
	SYSTEM_FONT_VALUE,
} from "./types";

export function cloneSelection(selection: BaseSelection): BaseSelection {
	if (!selection) {
		return null;
	}

	return {
		anchor: { ...selection.anchor },
		focus: { ...selection.focus },
	};
}

export function readToolbarFontReference(element: HTMLElement | null) {
	const ownerDocument = element?.ownerDocument ?? globalThis.document;
	const defaultView = ownerDocument?.defaultView ?? globalThis.window;
	if (!ownerDocument || !defaultView) {
		return { rootFontSizePx: 16, inheritedFontSizePx: 16 };
	}

	const rootComputed = defaultView.getComputedStyle(
		ownerDocument.documentElement,
	);
	const inheritedComputed = defaultView.getComputedStyle(
		element ?? ownerDocument.documentElement,
	);
	const rootFontSizePx = Number.parseFloat(rootComputed.fontSize);
	const inheritedFontSizePx = Number.parseFloat(inheritedComputed.fontSize);
	return {
		rootFontSizePx:
			Number.isFinite(rootFontSizePx) && rootFontSizePx > 0
				? rootFontSizePx
				: 16,
		inheritedFontSizePx:
			Number.isFinite(inheritedFontSizePx) && inheritedFontSizePx > 0
				? inheritedFontSizePx
				: 16,
	};
}

export function readInitialFontSizeValue(
	contentStyle: CSSProperties | undefined,
) {
	const fontSize = contentStyle?.fontSize;
	if (
		typeof fontSize === "number" &&
		Number.isFinite(fontSize) &&
		fontSize > 0
	) {
		return `${formatDisplayValue(fontSize)}px`;
	}
	if (typeof fontSize === "string") {
		try {
			const parsed = parseFontSizeValue(fontSize);
			return `${formatDisplayValue(parsed.parsed.value)}${parsed.parsed.unit}`;
		} catch {}
	}
	return null;
}

export function readInitialBlockSpacing(
	contentStyle: CSSProperties | undefined,
): number {
	const rowGap = contentStyle?.rowGap;
	if (typeof rowGap === "number") {
		return rowGap;
	}
	if (typeof rowGap === "string") {
		const parsed = Number.parseFloat(rowGap);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return 0;
}

export function isSelectVisibleForStructureMode(
	selectId: RichEditSelectId,
	structureMode: RichToolbarState["structureMode"],
) {
	switch (selectId) {
		case RICH_SELECT_IDS.blockType:
			return structureMode === "block";
		case RICH_SELECT_IDS.orderedListMarker:
			return structureMode === "ol";
		case RICH_SELECT_IDS.unorderedListMarker:
			return structureMode === "ul";
		case RICH_SELECT_IDS.codeLanguage:
			return structureMode === "code-block";
		default:
			return true;
	}
}

export function readToolbarState(editor: RichEditor): RichToolbarState {
	const currentFontWeight =
		Number.parseInt(getMarkValue(editor, "fontWeight"), 10) ||
		(isMarkActive(editor, "bold") ? BOLD_FONT_WEIGHT : DEFAULT_FONT_WEIGHT);
	return {
		boldActive:
			isMarkActive(editor, "bold") || isBoldFontWeight(currentFontWeight),
		italicActive: isMarkActive(editor, "italic"),
		underlineActive: isMarkActive(editor, "underline"),
		strikethroughActive: isMarkActive(editor, "strikethrough"),
		linkActive: isLinkActive(editor),
		structureMode: getSelectedStructureMode(editor),
		selectedBlockType: getSelectedBlockType(editor) ?? "paragraph",
		selectedListKind: getSelectedListKind(editor),
		selectedListMarkerStyle: getSelectedListMarkerStyle(editor),
		selectedCodeLanguage: getSelectedCodeLanguage(editor),
		selectedLineHeight: getSelectedLineHeight(editor),
		selectedTextAlign: getSelectedTextAlign(editor),
		selectedDirection: getSelectedDirection(editor),
		currentFontFamily: getMarkValue(editor, "fontFamily") || SYSTEM_FONT_VALUE,
		currentFontWeight,
		currentFontSize: getMarkValue(editor, "fontSize"),
		currentTextColor: normalizeColorInputValue(
			getMarkValue(editor, "color"),
			"#111827",
		),
		currentHighlightColor: normalizeColorInputValue(
			getMarkValue(editor, "backgroundColor"),
			"#fff59d",
		),
	};
}

export function isTargetWithinSelector(
	target: EventTarget | null,
	selector: string,
): boolean {
	if (!(target instanceof Element)) {
		return false;
	}

	return Boolean(target.closest(selector));
}

export function isTargetWithinSelectLayer(
	target: EventTarget | null,
	selectId: RichEditSelectId,
): boolean {
	return isTargetWithinSelector(
		target,
		`[data-stage-rich-select-id="${selectId}"]`,
	);
}

export function isTargetWithinLinkPopover(target: EventTarget | null): boolean {
	return isTargetWithinSelector(
		target,
		'[data-stage-rich-link-popover="true"]',
	);
}

export function isTargetWithinValueFieldLayer(
	target: EventTarget | null,
	valueFieldId: RichEditValueFieldId,
): boolean {
	return isTargetWithinSelector(
		target,
		`[data-stage-rich-value-field-id="${valueFieldId}"]`,
	);
}

export function isTargetWithinToolbar(target: EventTarget | null): boolean {
	return isTargetWithinSelector(target, '[data-stage-rich-toolbar="true"]');
}

export type ActiveTableContext = {
	table: RichTableBlock;
	rowIndex: number;
	columnIndex: number;
	rowCount: number;
	columnCount: number;
	columnWidth: string | null;
	rowHeight: string | null;
	columnAlignment: TableColumnAlignment;
	cellStyle: RichTableCellStyle | undefined;
	direction: "ltr" | "rtl" | null;
	hasHeader: boolean;
};

export function getActiveTableContext(
	editor: RichEditor,
): ActiveTableContext | null {
	if (!editor.selection) {
		return null;
	}

	const cellEntry = Editor.above(editor, {
		match: (node) =>
			SlateElement.isElement(node) &&
			(node as { type?: string }).type === "table-cell",
	}) as [RichTableCell, Path] | undefined;
	if (!cellEntry) {
		return null;
	}

	const tableEntry = Editor.above(editor, {
		at: cellEntry[1],
		match: (node) =>
			SlateElement.isElement(node) &&
			(node as { type?: string }).type === "table",
	}) as [RichTableBlock, Path] | undefined;
	if (!tableEntry) {
		return null;
	}

	const [cell, cellPath] = cellEntry;
	const [table] = tableEntry;
	const rowIndex = cellPath.at(-2);
	const columnIndex = cellPath.at(-1);
	if (rowIndex == null || columnIndex == null) {
		return null;
	}

	const rowCount = table.children.length;
	const columnCount = Math.max(
		1,
		...table.children.map((row) => row.children.length),
	);
	if (
		rowIndex < 0 ||
		rowIndex >= rowCount ||
		columnIndex < 0 ||
		columnIndex >= columnCount
	) {
		return null;
	}

	return {
		table,
		rowIndex,
		columnIndex,
		rowCount,
		columnCount,
		columnWidth: table.columnWidths?.[columnIndex] ?? null,
		rowHeight: table.rowHeights?.[rowIndex] ?? null,
		columnAlignment: table.columnAlignments?.[columnIndex] ?? null,
		cellStyle: cell.style,
		direction: table.direction ?? null,
		hasHeader: table.children[0]?.header === true,
	};
}

export function getTableSelectionDescriptor(
	context: ActiveTableContext,
	target: TableSelectionDescriptor["type"],
): TableSelectionDescriptor {
	switch (target) {
		case "cell":
			return {
				type: "cell",
				rowIndex: context.rowIndex,
				columnIndex: context.columnIndex,
			};
		case "row":
			return { type: "row", rowIndex: context.rowIndex };
		case "column":
			return { type: "column", columnIndex: context.columnIndex };
		case "table":
			return { type: "table" };
	}
}

export function normalizeColorInputValue(
	color: string,
	fallback: string,
): string {
	if (/^#[0-9a-f]{6}$/i.test(color)) {
		return color;
	}
	if (/^#[0-9a-f]{3}$/i.test(color)) {
		const [, r, g, b] = color;
		return `#${r}${r}${g}${g}${b}${b}`;
	}
	return fallback;
}
