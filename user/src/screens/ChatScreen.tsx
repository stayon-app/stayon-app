import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { Skeleton } from '../components/common/SkeletonLoader';
import { withOpacity } from '../utils/color';
import { getBookings } from '../data/bookings';
import { inspectMessage } from '../utils/contentGuard';
import { useAuth } from '../contexts';
import { getOrCreateThread, getThreadById, sendGuestMessage, type Thread } from '../host/data/messages';
import { Api } from '../api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'host';
  timestamp: Date;
}

interface ChatScreenParams {
  hostId: string;
  hostName: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string;
  listingId?: string; // backend listing id (l_…) → cross-device chat
}

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { light } = useHaptics();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const { user } = useAuth();
  const params = route.params as ChatScreenParams;

  const [isLoading, setIsLoading] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // backend listing id (l_…) → use the server for real cross-device chat
  const beListingId =
    typeof params?.listingId === 'string' && params.listingId.startsWith('l_') ? params.listingId : null;

  // Map a shared thread's messages into the local bubble shape.
  const mapThread = (t: Thread): Message[] =>
    t.messages.map((m) => ({ id: m.id, text: m.text, sender: m.sender === 'guest' ? 'user' : 'host', timestamp: new Date() }));
  const mapBackend = (arr: any[]): Message[] =>
    (arr || []).map((m) => ({ id: m.id, text: m.text, sender: m.sender === 'guest' ? 'user' : 'host', timestamp: new Date(m.createdAt || Date.now()) }));

  // Open (or create) the SHARED thread for this listing, so the host sees the
  // same conversation in their inbox. Reload on focus to pick up host replies.
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        // Backend path — real cross-device chat for backend listings.
        if (beListingId) {
          try {
            await Api.auth.ensureSession(user?.name);
            const t = threadId ? { id: threadId } : await Api.threads.open(beListingId);
            const r = await Api.threads.messages(t.id);
            if (!active) return;
            setThreadId(t.id);
            setMessages(mapBackend(r.items));
            return;
          } catch {
            // backend offline — fall back to local store below
          }
        }
        const t = threadId
          ? await getThreadById(threadId)
          : await getOrCreateThread({ listingTitle: params?.propertyTitle || 'your stay', guestName: user?.name || 'Guest' });
        if (!active || !t) return;
        setThreadId(t.id);
        setMessages(mapThread(t));
      })();
      return () => { active = false; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params?.propertyTitle, threadId])
  );

  const [inputText, setInputText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Brief skeleton on mount so the thread never flashes blank.
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // Contact details can be shared once this property's booking is confirmed
  // (any non-cancelled booking for the same property counts as confirmed).
  useEffect(() => {
    let active = true;
    getBookings().then((bks) => {
      if (!active) return;
      const title = params?.propertyTitle;
      setConfirmed(bks.some((b) => b.property === title && b.status !== 'cancelled'));
    });
    return () => { active = false; };
  }, [params?.propertyTitle]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !threadId) return;
    // Block contact info until the booking is confirmed.
    if (!confirmed) {
      const verdict = inspectMessage(text);
      if (verdict.blocked) {
        setWarning(verdict.message ?? 'This can’t be shared until the booking is confirmed.');
        return;
      }
    }
    setWarning(null);
    light();
    // Backend path — send via the server (host sees it on any device).
    if (beListingId && threadId) {
      try {
        await Api.threads.send(threadId, text);
        setInputText('');
        const m = await Api.threads.messages(threadId);
        setMessages(mapBackend(m.items));
        setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
      } catch (e: any) {
        if (e?.code === 'CONTACT_BLOCKED') { setWarning(e.message); return; }
        // other error — keep the text so the user can retry
      }
      return;
    }
    setInputText('');
    // Local shared thread fallback — host sees it in their inbox as unread.
    const all = await sendGuestMessage(threadId, text);
    const t = all.find((x) => x.id === threadId);
    if (t) setMessages(mapThread(t));
    setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
  };

  const formatTime = (date: Date) => {
    const d = date instanceof Date ? date : new Date(date as any);
    if (!d || isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageBubble, isUser ? styles.userMessage : styles.hostMessage]}>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {String(item.text ?? '')}
        </Text>
        <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <View style={styles.hostAvatar}>
            <Ionicons name="person" size={20} color={colors.textTertiary} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {params?.hostName || 'Host'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {params?.propertyTitle || 'Property'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.infoButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Conversation info"
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      {isLoading ? (
        <View style={styles.messagesContainer}>
          <View style={[styles.skeletonBubble, styles.userMessage]}>
            <Skeleton width={180} height={14} borderRadius={6} />
          </View>
          <View style={[styles.skeletonBubble, styles.hostMessage]}>
            <Skeleton width={210} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
            <Skeleton width={120} height={14} borderRadius={6} />
          </View>
          <View style={[styles.skeletonBubble, styles.userMessage]}>
            <Skeleton width={140} height={14} borderRadius={6} />
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input Bar */}
      <View style={[styles.inputContainer, { paddingBottom: spacing.base + insets.bottom }]}>
        {warning && (
          <View style={styles.warnBar}>
            <Ionicons name="shield-half-outline" size={16} color={colors.warning} />
            <Text style={styles.warnText}>{warning}</Text>
            <TouchableOpacity onPress={() => setWarning(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={(t) => { setInputText(t); if (warning) setWarning(null); }}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? colors.background : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.inputHint}>
          {confirmed
            ? 'Keep communication on StayOn to ensure secure payments'
            : 'Phone numbers & addresses stay hidden until your booking is confirmed'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.background,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  messagesContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  skeletonBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    opacity: 0.6,
  },
  userMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  hostMessage: {
    backgroundColor: colors.backgroundSecondary,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.background,
  },
  messageTime: {
    fontSize: fontSizes.xs,
    ...fonts.regular,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textPrimary,
    maxHeight: 100,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.backgroundSecondary,
  },
  inputHint: {
    fontSize: fontSizes.xs,
    ...fonts.regular,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  warnBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: withOpacity(colors.warning, 0.35),
  },
  warnText: {
    flex: 1,
    fontSize: fontSizes.sm,
    ...fonts.medium,
    color: colors.textPrimary,
    lineHeight: 18,
  },
});
