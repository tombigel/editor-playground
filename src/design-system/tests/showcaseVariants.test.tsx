import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FontControlDemos } from "../sections/base/FontControlDemos";
import { MiscDemos } from "../sections/base/MiscDemos";

describe("design-system/showcase variants", () => {
	it("shows the hidden selection chrome variant", () => {
		const markup = renderToStaticMarkup(<MiscDemos />);

		expect(markup).toContain("Hidden");
		expect(markup).toContain('class="stage-single-selection-overlay"');
		expect(markup).toContain('data-hidden="true"');
	});

	it("shows all Editor Playground logo asset variants", () => {
		const markup = renderToStaticMarkup(<MiscDemos />);

		expect(markup).toContain('id="base-logo-assets"');
		expect(markup).toContain("editor-playground-logo-favicon.svg");
		expect(markup).toContain("editor-playground-logo-favicon-monochrome.svg");
		expect(markup).toContain("editor-playground-logo-one-line.svg");
		expect(markup).toContain("editor-playground-logo-one-line-monochrome.svg");
		expect(markup).toContain("editor-playground-logo-two-lines.svg");
		expect(markup).toContain("editor-playground-logo-two-lines-monochrome.svg");
	});

	it("renders searchable select sections after Dropdown (Select)", () => {
		const markup = renderToStaticMarkup(<FontControlDemos />);
		const selectIndex = markup.indexOf('id="base-select"');
		const searchableSelectIndex = markup.indexOf('id="base-searchable-select"');
		const searchableMultiSelectIndex = markup.indexOf(
			'id="base-searchable-multi-select"',
		);

		expect(markup).not.toContain("Searchable dropdown");
		expect(selectIndex).toBeGreaterThan(-1);
		expect(searchableSelectIndex).toBeGreaterThan(selectIndex);
		expect(searchableMultiSelectIndex).toBeGreaterThan(searchableSelectIndex);
	});

	it("shows the notice surface no-icon variant", () => {
		const markup = renderToStaticMarkup(<MiscDemos />);
		const noIconLabelIndex = markup.indexOf("NoticeSurface (no icon)");
		const noIconTextIndex = markup.indexOf(
			"Compact helper copy without a leading marker.",
		);
		const noIconSlice = markup.slice(noIconLabelIndex, noIconTextIndex);

		expect(noIconLabelIndex).toBeGreaterThan(-1);
		expect(noIconTextIndex).toBeGreaterThan(noIconLabelIndex);
		expect(noIconSlice).not.toContain('data-ui="notice-icon"');
	});
});
