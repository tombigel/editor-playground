import type { ReactNode } from "react";
import { PilcrowLeft, PilcrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getSingleTableBlockContent } from "../../../api/documentViewApi";
import {
	FormField,
	HoverColorField,
	InspectorFieldGroup,
} from "../../InspectorControls";
import { LabeledUnitField } from "../../controls/NumberFields";
import {
	createFocusedModeEntry,
	InspectorSectionCard,
} from "../CommonSections";
import type { InspectorActionHandlers, TextInspectorNode } from "../types";
import {
	type FocusModeCardProps,
	TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX,
} from "./shared";

function normalizeOptionalValue(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

type TableContentSectionProps = {
	node: TextInspectorNode;
	actions: InspectorActionHandlers;
	focusedMode: FocusModeCardProps["focusedMode"];
	onEnterFocusedMode: FocusModeCardProps["onEnterFocusedMode"];
	headerContent?: ReactNode;
};

export function TableContentSection({
	node,
	actions,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
}: TableContentSectionProps) {
	const tableBlock = getSingleTableBlockContent(node.content);
	const rowCount = tableBlock?.children.length ?? 0;
	const columnCount = Math.max(
		1,
		...(tableBlock?.children.map((row) => row.children.length) ?? [1]),
	);
	const hasHeader = tableBlock?.children[0]?.header === true;

	return (
		<InspectorSectionCard
			title="Table content"
			headerContent={headerContent}
			focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, "content", onEnterFocusedMode)}
		>
			<div className="space-y-3">
				<p className="editor-text-muted text-[11px] leading-4">
					{rowCount} rows by {columnCount} columns
				</p>
				<FormField label="Header row" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
					<Switch
						checked={hasHeader}
						onCheckedChange={(checked) =>
							actions.onSetTableHeaderRow?.(node.id, checked)
						}
						aria-label="Toggle table header row"
					/>
				</FormField>
			</div>
		</InspectorSectionCard>
	);
}

type TableDesignSectionProps = {
	node: TextInspectorNode;
	actions: InspectorActionHandlers;
	focusedMode: FocusModeCardProps["focusedMode"];
	onEnterFocusedMode: FocusModeCardProps["onEnterFocusedMode"];
};

export function TableDesignSection({
	node,
	actions,
	focusedMode,
	onEnterFocusedMode,
}: TableDesignSectionProps) {
	const tableBlock = getSingleTableBlockContent(node.content);
	const isRtl = tableBlock?.direction === "rtl";
	const DirectionIcon = isRtl ? PilcrowRight : PilcrowLeft;

	return (
		<InspectorSectionCard
			title="Table design"
			focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, "design", onEnterFocusedMode)}
		>
			<div className="space-y-3">
				<FormField label="Direction" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-7 w-7 rounded-sm"
						aria-label={isRtl ? "Use left-to-right table direction" : "Use right-to-left table direction"}
						title={isRtl ? "Left-to-right" : "Right-to-left"}
						onClick={() => actions.onSetTableDirection?.(node.id, isRtl ? "ltr" : "rtl")}
					>
						<DirectionIcon className="h-3.5 w-3.5" />
					</Button>
				</FormField>
				<FormField label="Table background" layout="inline" controlClassName="gap-2">
					<HoverColorField
						value={tableBlock?.style?.tableBackground}
						onChange={(value) => actions.onSetTableStyle?.(node.id, { tableBackground: value })}
						ariaLabel="Table background"
						fallback="transparent"
					/>
				</FormField>
				<FormField label="Table border" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
					<InspectorFieldGroup className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-1.5">
						<LabeledUnitField
							label="Width"
							value={tableBlock?.style?.tableBorderWidth ?? ""}
							units={["px", "%"]}
							placeholder="0"
							min={0}
							onChange={(value) => actions.onSetTableStyle?.(node.id, { tableBorderWidth: normalizeOptionalValue(value) })}
						/>
						<HoverColorField
							value={tableBlock?.style?.tableBorderColor}
							onChange={(value) => actions.onSetTableStyle?.(node.id, { tableBorderColor: value })}
							ariaLabel="Table border color"
							fallback="transparent"
						/>
					</InspectorFieldGroup>
				</FormField>
				<FormField label="Default cell padding" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
					<LabeledUnitField
						label="Padding"
						value={tableBlock?.style?.cellPadding ?? ""}
						units={["px", "%"]}
						placeholder="default"
						min={0}
						onChange={(value) => actions.onSetTableStyle?.(node.id, { cellPadding: normalizeOptionalValue(value) })}
					/>
				</FormField>
				<FormField label="Default cell border" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
					<InspectorFieldGroup className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-1.5">
						<LabeledUnitField
							label="Width"
							value={tableBlock?.style?.cellBorderWidth ?? ""}
							units={["px", "%"]}
							placeholder="0"
							min={0}
							onChange={(value) => actions.onSetTableStyle?.(node.id, { cellBorderWidth: normalizeOptionalValue(value) })}
						/>
						<HoverColorField
							value={tableBlock?.style?.cellBorderColor}
							onChange={(value) => actions.onSetTableStyle?.(node.id, { cellBorderColor: value })}
							ariaLabel="Cell border color"
							fallback="transparent"
						/>
					</InspectorFieldGroup>
				</FormField>
				<FormField label="Header style" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
					<div className="flex w-full items-center gap-1">
						<HoverColorField
							value={tableBlock?.style?.headerBackground}
							onChange={(value) => actions.onSetTableStyle?.(node.id, { headerBackground: value })}
							ariaLabel="Header background"
							fallback="transparent"
						/>
						<HoverColorField
							value={tableBlock?.style?.headerColor}
							onChange={(value) => actions.onSetTableStyle?.(node.id, { headerColor: value })}
							ariaLabel="Header text color"
							fallback="currentColor"
						/>
					</div>
				</FormField>
			</div>
		</InspectorSectionCard>
	);
}
