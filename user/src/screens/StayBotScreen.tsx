import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import dayjs from 'dayjs';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { spacing, borderRadius, fontSizes, fonts } from '../constants';
import { respond, createContext, resetContext, recommendLive, BotContext } from '../services/stayBotEngine';
import { BotStay, botStayToProperty } from '../data/stays';
import { loadApiKey, setApiKey, getApiKey, isLLMEnabled, getLLMAgentReply, ChatTurn } from '../services/aiProvider';
import { isFeatureEnabled } from '../services/featureFlags';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  suggestions?: BotStay[];
  quickReplies?: string[];
  bookStay?: BotStay;
  rationale?: string;
}

const QUICK_PROMPTS = [
  'Romantic beachfront in Miami for 2',
  'Budget city break under $150',
  'Family cabin with a pool',
  'Aspen ski chalet for 6',
];

export function StayBotScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, medium } = useHaptics();
  const scrollRef = useRef<ScrollView>(null);
  const ctxRef = useRef<BotContext>(createContext());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: "Hello, and welcome aboard! I'm StayBot, your personal travel concierge.\n\nTell me — in your own words — where you'd like to go, your budget, how many guests, and the vibe. I'll find the best matches and you can book right here.",
      quickReplies: QUICK_PROMPTS,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const historyRef = useRef<ChatTurn[]>([]);
  const [smartMode, setSmartMode] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    loadApiKey().then(() => {
      setSmartMode(isLLMEnabled());
      setKeyInput(getApiKey() ?? '');
    });
  }, []);

  const saveKey = async () => {
    await setApiKey(keyInput);
    setSmartMode(isLLMEnabled());
    setShowKeyModal(false);
  };

  const resetPreferences = () => {
    light();
    // Re-create the engine context so all learned slots are cleared.
    ctxRef.current = resetContext();
    setMessages((prev) => [...prev, {
      id: Date.now().toString() + '-reset',
      role: 'bot',
      text: "All set — I've cleared your preferences and we're back to a clean slate! Where would you love to go, and what's the vibe?",
      quickReplies: QUICK_PROMPTS,
    }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const openStay = (stay: BotStay) => {
    light();
    navigation.navigate('PropertyDetails', { property: botStayToProperty(stay) });
  };

  // Turn StayBot's captured "when" (month / "next weekend" / etc.) into a real check-in date.
  const resolveCheckIn = (ctx: BotContext) => {
    const when = (ctx.whenText || '').toLowerCase();
    const today = dayjs();
    if (when === 'tonight') return today;
    if (when === 'tomorrow') return today.add(1, 'day');
    if (when === 'this weekend' || when === 'next weekend') {
      const sat = today.day(6); // Saturday this week
      const base = sat.isAfter(today) ? sat : sat.add(7, 'day');
      return when === 'next weekend' ? base.add(7, 'day') : base;
    }
    if (when === 'next week') return today.add(7, 'day');
    if (when === 'this month') return today.add(3, 'day');
    if (when === 'next month') return today.add(1, 'month').date(12);
    if (ctx.month) {
      const idx = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(ctx.month.toLowerCase());
      if (idx >= 0) {
        let d = today.month(idx).date(12);
        if (!d.isAfter(today)) d = d.add(1, 'year');
        return d;
      }
    }
    return today.add(14, 'day');
  };

  const bookStay = (stay: BotStay) => {
    medium();
    const ctx = ctxRef.current;
    const nights = ctx.nights ?? 3;
    const checkIn = resolveCheckIn(ctx);
    const guests = ctx.guests ?? 2;
    navigation.navigate('Booking', {
      property: botStayToProperty(stay),
      nights,
      checkIn: checkIn.format('MMM D, YYYY'),
      checkOut: checkIn.add(nights, 'day').format('MMM D, YYYY'),
      guests,
      total: stay.price * nights,
    });
  };

  const pushBotMessage = (text: string, reply: ReturnType<typeof respond>['reply']) => {
    setIsTyping(false);
    setMessages((prev) => [...prev, {
      id: Date.now().toString() + '-bot',
      role: 'bot',
      text,
      suggestions: reply.suggestions,
      quickReplies: reply.quickReplies,
      bookStay: reply.action?.type === 'book' ? reply.action.stay : undefined,
      rationale: reply.rationale,
    }]);
    historyRef.current.push({ role: 'assistant', content: text });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // When the bot is recommending stays, pull REAL listings from the backend that
  // match the filled slots (location/guests/price/amenities) and show those
  // first, falling back to the demo set. Otherwise just push the message.
  const enhanceAndPush = (text: string, reply: ReturnType<typeof respond>['reply']) => {
    if (!reply.suggestions || !reply.suggestions.length) { pushBotMessage(text, reply); return; }
    recommendLive(ctxRef.current)
      .then((live) => {
        if (!live.length) { pushBotMessage(text, reply); return; }
        const seen = new Set<string>();
        const merged = [...live, ...reply.suggestions!]
          .filter((s) => { const k = (s.title + s.city).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
          .slice(0, 6);
        pushBotMessage(text, { ...reply, suggestions: merged, rationale: 'Real stays on StayOn matching your location, guests, price and what you asked for.' });
      })
      .catch(() => pushBotMessage(text, reply));
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    medium();
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', text: trimmed }]);
    historyRef.current.push({ role: 'user', content: trimmed });
    setInput('');
    setIsTyping(true);

    // Local NLU engine always runs — it updates context and supplies the real,
    // bookable stay cards + actions (the parts an LLM must not invent).
    const { ctx, reply } = respond(ctxRef.current, trimmed);
    ctxRef.current = ctx;

    if (isLLMEnabled() && isFeatureEnabled('staybot_ai')) {
      // Smart mode: Claude runs as a real agent — it decides what to search for,
      // filters the catalog via tool-use, and replies about the results. The
      // stay cards it chose are shown; falls back to the local engine on error.
      getLLMAgentReply(historyRef.current, ctx)
        .then((agent) => {
          if (agent) {
            const stays = agent.stays.length ? agent.stays : reply.suggestions;
            enhanceAndPush(agent.text, { ...reply, suggestions: stays });
          } else {
            enhanceAndPush(reply.text, reply);
          }
        })
        .catch(() => enhanceAndPush(reply.text, reply));
    } else {
      // Snappy: a brief, natural pause that scales slightly with message length.
      const delay = 220 + Math.min(380, trimmed.length * 7);
      setTimeout(() => enhanceAndPush(reply.text, reply), delay);
    }
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          style={styles.botAvatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={20} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>StayBot</Text>
          <Text style={[styles.headerSub, { color: smartMode ? colors.primary : colors.textTertiary }]}>
            ● {smartMode ? 'Smart AI · Claude' : 'AI Travel Planner'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={resetPreferences}
          style={[styles.keyBtn, { backgroundColor: colors.backgroundSecondary }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Reset preferences"
        >
          <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { light(); setShowKeyModal(true); }}
          style={[styles.keyBtn, { backgroundColor: smartMode ? colors.primary : colors.backgroundSecondary }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={smartMode ? 'Smart AI mode settings' : 'Enable Smart AI mode'}
        >
          <Ionicons name={smartMode ? 'sparkles' : 'key-outline'} size={18} color={smartMode ? '#fff' : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View key={msg.id}>
              <View style={[
                styles.bubble,
                msg.role === 'user' ? styles.userBubble : styles.botBubble,
                {
                  backgroundColor: msg.role === 'user' ? colors.primary : colors.card,
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                },
              ]}>
                <Text style={[
                  styles.bubbleText,
                  { color: msg.role === 'user' ? '#fff' : colors.textPrimary },
                ]}>
                  {String(msg.text ?? '')}
                </Text>
              </View>

              {msg.role === 'bot' && msg.rationale ? (
                <View style={styles.rationaleRow}>
                  <Ionicons name="information-circle-outline" size={13} color={colors.textTertiary} />
                  <Text style={[styles.rationaleText, { color: colors.textTertiary }]}>
                    Why these — {msg.rationale}
                  </Text>
                </View>
              ) : null}

              {Array.isArray(msg.suggestions) && msg.suggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {msg.suggestions.map((s, i) => (
                    <TouchableOpacity
                      key={s?.id ?? i}
                      style={[styles.suggCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => openStay(s)}
                      activeOpacity={0.85}
                    >
                      {typeof s?.image === 'string' && s.image ? (
                        <Image source={{ uri: s.image }} style={styles.suggImg} contentFit="cover" transition={200} />
                      ) : (
                        <View style={[styles.suggImg, { backgroundColor: colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
                        </View>
                      )}
                      <View style={styles.suggInfo}>
                        <Text style={[styles.suggTitle, { color: colors.textPrimary }]} numberOfLines={1}>{String(s?.title ?? 'Stay')}</Text>
                        <Text style={[styles.suggLoc, { color: colors.textTertiary }]} numberOfLines={1}>{String(s?.location ?? '')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                          <Ionicons name="star" size={11} color={colors.gold} />
                          <Text style={[styles.suggSub, { color: colors.textSecondary }]}>{s?.rating ?? '—'} · {format(Number(s?.price) || 0)}/night</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => bookStay(s)} style={styles.suggBook} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Book ${s.title}`}>
                        <LinearGradient colors={[colors.primary, colors.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.suggBookInner}>
                          <Text style={styles.suggBookText}>Book</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {msg.bookStay && (
                <TouchableOpacity onPress={() => bookStay(msg.bookStay!)} activeOpacity={0.9} style={styles.bookCta}>
                  <LinearGradient colors={[colors.primary, colors.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookCtaInner}>
                    <Ionicons name="bag-check-outline" size={17} color="#fff" />
                    <Text style={styles.bookCtaText}>Continue to booking</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {msg.role === 'bot' && Array.isArray(msg.quickReplies) && msg.quickReplies.length > 0 && (
                <View style={styles.quickReplies}>
                  {msg.quickReplies.map((q, i) => (
                    <TouchableOpacity
                      key={`${String(q)}-${i}`}
                      style={[styles.quickReplyChip, { backgroundColor: colors.primarySubtle, borderColor: colors.border }]}
                      onPress={() => sendMessage(String(q ?? ''))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.quickReplyText, { color: colors.primary }]}>{String(q ?? '')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}

          {isTyping && (
            <View style={[styles.bubble, styles.botBubble, { backgroundColor: colors.card, alignSelf: 'flex-start' }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary }]}
            placeholder="Ask StayBot anything..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            accessibilityLabel="Message StayBot"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.primaryUltraLight }]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons name="arrow-up" size={20} color={input.trim() ? '#fff' : colors.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* AI key modal — paste an Anthropic key to enable true open-ended chat */}
      <Modal visible={showKeyModal} transparent animationType="fade" onRequestClose={() => setShowKeyModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHead}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Smart AI mode</Text>
              <TouchableOpacity onPress={() => setShowKeyModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              Paste an Anthropic API key to let StayBot understand free-form questions with Claude. The local planner still finds and books your stays. Your key is stored only on this device.
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.borderLight }]}
              placeholder="sk-ant-..."
              placeholderTextColor={colors.textTertiary}
              value={keyInput}
              onChangeText={setKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={[styles.modalNote, { color: colors.textTertiary }]}>
              Prototype only — a client-side key isn't production-safe. For launch, route this through your own backend.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setKeyInput(''); setApiKey('').then(() => setSmartMode(false)); }} style={styles.modalClear}>
                <Text style={[styles.modalClearText, { color: colors.error }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveKey} activeOpacity={0.9} style={styles.modalSave}>
                <LinearGradient colors={[colors.primary, colors.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalSaveInner}>
                  <Text style={styles.modalSaveText}>{keyInput.trim() ? 'Enable Smart AI' : 'Save'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    botAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: fontSizes.md, ...fonts.bold },
    headerSub: { fontSize: fontSizes.xs, ...fonts.semiBold, marginTop: 1 },
    keyBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
    modalCard: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.md },
    modalHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    modalTitle: { flex: 1, fontSize: fontSizes.lg, ...fonts.bold },
    modalBody: { fontSize: fontSizes.sm, lineHeight: 20 },
    modalInput: { borderRadius: borderRadius.md, borderWidth: 1, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base },
    modalNote: { fontSize: fontSizes.xs, lineHeight: 16 },
    modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.xs },
    modalClear: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    modalClearText: { fontSize: fontSizes.base, ...fonts.semiBold },
    modalSave: { borderRadius: borderRadius.md, overflow: 'hidden' },
    modalSaveInner: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    modalSaveText: { color: '#fff', fontSize: fontSizes.base, ...fonts.bold },
    headerRight: { flex: 1 },
    messages: { flex: 1 },
    messagesContent: { padding: spacing.lg, gap: spacing.sm },
    quickPrompts: { gap: spacing.sm, marginBottom: spacing.base },
    quickLabel: { fontSize: fontSizes.sm, ...fonts.semiBold, marginBottom: spacing.xs },
    quickChip: {
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      borderWidth: 1,
    },
    quickChipText: { fontSize: fontSizes.sm, ...fonts.medium },
    bubble: {
      maxWidth: '80%',
      borderRadius: 18,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      marginVertical: 3,
    },
    userBubble: { borderBottomRightRadius: 4 },
    botBubble: { borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: fontSizes.base, lineHeight: 21 },
    rationaleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 4,
      marginTop: 2,
      marginBottom: 2,
      paddingHorizontal: 2,
      maxWidth: '85%',
    },
    rationaleText: { flex: 1, fontSize: fontSizes.xs, lineHeight: 16, fontStyle: 'italic' },
    suggestions: { gap: spacing.sm, marginTop: spacing.xs, marginBottom: 6 },
    suggCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
      gap: spacing.sm,
      borderWidth: 1,
    },
    suggImg: { width: 52, height: 52, borderRadius: borderRadius.md },
    suggInfo: { flex: 1 },
    suggTitle: { fontSize: fontSizes.sm, ...fonts.bold },
    suggLoc: { fontSize: fontSizes.xs, marginTop: 1 },
    suggSub: { fontSize: fontSizes.sm, marginTop: 2 },
    suggBook: { borderRadius: borderRadius.full, overflow: 'hidden' },
    suggBookInner: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
    suggBookText: { color: '#fff', fontSize: fontSizes.sm, ...fonts.bold },
    bookCta: { borderRadius: borderRadius.md, overflow: 'hidden', marginTop: spacing.xs, alignSelf: 'flex-start' },
    bookCtaInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    bookCtaText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
    quickReplies: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, marginBottom: 6 },
    quickReplyChip: { borderRadius: borderRadius.full, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderWidth: 1 },
    quickReplyText: { fontSize: fontSizes.sm, ...fonts.medium },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: spacing.md,
      gap: spacing.sm,
      borderTopWidth: 1,
    },
    input: {
      flex: 1,
      borderRadius: 22,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      fontSize: fontSizes.base,
      maxHeight: 100,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
