import { describe, expect, it } from "vitest";
import { clampTourSurfacePosition } from "../useTransientTourDragSurface";

describe("useTransientTourDragSurface", () => {
	it("clamps tour surfaces inside the viewport margin", () => {
		expect(clampTourSurfacePosition(-40, 100, 500)).toBe(12);
		expect(clampTourSurfacePosition(240, 100, 500)).toBe(240);
		expect(clampTourSurfacePosition(480, 100, 500)).toBe(388);
	});

	it("keeps oversized surfaces anchored to the viewport margin", () => {
		expect(clampTourSurfacePosition(200, 600, 500)).toBe(12);
	});
});
