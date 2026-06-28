import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// StayOn signature gradient — teal → indigo. Use ONLY for the single primary CTA on a screen.
export const STAYON_GRADIENT: [string, string] = ['#0D9488', '#6366F1'];

interface Props {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: ViewStyle;
}

export const GradientButton: React.FC<Props> = ({ label, onPress, icon, disabled, style }) => {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.9} style={[styles.wrap, disabled && { opacity: 0.5 }, style]}>
      <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
        {icon && <Ionicons name={icon} size={20} color="#fff" style={{ marginRight: 8 }} />}
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 8 },
      web: { boxShadow: '0 6px 18px rgba(99,102,241,0.35)' } as any,
    }),
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  label: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
