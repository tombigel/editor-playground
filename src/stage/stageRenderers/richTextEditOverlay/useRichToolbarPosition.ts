import {
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

import {
	clampRichToolbarOffset,
	DEFAULT_RICH_TOOLBAR_OFFSET,
	getRichToolbarViewportPosition,
	persistRichToolbarSessionOffset,
	RICH_TOOLBAR_EDGE_GAP_PX,
	type RichToolbarOffset,
	type RichToolbarPlacement,
	readRichToolbarSessionOffset,
} from "../richToolbarPosition";
import type { ToolbarDragState } from "./types";

export function useRichToolbarPosition({
	rootRef,
	selectionRevision,
}: {
	rootRef: RefObject<HTMLDivElement | null>;
	selectionRevision: number;
}) {
	const toolbarRef = useRef<HTMLDivElement | null>(null);
	const toolbarDragRef = useRef<ToolbarDragState | null>(null);
	const toolbarOffsetDraftRef = useRef<RichToolbarOffset>(
		DEFAULT_RICH_TOOLBAR_OFFSET,
	);
	const [toolbarOffsetDraft, setToolbarOffsetDraft] =
		useState<RichToolbarOffset>(() => readRichToolbarSessionOffset());
	const [toolbarDragging, setToolbarDragging] = useState(false);
	const [toolbarPlacement, setToolbarPlacement] =
		useState<RichToolbarPlacement>("above");
	const [toolbarPosition, setToolbarPosition] = useState({
		top: RICH_TOOLBAR_EDGE_GAP_PX,
		left: RICH_TOOLBAR_EDGE_GAP_PX,
	});
	const [toolbarWidth, setToolbarWidth] = useState(0);
	const [toolbarMaxWidth, setToolbarMaxWidth] = useState(720);
	const [toolbarLayoutRevision, setToolbarLayoutRevision] = useState(0);

	useEffect(() => {
		toolbarOffsetDraftRef.current = toolbarOffsetDraft;
	}, [toolbarOffsetDraft]);

	useEffect(() => {
		let frame = 0;
		function queueToolbarLayoutRefresh() {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				setToolbarLayoutRevision((revision) => revision + 1);
			});
		}

		window.addEventListener("resize", queueToolbarLayoutRefresh);
		window.addEventListener("scroll", queueToolbarLayoutRefresh, true);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("resize", queueToolbarLayoutRefresh);
			window.removeEventListener("scroll", queueToolbarLayoutRefresh, true);
		};
	}, []);

	useEffect(() => {
		if (!toolbarDragging || typeof document === "undefined") {
			return;
		}

		const { cursor, userSelect } = document.body.style;
		document.body.style.cursor = "grabbing";
		document.body.style.userSelect = "none";
		return () => {
			document.body.style.cursor = cursor;
			document.body.style.userSelect = userSelect;
		};
	}, [toolbarDragging]);

	useEffect(() => {
		if (!toolbarDragging) {
			return;
		}

		function finishToolbarDrag(nextOffset: RichToolbarOffset) {
			toolbarDragRef.current = null;
			setToolbarDragging(false);
			setToolbarOffsetDraft(nextOffset);
			persistRichToolbarSessionOffset(nextOffset);
		}

		function handlePointerMove(event: PointerEvent) {
			if (
				!toolbarDragRef.current ||
				event.pointerId !== toolbarDragRef.current.pointerId
			) {
				return;
			}

			event.preventDefault();
			const nextOffset = clampRichToolbarOffset({
				rootRect: toolbarDragRef.current.rootRect,
				panelWidth: toolbarDragRef.current.panelWidth,
				panelHeight: toolbarDragRef.current.panelHeight,
				viewportWidth: window.innerWidth,
				viewportHeight: window.innerHeight,
				horizontalBounds: toolbarDragRef.current.horizontalBounds,
				offset: toolbarDragRef.current.originOffset,
				deltaX: event.clientX - toolbarDragRef.current.originX,
				deltaY: event.clientY - toolbarDragRef.current.originY,
			});
			toolbarOffsetDraftRef.current = nextOffset;
			const nextViewportPosition = getRichToolbarViewportPosition({
				rootRect: toolbarDragRef.current.rootRect,
				panelWidth: toolbarDragRef.current.panelWidth,
				panelHeight: toolbarDragRef.current.panelHeight,
				viewportWidth: window.innerWidth,
				viewportHeight: window.innerHeight,
				horizontalBounds: toolbarDragRef.current.horizontalBounds,
				offset: nextOffset,
			});
			setToolbarPlacement((current) =>
				current === nextViewportPosition.placement
					? current
					: nextViewportPosition.placement,
			);
			setToolbarPosition((current) =>
				current.top === nextViewportPosition.top &&
				current.left === nextViewportPosition.left
					? current
					: { top: nextViewportPosition.top, left: nextViewportPosition.left },
			);
		}

		function handlePointerEnd(event: PointerEvent) {
			if (
				!toolbarDragRef.current ||
				event.pointerId !== toolbarDragRef.current.pointerId
			) {
				return;
			}
			finishToolbarDrag(toolbarOffsetDraftRef.current);
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
	}, [toolbarDragging]);

	useLayoutEffect(() => {
		void selectionRevision;
		void toolbarLayoutRevision;
		void toolbarMaxWidth;
		const root = rootRef.current;
		const toolbar = toolbarRef.current;
		if (!root || !toolbar) {
			return;
		}

		const rootRect = root.getBoundingClientRect();
		const stageRect = root
			.closest<HTMLElement>('[aria-label="Editor stage"]')
			?.getBoundingClientRect();
		const horizontalBounds = stageRect
			? { left: stageRect.left + 8, right: stageRect.right - 8 }
			: null;
		const nextToolbarMaxWidth = Math.max(
			240,
			Math.min(
				window.innerWidth - 32,
				(stageRect?.width ?? window.innerWidth) - 16,
			),
		);
		setToolbarMaxWidth((current) =>
			current === nextToolbarMaxWidth ? current : nextToolbarMaxWidth,
		);
		const toolbarRect = toolbar.getBoundingClientRect();
		const nextViewportPosition = getRichToolbarViewportPosition({
			rootRect,
			panelWidth: toolbarRect.width,
			panelHeight: toolbarRect.height,
			viewportWidth: window.innerWidth,
			viewportHeight: window.innerHeight,
			horizontalBounds,
			offset: toolbarOffsetDraft,
		});

		setToolbarPlacement((current) =>
			current === nextViewportPosition.placement
				? current
				: nextViewportPosition.placement,
		);
		setToolbarPosition((current) =>
			current.top === nextViewportPosition.top &&
			current.left === nextViewportPosition.left
				? current
				: { top: nextViewportPosition.top, left: nextViewportPosition.left },
		);
		setToolbarWidth((current) =>
			current === toolbarRect.width ? current : toolbarRect.width,
		);
	}, [
		rootRef,
		selectionRevision,
		toolbarLayoutRevision,
		toolbarMaxWidth,
		toolbarOffsetDraft,
	]);

	const handleToolbarDragPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLButtonElement>) => {
			if (event.button !== 0 || !rootRef.current || !toolbarRef.current) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			try {
				event.currentTarget.setPointerCapture(event.pointerId);
			} catch {}
			const rootRect = rootRef.current.getBoundingClientRect();
			const stageRect = rootRef.current
				.closest<HTMLElement>('[aria-label="Editor stage"]')
				?.getBoundingClientRect();
			const toolbarRect = toolbarRef.current.getBoundingClientRect();
			toolbarDragRef.current = {
				pointerId: event.pointerId,
				originX: event.clientX,
				originY: event.clientY,
				originOffset: toolbarOffsetDraftRef.current,
				rootRect,
				horizontalBounds: stageRect
					? { left: stageRect.left + 8, right: stageRect.right - 8 }
					: null,
				panelWidth: toolbarRect.width,
				panelHeight: toolbarRect.height,
			};
			setToolbarWidth((current) =>
				current === toolbarRect.width ? current : toolbarRect.width,
			);
			setToolbarDragging(true);
		},
		[rootRef],
	);

	return {
		toolbarRef,
		toolbarDragging,
		toolbarPlacement,
		toolbarPosition,
		toolbarWidth,
		toolbarMaxWidth,
		handleToolbarDragPointerDown,
	};
}
