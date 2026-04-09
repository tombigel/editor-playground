import { ArrowLeft, SlidersHorizontal, SwatchBook } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DesignSystemHeader({
	themePanelOpen,
	onToggleThemePanel,
}: {
	themePanelOpen: boolean;
	onToggleThemePanel: () => void;
}) {
	return (
		<header
			className="editor-border-subtle editor-bg-surface sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4"
			style={{ boxShadow: "var(--editor-surface-shadow)" }}
		>
			{/* Left: back + title */}
			<div className="flex items-center gap-3">
				<Button
					variant="ghost"
					size="sm"
					className="gap-1.5"
					onClick={() => {
						window.location.hash = "#/";
					}}
				>
					<ArrowLeft className="h-4 w-4" />
					Editor
				</Button>
				<div className="editor-border-subtle h-5 w-px" />
				<SwatchBook className="h-4 w-4" />
				<h1 className="editor-text-strong text-sm font-semibold leading-tight">
					Design System
				</h1>
			</div>

			{/* Right: theme panel toggle */}
			<Button
				variant={themePanelOpen ? "default" : "outline"}
				size="sm"
				className="gap-1.5"
				onClick={onToggleThemePanel}
				aria-label="Toggle theme controls"
			>
				<SlidersHorizontal className="h-3.5 w-3.5" />
				Theme
			</Button>
		</header>
	);
}
