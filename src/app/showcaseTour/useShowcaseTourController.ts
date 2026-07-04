import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type Dispatch,
} from "react";
import {
	buildEditorNavigationSearch,
	parseEditorNavigationSearch,
	type EditorPanelRequest,
} from "@/api/editorNavigationApi";
import {
	getShowcaseTourPanelRequests,
	resolveShowcaseTourLocation,
	type ShowcaseTourLocation,
	type ShowcaseTourStepNavigation,
} from "@/api/showcaseTourApi";
import type { EditorState } from "@/api/editorApi";
import type { HistoryAction } from "../editorState";
import { buildAppHash, parseAppRoute } from "../appRouting";
import { SHOWCASE_TOUR_CONFIG } from "./showcaseTourConfig";

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

type UseShowcaseTourControllerOptions = {
	searchParams: URLSearchParams;
	state: EditorState;
	dispatch: Dispatch<HistoryAction>;
	applyPanelRequest: (request: EditorPanelRequest) => void;
};

type ShowcaseTourReturnState = {
	search: string;
	navigation: {
		activePageId?: string;
		selectedNodeId?: string;
		focusedMode: EditorState["ui"]["focusedMode"];
		showHidden: boolean;
		previewSticky: boolean;
		animationPreviewEnabled: boolean;
		spacerVisibility: EditorState["ui"]["spacerVisibility"];
		showGridLanes: boolean;
		showDebugInfo: boolean;
	};
};

export function useShowcaseTourController({
	searchParams,
	state,
	dispatch,
	applyPanelRequest,
}: UseShowcaseTourControllerOptions) {
	const initialTourLocation = useMemo<ShowcaseTourLocation | null>(() => {
		const navigation = parseEditorNavigationSearch(searchParams);
		if (!navigation.tourTopic && !navigation.tourStep) {
			return null;
		}
		return resolveShowcaseTourLocation(SHOWCASE_TOUR_CONFIG, {
			topicId: navigation.tourTopic,
			stepId: navigation.tourStep,
		});
	}, [searchParams]);
	const [showcaseTourLocation, setShowcaseTourLocation] =
		useState<ShowcaseTourLocation | null>(initialTourLocation);
	const tourReturnStateRef = useRef<ShowcaseTourReturnState | null>(
		initialTourLocation
			? createShowcaseTourReturnState(state, searchParams, "clean")
			: null,
	);
	const searchTourLocation = useMemo<ShowcaseTourLocation | null>(() => {
		const navigation = parseEditorNavigationSearch(searchParams);
		if (!navigation.tourTopic && !navigation.tourStep) {
			return null;
		}
		return resolveShowcaseTourLocation(SHOWCASE_TOUR_CONFIG, {
			topicId: navigation.tourTopic,
			stepId: navigation.tourStep,
		});
	}, [searchParams]);
	const searchTourKey = searchTourLocation
		? `${searchTourLocation.topicId}:${searchTourLocation.stepId}`
		: "";
	const lastSearchTourKeyRef = useRef(searchTourKey);

	useEffect(() => {
		if (lastSearchTourKeyRef.current === searchTourKey) {
			return;
		}
		lastSearchTourKeyRef.current = searchTourKey;
		if (!searchTourLocation) {
			if (showcaseTourLocation) {
				setShowcaseTourLocation(null);
			}
			return;
		}
		if (
			showcaseTourLocation?.topicId === searchTourLocation.topicId &&
			showcaseTourLocation.stepId === searchTourLocation.stepId
		) {
			return;
		}
		tourReturnStateRef.current = createShowcaseTourReturnState(
			state,
			searchParams,
			"clean",
		);
		setShowcaseTourLocation(searchTourLocation);
	}, [
		searchParams,
		searchTourKey,
		searchTourLocation,
		showcaseTourLocation,
		state,
	]);

	const handleApplyShowcaseTourNavigation = useCallback(
		(navigation: ShowcaseTourStepNavigation) => {
			if (navigation.insertSectionTemplate) {
				const { templateId, ifMissingNodeName } =
					navigation.insertSectionTemplate;
				const templateAlreadyExists =
					ifMissingNodeName &&
					Object.values(state.document.nodes).some(
						(node) => node.name === ifMissingNodeName,
					);
				if (!templateAlreadyExists) {
					dispatch({ type: "insertSectionTemplate", templateId });
				}
			}
			if (navigation.editor || navigation.nodeTarget) {
				dispatch({
					type: "applyEditorNavigation",
					navigation: navigation.editor ?? {},
					nodeTarget: navigation.nodeTarget,
				});
			}
			for (const panelRequest of getShowcaseTourPanelRequests(navigation)) {
				applyPanelRequest(panelRequest);
			}
		},
		[applyPanelRequest, dispatch, state.document.nodes],
	);

	const handleOpenShowcaseTour = useCallback(() => {
		const location = resolveShowcaseTourLocation(SHOWCASE_TOUR_CONFIG, null);
		tourReturnStateRef.current = createShowcaseTourReturnState(
			state,
			typeof window === "undefined"
				? searchParams
				: parseAppRoute(window.location.hash).search,
			"preserve",
		);
		setShowcaseTourLocation(location);
		if (typeof window === "undefined") return;
		const nextSearch = buildEditorNavigationSearch(
			{ tourTopic: location.topicId, tourStep: location.stepId },
			parseAppRoute(window.location.hash).search,
		);
		window.history.replaceState(
			null,
			"",
			`${window.location.pathname}${buildAppHash("edit", nextSearch)}`,
		);
	}, [searchParams, state]);

	const handleCloseShowcaseTour = useCallback(() => {
		const returnState = tourReturnStateRef.current;
		tourReturnStateRef.current = null;
		setShowcaseTourLocation(null);
		if (returnState) {
			dispatch({
				type: "applyEditorNavigation",
				navigation: returnState.navigation,
			});
		}
		if (typeof window === "undefined") return;
		window.history.replaceState(
			null,
			"",
			`${window.location.pathname}${buildAppHash("edit", returnState?.search)}`,
		);
	}, [dispatch]);

	return {
		showcaseTourLocation,
		setShowcaseTourLocation,
		handleApplyShowcaseTourNavigation,
		handleOpenShowcaseTour,
		handleCloseShowcaseTour,
	};
}

export function createShowcaseTourReturnState(
	state: EditorState,
	search: string | URLSearchParams,
	mode: "preserve" | "clean",
): ShowcaseTourReturnState {
	return {
		search:
			mode === "preserve"
				? normalizeSearch(search)
				: getSearchWithoutEditorNavigation(search),
		navigation: {
			activePageId: state.activePageId ?? undefined,
			selectedNodeId: state.selectedId ?? undefined,
			focusedMode: state.ui.focusedMode,
			showHidden: state.ui.showHidden,
			previewSticky: state.ui.previewSticky,
			animationPreviewEnabled: state.ui.animationPreview.enabled,
			spacerVisibility: state.ui.spacerVisibility,
			showGridLanes: state.ui.showGridLanes,
			showDebugInfo: state.ui.showDebugInfo,
		},
	};
}

function getSearchWithoutEditorNavigation(search: string | URLSearchParams) {
	const params =
		search instanceof URLSearchParams
			? new URLSearchParams(search)
			: new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
	for (const key of EDITOR_NAVIGATION_SEARCH_KEYS) {
		params.delete(key);
	}
	return normalizeSearch(params);
}

function normalizeSearch(search: string | URLSearchParams) {
	const serialized =
		search instanceof URLSearchParams
			? search.toString()
			: search.startsWith("?")
				? search.slice(1)
				: search;
	return serialized ? `?${serialized}` : "";
}
