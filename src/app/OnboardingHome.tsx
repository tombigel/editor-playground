import { ArrowRight, FilePlus2, FileUp, Sparkles, SwatchBook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolvePublicAssetUrl } from "@/lib/publicAssets";
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

type OnboardingHomeProps = {
	hasCurrentSite: boolean;
	onContinueCurrentSite: () => void;
	onStartBlank: () => void;
	onLoadJson: () => void;
	onStartTour: () => void;
	onOpenDesignSystem: () => void;
};

export function OnboardingHome({
	hasCurrentSite,
	onContinueCurrentSite,
	onStartBlank,
	onLoadJson,
	onStartTour,
	onOpenDesignSystem,
}: OnboardingHomeProps) {
	return (
		<main className="editor-shell flex min-h-screen w-screen items-center justify-center overflow-auto p-6">
			<section className="w-full max-w-[760px]">
				<div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-4">
						<img
							src={resolvePublicAssetUrl("editor-playground-logo-one-line.svg")}
							alt="Editor Playground"
							className="h-10 w-auto max-w-full"
						/>
						<p className="editor-text-muted max-w-[480px] text-sm leading-6">
							Build, inspect, preview, and export sticky-aware site documents.
						</p>
					</div>
					<div className="editor-bg-subtle editor-border-subtle grid min-w-[220px] gap-2 rounded-xl border p-3">
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

				<div className="grid gap-3 sm:grid-cols-2">
					{hasCurrentSite ? (
						<Button
							type="button"
							variant="default"
							className="h-auto justify-between px-4 py-4 text-left"
							onClick={onContinueCurrentSite}
						>
							<span className="flex min-w-0 flex-col gap-1">
								<span>Continue current site</span>
								<span className="editor-text-muted text-xs font-normal">
									Resume the locally stored editor document.
								</span>
							</span>
							<ArrowRight className="size-4" />
						</Button>
					) : null}
					<Button
						type="button"
						variant={hasCurrentSite ? "outline" : "default"}
						className="h-auto justify-between px-4 py-4 text-left"
						onClick={onStartBlank}
					>
						<span className="flex min-w-0 flex-col gap-1">
							<span>Start blank</span>
							<span className="editor-text-muted text-xs font-normal">
								Header, footer, and one empty section.
							</span>
						</span>
						<FilePlus2 className="size-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-auto justify-between px-4 py-4 text-left"
						onClick={onLoadJson}
					>
						<span className="flex min-w-0 flex-col gap-1">
							<span>Load JSON</span>
							<span className="editor-text-muted text-xs font-normal">
								Import a document file into the editor.
							</span>
						</span>
						<FileUp className="size-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-auto justify-between px-4 py-4 text-left"
						onClick={onStartTour}
					>
						<span className="flex min-w-0 flex-col gap-1">
							<span>Start tour</span>
							<span className="editor-text-muted text-xs font-normal">
								Open the guided editor walkthrough.
							</span>
						</span>
						<Sparkles className="size-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-auto justify-between px-4 py-4 text-left"
						onClick={onOpenDesignSystem}
					>
						<span className="flex min-w-0 flex-col gap-1">
							<span>Design system</span>
							<span className="editor-text-muted text-xs font-normal">
								Browse tokens, primitives, and editor chrome.
							</span>
						</span>
						<SwatchBook className="size-4" />
					</Button>
				</div>
			</section>
		</main>
	);
}
