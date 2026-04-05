import type { DocumentPage, PageId } from "../model/types/site";

export type PageDropPosition = "before" | "after" | "inside";

export type PageTreeRow = {
	page: DocumentPage;
	depth: number;
	hasChildren: boolean;
	isExpanded: boolean;
	isSelected: boolean;
};

export type PageDropTarget = {
	pageId: PageId;
	position: PageDropPosition;
	newParentId: PageId | null;
	orderChange: "back" | "forward" | null;
};

export function buildPageTreeRows(
	pages: DocumentPage[],
	activePageId: PageId | null,
	expandedIds: Set<PageId>,
): PageTreeRow[] {
	const childrenMap = new Map<PageId | null, DocumentPage[]>();

	for (const page of pages) {
		const parentId = page.parentPageId ?? null;
		const siblings = childrenMap.get(parentId);
		if (siblings) {
			siblings.push(page);
		} else {
			childrenMap.set(parentId, [page]);
		}
	}

	const rows: PageTreeRow[] = [];

	function visit(parentId: PageId | null, depth: number) {
		for (const page of childrenMap.get(parentId) ?? []) {
			const hasChildren = (childrenMap.get(page.id)?.length ?? 0) > 0;
			const isExpanded = expandedIds.has(page.id);
			rows.push({
				page,
				depth,
				hasChildren,
				isExpanded,
				isSelected: page.id === activePageId,
			});

			if (hasChildren && isExpanded) {
				visit(page.id, depth + 1);
			}
		}
	}

	visit(null, 0);
	return rows;
}

export function computePageDepth(
	pageId: PageId,
	pages: DocumentPage[],
): number {
	let depth = 0;
	let currentId: PageId | null = pageId;
	const visited = new Set<PageId>();

	while (currentId) {
		if (visited.has(currentId) || visited.size > 50) {
			break;
		}
		visited.add(currentId);
		const currentPage = pages.find((page) => page.id === currentId);
		if (!currentPage?.parentPageId) {
			break;
		}
		depth += 1;
		currentId = currentPage.parentPageId;
	}

	return depth;
}

export function resolvePageDropPosition(
	rowHeight: number,
	pointerOffsetY: number,
): PageDropPosition {
	const beforeThreshold = rowHeight * 0.28;
	const afterThreshold = rowHeight * 0.72;

	if (pointerOffsetY <= beforeThreshold) {
		return "before";
	}
	if (pointerOffsetY >= afterThreshold) {
		return "after";
	}
	return "inside";
}

export function isDescendant(
	candidateId: PageId,
	ancestorId: PageId,
	pages: DocumentPage[],
): boolean {
	if (candidateId === ancestorId) {
		return true;
	}

	let currentId: PageId | undefined = candidateId;
	const visited = new Set<PageId>();

	while (currentId) {
		if (visited.has(currentId) || visited.size > 50) {
			return false;
		}
		visited.add(currentId);

		const currentPage = pages.find((page) => page.id === currentId);
		if (!currentPage?.parentPageId) {
			return false;
		}
		if (currentPage.parentPageId === ancestorId) {
			return true;
		}
		currentId = currentPage.parentPageId;
	}

	return false;
}

export function resolvePageDropTarget(
	pages: DocumentPage[],
	draggedPageId: PageId,
	targetPageId: PageId,
	position: PageDropPosition,
): PageDropTarget | null {
	if (
		draggedPageId === targetPageId ||
		isDescendant(targetPageId, draggedPageId, pages)
	) {
		return null;
	}

	const targetPage = pages.find((page) => page.id === targetPageId);
	if (!targetPage) {
		return null;
	}

	if (position === "inside") {
		return {
			pageId: targetPageId,
			position,
			newParentId: targetPageId,
			orderChange: null,
		};
	}

	return {
		pageId: targetPageId,
		position,
		newParentId: targetPage.parentPageId ?? null,
		orderChange: position === "before" ? "back" : "forward",
	};
}
