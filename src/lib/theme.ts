import type { EditorDarkTheme, EditorLightTheme, ResolvedTheme, ThemeMode } from './types';

export type { EditorDarkTheme, EditorLightTheme, ResolvedTheme, ThemeMode } from './types';

export const DEFAULT_EDITOR_ACCENT_COLOR = '#1668ff';
export const DEFAULT_PAPER_ACCENT_COLOR = '#a36a2c';
export const DEFAULT_MONOKAI_ACCENT_COLOR = '#ff6188';
export const DEFAULT_EDITOR_LIGHT_THEME: EditorLightTheme = 'air';
export const DEFAULT_EDITOR_DARK_THEME: EditorDarkTheme = 'monokai';
const DEFAULT_STICKY_OFFSET_GUIDE_COLOR = '#d3a019';
const DEFAULT_STICKY_PADDING_GUIDE_COLOR = '#c9a74b';
const DEFAULT_STICKY_OFFSET_LABEL_BACKGROUND = '#e4b12c';
const DEFAULT_STICKY_AUTO_GUIDE_COLOR = '#2d9f61';
const DEFAULT_STICKY_AUTO_LABEL_BACKGROUND = '#16a34a';

export const EDITOR_LIGHT_THEME_OPTIONS: ReadonlyArray<{
  value: EditorLightTheme;
  label: string;
  description: string;
}> = [
  {
    value: 'air',
    label: 'Air',
    description: 'Neutral and crisp.',
  },
  {
    value: 'paper',
    label: 'Paper',
    description: 'Warm with a sepia accent.',
  },
  {
    value: 'midday',
    label: 'Midday',
    description: 'Accent-tinted daylight.',
  },
  {
    value: 'clarity',
    label: 'Clarity',
    description: 'Sharp high-contrast light.',
  },
] as const;

export const EDITOR_DARK_THEME_OPTIONS: ReadonlyArray<{
  value: EditorDarkTheme;
  label: string;
  description: string;
}> = [
  {
    value: 'graphite',
    label: 'Graphite',
    description: 'Neutral and restrained.',
  },
  {
    value: 'monokai',
    label: 'Monokai',
    description: 'Plum charcoal, editable magenta.',
  },
  {
    value: 'midnight',
    label: 'Midnight',
    description: 'Deep and cool.',
  },
  {
    value: 'ink',
    label: 'Ink',
    description: 'Near-black high contrast.',
  },
] as const;

export const EDITOR_ACCENT_SWATCHES: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: '#1668ff', label: 'Blue' },
  { value: '#0f766e', label: 'Teal' },
  { value: '#059669', label: 'Emerald' },
  { value: '#65a30d', label: 'Lime' },
  { value: '#d97706', label: 'Amber' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#dc2626', label: 'Red' },
  { value: '#7c3aed', label: 'Violet' },
] as const;

export function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto';
}

export function normalizeEditorAccentColor(value: unknown, fallback = DEFAULT_EDITOR_ACCENT_COLOR): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeEditorLightTheme(value: unknown): EditorLightTheme {
  if (value === 'accent-light') {
    return 'midday';
  }
  return EDITOR_LIGHT_THEME_OPTIONS.some((option) => option.value === value)
    ? (value as EditorLightTheme)
    : DEFAULT_EDITOR_LIGHT_THEME;
}

export function normalizeEditorDarkTheme(value: unknown): EditorDarkTheme {
  if (value === 'tinted') {
    return 'monokai';
  }
  if (value === 'cinder') {
    return 'monokai';
  }
  if (value === 'accent-dark') {
    return 'monokai';
  }
  return EDITOR_DARK_THEME_OPTIONS.some((option) => option.value === value)
    ? (value as EditorDarkTheme)
    : DEFAULT_EDITOR_DARK_THEME;
}

export function isEditorAccentSwatch(value: string) {
  return EDITOR_ACCENT_SWATCHES.some((swatch) => swatch.value.toLowerCase() === value.toLowerCase());
}

export function resolveThemeMode(themeMode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (themeMode === 'auto') {
    return prefersDark ? 'dark' : 'light';
  }
  return themeMode;
}

export function resolveEditorAccentColor(
  accentColor: string,
  paperAccentColor: string,
  monokaiAccentColor: string,
  resolvedTheme: ResolvedTheme,
  lightTheme: EditorLightTheme,
  darkTheme: EditorDarkTheme,
) {
  if (resolvedTheme === 'light' && lightTheme === 'paper') {
    return paperAccentColor;
  }
  if (resolvedTheme === 'dark' && darkTheme === 'monokai') {
    return monokaiAccentColor;
  }
  return accentColor;
}

