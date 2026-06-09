import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { Skeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common';
import { fontSizes, fonts, spacing, borderRadius, lineHeights } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

export const MessagesScreen: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { light } = useHaptics();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const styles = makeStyles(colors);

  // Brief skeleton on mount so the list never flashes blank.
  const loadConversations = React.useCallback(() => {
    setLoadError(false);
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cleanup = loadConversations();
    return cleanup;
  }, [loadConversations]);

  // Check if we need to open a chat automatically (coming from PropertyDetailsScreen)
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.hostId && route.params?.propertyId) {
        // Navigate to chat screen with the params
        setTimeout(() => {
          navigation.navigate('Chat', {
            hostId: route.params.hostId,
            hostName: route.params.hostName || 'Host',
            propertyId: route.params.propertyId,
            propertyTitle: route.params.propertyTitle || 'Property',
          });
          // Clear params after navigation
          navigation.setParams({
            hostId: undefined,
            propertyId: undefined,
            hostName: undefined,
            propertyTitle: undefined,
          });
        }, 100);
      }
    }, [route.params])
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.authPrompt}>
          <Ionicons name="chatbubbles-outline" size={80} color={colors.textTertiary} />
          <Text style={styles.authPromptTitle}>Log in to see your messages</Text>
          <Text style={styles.authPromptText}>
            Once you log in, you'll be able to contact hosts and manage your conversations
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.authButtonWrap}
            onPress={() => navigation.navigate('Auth')}
          >
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.authButton}>
              <Text style={styles.authButtonText}>Log in or Sign up</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const conversations = [
    {
      id: '1', hostId: 'host1', hostName: 'Alex Morgan', superhost: true,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
      propertyId: 'prop1', propertyTitle: 'Manhattan Luxury Loft',
      lastMessage: 'Your access code is 4829. Welcome to NYC!',
      timestamp: '2m ago', unread: 2, online: true,
    },
    {
      id: '2', hostId: 'host2', hostName: 'Sarah Chen', superhost: true,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
      propertyId: 'prop2', propertyTitle: 'Malibu Beachfront Villa',
      lastMessage: 'Check-in is at 3 PM. The beach gate code is 1122.',
      timestamp: '1h ago', unread: 0, online: true,
    },
    {
      id: '3', hostId: 'host3', hostName: 'James Wilson', superhost: false,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
      propertyId: 'prop3', propertyTitle: 'Chelsea Townhouse',
      lastMessage: 'Thanks for staying! Hope you enjoyed London.',
      timestamp: '2d ago', unread: 0, online: false,
    },
    {
      id: '4', hostId: 'host4', hostName: 'Emma Dubois', superhost: true,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop',
      propertyId: 'prop4', propertyTitle: 'Le Marais Parisian Flat',
      lastMessage: 'Bonjour! Let me know if you need restaurant recommendations.',
      timestamp: '5d ago', unread: 0, online: false,
    },
  ];

  const filtered = conversations.filter((c) =>
    !search || c.hostName.toLowerCase().includes(search.toLowerCase()) ||
    c.propertyTitle.toLowerCase().includes(search.toLowerCase())
  );
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const handleConversationPress = (conv: typeof conversations[0]) => {
    light();
    navigation.navigate('Chat', {
      hostId: conv.hostId,
      hostName: conv.hostName,
      propertyId: conv.propertyId,
      propertyTitle: conv.propertyTitle,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        {navigation.canGoBack() && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Messages{totalUnread > 0 ? ` (${totalUnread})` : ''}</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search messages"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={56} height={56} borderRadius={28} />
              <View style={styles.skeletonInfo}>
                <Skeleton width="45%" height={15} style={{ marginBottom: 8 }} />
                <Skeleton width="70%" height={13} style={{ marginBottom: 8 }} />
                <Skeleton width="85%" height={13} />
              </View>
            </View>
          ))
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Couldn't load messages</Text>
            <Text style={styles.emptyText}>Something went wrong. Please try again.</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.retryWrap}
              onPress={() => { light(); loadConversations(); }}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : filtered.length > 0 ? (
          filtered.map((conv) => (
            <TouchableOpacity
              key={conv.id}
              style={styles.conversationCard}
              onPress={() => handleConversationPress(conv)}
              activeOpacity={0.7}
            >
              <View>
                <Image source={{ uri: conv.avatar }} style={styles.avatar} />
                {conv.online && <View style={styles.onlineDot} />}
              </View>
              <View style={styles.conversationInfo}>
                <View style={styles.conversationHeader}>
                  <View style={styles.nameRow}>
                    <Text style={styles.hostName}>{conv.hostName}</Text>
                    {conv.superhost && <Ionicons name="ribbon" size={13} color={colors.gold} />}
                  </View>
                  <Text style={styles.timestamp}>{conv.timestamp}</Text>
                </View>
                <Text style={styles.propertyName} numberOfLines={1}>{conv.propertyTitle}</Text>
                <Text style={[styles.lastMessage, conv.unread > 0 && styles.lastMessageUnread]} numberOfLines={1}>
                  {conv.lastMessage}
                </Text>
              </View>
              {conv.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{conv.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : search ? (
          <EmptyState
            icon="search-outline"
            title="No messages found"
            message="Try a different name or property to find your conversation."
          />
        ) : (
          <EmptyState
            icon="chatbubbles-outline"
            title="No messages yet"
            message="When you contact hosts, your conversations will show up here. Start by exploring a stay."
            actionLabel="Explore stays"
            onAction={() => navigation.navigate('Main', { screen: 'ExploreTab' })}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
    backBtn: { width: 40, height: 40, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center', marginLeft: -spacing.sm },
    headerTitle: { fontSize: fontSizes['2xl'], ...fonts.bold, color: colors.textPrimary, letterSpacing: -0.5 },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginHorizontal: spacing.lg, marginBottom: spacing.sm,
      paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    },
    searchInput: { flex: 1, fontSize: fontSizes.base },
    scrollView: { flex: 1 },
    content: { paddingBottom: 100 },
    conversationCard: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
      borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    avatar: { width: 56, height: 56, borderRadius: 28, marginRight: spacing.md, backgroundColor: colors.backgroundSecondary },
    onlineDot: {
      position: 'absolute', bottom: 0, right: spacing.md,
      width: 14, height: 14, borderRadius: 7,
      backgroundColor: '#10B981', borderWidth: 2, borderColor: colors.background,
    },
    conversationInfo: { flex: 1 },
    conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    hostName: { fontSize: fontSizes.base, ...fonts.bold, color: colors.textPrimary },
    timestamp: { fontSize: fontSizes.xs, color: colors.textTertiary },
    propertyName: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: 3 },
    lastMessage: { fontSize: fontSizes.sm, color: colors.textTertiary },
    lastMessageUnread: { ...fonts.bold, color: colors.textPrimary },
    unreadBadge: {
      minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
      backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm,
    },
    unreadCount: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: spacing['2xl'] },
    emptyTitle: { fontSize: fontSizes.xl, ...fonts.bold, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
    emptyText: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center', lineHeight: lineHeights.md },
    retryWrap: { borderRadius: borderRadius.lg, overflow: 'hidden', marginTop: spacing.xl },
    retryBtn: { paddingHorizontal: spacing['2xl'], paddingVertical: spacing.base },
    retryText: { fontSize: fontSizes.base, ...fonts.bold, color: '#FFFFFF' },
    skeletonRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
      borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    skeletonInfo: { flex: 1 },
    authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
    authPromptTitle: { fontSize: fontSizes['2xl'], ...fonts.bold, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, letterSpacing: -0.5 },
    authPromptText: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: lineHeights.md },
    authButtonWrap: { borderRadius: borderRadius.lg, overflow: 'hidden' },
    authButton: { paddingHorizontal: spacing['2xl'], paddingVertical: spacing.base, borderRadius: borderRadius.lg },
    authButtonText: { fontSize: fontSizes.base, ...fonts.bold, color: '#FFFFFF' },
  });
}
