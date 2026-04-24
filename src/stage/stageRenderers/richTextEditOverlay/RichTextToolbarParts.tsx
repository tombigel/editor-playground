import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { GripVertical } from "lucide-react";

import { ToolbarButton } from "./controls";

export function ToolbarDragHandle({
	dragging,
	onPointerDown,
}: {
	dragging: boolean;
	onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
	return (
		<button
			type="button"
			aria-label="Drag text toolbar"
			data-stage-rich-toolbar-drag-handle="true"
			data-dragging={dragging ? "true" : "false"}
			className={
				dragging
					? "editor-text-muted flex shrink-0 cursor-grabbing select-none touch-none self-center rounded-md px-1 py-2.5"
					: "editor-text-muted flex shrink-0 cursor-grab touch-none self-center rounded-md px-1 py-2.5"
			}
			onClick={(event) => event.preventDefault()}
			onPointerDown={onPointerDown}
		>
			<GripVertical size={16} />
		</button>
	);
}

export function TextAlignButton({
	label,
	active,
	onActivate,
	children,
}: {
	label: string;
	active: boolean;
	onActivate: () => void;
	children: ReactNode;
}) {
	return (
		<ToolbarButton label={label} active={active} onActivate={onActivate}>
			{children}
		</ToolbarButton>
	);
}
