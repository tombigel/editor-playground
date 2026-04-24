import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TypographyDemos } from "../sections/composite/TypographyDemos";

describe("design-system/TypographyDemos", () => {
	it("documents grouped floating text toolbar layouts", () => {
		const markup = renderToStaticMarkup(<TypographyDemos />);

		expect(markup).toContain('data-design-system-toolbar-grouping-demo="rich"');
		expect(markup).toContain(
			'data-design-system-toolbar-grouping-demo="block-list"',
		);
		expect(markup).toContain('data-ui="toolbar-control-row"');
		expect(markup).toContain('data-ui="toolbar-control-group"');
		expect(markup).toContain('data-ui="toolbar-control-divider"');
	});
});
