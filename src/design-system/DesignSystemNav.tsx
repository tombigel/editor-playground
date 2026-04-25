import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsNavItem } from "@/components/ui/settings-panel";
import {
	getDesignSystemAnchorFromHash,
	scrollDesignSystemSectionIntoView,
	writeDesignSystemAnchorToUrl,
} from "./navigationScroll";
import type { DSSection } from "./types";

export function DesignSystemNav({
	sections,
	scrollContainer,
}: {
	sections: DSSection[];
	scrollContainer: HTMLElement | null;
}) {
	const [activeId, setActiveId] = useState<string>(
		() => sections[0]?.subsections[0]?.id ?? "",
	);
	const isScrollingRef = useRef(false);
	const hasAppliedInitialAnchorRef = useRef(false);
	const allIds = useMemo(
		() =>
			sections.flatMap((section) =>
				section.subsections.map((subsection) => subsection.id),
			),
		[sections],
	);

	useEffect(() => {
		if (!scrollContainer) {
			return;
		}
		const container = scrollContainer;
		const initialAnchor = hasAppliedInitialAnchorRef.current
			? null
			: getDesignSystemAnchorFromHash(window.location.hash, allIds);
		let didScrollToInitialAnchor = false;

		if (initialAnchor) {
			const el = container.querySelector<HTMLElement>(
				`#${CSS.escape(initialAnchor)}`,
			);
			if (el) {
				hasAppliedInitialAnchorRef.current = true;
				didScrollToInitialAnchor = true;
				isScrollingRef.current = true;
				setActiveId(initialAnchor);
				scrollDesignSystemSectionIntoView(container, el);
				setTimeout(() => {
					isScrollingRef.current = false;
				}, 600);
			}
		} else {
			hasAppliedInitialAnchorRef.current = true;
		}

		function updateActiveId() {
			if (isScrollingRef.current) {
				return;
			}

			const containerRect = container.getBoundingClientRect();
			const subsectionElements = allIds
				.map((id) => ({
					id,
					element: container.querySelector<HTMLElement>(
						`#${CSS.escape(id)}`,
					),
				}))
				.filter(
					(
						entry,
					): entry is { id: string; element: HTMLElement } =>
						entry.element !== null,
				);

			if (subsectionElements.length === 0) {
				return;
			}

			const activationOffset = 120;
			let nextActiveId = subsectionElements[0].id;

			for (const { id, element } of subsectionElements) {
				const top =
					element.getBoundingClientRect().top - containerRect.top;
				if (top <= activationOffset) {
					nextActiveId = id;
					continue;
				}
				break;
			}

			setActiveId(nextActiveId);
		}

		if (!didScrollToInitialAnchor) {
			updateActiveId();
		}
		container.addEventListener("scroll", updateActiveId, {
			passive: true,
		});
		window.addEventListener("resize", updateActiveId);
		return () => {
			container.removeEventListener("scroll", updateActiveId);
			window.removeEventListener("resize", updateActiveId);
		};
	}, [allIds, scrollContainer]);

	const handleClick = useCallback(
		(id: string) => {
			if (!scrollContainer) {
				return;
			}
			const el = scrollContainer.querySelector<HTMLElement>(
				`#${CSS.escape(id)}`,
			);
			if (!el) {
				return;
			}
			isScrollingRef.current = true;
			setActiveId(id);
			writeDesignSystemAnchorToUrl(id);
			scrollDesignSystemSectionIntoView(scrollContainer, el);
			setTimeout(() => {
				isScrollingRef.current = false;
			}, 600);
		},
		[scrollContainer],
	);

	return (
		<nav
			aria-label="Design system navigation"
			className="editor-scrollbar flex h-full w-[220px] shrink-0 flex-col overflow-y-auto border-r px-3 py-4"
			style={{ borderColor: "var(--editor-surface-border)" }}
		>
			{sections.map((section) => {
				const SectionIcon = section.icon;
				return (
					<div key={section.id} className="mb-4">
						<div className="editor-text-muted mb-1.5 flex items-center gap-2 px-2 text-[15px] font-bold tracking-normal">
							<SectionIcon className="h-3.5 w-3.5" />
							{section.label}
						</div>
						<ul className="space-y-0.5">
							{section.subsections.map((sub) => {
								const isActive = sub.id === activeId;
								return (
									<li key={sub.id}>
										<SettingsNavItem
											onClick={() => handleClick(sub.id)}
											active={isActive}
											compact
											variant="accent-hover"
											title={sub.label}
											titleClassName="text-[13px] font-medium"
											aria-current={isActive ? "true" : undefined}
										/>
									</li>
								);
							})}
						</ul>
					</div>
				);
			})}
		</nav>
	);
}
