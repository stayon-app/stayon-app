import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getReservations, type HostReservation } from '../data/reservations';
import { respondHostAssistant, hostStatsSummary, ASSISTANT_PROMPTS } from '../services/hostAssistant';
import { loadApiKey, setApiKey, getApiKey, isLLMEnabled, getHostLLMReply, type ChatTurn } from '../../services/aiProvider';

interface Msg { id: string; role: 'host' | 'bot'; text: string; quick?: string[]; route?: string; routeLabel?: string; }

export function HostAssistantScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, medium } = useHaptics();
  const styles = makeStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const resRef = useRef<HostReservation[]>([]);
  const historyRef = useRef<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [smartMode, setSmartMode] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    { id: 'w', role: 'bot', text: "Hi! I'm your hosting assistant. Ask me about earnings, payouts, occupancy, reviews, maintenance — or how to do anything on the host side. I'll explain, suggest, and take you to the right screen to make changes yourself.", quick: ASSISTANT_PROMPTS },
  ]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReservations().then((r) => { if (active) resRef.current = r; });
      loadApiKey().then(() => { if (active) { setSmartMode(isLLMEnabled()); setKeyInput(getApiKey() ?? ''); } });
      return () => { active = false; };
    }, [])
  );

  const pushBot = (reply: { text: string; quickReplies?: string[]; route?: string; routeLabel?: string }) => {
    setMessages((p) => [...p, { id: `${Date.now()}b`, role: 'bot', text: reply.text, quick: reply.quickReplies, route: reply.route, routeLabel: reply.routeLabel }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  const saveKey = async () => { await setApiKey(keyInput); setSmartMode(isLLMEnabled()); setShowKeyModal(false); };

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    medium();
    setMessages((p) => [...p, { id: `${Date.now()}u`, role: 'host', text: t }]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

    // Local advisory engine always runs — supplies the live numbers, quick
    // replies, and the "Open <screen>" action that helps DO the task.
    const local = respondHostAssistant(resRef.current, t, format);
    historyRef.current.push({ role: 'user', content: t });

    if (isLLMEnabled()) {
      // Smart mode: Claude phrases the answer; we keep the local actions.
      getHostLLMReply(historyRef.current, hostStatsSummary(resRef.current, format))
        .then((txt) => {
          const finalText = txt || local.text;
          historyRef.current.push({ role: 'assistant', content: finalText });
          pushBot({ text: finalText, quickReplies: local.quickReplies, route: local.route, routeLabel: local.routeLabel });
        })
        .catch(() => pushBot(local));
    } else {
      setTimeout(() => {
        historyRef.current.push({ role: 'assistant', content: local.text });
        pushBot(local);
      }, 280);
    }
  };

  const openRoute = (route: string) => { light(); navigation.navigate(route); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Host Assistant" onBack={() => navigation.goBack()}
        rightActions={[{ icon: smartMode ? 'sparkles' : 'sparkles-outline', onPress: () => { light(); setShowKeyModal(true); }, accessibilityLabel: 'Smart AI mode' }]} />
      <View style={styles.advisory}>
        <Ionicons name={smartMode ? 'sparkles' : 'information-circle'} size={13} color={colors.primary} />
        <Text style={styles.advisoryText}>{smartMode ? 'Smart AI (Claude) · I advise & guide — you make changes.' : 'Advisory — I explain your numbers & guide you to the right screen.'}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((m) => (
            <View key={m.id}>
              <View style={[styles.bubble, m.role === 'host' ? styles.host : styles.bot, { alignSelf: m.role === 'host' ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.bubbleText, { color: m.role === 'host' ? '#fff' : colors.textPrimary }]}>{m.text}</Text>
              </View>
              {m.role === 'bot' && !!m.route && (
                <TouchableOpacity style={styles.routeBtn} activeOpacity={0.85} onPress={() => openRoute(m.route!)}>
                  <Ionicons name="arrow-forward-circle" size={16} color="#fff" />
                  <Text style={styles.routeBtnText}>{m.routeLabel || 'Open'}</Text>
                </TouchableOpacity>
              )}
              {m.role === 'bot' && m.quick && (
                <View style={styles.quickWrap}>
                  {m.quick.map((q, i) => (
                    <TouchableOpacity key={i} style={styles.quick} onPress={() => { light(); send(q); }}>
                      <Text style={styles.quickText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your earnings…"
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendWrap} onPress={() => send(input)} disabled={!input.trim()}>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.send, !input.trim() && { opacity: 0.5 }]}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Smart AI key modal — paste an Anthropic key for free-form Claude replies */}
      <Modal visible={showKeyModal} transparent animationType="fade" onRequestClose={() => setShowKeyModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>Smart AI mode</Text>
              <TouchableOpacity onPress={() => setShowKeyModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>Paste an Anthropic API key to let the assistant reply in free-form English with Claude. It still uses your real numbers and the “Open screen” actions, and never changes anything for you. Your key is stored only on this device.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="sk-ant-..."
              placeholderTextColor={colors.textTertiary}
              value={keyInput}
              onChangeText={setKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.modalNote}>Prototype only — a client-side key isn't production-safe. For launch, route this through your own backend.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setKeyInput(''); setApiKey('').then(() => setSmartMode(false)); }} style={styles.modalClear}>
                <Text style={styles.modalClearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveKey} activeOpacity={0.9} style={styles.modalSave}>
                <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalSaveInner}>
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

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    advisory: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle },
    advisoryText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
    host: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
    bot: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderBottomLeftRadius: 6 },
    bubbleText: { fontSize: fontSizes.base, lineHeight: 21, ...fonts.regular },
    routeBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.primary },
    routeBtnText: { fontSize: fontSizes.sm, color: '#fff', ...fonts.bold },
    quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    quick: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.25) },
    quickText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.semiBold },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    input: { flex: 1, backgroundColor: colors.backgroundSecondary, borderRadius: 22, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, fontSize: fontSizes.base, color: colors.textPrimary, maxHeight: 100 },
    sendWrap: { borderRadius: 22, overflow: 'hidden' },
    send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg },
    modalHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
    modalTitle: { flex: 1, fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    modalBody: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.md, ...fonts.regular },
    modalInput: { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base },
    modalNote: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: spacing.sm, lineHeight: 16, ...fonts.regular },
    modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    modalClear: { paddingVertical: spacing.sm, paddingHorizontal: spacing.base },
    modalClearText: { fontSize: fontSizes.base, color: colors.error, ...fonts.bold },
    modalSave: { borderRadius: borderRadius.lg, overflow: 'hidden' },
    modalSaveInner: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    modalSaveText: { fontSize: fontSizes.base, color: '#fff', ...fonts.bold },
  });

export default HostAssistantScreen;
