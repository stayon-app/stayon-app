import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { EmptyState } from '../components/common';
import { getThreads, getPinned, togglePin, needsReply, type Thread } from '../data/messages';

type Filter = 'all' | 'unread' | 'reply';

export function InboxScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, selection } = useHaptics();
  const styles = makeStyles(colors);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      Promise.all([getThreads(), getPinned()]).then(([t, p]) => {
        if (!active) return;
        setThreads(t);
        setPinned(new Set(p));
      });
      return () => { active = false; };
    }, [])
  );

  const onPin = async (id: string) => { selection(); setPinned(new Set(await togglePin(id))); };

  const unreadCount = threads.filter((t) => t.unread > 0).length;
  const replyCount = threads.filter((t) => needsReply(t)).length;

  const q = query.trim().toLowerCase();
  const searchOf = (t: Thread) =>
    q === '' ||
    t.guestName.toLowerCase().includes(q) ||
    t.listingTitle.toLowerCase().includes(q) ||
    (t.messages[t.messages.length - 1]?.text ?? '').toLowerCase().includes(q);
  const filterOf = (t: Thread) => filter === 'all' ? true : filter === 'unread' ? t.unread > 0 : needsReply(t);
  const matches = (t: Thread) => filterOf(t) && searchOf(t);
  const visible = threads.filter(matches);
  const pinnedThreads = visible.filter((t) => pinned.has(t.id));
  const otherThreads = visible.filter((t) => !pinned.has(t.id));

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'reply', label: 'Needs reply', count: replyCount },
  ];

  const Row = ({ t }: { t: Thread }) => {
    const reply = needsReply(t);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('Chat', { id: t.id }); }}>
        <View>
          <Image source={{ uri: t.guestAvatar }} style={styles.avatar} contentFit="cover" />
          {t.online && <View style={styles.online} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <Text style={[styles.name, t.unread > 0 && { ...fonts.bold }]} numberOfLines={1}>{t.guestName}</Text>
            <Text style={styles.time}>{t.lastTime}</Text>
          </View>
          <Text style={styles.listing} numberOfLines={1}>{t.listingTitle}</Text>
          <View style={styles.previewRow}>
            <Text style={[styles.preview, t.unread > 0 && { color: colors.textPrimary, ...fonts.semiBold }]} numberOfLines={1}>
              {t.messages[t.messages.length - 1]?.text}
            </Text>
            {reply && <View style={styles.replyTag}><Text style={styles.replyTagText}>Reply</Text></View>}
          </View>
        </View>
        <View style={styles.rightCol}>
          <TouchableOpacity onPress={() => onPin(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={pinned.has(t.id) ? 'bookmark' : 'bookmark-outline'} size={18} color={pinned.has(t.id) ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
          {t.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{t.unread}</Text></View>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => { light(); navigation.navigate('ScheduledMessages'); }} accessibilityLabel="Scheduled messages">
          <Ionicons name="time-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search guests, stays or messages"
          placeholderTextColor={colors.textTertiary}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity key={f.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => { selection(); setFilter(f.key); }}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              {!!f.count && f.count > 0 && (
                <View style={[styles.filterBadge, active && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.filterBadgeText, active && { color: '#fff' }]}>{f.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {threads.length === 0 ? (
        <EmptyState illustration="messages" icon="chatbubbles-outline" title="No messages yet" message="Conversations with your guests will show up here." />
      ) : visible.length === 0 ? (
        <EmptyState illustration="generic" icon="checkmark-done-outline" title="All caught up" message="No conversations match this filter." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.sm }}>
          {pinnedThreads.length > 0 && (
            <>
              <View style={styles.sectionRow}><Ionicons name="bookmark" size={13} color={colors.primary} /><Text style={styles.section}>Pinned</Text></View>
              {pinnedThreads.map((t) => <Row key={t.id} t={t} />)}
              {otherThreads.length > 0 && <Text style={[styles.section, { marginTop: spacing.sm }]}>All conversations</Text>}
            </>
          )}
          {otherThreads.map((t) => <Row key={t.id} t={t} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
    headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, ...shadows.card },
    title: { fontSize: fontSizes['3xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, ...fonts.bold },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    searchInput: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, paddingVertical: 2 },
    filterScroll: { flexGrow: 0, flexShrink: 0 },
    filterRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: 'center' },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: spacing.md, borderRadius: 17, backgroundColor: colors.card, ...shadows.card },
    filterChipActive: { backgroundColor: withOpacity(colors.primary, 0.12) },
    filterText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    filterTextActive: { color: colors.primary },
    filterBadge: { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
    filterBadgeText: { fontSize: 10, color: colors.textSecondary, ...fonts.bold },
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    section: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.bold },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.backgroundSecondary },
    online: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: colors.card },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    name: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    time: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.medium },
    listing: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
    preview: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.regular },
    replyTag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, backgroundColor: withOpacity(colors.warning, 0.15) },
    replyTagText: { fontSize: 10, color: colors.warning, ...fonts.bold },
    rightCol: { alignItems: 'center', gap: spacing.sm },
    badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    badgeText: { fontSize: 11, color: '#fff', ...fonts.bold },
  });

export default InboxScreen;
