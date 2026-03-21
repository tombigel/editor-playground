import { SlidersHorizontal, X } from "lucide-react";
import {
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	EDITOR_ACCENT_SWATCHES,
	EDITOR_DARK_THEME_OPTIONS,
	EDITOR_LIGHT_THEME_OPTIONS,
	type EditorDarkTheme,
	type EditorLightTheme,
	isEditorAccentSwatch,
	type ResolvedTheme,
} from "@/lib/theme";
import type { ResolvedThemeConfig } from "./types";

type Props = {
	config: ResolvedThemeConfig;
	onThemeModeChange: (mode: ResolvedTheme) => void;
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

	const paletteOptions =
		config.resolved === "light"
			? EDITOR_LIGHT_THEME_OPTIONS
			: EDITOR_DARK_THEME_OPTIONS;
	const paletteValue =
		config.resolved === "light" ? config.lightTheme : config.darkTheme;
	const isCustomAccent = !isEditorAccentSwatch(config.accentColor);

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
			className="editor-focused-panel editor-settings-panel pointer-events-auto w-[280px] rounded-xl border"
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
				{/* Light / Dark toggle */}
				<div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-1">
					{(["light", "dark"] as const).map((mode) => (
						<Button
							key={mode}
							type="button"
							variant={config.resolved === mode ? "default" : "ghost"}
							size="sm"
							onClick={() => onThemeModeChange(mode)}
							className="min-w-[64px] rounded-md capitalize"
						>
							{mode}
						</Button>
					))}
				</div>

				{/* Palette select */}
				<div>
					<div className="editor-text-muted mb-1 text-[11px] font-medium">
						Palette
					</div>
					<Select
						value={paletteValue}
						onValueChange={(next) =>
							config.resolved === "light"
								? onLightThemeChange(next as EditorLightTheme)
								: onDarkThemeChange(next as EditorDarkTheme)
						}
					>
						<SelectTrigger aria-label="Palette" className="h-8 w-full text-xs">
							<span className="truncate">
								{paletteOptions.find((o) => o.value === paletteValue)?.label ??
									paletteValue}
							</span>
						</SelectTrigger>
						<SelectContent>
							{paletteOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div className="flex min-w-0 flex-col">
										<span>{option.label}</span>
										<span className="editor-text-muted mt-0.5 text-[11px] leading-4">
											{option.description}
										</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Accent swatches */}
				<div>
					<div className="editor-text-muted mb-1 flex items-center justify-between text-[11px] font-medium">
						<span>Accent</span>
						<span className="editor-text-muted rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-none">
							{config.resolvedAccent}
						</span>
					</div>
					<div className="space-y-1.5">
						<div className="flex gap-1.5">
							{EDITOR_ACCENT_SWATCHES.slice(0, 4).map((swatch) => (
								<button
									key={swatch.value}
									type="button"
									onClick={() => onAccentColorChange(swatch.value)}
									aria-label={swatch.label}
									title={swatch.label}
									data-active={
										swatch.value.toLowerCase() ===
										config.accentColor.toLowerCase()
											? "true"
											: "false"
									}
									className="editor-accent-swatch"
									style={{ "--swatch-color": swatch.value } as CSSProperties}
								/>
							))}
						</div>
						<div className="flex gap-1.5">
							{EDITOR_ACCENT_SWATCHES.slice(4).map((swatch) => (
								<button
									key={swatch.value}
									type="button"
									onClick={() => onAccentColorChange(swatch.value)}
									aria-label={swatch.label}
									title={swatch.label}
									data-active={
										swatch.value.toLowerCase() ===
										config.accentColor.toLowerCase()
											? "true"
											: "false"
									}
									className="editor-accent-swatch"
									style={{ "--swatch-color": swatch.value } as CSSProperties}
								/>
							))}
							<div className="relative h-8 w-8 shrink-0">
								<ColorPicker
									value={config.accentColor}
									fallback={isCustomAccent ? config.accentColor : "#1668ff"}
									allowAlpha={false}
									ariaLabel="Custom accent color"
									onChange={onAccentColorChange}
									className={`editor-color-picker editor-icon-button-subtle h-8 w-8 overflow-hidden rounded-md border shadow-sm ${isCustomAccent ? "editor-accent-swatch-custom-active" : ""}`}
								/>
								<span className="pointer-events-none absolute inset-0 flex items-center justify-center">
									<SlidersHorizontal className="h-3.5 w-3.5 text-white/92 mix-blend-plus-lighter drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)]" />
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
