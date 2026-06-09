import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { spacing, borderRadius, fontSizes, fonts } from '../constants';

const VIBES = [
  {
    id: 'romantic',
    label: 'Romantic',
    description: 'Couples escapes,\nsunsets & privacy',
    image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&h=320&fit=crop',
    overlay: 'rgba(244,63,94,0.55)',
    tags: ['private pool', 'king bed', 'scenic view', 'couples'],
  },
  {
    id: 'adventure',
    label: 'Adventure',
    description: 'Thrillseeking,\nsurf, hike & climb',
    image: 'https://images.unsplash.com/photo-1530866957042-7e9a37a8f0a5?w=500&h=320&fit=crop',
    overlay: 'rgba(13,148,136,0.55)',
    tags: ['near beach', 'mountain', 'outdoor activities'],
  },
  {
    id: 'wellness',
    label: 'Wellness',
    description: 'Spa, yoga,\ndetox & mindfulness',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&h=320&fit=crop',
    overlay: 'rgba(124,58,237,0.5)',
    tags: ['spa', 'yoga', 'hot tub', 'meditation'],
  },
  {
    id: 'family',
    label: 'Family',
    description: 'Kid-safe, big spaces\n& family fun',
    image: 'https://images.unsplash.com/photo-1602576666092-bf6447a729fc?w=500&h=320&fit=crop',
    overlay: 'rgba(245,158,11,0.5)',
    tags: ['family', 'kids allowed', 'pool', '3+ bedrooms'],
  },
  {
    id: 'nomad',
    label: 'Digital Nomad',
    description: 'Fast wifi,\nworkspace & quiet',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&h=320&fit=crop',
    overlay: 'rgba(14,165,233,0.5)',
    tags: ['wifi', 'workspace', 'long stays', 'quiet'],
  },
  {
    id: 'social',
    label: 'Social',
    description: 'Groups, parties\n& shared vibes',
    image: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=500&h=320&fit=crop',
    overlay: 'rgba(234,88,12,0.5)',
    tags: ['large group', 'events allowed', 'communal spaces'],
  },
];

export function VibeSearchScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 48) / 2;
  const { medium, selection } = useHaptics();
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  const handleVibeSelect = (id: string) => {
    medium();
    setSelectedVibe(id === selectedVibe ? null : id);
  };

  const handleFind = () => {
    medium();
    const vibe = VIBES.find((v) => v.id === selectedVibe);
    navigation.navigate('Main', { screen: 'ExploreTab', params: { vibeFilter: vibe?.tags ?? [] } });
  };

  const styles = makeStyles(colors, isDark, CARD_WIDTH);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Match Your Vibe</Text>
          <Text style={styles.subtitle}>What kind of stay are you looking for?</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {VIBES.map((vibe) => {
            const isSelected = selectedVibe === vibe.id;
            return (
              <TouchableOpacity
                key={vibe.id}
                onPress={() => handleVibeSelect(vibe.id)}
                activeOpacity={0.85}
                style={[styles.vibeCard, isSelected && styles.vibeCardSelected]}
              >
                <View style={styles.imageCard}>
                  <Image source={{ uri: vibe.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={[styles.imageOverlay, { backgroundColor: vibe.overlay }]} />
                  <View style={styles.gradient}>
                    <Text style={styles.vibeLabel}>{vibe.label}</Text>
                    <Text style={styles.vibeDesc}>{vibe.description}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedVibe && (
          <View style={[styles.tagRow]}>
            <Text style={[styles.tagLabel, { color: colors.textSecondary }]}>Looking for:</Text>
            <View style={styles.tags}>
              {(VIBES.find((v) => v.id === selectedVibe)?.tags ?? []).map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.primarySubtle }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{String(tag)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.borderLight, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.findBtnWrap}
          onPress={handleFind}
          disabled={!selectedVibe}
        >
          <LinearGradient
            colors={selectedVibe ? STAYON_GRADIENT : [colors.primaryUltraLight, colors.primaryUltraLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.findBtn}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color={selectedVibe ? '#fff' : colors.primary}
            />
            <Text style={[styles.findBtnText, { color: selectedVibe ? '#fff' : colors.primary }]}>
              {selectedVibe
                ? `Find ${VIBES.find((v) => v.id === selectedVibe)?.label} Stays`
                : 'Select a Vibe First'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: any, isDark: boolean, CARD_WIDTH: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.base,
      gap: spacing.sm,
    },
    title: { fontSize: fontSizes['2xl'], ...fonts.bold, letterSpacing: -0.5, color: colors.textPrimary, marginTop: spacing.md },
    subtitle: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
    scroll: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    vibeCard: {
      width: CARD_WIDTH,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 4,
    },
    vibeCardSelected: {
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      transform: [{ scale: 0.97 }],
    },
    imageCard: {
      height: 150,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    imageOverlay: {
      ...StyleSheet.absoluteFill,
    },
    gradient: {
      padding: spacing.base,
      justifyContent: 'flex-end',
    },
    vibeLabel: { fontSize: fontSizes.lg, ...fonts.bold, color: '#fff' },
    vibeDesc: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.88)', marginTop: 2, lineHeight: 15 },
    checkBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 24,
      height: 24,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tagRow: { marginTop: spacing.lg },
    tagLabel: { fontSize: fontSizes.sm, ...fonts.semiBold, marginBottom: spacing.sm },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tag: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: borderRadius.lg,
    },
    tagText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    footer: {
      padding: spacing.lg,
      borderTopWidth: 1,
    },
    findBtnWrap: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    findBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.base,
      borderRadius: borderRadius.lg,
      gap: spacing.sm,
    },
    findBtnText: { fontSize: fontSizes.md, ...fonts.bold },
  });
}
