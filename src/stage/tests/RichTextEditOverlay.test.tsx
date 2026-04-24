import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichTextEditOverlay } from "../stageRenderers/RichTextEditOverlay";
import {
	createTextDocumentContent,
	listContentToRichListBlock,
} from "../../model/richContent";

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
});
