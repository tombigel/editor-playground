import {
	Columns3,
	Grid2X2,
	MoveVertical,
	PaintBucket,
	PilcrowLeft,
	PilcrowRight,
	Rows3,
	TableProperties,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	OptionsSelector,
	type OptionsSelectorOption,
} from "@/components/ui/options-selector";
import { PopoverTooltip } from "@/components/ui/popover";
import {
	ToolbarControlGroup,
	ToolbarControlRow,
} from "@/components/ui/toolbar-control-group";
import { DARK_TOOLTIP_CLASS } from "@/lib/utils";
import type {
	TableBorderScope,
	TableCellBorderPatch,
	TableCellStylePatch,
	TableSelectionDescriptor,
} from "../../../api/documentApi";
import {
	convertTableLengthValue,
	formatDisplayValue,
	RICH_TABLE_DEFAULTS,
	type TableLengthUnit,
} from "../../../api/documentViewApi";
import type { RichTableCellStyle } from "../../../model/types";
import { HoverColorField } from "../../../panels/InspectorControls";
import {
	CompactColorField,
	CompactTableLengthField,
	ToolbarButton,
} from "./controls";
import type { ActiveTableContext } from "./helpers";
import {
	preserveTableSelectionPointerDown,
	TableActionMenu,
	ToolbarPopover,
} from "./TableToolbarPopovers";

type TableSelectionTarget = TableSelectionDescriptor["type"];
type OpenTablePopover = "rows" | "columns" | "borders" | null;
type TableEdge = "Top" | "Right" | "Bottom" | "Left";

const TABLE_LENGTH_UNITS = ["px", "em", "%"] as const;
const BORDER_WIDTH_UNITS = ["px", "em"] as const;

const TABLE_SELECTION_TARGET_OPTIONS: OptionsSelectorOption[] = [
	{ value: "cell", label: "Cell" },
	{ value: "row", label: "Row" },
	{ value: "column", label: "Column" },
	{ value: "table", label: "Table" },
];

const TABLE_BORDER_SCOPE_OPTIONS: Array<{
	scope: TableBorderScope;
	label: string;
}> = [
	{ scope: "all", label: "All borders" },
	{ scope: "outer", label: "Outer borders" },
	{ scope: "inner", label: "Inner borders" },
	{ scope: "horizontal", label: "Horizontal borders" },
	{ scope: "vertical", label: "Vertical borders" },
	{ scope: "top", label: "Top border" },
	{ scope: "right", label: "Right border" },
	{ scope: "bottom", label: "Bottom border" },
	{ scope: "left", label: "Left border" },
];

