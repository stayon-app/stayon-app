// Push notifications — registers this device's Expo push token with the backend
// so server-side notify() can also deliver a push (see backend sendPush()).
//
// ⚠️ Requires the native module + a dev build:
//     npx expo install expo-notifications expo-device
// Then UNCOMMENT the block below. It's left commented so the web bundle builds
// without the native module installed. Until then registerForPush() is a safe no-op.

import { Api } from '../api';

export async function registerForPush(): Promise<void> {
  try {
    // --- enable after installing expo-notifications + a dev build ---
    // import * as Notifications from 'expo-notifications';
    // import * as Device from 'expo-device';
    // if (!Device.isDevice) return;                       // push needs a real device
    // const perm = await Notifications.getPermissionsAsync();
    // let granted = perm.granted;
    // if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    // if (!granted) return;
    // const { data: token } = await Notifications.getExpoPushTokenAsync();
    // if (!token) return;
    // await Api.auth.ensureSession();
    // await Api.push.register(token);
    void Api; // keep the import referenced until the block above is enabled
  } catch { /* no-op — push is best-effort */ }
}
