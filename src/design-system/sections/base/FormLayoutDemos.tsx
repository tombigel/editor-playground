import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NumberInput } from "@/components/ui/number-input";
import { FormField } from "@/panels/InspectorControls";
import { ComponentPreview } from "../../previews/ComponentPreview";
import { VariationsGrid } from "../../previews/VariationsGrid";
import type { PropDefinition } from "../../types";

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

const LABEL_PROPS: PropDefinition[] = [
	{ name: "htmlFor", type: "string", description: "Associated input id." },
];

const FORM_FIELD_PROPS: PropDefinition[] = [
	{ name: "label", type: "string | ReactNode", description: "Field label text or richer label content for inline notices/status." },
	{
		name: "layout",
		type: "'stack' | 'inline' | 'inline-start' | 'inline-group'",
		description:
			"Label-to-control arrangement. stack = label above (default), inline = label left with justify-between, inline-start = label left compact, inline-group = label left with grouped controls right.",
	},
	{ name: "className", type: "string", description: "Outer wrapper class." },
	{ name: "labelClassName", type: "string", description: "Label class override." },
	{ name: "description", type: "ReactNode", description: "Optional supporting text/content rendered below the field." },
	{ name: "descriptionClassName", type: "string", description: "Supporting text class override." },
	{ name: "controlClassName", type: "string", description: "Control wrapper class override (inline modes only)." },
	{ name: "controlWidth", type: "string", description: "Explicit control width for inline and inline-group control rails." },
];

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function FormLayoutDemos() {
	return (
		<>
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

			{/* FormField Layout Modes */}
			<ComponentPreview
				id="base-form-field"
				name="FormField"
				description="Labeled field wrapper with four layout modes for inspector controls."
				sourceFile="src/panels/controls/FormLayout.tsx"
				props={FORM_FIELD_PROPS}
			>
				<VariationsGrid
					columns={1}
					variations={[
						{
							label: 'layout="stack" (default)',
							render: () => (
								<div className="editor-border-subtle w-[260px] rounded-md border p-3">
									<FormField label="Font family">
										<Input placeholder="Inter" onChange={() => {}} />
									</FormField>
								</div>
							),
						},
						{
							label: 'supporting description',
							render: () => (
								<div className="editor-border-subtle w-[280px] rounded-md border p-3">
									<FormField
										label="Align"
										description="Uses the first selected node as the anchor."
									>
										<div className="flex flex-wrap gap-1">
											<Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 text-xs">
												L
											</Button>
											<Button type="button" variant="default" size="sm" className="h-8 w-8 p-0 text-xs">
												C
											</Button>
											<Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 text-xs">
												R
											</Button>
										</div>
									</FormField>
								</div>
							),
						},
						{
							label: 'layout="inline"',
							render: () => (
								<div className="editor-border-subtle w-[280px] space-y-2 rounded-md border p-3">
									<FormField label="Trigger" layout="inline">
										<Select value="entrance" onValueChange={() => {}}>
											<SelectTrigger><SelectValue /></SelectTrigger>
											<SelectContent>
												<SelectItem value="entrance">Entrance</SelectItem>
												<SelectItem value="scroll">Scroll</SelectItem>
											</SelectContent>
										</Select>
									</FormField>
									<FormField label="Requires sticky" layout="inline">
										<Switch checked={false} onCheckedChange={() => {}} />
									</FormField>
									<FormField label="Depth" layout="inline">
										<NumberInput value={50} min={0} max={100} step={1} onChange={() => {}} />
									</FormField>
								</div>
							),
						},
						{
							label: 'label={<...>} with inline notice',
							render: () => (
								<div className="editor-border-subtle w-[280px] rounded-md border p-3">
									<FormField
										label={(
											<div className="flex items-center justify-between gap-2">
												<span>Section</span>
												<span className="editor-pill-subtle rounded-md px-1.5 py-0.5 text-[10px] font-medium">
													Broken anchor
												</span>
											</div>
										)}
									>
										<Select value="hero" onValueChange={() => {}}>
											<SelectTrigger><SelectValue /></SelectTrigger>
											<SelectContent>
												<SelectItem value="hero">Hero</SelectItem>
												<SelectItem value="features">Features</SelectItem>
											</SelectContent>
										</Select>
									</FormField>
								</div>
							),
						},
						{
							label: 'layout="inline-start"',
							render: () => (
								<div className="editor-border-subtle w-[260px] rounded-md border p-3">
									<FormField label="Status" layout="inline-start">
										<span className="editor-bg-subtle editor-border-subtle editor-text-muted rounded border px-1.5 py-0.5 text-[10px]">
											named
										</span>
									</FormField>
								</div>
							),
						},
						{
							label: 'layout="inline-group" with right-aligned fixed rail',
							render: () => (
								<div className="editor-border-subtle w-[280px] rounded-md border p-3">
									<FormField label="Align" layout="inline-group" controlWidth="172px" controlClassName="gap-1">
										<Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 text-xs">
											L
										</Button>
										<Button type="button" variant="default" size="sm" className="h-8 w-8 p-0 text-xs">
											C
										</Button>
										<Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 text-xs">
											R
										</Button>
									</FormField>
								</div>
							),
						},
						{
							label: 'layout="inline-group" compact numeric pair',
							render: () => (
								<div className="editor-border-subtle w-[260px] rounded-md border p-3">
									<FormField label="Size" layout="inline-group">
										<NumberInput value={100} min={0} max={999} step={1} onChange={() => {}} />
										<NumberInput value={50} min={0} max={999} step={1} onChange={() => {}} />
									</FormField>
								</div>
							),
						},
					]}
				/>
			</ComponentPreview>
		</>
	);
}
