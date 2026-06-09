import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Image, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { spacing, borderRadius, fontSizes, fonts } from '../constants';
import { addReview } from '../data/reviews';
import { addGuestReview } from '../host/data/hostReviews';
import { useAuth } from '../contexts';
import { Api } from '../api';

const CATEGORIES = [
  { id: 'cleanliness', label: 'Cleanliness', icon: 'sparkles-outline' },
  { id: 'accuracy', label: 'Accuracy', icon: 'checkmark-circle-outline' },
  { id: 'communication', label: 'Communication', icon: 'chatbubbles-outline' },
  { id: 'location', label: 'Location', icon: 'location-outline' },
  { id: 'checkin', label: 'Check-in', icon: 'key-outline' },
  { id: 'value', label: 'Value', icon: 'pricetag-outline' },
];

export function WriteReviewScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { light, medium, success } = useHaptics();
  const rawProperty = route?.params?.property ?? {};
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=300&h=200&fit=crop';
  const property = {
    title: typeof rawProperty?.title === 'string' && rawProperty.title ? rawProperty.title : 'Chelsea Townhouse',
    location: typeof rawProperty?.location === 'string' && rawProperty.location ? rawProperty.location : 'London, UK',
    image: typeof rawProperty?.image === 'string' && rawProperty.image ? rawProperty.image : FALLBACK_IMAGE,
  };

  const [ratings, setRatings] = useState<Record<string, number>>({
    cleanliness: 0, accuracy: 0, communication: 0, location: 0, checkin: 0, value: 0,
  });
  const [reviewText, setReviewText] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const setRating = (cat: string, value: number) => {
    light();
    setRatings((prev) => ({ ...prev, [cat]: value }));
  };

  const overallRating = Object.values(ratings).filter((r) => r > 0).length
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).filter((r) => r > 0).length).toFixed(1)
    : '0.0';

  const allRated = Object.values(ratings).every((r) => r > 0);
  const canSubmit = allRated && reviewText.trim().length >= 10 && wouldRecommend !== null;

  const handleSubmit = async () => {
    success();
    const propertyId = String(rawProperty?.id ?? '');
    if (propertyId) {
      await addReview({
        propertyId,
        author: 'You',
        rating: Number(overallRating) || 0,
        text: reviewText.trim(),
        wouldRecommend: wouldRecommend ?? undefined,
      });
    }
    // Bridge: surface this review in the host's Reviews tab too (local).
    try {
      await addGuestReview({
        guestName: user?.name || 'Guest',
        listingTitle: property.title,
        rating: Number(overallRating) || 0,
        text: reviewText.trim(),
      });
    } catch { /* host store unavailable — ignore */ }
    // Backend: attach to the real booking so the host sees it cross-device.
    const bookingCode = route?.params?.bookingCode;
    if (bookingCode) {
      try {
        await Api.auth.ensureSession(user?.name);
        await Api.reviews.create({ bookingCode, rating: Number(overallRating) || 0, text: reviewText.trim() });
      } catch { /* backend offline / local-only booking — ignore */ }
    }
    Alert.alert(
      'Review Submitted!',
      'Thank you for sharing your experience. You earned 25 StayCoins!',
      [{ text: 'Done', onPress: () => navigation.goBack() }]
    );
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Write a Review</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Property */}
          <View style={[styles.propertyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: property.image }} style={styles.propertyImg} resizeMode="cover" />
            <View style={styles.propertyInfo}>
              <Text style={[styles.propertyTitle, { color: colors.textPrimary }]}>{property.title}</Text>
              <Text style={[styles.propertyLocation, { color: colors.textSecondary }]}>{property.location}</Text>
              {Number(overallRating) > 0 && (
                <View style={styles.overallRow}>
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <Text style={[styles.overallText, { color: colors.textPrimary }]}>{overallRating} overall</Text>
                </View>
              )}
            </View>
          </View>

          {/* Category ratings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rate your experience</Text>
            {CATEGORIES.map((cat) => (
              <View key={cat.id} style={[styles.ratingRow, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.ratingLabel}>
                  <Ionicons name={cat.icon as any} size={18} color={colors.primary} />
                  <Text style={[styles.ratingLabelText, { color: colors.textPrimary }]}>{cat.label}</Text>
                </View>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(cat.id, star)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <Ionicons
                        name={ratings[cat.id] >= star ? 'star' : 'star-outline'}
                        size={24}
                        color={ratings[cat.id] >= star ? colors.gold : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Written review */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tell us more</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Share details about your stay to help future travelers (min 10 characters)
            </Text>
            <TextInput
              style={[styles.reviewInput, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.borderLight }]}
              placeholder="What did you love? What could be better?"
              placeholderTextColor={colors.textTertiary}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>{reviewText.length} characters</Text>
          </View>

          {/* Recommend */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Would you recommend this place?</Text>
            <View style={styles.recommendRow}>
              <TouchableOpacity
                style={[
                  styles.recommendBtn,
                  { borderColor: wouldRecommend === true ? colors.primary : colors.borderLight, backgroundColor: wouldRecommend === true ? colors.primarySubtle : colors.card },
                ]}
                onPress={() => { medium(); setWouldRecommend(true); }}
              >
                <Ionicons name="thumbs-up" size={22} color={wouldRecommend === true ? colors.primary : colors.textTertiary} />
                <Text style={[styles.recommendText, { color: wouldRecommend === true ? colors.primary : colors.textSecondary }]}>Yes, I'd recommend</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.recommendBtn,
                  { borderColor: wouldRecommend === false ? colors.error : colors.borderLight, backgroundColor: wouldRecommend === false ? '#FEF2F2' : colors.card },
                ]}
                onPress={() => { medium(); setWouldRecommend(false); }}
              >
                <Ionicons name="thumbs-down" size={22} color={wouldRecommend === false ? colors.error : colors.textTertiary} />
                <Text style={[styles.recommendText, { color: wouldRecommend === false ? colors.error : colors.textSecondary }]}>Not really</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Add photos */}
          <View style={styles.section}>
            <TouchableOpacity style={[styles.addPhotoBtn, { borderColor: colors.borderLight }]} onPress={() => light()}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={[styles.addPhotoText, { color: colors.primary }]}>Add photos (optional)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Submit */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <View style={styles.coinHint}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={[styles.coinHintText, { color: colors.textSecondary }]}>Earn 25 StayCoins for your review</Text>
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.primary : colors.primaryUltraLight }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={[styles.submitText, { color: canSubmit ? '#fff' : colors.primary }]}>Submit Review</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    title: { fontSize: fontSizes.lg, ...fonts.bold },
    propertyCard: {
      flexDirection: 'row', margin: spacing.lg, borderRadius: borderRadius.lg, padding: spacing.md,
      borderWidth: 1, gap: spacing.md,
    },
    propertyImg: { width: 70, height: 70, borderRadius: borderRadius.md },
    propertyInfo: { flex: 1, justifyContent: 'center' },
    propertyTitle: { fontSize: fontSizes.base, ...fonts.bold },
    propertyLocation: { fontSize: fontSizes.sm, marginTop: 2 },
    overallRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 6 },
    overallText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
    sectionTitle: { fontSize: fontSizes.md, ...fonts.bold, marginBottom: 6 },
    sectionSub: { fontSize: fontSizes.sm, marginBottom: spacing.md, lineHeight: 18 },
    ratingRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: spacing.md, borderBottomWidth: 1,
    },
    ratingLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    ratingLabelText: { fontSize: fontSizes.sm, ...fonts.medium },
    stars: { flexDirection: 'row', gap: spacing.xs },
    reviewInput: {
      borderRadius: borderRadius.md, padding: spacing.base, fontSize: fontSizes.base, borderWidth: 1,
      minHeight: 120, marginTop: spacing.sm,
    },
    charCount: { fontSize: fontSizes.sm, textAlign: 'right', marginTop: 6 },
    recommendRow: { flexDirection: 'row', gap: spacing.md },
    recommendBtn: {
      flex: 1, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.base,
      borderRadius: borderRadius.lg, borderWidth: 1.5,
    },
    recommendText: { fontSize: fontSizes.sm, ...fonts.semiBold, textAlign: 'center' },
    addPhotoBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
      paddingVertical: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1.5, borderStyle: 'dashed',
    },
    addPhotoText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    footer: { padding: spacing.lg, borderTopWidth: 1, gap: spacing.sm },
    coinHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    coinHintText: { fontSize: fontSizes.sm },
    submitBtn: { paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    submitText: { fontSize: fontSizes.md, ...fonts.bold },
  });
}
