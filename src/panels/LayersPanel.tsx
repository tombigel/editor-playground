import { Layers3 } from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	type Ref,
} from "react";
import type { DocumentModel, NodeId } from "../api/documentViewApi";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import { NoticeSurface } from "@/components/ui/settings-panel";
import { EditorPanelHeader } from "./EditorPanelHeader";
import type { PageId, TopLevelWrapperVisibilityMode } from "@/api/editorApi";
import { LayersDragGhost } from "./LayersDragGhost";
import { LayersTreeRowItem } from "./LayersPanelRow";
import type { ActiveDropTarget } from "./LayersPanel.types";
import {
	buildLayersTreeRows,
	getAutoExpandedLayerIds,
	getDefaultExpandedLayerIds,
	isLayersNodeDraggable,
	resolveLayersDropPosition,
	resolveLayersDropTarget,
	resolveProjectedLayersRole,
	type LayersDropPosition,
	type LayersTreeRow,
} from "./layersTree";

type LayersPanelProps = {
	open: boolean;
	position: { top: number; left: number };
	onPositionChange: (position: { top: number; left: number }) => void;
	panelRef?: Ref<HTMLDivElement>;
	document: DocumentModel;
	activePageId: PageId | null;
	selectedIds: NodeId[];
	onOpenChange: (open: boolean) => void;
	onClose: () => void;
	onSelectNode: (id: NodeId, mode: "replace" | "toggle") => void;
	onRenameNode: (id: NodeId, value: string) => void;
	onDeleteNode: (id: NodeId) => void;
	onSetNodeVisibility: (id: NodeId, value: boolean) => void;
	onSetTopLevelWrapperVisibility: (
		pageId: PageId,
		nodeId: NodeId,
		visibility: TopLevelWrapperVisibilityMode,
		pageIds?: PageId[],
	) => void;
	onMoveNodeInTree: (
		id: NodeId,
		targetParentId: NodeId,
		targetIndex: number,
	) => void;
};

type LayersPanelContentProps = Omit<
	LayersPanelProps,
	| "open"
	| "position"
	| "onPositionChange"
	| "panelRef"
	| "onOpenChange"
	| "onClose"
>;

type DragState = {
	pointerId: number;
	nodeId: NodeId;
	originX: number;
	originY: number;
	currentX: number;
	currentY: number;
	active: boolean;
	hoverRowId: NodeId | null;
	hoverPosition: LayersDropPosition | null;
	invalidDrop: boolean;
	dropTarget: ActiveDropTarget | null;
};

const PANEL_VIEWPORT_MARGIN_PX = 16;

type PanelDragState = {
	pointerId: number;
	originX: number;
	originY: number;
	originTop: number;
	originLeft: number;
};

