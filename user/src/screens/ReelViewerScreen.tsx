import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image as RNImage,
  FlatList, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { useHaptics } from '../hooks/useHaptics';

const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

interface ReelItem { reel: any; property?: any }

export const ReelViewerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { light } = useHaptics();
  const { width, height } = useWindowDimensions();

  const params: any = route.params || {};
  // Accept a list (swipeable) or fall back to a single reel.
  const items: ReelItem[] = params.reels?.length
    ? params.reels
    : [{ reel: params.reel || {}, property: params.property }];
  const startIndex = Math.max(0, Math.min(params.index ?? 0, items.length - 1));
  const [active, setActive] = useState(startIndex);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / height);
    if (i !== active) setActive(i);
  };

  const viewStay = (property: any) => { light(); if (property) navigation.navigate('PropertyDetails', { property, autoBook: true }); };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(it, i) => it.reel?.id ?? String(i)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item, index }) => (
          <ReelPage item={item} width={width} height={height} insets={insets} isActive={index === active} onViewStay={() => viewStay(item.property)} />
        )}
      />

      {/* Close */}
      <TouchableOpacity style={[styles.closeBtn, { top: insets.top + spacing.sm }]} onPress={() => navigation.goBack()} hitSlop={HIT}>
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={[styles.reelTag, { top: insets.top + spacing.sm }]}>
        <Ionicons name="play-circle" size={14} color="#fff" /><Text style={styles.reelTagText}>StayReels</Text>
      </View>
    </View>
  );
};

const ReelPage = ({ item, width, height, insets, isActive, onViewStay }: any) => {
  const reel = item.reel || {};
  const property = item.property;
  const cover = reel.img || reel.thumbnail;
  const hasVideo = !!reel.videoUri;
  const videoRef = useRef<Video>(null);

  return (
    <View style={{ width, height, backgroundColor: '#000' }}>
      {hasVideo ? (
        <Video
          ref={videoRef}
          source={{ uri: reel.videoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
          useNativeControls={false}
        />
      ) : (
        <RNImage source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={styles.topScrim} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.bottomScrim} pointerEvents="none" />

      {/* Side actions */}
      <View style={[styles.sideRail, { bottom: insets.bottom + 170 }]}>
        <TouchableOpacity style={styles.sideBtn} hitSlop={HIT}><Ionicons name="heart-outline" size={26} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} hitSlop={HIT}><Ionicons name="chatbubble-outline" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={styles.sideBtn} hitSlop={HIT}><Ionicons name="share-social-outline" size={24} color="#fff" /></TouchableOpacity>
      </View>

      {/* Bottom info + View stay */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text style={styles.title} numberOfLines={2}>{reel.title}</Text>
        {!!reel.location && (
          <View style={styles.locRow}><Ionicons name="location-outline" size={14} color="#fff" /><Text style={styles.loc}>{reel.location}</Text></View>
        )}
        {!!reel.caption && <Text style={styles.caption} numberOfLines={2}>{reel.caption}</Text>}
        {!!reel.views && <Text style={styles.views}>{reel.views} views</Text>}
        {property && (
          <TouchableOpacity style={styles.stayBtn} activeOpacity={0.9} onPress={onViewStay}>
            <Ionicons name="bed-outline" size={18} color="#111" />
            <Text style={styles.stayText}>View this stay</Text>
            <Ionicons name="arrow-forward" size={16} color="#111" />
          </TouchableOpacity>
        )}
        <View style={styles.swipeHint}><Ionicons name="chevron-up" size={14} color="rgba(255,255,255,0.6)" /><Text style={styles.swipeHintText}>Swipe for more</Text></View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 340 },
  closeBtn: { position: 'absolute', left: spacing.lg, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  reelTag: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 999, zIndex: 10 },
  reelTagText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
  sideRail: { position: 'absolute', right: spacing.lg, gap: spacing.lg, alignItems: 'center' },
  sideBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 0 },
  title: { color: '#fff', fontSize: fontSizes['2xl'], ...fonts.bold },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  loc: { color: 'rgba(255,255,255,0.92)', fontSize: fontSizes.base, ...fonts.regular },
  caption: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.base, lineHeight: 21, marginTop: spacing.sm, ...fonts.regular },
  views: { color: 'rgba(255,255,255,0.7)', fontSize: fontSizes.sm, marginTop: spacing.xs, ...fonts.medium },
  stayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg, paddingVertical: spacing.base, borderRadius: borderRadius.lg, backgroundColor: '#fff' },
  stayText: { color: '#111', fontSize: fontSizes.md, ...fonts.bold },
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.md },
  swipeHintText: { color: 'rgba(255,255,255,0.6)', fontSize: fontSizes.xs, ...fonts.medium },
});

export default ReelViewerScreen;
