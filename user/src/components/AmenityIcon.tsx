// Renders a Lucide icon by its PascalCase name (e.g. "Wifi", "PawPrint"), the
// clean line-icon set used for amenities. Falls back to a box if the name is
// unknown, so a typo never crashes the screen.
import React from 'react';
import * as Lucide from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const AmenityIcon: React.FC<Props> = ({ name, size = 24, color = '#222', strokeWidth = 1.7 }) => {
  const Cmp = (Lucide as any)[name];
  if (Cmp) return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
  // Legacy/mock stays still use Ionicons names — render those so nothing breaks.
  return <Ionicons name={name as any} size={size} color={color} />;
};

export default AmenityIcon;
