import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

interface SplashScreenProps {
  onFinish: () => void;
}

// Simple host splash — plain dark backdrop with the lavender italic "Stay On"
// wordmark (same font/glow as the guest brand) + a refined "HOST" label.
export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { width } = useWindowDimensions();
  const styles = makeStyles(width);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  const hostFade = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: !isWeb }),
        Animated.spring(rise, { toValue: 0, friction: 8, tension: 50, useNativeDriver: !isWeb }),
      ]),
      Animated.timing(hostFade, { toValue: 1, duration: 500, useNativeDriver: !isWeb }),
    ]).start();

    const t = setTimeout(() => {
      Animated.timing(screenFade, { toValue: 0, duration: 450, useNativeDriver: !isWeb }).start(() => onFinish());
    }, 1700);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      {/* StayOn brand gradient — teal → indigo (STAYON_GRADIENT) */}
      <LinearGradient
        colors={['#0D9488', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.Text style={[styles.brand, { opacity: fade, transform: [{ translateY: rise }] }]}>
        Stay<Text style={styles.brandOn}>On</Text>
      </Animated.Text>
      <Animated.View style={[styles.hostRow, { opacity: hostFade }]}>
        <View style={styles.rule} />
        <Text style={styles.host}>HOST</Text>
        <View style={styles.rule} />
      </Animated.View>
    </Animated.View>
  );
};

function makeStyles(width: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D9488', justifyContent: 'center', alignItems: 'center' },
    brand: {
      fontSize: isWeb ? 84 : width > 400 ? 72 : 60,
      fontWeight: '800',
      fontStyle: 'normal',
      color: '#FFFFFF',
      letterSpacing: isWeb ? -3 : -2,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 14,
      ...(isWeb && { fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }),
    },
    brandOn: { color: '#5EEAD4' },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
    rule: { width: 30, height: 1, backgroundColor: 'rgba(255,255,255,0.45)' },
    host: {
      color: 'rgba(255,255,255,0.92)',
      fontSize: isWeb ? 16 : 14,
      letterSpacing: 8,
      fontWeight: '700',
    },
  });
}

export default SplashScreen;
