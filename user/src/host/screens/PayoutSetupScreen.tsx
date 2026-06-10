import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getPayout, savePayout, clearPayout, getPayoutRequest, requestPayoutChange, cancelPayoutRequest, getIdentity, type Payout, type PayoutKind, type PayoutChangeRequest, type Identity } from '../data/account';
import { Api } from '../../api';

const KINDS: { key: PayoutKind; label: string; icon: any; hint: string }[] = [
  { key: 'bank', label: 'Bank account', icon: 'business-outline', hint: 'Direct deposit to your bank' },
  { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline', hint: 'Instant transfer via UPI ID' },
  { key: 'paypal', label: 'PayPal', icon: 'logo-paypal', hint: 'Receive in your PayPal balance' },
];

export function PayoutSetupScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);

  const [payout, setPayout] = useState<Payout | null>(null);
  const [request, setRequest] = useState<PayoutChangeRequest | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<PayoutKind>('bank');
  const [holder, setHolder] = useState('');
  const [account, setAccount] = useState('');
  const [extra, setExtra] = useState(''); // IFSC / routing

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getPayout().then((p) => { if (active) { setPayout(p); setEditing(!p && !request); } });
      getPayoutRequest().then((r) => { if (active) setRequest(r); });
      getIdentity().then((i) => { if (active) setIdentity(i); });
      return () => { active = false; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // A change to an EXISTING method must be verified by operations first.
  const isChange = !!payout;
  const verified = identity?.status === 'verified';
  const hasPendingReq = request?.status === 'pending';

  const label = (): string => {
    if (kind === 'upi') return account.trim();
    if (kind === 'paypal') return account.trim();
    return `${extra.trim() ? extra.trim().toUpperCase() + ' ' : ''}•••• ${account.trim().slice(-4)}`;
  };

  const canSave = holder.trim().length > 2 && account.trim().length >= (kind === 'bank' ? 4 : 3);

  const submit = async () => {
    if (!canSave) return;
    const p: Payout = { kind, label: label(), holder: holder.trim(), isDefault: true };
    if (isChange) {
      // Changing existing bank details → route through ops verification.
      if (!verified) return; // gated below
      success();
      const r = await requestPayoutChange(p);
      setRequest(r); setEditing(false);
    } else {
      // First-time setup applies directly.
      success();
      await savePayout(p);
      setPayout(p); setEditing(false);
      // Establish a connected payout account on the backend (Stripe/Razorpay/sim)
      // so escrow funds can be transferred to this host.
      try { await Api.auth.ensureSession(); await Api.payoutConnect(); } catch { /* offline */ }
    }
    setHolder(''); setAccount(''); setExtra('');
  };

  const cancelRequest = () => confirmAction({
    title: 'Cancel change request?', message: 'Your current payout method stays as-is.', confirmText: 'Cancel request', destructive: true,
    onConfirm: async () => { await cancelPayoutRequest(); setRequest(null); },
  });

  const remove = () => confirmAction({
    title: 'Remove payout method?', message: 'You won’t receive payouts until you add a new one.', confirmText: 'Remove', destructive: true,
    onConfirm: async () => { await clearPayout(); setPayout(null); setEditing(true); },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Payout method" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>

        {/* Zero-fee highlight */}
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.feeCard}>
          <Ionicons name="cash-outline" size={24} color="#fff" />
          <Text style={styles.feeTitle}>You keep 100%</Text>
          <Text style={styles.feeSub}>StayOn charges no platform fee. Your full nightly rate and cleaning fee are paid out — only taxes pass through.</Text>
        </LinearGradient>

        {/* Pending change request — awaiting ops verification */}
        {hasPendingReq && request && (
          <View style={styles.reqCard}>
            <View style={styles.reqHead}>
              <View style={styles.reqIcon}><Ionicons name="hourglass-outline" size={18} color={colors.warning} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqTitle}>Change request under review</Text>
                <Text style={styles.reqSub}>The StayOn operations team is verifying your identity against the new account.</Text>
              </View>
            </View>
            <View style={styles.reqDetail}>
              <Text style={styles.reqDetailLabel}>Requested</Text>
              <Text style={styles.reqDetailVal}>{request.requested.label}</Text>
              <Text style={styles.reqDetailHolder}>{request.requested.holder}</Text>
            </View>
            <Text style={styles.reqNote}>Until it’s approved, your current method below stays active. You’ll be notified, and it updates here automatically once verified.</Text>
            <TouchableOpacity style={styles.reqCancel} onPress={cancelRequest}>
              <Text style={styles.reqCancelText}>Cancel request</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Saved method */}
        {payout && !editing && (
          <View style={styles.savedCard}>
            <View style={styles.savedTop}>
              <View style={[styles.savedIcon, { backgroundColor: colors.primarySubtle }]}>
                <Ionicons name={KINDS.find((k) => k.key === payout.kind)?.icon ?? 'card-outline'} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedLabel}>{payout.label}</Text>
                <Text style={styles.savedHolder}>{payout.holder}</Text>
              </View>
              <View style={styles.defaultPill}><Text style={styles.defaultText}>Active</Text></View>
            </View>
            {!hasPendingReq && (
              <View style={styles.savedActions}>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => { light(); setKind(payout.kind as PayoutKind); setEditing(true); }}>
                  <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
                  <Text style={styles.outlineText}>Request change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeBtn} onPress={remove}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Editor */}
        {editing && (
          <>
            {isChange && (
              <View style={styles.changeBanner}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text style={styles.changeBannerText}>For your security, changes to payout details are verified by the StayOn operations team before they take effect.</Text>
              </View>
            )}

            {isChange && !verified && (
              <View style={styles.gateCard}>
                <Ionicons name="alert-circle-outline" size={22} color={colors.warning} />
                <Text style={styles.gateTitle}>Verify your identity first</Text>
                <Text style={styles.gateText}>Operations can only approve a payout change once your identity is verified, so it matches the new account holder.</Text>
                <TouchableOpacity style={styles.gateBtn} onPress={() => { light(); navigation.navigate('IdentityVerification'); }}>
                  <Text style={styles.gateBtnText}>Verify identity</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.section}>How would you like to get paid?</Text>
            {KINDS.map((k) => {
              const active = kind === k.key;
              return (
                <TouchableOpacity key={k.key} style={[styles.kindRow, active && styles.kindRowActive]} onPress={() => { light(); setKind(k.key); }}>
                  <View style={[styles.kindIcon, { backgroundColor: active ? colors.primarySubtle : colors.backgroundSecondary }]}>
                    <Ionicons name={k.icon} size={20} color={active ? colors.primary : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.kindLabel, active && { color: colors.primary }]}>{k.label}</Text>
                    <Text style={styles.kindHint}>{k.hint}</Text>
                  </View>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? colors.primary : colors.textTertiary} />
                </TouchableOpacity>
              );
            })}

            <Text style={styles.label}>Account holder name</Text>
            <TextInput style={styles.input} value={holder} onChangeText={setHolder} placeholder="Full name on the account" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.label}>{kind === 'bank' ? 'Account number' : kind === 'upi' ? 'UPI ID' : 'PayPal email'}</Text>
            <TextInput
              style={styles.input} value={account} onChangeText={setAccount}
              placeholder={kind === 'bank' ? 'Account number' : kind === 'upi' ? 'name@bank' : 'you@email.com'}
              placeholderTextColor={colors.textTertiary}
              keyboardType={kind === 'bank' ? 'number-pad' : 'email-address'} autoCapitalize="none"
            />

            {kind === 'bank' && (
              <>
                <Text style={styles.label}>IFSC / routing code</Text>
                <TextInput style={styles.input} value={extra} onChangeText={setExtra} placeholder="e.g. HDFC0001234" placeholderTextColor={colors.textTertiary} autoCapitalize="characters" />
              </>
            )}

            <View style={styles.privacy}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.privacyText}>Payout details are encrypted. Payouts are released 24 hours after each guest checks in.</Text>
            </View>
          </>
        )}
      </ScrollView>

      {editing && (
        <View style={styles.footer}>
          {payout && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { light(); setEditing(false); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} disabled={!canSave || (isChange && !verified)} onPress={submit}>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.submit, (!canSave || (isChange && !verified)) && { opacity: 0.5 }]}>
              <Text style={styles.submitText}>{isChange ? 'Submit for verification' : 'Save payout method'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    feeCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, gap: 4 },
    feeTitle: { fontSize: fontSizes.lg, color: '#fff', marginTop: 4, ...fonts.bold },
    feeSub: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.9)', lineHeight: 19, ...fonts.regular },
    savedCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, padding: spacing.base },
    savedTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    savedIcon: { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    savedLabel: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    savedHolder: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    defaultPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.primarySubtle },
    defaultText: { fontSize: fontSizes.xs, color: colors.primary, ...fonts.bold },
    savedActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base },
    outlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary },
    outlineText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.bold },
    reqCard: { backgroundColor: withOpacity(colors.warning, 0.08), borderWidth: 1, borderColor: withOpacity(colors.warning, 0.3), borderRadius: borderRadius.lg, padding: spacing.base, marginBottom: spacing.md },
    reqHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    reqIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: withOpacity(colors.warning, 0.15), alignItems: 'center', justifyContent: 'center' },
    reqTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    reqSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 18, ...fonts.regular },
    reqDetail: { marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.card },
    reqDetailLabel: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.semiBold },
    reqDetailVal: { fontSize: fontSizes.base, color: colors.textPrimary, marginTop: 2, ...fonts.bold },
    reqDetailHolder: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    reqNote: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: spacing.md, lineHeight: 16, ...fonts.regular },
    reqCancel: { alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.base, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight },
    reqCancelText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.bold },
    changeBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle, marginBottom: spacing.md },
    changeBannerText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 18, ...fonts.medium },
    gateCard: { alignItems: 'center', padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: withOpacity(colors.warning, 0.3), marginBottom: spacing.md, gap: 6 },
    gateTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    gateText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, ...fonts.regular },
    gateBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 999, backgroundColor: colors.primary },
    gateBtnText: { fontSize: fontSizes.sm, color: '#fff', ...fonts.bold },
    removeBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.error },
    removeText: { fontSize: fontSizes.sm, color: colors.error, ...fonts.bold },
    section: { fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.md, ...fonts.bold },
    kindRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card, marginBottom: spacing.sm },
    kindRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    kindIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    kindLabel: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    kindHint: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: 6, ...fonts.semiBold },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    privacy: { flexDirection: 'row', gap: 6, marginTop: spacing.md, alignItems: 'flex-start' },
    privacyText: { flex: 1, fontSize: fontSizes.xs, color: colors.textTertiary, lineHeight: 17, ...fonts.regular },
    footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    cancelBtn: { paddingVertical: spacing.base, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight },
    cancelText: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.bold },
    submit: { paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
  });

export default PayoutSetupScreen;
