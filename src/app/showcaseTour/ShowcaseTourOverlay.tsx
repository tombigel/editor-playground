import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { PopoverSurface, PopoverTooltip } from "@/components/ui/popover";
import { OUTSIDE_CLICK_EXEMPT_ATTR } from "@/lib/useClickOutside";
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
import { cn, DARK_TOOLTIP_CLASS } from "@/lib/utils";
import {
	buildShowcaseTourSkinStyle,
	DEFAULT_SHOWCASE_TOUR_SKIN,
	type ShowcaseTourSkin,
} from "./showcaseTourSkin";
import {
	clampTourSurfacePosition,
	useTransientTourDragSurface,
} from "./useTransientTourDragSurface";

type Props = {
	config: ShowcaseTourConfig;
	location: ShowcaseTourLocation;
	onLocationChange: (location: ShowcaseTourLocation) => void;
	onClose: () => void;
	onApplyNavigation: (navigation: ShowcaseTourStepNavigation) => void;
	skin?: ShowcaseTourSkin;
};

const TOUR_MENU_WIDTH = 300;
const TOUR_SURFACE_GAP = 12;
const TOUR_MENU_FALLBACK_HEIGHT = 500;
const TOUR_MENU_ANCHOR_SELECTOR = '[data-showcase-tour-menu="true"]';
const EDITOR_NAVIGATION_SEARCH_KEYS = [
	"page",
	"select",
	"focus-mode",
	"panel",
	"settings",
	"help",
	"page-target",
	"pages-tab",
	"show-hidden",
	"sticky-preview",
	"animation-preview",
	"grid",
	"debug",
	"spacers",
	"tour",
	"step",
] as const;

