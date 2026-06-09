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
  /** Claymorphism — soft rounded tiles with an inner highlight + plush drop
   *  shadow, like moulded clay. Pair with a big borderRadius and a matte fill. */
  clay: Platform.select({
    web: { boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -3px 6px rgba(0,0,0,0.06), 0 10px 18px rgba(17,24,39,0.13)' } as any,
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.13, shadowRadius: 9, elevation: 6 },
  }),
};
