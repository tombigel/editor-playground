import type {
	PointerEvent as ReactPointerEvent,
	ReactNode,
	Ref,
} from "react";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Baseline,
	Code2,
	GripVertical,
	Highlighter,
	Link2,
	List,
	ListOrdered,
	MoveVertical,
	PilcrowLeft,
	PilcrowRight,
	Settings2,
	Type,
	UnfoldVertical,
} from "lucide-react";

import { DARK_TOOLTIP_CLASS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import { PopoverTooltip } from "@/components/ui/popover";

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
}: {
	mode?: "rich" | "block";
	toolbarRef: Ref<HTMLDivElement>;
	toolbarPosition: { top: number; left: number };
	toolbarDragging: boolean;
	onToolbarDragPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
	documentFonts: ReturnType<typeof listDocumentFontsForPicker>;
	currentFontFamily: string;
	currentFontWeight: number;
	onOpenManageFonts: () => void;
	resolvedToolbarFontSizeValue: string;
	openValueFieldId: RichEditValueFieldId | null;
	onValueFieldOpenChange: (valueFieldId: RichEditValueFieldId, open: boolean) => void;
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
			bodyClassName="px-2 py-2"
			bodyStyle={{
				pointerEvents: "auto",
				overflow: "visible",
			}}
			onPointerDown={(event) => {
				event.stopPropagation();
			}}
		>
			<div className="flex items-stretch gap-2">
				<button
					type="button"
					aria-label="Drag text toolbar"
					data-stage-rich-toolbar-drag-handle="true"
					data-dragging={toolbarDragging ? "true" : "false"}
					className={
						toolbarDragging
							? "editor-text-muted flex shrink-0 cursor-grabbing select-none touch-none self-center rounded-md px-1 py-2.5"
							: "editor-text-muted flex shrink-0 cursor-grab touch-none self-center rounded-md px-1 py-2.5"
					}
					onClick={(event) => event.preventDefault()}
					onPointerDown={onToolbarDragPointerDown}
				>
					<GripVertical size={16} />
				</button>
				<div className="space-y-1.5">
					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1">
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
										className="h-8 w-8 rounded-sm"
										aria-label="Manage fonts"
										onClick={onOpenManageFonts}
									>
										<Settings2 className="h-3.5 w-3.5" />
									</Button>
								</PopoverTooltip>
							) : null}
						</div>
						<CompactFontSizeField
							label="Font size"
							value={resolvedToolbarFontSizeValue}
							width={90}
							onCommit={(value) => onValueMark("fontSize", value)}
							suggestionsOpen={openValueFieldId === RICH_VALUE_FIELD_IDS.fontSize}
							onSuggestionsOpenChange={(open) =>
								onValueFieldOpenChange(RICH_VALUE_FIELD_IDS.fontSize, open)
							}
							resolveUnitValue={resolveFontSizeUnitValue}
						/>
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
						<ToolbarButton
							label="Link"
							active={linkActive}
							onActivate={onLinkAction}
						>
							<Link2 size={14} />
						</ToolbarButton>
						{showBlockControls ? (
							<>
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
							</>
						) : null}
					</div>
					{showBlockControls ? (
						<div className="flex items-center gap-1.5">
						<ToolbarButton
							label={
								selectedDirection === "rtl" ? "Switch to LTR" : "Switch to RTL"
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
									onSelectOpenChange(RICH_SELECT_IDS.orderedListMarker, open)
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
								open={openSelectId === RICH_SELECT_IDS.unorderedListMarker}
								onOpenChange={(open) =>
									onSelectOpenChange(RICH_SELECT_IDS.unorderedListMarker, open)
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
						</div>
					) : null}
				</div>
			</div>
		</FloatingPanelShell>
	);
}

function TextAlignButton({
	label,
	active,
	onActivate,
	children,
}: {
	label: string;
	active: boolean;
	onActivate: () => void;
	children: ReactNode;
}) {
	return (
		<ToolbarButton label={label} active={active} onActivate={onActivate}>
			{children}
		</ToolbarButton>
	);
}
