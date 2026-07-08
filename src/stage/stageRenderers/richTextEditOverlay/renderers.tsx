import type { RenderElementProps, RenderLeafProps } from "slate-react";

import { getLinkHref } from "../../../model/links";
import type {
	DocumentModel,
	RichBlock,
	RichListItem,
	RichTableCell,
	TableColumnAlignment,
	RichTextLeaf,
	RichTextLink,
} from "../../../model/types";
import {
	getRichBlockRenderStyle,
	getRichLinkStyle,
	getRichTextBlockTag,
	richLeafStyle,
} from "../../../render/nodePresentation";

type RetainedSelectionLeaf = RichTextLeaf & { retainedSelection?: boolean };
type EditableTableCell = RichTableCell & {
	header?: boolean;
	alignment?: TableColumnAlignment;
	width?: string | null;
};
type EditableTableRow = {
	type?: string;
	height?: string | null;
};

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
		const table = el as RichBlock & { type: "table" };
		return (
			<table
				{...attributes}
				dir={table.direction}
				style={{
					width: "100%",
					borderCollapse: "collapse",
					font: "inherit",
					color: "inherit",
				}}
			>
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
