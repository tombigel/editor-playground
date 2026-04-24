import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ToolbarControlRow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn("flex items-center gap-2", className)}
			data-ui="toolbar-control-row"
		>
			{children}
		</div>
	);
}

export function ToolbarControlGroup({
	children,
	className,
	withDividerBefore = false,
}: {
	children: ReactNode;
	className?: string;
	withDividerBefore?: boolean;
}) {
	return (
		<div
			className={cn("flex items-center gap-1", className)}
			data-ui="toolbar-control-group"
			data-divider-before={withDividerBefore ? "true" : "false"}
		>
			{withDividerBefore ? (
				<span
					aria-hidden="true"
					className="editor-border-subtle mr-1 h-5 w-px shrink-0 border-l"
					data-ui="toolbar-control-divider"
				/>
			) : null}
			{children}
		</div>
	);
}
