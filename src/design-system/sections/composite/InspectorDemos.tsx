import { PanelRightClose, Settings2, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableNodeTitle, InspectorSectionCard } from "@/panels/inspector/CommonSections";
import { ComponentPreview } from "../../previews/ComponentPreview";

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
		</>
	);
}
