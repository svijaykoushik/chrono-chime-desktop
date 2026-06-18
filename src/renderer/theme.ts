import { createTheme, type Theme } from '@mui/material';

export type ThemeMode = 'light' | 'dark';

/**
 * "Aesthetic Bubblegum Pink" — ChronoChime's brand palette, derived from the
 * app icon: a bubblegum-pink disc (#F589B2) with a deeper rose edge (#EE5A8A)
 * and white bell/waves. These are the canonical brand colors; future work
 * should build on them. See docs/design/branding-and-theme.md.
 */
export const BRAND = {
  /** The deeper rose from the icon's shadow/outline — primary action color. */
  rose: '#EE5A8A',
  /** The bubblegum-pink disc fill — the signature hue. */
  bubblegum: '#F589B2',
  /** A soft, light tint for backgrounds and hover surfaces. */
  blush: '#FFF0F6',
  /** Deep rose for pressed/dark accents. */
  roseDeep: '#C73E6E',
  /** Light bubblegum for dark-mode contrast. */
  bubblegumLight: '#FBB6D0',
  white: '#FFFFFF',
} as const;

/**
 * Material 3-flavoured theme in the Bubblegum Pink brand: calm surfaces,
 * rounded corners, soft elevation. Built per effective color mode.
 */
export function makeTheme(mode: ThemeMode): Theme {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: isDark
        ? { main: BRAND.bubblegum, light: BRAND.bubblegumLight, dark: BRAND.rose, contrastText: '#3A1020' }
        : { main: BRAND.rose, light: BRAND.bubblegum, dark: BRAND.roseDeep, contrastText: BRAND.white },
      secondary: { main: isDark ? BRAND.bubblegumLight : BRAND.bubblegum },
      background: isDark
        ? { default: '#17121A', paper: '#221820' }
        : { default: BRAND.blush, paper: BRAND.white },
    },
    shape: { borderRadius: 16 },
    typography: { fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif' },
  });
}
