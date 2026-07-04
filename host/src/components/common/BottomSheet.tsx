import React, { useEffect, useState, useRef, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  PanResponder,
  useWindowDimensions,
  Platform,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useTheme, type ThemeColors } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/spacing';

const DRAG_THRESHOLD = 50;

export type SnapPoint = 'half' | 'full';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  initialSnapPoint?: SnapPoint;
  enableBackdropDismiss?: boolean;
  enableDragHandle?: boolean;
  snapPoints?: SnapPoint[];
  style?: ViewStyle;
}

/**
 * BottomSheet Component
 * 
 * Features:
 * - Smooth slide-up animation
 * - Drag handle for pulling down
 * - Multiple snap points (half/full height)
 * - Backdrop blur and dismiss
 * - Gesture support for smooth dragging
 * - Scrollable content
 * 
 * Usage:
 * <BottomSheet
 *   visible={isVisible}
 *   onClose={() => setIsVisible(false)}
 *   initialSnapPoint="half"
 * >
 *   <View>Your content here</View>
 * </BottomSheet>
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  initialSnapPoint = 'half',
  enableBackdropDismiss = true,
  enableDragHandle = true,
  snapPoints = ['half', 'full'],
  style,
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const SNAP_POINT_HALF = SCREEN_HEIGHT * 0.5;
  const SNAP_POINT_FULL = SCREEN_HEIGHT * 0.9;

  const [currentSnapPoint, setCurrentSnapPoint] = useState<SnapPoint>(initialSnapPoint);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const lastGestureY = useRef(0);

  const getSnapPointValue = (point: SnapPoint): number => {
    switch (point) {
      case 'half':
        return SCREEN_HEIGHT - SNAP_POINT_HALF;
      case 'full':
        return SCREEN_HEIGHT - SNAP_POINT_FULL;
      default:
        return SCREEN_HEIGHT - SNAP_POINT_HALF;
    }
  };

  useEffect(() => {
    if (visible) {
      openSheet(currentSnapPoint);
    } else {
      closeSheet();
    }
  }, [visible]);

  const openSheet = (snapPoint: SnapPoint) => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: getSnapPointValue(snapPoint),
        damping: 30,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentSnapPoint(initialSnapPoint);
    });
  };

  const snapToPoint = (point: SnapPoint) => {
    setCurrentSnapPoint(point);
    Animated.spring(translateY, {
      toValue: getSnapPointValue(point),
      damping: 30,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleBackdropPress = () => {
    if (enableBackdropDismiss) {
      onClose();
    }
  };

  // Pan responder for drag gestures — recreated each render so its closures
  // (live screen height, currentSnapPoint) stay in sync.
  const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        lastGestureY.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Only allow dragging down
          translateY.setValue(getSnapPointValue(currentSnapPoint) + gestureState.dy);
        } else if (currentSnapPoint === 'half' && snapPoints.includes('full')) {
          // Allow dragging up to full height
          const newValue = getSnapPointValue(currentSnapPoint) + gestureState.dy;
          if (newValue >= getSnapPointValue('full')) {
            translateY.setValue(newValue);
          }
        }
        lastGestureY.current = gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = gestureState.vy;
        const dragDistance = gestureState.dy;

        // Fast flick down
        if (velocity > 1 || dragDistance > DRAG_THRESHOLD * 2) {
          onClose();
          return;
        }

        // Fast flick up (only if we have full snap point)
        if (velocity < -1 && currentSnapPoint === 'half' && snapPoints.includes('full')) {
          snapToPoint('full');
          return;
        }

        // Determine snap point based on drag distance
        if (dragDistance > DRAG_THRESHOLD) {
          if (currentSnapPoint === 'full' && snapPoints.includes('half')) {
            snapToPoint('half');
          } else {
            onClose();
          }
        } else if (dragDistance < -DRAG_THRESHOLD) {
          if (currentSnapPoint === 'half' && snapPoints.includes('full')) {
            snapToPoint('full');
          }
        } else {
          // Snap back to current position
          snapToPoint(currentSnapPoint);
        }
      },
    });

  if (!visible) return null;

  const sheetHeight = currentSnapPoint === 'half' ? SNAP_POINT_HALF : SNAP_POINT_FULL;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleBackdropPress}
        >
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity,
              },
            ]}
          />
        </TouchableOpacity>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [{ translateY }],
            },
            style,
          ]}
        >
          {/* Drag Handle */}
          {enableDragHandle && (
            <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * Scrollable BottomSheet
 * For content that needs scrolling
 */
interface ScrollableBottomSheetProps extends BottomSheetProps {
  scrollEnabled?: boolean;
}

export const ScrollableBottomSheet: React.FC<ScrollableBottomSheetProps> = ({
  children,
  scrollEnabled = true,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <BottomSheet {...props}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEnabled={scrollEnabled}
      >
        {children}
      </ScrollView>
    </BottomSheet>
  );
};

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      zIndex: 9998,
    }),
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: spacing.xl,
    borderTopRightRadius: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      zIndex: 10000,
      position: 'fixed' as any,
    }),
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textTertiary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl * 2 : spacing.xl,
    backgroundColor: colors.surface,
  },
});

export default BottomSheet;
