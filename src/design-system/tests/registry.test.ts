import { describe, expect, it } from "vitest";
import { DS_SECTIONS } from "../registry";

describe("design-system/registry", () => {
	it("includes the FormField demo in the Base Components menu", () => {
		const baseSection = DS_SECTIONS.find((section) => section.id === "base");

		expect(baseSection?.subsections.map((subsection) => subsection.id)).toContain(
			"base-form-field",
		);
		expect(baseSection?.subsections.find((subsection) => subsection.id === "base-form-field"))
			.toEqual({ id: "base-form-field", label: "FormField" });
	});

	it("keeps the FormField entry ordered with the rendered base demos", () => {
		const baseSection = DS_SECTIONS.find((section) => section.id === "base");
		const ids = baseSection?.subsections.map((subsection) => subsection.id) ?? [];

		expect(ids.indexOf("base-label")).toBeLessThan(ids.indexOf("base-form-field"));
		expect(ids.indexOf("base-form-field")).toBeLessThan(
			ids.indexOf("base-text-button"),
		);
	});
});
