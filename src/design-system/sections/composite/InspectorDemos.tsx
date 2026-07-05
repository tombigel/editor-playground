import { ClosedCaption, LineStyle, PaintBucket, PanelRightClose, Pin, Settings2, TypeOutline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SwitchBlock } from "@/panels/InspectorControls";
import { EditableNodeTitle, InspectorSectionCard } from "@/panels/inspector/CommonSections";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

const INSPECTOR_TITLE_PROPS: PropDefinition[] = [
	{
		name: "node",
		type: "InspectorNode | null",
		description: "Current single selected node used for title, role badge, and empty state copy.",
	},
	{
		name: "actions",
		type: "Pick<InspectorActionHandlers, 'onTextChange'>",
		description: "Title-edit commit handler used by the editable node name.",
	},
];

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function InspectorDemos() {
	return (
		<>
			{/* Inspector Title */}
			<ComponentPreview
				id="composite-inspector-title"
				name="Inspector Title"
				description="Inspector summary header: editable node name, role badge, and collapse button."
				sourceFile="src/panels/inspector/CommonSections.tsx"
				props={INSPECTOR_TITLE_PROPS}
			>
				<div className="w-[300px]">
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
				</div>
			</ComponentPreview>

			{/* Section Card */}
			<ComponentPreview
				id="composite-section-card"
				name="Section Card"
				description="Titled card wrapper for inspector sections. Supports focused-mode entry, header actions, borderless mode, and custom header content."
				sourceFile="src/panels/inspector/CommonSections.tsx"
				props={[
					{ name: "title", type: "string", description: "Card header title." },
					{ name: "headerContent", type: "ReactNode", description: "Custom header content replacing the title." },
					{ name: "headerAction", type: "{ ariaLabel, icon, onClick }", description: "Header action button." },
					{ name: "focusedModeEntry", type: "FocusedModeEntry", description: "Focused-mode entry button shown in header." },
					{ name: "contentClassName", type: "string", description: "Custom class for CardContent." },
					{ name: "borderless", type: "boolean", default: "false", description: "Transparent card with no border or background." },
					{ name: "hideHeader", type: "boolean", default: "false", description: "Hides the header entirely." },
				]}
			>
				<div className="w-[300px] space-y-4">
					{/* Default */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Default</div>
						<InspectorSectionCard title="Layout">
							<div className="editor-text-muted text-[11px]">Card content area</div>
						</InspectorSectionCard>
					</div>

					{/* With focused-mode button */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Focused-mode entry</div>
						<InspectorSectionCard
							title="Design"
							focusedModeEntry={{
								mode: "design",
								label: "Design focus mode",
								tooltip: "Edit in focused mode",
								onEnter: () => {},
							}}
						>
							<div className="editor-text-muted text-[11px]">Card content area</div>
						</InspectorSectionCard>
					</div>

					{/* With header action */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Header action</div>
						<InspectorSectionCard
							title="Sticky"
							headerAction={{
								ariaLabel: "Configure sticky",
								icon: <Settings2 className="h-3.5 w-3.5" />,
								onClick: () => {},
							}}
						>
							<div className="editor-text-muted text-[11px]">Card content area</div>
						</InspectorSectionCard>
					</div>

					{/* Borderless */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Borderless</div>
						<InspectorSectionCard title="Content" borderless>
							<div className="editor-text-muted text-[11px]">Card content area</div>
						</InspectorSectionCard>
					</div>
				</div>
			</ComponentPreview>
			{/* SwitchBlock */}
			<ComponentPreview
				id="composite-switch-block"
				name="Switch Block"
				description="Bordered toggle card with icon, title, description, and switch. Accepts optional children rendered below a divider in the same block — used for nested controls that are only relevant when the toggle is active."
				sourceFile="src/panels/controls/FormLayout.tsx"
				props={[
					{ name: "icon", type: "ReactNode", description: "Optional icon element shown left of the title." },
					{ name: "title", type: "string", description: "Primary label." },
					{ name: "description", type: "string", description: "Secondary explanation text." },
					{ name: "checked", type: "boolean", description: "Switch value." },
					{ name: "onCheckedChange", type: "(value: boolean) => void", description: "Switch handler." },
					{ name: "children", type: "ReactNode", description: "Optional content shown below a divider when non-null." },
				]}
			>
				<div className="w-[300px] space-y-3">
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Gradient with nested child</div>
						<SwitchBlock
							icon={<PaintBucket className="h-3.5 w-3.5 shrink-0 editor-text-accent" />}
							title="Background gradient"
							description="Add a gradient layer."
							checked={true}
							onCheckedChange={() => {}}
						>
							<div className="flex items-center justify-between gap-3">
								<div className="flex min-w-0 items-start gap-2">
									<TypeOutline className="mt-0.5 h-3.5 w-3.5 shrink-0 editor-text-accent" />
									<div>
										<div className="editor-text-strong text-xs font-medium">Clip background to text</div>
										<div className="editor-text-muted text-[11px]">Paint text with the gradient.</div>
									</div>
								</div>
								<Switch checked onCheckedChange={() => {}} />
							</div>
						</SwitchBlock>
					</div>
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Standalone divider block</div>
						<SwitchBlock
							icon={<LineStyle className="h-3.5 w-3.5 shrink-0 editor-text-muted" />}
							title="Global stroke"
							description="Use one outline style."
							checked={false}
							onCheckedChange={() => {}}
						/>
					</div>
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Short description</div>
						<SwitchBlock
							icon={<ClosedCaption className="h-3.5 w-3.5 shrink-0 editor-text-accent" />}
							title="Video captions"
							description="Attach a WebVTT file."
							checked={true}
							onCheckedChange={() => {}}
						/>
					</div>
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Existing sticky use</div>
						<SwitchBlock
							icon={<Pin className="h-3.5 w-3.5 shrink-0 editor-text-muted" />}
							title="Global elevation"
							description="Elevate sticky elements."
							checked={false}
							onCheckedChange={() => {}}
						>
							<div className="flex items-center justify-between gap-3">
								<div>
									<div className="editor-text-strong text-xs font-medium">Elevate this node</div>
									<div className="editor-text-muted text-[11px]">Pin above siblings for this sticky only.</div>
								</div>
								<Switch checked={false} onCheckedChange={() => {}} />
							</div>
						</SwitchBlock>
					</div>
				</div>
			</ComponentPreview>

		</>
	);
}
