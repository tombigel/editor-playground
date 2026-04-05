import type { ReactNode } from "react";
import { PopoverSurface } from "@/components/ui/popover";

export type TreeDragGhostProps = {
	clientX: number;
	clientY: number;
	icon: ReactNode;
	title: string;
	badges?: ReactNode;
	subtitle: string;
	projectedSubtitle?: string | null;
};

export function TreeDragGhost({
	clientX,
	clientY,
	icon,
	title,
	badges,
	subtitle,
	projectedSubtitle = null,
}: TreeDragGhostProps) {
	return (
		<PopoverSurface
			open
			popoverMode="manual"
			className="editor-layers-drag-ghost m-0"
			style={{
				transform: `translate(${clientX + 14}px, ${clientY + 14}px)`,
			}}
		>
			<div className="editor-layers-drag-ghost-body">
				<span className="editor-layers-row-icon">{icon}</span>
				<span className="min-w-0">
					<span className="flex min-w-0 items-center gap-1">
						<span className="editor-layers-row-title truncate text-sm font-medium">
							{title}
						</span>
						{badges ? (
							<span className="editor-layers-row-badges flex shrink-0 items-center gap-0.5">
								{badges}
							</span>
						) : null}
					</span>
					{projectedSubtitle ? (
						<span className="editor-layers-type-transition mt-0.5 flex items-center gap-1 text-[11px] leading-4">
							<span className="editor-layers-row-type truncate">
								{subtitle}
							</span>
							<span className="editor-layers-type-arrow" aria-hidden="true">
								-&gt;
							</span>
							<span className="editor-layers-row-type truncate">
								{projectedSubtitle}
							</span>
						</span>
					) : (
						<span className="editor-layers-row-type mt-0.5 block truncate text-[11px] leading-4">
							{subtitle}
						</span>
					)}
				</span>
			</div>
		</PopoverSurface>
	);
}
