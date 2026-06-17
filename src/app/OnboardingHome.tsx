import {
	ArrowRight,
	FilePlus2,
	FileUp,
	type LucideIcon,
	Monitor,
	Moon,
	Sparkles,
	Sun,
	SwatchBook,
} from "lucide-react";
import { OptionsSelector } from "@/components/ui/options-selector";
import { resolvePublicAssetUrl } from "@/lib/publicAssets";
import type {
	EditorDarkTheme,
	EditorLightTheme,
	ResolvedTheme,
	ThemeMode,
} from "@/lib/theme";
import {
	API_VERSION,
	DOCUMENT_MODEL_VERSION,
	EDITOR_VERSION,
	PROJECT_VERSION,
} from "@/lib/version";

const VERSIONS = [
	{ label: "Project", value: PROJECT_VERSION },
	{ label: "Document", value: DOCUMENT_MODEL_VERSION },
	{ label: "API", value: API_VERSION },
	{ label: "Editor", value: EDITOR_VERSION },
] as const;

const PROJECT_GITHUB_URL = "https://github.com/tombigel/editor-playground";
const THEME_MODE_OPTIONS = [
	{
		value: "auto",
		label: "Auto",
		icon: <Monitor className="size-3.5" aria-hidden="true" />,
	},
	{
		value: "light",
		label: "Light",
		icon: <Sun className="size-3.5" aria-hidden="true" />,
	},
	{
		value: "dark",
		label: "Dark",
		icon: <Moon className="size-3.5" aria-hidden="true" />,
	},
] as const;

type OnboardingHomeProps = {
	hasCurrentSite: boolean;
	themeMode: ThemeMode;
	resolvedTheme: ResolvedTheme;
	lightTheme: EditorLightTheme;
	darkTheme: EditorDarkTheme;
	onThemeModeChange: (themeMode: ThemeMode) => void;
	onContinueCurrentSite: () => void;
	onStartBlank: () => void;
	onLoadJson: () => void;
	onStartTour: () => void;
	onOpenDesignSystem: () => void;
};

type OnboardingActionItemProps = {
	label: string;
	description: string;
	icon: LucideIcon;
	onClick: () => void;
};

function OnboardingActionItem({
	label,
	description,
	icon: Icon,
	onClick,
}: OnboardingActionItemProps) {
	return (
		<li>
			<button
				type="button"
				className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-left outline-none transition-[background-color,border-color,box-shadow] hover:bg-[color:color-mix(in_srgb,var(--editor-accent)_8%,var(--editor-surface-background))] focus-visible:border-[color:var(--editor-accent)] focus-visible:bg-[color:color-mix(in_srgb,var(--editor-accent)_10%,var(--editor-surface-background))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--editor-focus-ring-strong)] focus-visible:shadow-[var(--editor-accent-shadow)]"
				data-onboarding-action={label}
				onClick={onClick}
			>
				<span className="editor-bg-subtle editor-border-subtle flex size-9 shrink-0 items-center justify-center rounded-md border text-[color:var(--editor-utility-text-muted)] transition-[border-color,color] group-focus-visible:border-[color:var(--editor-accent)] group-focus-visible:text-[color:var(--editor-accent)]">
					<Icon className="size-4" aria-hidden="true" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="editor-text-strong block text-sm font-semibold">
						{label}
					</span>
					<span className="editor-text-muted mt-0.5 block text-xs leading-5">
						{description}
					</span>
				</span>
				<ArrowRight
					className="size-4 shrink-0 text-[color:var(--editor-utility-text-muted)] opacity-70 transition-[color,opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:translate-x-0.5 group-focus-visible:text-[color:var(--editor-accent)] group-focus-visible:opacity-100"
					aria-hidden="true"
				/>
			</button>
		</li>
	);
}

export function OnboardingHome({
	hasCurrentSite,
	themeMode,
	resolvedTheme,
	lightTheme,
	darkTheme,
	onThemeModeChange,
	onContinueCurrentSite,
	onStartBlank,
	onLoadJson,
	onStartTour,
	onOpenDesignSystem,
}: OnboardingHomeProps) {
	return (
		<main
			aria-labelledby="onboarding-title"
			data-editor-theme={resolvedTheme}
			data-theme-mode={themeMode}
			data-editor-light-theme={lightTheme}
			data-editor-dark-theme={darkTheme}
			className="editor-shell flex min-h-screen w-screen items-center justify-center overflow-auto p-6"
		>
			<section className="w-full max-w-[760px]">
				<div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-4">
						<h1 id="onboarding-title" className="sr-only">
							Welcome to Editor Playground
						</h1>
						<img
							src={resolvePublicAssetUrl("editor-playground-logo-one-line.svg")}
							alt="Editor Playground"
							className="h-10 w-auto max-w-full"
						/>
						<p className="editor-text-muted max-w-[480px] text-sm leading-6">
							Design and validate document-model sites in one place: compose
							pages, inspect the generated structure, tune sticky interactions,
							and preview the exported result.
						</p>
					</div>
					<div className="grid min-w-[220px] gap-3">
						<div className="editor-bg-subtle editor-border-subtle grid gap-2 rounded-xl border p-3">
							{VERSIONS.map((version) => (
								<div
									key={version.label}
									className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs"
								>
									<span className="editor-text-muted">{version.label}</span>
									<span className="editor-text-strong font-mono text-[11px]">
										{version.value}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>

				<nav
					aria-label="Welcome actions"
					className="editor-bg-surface editor-border-subtle rounded-xl border p-2 shadow-[var(--editor-surface-shadow)]"
				>
					<ul className="grid gap-1">
						{hasCurrentSite ? (
							<OnboardingActionItem
								label="Continue current site"
								description="Resume the locally stored editor document."
								icon={ArrowRight}
								onClick={onContinueCurrentSite}
							/>
						) : null}
						<OnboardingActionItem
							label="Start blank"
							description="Header, footer, and one empty section."
							icon={FilePlus2}
							onClick={onStartBlank}
						/>
						<OnboardingActionItem
							label="Load JSON"
							description="Import a document file into the editor."
							icon={FileUp}
							onClick={onLoadJson}
						/>
						<OnboardingActionItem
							label="Start tour"
							description="Open the guided editor walkthrough."
							icon={Sparkles}
							onClick={onStartTour}
						/>
						<OnboardingActionItem
							label="Design system"
							description="Browse tokens, primitives, and editor chrome."
							icon={SwatchBook}
							onClick={onOpenDesignSystem}
						/>
					</ul>
				</nav>
				<footer className="editor-text-muted mt-5 flex flex-col gap-3 text-left text-xs leading-5 sm:flex-row sm:items-center sm:justify-between">
					<p>
						Built by Tom Bigelajzen 2026
						<span aria-hidden="true"> | </span>
						<a
							href={PROJECT_GITHUB_URL}
							target="_blank"
							rel="noreferrer"
							className="editor-text-strong rounded-sm underline decoration-[color:var(--editor-utility-border)] underline-offset-4 outline-none transition-[color,outline-color] hover:text-[color:var(--editor-accent)] focus-visible:text-[color:var(--editor-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--editor-focus-ring-strong)]"
						>
							Project GitHub
						</a>
					</p>
					<OptionsSelector
						value={themeMode}
						options={THEME_MODE_OPTIONS}
						onValueChange={(value) => onThemeModeChange(value as ThemeMode)}
						display="icon"
						ariaLabel="Welcome theme"
						className="self-start sm:self-auto"
					/>
				</footer>
			</section>
		</main>
	);
}
