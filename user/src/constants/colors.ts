// StayOn Design System - Premium Resort Colors
// Luxury staycation theme with tropical teal, coral, and gold accents

export const colors = {
  // Primary Brand Colors - Tropical Teal
  primary: '#0D9488',        // Premium teal (staycation signature) - Darker, more sophisticated
  primaryLight: '#14B8A6',   // Light teal for hover states
  primaryDark: '#0F766E',    // Darker teal for pressed states
  primaryUltraLight: '#CCFBF1', // Ultra light teal backgrounds
  primarySubtle: '#F0FDFA',  // Subtle teal wash
  
  // Secondary Colors - Sunset Coral
  secondary: '#FB7185',      // Coral pink for warm accents
  secondaryLight: '#FDA4AF',
  secondaryDark: '#F43F5E',
  
  // Neutral Colors - Clean whites with depth
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFB',
  backgroundTertiary: '#F0FDFA',
  surface: '#FFFFFF',        // Modal and card surfaces
  
  // Text Colors - Deep and readable
  textPrimary: '#0F172A',    // Deep slate
  textSecondary: '#475569',   // Medium slate
  textTertiary: '#94A3B8',    // Light slate
  textInverse: '#FFFFFF',
  
  // UI Colors
  border: '#D1FAE5',         // Soft teal border
  borderLight: '#E5E7EB',
  divider: '#D1FAE5',
  
  // Semantic Colors
  success: '#14B8A6',        // Teal
  warning: '#F59E0B',        // Amber
  error: '#EF4444',          // Red
  info: '#06B6D4',           // Cyan
  
  // Overlay & Shadow
  overlay: 'rgba(0, 40, 60, 0.45)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',
  overlayMedium: 'rgba(0, 0, 0, 0.45)',
  overlayStrong: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(20, 184, 166, 0.25)',
  cardShadow: 'rgba(20, 184, 166, 0.15)',
  
  // Gradient Colors - Tropical vibes
  gradientStart: '#14B8A6',   // Teal
  gradientEnd: '#FB7185',     // Coral
  gradientAccent: '#F59E0B',  // Gold
  
  // Luxury accents - Enhanced quality
  gold: '#F59E0B',           // Rich amber gold
  goldLight: '#FEF3C7',      // Soft gold wash
  goldDark: '#D97706',       // Deep gold
  
  // Glass Morphism - Premium cards
  glassBackground: 'rgba(255, 255, 255, 0.98)',
  glassBorder: 'rgba(255, 255, 255, 0.6)',
  glassBackdrop: 'rgba(240, 253, 250, 0.95)',
  
  // Resort/Staycation specific colors
  ocean: '#06B6D4',          // Ocean cyan
  sand: '#FEF3C7',           // Sandy beach
  sunset: '#F97316',         // Orange sunset
  palm: '#10B981',           // Palm green
  sky: '#7DD3FC',            // Sky blue
  
  // Shadows for elevation
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};

export type ColorKey = keyof typeof colors;
