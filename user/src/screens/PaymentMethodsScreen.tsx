import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, TextInput, Alert, useWindowDimensions,
} from 'react-native';
import { confirmAction } from '../utils/confirm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { STAYON_GRADIENT } from '../components/GradientButton';
import {
  SavedCard,
  detectBrand,
  formatCardNumber,
  getCards,
  addCard as addCardToStore,
  removeCard as removeCardFromStore,
  setDefaultCard as setDefaultCardInStore,
} from '../data/cards';

type CardBrand = 'visa' | 'mastercard' | 'amex' | 'chase' | 'discover';

// The card-face visuals read these fields off SavedCard.
type Card = SavedCard;

// Per-brand visual identity for the rendered card face. Modeled to look like
// the way Apple Wallet renders premium branded cards.
interface BrandTheme {
  gradient: [string, string, string];
  start: { x: number; y: number };
  end: { x: number; y: number };
  // Color used for the masked number / cardholder text on the face.
  ink: string;
  inkMuted: string;
  // 'light' brands (e.g. Discover) need dark glyphs/chip outlines.
  scheme: 'light' | 'dark';
}

const BRAND_THEMES: Record<CardBrand, BrandTheme> = {
  // Deep navy → royal blue, the classic Visa look.
  visa: {
    gradient: ['#0A1A5C', '#15287D', '#2540B0'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    ink: '#FFFFFF', inkMuted: 'rgba(255,255,255,0.78)', scheme: 'dark',
  },
  // Charcoal → near-black, lets the red/orange circles pop.
  mastercard: {
    gradient: ['#2B2B2F', '#1A1A1D', '#0A0A0B'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    ink: '#FFFFFF', inkMuted: 'rgba(255,255,255,0.72)', scheme: 'dark',
  },
  // Amex teal/green.
  amex: {
    gradient: ['#0E8E72', '#0B6F59', '#084C3D'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    ink: '#FFFFFF', inkMuted: 'rgba(255,255,255,0.82)', scheme: 'dark',
  },
  // Chase blue.
  chase: {
    gradient: ['#1E8FE0', '#117ACA', '#0B5C9C'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    ink: '#FFFFFF', inkMuted: 'rgba(255,255,255,0.8)', scheme: 'dark',
  },
  // Discover — white face with the signature orange accent.
  discover: {
    gradient: ['#FFFFFF', '#FBF4EC', '#FCE4CF'],
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    ink: '#1B1B1F', inkMuted: 'rgba(27,27,31,0.6)', scheme: 'light',
  },
};

// Neutral premium gradient for unknown brands.
const NEUTRAL_THEME: BrandTheme = {
  gradient: ['#3A3D46', '#23252C', '#141519'],
  start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
  ink: '#FFFFFF', inkMuted: 'rgba(255,255,255,0.72)', scheme: 'dark',
};

function getBrandTheme(brand: string): BrandTheme {
  return BRAND_THEMES[brand as CardBrand] ?? NEUTRAL_THEME;
}

const WALLETS = [
  { id: 'apple', label: 'Apple Pay', icon: 'logo-apple', connected: true },
  { id: 'google', label: 'Google Pay', icon: 'logo-google', connected: false },
  { id: 'paypal', label: 'PayPal', icon: 'logo-paypal', connected: true },
];

const BRAND_ICON: Record<string, string> = {
  visa: 'card',
  mastercard: 'card',
  amex: 'card',
  chase: 'card',
  discover: 'card',
};

// ---------------------------------------------------------------------------
// Card-face building blocks (pure View/Text/Ionicons — no image assets)
// ---------------------------------------------------------------------------

// Gold EMV chip: rounded rect with inner contact lines.
function EmvChip({ scheme }: { scheme: 'light' | 'dark' }) {
  // Slightly different gold for light vs dark faces so it reads on both.
  const a = scheme === 'light' ? '#C9A227' : '#E6C875';
  const b = scheme === 'light' ? '#A8821B' : '#B8902F';
  return (
    <LinearGradient
      colors={[a, b]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={faceStyles.chip}
    >
      <View style={faceStyles.chipLineV} />
      <View style={[faceStyles.chipLineH, { top: '32%' }]} />
      <View style={[faceStyles.chipLineH, { top: '64%' }]} />
      <View style={faceStyles.chipCenter} />
    </LinearGradient>
  );
}

// Contactless "wave" mark — uses stacked WiFi-style arcs rotated to point right.
function Contactless({ color }: { color: string }) {
  return (
    <View style={faceStyles.contactless}>
      <Ionicons name="wifi" size={22} color={color} style={faceStyles.contactlessIcon} />
    </View>
  );
}

// The Mastercard two-overlapping-circles mark.
function MastercardMark() {
  return (
    <View style={faceStyles.mcWrap}>
      <View style={[faceStyles.mcCircle, { backgroundColor: '#EB001B' }]} />
      <View style={[faceStyles.mcCircle, faceStyles.mcCircleRight, { backgroundColor: '#F79E1B' }]} />
    </View>
  );
}

// Brand wordmark rendered as styled Text in the bottom-right corner.
function BrandWordmark({ brand, ink }: { brand: string; ink: string }) {
  switch (brand) {
    case 'visa':
      return <Text style={[faceStyles.wmVisa, { color: ink }]}>VISA</Text>;
    case 'mastercard':
      return <MastercardMark />;
    case 'amex':
      return (
        <View style={faceStyles.amexWrap}>
          <Text style={faceStyles.amexSmall}>AMERICAN EXPRESS</Text>
          <Text style={faceStyles.amexBig}>AMEX</Text>
        </View>
      );
    case 'chase':
      return <Text style={[faceStyles.wmChase, { color: ink }]}>CHASE</Text>;
    case 'discover':
      return (
        <View style={faceStyles.discoverWrap}>
          <Text style={faceStyles.discoverText}>DISC</Text>
          <View style={faceStyles.discoverDot} />
          <Text style={faceStyles.discoverText}>VER</Text>
        </View>
      );
    default:
      return <Text style={[faceStyles.wmGeneric, { color: ink }]}>{(brand || 'CARD').toUpperCase()}</Text>;
  }
}

// A full premium card face.
function CardFace({ card, width }: { card: Card; width: number }) {
  const theme = getBrandTheme(card.brand);
  const height = width / 1.586; // standard credit-card aspect ratio

  return (
    <LinearGradient
      colors={theme.gradient}
      start={theme.start}
      end={theme.end}
      style={[faceStyles.face, { width, height }]}
    >
      {/* subtle sheen overlay for depth */}
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Top row: chip + contactless on the left, Default badge on the right */}
      <View style={faceStyles.topRow}>
        <View style={faceStyles.chipRow}>
          <EmvChip scheme={theme.scheme} />
          <Contactless color={theme.inkMuted} />
        </View>
        {card.isDefault && (
          <View
            style={[
              faceStyles.defaultBadge,
              { backgroundColor: theme.scheme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.22)' },
            ]}
          >
            <Text style={[faceStyles.defaultText, { color: theme.ink }]}>Default</Text>
          </View>
        )}
      </View>

      {/* Masked card number */}
      <Text style={[faceStyles.number, { color: theme.ink }]}>
        ••••  ••••  ••••  {card.last4}
      </Text>

      {/* Bottom row: cardholder + expiry on the left, wordmark on the right */}
      <View style={faceStyles.bottomRow}>
        <View style={faceStyles.holderCol}>
          <Text style={[faceStyles.fieldLabel, { color: theme.inkMuted }]}>CARDHOLDER</Text>
          <Text style={[faceStyles.holderName, { color: theme.ink }]}>CARD HOLDER</Text>
        </View>
        <View style={faceStyles.expCol}>
          <Text style={[faceStyles.fieldLabel, { color: theme.inkMuted }]}>EXP</Text>
          <Text style={[faceStyles.expValue, { color: theme.ink }]}>{card.expiry}</Text>
        </View>
        <View style={faceStyles.wordmarkCol}>
          <BrandWordmark brand={card.brand} ink={theme.ink} />
        </View>
      </View>
    </LinearGradient>
  );
}

export function PaymentMethodsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, medium, success } = useHaptics();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32; // full width minus the 16px section padding each side
  const [cards, setCards] = useState<Card[]>([]);

  // Load the shared wallet on focus so changes made elsewhere (e.g. a card
  // saved during checkout) show up here.
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getCards().then((c) => { if (active) setCards(c); });
      return () => { active = false; };
    }, [])
  );
  const [wallets, setWallets] = useState(WALLETS);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardTouched, setCardTouched] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);

  const cardDigits = cardNumber.replace(/\D/g, '');
  const detectedBrand = detectBrand(cardDigits);
  const cardNumberValid = cardDigits.length >= 15;
  const showCardError = cardTouched && !cardNumberValid && cardDigits.length > 0;

  const setDefault = (id: string) => {
    light();
    setDefaultCardInStore(id).then(setCards);
  };

  const removeCard = (id: string) => {
    confirmAction({
      title: 'Remove card?',
      message: 'This card will be removed from your account.',
      confirmText: 'Remove',
      destructive: true,
      onConfirm: () => { removeCardFromStore(id).then(setCards); },
    });
  };

  const addCard = () => {
    setCardTouched(true);
    if (!cardNumberValid) {
      Alert.alert('Invalid card', 'Please enter a valid card number.');
      return;
    }
    success();
    const last4 = cardDigits.slice(-4);
    addCardToStore({
      brand: detectedBrand ?? 'visa',
      last4,
      expiry: cardExpiry || '12/28',
      isDefault: cards.length === 0,
    }).then(setCards);
    setCardNumber(''); setCardExpiry(''); setCardCvc('');
    setCardTouched(false);
    setShowAddCard(false);
  };

  const closeAddCard = () => {
    setShowAddCard(false);
    setCardTouched(false);
  };

  const toggleWallet = (id: string) => {
    medium();
    setWallets((prev) => prev.map((w) => w.id === id ? { ...w, connected: !w.connected } : w));
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Payments & Payouts</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Cards</Text>
          {cards.map((card) => (
            <View key={card.id} style={styles.cardWrap}>
              <CardFace card={card} width={cardWidth} />
              <View style={styles.cardActions}>
                {!card.isDefault && (
                  <TouchableOpacity onPress={() => setDefault(card.id)}>
                    <Text style={[styles.cardAction, { color: colors.primary }]}>Set default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => removeCard(card.id)}>
                  <Text style={[styles.cardAction, { color: colors.error }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addCardBtn, { borderColor: colors.primary }]}
            onPress={() => { light(); setShowAddCard(true); }}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.addCardText, { color: colors.primary }]}>Add a card</Text>
          </TouchableOpacity>
        </View>

        {/* Digital wallets */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Digital Wallets</Text>
          {wallets.map((wallet) => (
            <View key={wallet.id} style={[styles.walletRow, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <View style={[styles.walletIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name={wallet.icon as any} size={22} color={colors.textPrimary} />
              </View>
              <Text style={[styles.walletLabel, { color: colors.textPrimary }]}>{wallet.label}</Text>
              <TouchableOpacity
                style={[
                  styles.connectBtn,
                  { backgroundColor: wallet.connected ? colors.primarySubtle : colors.primary },
                ]}
                onPress={() => toggleWallet(wallet.id)}
              >
                <Text style={[styles.connectText, { color: wallet.connected ? colors.primary : '#fff' }]}>
                  {wallet.connected ? 'Connected' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Gift card */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.linkRow, { backgroundColor: colors.card, borderColor: colors.borderLight }]} onPress={() => light()}>
            <Ionicons name="gift-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Redeem gift card</Text>
              <Text style={[styles.linkSub, { color: colors.textSecondary }]}>Add StayOn credit to your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Security note */}
        <View style={[styles.securityNote, { backgroundColor: colors.primarySubtle }]}>
          <Ionicons name="lock-closed" size={16} color={colors.primary} />
          <Text style={[styles.securityText, { color: colors.primary }]}>
            Your payment info is encrypted and stored securely. StayOn never shares card details with hosts.
          </Text>
        </View>
      </ScrollView>

      {/* Add card modal */}
      <Modal visible={showAddCard} transparent animationType="slide" presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.borderLight }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add a card</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Card number</Text>
            <View
              style={[
                styles.cardInputWrap,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: showCardError
                    ? colors.error
                    : cardFocused
                    ? colors.primary
                    : cardNumberValid
                    ? colors.success
                    : colors.borderLight,
                },
              ]}
            >
              <TextInput
                style={[styles.cardInput, { color: colors.textPrimary }]}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                onFocus={() => setCardFocused(true)}
                onBlur={() => { setCardFocused(false); setCardTouched(true); }}
                maxLength={19}
              />
              {detectedBrand && (
                <View style={styles.brandBadge}>
                  <Ionicons name={BRAND_ICON[detectedBrand] as any} size={18} color={colors.primary} />
                  <Text style={[styles.brandText, { color: colors.textSecondary }]}>{detectedBrand.toUpperCase()}</Text>
                </View>
              )}
            </View>
            {showCardError && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>Enter a complete card number</Text>
              </View>
            )}

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Expiry</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="MM/YY"
                  placeholderTextColor={colors.textTertiary}
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CVC</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="123"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  secureTextEntry
                  value={cardCvc}
                  onChangeText={setCardCvc}
                  maxLength={4}
                />
              </View>
            </View>

            {/* Trust cue near the pay button */}
            <View style={styles.securedRow}>
              <Ionicons name="lock-closed" size={14} color={colors.success} />
              <Text style={[styles.securedText, { color: colors.textSecondary }]}>
                Secured payment · 256-bit encryption
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.borderLight }]} onPress={closeAddCard}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.9} onPress={addCard} style={[styles.saveBtnWrap, !cardNumberValid && { opacity: 0.55 }]}>
                <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                  <Ionicons name="lock-closed" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveText}>Add card</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    title: { fontSize: 18, fontWeight: '700' },
    section: { paddingHorizontal: 16, marginBottom: 24 },
    sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
    cardWrap: { marginBottom: 16 },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 10 },
    cardAction: { fontSize: 13, fontWeight: '600' },
    addCardBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    },
    addCardText: { fontSize: 14, fontWeight: '600' },
    walletRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10,
    },
    walletIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    walletLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
    connectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    connectText: { fontSize: 13, fontWeight: '700' },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
    linkTitle: { fontSize: 15, fontWeight: '600' },
    linkSub: { fontSize: 12, marginTop: 2 },
    securityNote: { flexDirection: 'row', gap: 10, marginHorizontal: 16, padding: 14, borderRadius: 14, alignItems: 'flex-start' },
    securityText: { flex: 1, fontSize: 12, lineHeight: 18 },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
    inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, marginBottom: 16 },
    cardInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 14,
      marginBottom: 6,
    },
    cardInput: { flex: 1, paddingVertical: 12, fontSize: 15, letterSpacing: 1 },
    brandBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    brandText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    errorText: { fontSize: 12, fontWeight: '500' },
    securedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, marginBottom: 14 },
    securedText: { fontSize: 12, fontWeight: '500' },
    inputRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
    cancelText: { fontSize: 15, fontWeight: '600' },
    saveBtnWrap: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    saveBtn: { flexDirection: 'row', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  });
}

