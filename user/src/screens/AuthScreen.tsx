import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ImageBackground,
  Image,
} from 'react-native';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { useHaptics } from '../hooks/useHaptics';
import { CountryPickerModal } from '../components/CountryPickerModal';
import { DEFAULT_COUNTRY, Country, flagImageUrl } from '../constants/countries';

interface AuthScreenProps {
  navigation: any;
  route?: any;
}

type AuthMode = 'phone' | 'email';

const isValidEmail = (raw: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());

// A national number is 6-14 digits (the country dial code is added separately).
const isValidPhone = (raw: string): boolean => {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length >= 6 && digits.length <= 14;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ navigation, route }) => {
  const { height } = useWindowDimensions();
  const styles = makeStyles(height);
  const { light } = useHaptics();
  const [mode, setMode] = useState<AuthMode>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [focusedInput, setFocusedInput] = useState(false);
  const [touched, setTouched] = useState(false);
  const returnAction = route?.params?.returnAction;

  const currentValue = mode === 'phone' ? phone : email;
  const valid = mode === 'phone' ? isValidPhone(phone) : isValidEmail(email);
  const showError = touched && !focusedInput && currentValue.trim().length > 0 && !valid;
  const showValid = valid;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const socialButtonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Delayed social buttons animation
    Animated.timing(socialButtonsAnim, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleContinue = () => {
    if (!valid) {
      setTouched(true);
      return;
    }
    light();
    if (mode === 'phone') {
      const nationalNumber = phone.replace(/[^0-9]/g, '');
      const phoneOrEmail = `${country.dialCode} ${nationalNumber}`;
      navigation.navigate('OTP', {
        phoneOrEmail,
        phone: nationalNumber,
        countryCode: country.code,
        dialCode: country.dialCode,
        returnAction,
      });
    } else {
      navigation.navigate('OTP', {
        phoneOrEmail: email.trim(),
        returnAction,
      });
    }
  };

  const switchMode = (next: AuthMode) => {
    light();
    setMode(next);
    setTouched(false);
    setFocusedInput(false);
  };

  const handleSocialLogin = (provider: string) => {
    // For now, simulate social login by going to OTP
    navigation.navigate('OTP', {
      phoneOrEmail: `${provider}_user`, 
      returnAction 
    });
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginCard}>

        {/* Title Section */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.brandName}>Stay<Text style={styles.brandOn}>On</Text></Text>
          <Text style={styles.tagline}>stay beyond ordinary</Text>
          <Text style={styles.title}>Welcome back</Text>
        </Animated.View>

        {/* Phone/Email Input */}
        <Animated.View
          style={[
            styles.inputSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[
            styles.inputContainer,
            focusedInput && styles.inputContainerFocused,
            showError && styles.inputContainerError,
            !focusedInput && showValid && styles.inputContainerValid,
          ]}>
            {mode === 'phone' && (
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => { light(); setPickerVisible(true); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Country code, ${country.name} ${country.dialCode}. Tap to change`}
              >
                <Image
                  source={{ uri: flagImageUrl(country.code) }}
                  style={styles.countryFlag}
                  resizeMode="cover"
                />
                <Text style={styles.countryDial}>{country.dialCode}</Text>
                <Ionicons name="chevron-down" size={16} color="#64748B" />
              </TouchableOpacity>
            )}

            <TextInput
              style={styles.input}
              placeholder={mode === 'phone' ? 'Phone number' : 'Email address'}
              placeholderTextColor="#94A3B8"
              value={currentValue}
              onChangeText={(t) => {
                if (mode === 'phone') setPhone(t); else setEmail(t);
                if (touched) setTouched(false);
              }}
              onFocus={() => setFocusedInput(true)}
              onBlur={() => { setFocusedInput(false); setTouched(true); }}
              keyboardType={mode === 'phone' ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={mode === 'phone' ? 'Phone number' : 'Email address'}
            />
            {!focusedInput && showValid && (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color="#14B8A6"
                style={styles.inputIcon}
              />
            )}
          </View>

          {showError && (
            <Text style={styles.errorText}>
              {mode === 'phone' ? 'Enter a valid phone number' : 'Enter a valid email address'}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleContinue}
            activeOpacity={0.9}
            disabled={!valid}
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !valid }}
          >
            <LinearGradient
              colors={STAYON_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.continueButton, !valid && styles.continueButtonDisabled]}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            A secure code will arrive shortly
          </Text>

          <TouchableOpacity
            style={styles.modeToggle}
            onPress={() => switchMode(mode === 'phone' ? 'email' : 'phone')}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Ionicons
              name={mode === 'phone' ? 'mail-outline' : 'call-outline'}
              size={16}
              color="#0D9488"
            />
            <Text style={styles.modeToggleText}>
              {mode === 'phone' ? 'Use email instead' : 'Use phone number instead'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Divider */}
        <Animated.View
          style={[
            styles.dividerContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Social Login Buttons */}
        <Animated.View
          style={[
            styles.socialContainer,
            {
              opacity: socialButtonsAnim,
              transform: [
                {
                  translateY: socialButtonsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialLogin('google')}
            activeOpacity={0.8}
            accessibilityLabel="Continue with Google"
          >
            <Ionicons name="logo-google" size={26} color="#EA4335" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialLogin('apple')}
            activeOpacity={0.8}
            accessibilityLabel="Continue with Apple"
          >
            <Ionicons name="logo-apple" size={26} color="#000000" />
          </TouchableOpacity>
        </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>

    <CountryPickerModal
      visible={pickerVisible}
      selectedCode={country.code}
      onSelect={(c) => setCountry(c)}
      onClose={() => setPickerVisible(false)}
    />
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl + spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.18,
        shadowRadius: 40,
      },
      android: { elevation: 18 },
      default: { boxShadow: '0 18px 48px rgba(15,23,42,0.20)' } as any,
    }),
  },
  titleContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  brandName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  brandOn: {
    color: '#06D6B4',
    fontWeight: '800',
  },
  tagline: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    ...fonts.bold,
    color: '#1E1B4B',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    ...fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  inputSection: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E8EE',
    borderRadius: 14,
    marginBottom: spacing.base,
    backgroundColor: '#F7F8FA',
  },
  inputContainerFocused: {
    borderColor: '#14B8A6',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#14B8A6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: { boxShadow: '0 0 0 4px rgba(20,184,166,0.14)' } as any,
    }),
  },
  inputContainerError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  inputContainerValid: {
    borderColor: '#14B8A6',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 16,
    ...fonts.medium,
    color: '#1E1B4B',
    paddingVertical: spacing.base + 4,
    paddingHorizontal: spacing.lg + 4,
    minHeight: 58,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingVertical: spacing.base + 4,
    borderRightWidth: 1,
    borderRightColor: '#E5E8EE',
  },
  countryFlag: {
    width: 26,
    height: 19,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  countryDial: {
    fontSize: 16,
    ...fonts.semiBold,
    color: '#1E1B4B',
  },
  inputIcon: {
    position: 'absolute',
    right: spacing.lg,
    top: 18,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  modeToggleText: {
    fontSize: 14,
    ...fonts.semiBold,
    color: '#0D9488',
    letterSpacing: 0.2,
  },
  errorText: {
    fontSize: 13,
    ...fonts.medium,
    color: '#EF4444',
    marginTop: -spacing.sm,
    marginBottom: spacing.base,
    marginLeft: spacing.xs,
  },
  continueButton: {
    borderRadius: 14,
    paddingVertical: spacing.base + 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: { boxShadow: '0 8px 20px rgba(13,148,136,0.32)' } as any,
    }),
  },
  continueButtonDisabled: {
    backgroundColor: '#CBD5E1',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  continueButtonText: {
    fontSize: 17,
    ...fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  helperText: {
    fontSize: 13,
    ...fonts.medium,
    color: '#14B8A6',
    marginTop: spacing.md,
    lineHeight: 20,
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 12,
    ...fonts.bold,
    color: '#94A3B8',
    marginHorizontal: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base + 2,
    borderWidth: 1,
    borderColor: '#E5E8EE',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  });
}
