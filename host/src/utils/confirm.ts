import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * Cross-platform confirmation dialog.
 *
 * React Native's `Alert.alert` with action buttons is NOT implemented on
 * react-native-web — the buttons never fire, so confirm-then-act flows
 * silently do nothing in the browser. This routes web to `window.confirm`
 * and keeps the native Alert on iOS/Android.
 */
export function confirmAction({
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmOptions) {
  if (Platform.OS === 'web') {
    const w = globalThis as any;
    const ok = typeof w.confirm === 'function'
      ? w.confirm(message ? `${title}\n\n${message}` : title)
      : true; // no confirm available → proceed
    if (ok) onConfirm();
    else onCancel?.();
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
