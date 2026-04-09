export type RichToolbarPlacement = "above" | "below";

type ToolbarViewportArgs = {
	rootRect: DOMRect;
	panelWidth: number;
	panelHeight: number;
	viewportWidth: number;
	viewportHeight: number;
};

export const RICH_TOOLBAR_EDGE_GAP_PX = 16;
export const RICH_TOOLBAR_TOPBAR_HEIGHT_PX = 56;
export const RICH_TOOLBAR_TOPBAR_GAP_PX = 8;
export const RICH_TOOLBAR_ANCHOR_GAP_PX = 10;

export function getRichToolbarViewportPosition({
	rootRect,
	panelWidth,
	panelHeight,
	viewportWidth,
	viewportHeight,
}: ToolbarViewportArgs) {
	const placement = getRichToolbarPlacement({ rootRect, panelHeight });
	const anchorLeft = rootRect.left;
	const anchorTop =
		placement === "above"
			? rootRect.top - panelHeight - RICH_TOOLBAR_ANCHOR_GAP_PX
			: rootRect.bottom + RICH_TOOLBAR_ANCHOR_GAP_PX;

	const minTop = RICH_TOOLBAR_TOPBAR_HEIGHT_PX + RICH_TOOLBAR_TOPBAR_GAP_PX;
	const maxTop = Math.max(
		minTop,
		viewportHeight - panelHeight - RICH_TOOLBAR_EDGE_GAP_PX,
	);
	const maxLeft = Math.max(
		RICH_TOOLBAR_EDGE_GAP_PX,
		viewportWidth - panelWidth - RICH_TOOLBAR_EDGE_GAP_PX,
	);

	return {
		placement,
		anchorLeft,
		anchorTop,
		left: clampNumber(anchorLeft, RICH_TOOLBAR_EDGE_GAP_PX, maxLeft),
		top: clampNumber(anchorTop, minTop, maxTop),
	};
}

function getRichToolbarPlacement({
	rootRect,
	panelHeight,
}: {
	rootRect: DOMRect;
	panelHeight: number;
}): RichToolbarPlacement {
	const topThreshold =
		RICH_TOOLBAR_TOPBAR_HEIGHT_PX +
		RICH_TOOLBAR_TOPBAR_GAP_PX +
		panelHeight +
		RICH_TOOLBAR_ANCHOR_GAP_PX;
	return rootRect.top < topThreshold ? "below" : "above";
}

function clampNumber(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}
