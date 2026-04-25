import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createTextDocumentFromCode } from "../../model/richContent";
import {
	CodeTextEditOverlay,
	indentCodeTextSelection,
	unindentCodeTextSelection,
} from "../stageRenderers/CodeTextEditOverlay";

describe("stage/CodeTextEditOverlay", () => {
	it("renders a raw code textarea with authored tab width and minimum height", () => {
		const markup = renderToStaticMarkup(
			<CodeTextEditOverlay
				nodeId="code-node"
				content={createTextDocumentFromCode("const value = 1;", {
					language: "typescript",
					theme: "auto",
					style: { tabSize: 4 },
				})}
				contentStyle={{ fontFamily: "monospace" }}
				minHeight="120px"
				tabSize={4}
				wrap={false}
				onCommit={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain('data-stage-code-edit-root="true"');
		expect(markup).toContain('data-stage-code-toolbar="true"');
		expect(markup).toContain("position");
		expect(markup).toContain("fixed");
		expect(markup).toContain("width:max-content");
		expect(markup).toContain('data-ui="toolbar-control-row"');
		expect(markup).toContain('data-ui="toolbar-control-group"');
		expect(markup).toContain('data-ui="toolbar-control-divider"');
		expect(markup).toContain('data-stage-toolbar-drag-handle="true"');
		expect(markup).toContain('aria-label="Drag code toolbar"');
		expect(markup).toContain("cursor-grab");
		expect(markup).toContain('aria-label="Code language"');
		expect(markup).toContain('data-stage-rich-select-id="code-language"');
		expect(markup).toContain('aria-label="Code theme auto"');
		expect(markup).toContain('aria-label="Code theme light"');
		expect(markup).toContain('aria-label="Code theme dark"');
		expect(markup).toContain('aria-pressed="true"');
		expect(markup).toContain("editor-bg-subtle");
		expect(markup).toContain('data-variant="ghost"');
		expect(markup).toContain('data-stage-code-edit-textarea="true"');
		expect(markup).toContain('data-code-theme="auto"');
		expect(markup).toContain('aria-label="Code editor"');
		expect(markup).toContain("min-height:120px");
		expect(markup).toContain("tab-size:4");
		expect(markup).toContain('wrap="off"');
		expect(markup).toContain("white-space:pre");
		expect(markup).toContain("overflow-x:auto");
		expect(markup).toContain("overflow-wrap:normal");
		expect(markup).toContain("const value = 1;");
		expect(markup).not.toContain('data-stage-rich-toolbar="true"');
		expect(markup).not.toContain('aria-label="Bold"');
		expect(markup).not.toContain('aria-label="Link"');
	});

	it("applies selected code theme to the live editor surface", () => {
		const markup = renderToStaticMarkup(
			<CodeTextEditOverlay
				nodeId="code-node"
				content={createTextDocumentFromCode("const value = 1;", {
					language: "typescript",
					theme: "dark",
				})}
				contentStyle={{ fontFamily: "monospace" }}
				onCommit={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain('data-code-theme="dark"');
		expect(markup).toContain("background:#272822");
		expect(markup).toContain("color:#f8f8f2");
	});

	it("keeps auto code theme tied to the viewer system preference instead of editor theme", () => {
		const css = readFileSync(resolve("src/styles.css"), "utf8");
		const main = readFileSync(resolve("src/main.tsx"), "utf8");
		expect(css).toContain("@media (prefers-color-scheme: dark)");
		expect(css).toContain('pre[data-code-theme="auto"]');
		expect(css).toContain('pre[data-code-theme] code[class*="language-"]');
		expect(css).toContain("white-space: inherit;");
		expect(css).toContain("tab-size: inherit;");
		expect(css).toContain("word-wrap: inherit;");
		expect(main.indexOf('import "prismjs/themes/prism.css";')).toBeLessThan(
			main.indexOf('import "./styles.css";'),
		);
		expect(css).toContain(
			'textarea[data-stage-code-edit-textarea="true"][data-code-theme="auto"]',
		);
		expect(css).not.toContain(
			'[data-editor-theme="dark"] pre[data-code-theme="auto"]',
		);
		expect(css).not.toContain(
			'[data-editor-theme="dark"] textarea[data-stage-code-edit-textarea="true"][data-code-theme="auto"]',
		);
	});

	it("indents and unindents the current line with literal tabs", () => {
		const indented = indentCodeTextSelection("one\ntwo", 5, 5);
		expect(indented).toEqual({
			text: "one\n\ttwo",
			selectionStart: 6,
			selectionEnd: 6,
		});

		expect(unindentCodeTextSelection(indented.text, 6, 6)).toEqual({
			text: "one\ntwo",
			selectionStart: 5,
			selectionEnd: 5,
		});
	});

	it("indents and unindents every selected line", () => {
		const indented = indentCodeTextSelection("one\ntwo\nthree", 1, 9);
		expect(indented).toEqual({
			text: "\tone\n\ttwo\n\tthree",
			selectionStart: 2,
			selectionEnd: 12,
		});

		expect(unindentCodeTextSelection(indented.text, 2, 12)).toEqual({
			text: "one\ntwo\nthree",
			selectionStart: 1,
			selectionEnd: 9,
		});
	});
});
