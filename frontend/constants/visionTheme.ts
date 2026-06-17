/**
 * VisionaryX Design System — Single source of truth.
 *
 * Generated from /app/design_guidelines.json (archetype: "Command Center /
 * Swiss High-Contrast"). Platform-neutral values (hex / numbers) so the same
 * tokens drive React Native (iOS/Android) and React Native Web.
 *
 * Always import from this module in screens & components. Never hard-code
 * colors / font sizes / spacing in StyleSheets.
 */

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------
export const Brand = {
  name: 'VisionaryX',
  tagline: 'Digital Sentinel',
  shortTagline: 'Vigilance, Indexed.',
  copyright: '© VisionaryX Systems',
} as const;

// ---------------------------------------------------------------------------
// Color tokens — dark is primary; light kept for future toggle.
// ---------------------------------------------------------------------------
export const PaletteDark = {
  // Surfaces (deepest → highest elevation)
  bg: '#060e20',
  surface: '#0b1326',
  surfaceLow: '#121d36',
  surface2: '#172244',
  surface3: '#1e2c4a',
  // Text
  text: '#FFFFFF',
  textMuted: '#8C9BB3',
  textFaint: '#4F5E7B',
  // Borders / dividers
  border: '#1e2c4a',
  borderStrong: '#2a3b5c',
  // Brand primary (sentinel blue)
  primary: '#2065d1',
  primaryHover: '#3376E3',
  primaryActive: '#afc6ff',
  primaryAccent: '#afc6ff', // hairline accents, links
  onPrimary: '#FFFFFF',
  primaryFaint: 'rgba(32, 101, 209, 0.12)',
  // Status
  success: '#00C781',
  successFaint: 'rgba(0, 199, 129, 0.14)',
  warning: '#F5A623',
  warningFaint: 'rgba(245, 166, 35, 0.14)',
  danger: '#FF3B30',
  dangerHover: '#FF5247',
  dangerFaint: 'rgba(255, 59, 48, 0.14)',
  info: '#afc6ff',
  // Overlays
  scrim: 'rgba(0, 0, 0, 0.7)',
  glass: 'rgba(11, 19, 38, 0.7)',
  innerGlow: 'rgba(255, 255, 255, 0.04)',
  // Chart palette
  chartPrimary: '#2065d1',
  chartActive: '#afc6ff',
  chartTrack: 'rgba(32, 101, 209, 0.16)',
} as const;

export const PaletteLight = {
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceLow: '#F8FAFC',
  surface2: '#F1F5F9',
  surface3: '#E2E8F0',
  text: '#0B1326',
  textMuted: '#4F5E7B',
  textFaint: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  primary: '#2065d1',
  primaryHover: '#184ea6',
  primaryActive: '#10387b',
  primaryAccent: '#2065d1',
  onPrimary: '#FFFFFF',
  primaryFaint: 'rgba(32, 101, 209, 0.08)',
  success: '#079455',
  successFaint: 'rgba(7, 148, 85, 0.10)',
  warning: '#DC6803',
  warningFaint: 'rgba(220, 104, 3, 0.10)',
  danger: '#D92D20',
  dangerHover: '#B42318',
  dangerFaint: 'rgba(217, 45, 32, 0.10)',
  info: '#2065d1',
  scrim: 'rgba(11, 19, 38, 0.4)',
  glass: 'rgba(255, 255, 255, 0.7)',
  innerGlow: 'rgba(11, 19, 38, 0.03)',
  chartPrimary: '#2065d1',
  chartActive: '#10387b',
  chartTrack: 'rgba(32, 101, 209, 0.12)',
} as const;

// ---------------------------------------------------------------------------
// Spacing scale (px — works for both RN points and CSS px via RN-Web).
// ---------------------------------------------------------------------------
export const Space = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 96,
} as const;

export const Radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Typography — Manrope (heading), Inter (body), JetBrains Mono (data).
// Fonts are loaded in app/_layout.tsx via @expo-google-fonts.
// ---------------------------------------------------------------------------
export const FontFamily = {
  // Display / headings
  display: 'Manrope_800ExtraBold',
  heading: 'Manrope_700Bold',
  headingMedium: 'Manrope_600SemiBold',
  // Body
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  // Data / numeric — command-center JetBrains Mono
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const TextStyles = {
  h1: { fontFamily: FontFamily.display, fontSize: 48, lineHeight: 56, letterSpacing: -1 },
  h2: { fontFamily: FontFamily.heading, fontSize: 36, lineHeight: 44, letterSpacing: -0.75 },
  h3: { fontFamily: FontFamily.heading, fontSize: 24, lineHeight: 32, letterSpacing: -0.5 },
  h4: { fontFamily: FontFamily.headingMedium, fontSize: 20, lineHeight: 28, letterSpacing: -0.25 },
  bodyLarge: { fontFamily: FontFamily.body, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: FontFamily.body, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 16 },
  label: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  // Mono / data
  dataLarge: { fontFamily: FontFamily.monoMedium, fontSize: 32, lineHeight: 40, letterSpacing: -1 },
  dataMedium: { fontFamily: FontFamily.monoMedium, fontSize: 20, lineHeight: 28 },
  dataSmall: { fontFamily: FontFamily.mono, fontSize: 13, lineHeight: 18 },
} as const;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------
export const Motion = {
  fast: 150,
  base: 250,
  slow: 400,
  // Bezier presets (RN: just durations; web can use CSS easing strings)
  easing: {
    snappy: 'cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    entrance: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  },
} as const;

// ---------------------------------------------------------------------------
// Breakpoints (used by useResponsive hook + RN-Web media queries)
// ---------------------------------------------------------------------------
export const Breakpoint = {
  mobile: 360,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

// ---------------------------------------------------------------------------
// Theme container (dark default)
// ---------------------------------------------------------------------------
export type ColorPalette = typeof PaletteDark;
export type ThemeName = 'dark' | 'light';

export interface VisionTheme {
  name: ThemeName;
  colors: ColorPalette;
  space: typeof Space;
  radius: typeof Radius;
  text: typeof TextStyles;
  motion: typeof Motion;
  font: typeof FontFamily;
}

export const ThemeDark: VisionTheme = {
  name: 'dark',
  colors: PaletteDark,
  space: Space,
  radius: Radius,
  text: TextStyles,
  motion: Motion,
  font: FontFamily,
};

export const ThemeLight: VisionTheme = {
  name: 'light',
  colors: PaletteLight as ColorPalette,
  space: Space,
  radius: Radius,
  text: TextStyles,
  motion: Motion,
  font: FontFamily,
};

// Default export — always dark for VisionaryX (command-center identity)
export const Theme = ThemeDark;
