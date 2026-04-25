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

	it("shows the searchable dropdown variant inside Dropdown (Select)", () => {
		const markup = renderToStaticMarkup(<FontControlDemos />);

		expect(markup).toContain("Searchable dropdown");
		expect(markup).toContain('data-ui="select-trigger"');
		expect(markup).toContain("Search pages");
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
