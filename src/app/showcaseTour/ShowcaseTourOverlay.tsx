import { useEffect, useMemo, useRef, useState } from "react";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	ListTree,
	Minimize2,
	Sparkles,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PopoverSurface } from "@/components/ui/popover";
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
	const [minimized, setMinimized] = useState(false);
	const step = getShowcaseTourStep(config, location.stepId);
	const topic = getShowcaseTourTopic(config, location.topicId);
	const anchorState = useAnchorState(step);
	const isLast = isLastShowcaseTourStep(config, location);
	const latestApplyNavigationRef = useRef(onApplyNavigation);
	const progress = useMemo(() => {
		const allSteps = config.topics.flatMap((candidate) =>
			getShowcaseTourStepsForTopic(config, candidate.id),
		);
		const index = allSteps.findIndex((candidate) => candidate.id === location.stepId);
		return { index: Math.max(0, index), total: allSteps.length };
	}, [config, location.stepId]);

	useEscapeKey(() => setMinimized(true), !minimized);

	useEffect(() => {
		latestApplyNavigationRef.current = onApplyNavigation;
	}, [onApplyNavigation]);

	useEffect(() => {
		if (!step) return;
		latestApplyNavigationRef.current(step.navigation);
		syncTourUrl(location, step.navigation.editor);
	}, [location, step]);

	if (!step || !topic) {
		return null;
	}

	function goTo(nextLocation: ShowcaseTourLocation) {
		setMinimized(false);
		onLocationChange(nextLocation);
	}

	function goAdjacent(direction: "next" | "previous") {
		goTo(getAdjacentShowcaseTourStep(config, location, direction));
	}

	return (
		<PopoverSurface
			open
			popoverMode="manual"
			onOpenChange={() => undefined}
			className={cn(
				"pointer-events-none fixed inset-0 h-[100dvh] w-screen border-0 bg-transparent p-0",
				skin.typographyClassName,
			)}
			data-showcase-tour="true"
			data-showcase-tour-skin={skin.id}
			style={buildShowcaseTourSkinStyle(skin)}
		>
			<div className="pointer-events-none absolute inset-0 bg-[color:var(--showcase-tour-backdrop-background)] backdrop-blur-[var(--showcase-tour-backdrop-blur)]" />
			<div className="pointer-events-none absolute inset-0">
				{!minimized && anchorState.rect ? (
					<TourTargetHighlight rect={anchorState.rect} label={anchorState.label} />
				) : null}
			</div>
			{minimized ? (
				<Button
					type="button"
					size="sm"
					className="pointer-events-auto absolute bottom-5 left-5 shadow-[var(--showcase-tour-surface-shadow)]"
					onClick={() => setMinimized(false)}
				>
					<Sparkles className="h-4 w-4" />
					Show tour
				</Button>
			) : (
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
								Choose a thread, then jump anywhere.
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
								aria-label="Hide tour panel"
								onClick={() => setMinimized(true)}
							>
								<Minimize2 className="h-4 w-4" />
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
						{step.route && step.route.length > 0 ? (
							<div className="flex flex-wrap items-center gap-1.5">
								{step.route.map((item) => (
									<span
										key={`${step.id}-${item}`}
										className="rounded-md border border-[color:var(--showcase-tour-surface-border)] bg-[color:var(--showcase-tour-highlight-background)] px-2 py-1 text-[11px] font-medium text-[color:var(--showcase-tour-accent)]"
									>
										{item}
									</span>
								))}
							</div>
						) : null}
						<p className="editor-text-muted text-sm leading-6">{step.body}</p>
						{step.action ? <TourStepAction action={step.action} /> : null}
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
			)}
		</PopoverSurface>
	);
}

