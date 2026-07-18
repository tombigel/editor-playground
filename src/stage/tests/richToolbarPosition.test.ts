import { describe, expect, it } from "vitest";
import {
	clampRichToolbarOffset,
	getRichToolbarViewportPosition,
	normalizeRichToolbarOffset,
	RICH_TOOLBAR_ANCHOR_GAP_PX,
	RICH_TOOLBAR_EDGE_GAP_PX,
	RICH_TOOLBAR_TOPBAR_GAP_PX,
	RICH_TOOLBAR_TOPBAR_HEIGHT_PX,
} from "../stageRenderers/richToolbarPosition";

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
	it("normalizes invalid persisted offsets back to zero", () => {
		expect(
			normalizeRichToolbarOffset({
				x: Number.NaN,
				y: Number.POSITIVE_INFINITY,
			}),
		).toEqual({ x: 0, y: 0 });
	});

	it("anchors above by default and clamps within the viewport gutters", () => {
		const position = getRichToolbarViewportPosition({
			rootRect: createRect({ top: 320, left: 840, width: 180, height: 72 }),
			panelWidth: 260,
			panelHeight: 88,
			viewportWidth: 1024,
			viewportHeight: 768,
			offset: { x: 0, y: 0 },
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
			offset: { x: 0, y: 0 },
		});

		expect(position.placement).toBe("below");
		expect(position.top).toBe(170);
		expect(position.left).toBe(120);
	});

	it("keeps the toolbar inside the stage horizontal bounds", () => {
		const position = getRichToolbarViewportPosition({
			rootRect: createRect({ top: 220, left: 180, width: 420, height: 96 }),
			panelWidth: 524,
			panelHeight: 144,
			viewportWidth: 900,
			viewportHeight: 700,
			horizontalBounds: { left: 68, right: 592 },
		});

		expect(position.left).toBe(68);
	});

	it("clamps dragged offsets below the top bar and inside viewport edges", () => {
		const offset = clampRichToolbarOffset({
			rootRect: createRect({ top: 120, left: 40, width: 180, height: 72 }),
			panelWidth: 280,
			panelHeight: 92,
			viewportWidth: 960,
			viewportHeight: 640,
			offset: { x: 0, y: 0 },
			deltaX: -400,
			deltaY: -400,
		});

		expect(offset).toEqual({
			x: RICH_TOOLBAR_EDGE_GAP_PX - 40,
			y:
				RICH_TOOLBAR_TOPBAR_HEIGHT_PX +
				RICH_TOOLBAR_TOPBAR_GAP_PX -
				(120 + 72 + RICH_TOOLBAR_ANCHOR_GAP_PX),
		});
	});
});
