// StayOn Design System - Animations
// Smooth, premium animation configurations

export const animations = {
  // Duration (in milliseconds)
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 800,
  },
  
  // Easing curves (string form — for web/CSS-style consumers)
  easing: {
    default: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Native Animated.spring configs — pass directly to Animated.spring(value, { ...config }).
  // Replaces the `{ friction: 8, tension: 40 }` literals copy-pasted across screens.
  spring: {
    friction: 8,
    tension: 40,
  },
  springSnappy: {
    friction: 6,
    tension: 60,
  },
  springGentle: {
    friction: 9,
    tension: 30,
  },

  // Stagger delays for sequenced entrance animations.
  stagger: {
    tight: 60,
    base: 90,
    loose: 120,
  },
  
  // Preset animations
  presets: {
    fadeIn: {
      duration: 300,
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      duration: 200,
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideUp: {
      duration: 300,
      from: { transform: [{ translateY: 20 }], opacity: 0 },
      to: { transform: [{ translateY: 0 }], opacity: 1 },
    },
    slideDown: {
      duration: 300,
      from: { transform: [{ translateY: -20 }], opacity: 0 },
      to: { transform: [{ translateY: 0 }], opacity: 1 },
    },
    scaleIn: {
      duration: 300,
      from: { transform: [{ scale: 0.9 }], opacity: 0 },
      to: { transform: [{ scale: 1 }], opacity: 1 },
    },
    bounce: {
      duration: 500,
      from: { transform: [{ scale: 0.9 }] },
      to: { transform: [{ scale: 1 }] },
    },
  },
};

// Animation utility types
export type AnimationDuration = keyof typeof animations.duration;
export type AnimationEasing = keyof typeof animations.easing;
export type AnimationPreset = keyof typeof animations.presets;