// Card-face styles are brand/theme driven (colors injected at render time) so
// they live outside makeStyles and don't depend on the app theme.
const faceStyles = StyleSheet.create({
  face: {
    borderRadius: 18,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    // soft elevation so the card lifts off the page like a physical card
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // EMV chip
  chip: {
    width: 42,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLineV: {
    position: 'absolute',
    width: 1.5,
    height: '100%',
    left: '50%',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  chipLineH: {
    position: 'absolute',
    height: 1.5,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  chipCenter: {
    width: 16,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.3)',
    backgroundColor: 'transparent',
  },

  // Contactless wave
  contactless: { transform: [{ rotate: '90deg' }] },
  contactlessIcon: { opacity: 0.9 },

  defaultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  defaultText: { fontSize: 11, fontWeight: '700' },

  // Masked number — spaced, mono-ish feel
  number: {
    fontSize: 21,
    fontWeight: '600',
    letterSpacing: 2,
    // tabular figures so the masked digits align like an embossed card
    fontVariant: ['tabular-nums'],
  },

  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  holderCol: { flex: 1 },
  expCol: { marginRight: 12 },
  wordmarkCol: { alignItems: 'flex-end', justifyContent: 'flex-end' },
  fieldLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  holderName: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  expValue: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },

  // Wordmarks
  wmVisa: { fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  wmChase: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  wmGeneric: { fontSize: 16, fontWeight: '800', letterSpacing: 1.5 },

  // Amex
  amexWrap: { alignItems: 'flex-end' },
  amexSmall: { color: '#FFFFFF', fontSize: 7, fontWeight: '700', letterSpacing: 1, opacity: 0.85 },
  amexBig: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

  // Mastercard overlapping circles
  mcWrap: { flexDirection: 'row', alignItems: 'center', height: 32 },
  mcCircle: { width: 32, height: 32, borderRadius: 16 },
  mcCircleRight: { marginLeft: -14, opacity: 0.92 },

  // Discover
  discoverWrap: { flexDirection: 'row', alignItems: 'flex-end' },
  discoverText: { color: '#1B1B1F', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  discoverDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#F58220', marginHorizontal: 1, marginBottom: 2 },
});
