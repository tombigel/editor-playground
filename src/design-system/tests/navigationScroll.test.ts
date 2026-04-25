import { describe, expect, it, vi } from "vitest";
import {
	getDesignSystemAnchorFromHash,
	getDesignSystemHashWithAnchor,
	getDesignSystemSectionScrollTop,
	parseDesignSystemAnchor,
	scrollDesignSystemSectionIntoView,
} from "../navigationScroll";

describe("design-system/navigationScroll", () => {
	it("reads valid design-system anchors from the current hash route", () => {
		const validIds = ["base-switch", "base-select"];

		expect(
			getDesignSystemAnchorFromHash("#/design-system#base-switch", validIds),
		).toBe("base-switch");
		expect(
			getDesignSystemAnchorFromHash("#/design-system/base-select", validIds),
		).toBe("base-select");
	});

	it("ignores unknown and non-design-system anchors", () => {
		const validIds = ["base-switch"];

		expect(
			getDesignSystemAnchorFromHash("#/design-system#missing", validIds),
		).toBeNull();
		expect(parseDesignSystemAnchor("#/")).toBeNull();
	});

	it("writes design-system anchors without losing the showcase route", () => {
		expect(getDesignSystemHashWithAnchor("base-warning-info")).toBe(
			"#/design-system#base-warning-info",
		);
	});

	it("computes container-local scroll positions using scroll margin", () => {
		const scrollContainer = {
			scrollTop: 320,
			getBoundingClientRect: () => ({ top: 80 }),
		} as unknown as HTMLElement;
		const target = {
			ownerDocument: {
				defaultView: {
					getComputedStyle: () => ({ scrollMarginTop: "32px" }),
				},
			},
			getBoundingClientRect: () => ({ top: 560 }),
		} as unknown as HTMLElement;

		expect(getDesignSystemSectionScrollTop(scrollContainer, target)).toBe(768);
	});

	it("scrolls the stage container directly instead of relying on native ancestor scrolling", () => {
		const scrollTo = vi.fn();
		const scrollContainer = {
			scrollTop: 320,
			scrollTo,
			getBoundingClientRect: () => ({ top: 80 }),
		} as unknown as HTMLElement;
		const target = {
			ownerDocument: {
				defaultView: {
					getComputedStyle: () => ({ scrollMarginTop: "32px" }),
				},
			},
			getBoundingClientRect: () => ({ top: 560 }),
		} as unknown as HTMLElement;

		scrollDesignSystemSectionIntoView(scrollContainer, target);

		expect(scrollTo).toHaveBeenCalledWith({
			top: 768,
			behavior: "smooth",
		});
	});
});
