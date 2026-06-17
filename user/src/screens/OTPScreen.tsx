import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  ImageBackground,
  Alert,
} from 'react-native';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { useAuth, useCurrency } from '../contexts';
import { useHaptics } from '../hooks/useHaptics';

interface OTPScreenProps {
  navigation: any;
  route: any;
}

export const OTPScreen: React.FC<OTPScreenProps> = ({
  navigation,
  route,
}) => {
  const { phoneOrEmail: rawPhoneOrEmail, returnAction, countryCode, dialCode } = route?.params || {};
  const phoneOrEmail = rawPhoneOrEmail != null ? String(rawPhoneOrEmail) : '';
  const { login } = useAuth();
  const { setCurrencyByCountry, setCurrencyByDialCode } = useCurrency();
  const { light } = useHaptics();
  const { height } = useWindowDimensions();
  const styles = makeStyles(height);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-focus first input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
  }, []);

  const handleCodeChange = (text: string, index: number) => {
    // Accept digits only
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (error) setError(false);

    if (digitsOnly.length > 1) {
      // Handle paste - accept any digit-only code
      const pastedCode = digitsOnly.slice(0, 6).split('');
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);

      // Auto-verify immediately when complete
      const lastIndex = Math.min(index + pastedCode.length, 5);
      if (lastIndex === 5 && newCode.every(c => c !== '')) {
        setTimeout(() => handleVerify(newCode.join('')), 300);
      } else {
        inputRefs.current[lastIndex]?.focus();
      }
    } else {
      // Handle single digit
      const newCode = [...code];
      newCode[index] = digitsOnly;
      setCode(newCode);

      // Auto-move to next input
      if (digitsOnly && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-verify when all 6 digits entered
      if (index === 5 && digitsOnly && newCode.every(c => c !== '')) {
        setTimeout(() => handleVerify(newCode.join('')), 300);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode: string) => {
    // Require a complete 6-digit numeric code
    if (fullCode.length === 6 && /^[0-9]{6}$/.test(fullCode)) {
      light();
      try {
        // Complete authentication
        await login(phoneOrEmail, fullCode);

        // Pick the display currency from the country the guest signed in with
        // (e.g. an Indian +91 number -> INR; everyone else defaults to USD).
        if (countryCode) {
          setCurrencyByCountry(String(countryCode));
        } else if (dialCode) {
          setCurrencyByDialCode(String(dialCode));
        }

        // Navigate back to where the user came from or to main
        if (returnAction) {
          returnAction();
        } else {
          navigation.navigate('Main');
        }
      } catch (err) {
        setError(true);
        Alert.alert('Error', 'Failed to verify code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } else {
      setError(true);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = () => {
    // Simulate resend - clear, reset error and refocus
    light();
    setError(false);
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1582610116397-edb318620f90?w=1400&q=80' }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <LinearGradient
        colors={['rgba(13,148,136,0.25)', 'rgba(15,23,42,0.35)', 'rgba(99,102,241,0.35)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill as any}
      />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.otpCard}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Lock badge */}
            <LinearGradient
              colors={STAYON_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.lockBadge}
            >
              <Ionicons name="shield-checkmark" size={26} color="#fff" />
            </LinearGradient>

            {/* Title */}
            <Text style={styles.title}>Verify it's you</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.codeHighlight}>{phoneOrEmail}</Text>
            </Text>

            {/* OTP Input */}
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.codeInput,
                    digit && styles.codeInputFilled,
                    focusedIndex === index && styles.codeInputFocused,
                    error && styles.codeInputError,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  placeholderTextColor="#CBD5E1"
                  accessibilityLabel={`Verification code digit ${index + 1}`}
                />
              ))}
            </View>

            {error && (
              <Text style={styles.errorText}>
                Enter the complete 6-digit code
              </Text>
            )}

            {/* Resend */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive it? </Text>
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Request new code</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

function makeStyles(height: number) {
  return StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: height * 0.06,
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  otpCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl + spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.35,
        shadowRadius: 48,
      },
      android: { elevation: 24 },
      default: { boxShadow: '0 24px 60px rgba(15,23,42,0.35)' } as any,
    }),
  },
  content: {
    alignItems: 'center',
  },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#0D9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 8 },
      default: { boxShadow: '0 8px 20px rgba(13,148,136,0.4)' } as any,
    }),
  },
  title: {
    fontSize: 30,
    ...fonts.bold,
    color: '#1E1B4B',
    marginBottom: spacing.md,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    ...fonts.medium,
    color: '#64748B',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
    textAlign: 'center',
  },
  codeHighlight: {
    ...fonts.bold,
    color: '#0D9488',
    fontSize: 18,
    letterSpacing: 3,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  codeInput: {
    width: 40,
    height: 56,
    borderBottomWidth: 2.5,
    borderColor: '#CBD5E1',
    fontSize: 30,
    ...fonts.bold,
    color: '#1E1B4B',
    textAlign: 'center',
    backgroundColor: 'transparent',
    paddingBottom: 4,
  },
  codeInputFilled: {
    borderColor: '#14B8A6',
  },
  codeInputFocused: {
    borderColor: '#0D9488',
    borderBottomWidth: 3,
  },
  codeInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    ...fonts.medium,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    fontSize: 15,
    ...fonts.medium,
    color: '#64748B',
  },
  resendLink: {
    fontSize: 15,
    ...fonts.bold,
    color: '#0D9488',
    textDecorationLine: 'underline',
  },
  });
}
