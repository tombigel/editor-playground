import { selectNode, setActivePage } from "../../editor/editorStore";
import type {
	AnimationPreviewState,
	EditorState,
} from "../../editor/types";
import type {
	DocumentModel,
	DocumentNode,
	NodeId,
} from "../documentApi";
import type {
	ApplyEditorNavigationOptions,
	EditorNavigationUrlState,
	EditorNodeTarget,
	EditorViewFlags,
} from "./types";

export function applyEditorViewFlags(
	state: EditorState,
	flags: EditorViewFlags,
): EditorState {
	const nextAnimationPreview: AnimationPreviewState =
		flags.animationPreviewEnabled === undefined
			? state.ui.animationPreview
			: { ...state.ui.animationPreview, enabled: flags.animationPreviewEnabled };
	const nextFocusedMode =
		flags.focusedMode === undefined ? state.ui.focusedMode : flags.focusedMode;
	return {
		...state,
		ui: {
			...state.ui,
			showHidden: flags.showHidden ?? state.ui.showHidden,
			previewSticky: flags.previewSticky ?? state.ui.previewSticky,
			animationPreview: nextAnimationPreview,
			spacerVisibility: flags.spacerVisibility ?? state.ui.spacerVisibility,
			showGridLanes: flags.showGridLanes ?? state.ui.showGridLanes,
			showDebugInfo: flags.showDebugInfo ?? state.ui.showDebugInfo,
			focusedMode: nextFocusedMode,
			inspectorCollapsed:
				flags.inspectorCollapsed ??
				(flags.focusedMode === undefined
					? state.ui.inspectorCollapsed
					: Boolean(flags.focusedMode)),
			temporaryInspectorOpen:
				flags.temporaryInspectorOpen ??
				(flags.focusedMode === undefined
					? state.ui.temporaryInspectorOpen
					: false),
		},
	};
}

export function resolveEditorNodeTarget(
	document: DocumentModel,
	target: EditorNodeTarget,
	options: { activePageId?: string | null } = {},
): NodeId | null {
	if (target.id) {
		const node = document.nodes[target.id];
		return node && matchesNodeTarget(node, target) ? node.id : null;
	}

	const scopedIds = new Set(getScopedNodeIds(document, options.activePageId));
	for (const nodeId of getDocumentNodeTraversal(document)) {
		if (options.activePageId && !scopedIds.has(nodeId)) {
			continue;
		}
		const node = document.nodes[nodeId];
		if (node && matchesNodeTarget(node, target)) {
			return node.id;
		}
	}
	return null;
}

export function applyEditorNavigationState(
	state: EditorState,
	navigation: EditorNavigationUrlState,
	options: ApplyEditorNavigationOptions = {},
): EditorState {
	let nextState = state;
	if (
		navigation.activePageId &&
		state.document.pages?.some((page) => page.id === navigation.activePageId)
	) {
		nextState = setActivePage(nextState, navigation.activePageId);
	}

	const selectedTarget =
		options.nodeTarget ??
		(navigation.selectedNodeId ? { id: navigation.selectedNodeId } : undefined);
	if (selectedTarget) {
		const selectedNodeId = resolveEditorNodeTarget(
			nextState.document,
			selectedTarget,
			{
				activePageId: nextState.activePageId,
			},
		);
		nextState = selectNode(nextState, selectedNodeId);
	}

	return applyEditorViewFlags(nextState, {
		focusedMode: navigation.focusedMode,
		showHidden: navigation.showHidden,
		previewSticky: navigation.previewSticky,
		animationPreviewEnabled: navigation.animationPreviewEnabled,
		spacerVisibility: navigation.spacerVisibility,
		showGridLanes: navigation.showGridLanes,
		showDebugInfo: navigation.showDebugInfo,
	});
}

function matchesNodeTarget(node: DocumentNode, target: EditorNodeTarget) {
	if (target.name && node.name !== target.name) return false;
	if (target.nameIncludes && !node.name.includes(target.nameIncludes)) return false;
	if (target.contentType && node.contentType !== target.contentType) return false;
	if (
		target.subtype &&
		!("subtype" in node && node.subtype === target.subtype)
	) {
		return false;
	}
	if (
		target.sticky !== undefined &&
		Boolean("sticky" in node && node.sticky?.enabled) !== target.sticky
	) {
		return false;
	}
	if (target.visible !== undefined && node.visible !== target.visible) return false;
	if (target.selectable && node.contentType === "site") return false;
	if (target.animatable && node.contentType === "site") return false;
	return true;
}

function getScopedNodeIds(document: DocumentModel, activePageId?: string | null) {
	if (!activePageId) {
		return Object.keys(document.nodes);
	}
	const page = document.pages?.find((candidate) => candidate.id === activePageId);
	const rootIds = [
		...(document.sharedRegionIds ?? []),
		...(page?.sectionIds ?? []),
	];
	const ids: NodeId[] = [];
	for (const rootId of rootIds) {
		collectNodeIds(document, rootId, ids);
	}
	return ids;
}

function getDocumentNodeTraversal(document: DocumentModel) {
	const ids: NodeId[] = [];
	collectNodeIds(document, document.rootId, ids);
	return ids;
}

function collectNodeIds(document: DocumentModel, nodeId: NodeId, ids: NodeId[]) {
	const node = document.nodes[nodeId];
	if (!node) return;
	ids.push(node.id);
	for (const childId of node.children) {
		collectNodeIds(document, childId, ids);
	}
}
