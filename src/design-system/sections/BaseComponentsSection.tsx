import {
	ArrowLeft,
	Eye,
	EyeOff,
	Info,
	Keyboard,
	Settings,
	X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PopoverTooltip } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	FontPickerPopover,
	HoverColorField,
	LabeledNumberField,
	NumericUnitInlineField,
	RangeField,
	SizeInlineField,
	StickyOffsetBandField,
} from "@/panels/InspectorControls";
import { StatusMessage } from "@/panels/settings/SettingsShared";
import type { DocumentFontFamily } from "../../model/types";
import { ResizeHandleView } from "../../stage/stageRenderers/resizeHandles";
import { MultiSelectionOutline } from "../../stage/stageRenderers/selectionVisuals";
import { ComponentPreview } from "../previews/ComponentPreview";
import { VariationsGrid } from "../previews/VariationsGrid";
import type { PropDefinition } from "../types";

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const TITLE_PROPS: PropDefinition[] = [
	{
		name: "className",
		type: "string",
		description: "Editor heading utility class for sizing.",
	},
];

const BADGE_PROPS: PropDefinition[] = [
	{
		name: "className",
		type: "string",
		description: "Utility classes including editor-pill-subtle.",
	},
];

const BUTTON_PROPS: PropDefinition[] = [
	{
		name: "variant",
		type: "'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'",
		default: "'default'",
		description: "Visual style variant.",
	},
	{
		name: "size",
		type: "'default' | 'sm' | 'icon'",
		default: "'default'",
		description: "Button size.",
	},
	{
		name: "asChild",
		type: "boolean",
		default: "false",
		description: "Merge props onto child element.",
	},
	{
		name: "disabled",
		type: "boolean",
		default: "false",
		description: "Disabled state.",
	},
];

const ICON_BUTTON_PROPS: PropDefinition[] = [
	{
		name: "variant",
		type: "'default' | 'outline' | 'ghost'",
		default: "'default'",
		description: "Visual style variant.",
	},
	{
		name: "size",
		type: "'icon'",
		default: "'icon'",
		description: "Icon button size.",
	},
];

const LABEL_PROPS: PropDefinition[] = [
	{ name: "htmlFor", type: "string", description: "Associated input id." },
];

const NUMBER_INPUT_PROPS: PropDefinition[] = [
	{
		name: "value",
		type: "number",
		description: "Current numeric value.",
	},
	{ name: "min", type: "number", description: "Minimum allowed value." },
	{ name: "max", type: "number", description: "Maximum allowed value." },
	{ name: "step", type: "number", description: "Step increment." },
	{
		name: "onChange",
		type: "(value: number) => void",
		description: "Change handler.",
	},
	{
		name: "unitLabel",
		type: "string",
		description:
			"Unit suffix shown in a compact pill (e.g. 'px', '%', '\u00B0').",
	},
];

const NUMERIC_UNIT_PROPS: PropDefinition[] = [
	{
		name: "value",
		type: "string",
		description: "Value with unit suffix (e.g. '16px').",
	},
	{
		name: "units",
		type: "('px' | '%' | 'vw' | 'vh' | ...)[\\]",
		description: "Available unit options.",
	},
	{
		name: "onChange",
		type: "(value: string) => void",
		description: "Change handler (value includes unit).",
	},
	{
		name: "min",
		type: "number",
		description: "Minimum allowed numeric value.",
	},
	{
		name: "max",
		type: "number",
		description: "Maximum allowed numeric value.",
	},
];

const INPUT_PROPS: PropDefinition[] = [
	{
		name: "type",
		type: "string",
		default: "'text'",
		description: "HTML input type.",
	},
	{ name: "value", type: "string", description: "Controlled value." },
	{ name: "placeholder", type: "string", description: "Placeholder text." },
	{
		name: "disabled",
		type: "boolean",
		default: "false",
		description: "Disabled state.",
	},
];

const SWITCH_PROPS: PropDefinition[] = [
	{ name: "checked", type: "boolean", description: "Checked state." },
	{
		name: "onCheckedChange",
		type: "(checked: boolean) => void",
		description: "Change handler.",
	},
	{
		name: "disabled",
		type: "boolean",
		default: "false",
		description: "Disabled state.",
	},
];

const SLIDER_PROPS: PropDefinition[] = [
	{ name: "value", type: "number[]", description: "Current value(s)." },
	{
		name: "min",
		type: "number",
		default: "0",
		description: "Minimum value.",
	},
	{
		name: "max",
		type: "number",
		default: "100",
		description: "Maximum value.",
	},
	{
		name: "step",
		type: "number",
		default: "1",
		description: "Step increment.",
	},
	{
		name: "onValueChange",
		type: "(value: number[]) => void",
		description: "Change handler.",
	},
];