export function LayersPanel({
	open,
	position,
	onPositionChange,
	panelRef,
	onOpenChange,
	onClose,
	...contentProps
}: LayersPanelProps) {
	const surfaceRef = useRef<HTMLDivElement | null>(null);
	const [panelDragState, setPanelDragState] = useState<PanelDragState | null>(
		null,
	);

	useEffect(() => {
		if (!panelDragState) {
			return;
		}

		const { cursor, userSelect } = document.body.style;
		document.body.style.cursor = "grabbing";
		document.body.style.userSelect = "none";

		return () => {
			document.body.style.cursor = cursor;
			document.body.style.userSelect = userSelect;
		};
	}, [panelDragState]);

	useEffect(() => {
		if (!panelDragState) {
			return;
		}
		const currentPanelDrag = panelDragState;

		function handlePointerMove(event: PointerEvent) {
			if (event.pointerId !== currentPanelDrag.pointerId) {
				return;
			}

			event.preventDefault();
			const rect = surfaceRef.current?.getBoundingClientRect();
			const panelWidth = rect?.width ?? 320;
			const panelHeight = rect?.height ?? 420;
			const nextLeft = clampToViewport(
				currentPanelDrag.originLeft +
					(event.clientX - currentPanelDrag.originX),
				panelWidth,
				window.innerWidth,
			);
			const nextTop = clampToViewport(
				currentPanelDrag.originTop + (event.clientY - currentPanelDrag.originY),
				panelHeight,
				window.innerHeight,
			);
			onPositionChange({ top: nextTop, left: nextLeft });
		}

		function handlePointerEnd(event: PointerEvent) {
			if (event.pointerId !== currentPanelDrag.pointerId) {
				return;
			}
			setPanelDragState(null);
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
	}, [onPositionChange, panelDragState]);

	function setCombinedRef(node: HTMLDivElement | null) {
		surfaceRef.current = node;
		if (typeof panelRef === "function") {
			panelRef(node);
		} else if (panelRef) {
			panelRef.current = node;
		}
	}

	function handleHeaderPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		const target = event.target as HTMLElement | null;
		if (
			event.button !== 0 ||
			!target ||
			target.closest(
				'button, input, textarea, select, [data-prevent-panel-drag="true"]',
			)
		) {
			return;
		}

		event.preventDefault();
		setPanelDragState({
			pointerId: event.pointerId,
			originX: event.clientX,
			originY: event.clientY,
			originTop: position.top,
			originLeft: position.left,
		});
	}

	return (
		<FloatingPanelShell
			ref={setCombinedRef}
			open={open}
			onOpenChange={onOpenChange}
			className="editor-layers-panel w-[320px]"
			style={{
				top: `${position.top}px`,
				left: `${position.left}px`,
			}}
			header={
				<div
					className="editor-panel-drag-zone"
					onPointerDown={handleHeaderPointerDown}
				>
					<EditorPanelHeader
						icon={Layers3}
						title="Components"
						description="Structure, visibility, and order."
						closeLabel="Close components panel"
						onClose={onClose}
						className="cursor-grab px-3 py-2.5 active:cursor-grabbing"
					/>
				</div>
			}
			bodyClassName="contents"
		>
			<LayersPanelContent {...contentProps} />
		</FloatingPanelShell>
	);
}

