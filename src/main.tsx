import React, { Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles.css";

const DesignSystemApp = React.lazy(
	() => import("./design-system/DesignSystemApp"),
);

function Root() {
	const [route, setRoute] = useState(() => window.location.hash);

	useEffect(() => {
		const handler = () => setRoute(window.location.hash);
		window.addEventListener("hashchange", handler);
		return () => window.removeEventListener("hashchange", handler);
	}, []);

	if (route.startsWith("#/design-system")) {
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

	return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<Root />
	</React.StrictMode>,
);
