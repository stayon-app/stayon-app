import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/spacing';
import { fonts, fontSizes, lineHeights } from '../../constants/fonts';

const TOAST_HEIGHT = 70;
const SWIPE_THRESHOLD = 100;

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  position?: ToastPosition;
  actionText?: string;
  onActionPress?: () => void;
}

interface ToastItemProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
}

/**
 * Individual Toast Component
 */
const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const { colors } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const styles = makeStyles(colors, SCREEN_WIDTH);
  const [translateY] = useState(new Animated.Value(toast.position === 'top' ? -100 : 100));
  const [translateX] = useState(new Animated.Value(0));
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: toast.position === 'top' ? -100 : 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  // Swipe to dismiss gesture
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      translateX.setValue(gestureState.dx);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
        // Swipe out
        Animated.timing(translateX, {
          toValue: gestureState.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }).start(() => onDismiss(toast.id));
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const getToastStyle = (): any => {
    const baseStyle = {
      ...styles.toast,
      ...styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}` as keyof typeof styles],
    };
    return baseStyle;
  };

  const getIcon = (): string => {
    switch (toast.type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getIconColor = (): string => {
    switch (toast.type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
      default:
        return colors.primary;
    }
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        getToastStyle(),
        {
          transform: [
            { translateY },
            { translateX },
          ],
          opacity,
        },
      ]}
    >
      <View style={styles.toastContent}>
        <Ionicons name={getIcon() as any} size={24} color={getIconColor()} />
        
        <View style={styles.textContainer}>
          {toast.title && (
            <Text style={styles.title} numberOfLines={1}>
              {toast.title}
            </Text>
          )}
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>

        {toast.actionText && (
          <TouchableOpacity
            onPress={() => {
              toast.onActionPress?.();
              handleDismiss();
            }}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>{toast.actionText}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

/**
 * Toast Container Component
 * Manages multiple toasts and positioning
 */
interface ToastContainerProps {
  toasts: ToastConfig[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const { colors } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const styles = makeStyles(colors, SCREEN_WIDTH);
  const topToasts = toasts.filter(t => t.position === 'top');
  const bottomToasts = toasts.filter(t => t.position !== 'top');

  return (
    <>
      {/* Top toasts */}
      {topToasts.length > 0 && (
        <View style={[styles.container, styles.containerTop]} pointerEvents="box-none">
          {topToasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        </View>
      )}

      {/* Bottom toasts */}
      {bottomToasts.length > 0 && (
        <View style={[styles.container, styles.containerBottom]} pointerEvents="box-none">
          {bottomToasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        </View>
      )}
    </>
  );
};

/**
 * Toast Manager Hook
 * Use this hook to show toasts from any component
 */
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const show = (config: Omit<ToastConfig, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: ToastConfig = {
      ...config,
      id,
      duration: config.duration ?? 3000,
      position: config.position ?? 'bottom',
    };
    setToasts(prev => [...prev, toast]);
    return id;
  };

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const dismissAll = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message: string, title?: string, options?: Partial<ToastConfig>) => {
    return show({ type: 'success', message, title, ...options });
  };

  const error = (message: string, title?: string, options?: Partial<ToastConfig>) => {
    return show({ type: 'error', message, title, ...options });
  };

  const info = (message: string, title?: string, options?: Partial<ToastConfig>) => {
    return show({ type: 'info', message, title, ...options });
  };

  const warning = (message: string, title?: string, options?: Partial<ToastConfig>) => {
    return show({ type: 'warning', message, title, ...options });
  };

  return {
    toasts,
    show,
    dismiss,
    dismissAll,
    success,
    error,
    info,
    warning,
    ToastContainer: () => <ToastContainer toasts={toasts} onDismiss={dismiss} />,
  };
};

function makeStyles(colors: any, SCREEN_WIDTH: number) {
  return StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  containerTop: {
    top: Platform.OS === 'ios' ? 50 : 20,
  },
  containerBottom: {
    bottom: Platform.OS === 'ios' ? 50 : 20,
  },
  toast: {
    width: SCREEN_WIDTH - spacing.xl * 2,
    minHeight: TOAST_HEIGHT,
    backgroundColor: colors.card,
    borderRadius: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  toastSuccess: {
    borderLeftColor: colors.success,
  },
  toastError: {
    borderLeftColor: colors.error,
  },
  toastWarning: {
    borderLeftColor: colors.warning,
  },
  toastInfo: {
    borderLeftColor: colors.primary,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  message: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: lineHeights.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: fontSizes.xs,
    ...fonts.semiBold,
    color: colors.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  });
}

export default useToast;
