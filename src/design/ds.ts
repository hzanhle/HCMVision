/**
 * HCMRainVision – Design System Tokens
 * Source: stitch_hcmrainvision_civic_mobility_ui / DESIGN.md
 */

export const C = {
  background: '#051424',
  surface: '#051424',
  surfaceDim: '#051424',
  surfaceBright: '#2c3a4c',
  surfaceContainerLowest: '#010f1f',
  surfaceContainerLow: '#0d1c2d',
  surfaceContainer: '#122131',
  surfaceContainerHigh: '#1c2b3c',
  surfaceContainerHighest: '#273647',
  onSurface: '#d4e4fa',
  onSurfaceVariant: '#b9cac8',
  outline: '#849492',
  outlineVariant: '#3a4a48',

  primary: '#cffffb',
  primaryFixed: '#29fcf3',
  primaryFixedDim: '#00ddd6',
  primaryContainer: '#00f2ea',
  onPrimary: '#003735',
  onPrimaryContainer: '#006a66',

  secondary: '#adc6ff',
  secondaryContainer: '#0566d9',
  onSecondary: '#002e6a',
  onSecondaryContainer: '#e6ecff',

  tertiary: '#d8ffe7',
  tertiaryContainer: '#65f2b5',
  tertiaryFixedDim: '#4edea3',
  onTertiary: '#003824',
  onTertiaryContainer: '#006d4a',

  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',

  // Semantic status
  rain: '#EF4444',      // heavy rain / critical
  rainMid: '#F59E0B',   // moderate rain / caution
  rainLight: '#60A5FA', // light rain / info
  traffic: '#EF4444',   // traffic jam
  trafficMid: '#F59E0B',// slow traffic
  clear: '#10B981',     // all clear / good
} as const;

export const glassBg = 'rgba(22, 37, 41, 0.85)';
export const glassBorder = 'rgba(255, 255, 255, 0.1)';

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 12,
  containerMargin: 16,
} as const;

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xl2: 24,
  full: 9999,
} as const;

export const FONT = {
  displayLg: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.64 },
  headlineMd: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  titleSm: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  bodyMd: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelLg: { fontSize: 13, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.65 },
  labelSm: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
} as const;

/** Glass card style object - use with StyleSheet spread */
export const glassCard = {
  backgroundColor: glassBg,
  borderWidth: 0.5,
  borderColor: glassBorder,
} as const;
