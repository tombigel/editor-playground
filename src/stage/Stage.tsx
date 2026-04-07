import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { isSiteNode, isTextNode, type RichContent } from "../model/types";
import { getTopLevelSelectedIds } from "../editor/selection";
import { formatNodeLabel } from "../render/nodePresentation";
import { resolveStickyIsElevated } from "../render/sticky";
import { useStageDragDrop } from "./dragDrop/useStageDragDrop";
import { useStageAnimations } from "./useStageAnimations";
import { StageScene } from "./StageScene";
import { RichEditContext } from "./richEditContext";
import { useRichTextEditMode } from "./useRichTextEditMode";
import {
	areMeasuredNodeSizesEqual,
	computeResizeFrame,
	DEFAULT_STAGE_VIEWPORT,
	didDragPointerMove,
	getResizeCommitSize,
	getResizeStartSizeForNode,
	measureCssViewport,
	measureStageNodeSizes,
	measureStageViewport,
	numericHeight,
	numericWidth,
	px,
	getStructuralResizeMinHeightForNode,
} from "./stageMath";
import {
	DragPreviewOverlay,
	SnapGuideOverlay,
} from "./stageRenderers/dragOverlay";
import {
	getContainerResizeHandles,
	isStructuralTopLevelWrapper,
} from "./stageRenderers/containerRenderer";
import type {
	MeasuredNodeSizes,
	ResizeHandle,
	ResizeState,
	StageProps,
} from "./types";

export type { StageProps } from "./types";

type MarqueeState = {
	clickedId: string | null;
	mode: "replace" | "toggle";
	startClientX: number;
	startClientY: number;
	currentClientX: number;
	currentClientY: number;
	active: boolean;
};

type MultiSelectionBounds = {
	left: number;
	top: number;
	width: number;
	height: number;
};

type SingleSelectionOverlay = NonNullable<
	import("./types").StageSceneProps["singleSelectionOverlay"]
>;

