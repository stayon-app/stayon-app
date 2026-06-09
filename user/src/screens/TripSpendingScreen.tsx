import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, letterSpacing, spacing, borderRadius } from '../constants';
import { ScreenHeader } from '../components/common';
import { getBookings, type Booking } from '../data/bookings';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const yearOf = (s: string) => { const m = s.match(/(\d{4})/); return m ? Number(m[1]) : 0; };
const dayOf = (s: string) => { const m = s.match(/\b(\d{1,2})\b/); return m ? Number(m[1]) : 1; };
const sortTime = (s: string) => { const mi = MONTHS.indexOf(s.split(' ')[0]); return yearOf(s) * 372 + (mi < 0 ? 0 : mi) * 31 + dayOf(s); };

export const TripSpendingScreen: React.FC<any> = ({ navigation }) => {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [receipt, setReceipt] = useState<Booking | null>(null);

  useFocusEffect(React.useCallback(() => {
    let active = true;
    getBookings().then((b) => { if (active) setBookings(b); });
    return () => { active = false; };
  }, []));

  // Group this user's bookings by month & year (newest first) — receipts only,
  // no running "total spent".
  const groups = useMemo(() => {
    const counted = bookings.filter((b) => b.status !== 'cancelled');
    const out: { key: string; label: string; sort: number; items: Booking[] }[] = [];
    counted.forEach((b) => {
      const mi = MONTHS.indexOf(b.checkIn.split(' ')[0]);
      const y = yearOf(b.checkIn);
      const key = `${y}-${mi}`;
      let g = out.find((x) => x.key === key);
      if (!g) { g = { key, label: `${FULL_MONTHS[mi < 0 ? 0 : mi]} ${y}`, sort: y * 12 + (mi < 0 ? 0 : mi), items: [] }; out.push(g); }
      g.items.push(b);
    });
    out.sort((a, b) => b.sort - a.sort);
    out.forEach((g) => g.items.sort((a, b) => sortTime(b.checkIn) - sortTime(a.checkIn)));
    return out;
  }, [bookings]);

  const totalReceipts = groups.reduce((s, g) => s + g.items.length, 0);

  const shareReceipt = async (b: Booking) => {
    try {
      await Share.share({
        message: `StayOn receipt · ${b.confirmationCode}\n${b.property} — ${b.location}\n${b.checkIn} → ${b.checkOut} · ${b.nights} nights · ${b.guests} guests\n\nStay ${format(b.subtotal)}\nCleaning ${format(b.cleaningFee)}\nTaxes ${format(b.taxes)}\nPlatform fee ${format(0)} (0%)\nTotal ${format(b.total)}`,
      });
    } catch {}
  };

  const Line = ({ label, value, strong, muted }: any) => (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, muted && { color: colors.success }]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineValueStrong, muted && { color: colors.success }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Receipts" subtitle={totalReceipts > 0 ? `${totalReceipts} booking${totalReceipts === 1 ? '' : 's'}` : undefined} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Zero-fee reassurance */}
        <View style={styles.feeNote}>
          <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
          <Text style={styles.feeNoteText}>Every booking receipt — with <Text style={{ ...fonts.bold, color: colors.primary }}>0% platform fee</Text>. You paid only the host’s rate, cleaning and local taxes.</Text>
        </View>

        {totalReceipts === 0 ? (
          <Text style={styles.empty}>No receipts yet. Your booking receipts will appear here once you book a stay.</Text>
        ) : (
          groups.map((g) => (
            <View key={g.key}>
              <Text style={styles.monthHeader}>{g.label}</Text>
              {g.items.map((b) => (
                <TouchableOpacity key={b.id} style={styles.tripCard} activeOpacity={0.85} onPress={() => { light(); setReceipt(b); }}>
                  {b.image ? <Image source={{ uri: b.image }} style={styles.tripImg} /> : <View style={[styles.tripImg, { backgroundColor: colors.backgroundSecondary }]} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripName} numberOfLines={1}>{b.property}</Text>
                    <Text style={styles.tripMeta} numberOfLines={1}>{b.checkIn} · {b.nights} night{b.nights === 1 ? '' : 's'}</Text>
                    <View style={[styles.statusPill, { backgroundColor: b.status === 'upcoming' ? colors.primarySubtle : colors.backgroundSecondary }]}>
                      <Text style={[styles.statusText, { color: b.status === 'upcoming' ? colors.primary : colors.textSecondary }]}>{b.status === 'upcoming' ? 'Upcoming' : 'Completed'}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.tripTotal}>{format(b.total)}</Text>
                    <Text style={styles.tripView}>Receipt ›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Receipt modal */}
      <Modal visible={!!receipt} transparent animationType="slide" onRequestClose={() => setReceipt(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            {receipt && (
              <>
                <Text style={styles.rHead}>Receipt</Text>
                <Text style={styles.rProp}>{receipt.property}</Text>
                <Text style={styles.rLoc}>{receipt.location}</Text>

                <View style={styles.rMetaRow}>
                  <View style={styles.rMeta}><Ionicons name="calendar-outline" size={14} color={colors.textSecondary} /><Text style={styles.rMetaText}>{receipt.checkIn} → {receipt.checkOut}</Text></View>
                  <View style={styles.rMeta}><Ionicons name="people-outline" size={14} color={colors.textSecondary} /><Text style={styles.rMetaText}>{receipt.guests} guest{receipt.guests === 1 ? '' : 's'}</Text></View>
                </View>

                <View style={styles.rDivider} />
                <Line label={`Stay · ${receipt.nights} night${receipt.nights === 1 ? '' : 's'}`} value={format(receipt.subtotal)} />
                <Line label="Cleaning fee" value={format(receipt.cleaningFee)} />
                <Line label="Taxes" value={format(receipt.taxes)} />
                <Line label="Platform fee" value={`${format(0)} · 0%`} muted />
                <View style={styles.rDivider} />
                <Line label="Total paid" value={format(receipt.total)} strong />

                <View style={styles.rFootRow}>
                  <View style={styles.codeChip}><Ionicons name="receipt-outline" size={13} color={colors.primary} /><Text style={styles.codeText}>{receipt.confirmationCode}</Text></View>
                  {!!receipt.card && <Text style={styles.cardText}>{receipt.card}</Text>}
                </View>

                <View style={styles.rActions}>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => shareReceipt(receipt)}>
                    <Ionicons name="share-outline" size={16} color={colors.primary} />
                    <Text style={styles.shareText}>Share receipt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setReceipt(null)}>
                    <Text style={styles.closeText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { borderRadius: borderRadius.xl, padding: spacing.xl },
    heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, ...fonts.medium },
    heroValue: { color: '#fff', fontSize: 40, letterSpacing: letterSpacing.tight, marginTop: 4, ...fonts.bold },
    heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.base },
    heroChip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 999 },
    heroChipText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    feeNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle },
    feeNoteText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 19, ...fonts.regular },
    refundNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    refundText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.regular },
    monthHeader: { fontSize: fontSizes.base, letterSpacing: letterSpacing.snug, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm, ...fonts.bold },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    empty: { fontSize: fontSizes.base, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.xl, ...fonts.regular },
    tripCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.sm },
    tripImg: { width: 60, height: 60, borderRadius: borderRadius.md },
    tripName: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    tripMeta: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    statusPill: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
    statusText: { fontSize: fontSizes.xs, ...fonts.bold },
    tripTotal: { fontSize: fontSizes.md, color: colors.textPrimary, ...fonts.bold },
    tripView: { fontSize: fontSizes.xs, color: colors.primary, marginTop: 2, ...fonts.semiBold },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing['2xl'] },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, marginBottom: spacing.md },
    rHead: { fontSize: fontSizes.sm, color: colors.textTertiary, ...fonts.semiBold },
    rProp: { fontSize: fontSizes.xl, color: colors.textPrimary, marginTop: 2, ...fonts.bold },
    rLoc: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    rMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base, marginTop: spacing.md },
    rMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    rMetaText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    rDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight, marginVertical: spacing.md },
    line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
    lineLabel: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.regular },
    lineValue: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    lineValueStrong: { fontSize: fontSizes.lg, ...fonts.bold },
    rFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
    codeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primarySubtle },
    codeText: { fontSize: fontSizes.xs, color: colors.primary, ...fonts.bold },
    cardText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    rActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary },
    shareText: { fontSize: fontSizes.base, color: colors.primary, ...fonts.bold },
    closeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primary },
    closeText: { fontSize: fontSizes.base, color: '#fff', ...fonts.bold },
  });

export default TripSpendingScreen;
