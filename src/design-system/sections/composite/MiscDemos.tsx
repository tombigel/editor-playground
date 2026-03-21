import { SquareArrowRightEnter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComponentPreview } from "../../previews/ComponentPreview";

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function MiscDemos() {
	return (
		<>
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
		</>
	);
}
