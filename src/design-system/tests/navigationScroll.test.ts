import { describe, expect, it, vi } from "vitest";
import {
	getDesignSystemSectionScrollTop,
	scrollDesignSystemSectionIntoView,
} from "../navigationScroll";

describe("design-system/navigationScroll", () => {
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
