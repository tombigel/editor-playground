import { describe, expect, it } from "vitest";
import { getRichToolbarViewportPosition } from "../stageRenderers/richToolbarPosition";

function createRect({
	top,
	left,
	width,
	height,
}: {
	top: number;
	left: number;
	width: number;
	height: number;
}) {
	return {
		top,
		left,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
		toJSON: () => ({}),
	} as DOMRect;
}

describe("stage/richToolbarPosition", () => {
	it("anchors above by default and clamps within the viewport gutters", () => {
		const position = getRichToolbarViewportPosition({
			rootRect: createRect({ top: 320, left: 840, width: 180, height: 72 }),
			panelWidth: 260,
			panelHeight: 88,
			viewportWidth: 1024,
			viewportHeight: 768,
		});

		expect(position.placement).toBe("above");
		expect(position.top).toBe(222);
		expect(position.left).toBe(748);
	});

	it("switches below when the edited node is too close to the top bar", () => {
		const position = getRichToolbarViewportPosition({
			rootRect: createRect({ top: 96, left: 120, width: 220, height: 64 }),
			panelWidth: 280,
			panelHeight: 92,
			viewportWidth: 1280,
			viewportHeight: 720,
		});

		expect(position.placement).toBe("below");
		expect(position.top).toBe(170);
		expect(position.left).toBe(120);
	});
});
