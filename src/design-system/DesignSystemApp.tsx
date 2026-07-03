import type { CSSProperties } from "react";
import { useCallback, useState } from "react";
import { DesignSystemHeader } from "./DesignSystemHeader";
import { DesignSystemNav } from "./DesignSystemNav";
import { DesignSystemStage } from "./DesignSystemStage";
import { DesignSystemThemePanel } from "./DesignSystemThemePanel";
import { DS_SECTIONS } from "./registry";
import { AiSection } from "./sections/ai";
import { BaseComponentsSection } from "./sections/base";
import { CompositeSection } from "./sections/composite";
import { DesignTokensSection } from "./sections/DesignTokensSection";
import { PanelsSection } from "./sections/panels";
import { useDesignSystemTheme } from "./useDesignSystemTheme";

export default function DesignSystemApp() {
	const {
		config,
		themeKey,
		setThemeMode,
		setLightTheme,
		setDarkTheme,
		setAccentColor,
	} = useDesignSystemTheme();

	const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(
		null,
	);
	const [themePanelOpen, setThemePanelOpen] = useState(false);

	const scrollRef = useCallback((node: HTMLElement | null) => {
		setScrollContainer(node);
	}, []);

	return (
		<div
			className="editor-shell editor-settings-panel flex h-screen w-screen flex-col overflow-hidden"
			data-editor-theme={config.resolved}
			data-theme-mode={config.themeMode}
			data-editor-light-theme={config.lightTheme}
			data-editor-dark-theme={config.darkTheme}
			style={
				{
					"--editor-accent": config.resolvedAccent,
				} as CSSProperties
			}
		>
			<DesignSystemHeader
				themePanelOpen={themePanelOpen}
				onToggleThemePanel={() => setThemePanelOpen((v) => !v)}
			/>
			<div className="flex min-h-0 flex-1">
				<DesignSystemNav
					sections={DS_SECTIONS}
					scrollContainer={scrollContainer}
				/>
				<DesignSystemStage scrollRef={scrollRef}>
					{/* Design Tokens */}
					<section className="mb-16">
						<h2 className="editor-text-strong mb-6 text-xl font-bold">
							Design Tokens
						</h2>
						<DesignTokensSection themeKey={themeKey} />
					</section>

					{/* Base Components */}
					<section className="mb-16">
						<h2 className="editor-text-strong mb-6 text-xl font-bold">
							Base Components
						</h2>
						<BaseComponentsSection />
					</section>

					{/* Composites + Inspector Sections */}
					<section className="mb-16">
						<h2 className="editor-text-strong mb-6 text-xl font-bold">
							Composites
						</h2>
						<CompositeSection />
					</section>

					<section className="mb-16">
						<h2 className="editor-text-strong mb-6 text-xl font-bold">
							Panels
						</h2>
						<PanelsSection />
					</section>

					<section className="mb-16">
						<h2 className="editor-text-strong mb-6 text-xl font-bold">
							AI Assistant
						</h2>
						<AiSection />
					</section>
				</DesignSystemStage>
			</div>
			{themePanelOpen ? (
				<DesignSystemThemePanel
					config={config}
					onThemeModeChange={setThemeMode}
					onLightThemeChange={setLightTheme}
					onDarkThemeChange={setDarkTheme}
					onAccentColorChange={setAccentColor}
					onClose={() => setThemePanelOpen(false)}
				/>
			) : null}
		</div>
	);
}
