// Airbnb-style "Photo tour": a full-screen modal that groups a stay's photos by
// room (with feature lists + grids). Tapping any photo opens a full-screen
// viewer with caption, counter, and horizontal swipe through every photo.

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, FlatList, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { fonts, fontSizes, spacing, borderRadius } from '../constants';
import type { PhotoCategory } from '../utils/photoTour';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: PhotoCategory[];
  colors: any;
  insets: { top: number; bottom: number };
  startIndex?: number; // open straight into the viewer at this flat index
}

export const PhotoTour: React.FC<Props> = ({ visible, onClose, categories, colors, insets, startIndex }) => {
  const styles = makeStyles(colors);
  // flatten every photo with its room title + caption (for the viewer)
  const flat = useMemo(
    () => categories.flatMap((c) => c.photos.map((p) => ({ uri: p.uri, caption: p.caption, title: c.title }))),
    [categories]
  );
  // map a (category, photoIndex) → flat index
  const flatIndexOf = (catIdx: number, photoIdx: number) => {
    let n = 0;
    for (let i = 0; i < catIdx; i++) n += categories[i].photos.length;
    return n + photoIdx;
  };

  const [viewer, setViewer] = useState<number | null>(startIndex ?? null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Tour header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close photo tour">
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Photo tour</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}>
          {/* Top: room preview rail */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {categories.map((c, ci) => (
              <TouchableOpacity key={c.key} style={styles.railCard} activeOpacity={0.9} onPress={() => setViewer(flatIndexOf(ci, 0))}>
                <Image source={{ uri: c.photos[0]?.uri }} style={styles.railImg} contentFit="cover" transition={150} />
                <Text style={styles.railLabel} numberOfLines={1}>{c.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          {/* Per-room sections */}
          {categories.map((c, ci) => {
            const isOpen = expanded[c.key];
            const shown = isOpen ? c.features : c.features.slice(0, 5);
            const more = c.features.length > 5 && !isOpen;
            return (
              <View key={c.key} style={styles.section}>
                <Text style={styles.roomTitle}>{c.title}</Text>
                <Text style={styles.features}>
                  {shown.join('  ·  ')}
                  {more ? '  ·  ' : ''}
                  {more && (
                    <Text style={styles.showMore} onPress={() => setExpanded((p) => ({ ...p, [c.key]: true }))}>Show more</Text>
                  )}
                </Text>
                {/* grid: first photo full-width, rest 2-col */}
                <View style={styles.grid}>
                  {c.photos.map((p, pi) => {
                    const full = pi === 0;
                    return (
                      <TouchableOpacity
                        key={pi}
                        activeOpacity={0.9}
                        style={[styles.cell, full ? styles.cellFull : styles.cellHalf]}
                        onPress={() => setViewer(flatIndexOf(ci, pi))}
                      >
                        <Image source={{ uri: p.uri }} style={styles.cellImg} contentFit="cover" transition={150} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Full-screen viewer */}
      {viewer !== null && (
        <View style={styles.viewer}>
          <View style={[styles.viewerHeader, { paddingTop: insets.top + spacing.sm }]}>
            <TouchableOpacity onPress={() => setViewer(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.viewerTitle} numberOfLines={1}>{flat[viewer]?.title}</Text>
            <Text style={styles.viewerCount}>{viewer + 1}/{flat.length}</Text>
          </View>
          <FlatList
            data={flat}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewer}
            getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => setViewer(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
            renderItem={({ item }) => (
              <View style={styles.slide}>
                <Image source={{ uri: item.uri }} style={styles.slideImg} contentFit="contain" />
              </View>
            )}
          />
          <View style={[styles.caption, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.captionText}>{flat[viewer]?.caption || flat[viewer]?.title}</Text>
          </View>
        </View>
      )}
    </Modal>
  );
};

function makeStyles(colors: any) {
  const gap = spacing.xs;
  const half = (SCREEN_W - spacing.lg * 2 - gap) / 2;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    headerTitle: { fontSize: fontSizes.lg, ...fonts.bold, color: colors.textPrimary },
    rail: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.md },
    railCard: { width: 130, marginRight: spacing.md },
    railImg: { width: 130, height: 96, borderRadius: borderRadius.lg, backgroundColor: colors.backgroundSecondary },
    railLabel: { marginTop: 6, fontSize: fontSizes.sm, ...fonts.medium, color: colors.textPrimary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg },
    section: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
    roomTitle: { fontSize: fontSizes.xl, ...fonts.bold, color: colors.textPrimary, letterSpacing: -0.3 },
    features: { marginTop: 6, marginBottom: spacing.md, fontSize: fontSizes.base, ...fonts.regular, color: colors.textSecondary, lineHeight: 22 },
    showMore: { color: colors.textPrimary, ...fonts.semiBold, textDecorationLine: 'underline' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap },
    cell: { borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.backgroundSecondary },
    cellFull: { width: '100%', height: 230 },
    cellHalf: { width: half, height: half * 0.82 },
    cellImg: { width: '100%', height: '100%' },
    // viewer
    viewer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
    viewerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    viewerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: fontSizes.md, ...fonts.semiBold },
    viewerCount: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, ...fonts.medium },
    slide: { width: SCREEN_W, height: SCREEN_H * 0.66, alignItems: 'center', justifyContent: 'center' },
    slideImg: { width: SCREEN_W, height: '100%' },
    caption: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    captionText: { color: '#fff', fontSize: fontSizes.base, ...fonts.regular, lineHeight: 22 },
  });
}

export default PhotoTour;
