import type { CSSProperties } from "react";

export type ShowcaseTourSkin = {
	id: string;
	accent: string;
	accentForeground: string;
	backdropBackground: string;
	backdropBlur: string;
	surfaceBackground: string;
	surfaceBorder: string;
	surfaceShadow: string;
	highlightBackground: string;
	highlightBorder: string;
	highlightText: string;
	highlightShadow: string;
	highlightLabelBackground: string;
	highlightLabelBorder: string;
	activeStepBackground: string;
	activeStepForeground: string;
	radius: string;
	zIndex: number;
	typographyClassName?: string;
	surfaceClassName?: string;
};

export const DEFAULT_SHOWCASE_TOUR_SKIN: ShowcaseTourSkin = {
	id: "showcase",
	accent: "color-mix(in srgb, #ff4f7b 88%, var(--editor-utility-text-strong))",
	accentForeground: "var(--editor-accent-foreground)",
	backdropBackground: "transparent",
	backdropBlur: "0px",
	surfaceBackground:
		"linear-gradient(135deg, color-mix(in srgb, var(--editor-surface-background) 92%, var(--showcase-tour-accent) 8%), var(--editor-surface-background))",
	surfaceBorder:
		"color-mix(in srgb, var(--showcase-tour-accent) 34%, var(--editor-utility-border))",
	surfaceShadow: "var(--editor-surface-shadow)",
	highlightBackground: "transparent",
	highlightBorder: "var(--showcase-tour-accent)",
	highlightText: "var(--editor-utility-text-strong)",
	highlightShadow:
		"0 0 0 2px inset var(--editor-surface-background), 0 0 30px 18px color-mix(in srgb, var(--editor-surface-background) 88%, transparent), 0 0 0 1px color-mix(in srgb, var(--showcase-tour-accent) 34%, transparent)",
	highlightLabelBackground: "var(--editor-surface-background)",
	highlightLabelBorder:
		"color-mix(in srgb, var(--showcase-tour-accent) 42%, var(--editor-utility-border))",
	activeStepBackground:
		"color-mix(in srgb, var(--showcase-tour-accent) 88%, var(--editor-utility-text-strong))",
	activeStepForeground: "var(--editor-accent-foreground)",
	radius: "0.75rem",
	zIndex: 2147483647,
};

export function buildShowcaseTourSkinStyle(
	skin: ShowcaseTourSkin = DEFAULT_SHOWCASE_TOUR_SKIN,
): CSSProperties {
	return {
		"--showcase-tour-accent": skin.accent,
		"--showcase-tour-accent-foreground": skin.accentForeground,
		"--showcase-tour-backdrop-background": skin.backdropBackground,
		"--showcase-tour-backdrop-blur": skin.backdropBlur,
		"--showcase-tour-surface-background": skin.surfaceBackground,
		"--showcase-tour-surface-border": skin.surfaceBorder,
		"--showcase-tour-surface-shadow": skin.surfaceShadow,
		"--showcase-tour-highlight-background": skin.highlightBackground,
		"--showcase-tour-highlight-border": skin.highlightBorder,
		"--showcase-tour-highlight-text": skin.highlightText,
		"--showcase-tour-highlight-shadow": skin.highlightShadow,
		"--showcase-tour-highlight-label-background":
			skin.highlightLabelBackground,
		"--showcase-tour-highlight-label-border": skin.highlightLabelBorder,
		"--showcase-tour-active-step-background": skin.activeStepBackground,
		"--showcase-tour-active-step-foreground": skin.activeStepForeground,
		"--showcase-tour-radius": skin.radius,
		zIndex: skin.zIndex,
	} as CSSProperties;
}
