import { Ban, File, Plus, Trash2 } from "lucide-react";
import {
	useEffect,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { PopoverTooltip } from "@/components/ui/popover";
import { NoticeSurface } from "@/components/ui/settings-panel";
import {
	TreeRowActionButton,
	TreeRowItem,
	TreeRowLabelContent,
	VisibilityToggle,
} from "@/components/ui/tree-row";
import { getPageRole } from "../api/documentViewApi";
import type { DocumentModel, PageId } from "../api/documentViewApi";
import { TreeDragGhost } from "./TreeDragGhost";
import {
	buildPageTreeRows,
	resolvePageDropPosition,
	resolvePageDropTarget,
	type PageDropTarget,
} from "./pageTree";

export type PageTreeContentProps = {
	document: DocumentModel;
	activePageId: PageId | null;
	onSetActivePage: (pageId: PageId) => void;
	onAddPage: () => void;
	onDeletePage: (pageId: PageId) => void;
	onSetPageParent: (pageId: PageId, parentPageId: PageId | null) => void;
	onReorderPage: (pageId: PageId, direction: "back" | "forward") => void;
	onSetPageVisibility: (pageId: PageId, visible: boolean) => void;
};

type DragState = {
	pointerId: number;
	pageId: PageId;
	originX: number;
	originY: number;
	currentX: number;
	currentY: number;
	active: boolean;
	dropTarget: PageDropTarget | null;
	hoveredPageId: PageId | null;
	invalidDrop: boolean;
};

const INSPECTOR_TOOLTIP_CLASS_NAME =
	"editor-tooltip-panel max-w-[16rem] rounded-lg border px-3 py-2 text-xs font-normal leading-5";

export function PageTreeContent({
	document,
	activePageId,
	onSetActivePage,
	onAddPage,
	onDeletePage,
	onSetPageParent,
	onReorderPage,
	onSetPageVisibility,
}: PageTreeContentProps) {
	const [expandedIds, setExpandedIds] = useState<Set<PageId>>(new Set());
	const pages = document.pages ?? [];
	const rows = buildPageTreeRows(pages, activePageId, expandedIds);
	const [dragState, setDragState] = useState<DragState | null>(null);
	const activeDragPointerId = dragState?.pointerId ?? null;
	const dragStateRef = useRef<DragState | null>(null);
	const pagesRef = useRef(pages);
	const rowsRef = useRef(rows);
	const onReorderPageRef = useRef(onReorderPage);
	const onSetPageParentRef = useRef(onSetPageParent);
	const rowRefs = useRef(new Map<PageId, HTMLDivElement>());
	const dragJustEndedRef = useRef(false);

	const draggedPage = dragState
		? (pages.find((page) => page.id === dragState.pageId) ?? null)
		: null;

	useEffect(() => {
		dragStateRef.current = dragState;
	}, [dragState]);

	useEffect(() => {
		pagesRef.current = pages;
		rowsRef.current = rows;
		onReorderPageRef.current = onReorderPage;
		onSetPageParentRef.current = onSetPageParent;
	}, [onReorderPage, onSetPageParent, pages, rows]);

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

		function finishDrag(didDrag: boolean) {
			setDragState(null);
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

			let hoveredPageId: PageId | null = null;
			let nextDropTarget: PageDropTarget | null = null;
			let invalidDrop = false;

			for (const row of rowsRef.current) {
				const element = rowRefs.current.get(row.page.id);
				if (!element) {
					continue;
				}
				const rect = element.getBoundingClientRect();
				if (event.clientY < rect.top || event.clientY > rect.bottom) {
					continue;
				}

				hoveredPageId = row.page.id;
				const position = resolvePageDropPosition(
					rect.height,
					event.clientY - rect.top,
				);
				nextDropTarget = resolvePageDropTarget(
					pagesRef.current,
					currentDrag.pageId,
					row.page.id,
					position,
				);
				invalidDrop = nextDropTarget == null;
				break;
			}

			setDragState((current) =>
				current == null
					? null
					: {
							...current,
							currentX: event.clientX,
							currentY: event.clientY,
							active: true,
							hoveredPageId,
							invalidDrop,
							dropTarget: nextDropTarget,
						},
			);
		}

		function handlePointerEnd(event: PointerEvent) {
			if (event.pointerId !== pointerId) {
				return;
			}

			const currentDrag = dragStateRef.current;
			const currentPage = currentDrag
				? (pagesRef.current.find((page) => page.id === currentDrag.pageId) ??
					null)
				: null;
			const dropTarget = currentDrag?.dropTarget ?? null;

			if (currentDrag?.active && currentPage && dropTarget) {
				if (dropTarget.newParentId !== (currentPage.parentPageId ?? null)) {
					onSetPageParentRef.current(currentPage.id, dropTarget.newParentId);
					if (dropTarget.newParentId !== null) {
						setExpandedIds((current) => {
							const next = new Set(current);
							next.add(dropTarget.newParentId as PageId);
							return next;
						});
					}
				} else if (dropTarget.orderChange) {
					onReorderPageRef.current(currentPage.id, dropTarget.orderChange);
				}
			}

			finishDrag(Boolean(currentDrag?.active));
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
	}, [activeDragPointerId]);

	function toggleExpand(pageId: PageId) {
		setExpandedIds((current) => {
			const next = new Set(current);
			if (next.has(pageId)) {
				next.delete(pageId);
			} else {
				next.add(pageId);
			}
			return next;
		});
	}

	function handleDragStart(
		event: ReactPointerEvent<HTMLDivElement>,
		pageId: PageId,
	) {
		if (event.button !== 0) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		setDragState({
			pointerId: event.pointerId,
			pageId,
			originX: event.clientX,
			originY: event.clientY,
			currentX: event.clientX,
			currentY: event.clientY,
			active: false,
			dropTarget: null,
			hoveredPageId: null,
			invalidDrop: false,
		});
	}

	function handleRowClick(
		event: ReactMouseEvent<HTMLDivElement>,
		pageId: PageId,
	) {
		if (dragJustEndedRef.current) {
			event.preventDefault();
			return;
		}
		onSetActivePage(pageId);
	}

	function handleRowKeyDown(
		event: ReactKeyboardEvent<HTMLDivElement>,
		pageId: PageId,
	) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onSetActivePage(pageId);
		}
	}

	return (
		<div className="flex flex-col">
			<div className="editor-scrollbar editor-scrollbar-gutter max-h-[64vh] overflow-y-auto p-1.5">
				{rows.length === 0 ? (
					<NoticeSurface
						tone="info"
						className="border-dashed py-8 text-center text-sm"
					>
						No pages yet.
					</NoticeSurface>
				) : (
					<div className="flex flex-col gap-1">
						{rows.map((row) => {
							const page = row.page;
							const isHomePage = getPageRole(page) === "home";
							const isOnlyPage = pages.length === 1;
							const isDraggedRow =
								dragState?.pageId === page.id && dragState.active;
							const isInvalidDrop =
								dragState?.active &&
								dragState.invalidDrop &&
								dragState.hoveredPageId === page.id;

							const label = (
								<TreeRowLabelContent
									title={page.displayName}
									subtitle={`/${page.slug}`}
									badges={
										isHomePage ? (
											<span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">
												Home
											</span>
										) : undefined
									}
								/>
							);

							const actions = (
								<>
									{isInvalidDrop ? (
										<PopoverTooltip
											side="top"
											align="end"
											className={INSPECTOR_TOOLTIP_CLASS_NAME}
											content="Cannot move a page into one of its descendants."
										>
											<span
												className="editor-layers-invalid-drop-indicator"
												aria-hidden="true"
											>
												<Ban className="h-3.5 w-3.5" />
											</span>
										</PopoverTooltip>
									) : null}
									{isHomePage ? null : (
										<VisibilityToggle
											isHidden={!page.visible}
											onToggle={() => onSetPageVisibility(page.id, !page.visible)}
											nodeId={page.id}
											label={page.visible ? "Hide" : "Show"}
										/>
									)}
									{isHomePage ? null : (
										<TreeRowActionButton
											ariaLabel={`Delete ${page.displayName}`}
											tooltip={isOnlyPage ? 'A site must always keep one page.' : 'Delete page'}
											disabled={isOnlyPage}
											onClick={() => onDeletePage(page.id)}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</TreeRowActionButton>
									)}
								</>
							);

							return (
								<TreeRowItem
									key={page.id}
									ref={(element) => {
										if (element) {
											rowRefs.current.set(page.id, element);
										} else {
											rowRefs.current.delete(page.id);
										}
									}}
									data-page-row-id={page.id}
									data-drop-intent={
										dragState?.dropTarget?.pageId === page.id
											? dragState.dropTarget.position
											: undefined
									}
									data-invalid-drop={isInvalidDrop ? "true" : undefined}
									depth={row.depth}
									hasChildren={row.hasChildren}
									isExpanded={row.isExpanded}
									isSelected={row.isSelected}
									isHidden={!page.visible}
									isDragging={isDraggedRow}
									onToggle={() => toggleExpand(page.id)}
									onToggleAriaLabel={
										row.isExpanded
											? `Collapse ${page.displayName}`
											: `Expand ${page.displayName}`
									}
									icon={<File className="h-3.5 w-3.5" />}
									label={label}
									actions={actions}
									role="option"
									aria-selected={row.isSelected}
									tabIndex={0}
									onPointerDown={(event) => handleDragStart(event, page.id)}
									onClick={(event) => handleRowClick(event, page.id)}
									onKeyDown={(event) => handleRowKeyDown(event, page.id)}
								/>
							);
						})}
					</div>
				)}
			</div>
			<div className="editor-border-subtle border-t px-3 py-3">
				<Button
					type="button"
					className="w-full justify-center gap-2"
					onClick={onAddPage}
				>
					<Plus className="h-4 w-4" />
					Add page
				</Button>
			</div>

			{dragState?.active && draggedPage ? (
				<TreeDragGhost
					clientX={dragState.currentX}
					clientY={dragState.currentY}
					icon={<File className="h-3.5 w-3.5" />}
					title={draggedPage.displayName}
					subtitle={`/${draggedPage.slug}`}
				/>
			) : null}
		</div>
	);
}
