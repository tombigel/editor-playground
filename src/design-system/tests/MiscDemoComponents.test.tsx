import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OptionsSelectorDemo } from "../sections/base/MiscDemoComponents";

describe("design-system/MiscDemoComponents", () => {
	it("keeps the options-selector multi-select demo on compact option sizing", () => {
		const markup = renderToStaticMarkup(<OptionsSelectorDemo />);

		expect(markup).toContain("Multi-select");
		expect(markup).toContain('data-ui="options-selector"');
		expect(markup).toContain('data-mixed="true"');
		expect(markup).toContain("h-6 px-2.5");
		expect(markup).not.toContain("h-7 px-2.5");
	});
});
