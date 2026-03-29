/**
 * Tokens from repo `stitch` HTML exports and visioryx_sentinel/DESIGN.md
 * ("The Digital Sentinel" — dark indigo surfaces, no harsh borders).
 */
export const Stitch = {
  surface: '#0b1326',
  surfaceContainerLowest: '#060e20',
  surfaceContainerLow: '#131b2e',
  surfaceContainer: '#171f33',
  surfaceContainerHigh: '#222a3d',
  surfaceContainerHighest: '#2d3449',
  onSurface: '#dae2fd',
  onSurfaceVariant: '#c2c6d5',
  outline: '#8c909f',
  /** Light accent (headlines, icons) */
  primary: '#afc6ff',
  /** Buttons / emphasis */
  primaryContainer: '#2065d1',
  onPrimaryContainer: '#e4eaff',
  onPrimary: '#002d6c',
  outlineVariant: '#424753',
  /** Inactive tab icons (Stitch HTML ~60% opacity on #424753) */
  tabInactive: 'rgba(66, 71, 83, 0.72)',
  secondary: '#57e082',
  secondaryContainer: '#00aa54',
  onSecondaryContainer: '#003415',
  tertiary: '#ffb950',
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
} as const;

/** Registered via expo-font and Google font packages in app/_layout.tsx */
export const FontFamily = {
  headline: 'Manrope_700Bold',
  headlineBlack: 'Manrope_800ExtraBold',
  body: 'Inter_400Regular',
  labelMedium: 'Inter_500Medium',
  labelSemibold: 'Inter_600SemiBold',
} as const;
