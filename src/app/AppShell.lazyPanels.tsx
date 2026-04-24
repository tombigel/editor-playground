import { lazy } from "react";

export const LayersPanel = lazy(() =>
	import("../panels/LayersPanel").then((m) => ({ default: m.LayersPanel })),
);
export const SettingsPanel = lazy(() =>
	import("../panels/SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
);
export const ManageFontsPanel = lazy(() =>
	import("../panels/fontManagement/ManageFontsPanel").then((m) => ({
		default: m.ManageFontsPanel,
	})),
);
export const PagesPanel = lazy(() =>
	import("../panels/PagesPanel").then((m) => ({ default: m.PagesPanel })),
);
export const EditorSidebar = lazy(() =>
	import("../panels/EditorSidebar").then((m) => ({ default: m.EditorSidebar })),
);
