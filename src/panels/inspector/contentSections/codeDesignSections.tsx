import { Button } from "@/components/ui/button";
import type { EditorTextField } from "../../../api/documentApi";
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
	TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX,
	TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX,
	TYPOGRAPHY_SIZE_ROW_WIDTH_PX,
	textDecorationHasLineThrough,
	textDecorationHasUnderline,
	toggleTextDecorationLine,
} from "./shared";

export function CodeTextStyleSection({
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
	const theme = node.code?.theme ?? "light";
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
					{(["light", "dark"] as const).map((t) => (
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
