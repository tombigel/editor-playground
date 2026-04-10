import { useLayoutEffect } from "react";

type StageLayoutResyncArgs = {
	root: HTMLElement | null;
	selectedIds: string[];
	onLayoutChange: () => void;
};

export function useStageLayoutResync({
	root,
	selectedIds,
	onLayoutChange,
}: StageLayoutResyncArgs) {
	const selectedIdsKey = selectedIds.join("\0");

	useLayoutEffect(() => {
		if (!root) {
			return;
		}

		let frame = 0;
		let disposed = false;
		const ownerWindow = root.ownerDocument.defaultView;
		const fontSet = root.ownerDocument.fonts;
		const stableSelectedIds = selectedIdsKey ? selectedIdsKey.split("\0") : [];
		const resizeTargets = collectStageLayoutTargets(root, stableSelectedIds);
		const mutationTargets = resizeTargets.filter((target) => target !== root);

		const queueLayoutChange = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				if (!disposed) {
					onLayoutChange();
				}
			});
		};

		const resizeObserver =
			typeof ResizeObserver === "function"
				? new ResizeObserver(() => {
						queueLayoutChange();
					})
				: null;
		for (const target of resizeTargets) {
			resizeObserver?.observe(target);
		}

		const mutationObserver =
			typeof MutationObserver === "function"
				? new MutationObserver(() => {
						queueLayoutChange();
					})
				: null;
		for (const target of mutationTargets) {
			mutationObserver?.observe(target, {
				attributes: true,
				childList: true,
				subtree: false,
			});
		}

		ownerWindow?.addEventListener("resize", queueLayoutChange);

		const handleFontLoad = () => {
			queueLayoutChange();
		};
		fontSet?.ready.then(handleFontLoad).catch(() => {});
		fontSet?.addEventListener?.("loadingdone", handleFontLoad);
		fontSet?.addEventListener?.("loadingerror", handleFontLoad);

		queueLayoutChange();

		return () => {
			disposed = true;
			cancelAnimationFrame(frame);
			resizeObserver?.disconnect();
			mutationObserver?.disconnect();
			ownerWindow?.removeEventListener("resize", queueLayoutChange);
			fontSet?.removeEventListener?.("loadingdone", handleFontLoad);
			fontSet?.removeEventListener?.("loadingerror", handleFontLoad);
		};
	}, [onLayoutChange, root, selectedIdsKey]);
}

function collectStageLayoutTargets(root: HTMLElement, selectedIds: string[]) {
	const targets = new Set<HTMLElement>([root]);
	const frame = root.querySelector<HTMLElement>(".stage-frame");
	const canvas = root.querySelector<HTMLElement>(".stage-canvas");
	if (frame) {
		targets.add(frame);
	}
	if (canvas) {
		targets.add(canvas);
	}

	for (const selectedId of selectedIds) {
		let element = root.querySelector<HTMLElement>(`#stage-node-${selectedId}`);
		while (element) {
			targets.add(element);
			if (element === root || element === frame) {
				break;
			}
			element = element.parentElement;
		}
	}

	return [...targets];
}
