import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { spacing, borderRadius, fontSizes, fonts } from '../constants';

const CATEGORIES = ['All', 'Transport', 'Dining', 'Activities', 'Wellness'];

const SERVICES = [
  { id: '1', category: 'Transport', icon: 'car-outline', title: 'Airport Transfer', description: 'Private car pickup & drop from airport', price: '$45', duration: '~45 min', rating: 4.9, popular: true },
  { id: '2', category: 'Dining', icon: 'restaurant-outline', title: 'Private Chef', description: 'In-home chef for breakfast, lunch or dinner', price: '$220', duration: '3 hours', rating: 4.97, popular: true },
  { id: '3', category: 'Activities', icon: 'water-outline', title: 'Surf Lesson', description: 'Beginner-friendly surf lesson with instructor', price: '$85', duration: '2 hours', rating: 4.92, popular: false },
  { id: '4', category: 'Activities', icon: 'airplane-outline', title: 'Helicopter Tour', description: 'Scenic helicopter ride over the destination', price: '$450', duration: '30 min', rating: 4.95, popular: true },
  { id: '5', category: 'Wellness', icon: 'flower-outline', title: 'In-Villa Massage', description: 'Professional masseuse at your property', price: '$120', duration: '60 min', rating: 4.96, popular: false },
  { id: '6', category: 'Dining', icon: 'wine-outline', title: 'Romantic Dinner', description: 'Candlelit dinner setup on your terrace', price: '$295', duration: '2 hours', rating: 4.98, popular: true },
  { id: '7', category: 'Transport', icon: 'boat-outline', title: 'Yacht Charter', description: 'Private yacht for sunset cruise', price: '$875', duration: '3 hours', rating: 4.94, popular: false },
  { id: '8', category: 'Activities', icon: 'fitness-outline', title: 'Scuba Diving', description: 'Guided dive with all equipment provided', price: '$145', duration: '3 hours', rating: 4.91, popular: false },
];

export function StayServicesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, medium } = useHaptics();
  const [activeCategory, setActiveCategory] = useState('All');
  const [added, setAdded] = useState<string[]>([]);

  const filtered = activeCategory === 'All'
    ? SERVICES
    : SERVICES.filter((s) => s.category === activeCategory);

  const toggleAdd = (id: string) => {
    medium();
    setAdded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>StayServices</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Add extras to your stay</Text>
        </View>
        {added.length > 0 && (
          <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.cartCount}>{added.length}</Text>
          </View>
        )}
      </View>

      {/* Hero */}
      <LinearGradient
        colors={[colors.primary, colors.gradientEnd]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.heroTitle}>Elevate Your Stay</Text>
        <Text style={styles.heroSub}>From airport transfers to private chefs — we've got it all</Text>
      </LinearGradient>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScrollWrap}
        contentContainerStyle={styles.catScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const onPress = () => { light(); setActiveCategory(cat); };
          return isActive ? (
            <TouchableOpacity
              key={cat}
              style={styles.catPillActive}
              onPress={onPress}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={STAYON_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.catPillFill}
              >
                <Text style={[styles.catText, { color: '#fff' }]}>{cat}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={cat}
              style={[styles.catPill, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.catText, { color: colors.textSecondary }]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.map((service) => {
          const isAdded = added.includes(service.id);
          return (
            <View key={service.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {service.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              )}
              <View style={styles.cardTop}>
                <View style={[styles.emojiWrap, { backgroundColor: colors.primarySubtle }]}>
                  <Ionicons name={service.icon as any} size={24} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.serviceTitle, { color: colors.textPrimary }]}>{service.title}</Text>
                  <Text style={[styles.serviceDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {service.description}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
                      <Text style={[styles.meta, { color: colors.textTertiary }]}>{service.duration}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={13} color={colors.gold} />
                      <Text style={[styles.meta, { color: colors.textTertiary }]}>{service.rating}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={[styles.price, { color: colors.textPrimary }]}>{service.price}</Text>
                <TouchableOpacity
                  style={[
                    styles.addBtn,
                    { backgroundColor: isAdded ? colors.primaryUltraLight : colors.primary },
                  ]}
                  onPress={() => toggleAdd(service.id)}
                >
                  <Ionicons
                    name={isAdded ? 'checkmark' : 'add'}
                    size={16}
                    color={isAdded ? colors.primary : '#fff'}
                  />
                  <Text style={[styles.addText, { color: isAdded ? colors.primary : '#fff' }]}>
                    {isAdded ? 'Added' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {added.length > 0 && (
        <View style={[styles.checkoutBar, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <View>
            <Text style={[styles.checkoutLabel, { color: colors.textSecondary }]}>
              {added.length} service{added.length > 1 ? 's' : ''} added
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => Alert.alert('Services Added!', 'Your extras have been added to the booking.')}
          >
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.checkoutBtn}>
              <Text style={styles.checkoutText}>Continue to Booking</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    headerTitle: { fontSize: fontSizes.lg, ...fonts.bold },
    headerSub: { fontSize: fontSizes.sm, ...fonts.regular, marginTop: 1 },
    cartBadge: {
      marginLeft: 'auto',
      width: 24,
      height: 24,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cartCount: { color: '#fff', fontSize: fontSizes.sm, ...fonts.bold },
    hero: { marginHorizontal: spacing.lg, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
    heroTitle: { color: '#fff', fontSize: fontSizes.xl, ...fonts.bold, letterSpacing: -0.5 },
    heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, marginTop: spacing.xs, lineHeight: 18 },
    catScrollWrap: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.md },
    catScroll: {
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingRight: spacing.xl,
      gap: spacing.sm,
    },
    catPill: {
      height: 36,
      paddingHorizontal: spacing.base,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catPillActive: {
      height: 36,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    catPillFill: {
      flex: 1,
      paddingHorizontal: spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    list: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md },
    card: {
      borderRadius: borderRadius.lg,
      padding: spacing.base,
      borderWidth: 1,
    },
    popularBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.base,
      marginBottom: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#EAEAEA',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
        android: { elevation: 3 },
        web: { boxShadow: '0 2px 6px rgba(0,0,0,0.18)' } as any,
      }),
    },
    popularText: { color: '#222222', fontSize: fontSizes.xs, ...fonts.bold },
    cardTop: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    emojiWrap: { width: 48, height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    emoji: { fontSize: 22 },
    cardInfo: { flex: 1 },
    serviceTitle: { fontSize: fontSizes.base, ...fonts.bold },
    serviceDesc: { fontSize: fontSizes.sm, marginTop: 2, lineHeight: 17 },
    metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    meta: { fontSize: fontSizes.sm },
    cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    price: { fontSize: fontSizes.lg, ...fonts.bold },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    addText: { fontSize: fontSizes.sm, ...fonts.bold },
    checkoutBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderTopWidth: 1,
    },
    checkoutLabel: { fontSize: fontSizes.sm },
    checkoutBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
    },
    checkoutText: { color: '#fff', fontSize: fontSizes.sm, ...fonts.bold },
  });
}
