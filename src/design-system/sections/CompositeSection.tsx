import {
	AlignCenter,
	AlignCenterHorizontal,
	AlignCenterVertical,
	AlignEndHorizontal,
	AlignEndVertical,
	AlignHorizontalDistributeCenter,
	AlignHorizontalDistributeEnd,
	AlignHorizontalDistributeStart,
	AlignLeft,
	AlignRight,
	AlignStartHorizontal,
	AlignStartVertical,
	AlignVerticalDistributeCenter,
	AlignVerticalDistributeEnd,
	AlignVerticalDistributeStart,
	ArrowBigDown,
	ArrowBigDownDash,
	ArrowBigUp,
	ArrowBigUpDash,
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Clipboard,
	Eye,
	FileDown,
	Keyboard,
	PanelRightClose,
	PilcrowRight,
	Settings2,
	SquareArrowOutUpRight,
	SquareArrowRightEnter,
	Type,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	BorderControlGroup,
	FontPickerPopover,
	FontSizeField,
	FormField,
	HoverColorField,
	InspectorInlineRow,
	NumberInput,
	OrderIconButton,
	ShadowControlGroup,
	SizeInlineField,
	TextStyleIconButton,
	WrapperActions,
} from "@/panels/InspectorControls";
import { EditableNodeTitle } from "@/panels/inspector/CommonSections";
import {
	NavigationFields,
	TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX,
	TYPOGRAPHY_FONT_PICKER_WIDTH_PX,
	TYPOGRAPHY_FONT_ROW_WIDTH_PX,
	TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX,
	TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX,
	TYPOGRAPHY_SIZE_ROW_WIDTH_PX,
} from "@/panels/inspector/contentSections/shared";
import type {
	LinkInspectorNode,
	WrapperInspectorNode,
} from "@/panels/inspector/types";
import {
	AccentSwatchRow,
	ActionRow,
	NumericRow,
	SettingRow,
	ThemePresetRow,
} from "@/panels/settings/SettingsShared";
import {
	mockDocument,
	mockFontFamilies,
	mockImageLeaf,
	mockLinkLeaf,
	mockSection,
	mockTextLeaf,
} from "../mocks";
import { ComponentPreview } from "../previews/ComponentPreview";

// ---------------------------------------------------------------------------
// Interactive demo wrappers
// ---------------------------------------------------------------------------

function ShadowControlDemo() {
	const [color, setColor] = useState("rgba(18, 32, 51, 0.14)");
	const [blur, setBlur] = useState(16);
	const [spread, setSpread] = useState(0);
	const [distance, setDistance] = useState(8);
	const [angle, setAngle] = useState(180);
	return (
		<ShadowControlGroup
			color={color}
			blur={blur}
			spread={spread}
			distance={distance}
			angle={angle}
			onColorChange={setColor}
			onBlurChange={setBlur}
			onSpreadChange={setSpread}
			onDistanceChange={setDistance}
			onAngleChange={setAngle}
			colorFallback="rgba(18, 32, 51, 0.14)"
			supportsSpread
		/>
	);
}

function BorderControlDemo() {
	const [color, setColor] = useState("#d8e0ea");
	const [width, setWidth] = useState("1px");
	const [radius, setRadius] = useState("16px");
	return (
		<div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
			<Label className="mt-2 text-[11px] font-medium">Border</Label>
			<BorderControlGroup
				nodeId="demo"
				colorValue={color}
				widthValue={width}
				radiusValue={radius}
				onColorChange={setColor}
				onWidthChange={setWidth}
				onRadiusChange={setRadius}
			/>
		</div>
	);
}

