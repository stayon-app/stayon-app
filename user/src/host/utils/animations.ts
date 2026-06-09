import { Animated, Easing } from 'react-native';

/**
 * Animation Utilities
 * 
 * Provides reusable animation functions and helpers
 * for consistent animation behavior throughout the app.
 */

// ============================================
// TIMING PRESETS
// ============================================

export const timing = {
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

export const easing = {
  linear: Easing.linear,
  ease: Easing.ease,
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),
};

// ============================================
// SPRING CONFIGURATIONS
// ============================================

export const springConfig = {
  gentle: {
    damping: 20,
    stiffness: 150,
    mass: 1,
  },
  default: {
    damping: 15,
    stiffness: 200,
    mass: 1,
  },
  snappy: {
    damping: 10,
    stiffness: 300,
    mass: 1,
  },
  bouncy: {
    damping: 8,
    stiffness: 150,
    mass: 1,
  },
};

// ============================================
// FADE ANIMATIONS
// ============================================

/**
 * Fade in animation
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = timing.normal,
  toValue: number = 1
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: easing.easeOut,
    useNativeDriver: true,
  });
};

/**
 * Fade out animation
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = timing.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: easing.easeIn,
    useNativeDriver: true,
  });
};

/**
 * Fade toggle (fade in or out based on current state)
 */
export const fadeToggle = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = timing.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: easing.easeInOut,
    useNativeDriver: true,
  });
};

// ============================================
// SCALE ANIMATIONS
// ============================================

/**
 * Scale up animation
 */
export const scaleIn = (
  animatedValue: Animated.Value,
  duration: number = timing.normal,
  toValue: number = 1
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue,
    ...springConfig.snappy,
    useNativeDriver: true,
  });
};

/**
 * Scale down animation
 */
export const scaleOut = (
  animatedValue: Animated.Value,
  duration: number = timing.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: easing.easeIn,
    useNativeDriver: true,
  });
};

/**
 * Press scale animation (press and release)
 */
export const pressScale = (
  animatedValue: Animated.Value,
  pressValue: number = 0.96,
  duration: number = 100
): {
  pressIn: Animated.CompositeAnimation;
  pressOut: Animated.CompositeAnimation;
} => {
  return {
    pressIn: Animated.timing(animatedValue, {
      toValue: pressValue,
      duration,
      easing: easing.easeOut,
      useNativeDriver: true,
    }),
    pressOut: Animated.spring(animatedValue, {
      toValue: 1,
      ...springConfig.snappy,
      useNativeDriver: true,
    }),
  };
};

/**
 * Bounce scale animation
 */
export const bounceScale = (
  animatedValue: Animated.Value,
  toValue: number = 1.2,
  duration: number = 400
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue,
      duration: duration / 2,
      easing: easing.easeOut,
      useNativeDriver: true,
    }),
    Animated.spring(animatedValue, {
      toValue: 1,
      ...springConfig.bouncy,
      useNativeDriver: true,
    }),
  ]);
};

// ============================================
// SLIDE ANIMATIONS
// ============================================

/**
 * Slide from position
 */
export const slideIn = (
  animatedValue: Animated.Value,
  fromValue: number,
  toValue: number = 0,
  duration: number = timing.normal
): Animated.CompositeAnimation => {
  animatedValue.setValue(fromValue);
  return Animated.spring(animatedValue, {
    toValue,
    ...springConfig.default,
    useNativeDriver: true,
  });
};

/**
 * Slide to position
 */
export const slideOut = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = timing.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: easing.easeIn,
    useNativeDriver: true,
  });
};

// ============================================
// ROTATION ANIMATIONS
// ============================================

/**
 * Rotate animation
 */
export const rotate = (
  animatedValue: Animated.Value,
  toValue: number = 1,
  duration: number = timing.slow
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: easing.linear,
    useNativeDriver: true,
  });
};

/**
 * Spin animation (continuous)
 */
export const spin = (
  animatedValue: Animated.Value,
  duration: number = 1000
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: easing.linear,
      useNativeDriver: true,
    })
  );
};

// ============================================
// COMBINED ANIMATIONS
// ============================================

/**
 * Fade + Scale In (entrance animation)
 */
export const fadeScaleIn = (
  opacity: Animated.Value,
  scale: Animated.Value,
  duration: number = timing.normal
): Animated.CompositeAnimation => {
  return Animated.parallel([
    fadeIn(opacity, duration),
    scaleIn(scale, duration, 1),
  ]);
};

/**
 * Fade + Scale Out (exit animation)
 */
export const fadeScaleOut = (
  opacity: Animated.Value,
  scale: Animated.Value,
  duration: number = timing.normal
): Animated.CompositeAnimation => {
  return Animated.parallel([
    fadeOut(opacity, duration),
    scaleOut(scale, duration),
  ]);
};

/**
 * Fade + Slide In (from bottom)
 */
export const fadeSlideIn = (
  opacity: Animated.Value,
  translateY: Animated.Value,
  fromValue: number = 50,
  duration: number = timing.normal
): Animated.CompositeAnimation => {
  return Animated.parallel([
    fadeIn(opacity, duration),
    slideIn(translateY, fromValue, 0, duration),
  ]);
};

// ============================================
// STAGGER ANIMATIONS
// ============================================

/**
 * Stagger array of animations with delay
 */
export const stagger = (
  animations: Animated.CompositeAnimation[],
  delay: number = 100
): Animated.CompositeAnimation => {
  return Animated.stagger(delay, animations);
};

/**
 * Create staggered fade-ins for a list
 */
export const staggeredFadeIn = (
  animatedValues: Animated.Value[],
  delay: number = 100,
  duration: number = timing.normal
): Animated.CompositeAnimation => {
  const animations = animatedValues.map(value => fadeIn(value, duration));
  return stagger(animations, delay);
};

