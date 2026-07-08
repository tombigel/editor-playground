import type { PointerEvent as ReactPointerEvent, Ref } from "react";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Baseline,
	Code2,
	Highlighter,
	Link2,
	List,
	ListOrdered,
	MoveVertical,
	PilcrowLeft,
	PilcrowRight,
	Settings2,
	Columns3,
	Rows3,
	TableProperties,
	Trash2,
	Type,
	UnfoldVertical,
} from "lucide-react";

import { DARK_TOOLTIP_CLASS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import { PopoverTooltip } from "@/components/ui/popover";
import {
	ToolbarControlGroup,
	ToolbarControlRow,
} from "@/components/ui/toolbar-control-group";

import type { listDocumentFontsForPicker } from "../../../api/fontApi";
import type { RichTextBlockType } from "../../../model/types";
import { CODE_LANGUAGE_OPTIONS } from "../../../render/codeHighlight";
import { FontPickerPopover } from "../../../panels/controls/FontControls";
import {
	CompactColorField,
	CompactFontSizeField,
	CompactLineHeightField,
	CompactSelect,
	CompactSpacingField,
	ToolbarButton,
} from "./controls";
import {
	BLOCK_TYPE_OPTIONS,
	ORDERED_MARKER_OPTIONS,
	RICH_SELECT_IDS,
	RICH_VALUE_FIELD_IDS,
	SYSTEM_FONT_VALUE,
	UNORDERED_MARKER_OPTIONS,
	type RichEditSelectId,
	type RichEditValueFieldId,
	type RichToolbarState,
	type ToolbarFontUnit,
	type ToolbarSpacingUnit,
} from "./types";
import { TextAlignButton, ToolbarDragHandle } from "./RichTextToolbarParts";

export function RichTextToolbar({
	mode = "rich",
	toolbarRef,
	toolbarPosition,
	toolbarDragging,
	onToolbarDragPointerDown,
	documentFonts,
	currentFontFamily,
	currentFontWeight,
	onOpenManageFonts,
	resolvedToolbarFontSizeValue,
	openValueFieldId,
	onValueFieldOpenChange,
	resolveFontSizeUnitValue,
	onValueMark,
	onBooleanMark,
	toolbarState,
	openSelectId,
	onSelectOpenChange,
	onLinkAction,
	onUseTextBlock,
	onBlockTypeChange,
	onUseCodeBlock,
	onCodeLanguageChange,
	onUseOrderedList,
	onOrderedMarkerChange,
	onUseUnorderedList,
	onUnorderedMarkerChange,
	onTextAlignChange,
	onDirectionToggle,
	onLineHeightChange,
	currentBlockSpacingValue,
	onBlockSpacingCommit,
	resolveSpacingUnitValue,
	onTableInsertRow,
	onTableRemoveRow,
	onTableInsertColumn,
	onTableRemoveColumn,
	onTableHeaderToggle,
	onTableColumnAlignment,
}: {
		mode?: "rich" | "block" | "list" | "table";
	toolbarRef: Ref<HTMLDivElement>;
	toolbarPosition: { top: number; left: number };
	toolbarDragging: boolean;
	onToolbarDragPointerDown: (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => void;
	documentFonts: ReturnType<typeof listDocumentFontsForPicker>;
	currentFontFamily: string;
	currentFontWeight: number;
	onOpenManageFonts: (options?: { category?: string }) => void;
	resolvedToolbarFontSizeValue: string;
	openValueFieldId: RichEditValueFieldId | null;
	onValueFieldOpenChange: (
		valueFieldId: RichEditValueFieldId,
		open: boolean,
	) => void;
	resolveFontSizeUnitValue: (
		nextUnit: ToolbarFontUnit,
		currentValue: string,
	) => string | null;
	onValueMark: (
		mark:
			| "color"
			| "backgroundColor"
			| "fontFamily"
			| "fontSize"
			| "fontWeight",
		value: string,
	) => void;
	onBooleanMark: (
		mark: "bold" | "italic" | "underline" | "strikethrough",
	) => void;
	toolbarState: RichToolbarState;
	openSelectId: RichEditSelectId | null;
	onSelectOpenChange: (selectId: RichEditSelectId, open: boolean) => void;
	onLinkAction: () => void;
	onUseTextBlock: () => void;
	onBlockTypeChange: (value: RichTextBlockType) => void;
	onUseCodeBlock: () => void;
	onCodeLanguageChange: (value: string) => void;
	onUseOrderedList: () => void;
	onOrderedMarkerChange: (
		value: (typeof ORDERED_MARKER_OPTIONS)[number]["value"],
	) => void;
	onUseUnorderedList: () => void;
	onUnorderedMarkerChange: (
		value: (typeof UNORDERED_MARKER_OPTIONS)[number]["value"],
	) => void;
	onTextAlignChange: (value: "left" | "center" | "right") => void;
	onDirectionToggle: () => void;
	onLineHeightChange: (value: number) => void;
	currentBlockSpacingValue: string;
	onBlockSpacingCommit: (value: string) => void;
	resolveSpacingUnitValue: (
		nextUnit: ToolbarSpacingUnit,
		currentValue: string,
	) => string | null;
	onTableInsertRow?: () => void;
	onTableRemoveRow?: () => void;
	onTableInsertColumn?: () => void;
	onTableRemoveColumn?: () => void;
	onTableHeaderToggle?: () => void;
	onTableColumnAlignment?: (value: "left" | "center" | "right") => void;
}) {
	const {
		boldActive,
		italicActive,
		underlineActive,
		strikethroughActive,
		linkActive,
		structureMode,
		selectedBlockType,
		selectedListKind,
		selectedListMarkerStyle,
		selectedCodeLanguage,
		selectedTextAlign,
		selectedDirection,
		selectedLineHeight,
		currentTextColor,
		currentHighlightColor,
	} = toolbarState;
	const showBlockControls = mode === "rich";
	const showListControls = mode === "rich";
	const showTableControls = mode === "table";

	return (
		<FloatingPanelShell
			ref={toolbarRef}
			suppressPopover
			open
			data-stage-rich-toolbar="true"
			style={{
				top: `${toolbarPosition.top}px`,
				left: `${toolbarPosition.left}px`,
				zIndex: 220,
				width: "max-content",
				maxWidth: "calc(100vw - 32px)",
				pointerEvents: "auto",
			}}
			bodyClassName={mode === "rich" ? "px-2 py-1.5" : "px-2 py-1"}
			bodyStyle={{
				pointerEvents: "auto",
				overflow: "visible",
			}}
			onPointerDown={(event) => {
				event.stopPropagation();
			}}
		>
			<div className="flex items-center gap-2">
				<ToolbarDragHandle
					dragging={toolbarDragging}
					onPointerDown={onToolbarDragPointerDown}
				/>
				<div className="space-y-1.5">
					<ToolbarControlRow>
						<ToolbarControlGroup>
							<div className="w-[136px] shrink-0">
								<FontPickerPopover
									familyValue={currentFontFamily}
									weightValue={currentFontWeight}
									families={documentFonts}
									systemOptionValue={SYSTEM_FONT_VALUE}
									systemLabel="Inherit"
									onFamilyChange={(value) => onValueMark("fontFamily", value)}
									onWeightChange={(value) => onValueMark("fontWeight", value)}
									className="w-full"
									triggerClassName="h-7 text-[12px] [&>svg]:size-3.5"
								/>
							</div>
							{showBlockControls ? (
								<PopoverTooltip
									side="top"
									align="center"
									className={DARK_TOOLTIP_CLASS}
									content={
										<div className="leading-3.5 font-medium">Manage fonts</div>
									}
								>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className="h-7 w-7 rounded-sm"
										aria-label="Manage fonts"
										onClick={() => onOpenManageFonts()}
									>
										<Settings2 className="h-3.5 w-3.5" />
									</Button>
								</PopoverTooltip>
							) : null}
							<CompactFontSizeField
								label="Font size"
								value={resolvedToolbarFontSizeValue}
								width={90}
								onCommit={(value) => onValueMark("fontSize", value)}
								suggestionsOpen={
									openValueFieldId === RICH_VALUE_FIELD_IDS.fontSize
								}
								onSuggestionsOpenChange={(open) =>
									onValueFieldOpenChange(RICH_VALUE_FIELD_IDS.fontSize, open)
								}
								resolveUnitValue={resolveFontSizeUnitValue}
							/>
						</ToolbarControlGroup>
						<ToolbarControlGroup withDividerBefore>
							<ToolbarButton
								label="Bold"
								active={boldActive}
								onActivate={() => onBooleanMark("bold")}
							>
								<span className="font-black tracking-[-0.02em]">B</span>
							</ToolbarButton>
							<ToolbarButton
								label="Italic"
								active={italicActive}
								onActivate={() => onBooleanMark("italic")}
							>
								<span className="font-medium italic">I</span>
							</ToolbarButton>
							<ToolbarButton
								label="Underline"
								active={underlineActive}
								onActivate={() => onBooleanMark("underline")}
							>
								<span className="underline">U</span>
							</ToolbarButton>
							<ToolbarButton
								label="Strikethrough"
								active={strikethroughActive}
								onActivate={() => onBooleanMark("strikethrough")}
							>
								<span className="line-through">S</span>
							</ToolbarButton>
						</ToolbarControlGroup>
						<ToolbarControlGroup withDividerBefore>
							<CompactColorField
								label="Text color"
								value={currentTextColor}
								icon={<Baseline size={14} />}
								onChange={(value) => onValueMark("color", value)}
							/>
							<CompactColorField
								label="Highlight color"
								value={currentHighlightColor}
								icon={<Highlighter size={14} />}
								onChange={(value) => onValueMark("backgroundColor", value)}
							/>
						</ToolbarControlGroup>
						<ToolbarControlGroup withDividerBefore>
							<ToolbarButton
								label="Link"
								active={linkActive}
								onActivate={onLinkAction}
							>
								<Link2 size={14} />
							</ToolbarButton>
						</ToolbarControlGroup>
						{showBlockControls ? (
							<ToolbarControlGroup withDividerBefore>
								<TextAlignButton
									label="Align left"
									active={selectedTextAlign === "left"}
									onActivate={() => onTextAlignChange("left")}
								>
									<AlignLeft size={14} />
								</TextAlignButton>
								<TextAlignButton
									label="Align center"
									active={selectedTextAlign === "center"}
									onActivate={() => onTextAlignChange("center")}
								>
									<AlignCenter size={14} />
								</TextAlignButton>
								<TextAlignButton
									label="Align right"
									active={selectedTextAlign === "right"}
									onActivate={() => onTextAlignChange("right")}
								>
									<AlignRight size={14} />
								</TextAlignButton>
							</ToolbarControlGroup>
						) : null}
					</ToolbarControlRow>
					{showBlockControls || showListControls || showTableControls ? (
						<ToolbarControlRow>
							{showBlockControls ? (
								<ToolbarControlGroup>
									<ToolbarButton
										label={
											selectedDirection === "rtl"
												? "Switch to LTR"
												: "Switch to RTL"
										}
										active={selectedDirection === "rtl"}
										onActivate={onDirectionToggle}
									>
										{selectedDirection === "rtl" ? (
											<PilcrowLeft size={14} />
										) : (
											<PilcrowRight size={14} />
										)}
									</ToolbarButton>
									<ToolbarButton
										label="Use text block"
										active={structureMode === "block"}
										onActivate={onUseTextBlock}
									>
										<Type size={14} />
									</ToolbarButton>
									{structureMode === "block" ? (
										<CompactSelect
											selectId={RICH_SELECT_IDS.blockType}
											open={openSelectId === RICH_SELECT_IDS.blockType}
											onOpenChange={(open) =>
												onSelectOpenChange(RICH_SELECT_IDS.blockType, open)
											}
											label="Block type"
											value={selectedBlockType}
											onValueChange={(value) =>
												onBlockTypeChange(value as RichTextBlockType)
											}
											options={BLOCK_TYPE_OPTIONS.map((option) => ({
												value: option.value,
												label: option.label,
											}))}
											width={112}
										/>
									) : null}
									<ToolbarButton
										label="Use code block"
										active={structureMode === "code-block"}
										onActivate={onUseCodeBlock}
									>
										<Code2 size={14} />
									</ToolbarButton>
									{structureMode === "code-block" ? (
										<CompactSelect
											selectId={RICH_SELECT_IDS.codeLanguage}
											open={openSelectId === RICH_SELECT_IDS.codeLanguage}
											onOpenChange={(open) =>
												onSelectOpenChange(RICH_SELECT_IDS.codeLanguage, open)
											}
											label="Code language"
											value={selectedCodeLanguage || "plaintext"}
											onValueChange={onCodeLanguageChange}
											options={CODE_LANGUAGE_OPTIONS}
											width={110}
										/>
									) : null}
								</ToolbarControlGroup>
							) : null}
							{showListControls ? (
								<ToolbarControlGroup withDividerBefore={showBlockControls}>
									<ToolbarButton
										label="Use ordered list"
										active={selectedListKind === "ol"}
										onActivate={onUseOrderedList}
									>
										<ListOrdered size={14} />
									</ToolbarButton>
									{structureMode === "ol" ? (
										<CompactSelect
											selectId={RICH_SELECT_IDS.orderedListMarker}
											open={openSelectId === RICH_SELECT_IDS.orderedListMarker}
											onOpenChange={(open) =>
												onSelectOpenChange(
													RICH_SELECT_IDS.orderedListMarker,
													open,
												)
											}
											label="Ordered list marker"
											value={
												selectedListKind === "ol"
													? selectedListMarkerStyle || "decimal"
													: "decimal"
											}
											onValueChange={(value) =>
												onOrderedMarkerChange(
													value as (typeof ORDERED_MARKER_OPTIONS)[number]["value"],
												)
											}
											options={ORDERED_MARKER_OPTIONS.map((option) => ({
												value: option.value,
												label: option.label,
											}))}
											width={88}
										/>
									) : null}
									<ToolbarButton
										label="Use unordered list"
										active={selectedListKind === "ul"}
										onActivate={onUseUnorderedList}
									>
										<List size={14} />
									</ToolbarButton>
									{structureMode === "ul" ? (
										<CompactSelect
											selectId={RICH_SELECT_IDS.unorderedListMarker}
											open={
												openSelectId === RICH_SELECT_IDS.unorderedListMarker
											}
											onOpenChange={(open) =>
												onSelectOpenChange(
													RICH_SELECT_IDS.unorderedListMarker,
													open,
												)
											}
											label="Unordered list marker"
											value={
												selectedListKind === "ul"
													? selectedListMarkerStyle || "disc"
													: "disc"
											}
											onValueChange={(value) =>
												onUnorderedMarkerChange(
													value as (typeof UNORDERED_MARKER_OPTIONS)[number]["value"],
												)
											}
											options={UNORDERED_MARKER_OPTIONS.map((option) => ({
												value: option.value,
												label: option.label,
											}))}
											width={92}
										/>
									) : null}
								</ToolbarControlGroup>
							) : null}
							{showBlockControls ? (
								<ToolbarControlGroup withDividerBefore>
									<CompactLineHeightField
										label="Line height"
										icon={<MoveVertical size={14} />}
										value={selectedLineHeight}
										width={72}
										onChange={onLineHeightChange}
									/>
									<CompactSpacingField
										label="Block spacing"
										icon={<UnfoldVertical size={14} />}
										value={currentBlockSpacingValue}
										width={104}
										onCommit={onBlockSpacingCommit}
										resolveUnitValue={resolveSpacingUnitValue}
									/>
								</ToolbarControlGroup>
							) : null}
							{showTableControls ? (
								<>
									<ToolbarControlGroup>
										<ToolbarButton label="Add row" active={false} onActivate={() => onTableInsertRow?.()}>
											<Rows3 size={14} />
										</ToolbarButton>
										<ToolbarButton label="Remove row" active={false} onActivate={() => onTableRemoveRow?.()}>
											<Trash2 size={14} />
										</ToolbarButton>
										<ToolbarButton label="Add column" active={false} onActivate={() => onTableInsertColumn?.()}>
											<Columns3 size={14} />
										</ToolbarButton>
										<ToolbarButton label="Remove column" active={false} onActivate={() => onTableRemoveColumn?.()}>
											<Trash2 size={14} />
										</ToolbarButton>
										<ToolbarButton label="Toggle header row" active={false} onActivate={() => onTableHeaderToggle?.()}>
											<TableProperties size={14} />
										</ToolbarButton>
									</ToolbarControlGroup>
									<ToolbarControlGroup withDividerBefore>
										<TextAlignButton label="Align table columns left" active={false} onActivate={() => onTableColumnAlignment?.("left")}>
											<AlignLeft size={14} />
										</TextAlignButton>
										<TextAlignButton label="Align table columns center" active={false} onActivate={() => onTableColumnAlignment?.("center")}>
											<AlignCenter size={14} />
										</TextAlignButton>
										<TextAlignButton label="Align table columns right" active={false} onActivate={() => onTableColumnAlignment?.("right")}>
											<AlignRight size={14} />
										</TextAlignButton>
									</ToolbarControlGroup>
								</>
							) : null}
						</ToolbarControlRow>
					) : null}
				</div>
			</div>
		</FloatingPanelShell>
	);
}