function TextStyleFieldsDemo() {
	const [bold, setBold] = useState(false);
	const [italic, setItalic] = useState(false);
	const [underline, setUnderline] = useState(false);
	const [strikethrough, setStrikethrough] = useState(false);
	const [align, setAlign] = useState<"left" | "center" | "right">("left");
	const [color, setColor] = useState("#172033");

	return (
		<div className="w-[300px] space-y-2.5">
			{/* Font */}
			<InspectorInlineRow
				label="Font"
				controlWidth={`${TYPOGRAPHY_FONT_ROW_WIDTH_PX}px`}
				controlClassName="gap-1"
			>
				<div
					className="shrink-0"
					style={{ width: `${TYPOGRAPHY_FONT_PICKER_WIDTH_PX}px` }}
				>
					<FontPickerPopover
						familyValue="Inter"
						weightValue={bold ? 700 : 400}
						families={mockFontFamilies}
						systemOptionValue="__system-font__"
						onFamilyChange={() => {}}
						onWeightChange={() => {}}
						className="w-full"
						recentFamilyNames={[]}
						onRecentFamiliesChange={() => {}}
						previewStylesheetHref={null}
					/>
				</div>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="h-8 w-8 rounded-sm"
					aria-label="Manage fonts"
				>
					<Settings2 className="h-3.5 w-3.5" />
				</Button>
			</InspectorInlineRow>

			{/* Size + Line height */}
			<InspectorInlineRow
				label="Size"
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
						<FontSizeField nodeId="demo" value="18px" onChange={() => {}} />
					</div>
					<div
						className="shrink-0"
						style={{ width: `${TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX}px` }}
					>
						<NumberInput
							value={1.4}
							min={0.1}
							max={4}
							step={0.1}
							onChange={() => {}}
						/>
					</div>
				</div>
			</InspectorInlineRow>

			{/* Style B / I / U / S */}
			<InspectorInlineRow
				label="Style"
				controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
				controlClassName="gap-1"
			>
				<TextStyleIconButton
					label="Bold"
					active={bold}
					onClick={() => setBold((v) => !v)}
				>
					<span className="font-black tracking-[-0.02em] no-underline decoration-transparent">
						B
					</span>
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Italic"
					active={italic}
					onClick={() => setItalic((v) => !v)}
				>
					<span className="font-medium italic">I</span>
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Underline"
					active={underline}
					onClick={() => setUnderline((v) => !v)}
				>
					<span className="underline">U</span>
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Strikethrough"
					active={strikethrough}
					onClick={() => setStrikethrough((v) => !v)}
				>
					<span className="line-through">S</span>
				</TextStyleIconButton>
			</InspectorInlineRow>

			{/* Align */}
			<InspectorInlineRow
				label="Align"
				controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
				controlClassName="gap-1"
			>
				<TextStyleIconButton
					label="Align left"
					active={align === "left"}
					onClick={() => setAlign("left")}
				>
					<AlignLeft className="h-4 w-4" />
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Align center"
					active={align === "center"}
					onClick={() => setAlign("center")}
				>
					<AlignCenter className="h-4 w-4" />
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Align right"
					active={align === "right"}
					onClick={() => setAlign("right")}
				>
					<AlignRight className="h-4 w-4" />
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Text direction"
					active={false}
					onClick={() => {}}
				>
					<PilcrowRight className="h-4 w-4" />
				</TextStyleIconButton>
			</InspectorInlineRow>

			{/* Color */}
			<InspectorInlineRow label="Color" controlClassName="gap-2">
				<HoverColorField
					value={color}
					onChange={setColor}
					ariaLabel="Text color"
				/>
			</InspectorInlineRow>
		</div>
	);
}

