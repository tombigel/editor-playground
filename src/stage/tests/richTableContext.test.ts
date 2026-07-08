import { describe, expect, it } from "vitest";
import type { Descendant } from "slate";
import { createRichEditor } from "../../render/richTextEditor";
import {
	createRichTableBlock,
	createRichTableCell,
	createRichTableRow,
} from "../../model/richContent";
import type { RichTableCell } from "../../model/types";
import { getActiveTableContext } from "../stageRenderers/richTextEditOverlay/helpers";

describe("rich table context", () => {
	it("derives the active table cell coordinates from Slate paths", () => {
		const editor = createRichEditor();
		const table = createRichTableBlock([
			createRichTableRow([
				createRichTableCell([{ text: "A1" }]),
				createRichTableCell([{ text: "B1" }]),
			], { header: true }),
			createRichTableRow([
				createRichTableCell([{ text: "A2" }]),
				{
					...createRichTableCell([{ text: "B2" }]),
					style: { background: "#ffeeaa" },
				} as RichTableCell & { style: { background: string } },
			]),
		], {
			direction: "rtl",
			columnAlignments: [null, "right"],
			columnWidths: [null, "42%"],
			rowHeights: [null, "3em"],
		});

		editor.children = [table] as Descendant[];
		editor.selection = {
			anchor: { path: [0, 1, 1, 0], offset: 0 },
			focus: { path: [0, 1, 1, 0], offset: 0 },
		};

		expect(getActiveTableContext(editor)).toMatchObject({
			rowIndex: 1,
			columnIndex: 1,
			rowCount: 2,
			columnCount: 2,
			columnWidth: "42%",
			rowHeight: "3em",
			columnAlignment: "right",
			cellStyle: { background: "#ffeeaa" },
			direction: "rtl",
			hasHeader: true,
		});
	});

	it("returns null without an active table cell", () => {
		const editor = createRichEditor();
		editor.children = [{ type: "paragraph", children: [{ text: "Plain" }] }] as unknown as Descendant[];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 0 },
		};

		expect(getActiveTableContext(editor)).toBeNull();
	});
});
