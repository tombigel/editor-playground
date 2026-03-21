import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PopoverTooltip } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StatusMessage } from "@/panels/settings/SettingsShared";
import { ResizeHandleView } from "../../../stage/stageRenderers/resizeHandles";
import { MultiSelectionOutline } from "../../../stage/stageRenderers/selectionVisuals";
import { ComponentPreview } from "../../previews/ComponentPreview";
import { VariationsGrid } from "../../previews/VariationsGrid";
import type { PropDefinition } from "../../types";

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

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

const SELECTION_CHROME_PROPS: PropDefinition[] = [
	{
		name: "className",
		type: "string",
		description: "Additional CSS classes for the selection outline wrapper.",
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
// Interactive preview wrappers
// ---------------------------------------------------------------------------

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
					label: "Mixed / Intermediate",
					render: () => (
						<Switch
							checked={false}
							onCheckedChange={() => {}}
							className="bg-slate-400 data-[state=unchecked]:bg-slate-400 [&>[data-ui=switch-thumb]]:translate-x-[9px]"
						/>
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
			{/* Multi-select (mixed) */}
			<div>
				<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
					Multi-select
				</div>
				<div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border border-dashed p-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 rounded-md border border-dashed px-2.5 text-[11px]"
					>
						Left
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 rounded-md px-2.5 text-[11px]"
					>
						Center
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 rounded-md px-2.5 text-[11px]"
					>
						Right
					</Button>
				</div>
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
// Demos
// ---------------------------------------------------------------------------

export function MiscDemos() {
	return (
		<>
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
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
							Multi-select (mixed)
						</div>
						<Textarea placeholder="-" rows={3} />
					</div>
				</div>
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
		</>
	);
}