export function TableToolbarControls({
	activeTableContext,
	onInsertRow,
	onRemoveRow,
	onInsertColumn,
	onRemoveColumn,
	onHeaderToggle,
	onColumnWidthChange,
	onRowHeightChange,
	onDirectionToggle,
	onCellStyleChange,
	onSelectionBorderChange,
}: {
	activeTableContext: ActiveTableContext | null;
	onInsertRow?: (position: "before" | "after") => void;
	onRemoveRow?: () => void;
	onInsertColumn?: (position: "before" | "after") => void;
	onRemoveColumn?: () => void;
	onHeaderToggle?: () => void;
	onColumnWidthChange?: (value: string) => void;
	onRowHeightChange?: (value: string) => void;
	onDirectionToggle?: () => void;
	onCellStyleChange?: (patch: TableCellStylePatch) => void;
	onSelectionBorderChange?: (
		target: TableSelectionTarget,
		scope: TableBorderScope,
		patch: TableCellBorderPatch,
	) => void;
}) {
	const [openPopover, setOpenPopover] = useState<OpenTablePopover>(null);
	const [borderTarget, setBorderTarget] =
		useState<TableSelectionTarget>("cell");
	const [borderScope, setBorderScope] = useState<TableBorderScope>("all");
	const cellStyle = activeTableContext?.cellStyle;
	const borderScopeAvailable = activeTableContext
		? isBorderScopeAvailable(activeTableContext, borderTarget, borderScope)
		: false;

	useEffect(() => {
		if (!borderScopeAvailable) {
			setBorderScope("all");
		}
	}, [borderScopeAvailable]);

	const borderState = activeTableContext
		? readSelectionBorderState(
				activeTableContext,
				borderTarget,
				borderScopeAvailable ? borderScope : "all",
			)
		: {
				width: RICH_TABLE_DEFAULTS.cellBorderWidth,
				color: "",
				widthMixed: false,
				colorMixed: false,
			};

	return (
		<ToolbarControlRow className="max-w-full flex-wrap">
			<ToolbarControlGroup className="editor-text-muted min-w-[50px] justify-center px-1 text-[11px] font-medium tabular-nums">
				<span>
					{activeTableContext
						? `R${activeTableContext.rowIndex + 1}:C${activeTableContext.columnIndex + 1}`
						: "Cell"}
				</span>
			</ToolbarControlGroup>
			<ToolbarControlGroup withDividerBefore>
				<CompactTableLengthField
					label="Active column width"
					icon={<Columns3 size={14} />}
					value={
						activeTableContext?.columnWidth ?? RICH_TABLE_DEFAULTS.columnWidth
					}
					width={88}
					units={TABLE_LENGTH_UNITS}
					keyword={{ value: "auto", label: "Auto" }}
					numericDefaults={{
						px: 120,
						em: 8,
						"%": 100 / Math.max(1, activeTableContext?.columnCount ?? 1),
					}}
					resolveUnitValue={(nextUnit, currentValue) =>
						resolveActiveTableLengthUnit(
							activeTableContext,
							"column-width",
							currentValue,
							nextUnit,
						)
					}
					onCommit={(value) => onColumnWidthChange?.(value)}
				/>
				<CompactTableLengthField
					label="Active row height"
					icon={<Rows3 size={14} />}
					value={activeTableContext?.rowHeight ?? RICH_TABLE_DEFAULTS.rowHeight}
					width={88}
					units={TABLE_LENGTH_UNITS}
					keyword={{ value: "auto", label: "Auto" }}
					numericDefaults={{
						px: 40,
						em: 2.5,
						"%": 100 / Math.max(1, activeTableContext?.rowCount ?? 1),
					}}
					resolveUnitValue={(nextUnit, currentValue) =>
						resolveActiveTableLengthUnit(
							activeTableContext,
							"row-height",
							currentValue,
							nextUnit,
						)
					}
					onCommit={(value) => onRowHeightChange?.(value)}
				/>
			</ToolbarControlGroup>
			<ToolbarControlGroup withDividerBefore>
				<CompactColorField
					label="Selected cell background"
					value={cellStyle?.background ?? "transparent"}
					icon={<PaintBucket size={14} />}
					onChange={(value) => onCellStyleChange?.({ background: value })}
				/>
				<CompactTableLengthField
					label="Selected cell padding"
					icon={<MoveVertical size={14} />}
					value={
						cellStyle?.padding ??
						activeTableContext?.table.style?.cellPadding ??
						RICH_TABLE_DEFAULTS.cellPadding
					}
					width={104}
					units={TABLE_LENGTH_UNITS}
					resolveUnitValue={(nextUnit, currentValue) =>
						resolveActiveTableLengthUnit(
							activeTableContext,
							"cell-padding",
							currentValue,
							nextUnit,
						)
					}
					onCommit={(value) => onCellStyleChange?.({ padding: value })}
				/>
			</ToolbarControlGroup>
			<ToolbarControlGroup withDividerBefore>
				<TableActionMenu
					kind="rows"
					open={openPopover === "rows"}
					onOpenChange={(open) => setOpenPopover(open ? "rows" : null)}
					disableDelete={(activeTableContext?.rowCount ?? 0) <= 1}
					onInsertBefore={() => onInsertRow?.("before")}
					onInsertAfter={() => onInsertRow?.("after")}
					onDelete={() => onRemoveRow?.()}
				/>
				<TableActionMenu
					kind="columns"
					open={openPopover === "columns"}
					onOpenChange={(open) => setOpenPopover(open ? "columns" : null)}
					disableDelete={(activeTableContext?.columnCount ?? 0) <= 1}
					onInsertBefore={() => onInsertColumn?.("before")}
					onInsertAfter={() => onInsertColumn?.("after")}
					onDelete={() => onRemoveColumn?.()}
				/>
				<ToolbarButton
					label="Toggle header row"
					active={activeTableContext?.hasHeader === true}
					onActivate={() => onHeaderToggle?.()}
				>
					<TableProperties size={14} />
				</ToolbarButton>
				<ToolbarButton
					label={
						activeTableContext?.direction === "rtl"
							? "Use left-to-right table direction"
							: "Use right-to-left table direction"
					}
					active={activeTableContext?.direction === "rtl"}
					onActivate={() => onDirectionToggle?.()}
				>
					{activeTableContext?.direction === "rtl" ? (
						<PilcrowLeft size={14} />
					) : (
						<PilcrowRight size={14} />
					)}
				</ToolbarButton>
				<TableBorderPopover
					open={openPopover === "borders"}
					onOpenChange={(open) => setOpenPopover(open ? "borders" : null)}
					context={activeTableContext}
					target={borderTarget}
					onTargetChange={setBorderTarget}
					scope={borderScopeAvailable ? borderScope : "all"}
					onScopeChange={setBorderScope}
					borderState={borderState}
					onChange={(patch) =>
						onSelectionBorderChange?.(
							borderTarget,
							borderScopeAvailable ? borderScope : "all",
							patch,
						)
					}
				/>
			</ToolbarControlGroup>
		</ToolbarControlRow>
	);
}

