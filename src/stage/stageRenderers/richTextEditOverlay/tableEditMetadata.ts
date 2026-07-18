import type {
	RichTableBlock,
	RichTableCell,
	RichTableStyle,
	TableColumnAlignment,
} from "../../../model/types";

export type EditableTableCell = RichTableCell & {
	header?: boolean;
	alignment?: TableColumnAlignment;
	width?: string | null;
	height?: string | null;
	tableStyle?: RichTableStyle;
};

export type EditableTableRow = {
	type?: string;
	height?: string | null;
};

/** Adds renderer-only metadata to Slate table descendants. Normalization strips it on save. */
export function addTableEditMetadata(block: RichTableBlock): RichTableBlock {
	return {
		...block,
		children: block.children.map((row, rowIndex) => ({
			...row,
			height: block.rowHeights?.[rowIndex] ?? null,
			children: row.children.map((cell, columnIndex) => ({
				...cell,
				header: row.header === true,
				alignment: block.columnAlignments?.[columnIndex] ?? null,
				width: block.columnWidths?.[columnIndex] ?? null,
				height: block.rowHeights?.[rowIndex] ?? null,
				tableStyle: block.style,
			})),
		})),
	};
}
