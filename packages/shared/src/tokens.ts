/**
 * CampusRide Design Tokens — GlassUI Edition.
 * Single source of truth for design tokens used across Web and Mobile.
 * Designed for glassmorphism aesthetic while strictly preserving WCAG AA contrast.
 */

export const TOKENS = {
  colors: {
    // Brand & Primary
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#3b6bff',
      600: '#254ce0',
      700: '#1d3bb8',
      800: '#1e2e8a',
      900: '#172554',
    },
    // Safety & SOS (Non-negotiable high visibility)
    safety: {
      red: '#dc2626',
      redLight: 'rgba(220, 38, 38, 0.15)',
      orange: '#ea580c',
      green: '#16a34a',
      greenLight: 'rgba(22, 163, 74, 0.15)',
    },
    // GlassUI Backgrounds & Borders
    glass: {
      // Light mode glass surfaces
      lightSurface: 'rgba(255, 255, 255, 0.65)',
      lightSurfaceHover: 'rgba(255, 255, 255, 0.85)',
      lightBorder: 'rgba(255, 255, 255, 0.4)',
      lightBorderStrong: 'rgba(255, 255, 255, 0.7)',
      // Dark mode glass surfaces
      darkSurface: 'rgba(15, 23, 42, 0.75)',
      darkSurfaceHover: 'rgba(30, 41, 59, 0.85)',
      darkBorder: 'rgba(255, 255, 255, 0.12)',
      darkBorderStrong: 'rgba(255, 255, 255, 0.25)',
      // Accent glass tints
      primaryGlass: 'rgba(59, 107, 255, 0.12)',
      primaryGlassBorder: 'rgba(59, 107, 255, 0.3)',
      safetyGlass: 'rgba(220, 38, 38, 0.12)',
      safetyGlassBorder: 'rgba(220, 38, 38, 0.35)',
    },
    // Text ensuring WCAG AA (>4.5:1 on light glass, >4.5:1 on dark glass)
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      inverted: '#ffffff',
      invertedMuted: '#94a3b8',
    },
  },
  // Blur levels
  blur: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
  },
  // Glass shadows
  shadows: {
    glassSm: '0 4px 16px 0 rgba(31, 38, 135, 0.08)',
    glassMd: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
    glassLg: '0 16px 48px 0 rgba(31, 38, 135, 0.18)',
    glassGlow: '0 0 24px 0 rgba(59, 107, 255, 0.25)',
  },
  // Corner radii
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
} as const;

export type Tokens = typeof TOKENS;
