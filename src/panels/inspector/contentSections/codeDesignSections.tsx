import { Button } from "@/components/ui/button";
import { RotateCcw, Settings2 } from "lucide-react";
import { listDocumentFontsForPicker } from "../../../api/fontApi";
import type { EditorTextField } from "../../../api/documentApi";
import type { DocumentModel } from "../../../model/types";
import {
	DEFAULT_SHADOW_BLUR_PX,
	DEFAULT_SHADOW_COLOR,
	DEFAULT_SHADOW_OFFSET_X_PX,
	DEFAULT_SHADOW_OFFSET_Y_PX,
	DEFAULT_SHADOW_SPREAD_PX,
} from "../../../api/documentViewApi";
import {
	BOLD_FONT_WEIGHT,
	DEFAULT_FONT_WEIGHT,
	isBoldFontWeight,
} from "../../../fonts/weights";
import {
	BorderControlGroup,
	FontSizeField,
	FormField,
	HoverColorField,
	NumberInput,
	readShadowFieldValues,
	ShadowControlGroup,
	TextStyleIconButton,
} from "../../InspectorControls";
import {
	createFocusedModeEntry,
	InspectorSectionCard,
} from "../CommonSections";
import {
	readUnifiedBorderColor,
	readUnifiedBorderRadius,
	readUnifiedBorderWidth,
} from "../stageConversions";
import {
	applyLeafShadowPatch,
	applyUnifiedLeafBorderColor,
	applyUnifiedLeafBorderRadius,
	applyUnifiedLeafBorderWidth,
} from "../styleFields";
import type { TextInspectorNode } from "../types";
import {
	createShadowFallback,
	type FocusModeCardProps,
	fontSizeFieldValueFromNode,
	lineHeightValue,
	TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX,
	TYPOGRAPHY_FONT_PICKER_WIDTH_PX,
	TYPOGRAPHY_FONT_ROW_WIDTH_PX,
	TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX,
	TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX,
	TYPOGRAPHY_SIZE_ROW_WIDTH_PX,
	textDecorationHasLineThrough,
	textDecorationHasUnderline,
	toggleTextDecorationLine,
} from "./shared";
import { FontPickerPopover } from "../../controls/FontControls";

const SYSTEM_MONO_FONT_VALUE = "__system_mono__";
const CODE_FONT_FAMILY_NAMES = new Set([
	"JetBrains Mono",
	"Fira Code",
	"Source Code Pro",
	"IBM Plex Mono",
	"Roboto Mono",
	"Cascadia Code",
]);