const OPTIONS_SELECTOR_PROPS: PropDefinition[] = [
	{
		name: "value",
		type: "string",
		description: "Currently selected option value.",
	},
	{
		name: "onChange",
		type: "(value: string) => void",
		description: "Selection change handler.",
	},
];

const TEXTAREA_PROPS: PropDefinition[] = [
	{ name: "value", type: "string", description: "Controlled value." },
	{ name: "placeholder", type: "string", description: "Placeholder text." },
	{
		name: "disabled",
		type: "boolean",
		default: "false",
		description: "Disabled state.",
	},
];

const FONT_SELECTOR_PROPS: PropDefinition[] = [
	{ name: "value", type: "string", description: "Selected font family name." },
	{
		name: "families",
		type: "DocumentFontFamily[]",
		description: "Available font families.",
	},
	{
		name: "onChange",
		type: "(value: string) => void",
		description: "Selection change handler.",
	},
	{
		name: "systemOptionValue",
		type: "string",
		description: "Value that represents the system/default font.",
	},
];

const SELECT_PROPS: PropDefinition[] = [
	{ name: "value", type: "string", description: "Selected value." },
	{
		name: "onValueChange",
		type: "(value: string) => void",
		description: "Change handler.",
	},
	{ name: "open", type: "boolean", description: "Open state (controlled)." },
	{ name: "defaultOpen", type: "boolean", description: "Default open state." },
];

const COLOR_PICKER_PROPS: PropDefinition[] = [
	{ name: "value", type: "string", description: "Color value." },
	{ name: "fallback", type: "string", description: "Fallback color." },
	{
		name: "allowAlpha",
		type: "boolean",
		default: "false",
		description: "Allow alpha channel.",
	},
	{ name: "ariaLabel", type: "string", description: "Accessible label." },
	{
		name: "onChange",
		type: "(value: string) => void",
		description: "Change handler.",
	},
];

const SELECTION_CHROME_PROPS: PropDefinition[] = [
	{
		name: "className",
		type: "string",
		description: "Additional CSS classes for the selection outline wrapper.",
	},
];

const STICKY_INDICATOR_PROPS: PropDefinition[] = [
	{
		name: "color",
		type: "CSS custom property",
		description:
			"Guide color, label background, and label text variables from the editor theme.",
	},
];

const WARNING_INFO_PROPS: PropDefinition[] = [
	{
		name: "result",
		type: "ActionResult | null",
		description: "Result object with ok flag and message.",
	},
	{
		name: "fallback",
		type: "string",
		description: "Fallback text when no result.",
	},
];

const TOOLTIP_PROPS: PropDefinition[] = [
	{ name: "content", type: "ReactNode", description: "Tooltip content." },
	{
		name: "side",
		type: "'top' | 'bottom' | 'right'",
		default: "'top'",
		description: "Preferred side.",
	},
	{
		name: "align",
		type: "'start' | 'center' | 'end'",
		default: "'center'",
		description: "Alignment.",
	},
	{
		name: "offset",
		type: "number",
		default: "12",
		description: "Offset in px.",
	},
];

const SHORTCUT_KEY_PROPS: PropDefinition[] = [
	{
		name: "className",
		type: "string",
		description: "editor-kbd utility class for keyboard shortcut styling.",
	},
];

const PAGER_PROPS: PropDefinition[] = [
	{
		name: "page",
		type: "number",
		description: "Current page number.",
	},
	{
		name: "totalPages",
		type: "number",
		description: "Total number of pages.",
	},
];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

/**
 * System font generic families for the showcase demo.
 * FontPickerPopover side effects have been moved to callers, so these could
 * be switched to real Google Font names — but generic families work fine for
 * demonstrating the picker UI without loading external stylesheets.
 */
const MOCK_FONT_FAMILIES: DocumentFontFamily[] = [
	{
		family: "sans-serif",
		category: "sans-serif",
		subsets: ["latin"],
		variants: ["400", "500", "600", "700"],
	} as DocumentFontFamily,
	{
		family: "serif",
		category: "serif",
		subsets: ["latin"],
		variants: ["300", "400", "500", "700"],
	} as DocumentFontFamily,
	{
		family: "monospace",
		category: "monospace",
		subsets: ["latin"],
		variants: ["400", "500", "700"],
	} as DocumentFontFamily,
	{
		family: "cursive",
		category: "display",
		subsets: ["latin"],
		variants: ["400", "700"],
	} as DocumentFontFamily,
];

// ---------------------------------------------------------------------------
// Interactive preview wrappers
// ---------------------------------------------------------------------------

