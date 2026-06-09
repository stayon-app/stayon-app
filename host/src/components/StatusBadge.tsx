import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../constants';
import { withOpacity } from '../utils/color';

type Status = string;

/** Small semantic status pill (published/confirmed/pending/cancelled/draft…). */
export const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
  const { colors } = useTheme();
  const s = status.toLowerCase();
  const color =
    /publish|confirm|paid|active|complete/.test(s) ? colors.success :
    /pend|request|snooz|process/.test(s) ? colors.warning :
    /cancel|declin|fail/.test(s) ? colors.error :
    colors.textTertiary; // draft / unknown

  return (
    <View style={[styles.badge, { backgroundColor: withOpacity(color, 0.14) }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{status[0].toUpperCase() + status.slice(1)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, ...fonts.bold },
});
