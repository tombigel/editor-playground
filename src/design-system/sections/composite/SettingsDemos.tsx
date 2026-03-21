import {
	Clipboard,
	Eye,
	FileDown,
	Keyboard,
	Type,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	AccentSwatchRow,
	ActionRow,
	NumericRow,
	SettingRow,
	ThemePresetRow,
} from "@/panels/settings/SettingsShared";
import { ComponentPreview } from "../../previews/ComponentPreview";

// ---------------------------------------------------------------------------
// Interactive demo wrappers
// ---------------------------------------------------------------------------

function SettingsDemo() {
	const [previewSticky, setPreviewSticky] = useState(true);
	const [mode, setMode] = useState<"light" | "dark" | "auto">("auto");
	const [lightTheme, setLightTheme] = useState<
		"air" | "paper" | "midday" | "clarity"
	>("air");
	const [darkTheme, setDarkTheme] = useState<
		"graphite" | "monokai" | "midnight" | "ink"
	>("monokai");
	const [accent, setAccent] = useState("#1668ff");
	const [historyLimit, setHistoryLimit] = useState(100);
	const resolvedTheme = mode === "auto" ? "light" : mode;

	return (
		<div className="space-y-8">
			{/* Appearance */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Appearance (theme + accent)
				</div>
				<ThemePresetRow
					themeMode={mode}
					resolvedTheme={resolvedTheme}
					lightTheme={lightTheme}
					darkTheme={darkTheme}
					onThemeModeChange={setMode}
					onLightThemeChange={setLightTheme}
					onDarkThemeChange={setDarkTheme}
				/>
				<AccentSwatchRow value={accent} onChange={setAccent} />
			</div>

			{/* Toggle item */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Toggle item (SettingRow)
				</div>
				<SettingRow
					icon={Eye}
					title="Sticky preview"
					description="Applies CSS sticky behavior in preview."
					checked={previewSticky}
					onCheckedChange={setPreviewSticky}
				/>
			</div>

			{/* Action items */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Action items (ActionRow)
				</div>
				<ActionRow
					icon={FileDown}
					title="Save JSON"
					description="Uses the browser save picker when available."
					actions={
						<Button type="button" variant="outline" size="sm">
							Save JSON
						</Button>
					}
				/>
				<ActionRow
					icon={Clipboard}
					title="Copy JSON"
					description="Copies the current document model to the clipboard."
					actions={
						<Button type="button" variant="outline" size="sm">
							Copy JSON
						</Button>
					}
				/>
			</div>

			{/* Numeric items */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Numeric items (NumericRow)
				</div>
				<NumericRow
					title="Undo retention"
					description="Current stack: 42 undo / 3 redo"
					value={historyLimit}
					onChange={setHistoryLimit}
				/>
			</div>

			{/* Action with destructive */}
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Destructive action items
				</div>
				<ActionRow
					title="Reset stage"
					description="Reset document data, or reset data plus editor preferences."
					actions={
						<div className="flex gap-2">
							<Button type="button" variant="outline" size="sm">
								Reset data
							</Button>
							<Button type="button" variant="destructive" size="sm">
								Reset all
							</Button>
						</div>
					}
				/>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function SettingsDemos() {
	return (
		<>
			{/* Settings Controls */}
			<ComponentPreview
				id="composite-settings"
				name="Settings Controls"
				description="Shared settings panel building blocks: theme/accent pickers, toggle rows, action rows, and numeric rows."
				sourceFile="src/panels/settings/SettingsShared.tsx"
				props={[]}
			>
				<div className="w-[560px]">
					<SettingsDemo />
				</div>
			</ComponentPreview>

			{/* Settings Nav Item */}
			<ComponentPreview
				id="composite-settings-nav"
				name="Settings Nav Item"
				description="Settings sidebar navigation link in idle, hover, and active states."
				sourceFile="src/panels/SettingsPanel.tsx"
				props={[]}
			>
				<div className="flex gap-3">
					{/* Idle */}
					<button
						type="button"
						data-active="false"
						className="settings-nav-link flex w-[170px] items-start gap-3 rounded-lg px-3 py-2.5 text-left"
					>
						<Eye className="mt-0.5 h-4 w-4 shrink-0" />
						<div className="min-w-0">
							<div className="text-sm font-medium">UI</div>
							<div className="settings-nav-link-copy mt-0.5 text-xs leading-5">
								Idle
							</div>
						</div>
					</button>
					{/* Hover */}
					<button
						type="button"
						data-active="false"
						className="settings-nav-link flex w-[170px] items-start gap-3 rounded-lg px-3 py-2.5 text-left"
						style={{
							background: "var(--editor-settings-nav-hover-background)",
							color: "var(--editor-settings-nav-hover-text)",
						}}
					>
						<Type className="mt-0.5 h-4 w-4 shrink-0" />
						<div className="min-w-0">
							<div className="text-sm font-medium">Fonts</div>
							<div
								className="mt-0.5 text-xs leading-5"
								style={{
									color: "var(--editor-settings-nav-active-muted)",
								}}
							>
								Hover
							</div>
						</div>
					</button>
					{/* Selected */}
					<button
						type="button"
						data-active="true"
						className="settings-nav-link flex w-[170px] items-start gap-3 rounded-lg px-3 py-2.5 text-left shadow-sm"
					>
						<Keyboard className="mt-0.5 h-4 w-4 shrink-0" />
						<div className="min-w-0">
							<div className="text-sm font-medium">Shortcuts</div>
							<div className="settings-nav-link-copy mt-0.5 text-xs leading-5">
								Selected
							</div>
						</div>
					</button>
				</div>
			</ComponentPreview>
		</>
	);
}
