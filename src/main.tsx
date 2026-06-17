import React, { Suspense, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import {
	buildAppHash,
	DESIGN_SYSTEM_ROUTE_HASH,
	parseAppRoute,
	type AppStartupAction,
} from "./app/appRouting";
import { OnboardingHome } from "./app/OnboardingHome";
import {
	DEFAULT_DOCUMENT_STORAGE_KEY,
	STORAGE_KEY,
} from "./editor/editorPersistence";
import "prismjs/themes/prism.css";
import "./styles.css";

const DesignSystemApp = React.lazy(
	() => import("./design-system/DesignSystemApp"),
);

function Root() {
	const [route, setRoute] = useState(() => parseAppRoute(window.location.hash));
	const [startupAction, setStartupAction] = useState<AppStartupAction | null>(
		null,
	);
	const nextStartupActionId = useRef(1);

	useEffect(() => {
		const handler = () => setRoute(parseAppRoute(window.location.hash));
		window.addEventListener("hashchange", handler);
		return () => window.removeEventListener("hashchange", handler);
	}, []);

	if (route.mode === "design-system") {
		return (
			<Suspense
				fallback={
					<div className="flex h-screen w-screen items-center justify-center text-sm text-gray-400">
						Loading Design System…
					</div>
				}
			>
				<DesignSystemApp />
			</Suspense>
		);
	}

	function setNextStartupAction(type: AppStartupAction["type"]) {
		setStartupAction({ id: nextStartupActionId.current++, type });
	}

	function navigateTo(hash: string) {
		window.location.hash = hash;
		setRoute(parseAppRoute(hash));
	}

	if (route.mode === "preview") {
		return (
			<App
				mode="preview"
				routeSearchParams={route.search}
				startupAction={startupAction}
				onStartupActionHandled={(id) => {
					setStartupAction((current) => (current?.id === id ? null : current));
				}}
			/>
		);
	}

	if (route.mode === "edit") {
		return (
			<App
				mode="edit"
				routeSearchParams={route.search}
				startupAction={startupAction}
				onStartupActionHandled={(id) => {
					setStartupAction((current) => (current?.id === id ? null : current));
				}}
			/>
		);
	}

	return (
		<OnboardingHome
			hasCurrentSite={hasStoredEditorSite()}
			onContinueCurrentSite={() => navigateTo(buildAppHash("edit"))}
			onStartBlank={() => {
				setNextStartupAction("startBlank");
				navigateTo(buildAppHash("edit"));
			}}
			onLoadJson={() => {
				setNextStartupAction("loadJson");
				navigateTo(buildAppHash("edit"));
			}}
			onStartTour={() => {
				setNextStartupAction("startTour");
				navigateTo(buildAppHash("edit", "tour=start&step=welcome"));
			}}
			onOpenDesignSystem={() => navigateTo(DESIGN_SYSTEM_ROUTE_HASH)}
		/>
	);
}

function hasStoredEditorSite() {
	if (typeof window === "undefined") {
		return false;
	}
	return (
		hasStoredDocumentLikeValue(window.localStorage.getItem(STORAGE_KEY)) ||
		hasStoredDocumentLikeValue(
			window.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY),
		)
	);
}

function hasStoredDocumentLikeValue(raw: string | null) {
	if (!raw) {
		return false;
	}
	try {
		const parsed = JSON.parse(raw) as {
			document?: unknown;
			rootId?: unknown;
			nodes?: unknown;
		};
		const candidate =
			parsed.document && typeof parsed.document === "object"
				? (parsed.document as { rootId?: unknown; nodes?: unknown })
				: parsed;
		return typeof candidate.rootId === "string" && Boolean(candidate.nodes);
	} catch {
		return false;
	}
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<Root />
	</React.StrictMode>,
);
