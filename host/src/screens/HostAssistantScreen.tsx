import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
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
import { respondHostAssistant, ASSISTANT_PROMPTS } from '../services/hostAssistant';

interface Msg { id: string; role: 'host' | 'bot'; text: string; quick?: string[]; }

export function HostAssistantScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, medium } = useHaptics();
  const styles = makeStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const resRef = useRef<HostReservation[]>([]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    { id: 'w', role: 'bot', text: "Hi! I'm your hosting assistant. Ask me about your earnings, payouts, occupancy or booking stats. I explain and suggest — I don't change anything for you.", quick: ASSISTANT_PROMPTS },
  ]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReservations().then((r) => { if (active) resRef.current = r; });
      return () => { active = false; };
    }, [])
  );

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    medium();
    setMessages((p) => [...p, { id: `${Date.now()}u`, role: 'host', text: t }]);
    setInput('');
    setTimeout(() => {
      const reply = respondHostAssistant(resRef.current, t, format);
      setMessages((p) => [...p, { id: `${Date.now()}b`, role: 'bot', text: reply.text, quick: reply.quickReplies }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    }, 350);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Host Assistant" onBack={() => navigation.goBack()} />
      <View style={styles.advisory}>
        <Ionicons name="information-circle" size={13} color={colors.primary} />
        <Text style={styles.advisoryText}>Advisory only — I help you understand your numbers, I don't make changes.</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((m) => (
            <View key={m.id}>
              <View style={[styles.bubble, m.role === 'host' ? styles.host : styles.bot, { alignSelf: m.role === 'host' ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.bubbleText, { color: m.role === 'host' ? '#fff' : colors.textPrimary }]}>{m.text}</Text>
              </View>
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
    quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    quick: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.25) },
    quickText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.semiBold },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    input: { flex: 1, backgroundColor: colors.backgroundSecondary, borderRadius: 22, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, fontSize: fontSizes.base, color: colors.textPrimary, maxHeight: 100 },
    sendWrap: { borderRadius: 22, overflow: 'hidden' },
    send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  });

export default HostAssistantScreen;