export function Stage({
	document,
	selectedId,
	selectedIds = selectedId ? [selectedId] : [],
	activePageId,
	previewSticky,
	animationPreview,
	spacerVisibility,
	showGridLanes,
	snapSettings,
	onStageFocus,
	onSelect,
	onSelectMany = () => {},
	onClearSelection = () => {},
	onMove,
	onMoveSelection,
	onReparent,
	onReparentSelection,
	onResize,
	onResizeStart,
	onResizeEnd,
	onStickyGeometryChange,
	onUpdateRichContent,
	onRegisterActivateRichEdit,
	followLinkPopup,
}: StageProps) {
	const stageRef = useRef<HTMLDivElement | null>(null);
	const [stageElement, setStageElement] = useState<HTMLDivElement | null>(null);
	const [measuredNodeSizes, setMeasuredNodeSizes] = useState<MeasuredNodeSizes>(
		{},
	);
	const [viewport, setViewport] = useState(DEFAULT_STAGE_VIEWPORT);
	const [resizeState, setResizeState] = useState<ResizeState>(null);
	const [marqueeState, setMarqueeState] = useState<MarqueeState | null>(null);
	const [singleSelectionOverlay, setSingleSelectionOverlay] =
		useState<SingleSelectionOverlay | null>(null);
	const [multiSelectionBounds, setMultiSelectionBounds] =
		useState<MultiSelectionBounds | null>(null);
	const lastGeometryRef = useRef<{
		nodeSizes: MeasuredNodeSizes;
		viewportWidth: number;
		viewportHeight: number;
	} | null>(null);

	const defaultAnimationPreview = { enabled: false, mode: 'passive' as const, triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true } };
	useStageAnimations(document, animationPreview ?? defaultAnimationPreview);

	const handleRichCommit = useCallback(
		(id: string, content: RichContent) => {
			onUpdateRichContent?.(id, content);
		},
		[onUpdateRichContent],
	);
	const { editingId, activateEdit, commitEdit, discardEdit } = useRichTextEditMode({
		onCommit: handleRichCommit,
	});

	useEffect(() => {
		onRegisterActivateRichEdit?.(activateEdit);
	}, [activateEdit, onRegisterActivateRichEdit]);

	function handleStageRef(node: HTMLDivElement | null) {
		stageRef.current = node;
		setStageElement(node);
	}

	const dragDrop = useStageDragDrop({
		document,
		selectedIds,
		snapSettings,
		stageElement,
		onSelect,
		onMove,
		onMoveSelection,
		onReparent,
		onReparentSelection,
	});

	useLayoutEffect(() => {
		const root = stageRef.current;
		if (!root) {
			return;
		}

		const next = measureStageNodeSizes(root, document);
		const nextViewport = measureStageViewport(root) ?? DEFAULT_STAGE_VIEWPORT;
		setMeasuredNodeSizes((current) =>
			areMeasuredNodeSizesEqual(current, next) ? current : next,
		);
		setViewport((current) =>
			Math.abs(current.width - nextViewport.width) < 0.5 &&
			Math.abs(current.height - nextViewport.height) < 0.5
				? current
				: nextViewport,
		);

		// Only propagate geometry when sizes or viewport actually changed.
		// Without this guard, every document change (including position-only
		// moves) creates a new object reference that triggers a full App
		// re-render cascade through stickyLayout recomputation.
		const prev = lastGeometryRef.current;
		const sizesChanged =
			!prev || !areMeasuredNodeSizesEqual(prev.nodeSizes, next);
		const viewportChanged =
			!prev ||
			Math.abs(prev.viewportWidth - nextViewport.width) > 0.5 ||
			Math.abs(prev.viewportHeight - nextViewport.height) > 0.5;
		if (sizesChanged || viewportChanged) {
			const geometry = {
				nodeSizes: next,
				viewportWidth: nextViewport.width,
				viewportHeight: nextViewport.height,
			};
			lastGeometryRef.current = geometry;
			onStickyGeometryChange?.(geometry);
		}
	}, [document, onStickyGeometryChange]);

	useLayoutEffect(() => {
		if (selectedIds.length !== 1 || !selectedId || dragDrop.isDragging) {
			setSingleSelectionOverlay(null);
			return;
		}

		const root = stageRef.current;
		if (!root) {
			setSingleSelectionOverlay(null);
			return;
		}

		const frameElement = root.querySelector<HTMLElement>(".stage-frame");
		const nodeElement = root.querySelector<HTMLElement>(`#stage-node-${selectedId}`);
		const node = document.nodes[selectedId];
		if (!frameElement || !nodeElement || !node || node.contentType === "site") {
			setSingleSelectionOverlay(null);
			return;
		}

		const frameRect = frameElement.getBoundingClientRect();
		const frameOffsetLeft = frameElement.clientLeft;
		const frameOffsetTop = frameElement.clientTop;
		const nodeRect = nodeElement.getBoundingClientRect();
		const isTopLevel = node.parentId === document.rootId;
		const handles =
			node.contentType === "container"
				? getContainerResizeHandles(node, isTopLevel)
				: (["n", "ne", "e", "se", "s", "sw", "w", "nw"] as ResizeHandle[]);

		const siteNode = document.nodes[document.rootId];
		const globalStickyElevation = siteNode?.contentType === 'site' ? (siteNode.stickyElevation ?? true) : true;
		const isSticky = Boolean(node.sticky?.enabled);
		setSingleSelectionOverlay({
			nodeId: node.id,
			label: formatNodeLabel(node),
			isSticky,
			hasAnimation: node.animation !== undefined,
			isElevated: isSticky && node.sticky ? resolveStickyIsElevated(node.sticky, globalStickyElevation) : false,
			bounds: {
				left: nodeRect.left - frameRect.left - frameOffsetLeft,
				top: nodeRect.top - frameRect.top - frameOffsetTop,
				width: nodeRect.width,
				height: nodeRect.height,
			},
			handles,
			wideSouthHandle:
				node.contentType === "container" && isStructuralTopLevelWrapper(node, isTopLevel),
		});
	}, [document, dragDrop.isDragging, selectedId, selectedIds]);

	useLayoutEffect(() => {
		if (selectedIds.length <= 1 || dragDrop.isDragging) {
			setMultiSelectionBounds(null);
			return;
		}

		const root = stageRef.current;
		if (!root) {
			setMultiSelectionBounds(null);
			return;
		}

		const frameElement = root.querySelector<HTMLElement>(".stage-frame");
		if (!frameElement) {
			setMultiSelectionBounds(null);
			return;
		}

		const frameRect = frameElement.getBoundingClientRect();
		const frameOffsetLeft = frameElement.clientLeft;
		const frameOffsetTop = frameElement.clientTop;
		const topLevelSelectedIds = getTopLevelSelectedIds(document, selectedIds);
		const nodeRects = topLevelSelectedIds
			.map(
				(nodeId) =>
					root
						.querySelector<HTMLElement>(`#stage-node-${nodeId}`)
						?.getBoundingClientRect() ?? null,
			)
			.filter((rect): rect is DOMRect => rect !== null);

		if (nodeRects.length <= 1) {
			setMultiSelectionBounds(null);
			return;
		}

		const left =
			Math.min(...nodeRects.map((rect) => rect.left)) - frameRect.left - frameOffsetLeft;
		const top = Math.min(...nodeRects.map((rect) => rect.top)) - frameRect.top - frameOffsetTop;
		const right =
			Math.max(...nodeRects.map((rect) => rect.right)) - frameRect.left - frameOffsetLeft;
		const bottom =
			Math.max(...nodeRects.map((rect) => rect.bottom)) - frameRect.top - frameOffsetTop;
		setMultiSelectionBounds({
			left,
			top,
			width: Math.max(0, right - left),
			height: Math.max(0, bottom - top),
		});
	}, [document, dragDrop.isDragging, selectedIds]);

	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: editor stage needs aria-activedescendant for selection tracking
		<section
			ref={handleStageRef}
			className="stage-shell editor-scrollbar"
			// biome-ignore lint/a11y/noNoninteractiveTabindex: editor stage requires keyboard focus for shortcuts and selection
			tabIndex={0}
			aria-label="Editor stage"
			aria-activedescendant={
				selectedId ? `stage-node-${selectedId}` : undefined
			}
			data-stage-focus-scope="true"
			onFocus={onStageFocus}
			onDoubleClick={(event) => {
				const target = event.target as HTMLElement;
				const nodeElement = target.closest<HTMLElement>("[data-node-id]");
				const nodeId = nodeElement?.dataset.nodeId;
				const node = nodeId ? document.nodes[nodeId] : null;
				if (node && isTextNode(node) && node.subtype === 'rich') {
					event.stopPropagation();
					activateEdit(node.id);
				}
			}}
			onDragStartCapture={(event) => {
				event.preventDefault();
			}}
			onDragOverCapture={(event) => {
				event.preventDefault();
			}}
			onDropCapture={(event) => {
				event.preventDefault();
			}}
			onPointerDown={(event) => {
				const target = event.target as HTMLElement;
				if (target.closest('[data-stage-resize-handle="true"]')) {
					return;
				}

				const mode: "replace" | "toggle" =
					event.metaKey || event.ctrlKey || event.shiftKey
						? "toggle"
						: "replace";
				const nodeElement = target.closest<HTMLElement>("[data-node-id]");
				const nodeId = nodeElement?.dataset.nodeId;
				const node = nodeId ? document.nodes[nodeId] : null;

				if (
					node &&
					node.contentType === "container" &&
					node.parentId === document.rootId &&
					(node.subtype === "section" ||
						node.subtype === "header" ||
						node.subtype === "footer")
				) {
					setMarqueeState({
						clickedId: node.id,
						mode,
						startClientX: event.clientX,
						startClientY: event.clientY,
						currentClientX: event.clientX,
						currentClientY: event.clientY,
						active: false,
					});
					return;
				}

				if (nodeElement && nodeId && node && node.contentType !== "site") {
					setMarqueeState(null);
					dragDrop.handleNodePointerDown(event);
					return;
				}

				setMarqueeState({
					clickedId: null,
					mode,
					startClientX: event.clientX,
					startClientY: event.clientY,
					currentClientX: event.clientX,
					currentClientY: event.clientY,
					active: false,
				});
			}}
			onPointerMove={(event) => {
				dragDrop.handlePointerMove(event);
				if (marqueeState) {
					setMarqueeState({
						...marqueeState,
						currentClientX: event.clientX,
						currentClientY: event.clientY,
						active:
							marqueeState.active ||
							didDragPointerMove(marqueeState, event.clientX, event.clientY),
					});
				}

				if (resizeState) {
					const frame = computeResizeFrame(
						resizeState,
						event.clientX,
						event.clientY,
						event.shiftKey,
					);
					const nextWidth = Math.round(frame.width);
					const nextHeight = Math.round(frame.height);
					const nextX = Math.round(frame.x);
					const nextY = Math.round(frame.y);
					const originX = Math.round(resizeState.originX);
					const originY = Math.round(resizeState.originY);
					const resizedNode = document.nodes[resizeState.nodeId];
					if (resizedNode && !isSiteNode(resizedNode)) {
						const cssViewport = measureCssViewport(stageRef.current, viewport);
						const commit = getResizeCommitSize(
							resizedNode,
							resizeState,
							nextWidth,
							nextHeight,
							document,
							measuredNodeSizes,
							cssViewport,
						);
						onResize(resizeState.nodeId, commit.width, commit.height);
					}
					if (nextX !== originX || nextY !== originY) {
						onMove(resizeState.nodeId, px(nextX), px(nextY));
					}
				}
			}}
			onPointerUp={(event) => {
				dragDrop.handlePointerUp(event);
				if (marqueeState) {
					if (marqueeState.active) {
						onSelectMany(
							collectMarqueeSelectionIds(
								stageRef.current,
								document,
								marqueeState,
							),
							marqueeState.mode,
						);
					} else if (marqueeState.clickedId) {
						onSelect(marqueeState.clickedId, marqueeState.mode);
					} else if (marqueeState.mode === "replace") {
						onClearSelection();
					}
				}

				if (resizeState) {
					onResizeEnd(resizeState.nodeId);
				}
				setMarqueeState(null);
				setResizeState(null);
			}}
			onPointerCancel={(event) => {
				dragDrop.handlePointerCancel(event);
				if (resizeState) {
					onResizeEnd(resizeState.nodeId);
				}
				setMarqueeState(null);
				setResizeState(null);
			}}
			onLostPointerCapture={dragDrop.handleLostPointerCapture}
		>
			<p className="sr-only">
				Tab selects components in stage order. Arrow keys move the selected
				component by 1 pixel. Shift plus arrow keys move by 10 pixels.
			</p>
			<RichEditContext.Provider value={{ editingId, activateEdit, commitEdit, discardEdit }}>
			<StageScene
				document={document}
				selectedId={selectedId}
				selectedIds={selectedIds}
				activePageId={activePageId}
				singleSelectionOverlay={singleSelectionOverlay}
				multiSelectionBounds={multiSelectionBounds}
				previewSticky={previewSticky}
				animationPreview={animationPreview}
				spacerVisibility={spacerVisibility}
				showGridLanes={showGridLanes}
				onResizeStart={onResizeStart}
				dragSourceIds={dragDrop.dragSourceIds}
				highlightedDropId={dragDrop.highlightedDropId}
				registerDraggableNode={dragDrop.registerDraggableNode}
				registerDropTarget={dragDrop.registerDropTarget}
				resizeState={resizeState}
				setResizeState={setResizeState}
				onSelectionOverlayHandleMouseDown={(handle, event) => {
					const overlay = singleSelectionOverlay;
					if (!overlay) {
						return;
					}

					event.stopPropagation();
					onResizeStart(overlay.nodeId);

					const node = document.nodes[overlay.nodeId];
					const nodeElement = stageRef.current?.querySelector<HTMLElement>(
						`#stage-node-${overlay.nodeId}`,
					) ?? null;
					if (!node || node.contentType === "site") {
						return;
					}

					const fallbackWidth = numericWidth(node.rect.width.base.raw);
					const fallbackHeight = numericHeight(node.rect.height.base.raw);
					const startSize = getResizeStartSizeForNode(
						nodeElement,
						fallbackWidth,
						fallbackHeight,
					);
					setResizeState({
						nodeId: overlay.nodeId,
						handle,
						startClientX: event.clientX,
						startClientY: event.clientY,
						originWidth: startSize.width,
						originHeight: startSize.height,
						originX: parseFloat(node.rect.x.base.raw) || 0,
						originY: parseFloat(node.rect.y.base.raw) || 0,
						minHeight:
							node.contentType === "container" &&
							isStructuralTopLevelWrapper(node, node.parentId === document.rootId)
								? getStructuralResizeMinHeightForNode(nodeElement, startSize.height)
								: undefined,
					});
				}}
				measuredNodeSizes={measuredNodeSizes}
				viewport={viewport}
				followLinkPopup={followLinkPopup}
			/>
			{dragDrop.dragPresentation ? (
				<SnapGuideOverlay
					guideX={dragDrop.dragPresentation.guideX}
					guideY={dragDrop.dragPresentation.guideY}
				/>
			) : null}
			{dragDrop.dragPresentation ? (
				<DragPreviewOverlay
					document={document}
					previewItems={dragDrop.dragPresentation.previewItems}
					previewLeft={dragDrop.dragPresentation.previewLeft}
					previewTop={dragDrop.dragPresentation.previewTop}
				/>
			) : null}
			{marqueeState?.active ? (
				<MarqueeSelectionBox
					stageElement={stageElement}
					marqueeState={marqueeState}
				/>
			) : null}
			</RichEditContext.Provider>
		</section>
	);
}

