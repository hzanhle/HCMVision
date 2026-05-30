import { colors } from './colors';

export const theme = {
  colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    pill: 999,
  },
  typography: {
    title: 28,
    subtitle: 18,
    body: 14,
    caption: 13,
    button: 16,
  },
};

export type AppTheme = typeof theme;
