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
	ActionRow,
	ControlGroup,
	LabeledControlRow,
	NumericRow,
	SettingRow,
} from "@/components/ui/settings-panel";
import {
	getAccentColorForDarkThemeSelection,
	getAccentColorForLightThemeSelection,
	resolveEditorAccentColor,
} from "@/lib/theme";
import {
	AccentSwatchRow,
	ThemePresetRow,
} from "@/panels/settings/SettingsShared";
import { ComponentPreview } from "../../previews/ComponentPreview";

// ---------------------------------------------------------------------------
// Interactive demo wrappers
// ---------------------------------------------------------------------------

function ThemeSettingsDemo() {
	const [mode, setMode] = useState<"light" | "dark" | "auto">("auto");
	const [lightTheme, setLightTheme] = useState<
		"air" | "paper" | "midday" | "clarity"
	>("air");
	const [darkTheme, setDarkTheme] = useState<
		"graphite" | "monokai" | "midnight" | "ink"
	>("monokai");
	const [accent, setAccent] = useState("#1668ff");
	const resolvedTheme = mode === "auto" ? "light" : mode;
	const resolvedAccent = resolveEditorAccentColor(accent);

	return (
		<div className="space-y-4">
			<ThemePresetRow
				themeMode={mode}
				resolvedTheme={resolvedTheme}
				lightTheme={lightTheme}
				darkTheme={darkTheme}
				onThemeModeChange={setMode}
				onLightThemeChange={(value) => {
					setLightTheme(value);
					setAccent((current) =>
						getAccentColorForLightThemeSelection(value, current),
					);
				}}
				onDarkThemeChange={(value) => {
					setDarkTheme(value);
					setAccent((current) =>
						getAccentColorForDarkThemeSelection(value, current),
					);
				}}
			/>
			<AccentSwatchRow value={resolvedAccent} onChange={setAccent} />
		</div>
	);
}

function SettingsPrimitivesDemo() {
	const [previewSticky, setPreviewSticky] = useState(true);
	const [historyLimit, setHistoryLimit] = useState(100);

	return (
		<div className="space-y-8">
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Inspector/settings row groups
				</div>
				<div className="editor-bg-surface editor-border-subtle rounded-xl border p-3">
					<ControlGroup>
						<LabeledControlRow label="Language">
							<div className="editor-text-muted rounded-md border px-2 py-1 text-[11px]">
								Site language
							</div>
						</LabeledControlRow>
					</ControlGroup>
					<ControlGroup separated className="mt-2.5">
						<LabeledControlRow label="Visible">
							<div className="editor-text-muted text-[11px]">On</div>
						</LabeledControlRow>
					</ControlGroup>
				</div>
			</div>

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
			<ComponentPreview
				id="composite-settings-theme"
				name="Settings Theme Controls"
				description="Theme and accent controls shared between editor settings and the design system."
				sourceFile="src/panels/settings/SettingsShared.tsx"
				props={[]}
			>
				<div className="w-[560px]">
					<ThemeSettingsDemo />
				</div>
			</ComponentPreview>

			<ComponentPreview
				id="composite-settings-primitives"
				name="Settings Panel Primitives"
				description="Reusable settings panel rows and layout primitives promoted to the shared UI surface."
				sourceFile="src/components/ui/settings-panel.tsx"
				props={[]}
			>
				<div className="w-[560px]">
					<SettingsPrimitivesDemo />
				</div>
			</ComponentPreview>

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