export function CodeTextStyleSection({
	document,
	node,
	onTextChange,
	onResetCodeBlockStyle,
	onOpenManageFonts,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "space-y-2.5 px-3 pt-1.5 pb-3",
}: {
	document: DocumentModel;
	node: TextInspectorNode;
	onTextChange: (field: EditorTextField, value: string) => void;
	onResetCodeBlockStyle?: () => void;
	onOpenManageFonts?: (options?: { category?: string }) => void;
} & FocusModeCardProps) {
	const theme = node.code?.theme ?? "auto";
	const codeBlock =
		node.content.blocks[0]?.type === "code-block"
			? node.content.blocks[0]
			: undefined;
	const tabSize = node.style?.tabSize ?? codeBlock?.style?.tabSize ?? 2;
	const currentFamily = node.style?.fontFamily ?? SYSTEM_MONO_FONT_VALUE;
	const documentFonts = listDocumentFontsForPicker(document);
	const codeFonts = documentFonts.filter(
		(family) =>
			CODE_FONT_FAMILY_NAMES.has(family.family) ||
			family.category === "monospace" ||
			family.family === node.style?.fontFamily,
	);
	const currentWeight = node.style?.fontWeight ?? DEFAULT_FONT_WEIGHT;
	return (
		<InspectorSectionCard
			title="Text style"
			headerContent={headerContent}
			headerAction={headerAction}
			contentClassName={contentClassName}
			focusedModeEntry={createFocusedModeEntry(
				focusedMode ?? null,
				"design",
				onEnterFocusedMode,
			)}
		>
			<FormField
				label="Font"
				layout="inline-group"
				controlWidth={`${TYPOGRAPHY_FONT_ROW_WIDTH_PX}px`}
				controlClassName="gap-1"
			>
				<div
					className="shrink-0"
					style={{ width: `${TYPOGRAPHY_FONT_PICKER_WIDTH_PX}px` }}
				>
					<FontPickerPopover
						familyValue={currentFamily}
						weightValue={currentWeight}
						families={codeFonts}
						systemOptionValue={SYSTEM_MONO_FONT_VALUE}
						systemLabel="System Mono"
						onFamilyChange={(value) =>
							onTextChange(
								"fontFamily",
								value === SYSTEM_MONO_FONT_VALUE ? "" : value,
							)
						}
						onWeightChange={(value) => onTextChange("fontWeight", value)}
						className="w-full"
					/>
				</div>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="h-8 w-8 rounded-sm"
					aria-label="More monospace fonts"
					onClick={() => onOpenManageFonts?.({ category: "monospace" })}
				>
					<Settings2 className="h-3.5 w-3.5" />
				</Button>
			</FormField>
			<FormField
				label="Size"
				layout="inline-group"
				controlWidth={`${TYPOGRAPHY_SIZE_ROW_WIDTH_PX}px`}
			>
				<div
					className="grid w-full items-center gap-1"
					style={{
						gridTemplateColumns: `${TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX}px ${TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX}px`,
					}}
				>
					<div
						className="shrink-0"
						style={{ width: `${TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX}px` }}
					>
						<FontSizeField
							nodeId={node.id}
							value={fontSizeFieldValueFromNode(node)}
							onChange={(value) => onTextChange("fontSize", value)}
						/>
					</div>
					<div
						className="shrink-0"
						style={{ width: `${TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX}px` }}
					>
						<NumberInput
							value={lineHeightValue(node)}
							min={0.1}
							max={4}
							step={0.1}
							onChange={(value) => onTextChange("lineHeight", String(value))}
						/>
					</div>
				</div>
			</FormField>
			<FormField
				label="Style"
				layout="inline-group"
				controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
				controlClassName="gap-1"
			>
				<TextStyleIconButton
					label="Bold"
					active={isBoldFontWeight(node.style?.fontWeight)}
					onClick={() =>
						onTextChange(
							"fontWeight",
							String(
								isBoldFontWeight(node.style?.fontWeight)
									? DEFAULT_FONT_WEIGHT
									: BOLD_FONT_WEIGHT,
							),
						)
					}
				>
					<span className="font-black tracking-[-0.02em]">B</span>
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Italic"
					active={node.style?.fontStyle === "italic"}
					onClick={() =>
						onTextChange(
							"fontStyle",
							node.style?.fontStyle === "italic" ? "normal" : "italic",
						)
					}
				>
					<span className="font-medium italic">I</span>
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Underline"
					active={textDecorationHasUnderline(node)}
					onClick={() =>
						onTextChange(
							"textDecorationLine",
							toggleTextDecorationLine(
								node.style?.textDecorationLine,
								"underline",
							),
						)
					}
				>
					<span className="underline">U</span>
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Strikethrough"
					active={textDecorationHasLineThrough(node)}
					onClick={() =>
						onTextChange(
							"textDecorationLine",
							toggleTextDecorationLine(
								node.style?.textDecorationLine,
								"line-through",
							),
						)
					}
				>
					<span className="line-through">S</span>
				</TextStyleIconButton>
			</FormField>
			<FormField
				label="Theme"
				layout="inline-group"
				controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
			>
				<div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
					{(["auto", "light", "dark"] as const).map((t) => (
						<Button
							key={t}
							type="button"
							variant={theme === t ? "default" : "ghost"}
							size="sm"
							className="h-6 rounded-md px-2 text-[11px] capitalize"
							onClick={() => onTextChange("codeTheme", t)}
						>
							{t}
						</Button>
					))}
				</div>
			</FormField>
			<FormField
				label="Tab"
				layout="inline"
				controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
			>
				<NumberInput
					value={tabSize}
					min={1}
					max={8}
					step={1}
					onChange={(value) => onTextChange("tabSize", String(value))}
				/>
			</FormField>
			{onResetCodeBlockStyle ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 w-full justify-start rounded-sm text-[11px]"
					onClick={onResetCodeBlockStyle}
				>
					<RotateCcw className="h-3.5 w-3.5" />
					Reset code styling
				</Button>
			) : null}
		</InspectorSectionCard>
	);
}

export function CodeDesignSection({
	node,
	onTextChange,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "space-y-2.5 px-3 pt-1.5 pb-3",
}: {
	node: TextInspectorNode;
	onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
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
			<FormField label="Background" layout="inline" controlClassName="gap-2">
				<HoverColorField
					value={node.style?.background}
					onChange={(value) => onTextChange("background", value)}
					ariaLabel="Code block background"
					fallback="transparent"
				/>
			</FormField>
			<div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
				<span className="editor-text-strong pt-1 text-[11px] font-medium">
					Border
				</span>
				<BorderControlGroup
					nodeId={node.id}
					colorValue={readUnifiedBorderColor(node.style)}
					widthValue={readUnifiedBorderWidth(node.style)}
					radiusValue={readUnifiedBorderRadius(node.style)}
					onColorChange={(value) =>
						applyUnifiedLeafBorderColor(onTextChange, value)
					}
					onWidthChange={(value) =>
						applyUnifiedLeafBorderWidth(onTextChange, value)
					}
					onRadiusChange={(value) =>
						applyUnifiedLeafBorderRadius(onTextChange, value)
					}
				/>
			</div>
			<div className="space-y-1.5">
				<ShadowControlGroup
					color={shadow.color}
					blur={shadow.blur}
					distance={shadow.distance}
					angle={shadow.angle}
					colorFallback={shadowFallback.color}
					onColorChange={(value) =>
						applyLeafShadowPatch(onTextChange, node.style, shadowFallback, {
							color: value,
						})
					}
					onBlurChange={(value) =>
						applyLeafShadowPatch(onTextChange, node.style, shadowFallback, {
							blur: value,
						})
					}
					onDistanceChange={(value) =>
						applyLeafShadowPatch(onTextChange, node.style, shadowFallback, {
							distance: value,
						})
					}
					onAngleChange={(value) =>
						applyLeafShadowPatch(onTextChange, node.style, shadowFallback, {
							angle: value,
						})
					}
				/>
			</div>
		</InspectorSectionCard>
	);
}