function TableBorderPopover({
	open,
	onOpenChange,
	context,
	target,
	onTargetChange,
	scope,
	onScopeChange,
	borderState,
	onChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	context: ActiveTableContext | null;
	target: TableSelectionTarget;
	onTargetChange: (target: TableSelectionTarget) => void;
	scope: TableBorderScope;
	onScopeChange: (scope: TableBorderScope) => void;
	borderState: ReturnType<typeof readSelectionBorderState>;
	onChange: (patch: TableCellBorderPatch) => void;
}) {
	return (
		<ToolbarPopover
			open={open}
			onOpenChange={onOpenChange}
			label="Borders"
			trigger={<Grid2X2 size={14} />}
			triggerClassName="w-7 p-0"
			surfaceWidth={292}
			popupRole="dialog"
		>
			<div
				role="dialog"
				aria-label="Table borders"
				className="space-y-3 p-2"
				data-stage-table-border-popover="true"
			>
				<div className="space-y-1.5">
					<div className="editor-text-muted text-[11px] font-medium">
						Apply to
					</div>
					<OptionsSelector
						ariaLabel="Table border target"
						size="compact"
						value={target}
						options={TABLE_SELECTION_TARGET_OPTIONS}
						onValueChange={(value) =>
							onTargetChange(value as TableSelectionTarget)
						}
					/>
				</div>
				<fieldset className="space-y-1.5">
					<legend className="editor-text-muted text-[11px] font-medium">
						Border edges
					</legend>
					<div className="grid grid-cols-5 gap-1">
						{TABLE_BORDER_SCOPE_OPTIONS.map((option) => {
							const available = context
								? isBorderScopeAvailable(context, target, option.scope)
								: false;
							return (
								<PopoverTooltip
									key={option.scope}
									side="top"
									align="center"
									className={DARK_TOOLTIP_CLASS}
									content={
										<div className="leading-3.5 font-medium">
											{option.label}
										</div>
									}
								>
									<Button
										type="button"
										variant={scope === option.scope ? "default" : "outline"}
										size="icon"
										className="h-7 w-7 rounded-sm"
										aria-label={option.label}
										aria-pressed={scope === option.scope}
										disabled={!available}
										onPointerDown={preserveTableSelectionPointerDown}
										onClick={() => onScopeChange(option.scope)}
									>
										<TableBorderGlyph scope={option.scope} />
									</Button>
								</PopoverTooltip>
							);
						})}
					</div>
				</fieldset>
				<div className="editor-border-subtle grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 border-t pt-2.5">
					<div className="space-y-1">
						<div className="editor-text-muted text-[11px] font-medium">
							Width
						</div>
						<CompactTableLengthField
							label="Selected border width"
							value={borderState.width}
							width={132}
							units={BORDER_WIDTH_UNITS}
							placeholder="Default"
							mixed={borderState.widthMixed}
							resolveUnitValue={(nextUnit, currentValue) =>
								resolveActiveTableLengthUnit(
									context,
									"cell-border",
									currentValue,
									nextUnit,
								)
							}
							onCommit={(value) => onChange({ width: value })}
						/>
					</div>
					<div className="space-y-1">
						<div className="editor-text-muted text-[11px] font-medium">
							Color
						</div>
						<HoverColorField
							value={borderState.color || undefined}
							fallback="transparent"
							mixed={borderState.colorMixed}
							ariaLabel="Selected border color"
							onChange={(value) => onChange({ color: value })}
						/>
					</div>
				</div>
			</div>
		</ToolbarPopover>
	);
}

