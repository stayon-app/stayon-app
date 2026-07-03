import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { RESOURCE_CATEGORIES, ALL_ARTICLES, type ResourceCategory, type Article, type FlatArticle } from '../data/resources';

type ResView = { kind: 'hub' } | { kind: 'category'; cat: ResourceCategory } | { kind: 'article'; article: Article; category: string; icon: string; image: string };

export function ResourcesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);
  const [view, setView] = useState<ResView>({ kind: 'hub' });
  const [query, setQuery] = useState('');

  const results = useMemo<FlatArticle[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_ARTICLES.filter((a) =>
      a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) || a.body.some((b) => b.toLowerCase().includes(q))
    );
  }, [query]);

  const openArticle = (article: Article, category: string, icon: string, image: string) => { light(); setQuery(''); setView({ kind: 'article', article, category, icon, image }); };

  // ── Article view ───────────────────────────────────────────────────────
  if (view.kind === 'article') {
    const { article, category, icon, image } = view;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={category} onBack={() => setView({ kind: 'hub' })} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
          <View style={styles.hero}>
            <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['rgba(13,148,136,0.45)', 'rgba(15,23,42,0.85)']} style={StyleSheet.absoluteFill} />
            <View style={styles.heroContent}>
              <Ionicons name={icon as any} size={26} color="#fff" />
              <Text style={styles.heroTitle}>{article.title}</Text>
              <Text style={styles.heroRead}>{article.read}</Text>
            </View>
          </View>
          <Text style={styles.articleSummary}>{article.summary}</Text>
          {article.body.map((p, i) => (
            <View key={i} style={styles.para}>
              <View style={styles.bullet} />
              <Text style={styles.paraText}>{p}</Text>
            </View>
          ))}
          <View style={styles.feeNote}>
            <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
            <Text style={styles.feeNoteText}>StayOn is 0% fee for hosts and guests — always.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Category view ──────────────────────────────────────────────────────
  if (view.kind === 'category') {
    const { cat } = view;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={cat.title} onBack={() => setView({ kind: 'hub' })} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
          <Text style={styles.catBlurb}>{cat.blurb}</Text>
          {cat.articles.map((a) => (
            <TouchableOpacity key={a.id} style={styles.articleRow} activeOpacity={0.8} onPress={() => openArticle(a, cat.title, cat.icon, cat.image)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.articleTitle}>{a.title}</Text>
                <Text style={styles.articleRowSummary} numberOfLines={2}>{a.summary}</Text>
                <Text style={styles.articleRead}>{a.read}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Hub view ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Hosting resources" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput} value={query} onChangeText={setQuery}
            placeholder="Search all topics" placeholderTextColor={colors.textTertiary} returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { light(); setQuery(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {query.trim().length > 0 ? (
          // Search results
          <>
            <Text style={styles.resultsCount}>{results.length} result{results.length === 1 ? '' : 's'}</Text>
            {results.map((a) => (
              <TouchableOpacity key={a.id} style={styles.articleRow} activeOpacity={0.8} onPress={() => openArticle(a, a.category, a.categoryIcon, a.categoryImage)}>
                <Image source={{ uri: a.categoryImage }} style={styles.resultThumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultCat}>{a.category}</Text>
                  <Text style={styles.articleTitle}>{a.title}</Text>
                  <Text style={styles.articleRowSummary} numberOfLines={1}>{a.summary}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
            {results.length === 0 && <Text style={styles.empty}>No topics match “{query}”. Try another word.</Text>}
          </>
        ) : (
          // Category grid
          <>
            <Text style={styles.lead}>Guides to help you host with confidence — and keep 100% of what you earn.</Text>
            <View style={styles.grid}>
              {RESOURCE_CATEGORIES.map((c) => (
                <TouchableOpacity key={c.id} style={styles.catCard} activeOpacity={0.88} onPress={() => { light(); setView({ kind: 'category', cat: c }); }}>
                  <Image source={{ uri: c.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <LinearGradient colors={['rgba(15,23,42,0.15)', 'rgba(15,23,42,0.82)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.catCountFloat}><Text style={styles.catCountText}>{c.articles.length}</Text></View>
                  <View style={styles.catCardContent}>
                    <Ionicons name={c.icon as any} size={20} color="#fff" />
                    <Text style={styles.catTitleFloat}>{c.title}</Text>
                    <Text style={styles.catBlurbFloat} numberOfLines={1}>{c.blurb}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base, height: 46, marginBottom: spacing.lg },
    searchInput: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.regular },
    lead: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.base, ...fonts.regular },
    resultsCount: { fontSize: fontSizes.sm, color: colors.textTertiary, marginBottom: spacing.sm, ...fonts.semiBold },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    catCard: { width: '48.5%', height: 132, borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.md, backgroundColor: colors.backgroundSecondary, justifyContent: 'flex-end' },
    catCardContent: { padding: spacing.base, gap: 2 },
    catTitleFloat: { fontSize: fontSizes.base, color: '#fff', marginTop: 2, ...fonts.bold },
    catBlurbFloat: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.85)', ...fonts.regular },
    catCountFloat: { position: 'absolute', top: spacing.sm, right: spacing.sm, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
    catCountText: { fontSize: fontSizes.xs, color: '#fff', ...fonts.bold },
    catBlurb: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.base, ...fonts.regular },
    articleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.sm },
    articleTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    articleRowSummary: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 19, ...fonts.regular },
    articleRead: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 4, ...fonts.medium },
    resultThumb: { width: 48, height: 48, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    resultCat: { fontSize: fontSizes.xs, color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase', ...fonts.bold },
    empty: { fontSize: fontSizes.base, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.xl, ...fonts.regular },
    hero: { height: 150, borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.lg, justifyContent: 'flex-end', backgroundColor: colors.backgroundSecondary },
    heroContent: { padding: spacing.lg, gap: 4 },
    heroTitle: { fontSize: fontSizes.xl, color: '#fff', marginTop: 4, ...fonts.bold },
    heroRead: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.9)', ...fonts.medium },
    articleSummary: { fontSize: fontSizes.md, color: colors.textPrimary, lineHeight: 24, marginBottom: spacing.base, ...fonts.semiBold },
    para: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
    paraText: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, lineHeight: 23, ...fonts.regular },
    feeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.2) },
    feeNoteText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.semiBold },
  });

export default ResourcesScreen;
