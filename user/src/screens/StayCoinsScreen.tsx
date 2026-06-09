import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { spacing, borderRadius, fontSizes, fonts } from '../constants';

const TIER_DATA = [
  { name: 'Explorer', icon: 'medal-outline', rate: '5%', min: 0, max: 499 },
  { name: 'Wanderer', icon: 'ribbon-outline', rate: '7%', min: 500, max: 999 },
  { name: 'Gold', icon: 'trophy-outline', rate: '10%', min: 1000, max: 1999, current: true },
  { name: 'Platinum', icon: 'diamond-outline', rate: '15%', min: 2000, max: Infinity },
];

const HISTORY = [
  { id: '1', action: 'Booked Manhattan Loft', coins: 100, date: 'May 15', type: 'earn' },
  { id: '2', action: 'Left a review', coins: 25, date: 'May 14', type: 'earn' },
  { id: '3', action: 'Referred a friend', coins: 200, date: 'May 10', type: 'earn' },
  { id: '4', action: 'Redeemed — $250 off', coins: -500, date: 'Apr 28', type: 'redeem' },
  { id: '5', action: 'Booked Miami Studio', coins: 80, date: 'Apr 20', type: 'earn' },
];

const REWARDS = [
  { id: '1', label: '$50 off next booking', cost: 100, icon: 'ticket-outline' },
  { id: '2', label: '$250 off any stay', cost: 500, icon: 'pricetag-outline' },
  { id: '3', label: 'Free night (select)', cost: 1000, icon: 'moon-outline' },
  { id: '4', label: 'Premium upgrade', cost: 2000, icon: 'arrow-up-circle-outline' },
];

const EARN_METHODS = [
  { icon: 'home-outline', label: 'Book a stay', coins: '+100' },
  { icon: 'star-outline', label: 'Leave review', coins: '+25' },
  { icon: 'people-outline', label: 'Refer friend', coins: '+200' },
  { icon: 'camera-outline', label: 'Share stay', coins: '+10' },
];

const USER_COINS = 1247;
const CURRENT_TIER = TIER_DATA[2]; // Gold
const NEXT_TIER = TIER_DATA[3];
const PROGRESS = (USER_COINS - CURRENT_TIER.min) / (NEXT_TIER.min - CURRENT_TIER.min);

