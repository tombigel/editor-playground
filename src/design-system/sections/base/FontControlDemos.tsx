import { useState } from "react";
import { EyeOff, File, Files, ListFilter } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectOptionRow,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FontPickerPopover } from "@/panels/InspectorControls";
import type { DocumentFontFamily } from "../../../model/types";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

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
	{
		name: "size",
		type: "'default' | 'compact' | 'small'",
		default: "'default'",
		description: "Propagated to SelectItem via context — sets item text size to match the trigger density (text-sm / text-xs / text-[11px]).",
	},
	{ name: "open", type: "boolean", description: "Open state (controlled)." },
	{ name: "defaultOpen", type: "boolean", description: "Default open state." },
];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

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

function FontPickerDemo() {
	return (
		<div className="space-y-6">
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
			{/* Multi-select (mixed) */}
			<div>
				<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Multi-select</div>
				<div className="flex gap-4">
					<div style={{ width: 136 }}>
						<div className="editor-text-muted mb-1 text-[10px]">Mixed family</div>
						<FontPickerPopover
							familyValue="sans-serif"
							weightValue={400}
							families={MOCK_FONT_FAMILIES}
							systemOptionValue="__system__"
							onFamilyChange={() => {}}
							onWeightChange={() => {}}
							className="w-full"
							mixedFamily
							recentFamilyNames={[]}
							onRecentFamiliesChange={() => {}}
							previewStylesheetHref={null}
						/>
					</div>
					<div style={{ width: 136 }}>
						<div className="editor-text-muted mb-1 text-[10px]">Mixed weight</div>
						<FontPickerPopover
							familyValue="sans-serif"
							weightValue={400}
							families={MOCK_FONT_FAMILIES}
							systemOptionValue="__system__"
							onFamilyChange={() => {}}
							onWeightChange={() => {}}
							className="w-full"
							mixedWeight
							recentFamilyNames={[]}
							onRecentFamiliesChange={() => {}}
							previewStylesheetHref={null}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

function SelectDemo() {
	const [value, setValue] = useState("currentPage");
	const [compactValue, setCompactValue] = useState("entrance");
	const [smallValue, setSmallValue] = useState("fade");
	const options = [
		{ value: "currentPage", label: "Current page", icon: <File className="h-3.5 w-3.5" /> },
		{ value: "allPages", label: "All pages", icon: <Files className="h-3.5 w-3.5" /> },
		{ value: "customPages", label: "Custom pages", icon: <ListFilter className="h-3.5 w-3.5" /> },
		{ value: "hidden", label: "Hidden", icon: <EyeOff className="h-3.5 w-3.5" /> },
	] as const;
	const activeOption = options.find((option) => option.value === value) ?? options[0];
	const triggerOptions = [
		{ value: "entrance", label: "Entrance" },
		{ value: "ongoing", label: "Ongoing" },
		{ value: "scroll", label: "Scroll" },
		{ value: "click", label: "Click" },
		{ value: "hover", label: "Hover" },
		{ value: "mouse", label: "Mouse" },
	];
	const effectOptions = [
		{ value: "fade", label: "Fade" },
		{ value: "slide", label: "Slide" },
		{ value: "bounce", label: "Bounce" },
		{ value: "spin", label: "Spin" },
	];
	return (
		<div className="space-y-6">
			{/* Default size */}
			<div>
				<div className="editor-text-muted mb-2 text-[10px] font-medium uppercase tracking-wide">
					Default — h-8, text-sm
				</div>
				<div className="w-[200px]">
					<Select value={value} onValueChange={setValue}>
						<SelectTrigger aria-label="Select demo">
							<SelectOptionRow
								icon={activeOption.icon}
								label={activeOption.label}
								labelClassName="text-xs font-medium"
							/>
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<SelectOptionRow
										icon={option.icon}
										label={option.label}
										labelClassName="text-xs font-medium"
									/>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Compact size */}
			<div>
				<div className="editor-text-muted mb-2 text-[10px] font-medium uppercase tracking-wide">
					Compact — h-8, text-xs (inspector controls)
				</div>
				<div className="editor-border-subtle w-full max-w-[300px] space-y-2 rounded-sm border p-3">
					<div className="flex items-center justify-between">
						<span className="editor-text-muted text-[11px]">Trigger</span>
						<div className="w-[140px]">
							<Select size="compact" value={compactValue} onValueChange={setCompactValue}>
								<SelectTrigger size="compact" aria-label="Trigger select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{triggerOptions.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex items-center justify-between">
						<span className="editor-text-muted text-[11px]">Effect</span>
						<div className="w-[140px]">
							<Select size="compact" value={smallValue} onValueChange={setSmallValue}>
								<SelectTrigger size="compact" aria-label="Effect select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{effectOptions.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			</div>

			{/* Small size */}
			<div>
				<div className="editor-text-muted mb-2 text-[10px] font-medium uppercase tracking-wide">
					Small — h-7, text-[11px]
				</div>
				<div className="w-[160px]">
					<Select size="small" value={compactValue} onValueChange={setCompactValue}>
						<SelectTrigger size="small" aria-label="Small select">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{triggerOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Multi-select (mixed) */}
			<div>
				<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
					Multi-select
				</div>
				<div className="w-[200px]">
					<Select value="__mixed__" onValueChange={() => {}}>
						<SelectTrigger
							aria-label="Select demo mixed"
							className="border-dashed"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__mixed__">-</SelectItem>
							<SelectItem value="air">Air</SelectItem>
							<SelectItem value="paper">Paper</SelectItem>
							<SelectItem value="midday">Midday</SelectItem>
							<SelectItem value="clarity">Clarity</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function FontControlDemos() {
	return (
		<>
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
		</>
	);
}
