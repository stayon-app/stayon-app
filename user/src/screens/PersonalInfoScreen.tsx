import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { useAuth } from '../contexts';
import { spacing, fontSizes, fonts, borderRadius } from '../constants';

interface Field {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  icon: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate a draft value for a given field. Returns an error string or '' when valid.
const validateField = (id: string, value: string): string => {
  const v = value.trim();
  switch (id) {
    case 'name':
      return v.length > 0 ? '' : 'Name is required';
    case 'email':
      if (!v) return 'Email is required';
      return EMAIL_RE.test(v) ? '' : 'Enter a valid email';
    case 'phone': {
      if (!v) return ''; // optional
      const digits = v.replace(/[^0-9]/g, '');
      return digits.length >= 7 && digits.length <= 15 ? '' : 'Enter a valid phone number';
    }
    default:
      return ''; // address / emergency are free-form
  }
};

export function PersonalInfoScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, success } = useHaptics();
  const { user } = useAuth();

  const [fields, setFields] = useState<Field[]>([
    { id: 'name', label: 'Full name', value: user?.name || '', placeholder: 'Add your name', icon: 'person-outline' },
    { id: 'email', label: 'Email', value: user?.email || '', placeholder: 'Add your email', icon: 'mail-outline', keyboardType: 'email-address' },
    { id: 'phone', label: 'Phone number', value: '', placeholder: 'Add a phone number', icon: 'call-outline', keyboardType: 'phone-pad' },
    { id: 'address', label: 'Address', value: '', placeholder: 'Add your address', icon: 'location-outline' },
    { id: 'emergency', label: 'Emergency contact', value: '', placeholder: 'Add name & number', icon: 'medkit-outline' },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftTouched, setDraftTouched] = useState(false);
  const [draftFocused, setDraftFocused] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const draftError = editingId ? validateField(editingId, draft) : '';
  const draftValid = draftError === '';

  const startEdit = (field: Field) => {
    light();
    setEditingId(field.id);
    setDraft(field.value);
    setDraftTouched(false);
    setSavedId(null);
  };

  const saveEdit = (id: string) => {
    const err = validateField(id, draft);
    if (err !== '') {
      setDraftTouched(true);
      return;
    }
    success();
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, value: draft } : f));
    setEditingId(null);
    setDraftFocused(false);
    // Brief "Saved" confirmation on the field
    setSavedId(id);
    setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000);
  };

  const styles = makeStyles(colors);
  const initials = ((fields[0]?.value || 'U').trim().split(/\s+/).map((w) => (w ? w[0] : '')).join('').slice(0, 2).toUpperCase()) || 'U';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Personal Information</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <TouchableOpacity style={[styles.changePhotoBtn, { borderColor: colors.primary }]} onPress={() => light()} accessibilityLabel="Change photo" accessibilityRole="button">
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change photo</Text>
            </TouchableOpacity>
          </View>

          {/* Verification badge */}
          <TouchableOpacity
            style={[styles.verifyBanner, { backgroundColor: colors.primarySubtle }]}
            onPress={() => navigation.navigate('IdentityVerification')}
          >
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.verifyTitle, { color: colors.textPrimary }]}>Identity verification</Text>
              <Text style={[styles.verifySub, { color: colors.textSecondary }]}>1 of 4 steps complete</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>

          {/* Fields */}
          <View style={styles.fields}>
            {fields.map((field) => {
              const isEditing = editingId === field.id;
              const showFieldError = isEditing && draftTouched && !draftValid;
              const borderColor = showFieldError
                ? colors.error
                : isEditing
                  ? colors.primary
                  : colors.borderLight;
              return (
              <View key={field.id} style={[styles.fieldCard, { backgroundColor: colors.card, borderColor }]}>
                <View style={[styles.fieldIcon, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name={field.icon as any} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                    {savedId === field.id && (
                      <View style={styles.savedBadge}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                        <Text style={[styles.savedText, { color: colors.success }]}>Saved</Text>
                      </View>
                    )}
                  </View>
                  {isEditing ? (
                    <>
                      <TextInput
                        style={[styles.fieldInput, {
                          color: colors.textPrimary,
                          borderBottomColor: showFieldError
                            ? colors.error
                            : draftFocused
                              ? colors.primary
                              : colors.borderLight,
                        }]}
                        value={draft}
                        onChangeText={(t) => { setDraft(t); if (!draftTouched) setDraftTouched(true); }}
                        onFocus={() => setDraftFocused(true)}
                        onBlur={() => { setDraftFocused(false); setDraftTouched(true); }}
                        placeholder={field.placeholder}
                        placeholderTextColor={colors.textTertiary}
                        keyboardType={field.keyboardType || 'default'}
                        autoFocus
                        accessibilityLabel={`Edit ${field.label}`}
                      />
                      {showFieldError && (
                        <Text style={[styles.fieldErrorText, { color: colors.error }]}>{draftError}</Text>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.fieldValue, { color: field.value ? colors.textPrimary : colors.textTertiary }]}>{field.value || field.placeholder}</Text>
                  )}
                </View>
                {isEditing ? (
                  <TouchableOpacity
                    onPress={() => saveEdit(field.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    disabled={!draftValid}
                    accessibilityLabel={`Save ${field.label}`}
                    accessibilityState={{ disabled: !draftValid }}
                  >
                    <Text style={[styles.editAction, { color: draftValid ? colors.primary : colors.textTertiary }]}>Save</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => startEdit(field)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel={`Edit ${field.label}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.editAction, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
              );
            })}
          </View>

          {/* Travel preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Travel Preferences</Text>
            {[
              { icon: 'globe-outline', label: 'Language', value: 'English (US)' },
              { icon: 'cash-outline', label: 'Currency', value: 'USD ($)' },
              { icon: 'notifications-outline', label: 'Notifications', value: 'All enabled' },
            ].map((pref) => (
              <TouchableOpacity key={pref.label} style={[styles.prefRow, { borderBottomColor: colors.borderLight }]} onPress={() => light()}>
                <Ionicons name={pref.icon as any} size={18} color={colors.primary} />
                <Text style={[styles.prefLabel, { color: colors.textPrimary }]}>{pref.label}</Text>
                <Text style={[styles.prefValue, { color: colors.textSecondary }]}>{pref.value}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Delete account */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => Alert.alert('Delete account?', 'This action is permanent and cannot be undone.', [
              { text: 'Cancel' }, { text: 'Delete', style: 'destructive' },
            ])}
          >
            <Text style={[styles.deleteText, { color: colors.error }]}>Delete account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    title: { fontSize: fontSizes['2xl'], ...fonts.bold, letterSpacing: -0.5 },
    avatarSection: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.md },
    avatar: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: fontSizes['4xl'], ...fonts.bold },
    changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: borderRadius.xl, borderWidth: 1.5 },
    changePhotoText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, padding: 14, borderRadius: borderRadius.md, marginBottom: spacing.lg },
    verifyTitle: { fontSize: fontSizes.md, ...fonts.bold },
    verifySub: { fontSize: fontSizes.xs, marginTop: 1 },
    fields: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg },
    fieldCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: 14, borderRadius: borderRadius.md, borderWidth: 1 },
    fieldIcon: { width: 40, height: 40, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    fieldLabel: { fontSize: fontSizes.xs },
    savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    savedText: { fontSize: fontSizes.xs, ...fonts.semiBold },
    fieldValue: { fontSize: fontSizes.base, ...fonts.semiBold },
    fieldInput: { fontSize: fontSizes.base, ...fonts.semiBold, borderBottomWidth: 1.5, paddingVertical: 2 },
    fieldErrorText: { fontSize: fontSizes.xs, ...fonts.medium, marginTop: 4 },
    editAction: { fontSize: fontSizes.sm, ...fonts.bold },
    section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
    sectionTitle: { fontSize: fontSizes.lg, ...fonts.semiBold, marginBottom: spacing.md },
    prefRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14, borderBottomWidth: 1 },
    prefLabel: { flex: 1, fontSize: fontSizes.base },
    prefValue: { fontSize: fontSizes.base },
    deleteBtn: { alignItems: 'center', paddingVertical: spacing.base },
    deleteText: { fontSize: fontSizes.base, ...fonts.semiBold },
  });
}
