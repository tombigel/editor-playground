import { useCallback, useEffect, useRef, useState } from "react";
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

	useEffect(() => {
		if (!scrollContainer) {
			return;
		}
		const container = scrollContainer;

		const allIds = sections.flatMap((section) =>
			section.subsections.map((subsection) => subsection.id),
		);

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

		updateActiveId();
		container.addEventListener("scroll", updateActiveId, {
			passive: true,
		});
		window.addEventListener("resize", updateActiveId);
		return () => {
			container.removeEventListener("scroll", updateActiveId);
			window.removeEventListener("resize", updateActiveId);
		};
	}, [scrollContainer, sections]);

	const handleClick = useCallback(
		(id: string) => {
			if (!scrollContainer) {
				return;
			}
			const el = scrollContainer.querySelector(`#${CSS.escape(id)}`);
			if (!el) {
				return;
			}
			isScrollingRef.current = true;
			setActiveId(id);
			el.scrollIntoView({ behavior: "smooth", block: "start" });
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
						<div className="editor-text-muted mb-1.5 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider">
							<SectionIcon className="h-3.5 w-3.5" />
							{section.label}
						</div>
						<ul className="space-y-0.5">
							{section.subsections.map((sub) => {
								const isActive = sub.id === activeId;
								return (
									<li key={sub.id}>
										<button
											type="button"
											onClick={() => handleClick(sub.id)}
											className={`w-full rounded-lg px-2 py-1.5 text-left text-[12px] font-medium transition-colors ${
												isActive
													? "editor-text-strong"
													: "editor-text-muted hover:editor-text-strong"
											}`}
											style={
												isActive
													? {
															background:
																"var(--editor-settings-nav-active-background)",
															color: "var(--editor-settings-nav-active-text)",
															boxShadow:
																"var(--editor-settings-nav-active-shadow)",
														}
													: undefined
											}
											aria-current={isActive ? "true" : undefined}
										>
											{sub.label}
										</button>
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
