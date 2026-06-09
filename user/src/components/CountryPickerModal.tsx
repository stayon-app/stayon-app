import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRIES, Country, flagImageUrl } from '../constants/countries';
import { fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';

interface CountryPickerModalProps {
  visible: boolean;
  selectedCode?: string;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
  visible,
  selectedCode,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);
  const [query, setQuery] = useState('');

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelect = (country: Country) => {
    light();
    onSelect(country);
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Select country</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search country or code"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => {
            const active = item.code === selectedCode;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${item.name} ${item.dialCode}`}
              >
                <Image
                  source={{ uri: flagImageUrl(item.code) }}
                  style={styles.flag}
                  contentFit="cover"
                  transition={120}
                />
                <Text style={styles.countryName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.dialCode}>{item.dialCode}</Text>
                {active && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={colors.primary}
                    style={{ marginLeft: spacing.sm }}
                  />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No countries match “{query}”.</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    title: { fontSize: 20, ...fonts.bold, color: colors.textPrimary, letterSpacing: -0.3 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.base,
      borderRadius: borderRadius.md,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderLight,
      minHeight: 48,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      ...fonts.medium,
      color: colors.textPrimary,
      paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.base,
      minHeight: 54,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    flag: {
      width: 30,
      height: 22,
      borderRadius: 3,
      marginRight: spacing.md,
      backgroundColor: colors.backgroundSecondary,
    },
    countryName: { flex: 1, fontSize: 16, ...fonts.semiBold, color: colors.textPrimary },
    dialCode: { fontSize: 15, ...fonts.medium, color: colors.textSecondary },
    empty: {
      textAlign: 'center',
      marginTop: spacing.xl,
      fontSize: 15,
      ...fonts.medium,
      color: colors.textTertiary,
    },
  });
}

export default CountryPickerModal;
