import {
	Ban,
	Rocket,
	ChevronDown,
	ChevronRight,
	Eye,
	EyeOff,
	Layers2,
	Layers3,
	PencilLine,
	Pin,
	type LucideIcon,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	type Ref,
} from "react";
import type { DocumentModel, NodeId } from "../model/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PopoverSurface, PopoverTooltip } from "@/components/ui/popover";
import { EditorPanelHeader } from "./EditorPanelHeader";
import { resolveSidebarTitleCommit } from "./EditorSidebar";
import { TreeDragGhost } from "./TreeDragGhost";
import { getLayersNodeIcon } from "./layersIcons";
import {
	getTopLevelWrapperVisibilityState,
	type PageId,
	type TopLevelWrapperVisibilityMode,
} from "@/api/editorApi";
import { TopLevelWrapperVisibilityControl } from "./controls/TopLevelWrapperVisibilityControl";
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

const INSPECTOR_TOOLTIP_CLASS_NAME =
	"editor-tooltip-panel max-w-[16rem] rounded-lg border px-3 py-2 text-xs font-normal leading-5";

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

type ActiveDropTarget = {
	rowId: NodeId;
	position: LayersDropPosition;
	targetParentId: NodeId;
	targetIndex: number;
};

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

const ROW_INDENT_PX = 8;
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
		<PopoverSurface
			ref={setCombinedRef}
			open={open}
			onOpenChange={onOpenChange}
			className="editor-floating-panel editor-layers-panel editor-bg-surface editor-border-subtle fixed w-[320px] rounded-xl border shadow-[0_16px_34px_rgba(18,32,51,0.18)]"
			style={{
				top: `${position.top}px`,
				left: `${position.left}px`,
			}}
		>
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
			<LayersPanelContent {...contentProps} />
		</PopoverSurface>
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
		if (!dragState) {
			return;
		}
		dragStateRef.current = dragState;
		const pointerId = dragState.pointerId;

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
			const hoveredRow = rows.find((row) => {
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
				hoveredRow.node.type === "wrapper",
			);
			const nextTarget = resolveLayersDropTarget(
				document,
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
				onMoveNodeInTree(
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
	}, [document, dragState, onMoveNodeInTree, rows, updateDragState]);

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
			<div className="editor-scrollbar max-h-[64vh] overflow-y-auto p-1.5">
						{rows.length === 0 ? (
							<div className="editor-layers-empty editor-text-muted rounded-lg border border-dashed px-3 py-8 text-center text-sm">
								Nothing on stage yet.
							</div>
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

function LayersTreeRowItem({
	row,
	dragging,
	dropTarget,
	invalidDrop,
	onToggleExpanded,
	onPointerDown,
	onClick,
	onRenameNode,
	onSetNodeVisibility,
	onSetTopLevelWrapperVisibility,
	onRefChange,
	document,
	activePageId,
	editing,
	projectedTypeLabel,
	onStartEditing,
	onStopEditing,
}: {
	row: LayersTreeRow;
	dragging: boolean;
	dropTarget: ActiveDropTarget | null;
	invalidDrop: LayersDropPosition | null;
	onToggleExpanded: (nodeId: NodeId) => void;
	onPointerDown: (
		event: ReactPointerEvent<HTMLDivElement>,
		row: LayersTreeRow,
	) => void;
	onClick: (event: ReactMouseEvent<HTMLDivElement>, rowId: NodeId) => void;
	onRenameNode: (nodeId: NodeId, value: string) => void;
	onDeleteNode: (nodeId: NodeId) => void;
	onSetNodeVisibility: (nodeId: NodeId, value: boolean) => void;
	onSetTopLevelWrapperVisibility: (
		pageId: PageId,
		nodeId: NodeId,
		visibility: TopLevelWrapperVisibilityMode,
		pageIds?: PageId[],
	) => void;
	onRefChange: (nodeId: NodeId, element: HTMLDivElement | null) => void;
	document: DocumentModel;
	activePageId: PageId | null;
	editing: boolean;
	projectedTypeLabel: string | null;
	onStartEditing: (nodeId: NodeId) => void;
	onStopEditing: () => void;
}) {
	const NodeIcon = getLayersNodeIcon(row.node);
	const DisclosureIcon: LucideIcon = row.isExpanded
		? ChevronDown
		: ChevronRight;

	return (
		<>
			{row.dividerBefore ? (
				<div aria-hidden="true" className="editor-layers-divider" />
			) : null}
			<div
				ref={(element) => onRefChange(row.id, element)}
				className="editor-layers-row group"
				data-selected={row.isSelected ? "true" : "false"}
				data-hidden={row.node.visible ? "false" : "true"}
				data-dragging={dragging ? "true" : "false"}
				data-drop-intent={dropTarget?.position}
				data-invalid-drop={invalidDrop ? "true" : "false"}
				data-layers-row-id={row.id}
				style={{
					paddingLeft: `${8 + row.depth * ROW_INDENT_PX}px`,
				}}
				role="option"
				aria-selected={row.isSelected}
				tabIndex={0}
				onClick={(event) => {
					const target = event.target as HTMLElement | null;
					if (
						target?.closest(
							'[data-layers-control="true"], [data-layers-title-editor="true"]',
						)
					) {
						return;
					}
					onClick(event, row.id);
				}}
				onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
					if (event.key === "Enter" || event.key === " ") {
						onClick(
							event as unknown as ReactMouseEvent<HTMLDivElement>,
							row.id,
						);
					}
				}}
			>
				{row.hasChildren ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="editor-layers-disclosure h-5 w-5 rounded-md"
						data-layers-control="true"
						aria-label={
							row.isExpanded
								? `Collapse ${row.displayName}`
								: `Expand ${row.displayName}`
						}
						onClick={(event) => {
							event.stopPropagation();
							onToggleExpanded(row.id);
						}}
					>
						<DisclosureIcon className="h-3.5 w-3.5" />
					</Button>
				) : (
					<span aria-hidden="true" className="block h-5 w-5 shrink-0" />
				)}

				<div
					className="editor-layers-row-main min-w-0 flex-1"
					onPointerDown={(event) => {
						const target = event.target as HTMLElement | null;
						if (
							target?.closest(
								'[data-layers-control="true"], [data-layers-title-editor="true"]',
							)
						) {
							return;
						}
						onPointerDown(event, row);
					}}
				>
					<span className="editor-layers-row-icon">
						<NodeIcon className="h-3.5 w-3.5" />
					</span>
					<span className="min-w-0 flex-1">
						{editing ? (
							<span className="block min-w-0" data-layers-title-editor="true">
								<LayersRowTitleEditor
									name={row.displayName}
									onCommit={(value) => {
										onRenameNode(
											row.id,
											resolveSidebarTitleCommit(value, row.node.role),
										);
										onStopEditing();
									}}
									onCancel={onStopEditing}
								/>
							</span>
						) : (
							<span className="flex min-w-0 items-center gap-1">
								<span className="editor-layers-row-title truncate text-sm font-medium">
									{row.displayName}
								</span>
								{(row.isSticky || row.hasAnimation || row.isElevated) && (
									<span className="editor-layers-row-badges flex shrink-0 items-center gap-0.5">
										{row.isSticky && <Pin className="h-3 w-3" />}
										{row.hasAnimation && <Rocket className="h-3 w-3" />}
										{row.isElevated && <Layers2 className="h-3 w-3" />}
									</span>
								)}
							</span>
						)}
						{projectedTypeLabel ? (
							<span className="editor-layers-type-transition mt-0.5 flex items-center gap-1 text-[11px] leading-4">
								<span className="editor-layers-row-type truncate">
									{row.typeLabel}
								</span>
								<span className="editor-layers-type-arrow" aria-hidden="true">
									-&gt;
								</span>
								<span className="editor-layers-row-type truncate">
									{projectedTypeLabel}
								</span>
							</span>
						) : (
							<span className="editor-layers-row-type mt-0.5 block truncate text-[11px] leading-4">
								{row.typeLabel}
							</span>
						)}
					</span>
				</div>

				<div className="editor-layers-row-actions flex shrink-0 items-center gap-1">
					{invalidDrop ? (
						<PopoverTooltip
							side="top"
							align="end"
							className={INSPECTOR_TOOLTIP_CLASS_NAME}
							content="Cannot drop a top-level structural layer onto this item."
						>
							<span
								className="editor-layers-invalid-drop-indicator"
								aria-hidden="true"
							>
								<Ban className="h-3.5 w-3.5" />
							</span>
						</PopoverTooltip>
					) : null}
					<PopoverTooltip
						side="top"
						align="end"
						className={INSPECTOR_TOOLTIP_CLASS_NAME}
						content="Edit title"
					>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="editor-layers-action editor-layers-action-edit h-7 w-7 rounded-md border"
							data-layers-control="true"
							aria-label={`Edit ${row.displayName}`}
							onClick={(event) => {
								event.stopPropagation();
								onStartEditing(row.id);
							}}
						>
							<PencilLine className="h-3.5 w-3.5" />
						</Button>
					</PopoverTooltip>
					{activePageId &&
					row.node.type === 'wrapper' &&
					row.node.parentId === document.rootId &&
					(row.node.role === 'section' || row.node.role === 'header' || row.node.role === 'footer') ? (
						<TopLevelWrapperVisibilityControl
							document={document}
							activePageId={activePageId}
							value={getTopLevelWrapperVisibilityState(document, row.id)}
							onChange={(visibility, pageIds) =>
								onSetTopLevelWrapperVisibility(activePageId, row.id, visibility, pageIds)
							}
						/>
					) : (
						<PopoverTooltip
							side="top"
							align="end"
							className={INSPECTOR_TOOLTIP_CLASS_NAME}
							content={row.node.visible ? "Hide" : "Show"}
						>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="editor-layers-action editor-layers-action-visibility h-7 w-7 rounded-md border"
								data-layers-control="true"
								aria-label={
									row.node.visible
										? `Hide ${row.displayName}`
										: `Show ${row.displayName}`
								}
								onClick={(event) => {
									event.stopPropagation();
									onSetNodeVisibility(row.id, !row.node.visible);
								}}
							>
								{row.node.visible ? (
									<Eye className="h-3.5 w-3.5" />
								) : (
									<EyeOff className="h-3.5 w-3.5" />
								)}
							</Button>
						</PopoverTooltip>
					)}
				</div>
			</div>
		</>
	);
}