export function resolveStickyGuideColors(accentColor: string) {
  const accentHsl = parseHexToHsl(accentColor) ?? parseHexToHsl(DEFAULT_EDITOR_ACCENT_COLOR);
  const baselineAccentHsl = parseHexToHsl(DEFAULT_EDITOR_ACCENT_COLOR);
  if (!accentHsl || !baselineAccentHsl) {
    return {
      offsetGuideColor: DEFAULT_STICKY_OFFSET_GUIDE_COLOR,
      paddingGuideColor: DEFAULT_STICKY_PADDING_GUIDE_COLOR,
      offsetLabelBackground: DEFAULT_STICKY_OFFSET_LABEL_BACKGROUND,
      autoGuideColor: DEFAULT_STICKY_AUTO_GUIDE_COLOR,
      autoLabelBackground: DEFAULT_STICKY_AUTO_LABEL_BACKGROUND,
    };
  }

  return {
    offsetGuideColor: deriveStickyColor(accentHsl, baselineAccentHsl, DEFAULT_STICKY_OFFSET_GUIDE_COLOR, 0.34, 0.28),
    paddingGuideColor: deriveStickyColor(accentHsl, baselineAccentHsl, DEFAULT_STICKY_PADDING_GUIDE_COLOR, 0.26, 0.24),
    offsetLabelBackground: deriveStickyColor(
      accentHsl,
      baselineAccentHsl,
      DEFAULT_STICKY_OFFSET_LABEL_BACKGROUND,
      0.3,
      0.24,
    ),
    autoGuideColor: deriveStickyColor(accentHsl, baselineAccentHsl, DEFAULT_STICKY_AUTO_GUIDE_COLOR, 0.28, 0.24),
    autoLabelBackground: deriveStickyColor(
      accentHsl,
      baselineAccentHsl,
      DEFAULT_STICKY_AUTO_LABEL_BACKGROUND,
      0.22,
      0.18,
    ),
  };
}

export function resolveAccentSurfaceColors(accentColor: string, stickyGuideColors?: ReturnType<typeof resolveStickyGuideColors>) {
  const resolvedStickyGuideColors = stickyGuideColors ?? resolveStickyGuideColors(accentColor);

  return {
    accentForeground: pickContrastTextColor(accentColor),
    accentForegroundMuted: pickContrastMutedTextColor(accentColor),
    stickyDistanceLabelText: pickContrastTextColor(accentColor),
    stickyOffsetLabelText: pickContrastTextColor(resolvedStickyGuideColors.offsetLabelBackground),
    stickyAutoLabelText: pickContrastTextColor(resolvedStickyGuideColors.autoLabelBackground),
  };
}

type HslColor = {
  h: number;
  s: number;
  l: number;
};

function deriveStickyColor(
  accentHsl: HslColor,
  baselineAccentHsl: HslColor,
  baselineTargetHex: string,
  saturationInfluence: number,
  lightnessInfluence: number,
) {
  const baselineTargetHsl = parseHexToHsl(baselineTargetHex);
  if (!baselineTargetHsl) {
    return baselineTargetHex;
  }

  const hue = wrapHue(accentHsl.h + (baselineTargetHsl.h - baselineAccentHsl.h));
  const saturation = clampPercent(
    baselineTargetHsl.s + (accentHsl.s - baselineAccentHsl.s) * saturationInfluence,
  );
  const lightness = clampPercent(
    baselineTargetHsl.l + (accentHsl.l - baselineAccentHsl.l) * lightnessInfluence,
  );

  return hslToHex({ h: hue, s: saturation, l: lightness });
}

function parseHexToHsl(value: string): HslColor | null {
  const rgb = parseHexToRgb(value);
  if (!rgb) {
    return null;
  }

  const red = rgb.r / 255;
  const green = rgb.g / 255;
  const blue = rgb.b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return {
    h: hue * 60,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function parseHexToRgb(value: string) {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) {
    return null;
  }

  const digits = match[1];
  const normalized =
    digits.length === 3 ? digits.split('').map((digit) => digit + digit).join('') : digits;

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function pickContrastTextColor(backgroundColor: string) {
  const rgb = parseHexToRgb(backgroundColor);
  if (!rgb) {
    return '#ffffff';
  }

  return getPerceivedBrightness(rgb) >= 160 ? '#0f172a' : '#f8fafc';
}

function pickContrastMutedTextColor(backgroundColor: string) {
  const rgb = parseHexToRgb(backgroundColor);
  if (!rgb) {
    return 'rgba(255, 255, 255, 0.68)';
  }

  return getPerceivedBrightness(rgb) >= 160
    ? 'rgba(15, 23, 42, 0.68)'
    : 'rgba(255, 255, 255, 0.68)';
}

function getPerceivedBrightness(rgb: { r: number; g: number; b: number }) {
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

function hslToHex(color: HslColor) {
  const saturation = color.s / 100;
  const lightness = color.l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = wrapHue(color.h) / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return `#${toHex(red + match)}${toHex(green + match)}${toHex(blue + match)}`;
}

function toHex(value: number) {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, '0');
}

function wrapHue(value: number) {
  return ((value % 360) + 360) % 360;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}
