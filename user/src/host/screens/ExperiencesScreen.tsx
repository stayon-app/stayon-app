import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { useCurrency } from '../contexts/CurrencyContext';
import { spacing, borderRadius, fonts } from '../constants';
import { ScreenHeader, EmptyState } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getAllExperiences, categoryLabel, type Experience } from '../../data/experiences';

export function ExperiencesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const { format } = useCurrency();
  const s = makeStyles(colors);
  const [items, setItems] = useState<Experience[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getAllExperiences().then((l) => { if (active) setItems(l); });
      return () => { active = false; };
    }, [])
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title="Your experiences"
        onBack={() => navigation.goBack()}
        rightActions={[{ icon: 'add', onPress: () => navigation.navigate('ExperienceCreate'), accessibilityLabel: 'Add experience' }]}
      />
      {items.length === 0 ? (
        <EmptyState
          illustration="listings"
          icon="sparkles-outline"
          title="Host an experience"
          message="Music, comedy, gaming, trips, events — share something people can book and join."
          actionLabel="Create an experience"
          onAction={() => navigation.navigate('ExperienceCreate')}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
          {items.map((e) => (
            <TouchableOpacity key={e.id} style={s.card} activeOpacity={0.9}
              onPress={() => navigation.navigate('ExperienceCreate', { id: e.id })}>
              <Image source={{ uri: e.images[0] }} style={s.cardImg} />
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <Text style={s.cardCat}>{categoryLabel(e.category)}</Text>
                  <View style={[s.statusPill, { backgroundColor: e.status === 'published' ? colors.primarySubtle : colors.borderLight }]}>
                    <Text style={[s.statusText, { color: e.status === 'published' ? colors.primary : colors.textSecondary }]}>
                      {e.status === 'published' ? 'Published' : 'Draft'}
                    </Text>
                  </View>
                </View>
                <Text style={s.cardTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={s.cardMeta} numberOfLines={1}>
                  {format(e.pricePerPerson)}/person · up to {e.capacity}{e.location ? ` · ${e.location}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {items.length > 0 && (
        <TouchableOpacity style={s.fab} activeOpacity={0.9} onPress={() => { light(); navigation.navigate('ExperienceCreate'); }} accessibilityLabel="Create an experience">
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fabInner}>
            <Ionicons name="add" size={26} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.xl, marginBottom: spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
    cardImg: { width: '100%', height: 150 },
    cardBody: { padding: spacing.base },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardCat: { fontSize: 12, ...fonts.semiBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
    statusText: { fontSize: 11, ...fonts.semiBold },
    cardTitle: { fontSize: 16, ...fonts.bold, color: colors.textPrimary },
    cardMeta: { fontSize: 13, ...fonts.regular, color: colors.textSecondary, marginTop: 2 },
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, borderRadius: 30, overflow: 'hidden', elevation: 6 },
    fabInner: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  });
}

export default ExperiencesScreen;