export function StayCoinsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>StayCoins</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <LinearGradient
          colors={[colors.primary, colors.gradientEnd]}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>{USER_COINS.toLocaleString()}</Text>
            <Text style={styles.coinUnit}>StayCoins</Text>
          </View>
          <View style={styles.tierBadgeRow}>
            <Ionicons name={CURRENT_TIER.icon as any} size={16} color="#fff" />
            <Text style={styles.tierBadge}>{CURRENT_TIER.name} Member</Text>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${PROGRESS * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {NEXT_TIER.min - USER_COINS} more to reach {NEXT_TIER.name}
            </Text>
          </View>
        </LinearGradient>

        {/* Tiers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tier Benefits</Text>
          {TIER_DATA.map((tier) => (
            <View
              key={tier.name}
              style={[
                styles.tierRow,
                { borderColor: colors.borderLight, backgroundColor: colors.card },
                tier.current && { borderColor: colors.gold, borderWidth: 2 },
              ]}
            >
              <Ionicons name={tier.icon as any} size={22} color={tier.current ? colors.gold : colors.textSecondary} style={{ marginRight: 10 }} />
              <View style={styles.tierInfo}>
                <Text style={[styles.tierName, { color: colors.textPrimary }]}>
                  {tier.name} {tier.current ? '· You' : ''}
                </Text>
                <Text style={[styles.tierRange, { color: colors.textSecondary }]}>
                  {tier.min.toLocaleString()}+ coins
                </Text>
              </View>
              <Text style={[styles.tierRate, { color: colors.primary }]}>{tier.rate} earn rate</Text>
            </View>
          ))}
        </View>

        {/* How to earn */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>How to Earn</Text>
          <View style={styles.earnGrid}>
            {EARN_METHODS.map((item) => (
              <View key={item.label} style={[styles.earnCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <Ionicons name={item.icon as any} size={24} color={colors.primary} />
                <Text style={[styles.earnLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                <Text style={[styles.earnCoins, { color: colors.primary }]}>{item.coins}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Redeem */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Redeem Coins</Text>
          {REWARDS.map((r) => (
            <View key={r.id} style={[styles.rewardRow, { borderColor: colors.borderLight, backgroundColor: colors.card }]}>
              <Ionicons name={r.icon as any} size={22} color={colors.primary} style={{ marginRight: 12 }} />
              <View style={styles.rewardInfo}>
                <Text style={[styles.rewardLabel, { color: colors.textPrimary }]}>{r.label}</Text>
                <Text style={[styles.rewardCost, { color: colors.textSecondary }]}>{r.cost} coins</Text>
              </View>
              <TouchableOpacity activeOpacity={0.9} style={styles.redeemBtnWrap}>
                <LinearGradient
                  colors={USER_COINS >= r.cost ? STAYON_GRADIENT : [colors.primaryUltraLight, colors.primaryUltraLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.redeemBtn}
                >
                  <Text style={[styles.redeemText, { color: USER_COINS >= r.cost ? '#fff' : colors.primary }]}>
                    Redeem
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* History */}
        <View style={[styles.section, { marginBottom: spacing['2xl'] }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>History</Text>
          {HISTORY.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <View style={[
                styles.historyDot,
                { backgroundColor: h.type === 'earn' ? colors.success : colors.secondary },
              ]} />
              <View style={styles.historyInfo}>
                <Text style={[styles.historyAction, { color: colors.textPrimary }]}>{h.action}</Text>
                <Text style={[styles.historyDate, { color: colors.textTertiary }]}>{h.date}</Text>
              </View>
              <Text style={[
                styles.historyCoins,
                { color: h.type === 'earn' ? colors.success : colors.error },
              ]}>
                {h.type === 'earn' ? '+' : ''}{h.coins}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerTitle: { fontSize: fontSizes.lg, ...fonts.bold },
    balanceCard: {
      margin: spacing.lg,
      borderRadius: borderRadius['2xl'],
      padding: spacing.xl,
    },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: fontSizes.sm, ...fonts.semiBold },
    balanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
    balanceAmount: { color: '#fff', fontSize: 48, ...fonts.bold, lineHeight: 52 },
    coinIcon: { fontSize: 28, marginBottom: spacing.xs },
    coinUnit: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.md, ...fonts.semiBold, marginBottom: 6 },
    tierBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
    tierBadge: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, ...fonts.semiBold },
    progressWrap: { marginTop: spacing.base, gap: 6 },
    progressTrack: {
      height: 4,
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: 2,
    },
    progressFill: {
      height: 4,
      backgroundColor: '#fff',
      borderRadius: 2,
    },
    progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: fontSizes.sm },
    section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
    sectionTitle: { fontSize: fontSizes.lg, ...fonts.bold, marginBottom: spacing.md },
    tierRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      gap: spacing.sm,
    },
    tierIcon: { fontSize: 20 },
    tierInfo: { flex: 1 },
    tierName: { fontSize: fontSizes.sm, ...fonts.bold },
    tierRange: { fontSize: fontSizes.sm, marginTop: 1 },
    tierRate: { fontSize: fontSizes.sm, ...fonts.bold },
    earnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    earnCard: {
      width: '47%',
      borderRadius: borderRadius.lg,
      padding: spacing.base,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
    },
    earnEmoji: { fontSize: 24 },
    earnLabel: { fontSize: fontSizes.sm, ...fonts.semiBold, textAlign: 'center' },
    earnCoins: { fontSize: fontSizes.sm, ...fonts.bold },
    rewardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.md,
      padding: spacing.base,
      marginBottom: spacing.sm,
      borderWidth: 1,
      gap: spacing.md,
    },
    rewardIcon: { fontSize: 22 },
    rewardInfo: { flex: 1 },
    rewardLabel: { fontSize: fontSizes.sm, ...fonts.semiBold },
    rewardCost: { fontSize: fontSizes.sm, marginTop: 2 },
    redeemBtnWrap: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    redeemBtn: {
      paddingHorizontal: spacing.base,
      paddingVertical: 7,
      borderRadius: borderRadius.md,
    },
    redeemText: { fontSize: fontSizes.sm, ...fonts.bold },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    historyDot: { width: 8, height: 8, borderRadius: 4 },
    historyInfo: { flex: 1 },
    historyAction: { fontSize: fontSizes.sm, ...fonts.medium },
    historyDate: { fontSize: fontSizes.sm, marginTop: 1 },
    historyCoins: { fontSize: fontSizes.sm, ...fonts.bold },
  });
}
