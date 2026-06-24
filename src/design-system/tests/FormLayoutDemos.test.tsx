import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormLayoutDemos } from "../sections/base/FormLayoutDemos";

describe("design-system/FormLayoutDemos", () => {
	it("shows rich FormField labels and fixed inline-group rails in the showcase", () => {
		const markup = renderToStaticMarkup(<FormLayoutDemos />);

		expect(markup).toContain("Broken anchor");
		expect(markup).toContain('style="width:172px"');
		expect(markup).toContain('data-layout="inline-group"');
		expect(markup).toContain("with inline notice");
	});
});