function TextButtonDemo() {
	return (
		<div className="space-y-6">
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Variants (default size)
				</div>
				<VariationsGrid
					variations={[
						{
							label: "Default",
							render: () => <Button variant="default">Default</Button>,
						},
						{
							label: "Secondary",
							render: () => <Button variant="secondary">Secondary</Button>,
						},
						{
							label: "Outline",
							render: () => <Button variant="outline">Outline</Button>,
						},
						{
							label: "Ghost",
							render: () => <Button variant="ghost">Ghost</Button>,
						},
						{
							label: "Destructive",
							render: () => <Button variant="destructive">Destructive</Button>,
						},
					]}
				/>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Sizes
				</div>
				<VariationsGrid
					variations={[
						{
							label: "Default",
							render: () => <Button size="default">Default</Button>,
						},
						{
							label: "Small",
							render: () => <Button size="sm">Small</Button>,
						},
					]}
				/>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Disabled states
				</div>
				<VariationsGrid
					variations={[
						{
							label: "Default disabled",
							render: () => <Button disabled>Disabled</Button>,
						},
						{
							label: "Secondary disabled",
							render: () => (
								<Button variant="secondary" disabled>
									Disabled
								</Button>
							),
						},
						{
							label: "Outline disabled",
							render: () => (
								<Button variant="outline" disabled>
									Disabled
								</Button>
							),
						},
						{
							label: "Ghost disabled",
							render: () => (
								<Button variant="ghost" disabled>
									Disabled
								</Button>
							),
						},
						{
							label: "Destructive disabled",
							render: () => (
								<Button variant="destructive" disabled>
									Disabled
								</Button>
							),
						},
					]}
				/>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Text + Icon
				</div>
				<VariationsGrid
					variations={[
						{
							label: "Ghost + icon",
							render: () => (
								<Button variant="ghost" size="sm" className="gap-1.5">
									<ArrowLeft className="h-4 w-4" /> Back
								</Button>
							),
						},
						{
							label: "Default + icon",
							render: () => (
								<Button variant="default" size="sm" className="gap-1.5">
									<Settings className="h-4 w-4" /> Settings
								</Button>
							),
						},
					]}
				/>
			</div>
		</div>
	);
}

function IconButtonDemo() {
	const [active, setActive] = useState(true);
	return (
		<div>
			<VariationsGrid
				columns={3}
				variations={[
					{
						label: "Default",
						render: () => (
							<Button size="icon" variant="default">
								<Settings className="h-4 w-4" />
							</Button>
						),
					},
					{
						label: "Outline",
						render: () => (
							<Button size="icon" variant="outline">
								<Keyboard className="h-4 w-4" />
							</Button>
						),
					},
					{
						label: "Ghost",
						render: () => (
							<Button size="icon" variant="ghost">
								<Info className="h-4 w-4" />
							</Button>
						),
					},
					{
						label: active ? "Toggle on" : "Toggle off",
						render: () => (
							<Button
								size="icon"
								variant={active ? "default" : "ghost"}
								onClick={() => setActive((v) => !v)}
							>
								{active ? (
									<Eye className="h-4 w-4" />
								) : (
									<EyeOff className="h-4 w-4" />
								)}
							</Button>
						),
					},
					{
						label: "Rail",
						render: () => (
							<button type="button" className="editor-rail-toggle-button">
								<Settings className="h-4 w-4" />
							</button>
						),
					},
					{
						label: "Rail pressed",
						render: () => (
							<button
								type="button"
								className="editor-rail-toggle-button"
								data-pressed="true"
							>
								<Settings className="h-4 w-4" />
							</button>
						),
					},
					{
						label: "Topbar",
						render: () => (
							<button
								type="button"
								className="editor-topbar-icon-button flex items-center justify-center"
							>
								<Settings className="h-4 w-4" />
							</button>
						),
					},
					{
						label: "Topbar active",
						render: () => (
							<button
								type="button"
								className="editor-topbar-icon-button flex items-center justify-center"
								data-active="true"
							>
								<Settings className="h-4 w-4" />
							</button>
						),
					},
					{
						label: "Panel close",
						render: () => (
							<button
								type="button"
								className="editor-icon-button-subtle flex h-7 w-7 items-center justify-center rounded-md border"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						),
					},
				]}
			/>
		</div>
	);
}

function NumberFieldDemo() {
	const [plain, setPlain] = useState(42);
	const [withUnit, setWithUnit] = useState(16);
	const [angle, setAngle] = useState(180);
	return (
		<div className="grid max-w-[400px] grid-cols-3 gap-3">
			<LabeledNumberField
				label="Plain"
				value={plain}
				onChange={setPlain}
				min={0}
				max={200}
				step={1}
			/>
			<LabeledNumberField
				label="With unit"
				value={withUnit}
				onChange={setWithUnit}
				min={0}
				max={200}
				step={1}
				unitLabel="px"
			/>
			<LabeledNumberField
				label="Angle"
				value={angle}
				onChange={setAngle}
				min={0}
				max={360}
				step={1}
				unitLabel="°"
			/>
		</div>
	);
}

