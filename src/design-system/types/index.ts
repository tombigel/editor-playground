import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type {
	EditorDarkTheme,
	EditorLightTheme,
	ResolvedTheme,
	ThemeMode,
} from "@/lib/theme";

export type ThemeConfig = {
	themeMode: ThemeMode;
	lightTheme: EditorLightTheme;
	darkTheme: EditorDarkTheme;
	accentColor: string;
	paperAccentColor: string;
	monokaiAccentColor: string;
};

export type ResolvedThemeConfig = ThemeConfig & {
	resolved: ResolvedTheme;
	resolvedAccent: string;
};

export type DSSection = {
	id: string;
	label: string;
	icon: LucideIcon;
	subsections: DSSubsection[];
};

export type DSSubsection = {
	id: string;
	label: string;
};

export type PropDefinition = {
	name: string;
	type: string;
	default?: string;
	description: string;
};

export type VariationSet = {
	label: string;
	render: () => ReactNode;
};
