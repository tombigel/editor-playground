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
import { ComponentPreview } from "../../previews/ComponentPreview";
import { VariationsGrid } from "../../previews/VariationsGrid";
import type { PropDefinition } from "../../types";

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const BUTTON_PROPS: PropDefinition[] = [
	{
		name: "variant",
		type: "'default' | 'secondary' | 'outline' | 'ghost' | 'menu' | 'destructive'",
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
		type: "'default' | 'outline' | 'ghost' | 'menu'",
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

const SHORTCUT_KEY_PROPS: PropDefinition[] = [
	{
		name: "className",
		type: "string",
		description: "editor-kbd utility class for keyboard shortcut styling.",
	},
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
							label: "Menu",
							render: () => (
								<Button variant="menu" size="sm" className="gap-1.5 rounded-sm px-2.5">
									<Settings className="h-4 w-4" /> Actions
								</Button>
							),
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
						label: "Menu",
						render: () => (
							<Button size="icon" variant="menu" className="h-7 w-7 rounded-sm" data-selected="true">
								<Settings className="h-3.5 w-3.5" />
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

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function InteractionDemos() {
	return (
		<>
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
		</>
	);
}
