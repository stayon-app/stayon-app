import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AccountCreationScreenProps {
  onAccountCreated?: () => void;
  onBack?: () => void;
  navigation?: any;
  route?: any;
}

export const AccountCreationScreen: React.FC<AccountCreationScreenProps> = ({
  onAccountCreated,
  onBack,
}) => {
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState<string>('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { colors } = useTheme();
  const { light } = useHaptics();
  const { height } = useWindowDimensions();
  const styles = makeStyles(colors, height);

  // Per-field validity
  const firstNameValid = firstName.trim().length > 0;
  const surnameValid = surname.trim().length > 0;
  const emailValid = EMAIL_RE.test(email.trim());

  const markTouched = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const errors = {
    firstName: touched.firstName && !firstNameValid ? 'First name is required' : '',
    surname: touched.surname && !surnameValid ? 'Surname is required' : '',
    email: touched.email && !emailValid ? 'Enter a valid email' : '',
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
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
  }, []);

  const isFormValid = firstNameValid && surnameValid && emailValid;

  const handleSubmit = () => {
    if (!isFormValid) {
      setTouched({ firstName: true, surname: true, email: true });
      return;
    }
    light();
    onAccountCreated?.();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Title */}
          <Text style={styles.title}>Begin Your Journey</Text>
          <Text style={styles.subtitle}>
            Craft your story, unlock extraordinary stays
          </Text>

          {/* Legal Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Legal name</Text>
            
            <View
              style={[
                styles.inputContainer,
                focusedField === 'firstName' && styles.inputContainerFocused,
                errors.firstName !== '' && styles.inputContainerError,
                focusedField !== 'firstName' && touched.firstName && firstNameValid && styles.inputContainerValid,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={colors.textTertiary}
                value={firstName}
                onChangeText={setFirstName}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => { setFocusedField(''); markTouched('firstName'); }}
                autoCapitalize="words"
                accessibilityLabel="First name"
              />
              {focusedField !== 'firstName' && touched.firstName && firstNameValid && (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.validIcon} />
              )}
            </View>
            {errors.firstName !== '' && <Text style={styles.errorText}>{errors.firstName}</Text>}

            <View
              style={[
                styles.inputContainer,
                focusedField === 'surname' && styles.inputContainerFocused,
                errors.surname !== '' && styles.inputContainerError,
                focusedField !== 'surname' && touched.surname && surnameValid && styles.inputContainerValid,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Surname"
                placeholderTextColor={colors.textTertiary}
                value={surname}
                onChangeText={setSurname}
                onFocus={() => setFocusedField('surname')}
                onBlur={() => { setFocusedField(''); markTouched('surname'); }}
                autoCapitalize="words"
                accessibilityLabel="Surname"
              />
              {focusedField !== 'surname' && touched.surname && surnameValid && (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.validIcon} />
              )}
            </View>
            {errors.surname !== '' && <Text style={styles.errorText}>{errors.surname}</Text>}

            <Text style={styles.helperText}>
              Ensure it matches your official ID for seamless booking experiences.
            </Text>
          </View>

          {/* Date of Birth */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date of birth</Text>
            
            <TouchableOpacity
              style={[
                styles.inputContainer,
                styles.dateInput,
                focusedField === 'dob' && styles.inputContainerFocused,
              ]}
              onPress={() => {
                // Set dummy date for testing
                setDateOfBirth('10/12/2001');
              }}
            >
              <Text
                style={[
                  styles.dateText,
                  !dateOfBirth && styles.datePlaceholder,
                ]}
              >
                {dateOfBirth || 'Select a date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Email */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Email</Text>
            
            <View
              style={[
                styles.inputContainer,
                focusedField === 'email' && styles.inputContainerFocused,
                errors.email !== '' && styles.inputContainerError,
                focusedField !== 'email' && touched.email && emailValid && styles.inputContainerValid,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => { setFocusedField(''); markTouched('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email"
              />
              {focusedField !== 'email' && touched.email && emailValid && (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.validIcon} />
              )}
            </View>
            {errors.email !== '' && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={styles.helperText}>
              Stay perfectly informed with exclusive updates
            </Text>
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            By selecting <Text style={styles.termsLink}>Agree and continue</Text>, I
            agree to StayOn's{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>,{' '}
            <Text style={styles.termsLink}>Payments Terms of Service</Text>, and{' '}
            <Text style={styles.termsLink}>Nondiscrimination Policy</Text>, and
            acknowledge the <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={!isFormValid}
            accessibilityLabel="Agree and continue"
            accessibilityState={{ disabled: !isFormValid }}
          >
            <LinearGradient
              colors={STAYON_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
            >
              <Text style={styles.submitButtonText}>Agree and continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function makeStyles(colors: any, height: number) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: height * 0.05,
    paddingBottom: spacing.base,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  content: {
    paddingTop: spacing.base,
  },
  title: {
    fontSize: 28,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionLabel: {
    fontSize: 15,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputContainerError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  inputContainerValid: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  input: {
    fontSize: 16,
    ...fonts.regular,
    color: colors.textPrimary,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    paddingRight: spacing.base + 28,
    minHeight: 56,
  },
  validIcon: {
    position: 'absolute',
    right: spacing.base,
    top: 18,
  },
  errorText: {
    fontSize: 13,
    ...fonts.medium,
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    minHeight: 56,
  },
  dateText: {
    fontSize: 16,
    ...fonts.regular,
    color: colors.textPrimary,
  },
  datePlaceholder: {
    color: colors.textTertiary,
  },
  helperText: {
    fontSize: 13,
    ...fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  termsText: {
    fontSize: 13,
    ...fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  termsLink: {
    ...fonts.semiBold,
    color: colors.textPrimary,
    textDecorationLine: 'underline',
  },
  submitButton: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: colors.backgroundTertiary,
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  submitButtonText: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textInverse,
    letterSpacing: 0.2,
  },
  });
}
