import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Baseline,
	Highlighter,
	Link2,
	ListOrdered,
	Settings2,
	Type,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	ToolbarControlGroup,
	ToolbarControlRow,
} from "@/components/ui/toolbar-control-group";

function DemoToolbarButton({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<Button
			type="button"
			variant="outline"
			size="icon"
			className="h-7 w-7 rounded-sm"
			aria-label={label}
		>
			{children}
		</Button>
	);
}

function DemoField({
	children,
	width,
}: {
	children: React.ReactNode;
	width: string;
}) {
	return (
		<div
			className="editor-border-subtle editor-text-strong flex h-7 items-center rounded-sm border px-2 text-xs"
			style={{ width }}
		>
			{children}
		</div>
	);
}

function StyleButtons() {
	return (
		<>
			<DemoToolbarButton label="Bold">
				<span className="font-black tracking-[-0.02em]">B</span>
			</DemoToolbarButton>
			<DemoToolbarButton label="Italic">
				<span className="font-medium italic">I</span>
			</DemoToolbarButton>
			<DemoToolbarButton label="Underline">
				<span className="underline">U</span>
			</DemoToolbarButton>
			<DemoToolbarButton label="Strikethrough">
				<span className="line-through">S</span>
			</DemoToolbarButton>
		</>
	);
}

function InlineColorAndLinkGroups() {
	return (
		<>
			<ToolbarControlGroup withDividerBefore>
				<DemoToolbarButton label="Text color">
					<Baseline className="h-3.5 w-3.5" />
				</DemoToolbarButton>
				<DemoToolbarButton label="Highlight color">
					<Highlighter className="h-3.5 w-3.5" />
				</DemoToolbarButton>
			</ToolbarControlGroup>
			<ToolbarControlGroup withDividerBefore>
				<DemoToolbarButton label="Link">
					<Link2 className="h-3.5 w-3.5" />
				</DemoToolbarButton>
			</ToolbarControlGroup>
		</>
	);
}

export function TypographyToolbarGroupingDemo() {
	return (
		<div className="space-y-3">
			<div
				className="editor-bg-surface editor-border-subtle inline-flex rounded-xl border p-2 shadow-sm"
				data-design-system-toolbar-grouping-demo="rich"
			>
				<div className="space-y-1.5">
					<ToolbarControlRow>
						<ToolbarControlGroup>
							<DemoField width="136px">Inter</DemoField>
							<DemoToolbarButton label="Manage fonts">
								<Settings2 className="h-3.5 w-3.5" />
							</DemoToolbarButton>
							<DemoField width="72px">18 px</DemoField>
						</ToolbarControlGroup>
						<ToolbarControlGroup withDividerBefore>
							<StyleButtons />
						</ToolbarControlGroup>
						<InlineColorAndLinkGroups />
						<ToolbarControlGroup withDividerBefore>
							<DemoToolbarButton label="Align left">
								<AlignLeft className="h-3.5 w-3.5" />
							</DemoToolbarButton>
							<DemoToolbarButton label="Align center">
								<AlignCenter className="h-3.5 w-3.5" />
							</DemoToolbarButton>
							<DemoToolbarButton label="Align right">
								<AlignRight className="h-3.5 w-3.5" />
							</DemoToolbarButton>
						</ToolbarControlGroup>
					</ToolbarControlRow>
					<ToolbarControlRow>
						<ToolbarControlGroup>
							<DemoToolbarButton label="Use text block">
								<Type className="h-3.5 w-3.5" />
							</DemoToolbarButton>
							<DemoToolbarButton label="Use ordered list">
								<ListOrdered className="h-3.5 w-3.5" />
							</DemoToolbarButton>
						</ToolbarControlGroup>
					</ToolbarControlRow>
				</div>
			</div>
			<div
				className="editor-bg-surface editor-border-subtle inline-flex rounded-xl border p-2 shadow-sm"
				data-design-system-toolbar-grouping-demo="block-list"
			>
				<ToolbarControlRow>
					<ToolbarControlGroup>
						<DemoField width="136px">Inherit</DemoField>
						<DemoField width="72px">16 px</DemoField>
					</ToolbarControlGroup>
					<ToolbarControlGroup withDividerBefore>
						<StyleButtons />
					</ToolbarControlGroup>
					<InlineColorAndLinkGroups />
				</ToolbarControlRow>
			</div>
		</div>
	);
}
