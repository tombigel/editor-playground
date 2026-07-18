import type { RenderElementProps, RenderLeafProps } from "slate-react";
import type { CSSProperties } from "react";

import { getLinkHref } from "../../../model/links";
import type {
	DocumentModel,
	RichBlock,
	RichListItem,
	RichTableBlock,
	RichTableCellStyle,
	RichTableStyle,
	RichTextLeaf,
	RichTextLink,
} from "../../../model/types";
import {
	getRichBlockRenderStyle,
	getRichLinkStyle,
	getRichTextBlockTag,
	richLeafStyle,
} from "../../../render/nodePresentation";
import { getRichTableRenderLayout } from "../../../render/tablePresentation";
import type {
	EditableTableCell,
	EditableTableRow,
} from "./tableEditMetadata";

type RetainedSelectionLeaf = RichTextLeaf & { retainedSelection?: boolean };
function tableCellStyleToCss(style: RichTableCellStyle | undefined): CSSProperties {
	if (!style) {
		return {};
	}
	return {
		...(style.background ? { background: style.background } : {}),
		...(style.padding ? { padding: style.padding } : {}),
		...(style.borderTopColor ? { borderTopColor: style.borderTopColor } : {}),
		...(style.borderTopWidth ? { borderTopStyle: "solid", borderTopWidth: style.borderTopWidth } : {}),
		...(style.borderRightColor ? { borderRightColor: style.borderRightColor } : {}),
		...(style.borderRightWidth ? { borderRightStyle: "solid", borderRightWidth: style.borderRightWidth } : {}),
		...(style.borderBottomColor ? { borderBottomColor: style.borderBottomColor } : {}),
		...(style.borderBottomWidth ? { borderBottomStyle: "solid", borderBottomWidth: style.borderBottomWidth } : {}),
		...(style.borderLeftColor ? { borderLeftColor: style.borderLeftColor } : {}),
		...(style.borderLeftWidth ? { borderLeftStyle: "solid", borderLeftWidth: style.borderLeftWidth } : {}),
	};
}

export function renderEditLeaf({ attributes, children, leaf }: RenderLeafProps) {
	const editLeaf = leaf as RetainedSelectionLeaf;
	const style = richLeafStyle(editLeaf);
	return (
		<span
			{...attributes}
			data-retained-selection={
				editLeaf.retainedSelection ? "true" : undefined
			}
			style={{
				...style,
				...(editLeaf.retainedSelection
					? {
							backgroundColor:
								"color-mix(in srgb, var(--editor-accent) 32%, transparent)",
							borderRadius: "2px",
						}
					: {}),
				pointerEvents: "auto",
				userSelect: "text",
				WebkitUserSelect: "text",
			}}
		>
			{children}
		</span>
	);
}

export function renderEditElement(
	{ attributes, children, element }: RenderElementProps,
	documentModel: DocumentModel | undefined,
) {
	const el = element as RichTextLink | RichBlock | { type?: string };
	if ("type" in el && el.type === "link") {
		const link = el as RichTextLink;
		const href = getLinkHref(link, documentModel);
		return (
			<a
				href={href}
				style={{
					...getRichLinkStyle(),
					cursor: "text",
					pointerEvents: "auto",
					userSelect: "text",
					WebkitUserSelect: "text",
				}}
				{...attributes}
			>
				{children}
			</a>
		);
	}

	if ("type" in el && el.type === "list-item") {
		const listItem = el as RichListItem;
		return (
			<li
				{...attributes}
				dir={listItem.direction ?? "ltr"}
				style={{
					pointerEvents: "auto",
					userSelect: "text",
					WebkitUserSelect: "text",
				}}
			>
				{children}
			</li>
		);
	}

	if ("type" in el && el.type === "table-cell") {
		const cell = el as EditableTableCell;
		const CellTag = cell.header ? "th" : "td";
		return (
			<CellTag
				{...attributes}
				scope={cell.header ? "col" : undefined}
				style={{
					pointerEvents: "auto",
					userSelect: "text",
					WebkitUserSelect: "text",
					...(cell.alignment ? { textAlign: cell.alignment } : {}),
					...(cell.width ? { width: cell.width } : {}),
					...(cell.height ? { height: cell.height, minHeight: cell.height } : {}),
					...(cell.tableStyle?.cellBorderColor ? { borderColor: cell.tableStyle.cellBorderColor } : {}),
					...(cell.tableStyle?.cellBorderWidth ? { borderStyle: "solid", borderWidth: cell.tableStyle.cellBorderWidth } : {}),
					...(cell.tableStyle?.cellPadding ? { padding: cell.tableStyle.cellPadding } : {}),
					...(cell.header && cell.tableStyle?.headerBackground ? { background: cell.tableStyle.headerBackground } : {}),
					...(cell.header && cell.tableStyle?.headerColor ? { color: cell.tableStyle.headerColor } : {}),
					...tableCellStyleToCss(cell.style),
				}}
			>
				{children}
			</CellTag>
		);
	}

	if ("type" in el && el.type === "table-row") {
		const row = el as EditableTableRow;
		return (
			<tr
				{...attributes}
				style={row.height ? { height: row.height, minHeight: row.height } : undefined}
			>
				{children}
			</tr>
		);
	}

	if ("type" in el && el.type === "table") {
		const table = el as RichTableBlock;
		const tableStyle = table.style as RichTableStyle | undefined;
		const layout = getRichTableRenderLayout(table);
		return (
			<table
				{...attributes}
				dir={table.direction}
				style={{
					width: "100%",
					maxWidth: "100%",
					borderCollapse: "collapse",
					font: "inherit",
					color: "inherit",
					...layout.style,
					...(tableStyle?.tableBackground ? { background: tableStyle.tableBackground } : {}),
					...(tableStyle?.tableBorderColor ? { borderColor: tableStyle.tableBorderColor } : {}),
					...(tableStyle?.tableBorderWidth ? { borderStyle: "solid", borderWidth: tableStyle.tableBorderWidth } : {}),
				}}
			>
				{table.columnWidths?.some(Boolean) ? (
					<colgroup contentEditable={false}>
						{layout.columnWidths.map((width, columnIndex) => (
							<col
								// biome-ignore lint/suspicious/noArrayIndexKey: table columns are positional render output.
								key={columnIndex}
								style={width ? { width } : undefined}
							/>
						))}
					</colgroup>
				) : null}
				<tbody>{children}</tbody>
			</table>
		);
	}

	const block = el as Exclude<RichBlock, { type: "table" }>;
	const Tag =
		block.type === "ul" || block.type === "ol"
			? block.type
			: block.type === "code-block"
				? "div"
				: getRichTextBlockTag(block.type);
	return (
		<Tag
			{...attributes}
			dir={block.direction ?? "ltr"}
			data-rich-block-type={
				block.type === "code-block" ? "code-block" : undefined
			}
			style={{
				...getRichBlockRenderStyle(block),
				pointerEvents: "auto",
				userSelect: "text",
				WebkitUserSelect: "text",
			}}
		>
			{children}
		</Tag>
	);
}
