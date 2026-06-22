import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { fonts, spacing, borderRadius } from '../constants';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getExperience, categoryLabel, type Experience } from '../data/experiences';
import { describePolicy, getPolicy } from '../data/cancellationPolicy';

export const ExperienceDetailsScreen: React.FC<any> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { width } = useWindowDimensions();
  const s = makeStyles(colors);
  const id: string = route?.params?.id;
  const passed: Experience | undefined = route?.params?.experience;

  const [exp, setExp] = useState<Experience | undefined>(passed);
  const [people, setPeople] = useState(1);

  useEffect(() => {
    if (!exp && id) getExperience(id).then(setExp);
  }, [id]);

  if (!exp) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Experience not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}><Text style={{ color: colors.primary }}>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  const maxPeople = exp.bookingType === 'individual' ? 1 : Math.max(1, exp.capacity || 1);
  const total = exp.pricePerPerson * people;

  const reserve = () => {
    // Continue to checkout → payment → confirmation.
    navigation.navigate('ExperienceCheckout', { experience: exp, people });
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Hero image */}
        <View>
          <Image source={{ uri: exp.images[0] }} style={[s.hero, { width, height: width * 0.7 }]} />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={s.catChip}>
            <Text style={s.catChipText}>{categoryLabel(exp.category)}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.title}>{exp.title}</Text>
          <View style={s.metaRow}>
            {exp.location ? (<><Ionicons name="location-outline" size={15} color={colors.textSecondary} /><Text style={s.meta}>{exp.location}</Text></>) : null}
            {exp.rating ? (<><Ionicons name="star" size={14} color="#F5A623" style={{ marginLeft: 10 }} /><Text style={s.meta}>{exp.rating} ({exp.reviews || 0})</Text></>) : null}
          </View>

          <View style={s.infoStrip}>
            {exp.dateLabel ? <Info icon="calendar-outline" label={exp.dateLabel} colors={colors} /> : null}
            {exp.durationLabel ? <Info icon="time-outline" label={exp.durationLabel} colors={colors} /> : null}
            <Info icon="people-outline" label={`Up to ${exp.capacity}`} colors={colors} />
          </View>

          <Text style={s.sectionTitle}>About</Text>
          <Text style={s.paragraph}>{exp.description}</Text>

          {exp.included ? (<><Text style={s.sectionTitle}>What's included</Text><Text style={s.paragraph}>{exp.included}</Text></>) : null}
          {exp.rules ? (<><Text style={s.sectionTitle}>Rules & guidelines</Text><Text style={s.paragraph}>{exp.rules}</Text></>) : null}

          <Text style={s.sectionTitle}>Cancellation policy</Text>
          <Text style={s.paragraph}>
            <Text style={{ ...fonts.semiBold, color: colors.textPrimary }}>{getPolicy(exp.cancellationPolicy).tier}. </Text>
            {describePolicy(exp.cancellationPolicy)}
          </Text>

          {exp.hostName ? (
            <View style={s.hostRow}>
              <View style={s.hostAvatar}><Ionicons name="person" size={18} color={colors.primary} /></View>
              <View>
                <Text style={s.hostName}>Hosted by {exp.hostName}</Text>
                <Text style={s.hostSub}>Your experience host</Text>
              </View>
            </View>
          ) : null}

          {/* People selector */}
          <Text style={s.sectionTitle}>How many people?</Text>
          <Text style={s.bookingHint}>
            {exp.bookingType === 'individual' ? 'Individual booking' : exp.bookingType === 'group' ? 'Group booking' : 'Book solo or as a group'}
          </Text>
          <View style={s.stepper}>
            <TouchableOpacity style={[s.stepBtn, { borderColor: colors.borderLight }]} disabled={people <= 1} onPress={() => setPeople((p) => Math.max(1, p - 1))}>
              <Ionicons name="remove" size={20} color={people <= 1 ? colors.textTertiary : colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.stepCount}>{people}</Text>
            <TouchableOpacity style={[s.stepBtn, { borderColor: colors.borderLight }]} disabled={people >= maxPeople} onPress={() => setPeople((p) => Math.min(maxPeople, p + 1))}>
              <Ionicons name="add" size={20} color={people >= maxPeople ? colors.textTertiary : colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.stepMax}>max {maxPeople}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
        <View>
          <Text style={s.footerTotal}>{format(total)}</Text>
          <Text style={s.footerSub}>{format(exp.pricePerPerson)} × {people} {people === 1 ? 'person' : 'people'}</Text>
        </View>
        <TouchableOpacity onPress={reserve} activeOpacity={0.9} style={{ flex: 1, marginLeft: spacing.lg }}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bookBtn}>
            <Text style={s.bookText}>Reserve</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Info: React.FC<{ icon: any; label: string; colors: any }> = ({ icon, label, colors }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    <Ionicons name={icon} size={15} color={colors.primary} />
    <Text style={{ fontSize: 13, color: colors.textSecondary, ...fonts.medium }}>{label}</Text>
  </View>
);

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    hero: { backgroundColor: colors.borderLight },
    backBtn: { position: 'absolute', top: 44, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    catChip: { position: 'absolute', bottom: 14, left: 16, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    catChipText: { color: '#fff', fontSize: 12, ...fonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
    body: { padding: spacing.lg },
    title: { fontSize: 24, ...fonts.bold, color: colors.textPrimary },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' },
    meta: { fontSize: 13, color: colors.textSecondary, ...fonts.medium },
    infoStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
    sectionTitle: { fontSize: 17, ...fonts.bold, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.xs },
    paragraph: { fontSize: 15, lineHeight: 22, color: colors.textSecondary, ...fonts.regular },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight },
    hostAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    hostName: { fontSize: 15, ...fonts.bold, color: colors.textPrimary },
    hostSub: { fontSize: 13, ...fonts.regular, color: colors.textSecondary },
    bookingHint: { fontSize: 13, color: colors.textSecondary, ...fonts.regular, marginBottom: spacing.sm },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xs },
    stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    stepCount: { fontSize: 20, ...fonts.bold, color: colors.textPrimary, minWidth: 28, textAlign: 'center' },
    stepMax: { fontSize: 13, color: colors.textTertiary, ...fonts.regular },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1 },
    footerTotal: { fontSize: 20, ...fonts.bold, color: colors.textPrimary },
    footerSub: { fontSize: 12, color: colors.textSecondary, ...fonts.regular },
    bookBtn: { paddingVertical: spacing.md + 2, borderRadius: borderRadius.lg, alignItems: 'center' },
    bookText: { fontSize: 16, ...fonts.bold, color: '#fff' },
  });
}

export default ExperienceDetailsScreen;
