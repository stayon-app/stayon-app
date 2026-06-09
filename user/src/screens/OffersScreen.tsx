import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { Emoji3D } from '../components/Emoji3D';
import { spacing, borderRadius, fontSizes, fonts } from '../constants';

const CLAIMED_KEY = '@stayon_offers_claimed';

type Offer = {
  id: string;
  title: string;
  description: string;
  badge: string;
  urgency: string;
  image: string;
};

// StayOn is premium & fee-free — there are NO running sales. The only StayOn
// discounts are your FIRST booking (15%) and a REFERRAL booking (10%). Every
// other saving comes directly from a host on their own listing.
const OFFERS: Offer[] = [
  {
    id: 'first15',
    title: '15% off your first booking',
    description: 'New to StayOn? Take 15% off your very first stay — anywhere, any host. It’s applied automatically at checkout. One‑time welcome.',
    badge: '15% OFF',
    urgency: 'Welcome · first booking only',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop',
  },
  {
    id: 'referral10',
    title: '10% off with a referral',
    description: 'Joined through a friend’s invite link? Your referral booking gets 10% off, automatically. Share your own link to pass it on.',
    badge: '10% OFF',
    urgency: 'Referral booking only',
    image: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=600&h=400&fit=crop',
  },
];

export const OffersScreen: React.FC<any> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [claimed, setClaimed] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CLAIMED_KEY).then((v) => {
      if (v) {
        try {
          const parsed = JSON.parse(v);
          if (Array.isArray(parsed)) setClaimed(parsed);
        } catch { /* ignore corrupt value */ }
      }
    });
  }, []);

  const toggleClaim = async (id: string) => {
    setClaimed((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem(CLAIMED_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Offers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['4xl'], paddingHorizontal: spacing.lg }}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          StayOn is premium and fee‑free — we don’t run constant sales. There are just two StayOn discounts: your first booking and a referral. Everything else comes straight from hosts.
        </Text>

        {OFFERS.map((offer) => {
          const isClaimed = claimed.includes(offer.id);
          return (
            <View
              key={offer.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            >
              <View style={styles.imageWrap}>
                <Image source={{ uri: offer.image }} style={styles.image} contentFit="cover" />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{offer.badge}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{offer.title}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {offer.description}
                </Text>

                <View style={styles.urgencyRow}>
                  <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                  <Text style={[styles.urgency, { color: colors.primary }]}>{offer.urgency}</Text>
                </View>

                {isClaimed ? (
                  <View style={[styles.claimedBtn, { borderColor: colors.success }]}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={[styles.claimedText, { color: colors.success }]}>Claimed</Text>
                  </View>
                ) : (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => toggleClaim(offer.id)} style={styles.claimWrap}>
                    <LinearGradient
                      colors={STAYON_GRADIENT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.claimBtn}
                    >
                      <Ionicons name="pricetag" size={16} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.claimText}>Claim deal</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* How discounts work — host-set savings */}
        <View style={[styles.explainer, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.explainerHead}>
            <Emoji3D name="gift" size={22} />
            <Text style={[styles.explainerTitle, { color: colors.textPrimary }]}>Other savings come from hosts</Text>
          </View>
          <Text style={[styles.explainerText, { color: colors.textSecondary }]}>
            Hosts can set their own discounts on a listing — like weekly or monthly stay discounts, or a new‑listing promotion. You’ll see those right on the property’s page when they apply. StayOn never adds a fee, so what the host sets is what you save.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    headerTitle: { fontSize: fontSizes.lg, ...fonts.bold },
    intro: { fontSize: fontSizes.sm, lineHeight: 20, marginTop: spacing.xs, marginBottom: spacing.lg },
    card: {
      borderRadius: borderRadius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.lg,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
        android: { elevation: 2 },
        web: { boxShadow: '0 4px 14px rgba(0,0,0,0.07)' } as any,
      }),
    },
    imageWrap: { position: 'relative' },
    image: { width: '100%', height: 168 },
    badge: {
      position: 'absolute', top: spacing.md, left: spacing.md,
      backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.base,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5 },
        android: { elevation: 4 },
        web: { boxShadow: '0 2px 8px rgba(0,0,0,0.2)' } as any,
      }),
    },
    badgeText: { color: '#222222', fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.3 },
    cardBody: { padding: spacing.base },
    title: { fontSize: fontSizes.md, ...fonts.bold, letterSpacing: -0.3 },
    description: { fontSize: fontSizes.sm, lineHeight: 20, marginTop: spacing.xs },
    urgencyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.md },
    urgency: { fontSize: fontSizes.sm, ...fonts.semiBold },
    claimWrap: {
      borderRadius: borderRadius.lg, overflow: 'hidden', marginTop: spacing.base,
      ...Platform.select({
        ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12 },
        android: { elevation: 6 },
        web: { boxShadow: '0 5px 16px rgba(99,102,241,0.3)' } as any,
      }),
    },
    claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
    claimText: { color: '#fff', fontSize: fontSizes.md, fontWeight: '800', letterSpacing: 0.3 },
    claimedBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 13, marginTop: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1.5,
    },
    claimedText: { fontSize: fontSizes.md, ...fonts.bold },
    explainer: { borderRadius: borderRadius.xl, borderWidth: 1, padding: spacing.base, marginTop: spacing.xs },
    explainerHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
    explainerTitle: { fontSize: fontSizes.base, ...fonts.bold },
    explainerText: { fontSize: fontSizes.sm, lineHeight: 20, ...fonts.regular },
  });
}

export default OffersScreen;
