import React from 'react';
import { Image } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

// Glossy 3D emoji from Microsoft's open-source Fluent Emoji set (MIT licensed),
// served via jsDelivr. Gives a consistent, realistic 3D look across platforms
// (including Windows/web, where unicode emoji render flat).

const BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

// Curated name → CDN path map for the icons the app uses.
const MAP: Record<string, string> = {
  house: 'House/3D/house_3d.png',
  calendar: 'Calendar/3D/calendar_3d.png',
  clipboard: 'Clipboard/3D/clipboard_3d.png',
  barchart: 'Bar%20chart/3D/bar_chart_3d.png',
  chat: 'Speech%20balloon/3D/speech_balloon_3d.png',
  star: 'Star/3D/star_3d.png',
  chart: 'Chart%20increasing/3D/chart_increasing_3d.png',
  money: 'Money%20bag/3D/money_bag_3d.png',
  tools: 'Hammer%20and%20wrench/3D/hammer_and_wrench_3d.png',
  shield: 'Shield/3D/shield_3d.png',
  books: 'Books/3D/books_3d.png',
  sparkles: 'Sparkles/3D/sparkles_3d.png',
  plus: 'Plus/3D/plus_3d.png',
  clock: 'Alarm%20clock/3D/alarm_clock_3d.png',
  hourglass: 'Hourglass%20done/3D/hourglass_done_3d.png',
  gift: 'Wrapped%20gift/3D/wrapped_gift_3d.png',
  rocket: 'Rocket/3D/rocket_3d.png',
  compass: 'Compass/3D/compass_3d.png',
  camera: 'Camera/3D/camera_3d.png',
  fire: 'Fire/3D/fire_3d.png',
  movie_camera: 'Movie%20camera/3D/movie_camera_3d.png',
  clapper: 'Clapper%20board/3D/clapper_board_3d.png',
  film: 'Film%20frames/3D/film_frames_3d.png',
  phone: 'Mobile%20phone/3D/mobile_phone_3d.png',
  flash_camera: 'Camera%20with%20flash/3D/camera_with_flash_3d.png',
};

export type Emoji3DName = keyof typeof MAP;

export const Emoji3D: React.FC<{ name: Emoji3DName | string; size?: number; style?: StyleProp<ImageStyle> }> = ({ name, size = 30, style }) => {
  const path = MAP[name] ?? MAP.sparkles;
  return (
    <Image
      source={{ uri: `${BASE}/${path}` }}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      transition={150}
    />
  );
};

export default Emoji3D;
