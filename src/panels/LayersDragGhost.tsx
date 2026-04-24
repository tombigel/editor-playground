import { Layers2, Pin, Rocket } from "lucide-react";
import { TreeDragGhost } from "./TreeDragGhost";
import { getLayersNodeIcon } from "./layersIcons";
import type { LayersTreeRow } from "./layersTree";

export function LayersDragGhost({
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
