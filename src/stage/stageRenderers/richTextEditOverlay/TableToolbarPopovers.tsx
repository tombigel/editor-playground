import {
	ArrowDownToLine,
	ArrowLeftToLine,
	ArrowRightToLine,
	ArrowUpToLine,
	Columns3,
	Rows3,
	Trash2,
} from "lucide-react";
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import { Button } from "@/components/ui/button";
import { PopoverSurface, PopoverTooltip } from "@/components/ui/popover";
import { useClickOutside } from "@/lib/useClickOutside";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { DARK_TOOLTIP_CLASS } from "@/lib/utils";

export function TableActionMenu({
	kind,
	open,
	onOpenChange,
	disableDelete,
	onInsertBefore,
	onInsertAfter,
	onDelete,
}: {
	kind: "rows" | "columns";
	open: boolean;
	onOpenChange: (open: boolean) => void;
	disableDelete: boolean;
	onInsertBefore: () => void;
	onInsertAfter: () => void;
	onDelete: () => void;
}) {
	const rows = kind === "rows";
	const label = rows ? "Rows" : "Columns";
	const TriggerIcon = rows ? Rows3 : Columns3;
	const BeforeIcon = rows ? ArrowUpToLine : ArrowLeftToLine;
	const AfterIcon = rows ? ArrowDownToLine : ArrowRightToLine;

	return (
		<ToolbarPopover
			open={open}
			onOpenChange={onOpenChange}
			label={`${label} actions`}
			trigger={<TriggerIcon size={14} />}
			triggerClassName="w-7 p-0"
			surfaceWidth={184}
		>
			<div role="menu" className="flex flex-col gap-0.5">
				<TableMenuItem
					icon={<BeforeIcon size={14} />}
					label={rows ? "Insert row above" : "Insert column left"}
					onActivate={() => {
						onInsertBefore();
						onOpenChange(false);
					}}
				/>
				<TableMenuItem
					icon={<AfterIcon size={14} />}
					label={rows ? "Insert row below" : "Insert column right"}
					onActivate={() => {
						onInsertAfter();
						onOpenChange(false);
					}}
				/>
				<div className="editor-border-subtle my-0.5 border-t" />
				<TableMenuItem
					icon={<Trash2 size={14} />}
					label={rows ? "Delete row" : "Delete column"}
					disabled={disableDelete}
					destructive
					onActivate={() => {
						onDelete();
						onOpenChange(false);
					}}
				/>
			</div>
		</ToolbarPopover>
	);
}

function TableMenuItem({
	icon,
	label,
	onActivate,
	disabled = false,
	destructive = false,
}: {
	icon: ReactNode;
	label: string;
	onActivate: () => void;
	disabled?: boolean;
	destructive?: boolean;
}) {
	return (
		<Button
			type="button"
			role="menuitem"
			variant={destructive ? "destructive" : "menu"}
			size="sm"
			disabled={disabled}
			className="h-7 w-full justify-start gap-2 rounded-sm px-2 text-xs"
			onPointerDown={preserveTableSelectionPointerDown}
			onClick={onActivate}
		>
			{icon}
			<span>{label}</span>
		</Button>
	);
}

export function ToolbarPopover({
	open,
	onOpenChange,
	label,
	trigger,
	triggerClassName,
	surfaceWidth,
	popupRole = "menu",
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	label: string;
	trigger: ReactNode;
	triggerClassName?: string;
	surfaceWidth: number;
	popupRole?: "menu" | "dialog";
	children: ReactNode;
}) {
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const surfaceRef = useRef<HTMLDivElement | null>(null);
	const [style, setStyle] = useState<CSSProperties>({
		top: 0,
		left: 0,
		visibility: "hidden",
	});
	const close = useCallback(() => onOpenChange(false), [onOpenChange]);
	const closeAndFocus = useCallback(() => {
		close();
		triggerRef.current?.focus();
	}, [close]);

	useEscapeKey(closeAndFocus, open);
	useClickOutside([triggerRef, surfaceRef], close, open);

	useEffect(() => {
		if (!open) {
			return;
		}

		const updatePosition = () => {
			const triggerRect = triggerRef.current?.getBoundingClientRect();
			if (!triggerRect) {
				return;
			}
			const margin = 12;
			const gap = 8;
			const surfaceHeight = surfaceRef.current?.offsetHeight ?? 160;
			const stageRect = document
				.querySelector<HTMLElement>('[aria-label="Editor stage"]')
				?.getBoundingClientRect();
			const minLeft = Math.max(margin, (stageRect?.left ?? 0) + 8);
			const maxLeft = Math.max(
				minLeft,
				Math.min(
					window.innerWidth - surfaceWidth - margin,
					(stageRect?.right ?? window.innerWidth) - surfaceWidth - 8,
				),
			);
			const fitsBelow =
				triggerRect.bottom + gap + surfaceHeight <= window.innerHeight - margin;
			setStyle({
				top: fitsBelow
					? triggerRect.bottom + gap
					: Math.max(margin, triggerRect.top - gap - surfaceHeight),
				left: Math.max(minLeft, Math.min(maxLeft, triggerRect.left)),
				visibility: "visible",
			});
		};

		updatePosition();
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);
		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [open, surfaceWidth]);

	const triggerButton = (
		<Button
			ref={triggerRef}
			type="button"
			variant={open ? "default" : "outline"}
			size="sm"
			className={`pointer-events-auto h-7 shrink-0 rounded-sm ${triggerClassName ?? ""}`}
			aria-label={label}
			aria-haspopup={popupRole}
			aria-expanded={open}
			onPointerDown={preserveTableSelectionPointerDown}
			onClick={() => onOpenChange(!open)}
		>
			{trigger}
		</Button>
	);

	return (
		<>
			<PopoverTooltip
				side="top"
				align="center"
				className={DARK_TOOLTIP_CLASS}
				content={<div className="leading-3.5 font-medium">{label}</div>}
			>
				{triggerButton}
			</PopoverTooltip>
			<PopoverSurface
				ref={surfaceRef}
				open={open}
				onOpenChange={onOpenChange}
				keepTopLayer
				className="editor-bg-surface editor-border-subtle fixed z-[440] rounded-md border p-1 shadow-[var(--editor-surface-shadow)]"
				style={{ ...style, width: surfaceWidth }}
				onPointerDown={(event) => event.stopPropagation()}
			>
				{children}
			</PopoverSurface>
		</>
	);
}

export function preserveTableSelectionPointerDown(
	event: React.PointerEvent<HTMLElement>,
) {
	event.preventDefault();
	event.stopPropagation();
}