export function LayersPanelContent({
	document,
	activePageId,
	selectedIds,
	onSelectNode,
	onRenameNode,
	onDeleteNode,
	onSetNodeVisibility,
	onSetTopLevelWrapperVisibility,
	onMoveNodeInTree,
}: LayersPanelContentProps) {
	const [expandedIds, setExpandedIds] = useState<Set<NodeId>>(
		() => new Set(getDefaultExpandedLayerIds(document)),
	);
	const [editingId, setEditingId] = useState<NodeId | null>(null);
	const [dragState, setDragState] = useState<DragState | null>(null);
	const activeDragPointerId = dragState?.pointerId ?? null;
	const dragStateRef = useRef<DragState | null>(null);
	const rowElementsRef = useRef(new Map<NodeId, HTMLDivElement>());
	const dragJustEndedRef = useRef(false);

	const updateDragState = useCallback(
		(
			nextState:
				| DragState
				| null
				| ((current: DragState | null) => DragState | null),
		) => {
			setDragState((current) => {
				const resolved =
					typeof nextState === "function" ? nextState(current) : nextState;
				dragStateRef.current = resolved;
				return resolved;
			});
		},
		[],
	);

	useEffect(() => {
		setExpandedIds((current) => {
			const next = new Set(current);
			let changed = false;

			for (const nodeId of getDefaultExpandedLayerIds(document)) {
				if (!next.has(nodeId)) {
					next.add(nodeId);
					changed = true;
				}
			}

			for (const nodeId of getAutoExpandedLayerIds(document, selectedIds)) {
				if (!next.has(nodeId)) {
					next.add(nodeId);
					changed = true;
				}
			}

			return changed ? next : current;
		});
	}, [document, selectedIds]);

	const rows = useMemo(
		() => buildLayersTreeRows(document, selectedIds, expandedIds),
		[document, expandedIds, selectedIds],
	);
	const documentRef = useRef(document);
	const rowsRef = useRef(rows);
	const onMoveNodeInTreeRef = useRef(onMoveNodeInTree);
	const draggedRow = dragState
		? (rows.find((row) => row.id === dragState.nodeId) ?? null)
		: null;
	const projectedRoleLabel =
		dragState?.active && dragState.dropTarget
			? resolveProjectedLayersRole(
					document,
					dragState.nodeId,
					dragState.dropTarget.targetParentId,
					dragState.dropTarget.targetIndex,
				)
			: null;

	useEffect(() => {
		dragStateRef.current = dragState;
	}, [dragState]);

	useEffect(() => {
		documentRef.current = document;
		rowsRef.current = rows;
		onMoveNodeInTreeRef.current = onMoveNodeInTree;
	}, [document, onMoveNodeInTree, rows]);

	useEffect(() => {
		if (!editingId || document.nodes[editingId]) {
			return;
		}

		setEditingId(null);
	}, [document.nodes, editingId]);

	useEffect(() => {
		if (!dragState?.active) {
			return;
		}

		const { cursor, userSelect } = window.document.body.style;
		window.document.body.style.cursor = "grabbing";
		window.document.body.style.userSelect = "none";

		return () => {
			window.document.body.style.cursor = cursor;
			window.document.body.style.userSelect = userSelect;
		};
	}, [dragState?.active]);

	useEffect(() => {
		if (activeDragPointerId == null) {
			return;
		}
		const pointerId = activeDragPointerId;

		function clearDragState(didDrag: boolean) {
			updateDragState(null);
			if (!didDrag) {
				return;
			}

			dragJustEndedRef.current = true;
			window.setTimeout(() => {
				dragJustEndedRef.current = false;
			}, 0);
		}

		function handlePointerMove(event: PointerEvent) {
			if (event.pointerId !== pointerId) {
				return;
			}

			const currentDrag = dragStateRef.current;
			if (!currentDrag) {
				return;
			}

			const deltaX = event.clientX - currentDrag.originX;
			const deltaY = event.clientY - currentDrag.originY;
			const shouldActivate =
				currentDrag.active || Math.hypot(deltaX, deltaY) >= 5;
			if (!shouldActivate) {
				return;
			}

			event.preventDefault();
			const hoveredRow = rowsRef.current.find((row) => {
				const element = rowElementsRef.current.get(row.id);
				if (!element) {
					return false;
				}
				const rect = element.getBoundingClientRect();
				return event.clientY >= rect.top && event.clientY <= rect.bottom;
			});

			if (!hoveredRow) {
				updateDragState((current) =>
					current == null
						? null
						: {
								...current,
								currentX: event.clientX,
								currentY: event.clientY,
								active: true,
								hoverRowId: null,
								hoverPosition: null,
								invalidDrop: false,
								dropTarget: null,
							},
				);
				return;
			}

			const hoveredElement = rowElementsRef.current.get(hoveredRow.id);
			if (!hoveredElement) {
				return;
			}

			const rect = hoveredElement.getBoundingClientRect();
			const position = resolveLayersDropPosition(
				rect.height,
				event.clientY - rect.top,
				hoveredRow.node.contentType === "container",
			);
			const nextTarget = resolveLayersDropTarget(
				documentRef.current,
				currentDrag.nodeId,
				hoveredRow.id,
				position,
			);

			updateDragState((current) =>
				current == null
					? null
					: {
							...current,
							currentX: event.clientX,
							currentY: event.clientY,
							active: true,
							hoverRowId: hoveredRow.id,
							hoverPosition: position,
							invalidDrop: nextTarget == null,
							dropTarget: nextTarget
								? {
										rowId: hoveredRow.id,
										position,
										targetParentId: nextTarget.targetParentId,
										targetIndex: nextTarget.targetIndex,
									}
								: null,
						},
			);
		}

		function handlePointerEnd(event: PointerEvent) {
			if (event.pointerId !== pointerId) {
				return;
			}

			const currentDrag = dragStateRef.current;
			if (currentDrag?.active && currentDrag.dropTarget) {
				onMoveNodeInTreeRef.current(
					currentDrag.nodeId,
					currentDrag.dropTarget.targetParentId,
					currentDrag.dropTarget.targetIndex,
				);
			}

			clearDragState(Boolean(currentDrag?.active));
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
	}, [activeDragPointerId, updateDragState]);

	function handleToggleExpanded(nodeId: NodeId) {
		setExpandedIds((current) => {
			const next = new Set(current);
			if (next.has(nodeId)) {
				next.delete(nodeId);
			} else {
				next.add(nodeId);
			}
			return next;
		});
	}

	function setRowRef(nodeId: NodeId, element: HTMLDivElement | null) {
		if (element) {
			rowElementsRef.current.set(nodeId, element);
			return;
		}
		rowElementsRef.current.delete(nodeId);
	}

	function handleRowPointerDown(
		event: ReactPointerEvent<HTMLDivElement>,
		row: LayersTreeRow,
	) {
		if (event.button !== 0 || !isLayersNodeDraggable(row.node)) {
			return;
		}

		event.preventDefault();
		setEditingId(null);
		updateDragState({
			pointerId: event.pointerId,
			nodeId: row.id,
			originX: event.clientX,
			originY: event.clientY,
			currentX: event.clientX,
			currentY: event.clientY,
			active: false,
			hoverRowId: null,
			hoverPosition: null,
			invalidDrop: false,
			dropTarget: null,
		});
	}

	function handleRowClick(
		event: ReactMouseEvent<HTMLDivElement>,
		rowId: NodeId,
	) {
		if (dragJustEndedRef.current) {
			event.preventDefault();
			return;
		}

		const mode =
			event.metaKey || event.ctrlKey || event.shiftKey ? "toggle" : "replace";
		onSelectNode(rowId, mode);
	}

	return (
		<>
			<div className="editor-scrollbar editor-scrollbar-gutter max-h-[64vh] overflow-y-auto p-1.5">
				{rows.length === 0 ? (
					<NoticeSurface
						tone="info"
						className="border-dashed py-8 text-center text-sm"
					>
						Nothing on stage yet.
					</NoticeSurface>
				) : (
					<div className="flex flex-col gap-1">
						{rows.map((row) => (
							<LayersTreeRowItem
								key={row.id}
								row={row}
								dragging={dragState?.nodeId === row.id && dragState.active}
								dropTarget={
									dragState?.dropTarget?.rowId === row.id
										? dragState.dropTarget
										: null
								}
								invalidDrop={
									dragState?.active &&
									dragState.invalidDrop &&
									dragState.hoverRowId === row.id
										? dragState.hoverPosition
										: null
								}
								onToggleExpanded={handleToggleExpanded}
								onPointerDown={handleRowPointerDown}
								onClick={handleRowClick}
								onRenameNode={onRenameNode}
								onDeleteNode={onDeleteNode}
								onSetNodeVisibility={onSetNodeVisibility}
								onSetTopLevelWrapperVisibility={onSetTopLevelWrapperVisibility}
								onRefChange={setRowRef}
								document={document}
								activePageId={activePageId}
								editing={editingId === row.id}
								projectedTypeLabel={
									dragState?.active &&
									dragState.nodeId === row.id &&
									projectedRoleLabel !== row.typeLabel
										? projectedRoleLabel
										: null
								}
								onStartEditing={(id) => setEditingId(id)}
								onStopEditing={() => setEditingId(null)}
							/>
						))}
					</div>
				)}
			</div>
			{dragState?.active && draggedRow ? (
				<LayersDragGhost
					row={draggedRow}
					clientX={dragState.currentX}
					clientY={dragState.currentY}
					projectedTypeLabel={
						projectedRoleLabel !== draggedRow.typeLabel
							? projectedRoleLabel
							: null
					}
				/>
			) : null}
		</>
	);
}

function clampToViewport(value: number, size: number, viewportSize: number) {
	return Math.round(
		Math.max(
			PANEL_VIEWPORT_MARGIN_PX,
			Math.min(viewportSize - size - PANEL_VIEWPORT_MARGIN_PX, value),
		),
	);
}