function NumericUnitDemo() {
	const [singleUnit, setSingleUnit] = useState("16px");
	const [multiUnit, setMultiUnit] = useState("100%");
	return (
		<div className="grid w-[480px] grid-cols-3 gap-4">
			<div>
				<div className="editor-text-muted mb-1 text-[11px] font-medium">
					Single unit
				</div>
				<NumericUnitInlineField
					value={singleUnit}
					units={["px"]}
					onChange={setSingleUnit}
					aria-label="Single unit"
				/>
			</div>
			<div>
				<div className="editor-text-muted mb-1 text-[11px] font-medium">
					Multiple units
				</div>
				<NumericUnitInlineField
					value={multiUnit}
					units={["px", "%", "vh"]}
					onChange={setMultiUnit}
					aria-label="Multi unit"
				/>
			</div>
			<div>
				<div className="editor-text-muted mb-1 text-[11px] font-medium">
					Keywords
				</div>
				<SizeInlineField
					label="W"
					nodeId="demo"
					axis="width"
					value="fit-content"
					onChange={() => {}}
				/>
			</div>
		</div>
	);
}

function SwitchDemo() {
	const [checked, setChecked] = useState(false);
	return (
		<VariationsGrid
			variations={[
				{
					label: "Unchecked",
					render: () => <Switch checked={false} onCheckedChange={() => {}} />,
				},
				{
					label: "Checked",
					render: () => <Switch checked onCheckedChange={() => {}} />,
				},
				{
					label: "Disabled",
					render: () => (
						<Switch checked={false} disabled onCheckedChange={() => {}} />
					),
				},
				{
					label: "Interactive (click)",
					render: () => (
						<Switch checked={checked} onCheckedChange={setChecked} />
					),
				},
			]}
		/>
	);
}

function SliderDemo() {
	const [value, setValue] = useState([50]);
	const [rangeValue, setRangeValue] = useState(75);
	const [topOffset, setTopOffset] = useState(20);
	const [bottomOffset, setBottomOffset] = useState(60);
	return (
		<div className="space-y-6">
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Slider
				</div>
				<div className="w-full max-w-[300px] space-y-4">
					<Slider
						value={value}
						onValueChange={setValue}
						min={0}
						max={100}
						step={1}
					/>
					<div className="editor-text-muted text-center text-[11px]">
						Value: {value[0]}
					</div>
				</div>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					RangeField (labeled slider with value badge)
				</div>
				<div className="w-full max-w-[300px]">
					<RangeField
						label="Opacity"
						value={rangeValue}
						min={0}
						max={100}
						step={1}
						unit="%"
						onValueChange={setRangeValue}
					/>
				</div>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					StickyOffsetBandField (dual-handle range)
				</div>
				<div className="w-full max-w-[300px]">
					<StickyOffsetBandField
						topOffset={topOffset}
						bottomOffset={bottomOffset}
						min={0}
						max={100}
						step={1}
						unit="vh"
						onValueChange={(top, bottom) => {
							setTopOffset(top);
							setBottomOffset(bottom);
						}}
					/>
				</div>
			</div>
		</div>
	);
}

function OptionsSelectorDemo() {
	const [twoOption, setTwoOption] = useState("left");
	const [threeOption, setThreeOption] = useState("center");
	return (
		<div className="space-y-4">
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					2-option selector
				</div>
				<div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-1">
					<Button
						variant={twoOption === "left" ? "default" : "ghost"}
						size="sm"
						className="h-7 rounded-md px-2.5 text-[11px]"
						onClick={() => setTwoOption("left")}
					>
						Left
					</Button>
					<Button
						variant={twoOption === "right" ? "default" : "ghost"}
						size="sm"
						className="h-7 rounded-md px-2.5 text-[11px]"
						onClick={() => setTwoOption("right")}
					>
						Right
					</Button>
				</div>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					3-option selector
				</div>
				<div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-1">
					<Button
						variant={threeOption === "left" ? "default" : "ghost"}
						size="sm"
						className="h-7 rounded-md px-2.5 text-[11px]"
						onClick={() => setThreeOption("left")}
					>
						Left
					</Button>
					<Button
						variant={threeOption === "center" ? "default" : "ghost"}
						size="sm"
						className="h-7 rounded-md px-2.5 text-[11px]"
						onClick={() => setThreeOption("center")}
					>
						Center
					</Button>
					<Button
						variant={threeOption === "right" ? "default" : "ghost"}
						size="sm"
						className="h-7 rounded-md px-2.5 text-[11px]"
						onClick={() => setThreeOption("right")}
					>
						Right
					</Button>
				</div>
			</div>
		</div>
	);
}

