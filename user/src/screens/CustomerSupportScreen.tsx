import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { spacing, fontSizes, fonts, borderRadius } from '../constants';

const FAQS = [
  {
    id: '1', category: 'Booking',
    q: 'How do I cancel my booking?',
    a: 'Go to Trips → select your booking → tap "Cancel reservation". Refunds depend on the cancellation policy selected at booking time. Free cancellations are available if canceled 5+ days before check-in.',
  },
  {
    id: '2', category: 'Booking',
    q: 'Can I modify my booking dates?',
    a: 'Yes! In the Trips section, select your upcoming booking and tap "Modify reservation". Date changes are subject to availability and may affect pricing.',
  },
  {
    id: '3', category: 'Payment',
    q: 'When will I be charged?',
    a: 'For most bookings, you\'re charged at the time of confirmation. Some properties may allow a split payment — 50% at booking and 50% closer to check-in.',
  },
  {
    id: '4', category: 'Payment',
    q: 'How do refunds work?',
    a: 'Refunds are processed to your original payment method within 5–10 business days, depending on your bank. StayCoins refunds are instant.',
  },
  {
    id: '5', category: 'Property',
    q: 'What if the property looks different from photos?',
    a: 'If a property is significantly different from its description, contact us within 24 hours of check-in. We\'ll work with the host to resolve or rebook you in a comparable property.',
  },
  {
    id: '6', category: 'Property',
    q: 'How do I contact my host?',
    a: 'Use the in-app chat in the Messages tab. You can message your host before and after booking. For urgent issues during your stay, use the Emergency Support option.',
  },
  {
    id: '7', category: 'Account',
    q: 'How do I verify my identity?',
    a: 'Go to Profile → Identity verification → follow the guided process. You\'ll need a government-issued photo ID and a selfie. Verification typically takes under 5 minutes.',
  },
  {
    id: '8', category: 'StayCoins',
    q: 'How do StayCoins work?',
    a: 'You earn StayCoins on every booking, review, referral, and social share. Redeem them for discounts on future stays. Your tier level (Explorer → Platinum) determines your earn rate.',
  },
];

const SUPPORT_OPTIONS = [
  { id: '1', icon: 'chatbubbles-outline', title: 'Live Chat', sub: 'Get help in under 2 minutes', color: '#0D9488', action: 'chat' },
  { id: '2', icon: 'call-outline', title: 'Call Support', sub: '+1 (800) STAY-ON', color: '#0EA5E9', action: 'call' },
  { id: '3', icon: 'mail-outline', title: 'Email Us', sub: 'support@stayon.com', color: '#7C3AED', action: 'email' },
  { id: '4', icon: 'alert-circle-outline', title: 'Emergency Support', sub: '24/7 urgent assistance', color: '#EF4444', action: 'emergency' },
];

