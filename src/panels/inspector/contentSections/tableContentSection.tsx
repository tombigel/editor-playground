import { PilcrowLeft, PilcrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	DEFAULT_SHADOW_BLUR_PX,
	DEFAULT_SHADOW_COLOR,
	DEFAULT_SHADOW_OFFSET_X_PX,
	DEFAULT_SHADOW_OFFSET_Y_PX,
	DEFAULT_SHADOW_SPREAD_PX,
	getSingleTableBlockContent,
	RICH_TABLE_DEFAULTS,
} from "../../../api/documentViewApi";
import {
	BorderControlGroup,
	FormField,
	HoverColorField,
	InspectorFieldGroup,
	NumericUnitInlineField,
	readShadowFieldValues,
	readUnifiedBorderRadius,
	ShadowControlGroup,
} from "../../InspectorControls";
import {
	createFocusedModeEntry,
	InspectorSectionCard,
} from "../CommonSections";
import type { InspectorActionHandlers, TextInspectorNode } from "../types";
import { convertStageTableStyleLengthToValue } from "../stageConversions";
import {
	applyLeafShadowPatch,
	applyUnifiedLeafBorderRadius,
} from "../styleFields";
import {
	createShadowFallback,
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
} & FocusModeCardProps;

export function TableContentSection({
	node,
	actions,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "space-y-3 px-3 pt-1.5 pb-3",
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
			title="Content"
			headerContent={headerContent}
			headerAction={headerAction}
			contentClassName={contentClassName}
			focusedModeEntry={createFocusedModeEntry(
				focusedMode ?? null,
				"content",
				onEnterFocusedMode,
			)}
		>
			<p className="editor-text-muted text-[11px] leading-4">
				{rowCount} rows by {columnCount} columns
			</p>
			<FormField
				label="Header row"
				layout="inline"
				controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
			>
				<Switch
					checked={hasHeader}
					onCheckedChange={(checked) =>
						actions.onSetTableHeaderRow?.(node.id, checked)
					}
					aria-label="Toggle table header row"
				/>
			</FormField>
		</InspectorSectionCard>
	);
}

type TableDesignSectionProps = {
	node: TextInspectorNode;
	actions: InspectorActionHandlers;
} & FocusModeCardProps;

const TABLE_DESIGN_COMPACT_CONTROL_RAIL_WIDTH_PX =
	TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX - 40;

function TableDesignSubheading({ label }: { label: string }) {
	return (
		<div className="editor-text-strong text-[11px] font-semibold">{label}</div>
	);
}

