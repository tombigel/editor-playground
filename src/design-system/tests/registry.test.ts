import { describe, expect, it } from "vitest";
import { DS_SECTIONS } from "../registry";

describe("design-system/registry", () => {
	function getBaseSubsectionIds() {
		const baseSection = DS_SECTIONS.find((section) => section.id === "base");
		return baseSection?.subsections.map((subsection) => subsection.id) ?? [];
	}

	it("includes the FormField demo in the Base Components menu", () => {
		const baseSection = DS_SECTIONS.find((section) => section.id === "base");

		expect(baseSection?.subsections.map((subsection) => subsection.id)).toContain(
			"base-form-field",
		);
		expect(baseSection?.subsections.find((subsection) => subsection.id === "base-form-field"))
			.toEqual({ id: "base-form-field", label: "FormField" });
	});

	it("keeps the FormField entry ordered with the rendered base demos", () => {
		const ids = getBaseSubsectionIds();

		expect(ids.indexOf("base-label")).toBeLessThan(ids.indexOf("base-form-field"));
		expect(ids.indexOf("base-form-field")).toBeLessThan(
			ids.indexOf("base-text-button"),
		);
	});

	it("includes the searchable multi-select demo in the Base Components menu", () => {
		const baseSection = DS_SECTIONS.find((section) => section.id === "base");

		expect(
			baseSection?.subsections.find(
				(subsection) => subsection.id === "base-searchable-multi-select",
			),
		).toEqual({
			id: "base-searchable-multi-select",
			label: "Searchable Multi Select",
		});
	});

	it("keeps searchable select, searchable multi-select, and text input ordered with the rendered base demos", () => {
		const ids = getBaseSubsectionIds();

		expect(ids.indexOf("base-searchable-select")).toBeLessThan(
			ids.indexOf("base-searchable-multi-select"),
		);
		expect(ids.indexOf("base-searchable-multi-select")).toBeLessThan(
			ids.indexOf("base-input"),
		);
	});

	it("keeps searchable menu variants before the standard dropdown demo", () => {
		const ids = getBaseSubsectionIds();

		expect(ids.indexOf("base-searchable-select")).toBeLessThan(
			ids.indexOf("base-select"),
		);
		expect(ids.indexOf("base-searchable-multi-select")).toBeLessThan(
			ids.indexOf("base-select"),
		);
	});
});
