// StayOn Design System - Typography
// Using system fonts for optimal performance

export const fonts = {
  // Font Families
  regular: {
    fontFamily: 'System',
    fontWeight: '400' as const,
  },
  medium: {
    fontFamily: 'System',
    fontWeight: '500' as const,
  },
  semiBold: {
    fontFamily: 'System',
    fontWeight: '600' as const,
  },
  bold: {
    fontFamily: 'System',
    fontWeight: '700' as const,
  },
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

export const lineHeights = {
  xs: 16,
  sm: 18,
  base: 20,
  md: 22,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 38,
  '4xl': 44,
  '5xl': 56,
};

// Letter-spacing scale — premium headings read tighter, eyebrows read wider.
export const letterSpacing = {
  tighter: -0.8,
  tight: -0.5,
  snug: -0.3,
  normal: 0,
  wide: 0.5,
  wider: 1,
};

// Pre-composed text styles
export const textStyles = {
  h1: {
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    letterSpacing: letterSpacing.tighter,
    ...fonts.bold,
  },
  h2: {
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    letterSpacing: letterSpacing.tight,
    ...fonts.bold,
  },
  h3: {
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    letterSpacing: letterSpacing.tight,
    ...fonts.semiBold,
  },
  h4: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    letterSpacing: letterSpacing.snug,
    ...fonts.semiBold,
  },
  body: {
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    ...fonts.regular,
  },
  bodyLarge: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    ...fonts.regular,
  },
  bodySmall: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    ...fonts.regular,
  },
  caption: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    ...fonts.regular,
  },
  button: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    letterSpacing: letterSpacing.snug,
    ...fonts.semiBold,
  },
  // Small uppercase label above a title (e.g. "STAYON", "STEP 2 OF 3").
  eyebrow: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
    ...fonts.bold,
  },
  // Form-field / settings-row label.
  label: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    ...fonts.semiBold,
  },
  // Inline tappable text ("See all", "Edit").
  link: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    ...fonts.semiBold,
  },
  // Validation / helper text.
  error: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    ...fonts.medium,
  },
};