function SettingsDemo() {
	const [previewSticky, setPreviewSticky] = useState(true);
	const [mode, setMode] = useState<"light" | "dark" | "auto">("auto");
	const [lightTheme, setLightTheme] = useState<
		"air" | "paper" | "midday" | "clarity"
	>("air");
	const [darkTheme, setDarkTheme] = useState<
		"graphite" | "monokai" | "midnight" | "ink"
	>("monokai");
	const [accent, setAccent] = useState("#1668ff");
	const [historyLimit, setHistoryLimit] = useState(100);
	const resolvedTheme = mode === "auto" ? "light" : mode;

	return (
		<div className="space-y-8">
			{/* Appearance */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Appearance (theme + accent)
				</div>
				<ThemePresetRow
					themeMode={mode}
					resolvedTheme={resolvedTheme}
					lightTheme={lightTheme}
					darkTheme={darkTheme}
					onThemeModeChange={setMode}
					onLightThemeChange={setLightTheme}
					onDarkThemeChange={setDarkTheme}
				/>
				<AccentSwatchRow value={accent} onChange={setAccent} />
			</div>

			{/* Toggle item */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Toggle item (SettingRow)
				</div>
				<SettingRow
					icon={Eye}
					title="Sticky preview"
					description="Applies CSS sticky behavior in preview."
					checked={previewSticky}
					onCheckedChange={setPreviewSticky}
				/>
			</div>

			{/* Action items */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Action items (ActionRow)
				</div>
				<ActionRow
					icon={FileDown}
					title="Save JSON"
					description="Uses the browser save picker when available."
					actions={
						<Button type="button" variant="outline" size="sm">
							Save JSON
						</Button>
					}
				/>
				<ActionRow
					icon={Clipboard}
					title="Copy JSON"
					description="Copies the current document model to the clipboard."
					actions={
						<Button type="button" variant="outline" size="sm">
							Copy JSON
						</Button>
					}
				/>
			</div>

			{/* Numeric items */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Numeric items (NumericRow)
				</div>
				<NumericRow
					title="Undo retention"
					description="Current stack: 42 undo / 3 redo"
					value={historyLimit}
					onChange={setHistoryLimit}
				/>
			</div>

			{/* Action with destructive */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Destructive action items
				</div>
				<ActionRow
					title="Reset stage"
					description="Reset document data, or reset data plus editor preferences."
					actions={
						<div className="flex gap-2">
							<Button type="button" variant="outline" size="sm">
								Reset data
							</Button>
							<Button type="button" variant="destructive" size="sm">
								Reset all
							</Button>
						</div>
					}
				/>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function CompositeSection() {
	return (
		<div>
			{/* ---- COMPOSITES ---- */}

			{/* Inspector Title */}
			<ComponentPreview
				id="composite-inspector-title"
				name="Inspector Title"
				description="Inspector summary header: editable node name, role badge, and collapse button."
				sourceFile="src/panels/inspector/CommonSections.tsx"
				props={[
					{
						name: "node",
						type: "InspectorNode | null",
						description: "The node to display summary for.",
					},
				]}
			>
				<div className="w-[300px]">
					{/* Name row with collapse button */}
					<div className="flex items-start justify-between gap-2 p-2.5">
						<div className="min-w-0 flex-1">
							<EditableNodeTitle name="Sticky Edge Lab" onCommit={() => {}} />
							<div className="mt-1">
								<span className="editor-pill-subtle inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium">
									section
								</span>
							</div>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="editor-icon-button-subtle h-7 w-7 rounded-md border"
							aria-label="Collapse inspector"
						>
							<PanelRightClose className="h-3.5 w-3.5" />
						</Button>
					</div>

					{/* Section card with focused-mode icon */}
					<div className="editor-text-muted mb-2 mt-3 text-[11px] font-medium">
						Section Card
					</div>
					<Card className="editor-border-subtle rounded-lg shadow-none">
						<CardHeader className="flex flex-row items-start justify-between gap-2 px-3 pt-3 pb-1">
							<CardTitle className="text-xs">Layout</CardTitle>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="editor-icon-button-subtle h-7 w-7 rounded-md border"
								aria-label="Go to Layout"
							>
								<SquareArrowOutUpRight className="h-3.5 w-3.5" />
							</Button>
						</CardHeader>
						<CardContent className="px-3 pt-1.5 pb-3">
							<div className="editor-text-muted text-[11px]">
								Card content area
							</div>
						</CardContent>
					</Card>
				</div>
			</ComponentPreview>

			{/* Shadow Control */}
			<ComponentPreview
				id="composite-shadow-control"
				name="Shadow Control"
				description="Color + blur + spread + distance + angle composite for box-shadow editing."
				sourceFile="src/panels/InspectorControls.tsx"
				props={[
					{ name: "color", type: "string", description: "Shadow color." },
					{
						name: "blur",
						type: "number",
						description: "Blur radius in px.",
					},
					{
						name: "spread",
						type: "number",
						description: "Spread radius (optional).",
					},
					{
						name: "distance",
						type: "number",
						description: "Shadow distance in px.",
					},
					{
						name: "angle",
						type: "number",
						description: "Shadow angle 0-360.",
					},
					{
						name: "supportsSpread",
						type: "boolean",
						default: "false",
						description: "Show spread field.",
					},
				]}
			>
				<div className="w-[300px]">
					<ShadowControlDemo />
				</div>
			</ComponentPreview>

			{/* Border Control */}
			<ComponentPreview
				id="composite-border-control"
				name="Border Control"
				description="Color + width + radius composite for border editing. Label and color aligned inline like shadow control."
				sourceFile="src/panels/InspectorControls.tsx"
				props={[
					{
						name: "colorValue",
						type: "string",
						description: "Border color.",
					},
					{
						name: "widthValue",
						type: "string",
						description: "Border width with unit.",
					},
					{
						name: "radiusValue",
						type: "string",
						description: "Border radius with unit.",
					},
				]}
			>
				<div className="w-[300px]">
					<BorderControlDemo />
				</div>
			</ComponentPreview>

			{/* Text Style */}
			<ComponentPreview
				id="composite-text-style"
				name="Text Style"
				description="Inspector typography control rail: font picker + manage button, size + line-height, style (B/I/U/S), alignment + direction, and text color. Each row uses InspectorInlineRow."
				sourceFile="src/panels/inspector/contentSections/shared.tsx"
				props={[]}
			>
				<TextStyleFieldsDemo />
			</ComponentPreview>

			{/* Layout Controls */}
			<ComponentPreview
				id="composite-layout-controls"
				name="Layout Controls"
				description="Position/size fields, alignment, distribution, and reorder controls used in single- and multi-select inspectors."
				sourceFile="src/panels/inspector/CommonSections.tsx, src/panels/MultiSelectInspector.tsx"
				props={[]}
			>
				<div className="w-[300px] space-y-4">
					{/* XYWH */}
					<div className="space-y-1">
						<Label className="text-[11px] font-medium">Position / Size</Label>
						<div className="grid grid-cols-2 gap-1.5">
							<SizeInlineField
								label="X"
								nodeId="demo"
								value="120px"
								onChange={() => {}}
								axis="x"
							/>
							<SizeInlineField
								label="Y"
								nodeId="demo"
								value="80px"
								onChange={() => {}}
								axis="y"
							/>
							<SizeInlineField
								label="W"
								nodeId="demo"
								value="320px"
								onChange={() => {}}
								axis="width"
							/>
							<SizeInlineField
								label="H"
								nodeId="demo"
								value="auto"
								onChange={() => {}}
								axis="height"
							/>
						</div>
					</div>

					{/* Align */}
					<div className="space-y-0.5">
						<Label className="text-[11px] font-medium">Align</Label>
						<div className="flex flex-wrap gap-1">
							<TextStyleIconButton
								label="Align left"
								active={false}
								onClick={() => {}}
							>
								<AlignStartVertical className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align center"
								active={false}
								onClick={() => {}}
							>
								<AlignCenterVertical className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align right"
								active={false}
								onClick={() => {}}
							>
								<AlignEndVertical className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align top"
								active={false}
								onClick={() => {}}
							>
								<AlignStartHorizontal className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align middle"
								active={false}
								onClick={() => {}}
							>
								<AlignCenterHorizontal className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align bottom"
								active={false}
								onClick={() => {}}
							>
								<AlignEndHorizontal className="h-4 w-4" />
							</TextStyleIconButton>
						</div>
					</div>

					{/* Distribute */}
					<div className="space-y-0.5">
						<Label className="text-[11px] font-medium">Distribute</Label>
						<div className="flex flex-wrap gap-1">
							<TextStyleIconButton
								label="Distribute horizontal"
								active={false}
								onClick={() => {}}
							>
								<AlignHorizontalDistributeCenter className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute vertical"
								active={false}
								onClick={() => {}}
							>
								<AlignVerticalDistributeCenter className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute left"
								active={false}
								onClick={() => {}}
							>
								<AlignHorizontalDistributeStart className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute right"
								active={false}
								onClick={() => {}}
							>
								<AlignHorizontalDistributeEnd className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute top"
								active={false}
								onClick={() => {}}
							>
								<AlignVerticalDistributeStart className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute bottom"
								active={false}
								onClick={() => {}}
							>
								<AlignVerticalDistributeEnd className="h-4 w-4" />
							</TextStyleIconButton>
						</div>
					</div>

					{/* Reorder */}
					<div className="space-y-0.5">
						<Label className="text-[11px] font-medium">Reorder</Label>
						<div className="flex gap-1.5">
							<OrderIconButton
								label="Position Forward"
								shortcut="Mod+]"
								onClick={() => {}}
							>
								<ArrowBigUp className="h-4 w-4" />
							</OrderIconButton>
							<OrderIconButton
								label="Bring to Front"
								shortcut="Mod+Shift+]"
								onClick={() => {}}
							>
								<ArrowBigUpDash className="h-4 w-4" />
							</OrderIconButton>
							<OrderIconButton
								label="Position Backward"
								shortcut="Mod+["
								onClick={() => {}}
							>
								<ArrowBigDown className="h-4 w-4" />
							</OrderIconButton>
							<OrderIconButton
								label="Send to Back"
								shortcut="Mod+Shift+["
								onClick={() => {}}
							>
								<ArrowBigDownDash className="h-4 w-4" />
							</OrderIconButton>
						</div>
					</div>
				</div>
			</ComponentPreview>

			{/* Section Layout */}
			<ComponentPreview
				id="composite-section-layout"
				name="Section Layout"
				description="Section-specific layout controls: padding (4-directional), section reorder, and section type selector (section/header/footer)."
				sourceFile="src/panels/inspector/CommonSections.tsx, src/panels/InspectorControls.tsx"
				props={[]}
			>
				<div className="w-[300px] space-y-4">
					{/* Padding */}
					<div className="space-y-1.5">
						<Label className="text-[11px] font-medium">Padding</Label>
						<div className="grid grid-cols-2 gap-1.5">
							<div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
								<ArrowUp className="h-3.5 w-3.5" role="presentation" />
								<SizeInlineField
									label=""
									nodeId="demo"
									value="24px"
									onChange={() => {}}
									axis="y"
								/>
							</div>
							<div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
								<ArrowRight className="h-3.5 w-3.5" role="presentation" />
								<SizeInlineField
									label=""
									nodeId="demo"
									value="32px"
									onChange={() => {}}
									axis="x"
								/>
							</div>
							<div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
								<ArrowDown className="h-3.5 w-3.5" role="presentation" />
								<SizeInlineField
									label=""
									nodeId="demo"
									value="24px"
									onChange={() => {}}
									axis="y"
								/>
							</div>
							<div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
								<ArrowLeft className="h-3.5 w-3.5" role="presentation" />
								<SizeInlineField
									label=""
									nodeId="demo"
									value="32px"
									onChange={() => {}}
									axis="x"
								/>
							</div>
						</div>
					</div>

					{/* Section type + order */}
					<WrapperActions
						node={mockSection as WrapperInspectorNode}
						canSectionBack={false}
						canSectionForward={true}
						onSectionBack={() => {}}
						onSectionForward={() => {}}
						onPromote={() => {}}
						onDemote={() => {}}
					/>
				</div>
			</ComponentPreview>

			{/* Content Controls */}
			<ComponentPreview
				id="composite-content-controls"
				name="Content Controls"
				description="Content editing panels for different node types: text (textarea), link (label + navigation), and image (src + alt)."
				sourceFile="src/panels/inspector/contentSections/"
				props={[]}
			>
				<div className="flex flex-wrap gap-6">
					<div className="w-[300px] space-y-2.5">
						<div className="editor-text-muted text-[11px] font-medium">
							Text
						</div>
						<FormField label="Text">
							<Textarea value={mockTextLeaf.content} onChange={() => {}} />
						</FormField>
					</div>
					<div className="w-[300px] space-y-2.5">
						<div className="editor-text-muted text-[11px] font-medium">
							Link
						</div>
						<FormField label="Label">
							<Input value={mockLinkLeaf.label} onChange={() => {}} />
						</FormField>
						<NavigationFields
							document={mockDocument}
							node={mockLinkLeaf as LinkInspectorNode}
							onTextChange={() => {}}
						/>
					</div>
					<div className="w-[300px] space-y-2.5">
						<div className="editor-text-muted text-[11px] font-medium">
							Image
						</div>
						<FormField label="Src">
							<Input value={mockImageLeaf.src ?? ""} onChange={() => {}} />
						</FormField>
						<FormField label="Alt">
							<Input value={mockImageLeaf.alt ?? ""} onChange={() => {}} />
						</FormField>
					</div>
				</div>
			</ComponentPreview>

			{/* Settings Controls */}
			<ComponentPreview
				id="composite-settings"
				name="Settings Controls"
				description="Shared settings panel building blocks: theme/accent pickers, toggle rows, action rows, and numeric rows."
				sourceFile="src/panels/settings/SettingsShared.tsx"
				props={[]}
			>
				<div className="w-[560px]">
					<SettingsDemo />
				</div>
			</ComponentPreview>

			{/* Settings Nav Item */}
			<ComponentPreview
				id="composite-settings-nav"
				name="Settings Nav Item"
				description="Settings sidebar navigation link in idle, hover, and active states."
				sourceFile="src/panels/SettingsPanel.tsx"
				props={[]}
			>
				<div className="flex gap-3">
					{/* Idle */}
					<button
						type="button"
						data-active="false"
						className="settings-nav-link flex w-[170px] items-start gap-3 rounded-lg px-3 py-2.5 text-left"
					>
						<Eye className="mt-0.5 h-4 w-4 shrink-0" />
						<div className="min-w-0">
							<div className="text-sm font-medium">UI</div>
							<div className="settings-nav-link-copy mt-0.5 text-xs leading-5">
								Idle
							</div>
						</div>
					</button>
					{/* Hover */}
					<button
						type="button"
						data-active="false"
						className="settings-nav-link flex w-[170px] items-start gap-3 rounded-lg px-3 py-2.5 text-left"
						style={{
							background: "var(--editor-settings-nav-hover-background)",
							color: "var(--editor-settings-nav-hover-text)",
						}}
					>
						<Type className="mt-0.5 h-4 w-4 shrink-0" />
						<div className="min-w-0">
							<div className="text-sm font-medium">Fonts</div>
							<div
								className="mt-0.5 text-xs leading-5"
								style={{
									color: "var(--editor-settings-nav-active-muted)",
								}}
							>
								Hover
							</div>
						</div>
					</button>
					{/* Selected */}
					<button
						type="button"
						data-active="true"
						className="settings-nav-link flex w-[170px] items-start gap-3 rounded-lg px-3 py-2.5 text-left shadow-sm"
					>
						<Keyboard className="mt-0.5 h-4 w-4 shrink-0" />
						<div className="min-w-0">
							<div className="text-sm font-medium">Shortcuts</div>
							<div className="settings-nav-link-copy mt-0.5 text-xs leading-5">
								Selected
							</div>
						</div>
					</button>
				</div>
			</ComponentPreview>

			{/* Shortcuts */}
			<ComponentPreview
				id="composite-shortcuts"
				name="Shortcuts"
				description="Shortcut section container with keyboard shortcut rows."
				sourceFile="src/panels/ShortcutHelpContent.tsx"
				props={[]}
			>
				<div className="w-[300px]">
					<div className="editor-bg-subtle editor-border-subtle rounded-lg border p-3.5">
						<div className="editor-text-muted text-[11px] font-semibold uppercase tracking-wider">
							Edit
						</div>
						<div className="mt-2.5 space-y-2.5">
							{[
								{ label: "Mod+Z", description: "Undo" },
								{ label: "Mod+Shift+Z", description: "Redo" },
								{ label: "Delete", description: "Delete selected" },
							].map((item) => (
								<div
									key={item.label}
									className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
								>
									<span className="editor-text-strong text-xs leading-4">
										{item.description}
									</span>
									<kbd className="editor-kbd max-w-[14rem] whitespace-normal break-words rounded-md border px-1.5 py-0.5 text-right text-[11px] font-medium leading-4 shadow-sm">
										{item.label}
									</kbd>
								</div>
							))}
						</div>
					</div>
				</div>
			</ComponentPreview>

			{/* Focused Panel */}
			<ComponentPreview
				id="composite-focused-panel"
				name="Focused Panel"
				description="Floating focused-mode panel with drag handle, title, role badge, and exit button. Shows empty state when no node is selected."
				sourceFile="src/panels/FocusedModePanel.tsx"
				props={[]}
			>
				<div className="w-[300px]">
					<div className="editor-focused-panel editor-settings-panel overflow-hidden rounded-xl border shadow-lg">
						<div className="flex cursor-grab items-center justify-between gap-2 px-3 pt-3 pb-2">
							<div className="min-w-0 flex-1">
								<div className="editor-text-strong text-sm font-medium">
									Content
								</div>
								<div className="editor-text-muted mt-1 flex min-w-0 items-center gap-2 text-xs">
									<div className="truncate">Sticky Edge Lab</div>
									<span className="editor-pill-subtle shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium">
										section
									</span>
								</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="editor-icon-button-subtle h-7 w-7 rounded-md border"
								aria-label="Exit focused mode"
							>
								<SquareArrowRightEnter className="h-3.5 w-3.5" />
							</Button>
						</div>
						<div className="px-3 py-6">
							<div className="editor-text-strong text-sm font-medium">
								Nothing to edit yet
							</div>
							<div className="editor-text-muted mt-1 text-xs">
								Select a non-site node to edit its content controls from focused
								mode.
							</div>
						</div>
					</div>
				</div>
			</ComponentPreview>
		</div>
	);
}