function LayersDragGhost({
	row,
	clientX,
	clientY,
	projectedTypeLabel,
}: {
	row: LayersTreeRow;
	clientX: number;
	clientY: number;
	projectedTypeLabel: string | null;
}) {
	const NodeIcon = getLayersNodeIcon(row.node);
	return (
		<TreeDragGhost
			clientX={clientX}
			clientY={clientY}
			icon={<NodeIcon className="h-3.5 w-3.5" />}
			title={row.displayName}
			badges={
				row.isSticky || row.hasAnimation || row.isElevated ? (
					<>
						{row.isSticky && <Pin className="h-3 w-3" />}
						{row.hasAnimation && <Rocket className="h-3 w-3" />}
						{row.isElevated && <Layers2 className="h-3 w-3" />}
					</>
				) : undefined
			}
			subtitle={row.typeLabel}
			projectedSubtitle={projectedTypeLabel}
		/>
	);
}

function LayersRowTitleEditor({
	name,
	onCommit,
	onCancel,
}: {
	name: string;
	onCommit: (value: string) => void;
	onCancel: () => void;
}) {
	const [draft, setDraft] = useState(name);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const skipBlurCommitRef = useRef(false);

	useEffect(() => {
		setDraft(name);
	}, [name]);

	useEffect(() => {
		if (!inputRef.current) {
			return;
		}

		inputRef.current.focus();
		inputRef.current.select();
	}, []);

	function commit() {
		onCommit(draft);
	}

	return (
		<Input
			ref={inputRef}
			value={draft}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={() => {
				if (skipBlurCommitRef.current) {
					skipBlurCommitRef.current = false;
					return;
				}
				commit();
			}}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					skipBlurCommitRef.current = true;
					commit();
					return;
				}

				if (event.key === "Escape") {
					event.preventDefault();
					skipBlurCommitRef.current = true;
					onCancel();
				}
			}}
			aria-label="Edit title"
			className="editor-layers-row-title-input h-6 w-full min-w-[7ch] rounded-sm px-1 py-0 text-sm leading-tight font-medium [field-sizing:content]"
		/>
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
