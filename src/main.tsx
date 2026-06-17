import React, { Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { parseAppRoute } from "./app/appRouting";
import "prismjs/themes/prism.css";
import "./styles.css";

const DesignSystemApp = React.lazy(
	() => import("./design-system/DesignSystemApp"),
);

function Root() {
	const [route, setRoute] = useState(() => parseAppRoute(window.location.hash));

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

	if (route.mode === "preview") {
		return <App mode="preview" routeSearchParams={route.search} />;
	}

	if (route.mode === "edit") {
		return <App mode="edit" routeSearchParams={route.search} />;
	}

	return (
		<div className="editor-shell flex h-screen w-screen items-center justify-center">
			<div className="editor-bg-surface editor-border-subtle editor-text-strong rounded-xl border p-6 text-sm shadow-sm">
				Editor Playground
			</div>
		</div>
	);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<Root />
	</React.StrictMode>,
);
