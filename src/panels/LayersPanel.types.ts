import type { NodeId } from "../api/documentViewApi";
import type { LayersDropPosition } from "./layersTree";

export type ActiveDropTarget = {
	rowId: NodeId;
	position: LayersDropPosition;
	targetParentId: NodeId;
	targetIndex: number;
};
