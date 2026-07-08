import type { ReactNode } from "react";
import { AlignCenter, AlignLeft, AlignRight, Columns3, Minus, Rows3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionsSelector, type OptionsSelectorOption } from "@/components/ui/options-selector";
import { Switch } from "@/components/ui/switch";
import { getSingleTableBlockContent } from "../../../api/documentViewApi";
import {
	FormField,
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
						</FormField>
					))}
				</div>
			</div>
		</InspectorSectionCard>
	);
}