export function resolveActiveTableLengthUnit(
	context: ActiveTableContext | null,
	target: "column-width" | "row-height" | "cell-padding" | "cell-border",
	currentValue: string,
	nextUnit: TableLengthUnit,
	ownerDocument: Document | undefined = globalThis.document,
) {
	const editRoot = ownerDocument?.querySelector<HTMLElement>(
		'[data-stage-rich-edit-root="true"]',
	);
	const table = editRoot?.querySelector<HTMLTableElement>("table");
	const row = context ? table?.rows.item(context.rowIndex) : null;
	const cell = context ? row?.cells.item(context.columnIndex) : null;
	const defaultView = ownerDocument?.defaultView;
	if (!context || !table || !row || !cell || !defaultView) {
		return null;
	}

	const computed = defaultView.getComputedStyle(cell);
	const renderedPx =
		target === "column-width"
			? cell.getBoundingClientRect().width
			: target === "row-height"
				? row.getBoundingClientRect().height
				: Number.parseFloat(
						target === "cell-padding"
							? computed.paddingTop
							: computed.borderTopWidth,
					);
	const percentReferencePx =
		target === "row-height"
			? table.getBoundingClientRect().height
			: target === "cell-padding"
				? cell.getBoundingClientRect().width
				: table.getBoundingClientRect().width;
	const converted = convertTableLengthValue(currentValue, nextUnit, {
		renderedPx,
		fontSizePx: Number.parseFloat(computed.fontSize),
		percentReferencePx,
	});
	return converted == null
		? null
		: `${formatDisplayValue(converted)}${nextUnit}`;
}

function TableBorderGlyph({ scope }: { scope: TableBorderScope }) {
	// Lucide has no table-edge preset set; this compact grid keeps every target visually comparable.
	const showOuter = scope === "all" || scope === "outer";
	const showHorizontal =
		scope === "all" || scope === "inner" || scope === "horizontal";
	const showVertical =
		scope === "all" || scope === "inner" || scope === "vertical";

	return (
		<span aria-hidden="true" className="relative block h-4 w-4">
			<span className="editor-border-subtle absolute inset-0 border" />
			<span className="editor-border-subtle absolute inset-x-0 top-1/2 border-t" />
			<span className="editor-border-subtle absolute inset-y-0 left-1/2 border-l" />
			{showOuter ? (
				<span className="absolute inset-0 border border-current" />
			) : null}
			{showHorizontal ? (
				<span className="absolute inset-x-0 top-1/2 border-t border-current" />
			) : null}
			{showVertical ? (
				<span className="absolute inset-y-0 left-1/2 border-l border-current" />
			) : null}
			{scope === "top" ? (
				<span className="absolute inset-x-0 top-0 border-t border-current" />
			) : null}
			{scope === "right" ? (
				<span className="absolute inset-y-0 right-0 border-r border-current" />
			) : null}
			{scope === "bottom" ? (
				<span className="absolute inset-x-0 bottom-0 border-b border-current" />
			) : null}
			{scope === "left" ? (
				<span className="absolute inset-y-0 left-0 border-l border-current" />
			) : null}
		</span>
	);
}