export function ShowcaseTourOverlay({
	config,
	location,
	onLocationChange,
	onClose,
	onApplyNavigation,
	skin = DEFAULT_SHOWCASE_TOUR_SKIN,
}: Props) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [minimized, setMinimized] = useState(false);
	const panelDrag = useTransientTourDragSurface<HTMLElement>();
	const menuDrag = useTransientTourDragSurface<HTMLElement>();
	const {
		isDragging: isPanelDragging,
		position: panelPosition,
		startDrag: startPanelDrag,
		style: panelStyle,
		surfaceRef: panelRef,
	} = panelDrag;
	const {
		isDragging: isMenuDragging,
		position: menuPosition,
		setPosition: setMenuPosition,
		startDrag: startMenuDrag,
		style: menuStyle,
		surfaceRef: menuRef,
	} = menuDrag;
	const step = getShowcaseTourStep(config, location.stepId);
	const topic = getShowcaseTourTopic(config, location.topicId);
	const anchorState = useAnchorState(step);
	const isLast = isLastShowcaseTourStep(config, location);
	const latestApplyNavigationRef = useRef(onApplyNavigation);
	const autoOpenedMenuRef = useRef(false);
	const tourTopLayerKey = [
		location.topicId,
		location.stepId,
		menuOpen ? "menu" : "card",
		minimized ? "minimized" : "expanded",
		anchorState.available ? "anchored" : "unanchored",
		isPanelDragging ? "panel-dragging" : "panel-resting",
		isMenuDragging ? "menu-dragging" : "menu-resting",
		anchorState.rect ? Math.round(anchorState.rect.left) : "none",
		anchorState.rect ? Math.round(anchorState.rect.top) : "none",
	].join(":");
	const progress = useMemo(() => {
		const allSteps = config.topics.flatMap((candidate) =>
			getShowcaseTourStepsForTopic(config, candidate.id),
		);
		const index = allSteps.findIndex(
			(candidate) => candidate.id === location.stepId,
		);
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

	useEffect(() => {
		if (step?.anchor.type === "tourMenu") {
			autoOpenedMenuRef.current = true;
			if (!menuPosition) {
				setMenuPosition(getDefaultTourMenuPosition(panelRef.current));
			}
			setMenuOpen(true);
			return;
		}
		if (autoOpenedMenuRef.current) {
			autoOpenedMenuRef.current = false;
			setMenuOpen(false);
		}
	}, [menuPosition, panelRef, setMenuPosition, step?.anchor.type]);

	useEffect(() => {
		if (!menuOpen || menuPosition) return;
		setMenuPosition(getDefaultTourMenuPosition(panelRef.current));
	}, [menuOpen, menuPosition, panelRef, setMenuPosition]);

	useEffect(() => {
		if (!menuOpen || !menuPosition || isMenuDragging) return;
		const tunedPosition = tuneTourMenuPositionToMeasuredHeight(menuRef.current);
		if (!tunedPosition) return;
		if (
			Math.abs(tunedPosition.left - menuPosition.left) > 0.5 ||
			Math.abs(tunedPosition.top - menuPosition.top) > 0.5
		) {
			setMenuPosition(tunedPosition);
		}
	}, [
		isMenuDragging,
		menuOpen,
		menuPosition,
		menuRef,
		setMenuPosition,
	]);

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

	function toggleMenu() {
		if (!menuOpen && !menuPosition) {
			setMenuPosition(getDefaultTourMenuPosition(panelRef.current));
		}
		setMenuOpen((open) => !open);
	}

	return (
		<PopoverSurface
			open
			popoverMode="manual"
			bringToFrontKey={tourTopLayerKey}
			keepTopLayer
			onOpenChange={() => undefined}
			className={cn(
				"pointer-events-none fixed inset-0 h-[100dvh] w-screen border-0 bg-transparent p-0",
				skin.typographyClassName,
			)}
			data-showcase-tour="true"
			data-showcase-tour-skin={skin.id}
			{...{ [OUTSIDE_CLICK_EXEMPT_ATTR]: "true" }}
			style={buildShowcaseTourSkinStyle(skin)}
		>
			<div className="pointer-events-none absolute inset-0 bg-[color:var(--showcase-tour-backdrop-background)] backdrop-blur-[var(--showcase-tour-backdrop-blur)]" />
			<div className="pointer-events-none absolute inset-0">
				{!minimized && anchorState.rect ? (
					<TourTargetHighlight
						rect={anchorState.rect}
						label={anchorState.label}
					/>
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
				<>
					{menuOpen ? (
						<nav
							ref={menuRef}
							aria-label="Showcase tour topics"
							className={cn(
								"pointer-events-auto absolute flex max-h-[min(76vh,680px)] w-[300px] flex-col overflow-hidden border shadow-[var(--showcase-tour-surface-shadow)]",
								menuPosition ? null : "bottom-5 left-5",
								skin.surfaceClassName,
							)}
							style={{
								...menuStyle,
								background: "var(--showcase-tour-surface-background)",
								borderColor: "var(--showcase-tour-surface-border)",
								borderRadius: "var(--showcase-tour-radius)",
							}}
							data-showcase-tour-menu="true"
						>
							<div
								className="editor-border-subtle cursor-grab touch-none select-none border-b px-4 py-3 active:cursor-grabbing"
								onPointerDown={startMenuDrag}
								data-showcase-tour-menu-drag-handle="true"
							>
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
											<span className="min-w-0">
												<span className="block text-xs font-semibold leading-4 [overflow-wrap:anywhere]">
													{candidate.label}
												</span>
												<span className="editor-text-muted mt-0.5 block whitespace-normal break-words text-[11px] leading-4">
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
																"block w-full rounded-md px-2 py-1.5 text-left text-[11px] leading-4 [overflow-wrap:anywhere]",
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
						ref={panelRef}
						aria-live="polite"
						className={cn(
							"pointer-events-auto absolute w-[min(440px,calc(100vw-40px))] overflow-hidden border shadow-[var(--showcase-tour-surface-shadow)]",
							panelPosition ? null : "bottom-5 left-5",
							skin.surfaceClassName,
						)}
						style={{
							...panelStyle,
							background: "var(--showcase-tour-surface-background)",
							borderColor: "var(--showcase-tour-surface-border)",
							borderRadius: "var(--showcase-tour-radius)",
						}}
						data-showcase-tour-card="true"
					>
						<header
							className="editor-border-subtle flex cursor-grab touch-none select-none items-start justify-between gap-3 border-b px-4 py-3 active:cursor-grabbing"
							onPointerDown={startPanelDrag}
							data-showcase-tour-drag-handle="true"
						>
							<div>
								<div className="editor-text-muted text-[11px] font-medium">
									{topic.label} · {progress.index + 1}/{progress.total}
								</div>
								<h2 className="editor-text-strong mt-1 text-base font-semibold">
									{step.title}
								</h2>
							</div>
							<div className="flex gap-1">
								<TourIconButton
									label={menuOpen ? "Hide tour menu" : "Show tour menu"}
									onClick={toggleMenu}
								>
									<ListTree className="h-4 w-4" />
								</TourIconButton>
								<TourIconButton
									label="Hide tour panel"
									onClick={() => setMinimized(true)}
								>
									<Minimize2 className="h-4 w-4" />
								</TourIconButton>
								<TourIconButton label="Close showcase tour" onClick={onClose}>
									<X className="h-4 w-4" />
								</TourIconButton>
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
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={onClose}
								>
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
				</>
			)}
		</PopoverSurface>
	);
}

function useAnchorState(step: ShowcaseTourStep | null) {
	const [available, setAvailable] = useState(false);
	const [rect, setRect] = useState<DOMRect | null>(null);

	useEffect(() => {
		const selector = getAnchorSelector(step);
		if (!selector) {
			setAvailable(false);
			setRect(null);
			return;
		}
		if (typeof window === "undefined") {
			setAvailable(false);
			setRect(null);
			return;
		}
		const anchorSelector = selector;
		let frame = 0;
		function updateAnchorRect() {
			const element = window.document.querySelector(anchorSelector);
			const nextAvailable = Boolean(element);
			const nextRect = element ? element.getBoundingClientRect() : null;
			setAvailable((current) =>
				current === nextAvailable ? current : nextAvailable,
			);
			setRect((current) => (areRectsEqual(current, nextRect) ? current : nextRect));
		}
		function scheduleUpdate() {
			window.cancelAnimationFrame(frame);
			frame = window.requestAnimationFrame(updateAnchorRect);
		}
		updateAnchorRect();
		window.addEventListener("resize", scheduleUpdate);
		window.addEventListener("scroll", scheduleUpdate, true);
		const observer = new MutationObserver(scheduleUpdate);
		observer.observe(window.document.body, { childList: true, subtree: true });
		const timer = window.setTimeout(updateAnchorRect, 120);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(timer);
			observer.disconnect();
			window.removeEventListener("resize", scheduleUpdate);
			window.removeEventListener("scroll", scheduleUpdate, true);
		};
	}, [step]);

	if (!step || step.anchor.type === "none") {
		return { available: false, rect: null, label: undefined, message: null };
	}
	return {
		available,
		rect,
		label: getAnchorLabel(step),
		message: available
			? null
			: "This step is about a surface that appears after the editor finishes moving there. Use the route chips above if you want to open it yourself.",
	};
}

function getAnchorSelector(step: ShowcaseTourStep | null) {
	if (!step) return null;
	if (step.anchor.type === "selector") return step.anchor.selector;
	if (step.anchor.type === "tourMenu") return TOUR_MENU_ANCHOR_SELECTOR;
	return null;
}

function getAnchorLabel(step: ShowcaseTourStep) {
	if (step.anchor.type === "selector") return step.anchor.label;
	if (step.anchor.type === "tourMenu") return "Tour menu";
	return undefined;
}

function areRectsEqual(left: DOMRect | null, right: DOMRect | null) {
	if (!left || !right) {
		return left === right;
	}
	return (
		Math.abs(left.left - right.left) < 0.5 &&
		Math.abs(left.top - right.top) < 0.5 &&
		Math.abs(left.width - right.width) < 0.5 &&
		Math.abs(left.height - right.height) < 0.5
	);
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
	const labelBelow = rect.top - padding < 40;
	const labelMaxWidth =
		typeof window === "undefined"
			? undefined
			: `${Math.max(96, window.innerWidth - left - 16)}px`;

	return (
		<div
			className="pointer-events-none absolute rounded-[15px] border-0 bg-[color:var(--showcase-tour-highlight-background)] outline outline-4 outline-[color:var(--showcase-tour-highlight-border)] shadow-[var(--showcase-tour-highlight-shadow)]"
			style={{ left, top, width, height }}
			data-showcase-tour-highlight="true"
			aria-hidden="true"
		>
			{label ? (
				<div
					className={cn(
						"absolute left-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border bg-[color:var(--showcase-tour-highlight-label-background)] px-2 py-1 text-[11px] font-semibold text-[color:var(--showcase-tour-highlight-text)] shadow-[var(--showcase-tour-surface-shadow)]",
						labelBelow ? "top-full mt-2" : "bottom-full mb-2",
					)}
					style={{
						borderColor: "var(--showcase-tour-highlight-label-border)",
						maxWidth: labelMaxWidth,
					}}
					data-showcase-tour-highlight-label="true"
				>
					{label}
				</div>
			) : null}
		</div>
	);
}

function TourIconButton({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className={DARK_TOOLTIP_CLASS}
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label={label}
				onClick={onClick}
			>
				{children}
			</Button>
		</PopoverTooltip>
	);
}

function TourStepAction({
	action,
}: {
	action: NonNullable<ShowcaseTourStep["action"]>;
}) {
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
	const nextSearch = buildEditorNavigationSearch(
		{
			...(editorState ?? {}),
			tourTopic: location.topicId,
			tourStep: location.stepId,
		},
		getSanitizedTourBaseSearch(window.location.search),
	);
	window.history.replaceState(
		null,
		"",
		`${window.location.pathname}${nextSearch}${window.location.hash}`,
	);
}

function getSanitizedTourBaseSearch(search: string) {
	const params = new URLSearchParams(search);
	for (const key of EDITOR_NAVIGATION_SEARCH_KEYS) {
		params.delete(key);
	}
	return params;
}

function getDefaultTourMenuPosition(panel: HTMLElement | null) {
	if (typeof window === "undefined") {
		return { left: 20, top: 20 };
	}
	const panelRect = panel?.getBoundingClientRect();
	const fallbackPanelLeft = 20;
	const fallbackPanelRight = fallbackPanelLeft + 440;
	const fallbackPanelBottom = window.innerHeight - 20;
	const leftEdge = panelRect?.left ?? fallbackPanelLeft;
	const rightEdge = panelRect?.right ?? fallbackPanelRight;
	const bottomEdge = panelRect?.bottom ?? fallbackPanelBottom;
	const rightCandidate = rightEdge + TOUR_SURFACE_GAP;
	const leftCandidate = leftEdge - TOUR_MENU_WIDTH - TOUR_SURFACE_GAP;
	const hasRoomOnRight =
		rightCandidate + TOUR_MENU_WIDTH <=
		window.innerWidth - TOUR_SURFACE_GAP;
	const left = hasRoomOnRight ? rightCandidate : leftCandidate;
	return {
		left: clampTourSurfacePosition(
			left,
			TOUR_MENU_WIDTH,
			window.innerWidth,
		),
		top: clampTourSurfacePosition(
			bottomEdge - TOUR_MENU_FALLBACK_HEIGHT,
			TOUR_MENU_FALLBACK_HEIGHT,
			window.innerHeight,
		),
	};
}

function tuneTourMenuPositionToMeasuredHeight(menu: HTMLElement | null) {
	if (!menu || typeof window === "undefined") return null;
	const rect = menu.getBoundingClientRect();
	return {
		left: clampTourSurfacePosition(rect.left, rect.width, window.innerWidth),
		top: clampTourSurfacePosition(rect.top, rect.height, window.innerHeight),
	};
}
