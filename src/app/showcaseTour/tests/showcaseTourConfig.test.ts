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

	it("anchors the UI settings story to the settings panel shell", () => {
		const step = SHOWCASE_TOUR_CONFIG.steps.find((item) => item.id === "ui-settings");

		expect(step?.anchor).toEqual({
			type: "selector",
			selector: '[data-showcase-tour-anchor="settings-panel"]',
			label: "UI settings",
		});
	});

	it("anchors transfer stories to the settings nav route", () => {
		for (const stepId of ["model-transfer", "link-validation"]) {
			const step = SHOWCASE_TOUR_CONFIG.steps.find((item) => item.id === stepId);

			expect(step?.anchor).toEqual({
				type: "selector",
				selector: '[data-settings-nav="transfer"]',
				label: stepId === "model-transfer" ? "Transfer workflow" : "Validation workflow",
			});
		}
	});
});
