// Soft, Airbnb-clean elevation shadows. Spread into a card style:
//   card: { ...shadows.card, backgroundColor: colors.card, borderRadius: 18 }
// On web, react-native-web maps shadow* → boxShadow automatically.

import { Platform } from 'react-native';

const make = (y: number, blur: number, opacity: number, elevation: number) =>
  Platform.select({
    web: { boxShadow: `0px ${y}px ${blur}px rgba(0,0,0,${opacity})` } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation,
    },
  });

export const shadows = {
  /** Whisper-soft lift for list cards. */
  card: make(2, 12, 0.06, 2),
  /** Slightly stronger for hero / featured cards. */
  raised: make(6, 20, 0.1, 5),
  /** For floating/sticky bars. */
  bar: make(-2, 16, 0.08, 8),
};
