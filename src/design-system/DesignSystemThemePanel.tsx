import { SlidersHorizontal, X } from "lucide-react";
import {
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import type { EditorDarkTheme, EditorLightTheme, ThemeMode } from "@/lib/theme";
import { AccentSwatchRow, ThemePresetRow } from "@/panels/settings/SettingsShared";
import type { ResolvedThemeConfig } from "./types";

type Props = {
	config: ResolvedThemeConfig;
	onThemeModeChange: (mode: ThemeMode) => void;
	onLightThemeChange: (theme: EditorLightTheme) => void;
	onDarkThemeChange: (theme: EditorDarkTheme) => void;
	onAccentColorChange: (color: string) => void;
	onClose: () => void;
};

export function DesignSystemThemePanel({
	config,
	onThemeModeChange,
	onLightThemeChange,
	onDarkThemeChange,
	onAccentColorChange,
	onClose,
}: Props) {
	const [position, setPosition] = useState({ x: -1, y: 80 });
	const [dragging, setDragging] = useState(false);
	const dragOffset = useRef({ x: 0, y: 0 });
	const panelRef = useRef<HTMLDivElement>(null);

	const handlePointerDown = useCallback(
		(e: ReactPointerEvent<HTMLDivElement>) => {
			const panel = panelRef.current;
			if (!panel) return;
			const rect = panel.getBoundingClientRect();
			dragOffset.current = {
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
			};
			setDragging(true);
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		},
		[],
	);

	const handlePointerMove = useCallback(
		(e: ReactPointerEvent<HTMLDivElement>) => {
			if (!dragging) return;
			setPosition({
				x: e.clientX - dragOffset.current.x,
				y: e.clientY - dragOffset.current.y,
			});
		},
		[dragging],
	);

	const handlePointerUp = useCallback(() => {
		setDragging(false);
	}, []);

	const style: CSSProperties =
		position.x < 0
			? { position: "fixed", top: position.y, right: 24, zIndex: 50 }
			: {
					position: "fixed",
					top: position.y,
					left: position.x,
					zIndex: 50,
				};

	return (
		<div
			ref={panelRef}
			className="editor-focused-panel editor-settings-panel pointer-events-auto w-[280px] overflow-hidden rounded-xl border"
			style={style}
		>
			{/* Drag header */}
			<div
				className={`flex items-center justify-between gap-2 px-3 pt-3 pb-2 ${dragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			>
				<div className="editor-text-strong flex items-center gap-2 text-sm font-medium">
					<SlidersHorizontal className="h-3.5 w-3.5" />
					Theme
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="editor-icon-button-subtle h-7 w-7 rounded-md border"
					aria-label="Close theme panel"
					onClick={onClose}
					onPointerDown={(e) => e.stopPropagation()}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>

			<div className="space-y-3 px-3 pb-3">
				<ThemePresetRow
					themeMode={config.themeMode}
					resolvedTheme={config.resolved}
					lightTheme={config.lightTheme}
					darkTheme={config.darkTheme}
					onThemeModeChange={onThemeModeChange}
					onLightThemeChange={onLightThemeChange}
					onDarkThemeChange={onDarkThemeChange}
				/>
				<AccentSwatchRow value={config.resolvedAccent} onChange={onAccentColorChange} />
			</div>
		</div>
	);
}