function FontPickerDemo() {
	return (
		<div style={{ width: 136 }}>
			<FontPickerPopover
				familyValue="sans-serif"
				weightValue={400}
				families={MOCK_FONT_FAMILIES}
				systemOptionValue="__system__"
				onFamilyChange={() => {}}
				onWeightChange={() => {}}
				className="w-full"
				recentFamilyNames={[]}
				onRecentFamiliesChange={() => {}}
				previewStylesheetHref={null}
			/>
		</div>
	);
}

function SelectDemo() {
	const [value, setValue] = useState("air");
	return (
		<div className="w-[200px]">
			<Select value={value} onValueChange={setValue}>
				<SelectTrigger aria-label="Select demo">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="air">Air</SelectItem>
					<SelectItem value="paper">Paper</SelectItem>
					<SelectItem value="midday">Midday</SelectItem>
					<SelectItem value="clarity">Clarity</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}

function ColorDemo() {
	const [color, setColor] = useState("#1668ff");
	const [colorAlpha, setColorAlpha] = useState("rgba(22, 104, 255, 0.6)");
	return (
		<div className="flex gap-4">
			<div>
				<div className="editor-text-muted mb-1 text-[10px]">Opaque</div>
				<HoverColorField
					value={color}
					onChange={setColor}
					ariaLabel="Color field opaque"
					showOpacity={false}
				/>
			</div>
			<div>
				<div className="editor-text-muted mb-1 text-[10px]">With alpha</div>
				<HoverColorField
					value={colorAlpha}
					onChange={setColorAlpha}
					ariaLabel="Color field with alpha"
				/>
			</div>
		</div>
	);
}

function PagerDemo() {
	const [page, setPage] = useState(1);
	const totalPages = 5;
	return (
		<div className="flex items-center gap-3">
			<Button
				variant="outline"
				size="sm"
				disabled={page <= 1}
				onClick={() => setPage((p) => Math.max(1, p - 1))}
			>
				Prev
			</Button>
			<span className="editor-text-muted text-[12px]">
				Page {page} / {totalPages}
			</span>
			<Button
				variant="outline"
				size="sm"
				disabled={page >= totalPages}
				onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
			>
				Next
			</Button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function BaseComponentsSection() {
	return (
		<div>
			{/* Title */}
			<ComponentPreview
				id="base-title"
				name="Title"
				description="Editor heading styles at various sizes used in panels, dialogs, and controls."
				sourceFile="src/styles.css (editor-text-strong)"
				props={TITLE_PROPS}
			>
				<div className="space-y-3">
					<div className="editor-text-strong text-[18px] font-semibold leading-6">
						Dialog Title (18px)
					</div>
					<div className="editor-text-strong text-[15px] font-semibold leading-5">
						Section Title (15px)
					</div>
					<div className="editor-text-strong text-[14px] font-medium leading-5">
						Body Text (14px)
					</div>
					<div className="editor-text-strong text-[12px] font-medium leading-4">
						Small Text (12px)
					</div>
					<div className="editor-text-muted text-[11px] font-medium leading-4">
						Label (11px)
					</div>
					<div className="editor-text-muted text-[10px] font-medium leading-3">
						Micro (10px)
					</div>
				</div>
			</ComponentPreview>

			{/* Component Badges */}
			<ComponentPreview
				id="base-badge"
				name="Component Badges"
				description="Subtle pill badges used for node role labels in inspector panels."
				sourceFile="src/styles.css (editor-pill-subtle)"
				props={BADGE_PROPS}
			>
				<VariationsGrid
					variations={[
						{
							label: "Text",
							render: () => (
								<span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">
									text
								</span>
							),
						},
						{
							label: "Section",
							render: () => (
								<span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">
									section
								</span>
							),
						},
						{
							label: "Container",
							render: () => (
								<span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">
									container
								</span>
							),
						},
						{
							label: "Sticky template",
							render: () => (
								<span className="editor-template-tag rounded px-1.5 py-0.5 text-[10px] font-medium">
									sticky
								</span>
							),
						},
					]}
				/>
			</ComponentPreview>

			{/* Text Button */}
			<ComponentPreview
				id="base-text-button"
				name="Text Button"
				description="Interactive text button with variants, sizes, and disabled states."
				sourceFile="src/components/ui/button.tsx"
				props={BUTTON_PROPS}
			>
				<TextButtonDemo />
			</ComponentPreview>

			{/* Icon Button */}
			<ComponentPreview
				id="base-icon-button"
				name="Icon Button"
				description="Icon-only buttons with variant support and a toggle pair pattern."
				sourceFile="src/components/ui/button.tsx"
				props={ICON_BUTTON_PROPS}
			>
				<IconButtonDemo />
			</ComponentPreview>

			{/* Label */}
			<ComponentPreview
				id="base-label"
				name="Label"
				description="Form label element associated with an input."
				sourceFile="src/components/ui/label.tsx"
				props={LABEL_PROPS}
			>
				<div className="max-w-[300px] space-y-2">
					<Label htmlFor="demo-label-input">Field label</Label>
					<Input id="demo-label-input" placeholder="Associated input" />
				</div>
			</ComponentPreview>

			{/* Number Field */}
			<ComponentPreview
				id="base-number-field"
				name="Number Field"
				description="Compact numeric input with optional unit suffix label, validation, and draft management."
				sourceFile="src/panels/InspectorControls.tsx"
				props={NUMBER_INPUT_PROPS}
			>
				<NumberFieldDemo />
			</ComponentPreview>

			{/* Number with Unit */}
			<ComponentPreview
				id="base-number-unit"
				name="Number with Unit"
				description="Inline numeric field with a selectable unit suffix. Supports single or multiple unit modes."
				sourceFile="src/panels/InspectorControls.tsx"
				props={NUMERIC_UNIT_PROPS}
			>
				<NumericUnitDemo />
			</ComponentPreview>

			{/* Text Input */}
			<ComponentPreview
				id="base-input"
				name="Text Input"
				description="Text input with controlled value and draft management."
				sourceFile="src/components/ui/input.tsx"
				props={INPUT_PROPS}
			>
				<div className="max-w-[300px] space-y-3">
					<Input placeholder="Placeholder text…" />
					<Input value="Filled value" readOnly />
					<Input disabled placeholder="Disabled" />
				</div>
			</ComponentPreview>

			{/* Toggle (Switch) */}
			<ComponentPreview
				id="base-switch"
				name="Toggle (Switch)"
				description="Toggle switch based on Radix UI."
				sourceFile="src/components/ui/switch.tsx"
				props={SWITCH_PROPS}
			>
				<SwitchDemo />
			</ComponentPreview>

			{/* Slider */}
			<ComponentPreview
				id="base-slider"
				name="Slider"
				description="Range slider based on Radix UI, and labeled RangeField with value badge."
				sourceFile="src/components/ui/slider.tsx"
				props={SLIDER_PROPS}
			>
				<SliderDemo />
			</ComponentPreview>

			{/* Options Selector */}
			<ComponentPreview
				id="base-options-selector"
				name="Options Selector"
				description="Segmented button group for mutually exclusive choices, built from Button variants in a styled container."
				sourceFile="(pattern using src/components/ui/button.tsx)"
				props={OPTIONS_SELECTOR_PROPS}
			>
				<OptionsSelectorDemo />
			</ComponentPreview>

			{/* Text Field (Textarea) */}
			<ComponentPreview
				id="base-textarea"
				name="Text Field"
				description="Multi-line text input."
				sourceFile="src/components/ui/textarea.tsx"
				props={TEXTAREA_PROPS}
			>
				<div className="max-w-[300px] space-y-3">
					<Textarea placeholder="Enter multi-line text…" rows={3} />
					<Textarea disabled placeholder="Disabled" rows={3} />
				</div>
			</ComponentPreview>

			{/* Font Picker */}
			<ComponentPreview
				id="base-font-selector"
				name="Font Picker"
				description="Font family dropdown and family + weight popover. Both share state — selecting a family in either updates both."
				sourceFile="src/panels/InspectorControls.tsx"
				props={FONT_SELECTOR_PROPS}
			>
				<FontPickerDemo />
			</ComponentPreview>

			{/* Dropdown (Select) */}
			<ComponentPreview
				id="base-select"
				name="Dropdown (Select)"
				description="Generic dropdown select based on Radix UI with PopoverSurface."
				sourceFile="src/components/ui/select.tsx"
				props={SELECT_PROPS}
			>
				<SelectDemo />
			</ComponentPreview>

			{/* Color */}
			<ComponentPreview
				id="base-color"
				name="Color"
				description="Color picker (opaque and alpha modes) and inline swatch field."
				sourceFile="src/components/ui/color-picker.tsx"
				props={COLOR_PICKER_PROPS}
			>
				<ColorDemo />
			</ComponentPreview>

			{/* Selection Chrome */}
			<ComponentPreview
				id="base-selection-chrome"
				name="Selection Chrome"
				description="On-stage selection outline, resize handles, and node label badge."
				sourceFile="src/stage/stageRenderers/resizeHandles.tsx"
				props={SELECTION_CHROME_PROPS}
			>
				<div className="flex flex-wrap gap-8">
					<div>
						<div className="editor-text-muted mb-2 text-[11px] font-medium">
							Single selection
						</div>
						<div className="relative" style={{ width: 180, height: 80 }}>
							<div
								className="absolute -top-5 left-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold"
								style={{
									background: "var(--editor-accent)",
									color: "var(--editor-accent-foreground)",
								}}
							>
								Text
							</div>
							<div
								className="h-full w-full rounded-none"
								style={{ border: "2px solid var(--editor-accent)" }}
							/>
							<ResizeHandleView onHandleMouseDown={() => {}} />
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-2 text-[11px] font-medium">
							Section / header / footer
						</div>
						<div className="relative" style={{ width: 180, height: 80 }}>
							<div
								className="absolute -top-5 left-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold"
								style={{
									background: "var(--editor-accent)",
									color: "var(--editor-accent-foreground)",
								}}
							>
								Section
							</div>
							<div
								className="h-full w-full rounded-none"
								style={{ border: "2px solid var(--editor-accent)" }}
							/>
							<ResizeHandleView
								handles={["s"]}
								wideSouthHandle
								onHandleMouseDown={() => {}}
							/>
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-2 text-[11px] font-medium">
							Multi selection
						</div>
						<div className="relative" style={{ width: 180, height: 80 }}>
							<MultiSelectionOutline
								bounds={{ left: 0, top: 0, width: 180, height: 80 }}
							/>
						</div>
					</div>
				</div>
			</ComponentPreview>

			{/* Sticky Indicators */}
			<ComponentPreview
				id="base-sticky-indicator"
				name="Sticky Indicators"
				description="Colored indicator bars used in the stage to visualize sticky guide types."
				sourceFile="src/styles.css (sticky guide variables)"
				props={STICKY_INDICATOR_PROPS}
			>
				<div className="flex flex-wrap gap-6">
					{/* Distance indicator */}
					<div className="flex flex-col items-center gap-2">
						<div className="relative h-[100px] w-[40px]">
							<div
								className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
								style={{
									borderLeft:
										"2.5px dashed var(--editor-sticky-distance-guide-color)",
								}}
							/>
							<div
								className="absolute top-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-distance-guide-color)",
								}}
							/>
							<div
								className="absolute bottom-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-distance-guide-color)",
								}}
							/>
							<div
								className="sticky-spacer-label"
								style={{
									background: "var(--editor-sticky-distance-label-background)",
									color: "var(--editor-sticky-distance-label-text)",
								}}
							>
								200vh
							</div>
						</div>
						<span className="editor-text-muted text-[10px] font-medium">
							Distance
						</span>
					</div>
					{/* Offset indicator */}
					<div className="flex flex-col items-center gap-2">
						<div className="relative h-[100px] w-[40px]">
							<div
								className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
								style={{
									background:
										"repeating-linear-gradient(to bottom, var(--editor-sticky-offset-guide-color) 0 6px, transparent 6px 11px)",
									width: 2.5,
								}}
							/>
							<div
								className="absolute top-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-offset-guide-color)",
								}}
							/>
							<div
								className="absolute bottom-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-offset-guide-color)",
								}}
							/>
							<div
								className="sticky-spacer-label"
								style={{
									background: "var(--editor-sticky-offset-label-background)",
									color: "var(--editor-sticky-offset-label-text)",
								}}
							>
								10vh
							</div>
						</div>
						<span className="editor-text-muted text-[10px] font-medium">
							Offset
						</span>
					</div>
					{/* Auto indicator */}
					<div className="flex flex-col items-center gap-2">
						<div className="relative h-[100px] w-[40px]">
							<div
								className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
								style={{
									borderLeft:
										"2.5px dashed var(--editor-sticky-auto-guide-color)",
								}}
							/>
							<div
								className="absolute top-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-auto-guide-color)",
								}}
							/>
							<div
								className="absolute bottom-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-auto-guide-color)",
								}}
							/>
							<div
								className="sticky-spacer-label sticky-spacer-label-auto"
								style={{
									background: "var(--editor-sticky-auto-label-background)",
									color: "var(--editor-sticky-auto-label-text)",
								}}
							>
								auto
							</div>
						</div>
						<span className="editor-text-muted text-[10px] font-medium">
							Auto
						</span>
					</div>
				</div>
			</ComponentPreview>

			{/* Warning / Info Message */}
			<ComponentPreview
				id="base-warning-info"
				name="Warning / Info Message"
				description="StatusMessage component for displaying action result feedback (success and error states)."
				sourceFile="src/panels/settings/SettingsShared.tsx"
				props={WARNING_INFO_PROPS}
			>
				<div className="max-w-[400px] space-y-4">
					<div>
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							StatusMessage (success)
						</div>
						<StatusMessage
							result={{ ok: true, message: "Settings saved successfully." }}
							fallback="No status"
						/>
					</div>
					<div>
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							StatusMessage (error)
						</div>
						<StatusMessage
							result={{
								ok: false,
								message: "Failed to export document. File may be locked.",
							}}
							fallback="No status"
						/>
					</div>
				</div>
			</ComponentPreview>

			{/* Tooltip */}
			<ComponentPreview
				id="base-tooltip"
				name="Tooltip"
				description="PopoverTooltip using the native HTML Popover API for hover/focus tooltips."
				sourceFile="src/components/ui/popover.tsx"
				props={TOOLTIP_PROPS}
			>
				<div className="space-y-6">
					<div className="flex flex-wrap gap-6">
						<div>
							<div className="editor-text-muted mb-2 text-[11px] font-medium">
								Panel (rounded-xl)
							</div>
							<div
								className="editor-tooltip-panel ui-popover-tooltip rounded-xl border px-3 py-2 text-xs font-medium"
								style={{ width: "fit-content" }}
							>
								Tooltip content
							</div>
						</div>
						<div>
							<div className="editor-text-muted mb-2 text-[11px] font-medium">
								Inspector compact (rounded-md)
							</div>
							<div
								className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
								style={{ width: "fit-content" }}
							>
								<div className="font-medium leading-3.5">Position Forward</div>
								<div className="mt-0.5 font-mono text-[10px] font-light opacity-70">
									Cmd+]
								</div>
							</div>
						</div>
						<div>
							<div className="editor-text-muted mb-2 text-[11px] font-medium">
								Info (rounded-lg)
							</div>
							<div
								className="editor-tooltip-panel w-48 rounded-lg border px-3 py-2 text-xs font-normal leading-5"
								style={{ width: "fit-content", maxWidth: 200 }}
							>
								Additional context about a setting or control.
							</div>
						</div>
						<div>
							<div className="editor-text-muted mb-2 text-[11px] font-medium">
								Topbar (dark)
							</div>
							<div
								className="editor-topbar-tooltip rounded-xl border px-3 py-2 text-xs font-medium"
								style={{ width: "fit-content" }}
							>
								Undo
								<div className="mt-0.5 font-mono text-[10px] font-light opacity-70">
									Cmd+Z
								</div>
							</div>
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-2 text-[11px] font-medium">
							Interactive
						</div>
						<div className="flex flex-wrap gap-4">
							<PopoverTooltip
								side="top"
								content={
									<div className="text-[11px] font-medium leading-4">
										Tooltip on top
									</div>
								}
							>
								<Button variant="outline" size="sm">
									Top
								</Button>
							</PopoverTooltip>
							<PopoverTooltip
								side="bottom"
								content={
									<div className="text-[11px] font-medium leading-4">
										Tooltip on bottom
									</div>
								}
							>
								<Button variant="outline" size="sm">
									Bottom
								</Button>
							</PopoverTooltip>
							<PopoverTooltip
								side="right"
								content={
									<div className="text-[11px] font-medium leading-4">
										Tooltip on right
									</div>
								}
							>
								<Button variant="outline" size="sm">
									Right
								</Button>
							</PopoverTooltip>
						</div>
					</div>
				</div>
			</ComponentPreview>

			{/* Shortcut Key */}
			<ComponentPreview
				id="base-shortcut-key"
				name="Shortcut Key"
				description="Keyboard shortcut badges using the editor-kbd utility class."
				sourceFile="src/styles.css (editor-kbd)"
				props={SHORTCUT_KEY_PROPS}
			>
				<div className="space-y-4">
					<div>
						<div className="editor-text-muted mb-2 text-[11px] font-medium">
							Single key
						</div>
						<kbd className="editor-kbd rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 shadow-sm">
							Esc
						</kbd>
					</div>
					<div>
						<div className="editor-text-muted mb-2 text-[11px] font-medium">
							Modifier combo
						</div>
						<span className="inline-flex items-center gap-1">
							<kbd className="editor-kbd rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 shadow-sm">
								Cmd
							</kbd>
							<span className="editor-text-muted text-[10px]">+</span>
							<kbd className="editor-kbd rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 shadow-sm">
								Z
							</kbd>
						</span>
					</div>
					<div>
						<div className="editor-text-muted mb-2 text-[11px] font-medium">
							Multi-key shortcut
						</div>
						<span className="inline-flex items-center gap-1">
							<kbd className="editor-kbd rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 shadow-sm">
								Cmd
							</kbd>
							<span className="editor-text-muted text-[10px]">+</span>
							<kbd className="editor-kbd rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 shadow-sm">
								Shift
							</kbd>
							<span className="editor-text-muted text-[10px]">+</span>
							<kbd className="editor-kbd rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 shadow-sm">
								P
							</kbd>
						</span>
					</div>
				</div>
			</ComponentPreview>

			{/* Pager */}
			<ComponentPreview
				id="base-pager"
				name="Pager"
				description="Simple prev/next pagination pattern with page indicator, using outline buttons."
				sourceFile="(pattern using src/components/ui/button.tsx)"
				props={PAGER_PROPS}
			>
				<PagerDemo />
			</ComponentPreview>
		</div>
	);
}
