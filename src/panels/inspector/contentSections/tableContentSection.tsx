import type { ReactNode } from "react";
import { AlignCenter, AlignLeft, AlignRight, Columns3, Minus, Rows3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionsSelector, type OptionsSelectorOption } from "@/components/ui/options-selector";
import { Switch } from "@/components/ui/switch";
import { getSingleTableBlockContent } from "../../../api/documentViewApi";
import {
	FormField,
	HoverColorField,
	InspectorFieldGroup,
} from "../../InspectorControls";
import {
	createFocusedModeEntry,
	InspectorSectionCard,
} from "../CommonSections";
import type { InspectorActionHandlers, TextInspectorNode } from "../types";
import {
	type FocusModeCardProps,
	TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX,
} from "./shared";

const ALIGNMENT_OPTIONS: OptionsSelectorOption[] = [
	{
		value: "default",
		label: "Default",
		ariaLabel: "Use default column alignment",
		icon: <Minus className="h-3.5 w-3.5" />,
	},
	{
		value: "left",
		label: "Left",
		ariaLabel: "Align column left",
		icon: <AlignLeft className="h-3.5 w-3.5" />,
	},
	{
		value: "center",
		label: "Center",
		ariaLabel: "Align column center",
		icon: <AlignCenter className="h-3.5 w-3.5" />,
	},
	{
		value: "right",
		label: "Right",
		ariaLabel: "Align column right",
		icon: <AlignRight className="h-3.5 w-3.5" />,
	},
];

const DIRECTION_OPTIONS: OptionsSelectorOption[] = [
	{ value: "default", label: "Default", ariaLabel: "Use default table direction" },
	{ value: "ltr", label: "LTR", ariaLabel: "Use left-to-right table direction" },
	{ value: "rtl", label: "RTL", ariaLabel: "Use right-to-left table direction" },
];

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
					<FormField label="Direction" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
						<OptionsSelector
							ariaLabel="Table direction"
							size="compact"
							value={tableBlock?.direction ?? "default"}
							options={DIRECTION_OPTIONS}
							onValueChange={(value) =>
								actions.onSetTableDirection?.(
									node.id,
									value === "ltr" || value === "rtl" ? value : null,
								)
							}
						/>
					</FormField>

					<InspectorFieldGroup className="grid grid-cols-2 gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => actions.onInsertTableRow?.(node.id, rowCount)}
					>
						<Rows3 className="h-3.5 w-3.5" />
						Add row
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
							disabled={rowCount <= 1}
							onClick={() => actions.onRemoveTableRow?.(node.id, rowCount - 1)}
							aria-label="Remove row"
						>
							<Trash2 className="h-3.5 w-3.5" />
							Remove row
						</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => actions.onInsertTableColumn?.(node.id, columnCount)}
					>
						<Columns3 className="h-3.5 w-3.5" />
						Add column
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
							disabled={columnCount <= 1}
							onClick={() => actions.onRemoveTableColumn?.(node.id, columnCount - 1)}
							aria-label="Remove column"
						>
							<Trash2 className="h-3.5 w-3.5" />
							Remove column
						</Button>
				</InspectorFieldGroup>

					<div className="space-y-2">
						{Array.from({ length: columnCount }, (_, index) => (
							<FormField
								// biome-ignore lint/suspicious/noArrayIndexKey: table columns are positional controls without stable ids.
									key={index}
									label={`Column ${index + 1}`}
								layout="inline"
								controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
							>
								<div className="flex w-full items-center gap-1">
									<OptionsSelector
										ariaLabel={`Column ${index + 1} alignment`}
										display="icon"
										size="compact"
										value={tableBlock?.columnAlignments?.[index] ?? "default"}
										options={ALIGNMENT_OPTIONS}
										onValueChange={(value) =>
											actions.onSetTableColumnAlignment?.(
												node.id,
												index,
												value === "center" || value === "right" || value === "left" ? value : null,
											)
										}
									/>
									<Input
										className="h-7 w-16 text-[11px]"
										value={tableBlock?.columnWidths?.[index] ?? ""}
										placeholder="auto"
										aria-label={`Column ${index + 1} width`}
										onChange={(event) =>
											actions.onSetTableColumnWidth?.(
												node.id,
												index,
												normalizeOptionalValue(event.currentTarget.value),
											)
										}
									/>
								</div>
						</FormField>
					))}
				</div>
					<div className="space-y-2">
						{Array.from({ length: rowCount }, (_, index) => (
							<FormField
								// biome-ignore lint/suspicious/noArrayIndexKey: table rows are positional controls without stable ids.
								key={index}
								label={`Row ${index + 1}`}
								layout="inline"
								controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
							>
								<Input
									className="h-7 w-full text-[11px]"
									value={tableBlock?.rowHeights?.[index] ?? ""}
									placeholder="auto"
									aria-label={`Row ${index + 1} height`}
									onChange={(event) =>
										actions.onSetTableRowHeight?.(
											node.id,
											index,
											normalizeOptionalValue(event.currentTarget.value),
										)
									}
								/>
							</FormField>
						))}
					</div>
					<div className="editor-border-subtle space-y-2.5 border-t pt-2.5">
						<FormField label="Table background" layout="inline" controlClassName="gap-2">
							<HoverColorField
								value={tableBlock?.style?.tableBackground}
								onChange={(value) => actions.onSetTableStyle?.(node.id, { tableBackground: value })}
								ariaLabel="Table background"
								fallback="transparent"
							/>
						</FormField>
						<FormField label="Table border" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
							<div className="flex w-full items-center gap-1">
								<Input
									className="h-7 w-16 text-[11px]"
									value={tableBlock?.style?.tableBorderWidth ?? ""}
									placeholder="0"
									aria-label="Table border width"
									onChange={(event) => actions.onSetTableStyle?.(node.id, { tableBorderWidth: normalizeOptionalValue(event.currentTarget.value) })}
								/>
								<HoverColorField
									value={tableBlock?.style?.tableBorderColor}
									onChange={(value) => actions.onSetTableStyle?.(node.id, { tableBorderColor: value })}
									ariaLabel="Table border color"
									fallback="transparent"
								/>
							</div>
						</FormField>
						<FormField label="Cell padding" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
							<Input
								className="h-7 w-full text-[11px]"
								value={tableBlock?.style?.cellPadding ?? ""}
								placeholder="default"
								aria-label="Cell padding"
								onChange={(event) => actions.onSetTableStyle?.(node.id, { cellPadding: normalizeOptionalValue(event.currentTarget.value) })}
							/>
						</FormField>
						<FormField label="Cell border" layout="inline" controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}>
							<div className="flex w-full items-center gap-1">
								<Input
									className="h-7 w-16 text-[11px]"
									value={tableBlock?.style?.cellBorderWidth ?? ""}
									placeholder="0"
									aria-label="Cell border width"
									onChange={(event) => actions.onSetTableStyle?.(node.id, { cellBorderWidth: normalizeOptionalValue(event.currentTarget.value) })}
								/>
								<HoverColorField
									value={tableBlock?.style?.cellBorderColor}
									onChange={(value) => actions.onSetTableStyle?.(node.id, { cellBorderColor: value })}
									ariaLabel="Cell border color"
									fallback="transparent"
								/>
							</div>
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
			</div>
		</InspectorSectionCard>
	);
}
