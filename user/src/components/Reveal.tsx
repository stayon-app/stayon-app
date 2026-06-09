import React, { useEffect, useRef } from 'react';
import { Animated, LayoutChangeEvent, Platform, StyleProp, ViewStyle } from 'react-native';

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay (ms) for sections already on screen at first paint. */
  delay?: number;
  /** Starting scale — how small it begins before popping to full size. */
  fromScale?: number;
  /** Slight upward drift (px) as it pops in. */
  offset?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * Shared scroll position. When provided, the section "pops" in only once it
   * scrolls into view (showcase reveal). When omitted, it pops on mount.
   */
  scrollY?: Animated.Value;
  /** Viewport height — required with scrollY to know when a section is visible. */
  viewportHeight?: number;
  /** Fraction of the viewport (from top) where the reveal triggers. */
  threshold?: number;
  /** 'pop' = bouncy scale-up (default). 'rise' = clean slide-up + fade. */
  mode?: 'pop' | 'rise';
  /** Rise-mode animation duration (ms). Default 480. */
  duration?: number;
}

/**
 * Pops its children in with a spring (scale-up + slight overshoot + fade).
 * In scroll mode (scrollY + viewportHeight given) each section reveals as it
 * enters the viewport, so the page showcases section-by-section instead of
 * rendering everything at once.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  delay = 0,
  fromScale = 0.85,
  offset = 14,
  style,
  scrollY,
  viewportHeight,
  threshold = 0.9,
  mode = 'pop',
  duration = 480,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const shown = useRef(false);
  const layoutY = useRef<number | null>(null);
  const lastScroll = useRef(0);
  const rise = mode === 'rise';

  const pop = (withDelay: number) => {
    if (shown.current) return;
    shown.current = true;
    if (rise) {
      // Clean "Rise": smooth slide-up + fade, no bounce.
      Animated.timing(progress, {
        toValue: 1,
        delay: withDelay,
        duration,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.spring(progress, {
        toValue: 1,
        delay: withDelay,
        friction: 6, // lower = bouncier
        tension: 80,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  // Mount mode (no scroll wiring): just pop with the stagger delay.
  useEffect(() => {
    if (scrollY) return;
    pop(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll-reveal mode: pop the first time this section enters the viewport.
  useEffect(() => {
    if (!scrollY || !viewportHeight) return;
    const id = scrollY.addListener(({ value }) => {
      lastScroll.current = value;
      if (shown.current || layoutY.current == null) return;
      if (value + viewportHeight * threshold > layoutY.current) {
        // Stagger the first screenful; reveal instantly once the user scrolls.
        pop(value < 8 ? delay : 0);
      }
    });
    return () => scrollY.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollY, viewportHeight, delay, threshold]);

  const onLayout = (e: LayoutChangeEvent) => {
    layoutY.current = e.nativeEvent.layout.y;
    // Sections visible at first paint reveal immediately (staggered).
    if (scrollY && viewportHeight && !shown.current) {
      if (lastScroll.current + viewportHeight * threshold > layoutY.current) {
        pop(lastScroll.current < 8 ? delay : 0);
      }
    }
  };

  // Spring overshoots past 1, so un-clamped scale nudges slightly above 1 at
  // the peak → the "pop". Opacity/drift are clamped so they never flicker.
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [rise ? 1 : fromScale, 1] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [rise ? Math.max(offset, 28) : offset, 0], extrapolate: 'clamp' });

  return (
    <Animated.View onLayout={onLayout} style={[style, { opacity, transform: [{ scale }, { translateY }] }]}>
      {children}
    </Animated.View>
  );
};

export default Reveal;
