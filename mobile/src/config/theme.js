// GLOBETROTTER PREMIUM DESIGN SYSTEM
// Palette Rose/Beige/Sauge - Luxury Minimalism

export const COLORS = {
  // Palette premium
  rosePoudre: '#F7CBCA',
  beige: '#DDD5D5',
  blancCasse: '#F1F7F7',
  bleuClair: '#D5E5E5',
  bleuGlacier: '#C6D7D8',
  vertSauge: '#5D6B6B',
  
  // Semantic
  primary: '#5D6B6B',
  accent: '#F7CBCA',
  surface: '#FFFFFF',
  background: '#F1F7F7',
  textPrimary: '#5D6B6B',
  textSecondary: '#8A9494',
  textMuted: '#B5BDBD',
  
  // Utility
  success: '#4A7C59',
  error: '#C85A54',
  warning: '#E8A75D',
};

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  full: 999,
};

export const TYPOGRAPHY = {
  // Display (Bell MT equivalent)
  displayLarge: {
    fontFamily: 'Georgia',
    fontSize: 56,
    fontWeight: '400',
    letterSpacing: -1,
  },
  displayMedium: {
    fontFamily: 'Georgia',
    fontSize: 42,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontFamily: 'Georgia',
    fontSize: 32,
    fontWeight: '400',
  },
  
  // Body
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  
  // Labels
  labelLarge: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelMedium: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.vertSauge,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.vertSauge,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.vertSauge,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 48,
    elevation: 8,
  },
};