function useAnchorState(step: ShowcaseTourStep | null) {
	const [available, setAvailable] = useState(false);
	const [rect, setRect] = useState<DOMRect | null>(null);

	useEffect(() => {
		if (!step || step.anchor.type !== "selector") {
			setAvailable(false);
			setRect(null);
			return;
		}
		if (typeof window === "undefined") {
			setAvailable(false);
			setRect(null);
			return;
		}
		let frame = 0;
		const selector = step.anchor.selector;
		function updateAnchorRect() {
			const element = window.document.querySelector(selector);
			setAvailable(Boolean(element));
			setRect(element ? element.getBoundingClientRect() : null);
		}
		function scheduleUpdate() {
			window.cancelAnimationFrame(frame);
			frame = window.requestAnimationFrame(updateAnchorRect);
		}
		updateAnchorRect();
		window.addEventListener("resize", scheduleUpdate);
		window.addEventListener("scroll", scheduleUpdate, true);
		const timer = window.setTimeout(updateAnchorRect, 120);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(timer);
			window.removeEventListener("resize", scheduleUpdate);
			window.removeEventListener("scroll", scheduleUpdate, true);
		};
	}, [step]);

	if (!step || step.anchor.type === "none") {
		return { available: false, rect: null, label: undefined, message: null };
	}
	if (step.anchor.type === "tourMenu") {
		return { available: true, rect: null, label: undefined, message: null };
	}
	return {
		available,
		rect,
		label: step.anchor.label,
		message: available
			? null
			: "This step is about a surface that appears after the editor finishes moving there. Use the route chips above if you want to open it yourself.",
	};
}

function TourTargetHighlight({
	rect,
	label,
}: {
	rect: DOMRect;
	label?: string;
}) {
	const padding = 8;
	const left = Math.max(8, rect.left - padding);
	const top = Math.max(8, rect.top - padding);
	const width = Math.max(24, rect.width + padding * 2);
	const height = Math.max(24, rect.height + padding * 2);

	return (
		<div
			className="pointer-events-none absolute rounded-lg border-2 border-[color:var(--showcase-tour-highlight-border)] bg-[color:var(--showcase-tour-highlight-background)] shadow-[var(--showcase-tour-highlight-shadow)]"
			style={{ left, top, width, height }}
			data-showcase-tour-highlight="true"
			aria-hidden="true"
		>
			{label ? (
				<div className="absolute -top-7 left-0 whitespace-nowrap rounded-md border border-[color:var(--showcase-tour-highlight-border)] bg-[color:var(--showcase-tour-surface-background)] px-2 py-1 text-[11px] font-semibold text-[color:var(--showcase-tour-highlight-text)] shadow-[var(--showcase-tour-surface-shadow)]">
					{label}
				</div>
			) : null}
			<span className="absolute -left-0.5 -top-0.5 h-3 w-3 border-l-2 border-t-2 border-[color:var(--showcase-tour-highlight-border)]" />
			<span className="absolute -right-0.5 -top-0.5 h-3 w-3 border-r-2 border-t-2 border-[color:var(--showcase-tour-highlight-border)]" />
			<span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 border-b-2 border-l-2 border-[color:var(--showcase-tour-highlight-border)]" />
			<span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 border-b-2 border-r-2 border-[color:var(--showcase-tour-highlight-border)]" />
		</div>
	);
}

function TourStepAction({ action }: { action: NonNullable<ShowcaseTourStep["action"]> }) {
	if (action.type === "externalLink") {
		return (
			<a
				href={action.href}
				target="_blank"
				rel="noreferrer"
				className="inline-flex items-center gap-2 rounded-md border border-[color:var(--showcase-tour-surface-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--showcase-tour-accent)] hover:bg-[color:var(--showcase-tour-highlight-background)]"
			>
				<ExternalLink className="h-3.5 w-3.5" />
				{action.label}
			</a>
		);
	}
	return (
		<div className="rounded-lg border border-[color:var(--showcase-tour-surface-border)] bg-[color:var(--showcase-tour-highlight-background)] px-3 py-2 text-xs font-medium text-[color:var(--showcase-tour-accent)]">
			{action.label}
		</div>
	);
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
