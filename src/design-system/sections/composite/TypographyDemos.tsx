import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	PilcrowRight,
	Settings2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	FontPickerPopover,
	FontSizeField,
	HoverColorField,
	InspectorInlineRow,
	NumberInput,
	TextStyleIconButton,
} from "@/panels/InspectorControls";
import {
	TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX,
	TYPOGRAPHY_FONT_PICKER_WIDTH_PX,
	TYPOGRAPHY_FONT_ROW_WIDTH_PX,
	TYPOGRAPHY_FONT_SIZE_FIELD_WIDTH_PX,
	TYPOGRAPHY_LINE_HEIGHT_FIELD_WIDTH_PX,
	TYPOGRAPHY_SIZE_ROW_WIDTH_PX,
} from "@/panels/inspector/contentSections/shared";
import { mockFontFamilies } from "../../mocks";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

const TEXT_STYLE_PROPS: PropDefinition[] = [
	{ name: "node", type: "TextInspectorNode", description: "Current text node supplying typography values." },
	{ name: "actions", type: "InspectorActionHandlers", description: "Typography mutation handlers for text styles and color." },
	{ name: "mixed", type: "boolean", description: "Mixed-selection state reflected by shared pills and controls." },
];

// ---------------------------------------------------------------------------
// Interactive demo wrappers
// ---------------------------------------------------------------------------

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

function TextStyleMixedDemo() {
	return (
		<div className="w-[300px] space-y-2.5">
			{/* Font (mixed family + weight) */}
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
						weightValue={400}
						families={mockFontFamilies}
						systemOptionValue="__system-font__"
						onFamilyChange={() => {}}
						onWeightChange={() => {}}
						className="w-full"
						mixedFamily
						mixedWeight
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

			{/* Size + Line height (mixed) */}
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
						<FontSizeField nodeId="demo" value="18px" onChange={() => {}} mixed />
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
							mixed
						/>
					</div>
				</div>
			</InspectorInlineRow>

			{/* Style B / I / U / S (mixed) */}
			<InspectorInlineRow
				label="Style"
				controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
				controlClassName="gap-1"
			>
				<TextStyleIconButton
					label="Bold"
					active={false}
					mixed
					onClick={() => {}}
				>
					<span className="font-black tracking-[-0.02em] no-underline decoration-transparent">
						B
					</span>
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Italic"
					active={false}
					mixed
					onClick={() => {}}
				>
					<span className="font-medium italic">I</span>
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Underline"
					active={false}
					onClick={() => {}}
				>
					<span className="underline">U</span>
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Strikethrough"
					active={false}
					onClick={() => {}}
				>
					<span className="line-through">S</span>
				</TextStyleIconButton>
			</InspectorInlineRow>

			{/* Align (no mixed needed - alignment is all-or-nothing) */}
			<InspectorInlineRow
				label="Align"
				controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
				controlClassName="gap-1"
			>
				<TextStyleIconButton
					label="Align left"
					active={false}
					onClick={() => {}}
				>
					<AlignLeft className="h-4 w-4" />
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Align center"
					active={false}
					onClick={() => {}}
				>
					<AlignCenter className="h-4 w-4" />
				</TextStyleIconButton>
				<TextStyleIconButton
					label="Align right"
					active={false}
					onClick={() => {}}
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

			{/* Color (mixed) */}
			<InspectorInlineRow label="Color" controlClassName="gap-2">
				<HoverColorField
					value="#172033"
					onChange={() => {}}
					ariaLabel="Text color"
					mixed
				/>
			</InspectorInlineRow>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function TypographyDemos() {
	return (
		<>
			{/* Text Style */}
			<ComponentPreview
				id="composite-text-style"
				name="Text Style"
				description="Inspector typography control rail: font picker + manage button, size + line-height, style (B/I/U/S), alignment + direction, and text color. Each row uses InspectorInlineRow."
				sourceFile="src/panels/inspector/contentSections/shared.tsx"
				props={TEXT_STYLE_PROPS}
			>
				<div className="space-y-8">
					<TextStyleFieldsDemo />
					{/* Multi-select (mixed) */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Multi-select</div>
						<TextStyleMixedDemo />
					</div>
				</div>
			</ComponentPreview>
		</>
	);
}
