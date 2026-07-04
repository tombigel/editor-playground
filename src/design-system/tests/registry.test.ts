import { describe, expect, it } from "vitest";
import { DS_SECTIONS } from "../registry";

describe("design-system/registry", () => {
	function getBaseSubsectionIds() {
		const baseSection = DS_SECTIONS.find((section) => section.id === "base");
		return baseSection?.subsections.map((subsection) => subsection.id) ?? [];
	}

	it("promotes logo assets before design tokens", () => {
		expect(DS_SECTIONS[0]).toMatchObject({
			id: "logo-assets",
			label: "Logo Assets",
		});
		expect(DS_SECTIONS[0]?.subsections).toEqual([
			{ id: "logo-assets", label: "Logo Assets" },
		]);

		const sectionIds = DS_SECTIONS.map((section) => section.id);

		expect(sectionIds.indexOf("logo-assets")).toBeLessThan(
			sectionIds.indexOf("tokens"),
		);
		expect(sectionIds).not.toContain("ai");
	});

	it("keeps AI assistant demos under Panels", () => {
		const panelsSection = DS_SECTIONS.find((section) => section.id === "panels");

		expect(
			panelsSection?.subsections.find(
				(subsection) => subsection.id === "composite-ai-draft-diff",
			),
		).toEqual({
			id: "composite-ai-draft-diff",
			label: "AI Draft Diff Card",
		});
	});

	it("includes the FormField demo in the Base Components menu", () => {
		const baseSection = DS_SECTIONS.find((section) => section.id === "base");

		expect(baseSection?.subsections.map((subsection) => subsection.id)).toContain(
			"base-form-field",
		);
		expect(baseSection?.subsections.find((subsection) => subsection.id === "base-form-field"))
			.toEqual({ id: "base-form-field", label: "FormField" });
	});

	it("does not duplicate logo assets inside the Base Components menu", () => {
		const baseSection = DS_SECTIONS.find((section) => section.id === "base");

		expect(
			baseSection?.subsections.some(
				(subsection) =>
					subsection.id === "logo-assets" ||
					subsection.id === "base-logo-assets",
			),
		).toBe(false);
	});

	it("keeps the FormField entry ordered with the rendered base demos", () => {
		const ids = getBaseSubsectionIds();

		expect(ids.indexOf("base-title")).toBeLessThan(ids.indexOf("base-badge"));
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

	it("keeps text input before the standard dropdown demo", () => {
		const ids = getBaseSubsectionIds();

		expect(ids.indexOf("base-input")).toBeLessThan(ids.indexOf("base-select"));
	});

	it("keeps searchable menu variants after the standard dropdown demo", () => {
		const ids = getBaseSubsectionIds();

		expect(ids.indexOf("base-select")).toBeLessThan(
			ids.indexOf("base-searchable-select"),
		);
		expect(ids.indexOf("base-searchable-select")).toBeLessThan(
			ids.indexOf("base-searchable-multi-select"),
		);
		expect(ids.indexOf("base-searchable-multi-select")).toBeLessThan(
			ids.indexOf("base-color"),
		);
	});
});
