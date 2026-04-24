import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createTextDocumentFromCode } from "../../model/richContent";
import { CodeTextEditOverlay } from "../stageRenderers/CodeTextEditOverlay";

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
				onCommit={() => {}}
				onDiscard={() => {}}
			/>,
		);

		expect(markup).toContain('data-stage-code-edit-root="true"');
		expect(markup).toContain('data-stage-code-edit-textarea="true"');
		expect(markup).toContain('aria-label="Code editor"');
		expect(markup).toContain("min-height:120px");
		expect(markup).toContain("tab-size:4");
		expect(markup).toContain("const value = 1;");
		expect(markup).not.toContain('data-stage-rich-toolbar="true"');
	});
});