export function CustomerSupportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, medium } = useHaptics();
  const [search, setSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Booking', 'Payment', 'Property', 'Account', 'StayCoins'];

  const filtered = FAQS.filter((faq) => {
    const matchCat = activeCategory === 'All' || faq.category === activeCategory;
    const matchSearch = !search || faq.q.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleSupportAction = (action: string) => {
    medium();
    switch (action) {
      case 'call': Linking.openURL('tel:+18007829666'); break;
      case 'email': Linking.openURL('mailto:support@stayon.com?subject=Support Request'); break;
      case 'chat':
      case 'emergency':
        Alert.alert('Connecting...', 'A support agent will be with you shortly.', [{ text: 'OK' }]);
        break;
    }
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Help Center</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.hero}>
          <Ionicons name="headset-outline" size={36} color="#fff" />
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>Available 24/7 · Response in under 2 min</Text>

          <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search FAQs..."
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </LinearGradient>

        {/* Contact options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact Us</Text>
          <View style={styles.supportGrid}>
            {SUPPORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.supportCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
                onPress={() => handleSupportAction(opt.action)}
                activeOpacity={0.85}
              >
                <View style={[styles.supportIcon, { backgroundColor: opt.color + '18' }]}>
                  <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                </View>
                <Text style={[styles.supportTitle, { color: colors.textPrimary }]}>{opt.title}</Text>
                <Text style={[styles.supportSub, { color: colors.textSecondary }]}>{opt.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Frequently Asked Questions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  { backgroundColor: activeCategory === cat ? colors.primary : colors.backgroundSecondary },
                ]}
                onPress={() => { light(); setActiveCategory(cat); }}
              >
                <Text style={[styles.catText, { color: activeCategory === cat ? '#fff' : colors.textSecondary }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filtered.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
              onPress={() => { light(); setExpandedFaq(expandedFaq === faq.id ? null : faq.id); }}
              activeOpacity={0.85}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{faq.q}</Text>
                <Ionicons
                  name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textTertiary}
                />
              </View>
              {expandedFaq === faq.id && (
                <Text style={[styles.faqA, { color: colors.textSecondary }]}>{faq.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick links */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Links</Text>
          {[
            { icon: 'construct-outline', label: 'Resolution Center', color: colors.primary, action: () => navigation.navigate('ResolutionCenter') },
            { icon: 'document-text-outline', label: 'Terms of Service', color: colors.primary, action: () => light() },
            { icon: 'lock-closed-outline', label: 'Privacy Policy', color: colors.primary, action: () => light() },
            { icon: 'shield-outline', label: 'Safety Center', color: colors.primary, action: () => light() },
            { icon: 'flag-outline', label: 'Report a Problem', color: colors.error, action: () => navigation.navigate('ResolutionCenter') },
          ].map((link) => (
            <TouchableOpacity
              key={link.label}
              style={[styles.linkRow, { borderBottomColor: colors.borderLight }]}
              onPress={link.action}
            >
              <Ionicons name={link.icon as any} size={20} color={link.color} />
              <Text style={[styles.linkText, { color: colors.textPrimary }]}>{link.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>StayOn v1.0.0 · support.stayon.com</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    title: { fontSize: fontSizes['2xl'], ...fonts.bold, letterSpacing: -0.5 },
    hero: { padding: spacing.xl, paddingBottom: spacing['2xl'], alignItems: 'center', gap: spacing.sm },
    heroTitle: { color: '#fff', fontSize: fontSizes['2xl'], ...fonts.bold },
    heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginTop: spacing.md, borderRadius: borderRadius['2xl'],
      paddingHorizontal: spacing.base, paddingVertical: spacing.sm, width: '100%',
    },
    searchInput: { flex: 1, fontSize: fontSizes.base },
    section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, marginBottom: spacing.sm },
    sectionTitle: { fontSize: fontSizes.lg, ...fonts.semiBold, marginBottom: 14 },
    supportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    supportCard: {
      width: '47%', borderRadius: borderRadius.lg, padding: 14, gap: 6,
      borderWidth: 1,
    },
    supportIcon: { width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    supportTitle: { fontSize: fontSizes.md, ...fonts.bold },
    supportSub: { fontSize: fontSizes.xs },
    catScroll: { gap: spacing.sm, paddingBottom: spacing.md },
    catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.xl },
    catText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    faqCard: { borderRadius: borderRadius.md, padding: 14, borderWidth: 1, marginBottom: spacing.sm },
    faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    faqQ: { fontSize: fontSizes.md, ...fonts.semiBold, flex: 1, paddingRight: spacing.sm },
    faqA: { fontSize: fontSizes.sm, lineHeight: 20, marginTop: spacing.sm },
    linkRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingVertical: 14, borderBottomWidth: 1,
    },
    linkText: { flex: 1, fontSize: fontSizes.base },
    version: { textAlign: 'center', fontSize: fontSizes.xs, paddingBottom: spacing['2xl'] },
  });
}
