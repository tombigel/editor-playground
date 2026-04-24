import { Ban, Layers2, PencilLine, Pin, Rocket } from "lucide-react";
import type {
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
	PointerEvent as ReactPointerEvent,
} from "react";
import type { DocumentModel, NodeId } from "../api/documentViewApi";
import {
	getTopLevelWrapperVisibilityState,
	type PageId,
	type TopLevelWrapperVisibilityMode,
} from "@/api/editorApi";
import { PopoverTooltip } from "@/components/ui/popover";
import {
	TreeRowActionButton,
	TreeRowItem,
	TreeRowLabelContent,
	VisibilityToggle,
} from "@/components/ui/tree-row";
import { TopLevelWrapperVisibilityControl } from "./controls/TopLevelWrapperVisibilityControl";
import { resolveSidebarTitleCommit } from "./EditorSidebar";
import { getLayersNodeIcon } from "./layersIcons";
import type { ActiveDropTarget } from "./LayersPanel.types";
import { LayersRowTitleEditor } from "./LayersRowTitleEditor";
import type { LayersDropPosition, LayersTreeRow } from "./layersTree";

const INSPECTOR_TOOLTIP_CLASS_NAME =
	"editor-tooltip-panel max-w-[16rem] rounded-lg border px-3 py-2 text-xs font-normal leading-5";

export function LayersTreeRowItem({
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
	const label = editing ? (
		<span className="block min-w-0" data-layers-title-editor="true">
			<LayersRowTitleEditor
				name={row.displayName}
				onCommit={(value) => {
					onRenameNode(
						row.id,
						resolveSidebarTitleCommit(value, row.node.subtype),
					);
					onStopEditing();
				}}
				onCancel={onStopEditing}
			/>
		</span>
	) : (
		<TreeRowLabelContent
			title={row.displayName}
			subtitle={row.typeLabel}
			projectedSubtitle={projectedTypeLabel}
			badges={
				<>
					{row.isSticky && <Pin className="h-3 w-3" />}
					{row.hasAnimation && <Rocket className="h-3 w-3" />}
					{row.isElevated && <Layers2 className="h-3 w-3" />}
				</>
			}
		/>
	);

	const actions = (
		<>
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
			<TreeRowActionButton
				ariaLabel={`Edit ${row.displayName}`}
				tooltip="Edit title"
				className="editor-layers-action-edit"
				onClick={() => {
					onStartEditing(row.id);
				}}
			>
				<PencilLine className="h-3.5 w-3.5" />
			</TreeRowActionButton>
			{activePageId &&
			row.node.contentType === "container" &&
			row.node.parentId === document.rootId &&
			(row.node.subtype === "section" ||
				row.node.subtype === "header" ||
				row.node.subtype === "footer") ? (
				<TopLevelWrapperVisibilityControl
					document={document}
					activePageId={activePageId}
					value={getTopLevelWrapperVisibilityState(document, row.id)}
					triggerDisplay="icon"
					onChange={(visibility, pageIds) =>
						onSetTopLevelWrapperVisibility(
							activePageId,
							row.id,
							visibility,
							pageIds,
						)
					}
				/>
			) : (
				<VisibilityToggle
					isHidden={!row.node.visible}
					onToggle={() => onSetNodeVisibility(row.id, !row.node.visible)}
					nodeId={row.displayName}
					label={row.node.visible ? "Hide" : "Show"}
				/>
			)}
		</>
	);

	return (
		<>
			{row.dividerBefore ? (
				<div aria-hidden="true" className="editor-layers-divider" />
			) : null}
			<TreeRowItem
				ref={(element) => onRefChange(row.id, element)}
				className="group"
				data-drop-intent={dropTarget?.position}
				data-invalid-drop={invalidDrop ? "true" : "false"}
				data-layers-row-id={row.id}
				depth={row.depth}
				hasChildren={row.hasChildren}
				isExpanded={row.isExpanded}
				isSelected={row.isSelected}
				isHidden={!row.node.visible}
				isDragging={dragging}
				onToggle={() => onToggleExpanded(row.id)}
				onToggleAriaLabel={
					row.isExpanded
						? `Collapse ${row.displayName}`
						: `Expand ${row.displayName}`
				}
				onPointerDown={(event) => onPointerDown(event, row)}
				icon={<NodeIcon className="h-3.5 w-3.5" />}
				label={label}
				actions={actions}
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
			/>
		</>
	);
}
