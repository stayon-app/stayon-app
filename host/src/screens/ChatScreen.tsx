import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { getThreads, sendHostMessage, markRead, type Thread } from '../data/messages';
import { getReservations } from '../data/reservations';
import { inspectMessage } from '../utils/contentGuard';

const QUICK = ['Looking forward to your stay!', 'Thanks — please reach out anytime', 'Let me check and get back to you'];

// Context-aware quick replies based on the guest's last message.
function smartReplies(lastGuestText: string | undefined, confirmed: boolean): string[] {
  const t = (lastGuestText || '').toLowerCase();
  const has = (...k: string[]) => k.some((w) => t.includes(w));
  const out: string[] = [];
  if (has('check', 'arrive', 'arrival', 'early', 'late')) out.push(confirmed ? 'I’ll send full check‑in details a day before.' : 'Self check‑in is easy — details come once it’s confirmed.');
  if (has('pool', 'wifi', 'parking', 'kitchen', 'ac', 'heating', 'amenit')) out.push('Yes, that’s available — anything else you need?');
  if (has('available', 'free', 'dates', 'book')) out.push('Yes, those dates are open — happy to host you!');
  if (has('price', 'discount', 'cost', 'cheaper', 'deal')) out.push('I can look at a small discount for a longer stay.');
  if (has('pet', 'dog', 'cat')) out.push('Let me know about pets and I’ll confirm the policy.');
  if (has('thank', 'great', 'perfect', 'awesome')) out.push('You’re very welcome! 😊');
  while (out.length < 3) { const q = QUICK[out.length % QUICK.length]; if (!out.includes(q)) out.push(q); else break; }
  return out.slice(0, 3);
}

export function ChatScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { light, medium } = useHaptics();
  const styles = makeStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const id = route?.params?.id;
  const [thread, setThread] = useState<Thread | null>(null);
  const [input, setInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getThreads().then((all) => { if (active) setThread(all.find((t) => t.id === id) ?? null); });
      markRead(id);
      return () => { active = false; };
    }, [id])
  );

  // A thread can share contact details once the guest's booking is confirmed.
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      Promise.all([getThreads(), getReservations()]).then(([threads, res]) => {
        if (!active) return;
        const th = threads.find((t) => t.id === id);
        const booked = res.some(
          (r) => r.guestName === th?.guestName && (r.status === 'confirmed' || r.status === 'completed')
        );
        setConfirmed(booked);
      });
      return () => { active = false; };
    }, [id])
  );

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || !id) return;
    // Block contact info until the booking is confirmed.
    if (!confirmed) {
      const verdict = inspectMessage(t);
      if (verdict.blocked) {
        setWarning(verdict.message ?? 'This can’t be shared until the booking is confirmed.');
        return;
      }
    }
    setWarning(null);
    medium();
    setInput('');
    const all = await sendHostMessage(id, t);
    setThread(all.find((x) => x.id === id) ?? null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={thread?.guestName ?? 'Chat'} subtitle={thread?.listingTitle} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {thread?.messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.sender === 'host' ? styles.host : styles.guest, { alignSelf: m.sender === 'host' ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.text, { color: m.sender === 'host' ? '#fff' : colors.textPrimary }]}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Smart replies (context-aware) */}
        <View style={styles.smartHead}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
          <Text style={styles.smartLabel}>Suggested replies</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={styles.quickWrap}>
          {smartReplies(thread?.messages.filter((m) => m.sender === 'guest').slice(-1)[0]?.text, confirmed).map((q, i) => (
            <TouchableOpacity key={i} style={styles.quick} onPress={() => { light(); send(q); }}><Text style={styles.quickText}>{q}</Text></TouchableOpacity>
          ))}
        </ScrollView>

        {/* Contact-info warning (pre-booking) */}
        {warning && (
          <View style={styles.warnBar}>
            <Ionicons name="shield-half-outline" size={16} color={colors.warning} />
            <Text style={styles.warnText}>{warning}</Text>
            <TouchableOpacity onPress={() => setWarning(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput style={styles.input} placeholder="Message…" placeholderTextColor={colors.textTertiary} value={input} onChangeText={(t) => { setInput(t); if (warning) setWarning(null); }} onSubmitEditing={() => send(input)} returnKeyType="send" multiline />
          <TouchableOpacity style={[styles.send, { backgroundColor: input.trim() ? colors.primary : colors.primaryUltraLight }]} onPress={() => send(input)} disabled={!input.trim()}>
            <Ionicons name="arrow-up" size={20} color={input.trim() ? '#fff' : colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.safe}>
          {confirmed
            ? 'Keep communication on StayOn to keep payments secure.'
            : 'Phone numbers & addresses are hidden until the booking is confirmed — for everyone’s safety.'}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
    host: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
    guest: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderBottomLeftRadius: 6 },
    text: { fontSize: fontSizes.base, lineHeight: 21, ...fonts.regular },
    quickScroll: { flexGrow: 0, flexShrink: 0 },
    smartHead: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg, paddingBottom: 4 },
    smartLabel: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.semiBold },
    quickWrap: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: 'center' },
    quick: { height: 32, justifyContent: 'center', paddingHorizontal: spacing.base, borderRadius: 16, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.25) },
    quickText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.semiBold },
    warnBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.goldLight, borderWidth: 1, borderColor: withOpacity(colors.warning, 0.35) },
    warnText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 18, ...fonts.medium },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
    input: { flex: 1, backgroundColor: colors.backgroundSecondary, borderRadius: 22, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, fontSize: fontSizes.base, color: colors.textPrimary, maxHeight: 100 },
    send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    safe: { fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.sm, ...fonts.regular },
  });

export default ChatScreen;
