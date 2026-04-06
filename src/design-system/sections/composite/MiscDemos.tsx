import { SquareArrowRightEnter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import { PanelHeader } from "@/components/ui/panel-header";
import { ComponentPreview } from "../../previews/ComponentPreview";

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
				props={[]}
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

			<ComponentPreview
				id="composite-floating-panel-shell"
				name="Floating Panel Shell"
				description="Shared floating popover shell with DS-owned header slot and scrollable body wrapper."
				sourceFile="src/components/ui/floating-panel-shell.tsx"
				props={[]}
			>
				<div className="relative h-[260px] w-[360px]">
					<FloatingPanelShell
						suppressPopover
						open
						onOpenChange={() => {}}
						className="absolute left-0 top-0 w-[320px]"
						style={{ top: 0, left: 0 }}
						header={
							<PanelHeader
								icon={<SquareArrowRightEnter className="h-4 w-4" />}
								title="Section Templates"
								description="Choose a layout to insert."
								closeLabel="Close section templates panel"
								onClose={() => undefined}
							/>
						}
						bodyClassName="editor-scrollbar max-h-[180px] overflow-y-auto p-3"
					>
						<div className="grid grid-cols-2 gap-2.5">
							{["Hero", "Feature", "CTA", "Gallery"].map((label) => (
								<div
									key={label}
									className="editor-border-subtle rounded-lg border p-2.5"
								>
									<div className="editor-text-strong text-xs font-semibold">{label}</div>
									<div className="editor-text-muted mt-1.5 text-[11px] leading-4">
										Shared shell body content.
									</div>
								</div>
							))}
						</div>
					</FloatingPanelShell>
				</div>
			</ComponentPreview>

			{/* Shortcuts */}
			<ComponentPreview
				id="composite-shortcuts"
				name="Shortcuts"
				description="Shortcut section container with keyboard shortcut rows."
				sourceFile="src/panels/ShortcutHelpContent.tsx"
				props={[]}
			>
				<div className="w-[300px]">
					<div className="editor-bg-subtle editor-border-subtle rounded-lg border p-3.5">
						<div className="editor-text-muted text-[11px] font-semibold uppercase tracking-wider">
							Edit
						</div>
						<div className="mt-2.5 space-y-2.5">
							{[
								{ label: "Mod+Z", description: "Undo" },
								{ label: "Mod+Shift+Z", description: "Redo" },
								{ label: "Delete", description: "Delete selected" },
							].map((item) => (
								<div
									key={item.label}
									className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
								>
									<span className="editor-text-strong text-xs leading-4">
										{item.description}
									</span>
									<kbd className="editor-kbd max-w-[14rem] whitespace-normal break-words rounded-md border px-1.5 py-0.5 text-right text-[11px] font-medium leading-4 shadow-sm">
										{item.label}
									</kbd>
								</div>
							))}
						</div>
					</div>
				</div>
			</ComponentPreview>

			{/* Focused Panel */}
			<ComponentPreview
				id="composite-focused-panel"
				name="Focused Panel"
				description="Floating focused-mode panel with drag handle, title, role badge, and exit button. Shows empty state when no node is selected."
				sourceFile="src/panels/FocusedModePanel.tsx"
				props={[]}
			>
				<div className="w-[300px]">
					<div className="editor-focused-panel editor-settings-panel overflow-hidden rounded-xl border shadow-lg">
						<div className="flex cursor-grab items-center justify-between gap-2 px-3 pt-3 pb-2">
							<div className="min-w-0 flex-1">
								<div className="editor-text-strong text-sm font-medium">
									Content
								</div>
								<div className="editor-text-muted mt-1 flex min-w-0 items-center gap-2 text-xs">
									<div className="truncate">Sticky Edge Lab</div>
									<span className="editor-pill-subtle shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium">
										section
									</span>
								</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="editor-icon-button-subtle h-7 w-7 rounded-md border"
								aria-label="Exit focused mode"
							>
								<SquareArrowRightEnter className="h-3.5 w-3.5" />
							</Button>
						</div>
						<div className="px-3 py-6">
							<div className="editor-text-strong text-sm font-medium">
								Nothing to edit yet
							</div>
							<div className="editor-text-muted mt-1 text-xs">
								Select a non-site node to edit its content controls from focused
								mode.
							</div>
						</div>
					</div>
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
					<div className="relative h-[110px] w-[320px] overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900">
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
