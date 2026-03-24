import type {
	DocumentModel,
	NodeId,
	ViewportMeasurement,
} from "../../model/types";
import type { SnapSettings } from "../../editor/types";
export type { SnapSettings };
import type {
	RenderLeafPlanNode,
	RenderMeasuredNodeSizes,
	RenderWrapperPlanNode,
} from "../../render/types";
import type {
	StickyGeometrySnapshot,
	StickyMeasuredNodeSizes,
} from "../../sticky/types";

export type StageProps = {
	document: DocumentModel;
	selectedId: NodeId | null;
	selectedIds?: NodeId[];
	previewSticky: boolean;
	spacerVisibility: "selected" | "all";
	showGridLanes: boolean;
	snapSettings: SnapSettings;
	onStageFocus: () => void;
	onSelect: (id: NodeId, mode?: "replace" | "toggle") => void;
	onSelectMany?: (ids: NodeId[], mode: "replace" | "toggle") => void;
	onClearSelection?: () => void;
	onMove: (id: NodeId, x: string, y: string) => void;
	onMoveSelection?: (
		moves: Array<{ id: NodeId; x: string; y: string }>,
	) => void;
	onReparent: (id: NodeId, parentId: NodeId, x: string, y: string) => void;
	onReparentSelection?: (
		parentId: NodeId,
		moves: Array<{ id: NodeId; x: string; y: string }>,
	) => void;
	onResize: (id: NodeId, width: string, height: string) => void;
	onResizeStart: (id: NodeId) => void;
	onResizeEnd: (id: NodeId) => void;
	onStickyGeometryChange?: (geometry: StickyGeometrySnapshot) => void;
};

export type DragPreviewItem = {
	nodeId: NodeId;
	offsetX: number;
	offsetY: number;
	width: number;
	height: number;
};

export type DragState = {
	nodeId: string;
	parentId?: string;
	draggedNodeIds?: NodeId[];
	previewItems?: DragPreviewItem[];
	startClientX: number;
	startClientY: number;
	grabOffsetX: number;
	grabOffsetY: number;
	useVisualOffset: boolean;
	modelShiftX: number;
	modelShiftY: number;
	previewWidth: number;
	previewHeight: number;
	originX: number;
	originY: number;
} | null;

export type DragPosition = {
	clientX: number;
	clientY: number;
	guideX: number | null;
	guideY: number | null;
	guideXSource: "component" | "page" | null;
	guideYSource: "component" | "page" | null;
};

export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type ResizeState = {
	nodeId: string;
	handle: ResizeHandle;
	startClientX: number;
	startClientY: number;
	originWidth: number;
	originHeight: number;
	originX: number;
	originY: number;
	minWidth?: number;
	minHeight?: number;
} | null;

export type SnapGuides = {
	x: number | null;
	y: number | null;
	xSource: "component" | "page" | null;
	ySource: "component" | "page" | null;
};

export type StageMathLeafNode = Extract<
	DocumentModel["nodes"][string],
	{ type: "leaf" }
>;
export type StageMathWrapperNode = Extract<
	DocumentModel["nodes"][string],
	{ type: "wrapper" }
>;

export type SnapTarget = {
	value: number;
	source: "component" | "page" | "section" | "header" | "footer" | "container";
	anchor: "edge" | "center";
};

export type DragGeometry = {
	rect: DOMRect;
	offsetX: number;
	offsetY: number;
	useVisualOffset: boolean;
	modelShiftX: number;
	modelShiftY: number;
};

export type CachedSnapTargets = {
	horizontal: SnapTarget[];
	vertical: SnapTarget[];
};

export type DragResolutionOptions = {
	shiftKey: boolean;
	altKey: boolean;
	snapSettings: SnapSettings;
	snapTargets?: CachedSnapTargets;
	documentRef?: Pick<Document, "querySelector" | "querySelectorAll">;
	windowRef?: Pick<Window, "innerWidth" | "innerHeight">;
};

export type MeasuredNodeSizes = StickyMeasuredNodeSizes;

export type StageStickyRegistration =
	RenderWrapperPlanNode["stickyState"]["registrations"][number];
export type StageSceneLeafNode = RenderLeafPlanNode["node"];
export type StageNodeRegistration = (
	id: NodeId,
	element: HTMLElement | null,
) => void;

export type StageSceneProps = {
	document: DocumentModel;
	selectedId: NodeId | null;
	selectedIds?: NodeId[];
	singleSelectionOverlay?: {
		nodeId: NodeId;
		label: string;
		bounds: {
			left: number;
			top: number;
			width: number;
			height: number;
		};
		handles: ResizeHandle[];
		wideSouthHandle: boolean;
	} | null;
	multiSelectionBounds?: {
		left: number;
		top: number;
		width: number;
		height: number;
	} | null;
	previewSticky: boolean;
	spacerVisibility: "selected" | "all";
	showGridLanes: boolean;
	onResizeStart: (id: NodeId) => void;
	dragSourceIds: NodeId[];
	highlightedDropId: NodeId | null;
	registerDraggableNode: StageNodeRegistration;
	registerDropTarget: StageNodeRegistration;
	resizeState: ResizeState;
	setResizeState: (state: ResizeState) => void;
	onSelectionOverlayHandleMouseDown: (handle: ResizeHandle, event: import('react').MouseEvent<HTMLDivElement>) => void;
	measuredNodeSizes: RenderMeasuredNodeSizes;
	viewport: ViewportMeasurement;
};

export type RenderWrapperArgs = {
	document: DocumentModel;
	plan: RenderWrapperPlanNode;
	selectedId: NodeId | null;
	selectedIds: NodeId[];
	previewSticky: boolean;
	spacerVisibility: "selected" | "all";
	showGridLanes: boolean;
	measuredNodeSizes: RenderMeasuredNodeSizes;
	viewport: ViewportMeasurement;
	dragSourceIds: NodeId[];
	highlightedDropId: NodeId | null;
	registerDraggableNode: StageNodeRegistration;
	registerDropTarget: StageNodeRegistration;
	resizeState: ResizeState;
	selfRegistration?: StageStickyRegistration;
	ownerWrapper?: StageMathWrapperNode;
	ownerBottomLanePx?: number;
};
