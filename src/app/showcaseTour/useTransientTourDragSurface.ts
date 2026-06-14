import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
} from "react";

const TOUR_SURFACE_VIEWPORT_MARGIN = 12;
const TOUR_SURFACE_INTERACTIVE_SELECTOR = "button, a, input, textarea, select";

export type TourSurfacePosition = {
	left: number;
	top: number;
};

type TourSurfaceDragState = {
	pointerId: number;
	originX: number;
	originY: number;
	originLeft: number;
	originTop: number;
	surfaceWidth: number;
	surfaceHeight: number;
};

export function useTransientTourDragSurface<TElement extends HTMLElement>() {
	const surfaceRef = useRef<TElement | null>(null);
	const [position, setPosition] = useState<TourSurfacePosition | null>(null);
	const [dragState, setDragState] = useState<TourSurfaceDragState | null>(null);

	// Tour surface positions are deliberately local overlay state. They are not
	// editor panel positions and must disappear when the tour is closed.
	useEffect(() => {
		if (!dragState) return;
		const originalCursor = document.body.style.cursor;
		const originalUserSelect = document.body.style.userSelect;
		document.body.style.cursor = "grabbing";
		document.body.style.userSelect = "none";
		return () => {
			document.body.style.cursor = originalCursor;
			document.body.style.userSelect = originalUserSelect;
		};
	}, [dragState]);

	useEffect(() => {
		if (!dragState) return;
		const currentDragState = dragState;

		function handlePointerMove(event: PointerEvent) {
			if (event.pointerId !== currentDragState.pointerId) return;
			event.preventDefault();
			setPosition({
				left: clampTourSurfacePosition(
					currentDragState.originLeft +
						event.clientX -
						currentDragState.originX,
					currentDragState.surfaceWidth,
					window.innerWidth,
				),
				top: clampTourSurfacePosition(
					currentDragState.originTop + event.clientY - currentDragState.originY,
					currentDragState.surfaceHeight,
					window.innerHeight,
				),
			});
		}

		function handlePointerEnd(event: PointerEvent) {
			if (event.pointerId !== currentDragState.pointerId) return;
			setDragState(null);
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
	}, [dragState]);

	function startDrag(event: ReactPointerEvent<HTMLElement>) {
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			target.closest(TOUR_SURFACE_INTERACTIVE_SELECTOR)
		) {
			return;
		}
		const surface = surfaceRef.current;
		if (!surface) return;
		const rect = surface.getBoundingClientRect();
		event.preventDefault();
		setPosition({ left: rect.left, top: rect.top });
		setDragState({
			pointerId: event.pointerId,
			originX: event.clientX,
			originY: event.clientY,
			originLeft: rect.left,
			originTop: rect.top,
			surfaceWidth: rect.width,
			surfaceHeight: rect.height,
		});
	}

	const style: CSSProperties | undefined = position
		? { left: position.left, top: position.top }
		: undefined;

	return {
		isDragging: Boolean(dragState),
		position,
		setPosition,
		startDrag,
		style,
		surfaceRef,
	};
}

export function clampTourSurfacePosition(
	value: number,
	surfaceSize: number,
	viewportSize: number,
) {
	const max = Math.max(
		TOUR_SURFACE_VIEWPORT_MARGIN,
		viewportSize - surfaceSize - TOUR_SURFACE_VIEWPORT_MARGIN,
	);
	return Math.min(max, Math.max(TOUR_SURFACE_VIEWPORT_MARGIN, value));
}
