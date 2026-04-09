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
		expect(markup).not.toContain(
			'data-stage-rich-toolbar="true" popover="manual"',
		);
		expect(markup).toContain('data-stage-rich-toolbar-drag-handle="true"');
		expect(markup).toContain("self-center");
		expect(markup).toContain("cursor-grab");
		expect(markup).toContain('aria-label="Font family"');
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
		expect(markup).toContain("focus-visible:outline-[color:var(--editor-focus-ring-strong)]");
		expect(markup).not.toContain('aria-label="Font size unit" class="editor-bg-surface editor-border-subtle editor-text-strong flex w-full items-center rounded-sm outline-none disabled:cursor-not-allowed');
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
		expect(markup).toContain("padding-inline-start:1.25em");
	});

	it("applies block line height in live edit markup", () => {
		const markup = renderToStaticMarkup(
			<RichTextEditOverlay
				nodeId="rich-node"
				content={createTextDocumentContent([
					{
						type: "paragraph",
						lineHeight: 1.8,
						children: [{ text: "Live line height" }],
					},
				])}
				minHeight="96px"
				onCommit={() => {}}
				onUpdateBlockGap={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain("line-height:1.8");
	});
});
