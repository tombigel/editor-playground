import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialDocument } from "../../../model/defaults";
import { PageInspectorSection } from "../contentSections/PageInspectorSection";

describe("panels/inspector/PageInspectorSection", () => {
	it("uses FormField layouts for simple page inspector rows", () => {
		const document = createInitialDocument();
		const page = document.pages?.[0];

		if (!page) {
			throw new Error("Expected initial page");
		}

		const markup = renderToStaticMarkup(
			<PageInspectorSection
				page={page}
				document={document}
				onSetDisplayName={() => {}}
				onSetLang={() => {}}
				onSetSlug={() => {}}
				onSetVisibility={() => {}}
				onSetViewTransition={() => {}}
				onSetPageParent={() => {}}
				onValidateLinks={() => {}}
				onOpenPageSettings={() => {}}
				onOpenPagesPanel={() => {}}
			/>,
		);

		expect(markup).toContain("Display name");
		expect(markup).toContain("Slug");
		expect(markup).toContain("Language");
		expect(markup).toContain("Visible");
		expect(markup).toContain("Transition");
		expect(markup).toContain("Parent");
		expect((markup.match(/data-layout="stack"/g) ?? []).length).toBeGreaterThanOrEqual(2);
		expect((markup.match(/data-layout="inline"/g) ?? []).length).toBeGreaterThanOrEqual(4);
	});
});
