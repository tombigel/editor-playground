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
