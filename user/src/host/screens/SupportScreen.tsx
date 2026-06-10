import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';

const FAQS: { q: string; a: string }[] = [
  { q: 'How much does StayOn charge me?', a: 'Nothing. StayOn charges 0% platform fee to both hosts and guests. You keep your full nightly rate and cleaning fee — only government taxes pass through.' },
  { q: 'When do I get paid?', a: 'Payouts are released 24 hours after your guest checks in, sent to your default payout method. Set this up under Profile → Payout method.' },
  { q: 'Can I change my stay’s location?', a: 'No. A stay’s address is fixed once created, since it’s tied to verification and guest trust. Everything else — price, photos, amenities, rules — stays fully editable.' },
  { q: 'How does identity verification work?', a: 'You submit your legal name and a government ID once. After it’s verified it’s locked and can’t be edited. Your documents are encrypted and never shared with guests.' },
  { q: 'What if a guest damages my place?', a: 'Use Checkout → Report damage to document it with photos and a note. Since StayOn takes 0%, any agreed reimbursement is settled directly between you and the guest.' },
  { q: 'How do I accept or decline a request?', a: 'Open the request from Reservations or Today, then Accept or Decline. Instant‑book stays are confirmed automatically based on your rules.' },
];

export function SupportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState<number | null>(0);

  const contact = [
    { icon: 'chatbubbles-outline', title: 'Chat with support', sub: 'Typically replies in a few minutes', onPress: () => navigation.navigate('HostAssistant') },
    { icon: 'mail-outline', title: 'Email us', sub: 'support@stayon.app', onPress: () => Linking.openURL('mailto:support@stayon.app').catch(() => {}) },
    { icon: 'book-outline', title: 'Hosting resources', sub: 'Guides to host like a pro', onPress: () => navigation.navigate('Resources') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Help & support" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>

        {/* Contact options */}
        {contact.map((c) => (
          <TouchableOpacity key={c.title} style={styles.contactRow} onPress={() => { light(); c.onPress(); }}>
            <View style={[styles.contactIcon, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name={c.icon as any} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactTitle}>{c.title}</Text>
              <Text style={styles.contactSub}>{c.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}

        {/* FAQ */}
        <Text style={styles.section}>Frequently asked</Text>
        <View style={styles.faqCard}>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <View key={i} style={[i < FAQS.length - 1 && styles.faqDivider]}>
                <TouchableOpacity style={styles.faqQ} onPress={() => { light(); setOpen(isOpen ? null : i); }}>
                  <Text style={styles.faqQText}>{f.q}</Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>
                {isOpen && <Text style={styles.faqA}>{f.a}</Text>}
              </View>
            );
          })}
        </View>

        <View style={styles.feeNote}>
          <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
          <Text style={styles.feeNoteText}>StayOn is 0% fee for hosts and guests — always.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.sm },
    contactIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    contactTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    contactSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    faqCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base },
    faqDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    faqQ: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.base },
    faqQText: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    faqA: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 22, paddingBottom: spacing.base, ...fonts.regular },
    feeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.xl, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.2) },
    feeNoteText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.semiBold },
  });

export default SupportScreen;
