import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { getThreads, sendHostMessage, markRead, type Thread } from '../data/messages';
import { Api } from '../../api';
import { getReservations } from '../data/reservations';
import { getTemplates, addTemplate, deleteTemplate, fillTemplate, type SavedMessage } from '../data/savedMessages';
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
  const [savedOpen, setSavedOpen] = useState(false);
  const [templates, setTemplates] = useState<SavedMessage[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [adding, setAdding] = useState(false);
  const [isBackend, setIsBackend] = useState(false);

  const loadBackendMsgs = async () => {
    const r: any = await Api.threads.messages(id);
    return (r?.items || []).map((m: any) => ({ id: String(m.id), sender: m.sender, text: m.text, time: '' }));
  };

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const all = await getThreads();
        const local = all.find((t) => t.id === id);
        if (local) { if (active) { setThread(local); setIsBackend(false); } markRead(id); return; }
        // Not local → a REAL backend thread from the synced inbox. Load it.
        try {
          await Api.auth.ensureSession();
          const messages = await loadBackendMsgs();
          if (active) {
            setThread({ id, guestName: route?.params?.guestName || 'Guest', guestAvatar: route?.params?.guestAvatar || '', listingTitle: route?.params?.listingTitle || '', online: false, unread: 0, lastTime: '', messages });
            setIsBackend(true);
          }
        } catch { if (active) setThread(null); }
      })();
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

  const openSaved = async () => { light(); setSavedOpen(true); setTemplates(await getTemplates()); };
  const useTemplate = (t: SavedMessage) => { light(); setInput(fillTemplate(t.body, thread?.guestName)); setSavedOpen(false); };
  const saveNew = async () => { if (!newBody.trim()) return; setTemplates(await addTemplate(newTitle, newBody)); setNewTitle(''); setNewBody(''); setAdding(false); };
  const removeTemplate = async (id: string) => setTemplates(await deleteTemplate(id));

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
    if (isBackend) {
      // Real backend thread → send to the server so the guest receives it.
      try {
        await Api.auth.ensureSession();
        await Api.threads.send(id, t);
        const messages = await loadBackendMsgs();
        setThread((prev) => (prev ? { ...prev, messages } : prev));
      } catch { /* offline */ }
    } else {
      const all = await sendHostMessage(id, t);
      setThread(all.find((x) => x.id === id) ?? null);
    }
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
          {smartReplies((thread?.messages ?? []).filter((m) => m.sender === 'guest').slice(-1)[0]?.text, confirmed).map((q, i) => (
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
          <TouchableOpacity style={styles.savedBtn} onPress={openSaved} accessibilityLabel="Saved replies">
            <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
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

      {/* Saved replies sheet */}
      <Modal visible={savedOpen} transparent animationType="slide" onRequestClose={() => setSavedOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSavedOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Saved replies</Text>
              <TouchableOpacity onPress={() => setAdding((a) => !a)}><Text style={styles.addLink}>{adding ? 'Cancel' : '+ New'}</Text></TouchableOpacity>
            </View>

            {adding && (
              <View style={styles.addBox}>
                <TextInput style={styles.addInput} value={newTitle} onChangeText={setNewTitle} placeholder="Title (e.g. Welcome)" placeholderTextColor={colors.textTertiary} />
                <TextInput style={[styles.addInput, { minHeight: 64 }]} value={newBody} onChangeText={setNewBody} placeholder="Message… use {guest} for their name" placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" />
                <TouchableOpacity style={[styles.saveTplBtn, !newBody.trim() && { opacity: 0.5 }]} disabled={!newBody.trim()} onPress={saveNew}><Text style={styles.saveTplText}>Save reply</Text></TouchableOpacity>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {templates.map((t) => (
                <TouchableOpacity key={t.id} style={styles.tpl} activeOpacity={0.8} onPress={() => useTemplate(t)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tplTitle}>{t.title}</Text>
                    <Text style={styles.tplBody} numberOfLines={2}>{fillTemplate(t.body, thread?.guestName)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeTemplate(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.tplHint}>Tap a reply to drop it into the message box — edit before sending.</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    savedBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
    input: { flex: 1, backgroundColor: colors.backgroundSecondary, borderRadius: 22, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, fontSize: fontSizes.base, color: colors.textPrimary, maxHeight: 100 },
    send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    safe: { fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.sm, ...fonts.regular },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing['2xl'] },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, marginBottom: spacing.md },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    sheetTitle: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    addLink: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.bold },
    addBox: { gap: spacing.sm, marginBottom: spacing.md },
    addInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    saveTplBtn: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary },
    saveTplText: { color: '#fff', fontSize: fontSizes.base, ...fonts.bold },
    tpl: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    tplTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    tplBody: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 18, ...fonts.regular },
    tplHint: { fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.md, ...fonts.regular },
  });

export default ChatScreen;
