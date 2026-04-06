import { SquareArrowRightEnter } from "lucide-react";
import { PanelHeader } from "@/components/ui/panel-header";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

const PANEL_HEADER_PROPS: PropDefinition[] = [
	{ name: "icon", type: "ReactNode", description: "Optional leading icon surface." },
	{ name: "title", type: "ReactNode", description: "Primary title content." },
	{ name: "description", type: "ReactNode", description: "Optional secondary copy below the title." },
	{ name: "actions", type: "ReactNode", description: "Optional trailing actions shown before the close button." },
	{ name: "closeLabel", type: "string", description: "Accessible label for the close button." },
	{ name: "onClose", type: "() => void", description: "Optional close handler that renders the close button." },
	{ name: "className", type: "string", description: "Optional wrapper class overrides." },
];

// ---------------------------------------------------------------------------
// Follow-link popup variants
// ---------------------------------------------------------------------------

const FOLLOW_LINK_VARIANTS: Array<{ label: string; aria: string }> = [
	{ label: "→ Go to About", aria: "Navigate to page" },
	{ label: "→ Broken page link", aria: "Broken page link" },
	{ label: "↗ https://example.com/landing-page", aria: "Open external link" },
	{ label: "↓ Jump to section", aria: "Scroll to anchor" },
];

function FollowLinkChip({ label, aria }: { label: string; aria: string }) {
	return (
		<div className="editor-bg-surface editor-border-subtle flex h-[40px] items-center rounded-md border px-3 py-1 shadow-md">
			<button
				type="button"
				className="editor-text-strong text-xs font-medium hover:underline"
				aria-label={aria}
			>
				{label}
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function MiscDemos() {
	return (
		<>
			<ComponentPreview
				id="composite-panel-header"
				name="Panel Header"
				description="Shared header contract for floating panels and dialog-like editor surfaces with icon, title, description, actions, and close button."
				sourceFile="src/components/ui/panel-header.tsx"
				props={PANEL_HEADER_PROPS}
			>
				<div className="w-[320px]">
					<PanelHeader
						icon={<SquareArrowRightEnter className="h-4 w-4" />}
						title="Section Templates"
						description="Choose a layout to insert."
						closeLabel="Close section templates panel"
						onClose={() => undefined}
						actions={
							<span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">
								Beta
							</span>
						}
					/>
				</div>
			</ComponentPreview>

			{/* Follow-link Popup */}
			<ComponentPreview
				id="composite-follow-link-popup"
				name="Follow-link Popup"
				description="Context popup that appears directly below the selected link node's edit box inside the stage frame. Shows the link target and allows immediate navigation or anchor jump. Rendered with position:absolute relative to the stage frame using the selection overlay bounds."
				sourceFile="src/panels/FollowLinkPopup.tsx"
				props={[
					{
						name: "node",
						type: "LinkLeaf",
						description: "The selected link node.",
					},
					{
						name: "document",
						type: "DocumentModel",
						description: "Used to resolve page display names for page links.",
					},
					{
						name: "bounds",
						type: "{ left: number; top: number; width: number; height: number }",
						description:
							"Stage-frame-relative bounding box of the selected node. The popup anchors 8px below the bottom edge.",
					},
					{
						name: "onNavigateToPage",
						type: "(pageId: PageId) => void",
						description: "Called when a page link button is clicked.",
					},
					{
						name: "onScrollToAnchor",
						type: "(nodeId: NodeId) => void",
						description: "Called when an anchor link button is clicked.",
					},
				]}
			>
				<div className="flex flex-col gap-6">
					{/* Variants row */}
					<div className="flex flex-wrap gap-3">
						{FOLLOW_LINK_VARIANTS.map((v) => (
							<FollowLinkChip key={v.label} label={v.label} aria={v.aria} />
						))}
					</div>

					{/* In-context mock: selection box + popup below */}
					<div className="editor-bg-subtle editor-border-subtle relative h-[110px] w-[320px] overflow-hidden rounded-md border border-dashed">
						{/* mock stage node */}
						<div
							className="absolute border-2 border-[var(--editor-accent)] bg-[color-mix(in_srgb,var(--editor-accent)_6%,transparent)]"
							style={{ left: 24, top: 16, width: 180, height: 36 }}
						>
							<span className="absolute -top-[18px] left-0 bg-[var(--editor-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
								Link
							</span>
						</div>
						{/* mock popup positioned 8px below the node */}
						<div className="absolute" style={{ left: 24, top: 68 }}>
							<FollowLinkChip label="→ Go to About" aria="Navigate to page" />
						</div>
					</div>
				</div>
			</ComponentPreview>

		</>
	);
}
