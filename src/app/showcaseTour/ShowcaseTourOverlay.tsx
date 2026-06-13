import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ListTree, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEscapeKey } from "@/lib/useEscapeKey";
import {
	buildEditorNavigationSearch,
	type EditorNavigationUrlState,
} from "@/api/editorNavigationApi";
import {
	getAdjacentShowcaseTourStep,
	getShowcaseTourStep,
	getShowcaseTourStepsForTopic,
	getShowcaseTourTopic,
	isLastShowcaseTourStep,
	type ShowcaseTourConfig,
	type ShowcaseTourLocation,
	type ShowcaseTourStep,
	type ShowcaseTourStepNavigation,
} from "@/api/showcaseTourApi";
import { cn } from "@/lib/utils";
import {
	buildShowcaseTourSkinStyle,
	DEFAULT_SHOWCASE_TOUR_SKIN,
	type ShowcaseTourSkin,
} from "./showcaseTourSkin";

type Props = {
	config: ShowcaseTourConfig;
	location: ShowcaseTourLocation;
	onLocationChange: (location: ShowcaseTourLocation) => void;
	onClose: () => void;
	onApplyNavigation: (navigation: ShowcaseTourStepNavigation) => void;
	skin?: ShowcaseTourSkin;
};

export function ShowcaseTourOverlay({
	config,
	location,
	onLocationChange,
	onClose,
	onApplyNavigation,
	skin = DEFAULT_SHOWCASE_TOUR_SKIN,
}: Props) {
	const [menuOpen, setMenuOpen] = useState(true);
	const step = getShowcaseTourStep(config, location.stepId);
	const topic = getShowcaseTourTopic(config, location.topicId);
	const anchorState = useAnchorState(step);
	const isLast = isLastShowcaseTourStep(config, location);
	const progress = useMemo(() => {
		const allSteps = config.topics.flatMap((candidate) =>
			getShowcaseTourStepsForTopic(config, candidate.id),
		);
		const index = allSteps.findIndex((candidate) => candidate.id === location.stepId);
		return { index: Math.max(0, index), total: allSteps.length };
	}, [config, location.stepId]);

	useEscapeKey(onClose, true);

	useEffect(() => {
		if (!step) return;
		onApplyNavigation(step.navigation);
		syncTourUrl(location, step.navigation.editor);
	}, [location, onApplyNavigation, step]);

	if (!step || !topic) {
		return null;
	}

	function goTo(nextLocation: ShowcaseTourLocation) {
		onLocationChange(nextLocation);
	}

	function goAdjacent(direction: "next" | "previous") {
		goTo(getAdjacentShowcaseTourStep(config, location, direction));
	}

	return (
		<div
			className={cn("pointer-events-none fixed inset-0", skin.typographyClassName)}
			data-showcase-tour="true"
			data-showcase-tour-skin={skin.id}
			style={buildShowcaseTourSkinStyle(skin)}
		>
			<div className="pointer-events-auto absolute inset-0 bg-[color:var(--showcase-tour-backdrop-background)] backdrop-blur-[var(--showcase-tour-backdrop-blur)]" />
			<div className="pointer-events-none absolute inset-0">
				{anchorState.available ? (
					<div className="absolute left-4 top-16 rounded-md border border-[color:var(--showcase-tour-highlight-border)] bg-[color:var(--showcase-tour-highlight-background)] px-2 py-1 text-[11px] font-medium text-[color:var(--showcase-tour-highlight-text)] shadow-[var(--editor-accent-shadow)]">
						Target visible
					</div>
				) : null}
			</div>
			<div className="pointer-events-auto absolute bottom-5 left-5 flex max-h-[calc(100vh-40px)] max-w-[calc(100vw-40px)] items-end gap-3">
				{menuOpen ? (
					<nav
						aria-label="Showcase tour topics"
						className={cn(
							"flex max-h-[min(76vh,680px)] w-[300px] flex-col overflow-hidden border shadow-[var(--showcase-tour-surface-shadow)]",
							skin.surfaceClassName,
						)}
						style={{
							background: "var(--showcase-tour-surface-background)",
							borderColor: "var(--showcase-tour-surface-border)",
							borderRadius: "var(--showcase-tour-radius)",
						}}
						data-showcase-tour-menu="true"
					>
						<div className="editor-border-subtle border-b px-4 py-3">
							<div className="editor-text-strong text-sm font-semibold">
								Showcase tour
							</div>
							<div className="editor-text-muted mt-1 text-xs">
								Jump by topic or step.
							</div>
						</div>
						<div className="editor-scrollbar min-h-0 overflow-y-auto p-2">
							{config.topics.map((candidate) => (
								<div key={candidate.id} className="mb-1">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className={cn(
											"h-auto w-full justify-start px-2 py-2 text-left",
											candidate.id === topic.id &&
												"bg-[color:var(--showcase-tour-highlight-background)] text-[color:var(--showcase-tour-accent)]",
										)}
										onClick={() =>
											goTo({
												topicId: candidate.id,
												stepId: candidate.stepIds[0],
											})
										}
									>
										<span>
											<span className="block text-xs font-semibold">
												{candidate.label}
											</span>
											<span className="editor-text-muted mt-0.5 block text-[11px] leading-4">
												{candidate.description}
											</span>
										</span>
									</Button>
									{candidate.id === topic.id ? (
										<div className="ml-3 border-l border-[color:var(--editor-utility-border)] py-1 pl-2">
											{getShowcaseTourStepsForTopic(config, candidate.id).map(
												(candidateStep) => (
													<button
														key={candidateStep.id}
														type="button"
														className={cn(
															"block w-full rounded-md px-2 py-1.5 text-left text-[11px] leading-4",
															candidateStep.id === step.id
																? "bg-[color:var(--showcase-tour-active-step-background)] text-[color:var(--showcase-tour-active-step-foreground)]"
																: "editor-text-muted hover:bg-[color:var(--editor-utility-bg-subtle)]",
														)}
														onClick={() =>
															goTo({
																topicId: candidate.id,
																stepId: candidateStep.id,
															})
														}
													>
														{candidateStep.title}
													</button>
												),
											)}
										</div>
									) : null}
								</div>
							))}
						</div>
					</nav>
				) : null}

				<section
					aria-live="polite"
					className={cn(
						"w-[min(440px,calc(100vw-40px))] overflow-hidden border shadow-[var(--showcase-tour-surface-shadow)]",
						skin.surfaceClassName,
					)}
					style={{
						background: "var(--showcase-tour-surface-background)",
						borderColor: "var(--showcase-tour-surface-border)",
						borderRadius: "var(--showcase-tour-radius)",
					}}
				>
					<header className="editor-border-subtle flex items-start justify-between gap-3 border-b px-4 py-3">
						<div>
							<div className="editor-text-muted text-[11px] font-medium">
								{topic.label} · {progress.index + 1}/{progress.total}
							</div>
							<h2 className="editor-text-strong mt-1 text-base font-semibold">
								{step.title}
							</h2>
						</div>
						<div className="flex gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label={menuOpen ? "Hide tour menu" : "Show tour menu"}
								onClick={() => setMenuOpen((open) => !open)}
							>
								<ListTree className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="Close showcase tour"
								onClick={onClose}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</header>
					<div className="space-y-3 px-4 py-4">
						<p className="editor-text-muted text-sm leading-6">{step.body}</p>
						{anchorState.message ? (
							<div className="editor-bg-subtle editor-border-subtle rounded-lg border px-3 py-2 text-xs text-[color:var(--editor-utility-text-muted)]">
								{anchorState.message}
							</div>
						) : null}
					</div>
					<footer className="editor-border-subtle flex items-center justify-between gap-2 border-t px-4 py-3">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => goAdjacent("previous")}
							disabled={progress.index === 0}
						>
							<ChevronLeft className="h-4 w-4" />
							Back
						</Button>
						<div className="flex gap-2">
							<Button type="button" variant="ghost" size="sm" onClick={onClose}>
								Skip
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={() => (isLast ? onClose() : goAdjacent("next"))}
							>
								{isLast ? (
									<>
										<Check className="h-4 w-4" />
										Done
									</>
								) : (
									<>
										Next
										<ChevronRight className="h-4 w-4" />
									</>
								)}
							</Button>
						</div>
					</footer>
				</section>
			</div>
		</div>
	);
}

function useAnchorState(step: ShowcaseTourStep | null) {
	const [available, setAvailable] = useState(false);

	useEffect(() => {
		if (!step || step.anchor.type !== "selector") {
			setAvailable(false);
			return;
		}
		if (typeof window === "undefined") {
			setAvailable(false);
			return;
		}
		const element = window.document.querySelector(step.anchor.selector);
		setAvailable(Boolean(element));
	}, [step]);

	if (!step || step.anchor.type === "none") {
		return { available: false, message: "This step uses a centered overview." };
	}
	if (step.anchor.type === "tourMenu") {
		return { available: true, message: null };
	}
	return {
		available,
		message: available
			? null
			: "The target surface is not visible yet; this step falls back to the overview panel.",
	};
}

function syncTourUrl(
	location: ShowcaseTourLocation,
	editorState: EditorNavigationUrlState | undefined,
) {
	if (typeof window === "undefined") {
		return;
	}
	const nextSearch = buildEditorNavigationSearch({
		...(editorState ?? {}),
		tourTopic: location.topicId,
		tourStep: location.stepId,
	}, window.location.search);
	window.history.replaceState(
		null,
		"",
		`${window.location.pathname}${nextSearch}${window.location.hash}`,
	);
}
