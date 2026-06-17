export type AppMode = "home" | "edit" | "preview" | "design-system";

export type AppRoute = {
	mode: AppMode;
	search: URLSearchParams;
	rawHash: string;
};

export const EDIT_ROUTE_HASH = "#/edit";
export const HOME_ROUTE_HASH = "#/";
export const PREVIEW_ROUTE_HASH = "#/preview";
export const DESIGN_SYSTEM_ROUTE_HASH = "#/design-system";

export function parseAppRoute(hash: string | null | undefined): AppRoute {
	const rawHash = hash ?? "";
	const normalized = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
	if (!normalized || normalized === "/") {
		return { mode: "home", search: new URLSearchParams(), rawHash };
	}

	const routeEnd = findRouteEnd(normalized);
	const routePath = normalized.slice(0, routeEnd) || "/";
	const query =
		routeEnd < normalized.length && normalized[routeEnd] === "?"
			? normalized.slice(routeEnd + 1, findSectionHashStart(normalized, routeEnd))
			: "";
	const search = new URLSearchParams(query);

	switch (routePath) {
		case "/edit":
			return { mode: "edit", search, rawHash };
		case "/preview":
			return { mode: "preview", search, rawHash };
		case "/design-system":
			return { mode: "design-system", search, rawHash };
		default:
			return { mode: "home", search: new URLSearchParams(), rawHash };
	}
}

export function buildAppHash(mode: Exclude<AppMode, "home">, search?: URLSearchParams | string) {
	const base =
		mode === "edit"
			? EDIT_ROUTE_HASH
			: mode === "preview"
				? PREVIEW_ROUTE_HASH
				: DESIGN_SYSTEM_ROUTE_HASH;
	const serialized =
		typeof search === "string"
			? search.replace(/^\?/, "")
			: (search?.toString() ?? "");
	return serialized ? `${base}?${serialized}` : base;
}

function findRouteEnd(hashWithoutLeadingMarker: string) {
	const queryIndex = hashWithoutLeadingMarker.indexOf("?");
	const sectionHashIndex = hashWithoutLeadingMarker.indexOf("#");
	if (queryIndex === -1) {
		return sectionHashIndex === -1 ? hashWithoutLeadingMarker.length : sectionHashIndex;
	}
	if (sectionHashIndex === -1) {
		return queryIndex;
	}
	return Math.min(queryIndex, sectionHashIndex);
}

function findSectionHashStart(hashWithoutLeadingMarker: string, startIndex: number) {
	const sectionHashIndex = hashWithoutLeadingMarker.indexOf("#", startIndex);
	return sectionHashIndex === -1 ? hashWithoutLeadingMarker.length : sectionHashIndex;
}