function collectMarqueeSelectionIds(
	stageElement: HTMLDivElement | null,
	documentModel: StageProps["document"],
	marqueeState: MarqueeState,
) {
	if (!stageElement) {
		return [];
	}

	const marqueeRect = getMarqueeClientRect(marqueeState);
	// Only select direct children of the marquee'd section, not deeply
	// nested descendants.  Selecting both a container and its children
	// creates confusing multi-selection states and broken multi-drag.
	const marqueeParentId = marqueeState.clickedId;
	return Array.from(
		stageElement.querySelectorAll<HTMLElement>(".stage-canvas [data-node-id]"),
	)
		.map((element) => {
			const nodeId = element.dataset.nodeId;
			if (!nodeId) {
				return null;
			}
			const node = documentModel.nodes[nodeId];
			if (!node || node.contentType === "site") {
				return null;
			}
			if (marqueeParentId && node.parentId !== marqueeParentId) {
				return null;
			}
			const rect = element.getBoundingClientRect();
			if (!rect.width || !rect.height || !rectsIntersect(rect, marqueeRect)) {
				return null;
			}
			return nodeId;
		})
		.filter((nodeId): nodeId is string => Boolean(nodeId));
}

function rectsIntersect(
	left: DOMRect,
	right: { left: number; top: number; width: number; height: number },
) {
	return !(
		left.right < right.left ||
		left.left > right.left + right.width ||
		left.bottom < right.top ||
		left.top > right.top + right.height
	);
}

function getMarqueeClientRect(marqueeState: MarqueeState) {
	const left = Math.min(marqueeState.startClientX, marqueeState.currentClientX);
	const top = Math.min(marqueeState.startClientY, marqueeState.currentClientY);
	return {
		left,
		top,
		width: Math.abs(marqueeState.currentClientX - marqueeState.startClientX),
		height: Math.abs(marqueeState.currentClientY - marqueeState.startClientY),
	};
}

function MarqueeSelectionBox({
	stageElement,
	marqueeState,
}: {
	stageElement: HTMLDivElement | null;
	marqueeState: MarqueeState;
}) {
	if (!stageElement) {
		return null;
	}

	const stageRect = stageElement.getBoundingClientRect();
	const clientRect = getMarqueeClientRect(marqueeState);

	return (
		<div
			className="stage-marquee-selection"
			style={{
				left: clientRect.left - stageRect.left + stageElement.scrollLeft,
				top: clientRect.top - stageRect.top + stageElement.scrollTop,
				width: clientRect.width,
				height: clientRect.height,
			}}
		/>
	);
}