function getSelectionRect(
	context: ActiveTableContext,
	target: TableSelectionTarget,
) {
	switch (target) {
		case "table":
			return {
				rowStart: 0,
				rowEnd: context.rowCount - 1,
				columnStart: 0,
				columnEnd: context.columnCount - 1,
			};
		case "row":
			return {
				rowStart: context.rowIndex,
				rowEnd: context.rowIndex,
				columnStart: 0,
				columnEnd: context.columnCount - 1,
			};
		case "column":
			return {
				rowStart: 0,
				rowEnd: context.rowCount - 1,
				columnStart: context.columnIndex,
				columnEnd: context.columnIndex,
			};
		case "cell":
			return {
				rowStart: context.rowIndex,
				rowEnd: context.rowIndex,
				columnStart: context.columnIndex,
				columnEnd: context.columnIndex,
			};
	}
}

function isBorderScopeAvailable(
	context: ActiveTableContext,
	target: TableSelectionTarget,
	scope: TableBorderScope,
) {
	const rect = getSelectionRect(context, target);
	const rowSpan = rect.rowEnd - rect.rowStart + 1;
	const columnSpan = rect.columnEnd - rect.columnStart + 1;
	if (scope === "inner") {
		return rowSpan > 1 || columnSpan > 1;
	}
	if (scope === "horizontal") {
		return rowSpan > 1;
	}
	if (scope === "vertical") {
		return columnSpan > 1;
	}
	return true;
}

function readSelectionBorderState(
	context: ActiveTableContext,
	target: TableSelectionTarget,
	scope: TableBorderScope,
) {
	const rect = getSelectionRect(context, target);
	const widths: string[] = [];
	const colors: string[] = [];
	for (let rowIndex = rect.rowStart; rowIndex <= rect.rowEnd; rowIndex += 1) {
		for (
			let columnIndex = rect.columnStart;
			columnIndex <= rect.columnEnd;
			columnIndex += 1
		) {
			const cell = context.table.children[rowIndex]?.children[columnIndex];
			if (!cell) {
				continue;
			}
			for (const edge of getBorderEdges(scope, rect, rowIndex, columnIndex)) {
				widths.push(
					cell.style?.[`border${edge}Width` as keyof RichTableCellStyle] ??
						context.table.style?.cellBorderWidth ??
						RICH_TABLE_DEFAULTS.cellBorderWidth,
				);
				colors.push(
					cell.style?.[`border${edge}Color` as keyof RichTableCellStyle] ??
						context.table.style?.cellBorderColor ??
						"",
				);
			}
		}
	}

	return {
		width: widths[0] ?? RICH_TABLE_DEFAULTS.cellBorderWidth,
		color: colors[0] ?? "",
		widthMixed: new Set(widths).size > 1,
		colorMixed: new Set(colors).size > 1,
	};
}

function getBorderEdges(
	scope: TableBorderScope,
	rect: ReturnType<typeof getSelectionRect>,
	rowIndex: number,
	columnIndex: number,
): TableEdge[] {
	switch (scope) {
		case "all":
			return ["Top", "Right", "Bottom", "Left"];
		case "outer":
			return [
				...(rowIndex === rect.rowStart ? (["Top"] as const) : []),
				...(columnIndex === rect.columnEnd ? (["Right"] as const) : []),
				...(rowIndex === rect.rowEnd ? (["Bottom"] as const) : []),
				...(columnIndex === rect.columnStart ? (["Left"] as const) : []),
			];
		case "inner":
			return [
				...(rowIndex < rect.rowEnd ? (["Bottom"] as const) : []),
				...(columnIndex < rect.columnEnd ? (["Right"] as const) : []),
			];
		case "horizontal":
			return rowIndex < rect.rowEnd ? ["Bottom"] : [];
		case "vertical":
			return columnIndex < rect.columnEnd ? ["Right"] : [];
		case "top":
			return rowIndex === rect.rowStart ? ["Top"] : [];
		case "right":
			return columnIndex === rect.columnEnd ? ["Right"] : [];
		case "bottom":
			return rowIndex === rect.rowEnd ? ["Bottom"] : [];
		case "left":
			return columnIndex === rect.columnStart ? ["Left"] : [];
	}
}