/**
 * Create staggered scale-ins for a list
 */
export const staggeredScaleIn = (
  animatedValues: Animated.Value[],
  delay: number = 100
): Animated.CompositeAnimation => {
  const animations = animatedValues.map(value => scaleIn(value));
  return stagger(animations, delay);
};

// ============================================
// SEQUENCE ANIMATIONS
// ============================================

/**
 * Run animations in sequence
 */
export const sequence = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.sequence(animations);
};

/**
 * Run animations in parallel
 */
export const parallel = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.parallel(animations);
};

// ============================================
// INTERPOLATION HELPERS
// ============================================

/**
 * Create rotation interpolation
 */
export const createRotationInterpolation = (
  animatedValue: Animated.Value,
  rotations: number = 1
): Animated.AnimatedInterpolation<string | number> => {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${360 * rotations}deg`],
  });
};

/**
 * Create scale interpolation
 */
export const createScaleInterpolation = (
  animatedValue: Animated.Value,
  minScale: number = 0,
  maxScale: number = 1
): Animated.AnimatedInterpolation<string | number> => {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [minScale, maxScale],
  });
};

/**
 * Create translate interpolation
 */
export const createTranslateInterpolation = (
  animatedValue: Animated.Value,
  from: number,
  to: number
): Animated.AnimatedInterpolation<string | number> => {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [from, to],
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create animated value with initial value
 */
export const createAnimatedValue = (initialValue: number = 0): Animated.Value => {
  return new Animated.Value(initialValue);
};

/**
 * Create multiple animated values
 */
export const createAnimatedValues = (
  count: number,
  initialValue: number = 0
): Animated.Value[] => {
  return Array.from({ length: count }, () => new Animated.Value(initialValue));
};

/**
 * Reset animated value
 */
export const resetAnimatedValue = (
  animatedValue: Animated.Value,
  value: number = 0
): void => {
  animatedValue.setValue(value);
};

/**
 * Reset multiple animated values
 */
export const resetAnimatedValues = (
  animatedValues: Animated.Value[],
  value: number = 0
): void => {
  animatedValues.forEach(v => v.setValue(value));
};

// ============================================
// PRESET ANIMATIONS
// ============================================

/**
 * Card entrance animation preset
 */
export const cardEntrance = (
  opacity: Animated.Value,
  scale: Animated.Value,
  translateY: Animated.Value
): Animated.CompositeAnimation => {
  return Animated.parallel([
    fadeIn(opacity, timing.normal),
    scaleIn(scale, timing.normal, 1),
    slideIn(translateY, 20, 0, timing.normal),
  ]);
};

/**
 * Modal entrance animation preset
 */
export const modalEntrance = (
  opacity: Animated.Value,
  translateY: Animated.Value,
  fromValue: number = 100
): Animated.CompositeAnimation => {
  return Animated.parallel([
    fadeIn(opacity, timing.fast),
    Animated.spring(translateY, {
      toValue: 0,
      ...springConfig.default,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Button press animation preset
 */
export const buttonPress = (
  scale: Animated.Value
): {
  onPressIn: () => void;
  onPressOut: () => void;
} => {
  const { pressIn, pressOut } = pressScale(scale);
  return {
    onPressIn: () => pressIn.start(),
    onPressOut: () => pressOut.start(),
  };
};

/**
 * Heart animation preset (like button)
 */
export const heartAnimation = (
  scale: Animated.Value
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(scale, {
      toValue: 1.3,
      duration: 150,
      easing: easing.easeOut,
      useNativeDriver: true,
    }),
    Animated.spring(scale, {
      toValue: 1,
      ...springConfig.bouncy,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Pulse animation (attention grabber)
 */
export const pulse = (
  scale: Animated.Value,
  pulseValue: number = 1.05,
  duration: number = 1000
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(scale, {
        toValue: pulseValue,
        duration: duration / 2,
        easing: easing.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: duration / 2,
        easing: easing.easeInOut,
        useNativeDriver: true,
      }),
    ])
  );
};

/**
 * Shake animation (error feedback)
 */
export const shake = (
  translateX: Animated.Value,
  intensity: number = 10,
  duration: number = 400
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(translateX, {
      toValue: intensity,
      duration: duration / 8,
      useNativeDriver: true,
    }),
    Animated.timing(translateX, {
      toValue: -intensity,
      duration: duration / 4,
      useNativeDriver: true,
    }),
    Animated.timing(translateX, {
      toValue: intensity,
      duration: duration / 4,
      useNativeDriver: true,
    }),
    Animated.timing(translateX, {
      toValue: -intensity,
      duration: duration / 4,
      useNativeDriver: true,
    }),
    Animated.timing(translateX, {
      toValue: 0,
      duration: duration / 8,
      useNativeDriver: true,
    }),
  ]);
};

export default {
  timing,
  easing,
  springConfig,
  fadeIn,
  fadeOut,
  fadeToggle,
  scaleIn,
  scaleOut,
  pressScale,
  bounceScale,
  slideIn,
  slideOut,
  rotate,
  spin,
  fadeScaleIn,
  fadeScaleOut,
  fadeSlideIn,
  stagger,
  staggeredFadeIn,
  staggeredScaleIn,
  sequence,
  parallel,
  createRotationInterpolation,
  createScaleInterpolation,
  createTranslateInterpolation,
  createAnimatedValue,
  createAnimatedValues,
  resetAnimatedValue,
  resetAnimatedValues,
  cardEntrance,
  modalEntrance,
  buttonPress,
  heartAnimation,
  pulse,
  shake,
};
