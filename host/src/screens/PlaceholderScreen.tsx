import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenHeader, EmptyState } from '../components/common';

/**
 * Temporary stand-in for stack screens not yet built (M1+). Keeps navigation
 * working from day one; each route is replaced by its real screen per milestone.
 */
export function PlaceholderScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const title = route?.params?.title ?? route?.name ?? 'Coming soon';
  const message = route?.params?.message ?? 'This part of the host app is being built. It’ll land in an upcoming milestone.';
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState icon="construct-outline" title={title} message={message} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });

export default PlaceholderScreen;
