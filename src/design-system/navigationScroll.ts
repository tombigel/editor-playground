function readScrollMarginTop(target: HTMLElement) {
	const defaultView = target.ownerDocument?.defaultView;
	if (!defaultView) {
		return 0;
	}

	const parsed = Number.parseFloat(
		defaultView.getComputedStyle(target).scrollMarginTop,
	);
	return Number.isFinite(parsed) ? parsed : 0;
}

const DESIGN_SYSTEM_ROUTE_HASH = "#/design-system";

export function parseDesignSystemAnchor(hash: string) {
	if (!hash.startsWith(DESIGN_SYSTEM_ROUTE_HASH)) {
		return null;
	}

	const nestedHashIndex = hash.indexOf("#", 1);
	if (nestedHashIndex >= 0) {
		const anchor = hash.slice(nestedHashIndex + 1);
		return anchor ? decodeURIComponent(anchor) : null;
	}

	const routePathPrefix = `${DESIGN_SYSTEM_ROUTE_HASH}/`;
	if (hash.startsWith(routePathPrefix)) {
		const anchor = hash.slice(routePathPrefix.length);
		return anchor ? decodeURIComponent(anchor) : null;
	}

	return null;
}

export function getDesignSystemAnchorFromHash(
	hash: string,
	validIds: readonly string[],
) {
	const anchor = parseDesignSystemAnchor(hash);
	return anchor && validIds.includes(anchor) ? anchor : null;
}

export function getDesignSystemHashWithAnchor(sectionId: string) {
	return `${DESIGN_SYSTEM_ROUTE_HASH}#${encodeURIComponent(sectionId)}`;
}

export function writeDesignSystemAnchorToUrl(sectionId: string) {
	window.history.pushState(null, "", getDesignSystemHashWithAnchor(sectionId));
}

export function getDesignSystemSectionScrollTop(
	scrollContainer: HTMLElement,
	target: HTMLElement,
) {
	const containerTop = scrollContainer.getBoundingClientRect().top;
	const targetTop = target.getBoundingClientRect().top;
	const scrollMarginTop = readScrollMarginTop(target);

	return Math.max(
		0,
		scrollContainer.scrollTop + targetTop - containerTop - scrollMarginTop,
	);
}

export function scrollDesignSystemSectionIntoView(
	scrollContainer: HTMLElement,
	target: HTMLElement,
) {
	scrollContainer.scrollTo({
		top: getDesignSystemSectionScrollTop(scrollContainer, target),
		behavior: "smooth",
	});
}
