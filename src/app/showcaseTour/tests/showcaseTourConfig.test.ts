import { describe, expect, it } from "vitest";
import { SHOWCASE_TOUR_CONFIG } from "../showcaseTourConfig";

describe("showcase tour config", () => {
	it("makes focused mode and panel state explicit for every step", () => {
		for (const step of SHOWCASE_TOUR_CONFIG.steps) {
			expect(
				Object.hasOwn(step.navigation.editor ?? {}, "focusedMode"),
				`${step.id} should explicitly set or clear focused mode`,
			).toBe(true);
			expect(
				step.navigation.panels?.[0],
				`${step.id} should start by clearing transient panels`,
			).toEqual({ type: "closeAll" });
			expect(
				step.navigation.panel,
				`${step.id} should use complete panel scenes instead of panel deltas`,
			).toBeUndefined();
		}
	});

	it("anchors settings stories to settings nav routes", () => {
		for (const [stepId, navId, label] of [
			["ui-settings", "display", "UI settings"],
			["font-system", "fonts", "Font workflow"],
			["model-transfer", "transfer", "Transfer workflow"],
			["link-validation", "transfer", "Validation workflow"],
		]) {
			const step = SHOWCASE_TOUR_CONFIG.steps.find((item) => item.id === stepId);

			expect(step?.anchor).toEqual({
				type: "selector",
				selector: `[data-settings-nav="${navId}"]`,
				label,
			});
		}
	});

	it("makes sticky story deep links self-contained", () => {
		for (const stepId of [
			"sticky-templates",
			"sticky-node",
			"sticky-guides",
			"edge-lab",
		]) {
			const step = SHOWCASE_TOUR_CONFIG.steps.find((item) => item.id === stepId);

			expect(step?.navigation.insertSectionTemplate).toEqual({
				templateId: "stickySteps",
				ifMissingNodeName: "Sticky Edge Lab",
			});
		}
	});

	it("offers the preview step as a new-tab action", () => {
		const step = SHOWCASE_TOUR_CONFIG.steps.find(
			(item) => item.id === "site-preview-export",
		);

		expect(step?.action).toEqual({
			type: "externalLink",
			label: "Open preview in a new tab",
			href: "?mode=preview",
		});
	});
});
