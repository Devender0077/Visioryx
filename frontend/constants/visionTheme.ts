/**
 * VisionaryX Design System — OFFICIAL brand tokens (from brand book v1).
 *
 * Color, typography and motion tokens are platform-neutral (hex / numbers)
 * so the same values drive React Native (iOS / Android) and React Native Web.
 */

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------
export const Brand = {
  name: 'VisionaryX',
  fullName: 'VisionaryX AI',
  tagline: 'INTELLIGENT · SECURITY · SURVEILLANCE',
  shortTagline: 'Vision that watches, recognises and protects.',
  copyright: '© VisionaryX AI',
} as const;

// ---------------------------------------------------------------------------
// Official color palette (from brand book).
// ---------------------------------------------------------------------------
export const PaletteDark = {
  // Surfaces (deepest → highest elevation) — official names from brand book
  bg: '#07070B',          // VOID
  surface: '#0F0F17',     // SURFACE
  surfaceLow: '#0F0F17',
  surface2: '#16161F',    // ELEVATED
  surface3: '#1d1d28',
  // Text
  text: '#F4F4F8',        // MIST
  textMuted: '#9A9AAB',   // ASH
  textFaint: '#5C5C6B',
  // Borders / dividers
  border: '#24242F',      // LINE
  borderStrong: '#34344A',
  // Brand primary — INDIGO PRIMARY gradient (4F46E5 → 7C3AED)
  primary: '#4F46E5',
  primaryHover: '#5b53ec',
  primaryActive: '#7C3AED',
  primaryAccent: '#818CF8',   // Indigo 300 (light accent on dark)
  primaryAccent2: '#6366F1',  // Indigo 400 (mid accent)
  primaryGradEnd: '#7C3AED',
  onPrimary: '#FFFFFF',
  primaryFaint: 'rgba(79, 70, 229, 0.14)',
  // Live cyan — used for "live" / status indicators
  cyan: '#22D3EE',
  cyanFaint: 'rgba(34, 211, 238, 0.14)',
  // Status
  success: '#22D3EE',
  successFaint: 'rgba(34, 211, 238, 0.14)',
  warning: '#F59E0B',
  warningFaint: 'rgba(245, 158, 11, 0.14)',
  danger: '#EF4444',
  dangerHover: '#F65555',
  dangerFaint: 'rgba(239, 68, 68, 0.14)',
  info: '#818CF8',
  // Overlays
  scrim: 'rgba(0, 0, 0, 0.7)',
  glass: 'rgba(15, 15, 23, 0.7)',
  innerGlow: 'rgba(255, 255, 255, 0.04)',
  // Chart palette
  chartPrimary: '#4F46E5',
  chartActive: '#818CF8',
  chartTrack: 'rgba(79, 70, 229, 0.18)',
  chartLive: '#22D3EE',
} as const;

export const PaletteLight = {
  bg: '#F4F4F8',
  surface: '#FFFFFF',
  surfaceLow: '#F4F4F8',
  surface2: '#EEEEF3',
  surface3: '#E4E4EC',
  text: '#0F0F17',
  textMuted: '#5C5C6B',
  textFaint: '#9A9AAB',
  border: '#E4E4EC',
  borderStrong: '#C7C7D2',
  primary: '#4F46E5',
  primaryHover: '#3F36C5',
  primaryActive: '#7C3AED',
  primaryAccent: '#4F46E5',
  primaryAccent2: '#6366F1',
  primaryGradEnd: '#7C3AED',
  onPrimary: '#FFFFFF',
  primaryFaint: 'rgba(79, 70, 229, 0.10)',
  cyan: '#0891B2',
  cyanFaint: 'rgba(8, 145, 178, 0.10)',
  success: '#0891B2',
  successFaint: 'rgba(8, 145, 178, 0.10)',
  warning: '#B45309',
  warningFaint: 'rgba(180, 83, 9, 0.10)',
  danger: '#DC2626',
  dangerHover: '#B91C1C',
  dangerFaint: 'rgba(220, 38, 38, 0.10)',
  info: '#4F46E5',
  scrim: 'rgba(15, 15, 23, 0.4)',
  glass: 'rgba(255, 255, 255, 0.7)',
  innerGlow: 'rgba(15, 15, 23, 0.03)',
  chartPrimary: '#4F46E5',
  chartActive: '#7C3AED',
  chartTrack: 'rgba(79, 70, 229, 0.12)',
  chartLive: '#0891B2',
} as const;

// Brand gradient stops — for the squircle logo background and accents.
export const BrandGradient = {
  start: '#4F46E5',
  end: '#7C3AED',
} as const;

// ---------------------------------------------------------------------------
// Spacing & radius
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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  squircle: 28,  // for icon-app squircle
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Typography — Geist (display) + IBM Plex Sans (body) + IBM Plex Mono (data).
// Loaded in app/_layout.tsx via @expo-google-fonts.
// ---------------------------------------------------------------------------
export const FontFamily = {
  // Display / headings — Geist
  display: 'Geist_700Bold',
  heading: 'Geist_600SemiBold',
  headingMedium: 'Geist_500Medium',
  // Body — IBM Plex Sans
  body: 'IBMPlexSans_400Regular',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemibold: 'IBMPlexSans_600SemiBold',
  // Data / numeric / labels — IBM Plex Mono
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemibold: 'IBMPlexMono_600SemiBold',
} as const;

export const TextStyles = {
  h1: { fontFamily: FontFamily.display, fontSize: 48, lineHeight: 56, letterSpacing: -1 },
  h2: { fontFamily: FontFamily.display, fontSize: 36, lineHeight: 44, letterSpacing: -0.75 },
  h3: { fontFamily: FontFamily.heading, fontSize: 24, lineHeight: 32, letterSpacing: -0.5 },
  h4: { fontFamily: FontFamily.heading, fontSize: 20, lineHeight: 28, letterSpacing: -0.25 },
  bodyLarge: { fontFamily: FontFamily.body, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: FontFamily.body, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 16 },
  // Brand voice label — IBM Plex Mono SMALL CAPS with letter-spacing
  label: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.4,
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
  easing: {
    snappy: 'cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    entrance: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  },
} as const;

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------
export const Breakpoint = {
  mobile: 360,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

// ---------------------------------------------------------------------------
// Theme container
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

export const Theme = ThemeDark;
