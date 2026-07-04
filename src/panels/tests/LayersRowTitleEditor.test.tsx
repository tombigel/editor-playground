import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LayersRowTitleEditor, resolveTitleEditorKeyAction } from "../LayersRowTitleEditor";

describe("panels/LayersRowTitleEditor", () => {
	it("resolves Enter to commit, Escape to cancel, and other keys to no action", () => {
		expect(resolveTitleEditorKeyAction("Enter")).toBe("commit");
		expect(resolveTitleEditorKeyAction("Escape")).toBe("cancel");
		expect(resolveTitleEditorKeyAction("Tab")).toBeNull();
		expect(resolveTitleEditorKeyAction("a")).toBeNull();
	});

	it("renders an input seeded with the current name and an accessible label", () => {
		const markup = renderToStaticMarkup(
			<LayersRowTitleEditor name="Hero section" onCommit={() => {}} onCancel={() => {}} />,
		);

		expect(markup).toContain('value="Hero section"');
		expect(markup).toContain('aria-label="Edit title"');
	});
});