export function TableDesignSection({
	node,
	actions,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "space-y-2.5 px-3 pt-1.5 pb-3",
}: TableDesignSectionProps) {
	const tableBlock = getSingleTableBlockContent(node.content);
	const isRtl = tableBlock?.direction === "rtl";
	const DirectionIcon = isRtl ? PilcrowLeft : PilcrowRight;
	const shadowFallback = createShadowFallback(
		DEFAULT_SHADOW_COLOR,
		DEFAULT_SHADOW_BLUR_PX,
		DEFAULT_SHADOW_SPREAD_PX,
		DEFAULT_SHADOW_OFFSET_X_PX,
		DEFAULT_SHADOW_OFFSET_Y_PX,
	);
	const shadow = readShadowFieldValues(node.style, shadowFallback);

	return (
		<InspectorSectionCard
			title="Design"
			headerContent={headerContent}
			headerAction={headerAction}
			contentClassName={contentClassName}
			focusedModeEntry={createFocusedModeEntry(
				focusedMode ?? null,
				"design",
				onEnterFocusedMode,
			)}
		>
			<InspectorFieldGroup>
				<TableDesignSubheading label="Table" />
				<FormField label="Direction" layout="inline">
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-7 w-7 rounded-sm"
						aria-label={
							isRtl
								? "Use left-to-right table direction"
								: "Use right-to-left table direction"
						}
						title={isRtl ? "Left-to-right" : "Right-to-left"}
						onClick={() =>
							actions.onSetTableDirection?.(node.id, isRtl ? "ltr" : "rtl")
						}
					>
						<DirectionIcon className="h-3.5 w-3.5" />
					</Button>
				</FormField>
				<FormField label="Background" layout="inline">
					<HoverColorField
						value={tableBlock?.style?.tableBackground}
						onChange={(value) =>
							actions.onSetTableStyle?.(node.id, { tableBackground: value })
						}
						ariaLabel="Table background"
						fallback="transparent"
					/>
				</FormField>
				<div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
					<Label className="pt-1 text-[11px] font-medium">Border</Label>
					<BorderControlGroup
						nodeId={node.id}
						colorValue={tableBlock?.style?.tableBorderColor ?? ""}
						widthValue={
							tableBlock?.style?.tableBorderWidth ??
							RICH_TABLE_DEFAULTS.tableBorderWidth
						}
						radiusValue={readUnifiedBorderRadius(node.style)}
						colorFallback="transparent"
						widthUnits={["px", "em"]}
						colorAriaLabel="Table border color"
						widthAriaLabel="Table border width"
						onWidthUnitChangeValue={(nextUnit, currentValue) =>
							convertStageTableStyleLengthToValue(
								node.id,
								"table-border",
								currentValue,
								nextUnit as "px" | "em",
							)
						}
						onColorChange={(value) =>
							actions.onSetTableStyle?.(node.id, { tableBorderColor: value })
						}
						onWidthChange={(value) =>
							actions.onSetTableStyle?.(node.id, {
								tableBorderWidth: normalizeOptionalValue(value),
							})
						}
						onRadiusChange={(value) =>
							applyUnifiedLeafBorderRadius(actions.onTextChange, value)
						}
					/>
				</div>
				<ShadowControlGroup
					color={shadow.color}
					blur={shadow.blur}
					spread={shadow.spread}
					distance={shadow.distance}
					angle={shadow.angle}
					colorFallback={shadowFallback.color}
					supportsSpread
					onColorChange={(value) =>
						applyLeafShadowPatch(
							actions.onTextChange,
							node.style,
							shadowFallback,
							{
								color: value,
							},
						)
					}
					onBlurChange={(value) =>
						applyLeafShadowPatch(
							actions.onTextChange,
							node.style,
							shadowFallback,
							{
								blur: value,
							},
						)
					}
					onSpreadChange={(value) =>
						applyLeafShadowPatch(
							actions.onTextChange,
							node.style,
							shadowFallback,
							{
								spread: value,
							},
						)
					}
					onDistanceChange={(value) =>
						applyLeafShadowPatch(
							actions.onTextChange,
							node.style,
							shadowFallback,
							{
								distance: value,
							},
						)
					}
					onAngleChange={(value) =>
						applyLeafShadowPatch(
							actions.onTextChange,
							node.style,
							shadowFallback,
							{
								angle: value,
							},
						)
					}
				/>
			</InspectorFieldGroup>
			<InspectorFieldGroup separated gap>
				<TableDesignSubheading label="Header" />
				<FormField
					label="Background"
					layout="inline"
					controlWidth={`${TABLE_DESIGN_COMPACT_CONTROL_RAIL_WIDTH_PX}px`}
				>
					<HoverColorField
						value={tableBlock?.style?.headerBackground}
						onChange={(value) =>
							actions.onSetTableStyle?.(node.id, {
								headerBackground: value,
							})
						}
						ariaLabel="Header background"
						fallback="transparent"
					/>
				</FormField>
				<FormField
					label="Text"
					layout="inline"
					controlWidth={`${TABLE_DESIGN_COMPACT_CONTROL_RAIL_WIDTH_PX}px`}
				>
					<HoverColorField
						value={tableBlock?.style?.headerColor}
						onChange={(value) =>
							actions.onSetTableStyle?.(node.id, { headerColor: value })
						}
						ariaLabel="Header text color"
						fallback="currentColor"
					/>
				</FormField>
			</InspectorFieldGroup>
			<InspectorFieldGroup separated gap>
				<TableDesignSubheading label="Cell" />
				<FormField
					label="Border"
					layout="inline"
					controlWidth={`${TABLE_DESIGN_COMPACT_CONTROL_RAIL_WIDTH_PX}px`}
				>
					<BorderControlGroup
						layout="inline"
						showRadius={false}
						colorValue={tableBlock?.style?.cellBorderColor ?? ""}
						widthValue={
							tableBlock?.style?.cellBorderWidth ??
							RICH_TABLE_DEFAULTS.cellBorderWidth
						}
						colorFallback="transparent"
						widthUnits={["px", "em"]}
						colorAriaLabel="Cell border color"
						widthAriaLabel="Cell border width"
						onWidthUnitChangeValue={(nextUnit, currentValue) =>
							convertStageTableStyleLengthToValue(
								node.id,
								"cell-border",
								currentValue,
								nextUnit as "px" | "em",
							)
						}
						onColorChange={(value) =>
							actions.onSetTableStyle?.(node.id, { cellBorderColor: value })
						}
						onWidthChange={(value) =>
							actions.onSetTableStyle?.(node.id, {
								cellBorderWidth: normalizeOptionalValue(value),
							})
						}
					/>
				</FormField>
				<FormField
					label="Padding"
					layout="inline"
					controlWidth={`${TABLE_DESIGN_COMPACT_CONTROL_RAIL_WIDTH_PX}px`}
				>
					<NumericUnitInlineField
						value={
							tableBlock?.style?.cellPadding ?? RICH_TABLE_DEFAULTS.cellPadding
						}
						units={["px", "em", "%"]}
						min={0}
						className="w-full"
						aria-label="Cell padding"
						onUnitChangeValue={(nextUnit, currentValue) =>
							convertStageTableStyleLengthToValue(
								node.id,
								"cell-padding",
								currentValue,
								nextUnit as "px" | "em" | "%",
							)
						}
						onChange={(value) =>
							actions.onSetTableStyle?.(node.id, {
								cellPadding: normalizeOptionalValue(value),
							})
						}
					/>
				</FormField>
			</InspectorFieldGroup>
		</InspectorSectionCard>
	);
}
