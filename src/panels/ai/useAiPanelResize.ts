import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useState,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
} from "react";

export const AI_PANEL_VIEWPORT_MARGIN_PX = 16;

const AI_PANEL_DEFAULT_WIDTH_PX = 360;
const AI_PANEL_MIN_WIDTH_PX = 320;
const AI_PANEL_MAX_WIDTH_PX = 720;
const AI_PANEL_MIN_HEIGHT_PX = 360;
const AI_PANEL_MAX_HEIGHT_PX = 760;

type PanelResizeState = {
	pointerId: number;
	originX: number;
	originY: number;
	originWidth: number;
	originHeight: number;
};

export type AiPanelSize = {
	width: number;
	height: number | null;
};

type AiPanelResizeOptions = {
	open: boolean;
	surfaceRef: RefObject<HTMLDivElement | null>;
	position: { top: number; left: number };
	onPositionChange: (position: { top: number; left: number }) => void;
};

export function getBoundedAiPanelSize(
	size: { width: number; height: number },
	position: { top: number; left: number },
	viewport: { width: number; height: number },
): { width: number; height: number } {
	return getBoundedAiPanelFrame(size, position, viewport).size;
}

export function getBoundedAiPanelFrame(
	size: { width: number; height: number },
	position: { top: number; left: number },
	viewport: { width: number; height: number },
): {
	size: { width: number; height: number };
	position: { top: number; left: number };
} {
	const maxWidth = Math.min(
		AI_PANEL_MAX_WIDTH_PX,
		Math.max(0, viewport.width - AI_PANEL_VIEWPORT_MARGIN_PX * 2),
	);
	const maxHeight = Math.min(
		AI_PANEL_MAX_HEIGHT_PX,
		Math.max(0, viewport.height - AI_PANEL_VIEWPORT_MARGIN_PX * 2),
	);
	const minWidth = Math.min(AI_PANEL_MIN_WIDTH_PX, maxWidth);
	const minHeight = Math.min(AI_PANEL_MIN_HEIGHT_PX, maxHeight);
	const boundedSize = {
		width: clampDimension(size.width, minWidth, maxWidth),
		height: clampDimension(size.height, minHeight, maxHeight),
	};

	return {
		size: boundedSize,
		position: {
			top: clampToViewport(position.top, boundedSize.height, viewport.height),
			left: clampToViewport(position.left, boundedSize.width, viewport.width),
		},
	};
}

export function useAiPanelResize({
	open,
	surfaceRef,
	position,
	onPositionChange,
}: AiPanelResizeOptions) {
	const [panelSize, setPanelSize] = useState<AiPanelSize>({
		width: AI_PANEL_DEFAULT_WIDTH_PX,
		height: null,
	});
	const [panelResizeState, setPanelResizeState] =
		useState<PanelResizeState | null>(null);

	const getCurrentPanelPixelSize = useCallback(() => {
		const rect = surfaceRef.current?.getBoundingClientRect();
		return {
			width: rect?.width ?? panelSize.width,
			height: rect?.height ?? panelSize.height ?? AI_PANEL_MIN_HEIGHT_PX,
		};
	}, [panelSize.height, panelSize.width, surfaceRef]);

	useLayoutEffect(() => {
		if (!open || typeof window === "undefined") {
			return;
		}
		const currentSize = getCurrentPanelPixelSize();
		const nextFrame = getBoundedAiPanelFrame(currentSize, position, {
			width: window.innerWidth,
			height: window.innerHeight,
		});
		if (
			nextFrame.size.width !== currentSize.width ||
			nextFrame.size.height !== currentSize.height
		) {
			setPanelSize(nextFrame.size);
		}
		if (
			nextFrame.position.top !== position.top ||
			nextFrame.position.left !== position.left
		) {
			onPositionChange(nextFrame.position);
		}
	}, [getCurrentPanelPixelSize, onPositionChange, open, position]);

	useEffect(() => {
		if (!panelResizeState || typeof window === "undefined") {
			return;
		}
		const currentPanelResize = panelResizeState;

		function handlePointerMove(event: PointerEvent) {
			if (event.pointerId !== currentPanelResize.pointerId) {
				return;
			}
			event.preventDefault();
			const nextFrame = getBoundedAiPanelFrame(
				{
					width:
						currentPanelResize.originWidth +
						(event.clientX - currentPanelResize.originX),
					height:
						currentPanelResize.originHeight +
						(event.clientY - currentPanelResize.originY),
				},
				position,
				{ width: window.innerWidth, height: window.innerHeight },
			);
			setPanelSize(nextFrame.size);
			if (
				nextFrame.position.top !== position.top ||
				nextFrame.position.left !== position.left
			) {
				onPositionChange(nextFrame.position);
			}
		}

		function handlePointerEnd(event: PointerEvent) {
			if (event.pointerId !== currentPanelResize.pointerId) {
				return;
			}
			setPanelResizeState(null);
		}

		window.addEventListener("pointermove", handlePointerMove, {
			passive: false,
		});
		window.addEventListener("pointerup", handlePointerEnd);
		window.addEventListener("pointercancel", handlePointerEnd);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerEnd);
			window.removeEventListener("pointercancel", handlePointerEnd);
		};
	}, [onPositionChange, panelResizeState, position]);

	useEffect(() => {
		if (!panelResizeState) {
			return;
		}

		const { cursor, userSelect } = globalThis.document.body.style;
		globalThis.document.body.style.cursor = "nwse-resize";
		globalThis.document.body.style.userSelect = "none";

		return () => {
			globalThis.document.body.style.cursor = cursor;
			globalThis.document.body.style.userSelect = userSelect;
		};
	}, [panelResizeState]);

	function applyNextFrame(size: { width: number; height: number }) {
		if (typeof window === "undefined") {
			return null;
		}
		const nextFrame = getBoundedAiPanelFrame(size, position, {
			width: window.innerWidth,
			height: window.innerHeight,
		});
		setPanelSize(nextFrame.size);
		if (
			nextFrame.position.top !== position.top ||
			nextFrame.position.left !== position.left
		) {
			onPositionChange(nextFrame.position);
		}
		return nextFrame;
	}

	function handleResizePointerDown(event: ReactPointerEvent<HTMLElement>) {
		if (event.button !== 0) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		const nextFrame = applyNextFrame(getCurrentPanelPixelSize());
		if (!nextFrame) {
			return;
		}
		setPanelResizeState({
			pointerId: event.pointerId,
			originX: event.clientX,
			originY: event.clientY,
			originWidth: nextFrame.size.width,
			originHeight: nextFrame.size.height,
		});
	}

	return {
		panelSize,
		resizeHandleProps: {
			onPointerDown: handleResizePointerDown,
		},
	};
}

function clampToViewport(value: number, size: number, viewportSize: number) {
	return Math.round(
		Math.max(
			AI_PANEL_VIEWPORT_MARGIN_PX,
			Math.min(viewportSize - size - AI_PANEL_VIEWPORT_MARGIN_PX, value),
		),
	);
}

function clampDimension(value: number, min: number, max: number) {
	if (max <= min) {
		return Math.round(max);
	}
	return Math.round(Math.max(min, Math.min(max, value)));
}
