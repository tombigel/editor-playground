import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	setTableColumnWidthBlock,
	setTableRowHeightBlock,
} from "../../api/documentApi/table";
import {
	createRichTableBlock,
	createRichTableCell,
	createRichTableRow,
	createTextDocumentContent,
	listContentToRichListBlock,
} from "../../model/richContent";
import { RichTextEditOverlay } from "../stageRenderers/RichTextEditOverlay";
import {
	CompactFontSizeField,
	resolveTableLengthOptionValue,
} from "../stageRenderers/richTextEditOverlay/controls";
import { renderEditElement } from "../stageRenderers/richTextEditOverlay/renderers";
import { addTableEditMetadata } from "../stageRenderers/richTextEditOverlay/tableEditMetadata";
import { FONT_SIZE_SUGGESTIONS_BY_UNIT } from "../stageRenderers/richTextEditOverlay/types";

const CONTENT = createTextDocumentContent([
	{ type: "paragraph", children: [{ text: "Edit me on stage" }] },
]);

describe("stage/RichTextEditOverlay", () => {
	it("renders the floating edit toolbar and preserves the authored minimum height", () => {
		const markup = renderToStaticMarkup(
			<RichTextEditOverlay
				nodeId="rich-node"
				content={CONTENT}
				minHeight="96px"
				onCommit={() => {}}
				onUpdateBlockGap={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain('data-stage-rich-toolbar="true"');
		expect(markup).toContain("h-7");
		expect(markup).toContain("w-7");
		expect(markup).toContain('data-ui="toolbar-control-row"');
		expect(markup).toContain('data-ui="toolbar-control-group"');
		expect(markup).toContain('data-ui="toolbar-control-divider"');
		expect(markup.match(/data-ui="toolbar-control-divider"/g)?.length).toBe(6);
		expect(markup).not.toContain(
			'data-stage-rich-toolbar="true" popover="manual"',
		);
		expect(markup).toContain('data-stage-rich-toolbar-drag-handle="true"');
		expect(markup).toContain("self-center");
		expect(markup).toContain("cursor-grab");
		expect(markup).toContain('aria-label="Manage fonts"');
		expect(markup).toContain('aria-label="Font size"');
		expect(markup).toContain('aria-label="Bold"');
		expect(markup).toContain('aria-label="Italic"');
		expect(markup).toContain('aria-label="Underline"');
		expect(markup).toContain('aria-label="Strikethrough"');
		expect(markup).toContain('aria-label="Text color"');
		expect(markup).toContain('aria-label="Highlight color"');
		expect(markup).toContain('data-ui="color-picker"');
		expect(markup).toContain('data-variant="swatch"');
		expect(markup).toContain('aria-label="Link"');
		expect(markup).toContain('aria-label="Use text block"');
		expect(markup).toContain('aria-label="Use code block"');
		expect(markup).not.toContain('aria-label="Ordered list marker"');
		expect(markup).not.toContain('aria-label="Unordered list marker"');
		expect(markup).not.toContain('aria-label="Code language"');
		expect(markup).toContain('aria-label="Line height"');
		expect(markup).toContain('aria-label="Block spacing"');
		expect(markup).toContain('type="number"');
		expect(markup).toContain("editor-text-strong");
		expect(markup).toContain("editor-border-subtle");
		expect(markup).toContain(
			"focus-visible:outline-[color:var(--editor-focus-ring-strong)]",
		);
		expect(markup).toContain("Inherit");
		expect(markup).not.toContain(
			'aria-label="Font size unit" class="editor-bg-surface editor-border-subtle editor-text-strong flex w-full items-center rounded-sm outline-none disabled:cursor-not-allowed',
		);
		expect(markup).not.toContain("Rich text edit");
		expect(markup).not.toContain("Cmd/Ctrl+Enter saves");
		expect(markup).toContain("min-height:96px");
		expect(markup).toContain("padding:0");
		expect(markup).toContain("border-radius:0");
	});

	it("keeps list markers inside the edit box for list blocks", () => {
		const markup = renderToStaticMarkup(
			<RichTextEditOverlay
				nodeId="rich-node"
				content={createTextDocumentContent([
					listContentToRichListBlock({
						type: "ol",
						markerStyle: "upper-roman",
						items: [{ text: "First", direction: "ltr" }],
					}),
				])}
				minHeight="96px"
				onCommit={() => {}}
				onUpdateBlockGap={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain("<ol");
		expect(markup).toContain("<li");
		expect(markup).toContain("list-style-position:outside");
		expect(markup).toContain("list-style-type:upper-roman");
		expect(markup).toContain("padding-inline-start:1.25em");
	});

	it("applies authored rich block styling in live edit markup", () => {
		const markup = renderToStaticMarkup(
			<RichTextEditOverlay
				nodeId="rich-node"
				content={createTextDocumentContent(
					[
						{
							type: "paragraph",
							lineHeight: 1.8,
							style: { textAlign: "center" },
							children: [
								{
									type: "link",
									linkType: "external",
									href: "https://example.com",
									children: [{ text: "Live rich styling" }],
								},
							],
						},
					],
					{ blockGap: 24 },
				)}
				minHeight="96px"
				onCommit={() => {}}
				onUpdateBlockGap={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain("line-height:1.8");
		expect(markup).toContain("text-align:center");
		expect(markup).toContain("display:grid");
		expect(markup).toContain("row-gap:24px");
		expect(markup).toContain("text-decoration:underline");
		expect(markup).toContain("color:#172033");
	});

	it("renders inherited font size as a real field value instead of placeholder text", () => {
		const markup = renderToStaticMarkup(
			<RichTextEditOverlay
				nodeId="rich-node"
				content={CONTENT}
				contentStyle={{ fontSize: "18px" }}
				minHeight="96px"
				onCommit={() => {}}
				onUpdateBlockGap={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain('aria-label="Font size"');
		expect(markup).toContain('value="18"');
		expect(markup).not.toContain('placeholder="18"');
	});

	it("offers compact font size suggestions through 120px", () => {
		expect(FONT_SIZE_SUGGESTIONS_BY_UNIT.px.at(-1)).toBe(120);

		const markup = renderToStaticMarkup(
			<CompactFontSizeField
				label="Font size"
				value="18px"
				width={72}
				onCommit={() => {}}
				suggestionsOpen
				onSuggestionsOpenChange={() => {}}
				resolveUnitValue={() => null}
			/>,
		);

		expect(markup).toContain("120px");
		expect(markup).toContain("editor-scrollbar");
		expect(markup).toContain("max-h-[180px]");
	});

	it("restricts the toolbar to inline controls in block mode", () => {
		const markup = renderToStaticMarkup(
			<RichTextEditOverlay
				nodeId="block-node"
				mode="block"
				content={CONTENT}
				minHeight="96px"
				onCommit={() => {}}
				onUpdateBlockGap={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain('data-stage-rich-toolbar="true"');
		expect(markup).toContain('data-ui="toolbar-control-group"');
		expect(markup.match(/data-ui="toolbar-control-divider"/g)?.length).toBe(3);
		expect(markup).toContain('aria-label="Font size"');
		expect(markup).toContain('aria-label="Bold"');
		expect(markup).toContain('aria-label="Italic"');
		expect(markup).toContain('aria-label="Underline"');
		expect(markup).toContain('aria-label="Strikethrough"');
		expect(markup).toContain('aria-label="Text color"');
		expect(markup).toContain('aria-label="Highlight color"');
		expect(markup).toContain('aria-label="Link"');
		expect(markup).toContain("Inherit");
		expect(markup).not.toContain('aria-label="Manage fonts"');
		expect(markup).not.toContain('aria-label="Align left"');
		expect(markup).not.toContain('aria-label="Align center"');
		expect(markup).not.toContain('aria-label="Align right"');
		expect(markup).not.toContain('aria-label="Switch to RTL"');
		expect(markup).not.toContain('aria-label="Use text block"');
		expect(markup).not.toContain('aria-label="Use code block"');
		expect(markup).not.toContain('aria-label="Use ordered list"');
		expect(markup).not.toContain('aria-label="Use unordered list"');
		expect(markup).not.toContain('aria-label="Line height"');
		expect(markup).not.toContain('aria-label="Block spacing"');
	});

	it("restricts list mode to inline controls", () => {
		const markup = renderToStaticMarkup(
			<RichTextEditOverlay
				nodeId="list-node"
				mode="list"
				content={createTextDocumentContent([
					listContentToRichListBlock({
						type: "ul",
						markerStyle: "square",
						items: [{ text: "Editable list", direction: "ltr" }],
					}),
				])}
				minHeight="96px"
				onCommit={() => {}}
				onUpdateBlockGap={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain('data-stage-rich-toolbar="true"');
		expect(markup).toContain('data-ui="toolbar-control-group"');
		expect(markup.match(/data-ui="toolbar-control-divider"/g)?.length).toBe(3);
		expect(markup).toContain('aria-label="Font size"');
		expect(markup).toContain('aria-label="Bold"');
		expect(markup).toContain('aria-label="Italic"');
		expect(markup).toContain('aria-label="Underline"');
		expect(markup).toContain('aria-label="Strikethrough"');
		expect(markup).toContain('aria-label="Text color"');
		expect(markup).toContain('aria-label="Highlight color"');
		expect(markup).toContain('aria-label="Link"');
		expect(markup).not.toContain('aria-label="Manage fonts"');
		expect(markup).not.toContain('aria-label="Align left"');
		expect(markup).not.toContain('aria-label="Use text block"');
		expect(markup).not.toContain('aria-label="Use code block"');
		expect(markup).not.toContain('aria-label="Use ordered list"');
		expect(markup).not.toContain('aria-label="Use unordered list"');
		expect(markup).not.toContain('aria-label="Ordered list marker"');
		expect(markup).not.toContain('aria-label="Unordered list marker"');
		expect(markup).not.toContain('aria-label="Line height"');
		expect(markup).not.toContain('aria-label="Block spacing"');
	});

	it("adds contextual table cell controls in table mode", () => {
		const markup = renderToStaticMarkup(
			<RichTextEditOverlay
				nodeId="table-node"
				mode="table"
				content={createTextDocumentContent([
					createRichTableBlock(
						[
							createRichTableRow([createRichTableCell([{ text: "Header" }])], {
								header: true,
							}),
							createRichTableRow([createRichTableCell([{ text: "Body" }])]),
						],
						{ columnAlignments: ["right"] },
					),
				])}
				minHeight="96px"
				onCommit={() => {}}
				onUpdateBlockGap={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain("<table");
		expect(markup).toContain(">Cell</span>");
		expect(markup).toContain('aria-label="Active column width"');
		expect(markup).toContain('aria-label="Active row height"');
		expect(markup).toContain('aria-label="Rows actions"');
		expect(markup).toContain('aria-label="Columns actions"');
		expect(markup).not.toContain(">Rows</span>");
		expect(markup).not.toContain(">Columns</span>");
		expect(markup).toContain("Insert row above");
		expect(markup).toContain("Insert row below");
		expect(markup).toContain("Insert column left");
		expect(markup).toContain("Insert column right");
		expect(markup).toContain("Delete row");
		expect(markup).toContain("Delete column");
		expect(markup).toContain('aria-label="Toggle header row"');
		expect(markup).toContain('aria-label="Use right-to-left table direction"');
		expect(markup).toContain('aria-label="Align active column left"');
		expect(markup).toContain('aria-label="Align active column center"');
		expect(markup).toContain('aria-label="Align active column right"');
		expect(
			markup.indexOf('aria-label="Align active column left"'),
		).toBeLessThan(markup.indexOf(">Cell</span>"));
		expect(markup).toContain('aria-label="Selected cell background"');
		expect(markup).toContain('aria-label="Selected cell padding"');
		expect(markup).toContain('aria-label="Borders"');
		expect(markup).toContain(">Table border target</legend>");
		expect(markup).toContain('aria-label="All borders"');
		expect(markup).toContain('aria-label="Outer borders"');
		expect(markup).toContain('aria-label="Inner borders"');
		expect(markup).toContain('aria-label="Horizontal borders"');
		expect(markup).toContain('aria-label="Vertical borders"');
		expect(markup).toContain('aria-label="Top border"');
		expect(markup).toContain('aria-label="Right border"');
		expect(markup).toContain('aria-label="Bottom border"');
		expect(markup).toContain('aria-label="Left border"');
		expect(markup).toContain('aria-label="Selected border width"');
		expect(markup).toContain('aria-label="Selected border color"');
		expect(
			markup.match(/data-mode="number-or-keyword-select"/g)?.length,
		).toBeGreaterThanOrEqual(2);
		expect(markup).toContain('aria-label="Selected cell padding"');
		expect(markup).toContain('value="0.5"');
		expect(markup).not.toContain('aria-label="Use ordered list"');
		expect(markup).not.toContain('aria-label="Line height"');
	});

	it("seeds a concrete table length when changing auto to a numeric unit", () => {
		expect(
			resolveTableLengthOptionValue({
				nextOption: "px",
				currentDraft: "",
				currentMode: "auto",
				keywordValue: "auto",
				numericDefaults: { px: 120, em: 8, "%": 50 },
			}),
	).toEqual({ value: "120px", draft: "120", mode: "px" });
		expect(
			resolveTableLengthOptionValue({
				nextOption: "%",
				currentDraft: "",
				currentMode: "auto",
				keywordValue: "auto",
				numericDefaults: { px: 120, em: 8, "%": 50 },
			}),
		).toEqual({ value: "50%", draft: "50", mode: "%" });
	});

	it("renders editable table cell metadata as header cells and alignment", () => {
		const markup = renderToStaticMarkup(
			renderEditElement(
				{
					attributes: { "data-slate-node": "element", ref: () => {} },
					children: "Header",
						element: {
							type: "table-cell",
							header: true,
							alignment: "right",
							width: "100px",
							height: "200px",
							children: [{ text: "Header" }],
					},
				} as never,
				undefined,
			),
		);

		expect(markup).toContain(
			'<th data-slate-node="element" scope="col" style="',
		);
		expect(markup).toContain("text-align:right");
		expect(markup).toContain("width:100px");
		expect(markup).toContain("height:200px;min-height:200px");
		expect(markup).toContain(">Header</th>");
	});

	it("renders live table widths through an editable colgroup", () => {
		const table = createRichTableBlock([
			createRichTableRow([createRichTableCell([{ text: "Sized" }])]),
		], {
			columnWidths: ["100px"],
			rowHeights: ["200px"],
		});
		const markup = renderToStaticMarkup(
			renderEditElement(
				{
					attributes: { "data-slate-node": "element", ref: () => {} },
					children: "Rows",
					element: table,
				} as never,
				undefined,
			),
		);

		expect(markup).toContain("width:100px");
		expect(markup).toContain("table-layout:fixed");
		expect(markup).toContain(
			'<colgroup contentEditable="false"><col style="width:100px"/></colgroup>',
		);
	});

	it("refreshes editable descendant sizing metadata after table mutations", () => {
		const table = addTableEditMetadata(
			createRichTableBlock([
				createRichTableRow([createRichTableCell([{ text: "Sized" }])]),
			]),
		);
		const resized = addTableEditMetadata(
			setTableRowHeightBlock(
				setTableColumnWidthBlock(table, 0, "100px"),
				0,
				"200px",
			),
		);
		const row = resized.children[0] as typeof resized.children[0] & {
			height?: string | null;
		};
		const cell = row.children[0] as typeof row.children[0] & {
			width?: string | null;
			height?: string | null;
		};

		expect(row.height).toBe("200px");
		expect(cell.width).toBe("100px");
		expect(cell.height).toBe("200px");
	});
});
