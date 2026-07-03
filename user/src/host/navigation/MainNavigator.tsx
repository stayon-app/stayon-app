import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  TodayScreen,
  ReservationsScreen,
  CalendarScreen,
  InboxScreen,
  ProfileScreen,
  ListingsScreen,
  ListingWizardScreen,
  ListingEditScreen,
  ListingDetailsScreen,
  ReservationDetailScreen,
  CheckInPrepScreen,
  CheckoutScreen,
  EarningsScreen,
  MonthlyEarningsScreen,
  PayoutsScreen,
  TrendsScreen,
  MaintenanceScreen,
  SafetyScreen,
  SmartPricingScreen,
  BookingSettingsScreen,
  ScheduledMessagesScreen,
  HostReelScreen,
  HostStoriesScreen,
  GuidebookScreen,
  PublicProfileScreen,
  SmartSuggestionsScreen,
  FirstBookingScreen,
  ReferScreen,
  CoverScreen,
  HostAssistantScreen,
  ChatScreen,
  NotificationCenterScreen,
  ReviewsScreen,
  GuestReviewScreen,
  IdentityVerificationScreen,
  PayoutSetupScreen,
  SupportScreen,
  ResourcesScreen,
  CurrencyScreen,
  ExperiencesScreen,
  ExperienceCreateScreen,
} from '../screens';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'TodayTab', label: 'Today', icon: 'today', iconOutline: 'today-outline' },
  { name: 'ReservationsTab', label: 'Reservations', icon: 'clipboard', iconOutline: 'clipboard-outline' },
  { name: 'CalendarTab', label: 'Calendar', icon: 'calendar', iconOutline: 'calendar-outline' },
  { name: 'InboxTab', label: 'Inbox', icon: 'chatbubbles', iconOutline: 'chatbubbles-outline' },
  { name: 'ProfileTab', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabBar, { backgroundColor: colors.tabBarBackground, borderTopColor: colors.tabBarBorder }]}>
      {state.routes.map((route, index) => {
        const cfg = TAB_CONFIG[index];
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem} activeOpacity={0.7}>
            <Ionicons
              name={(focused ? cfg?.icon : cfg?.iconOutline) as any}
              size={22}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
            {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            <Text style={[styles.tabLabel, { color: focused ? colors.tabBarActive : colors.tabBarInactive }, focused && styles.tabLabelActive]}>
              {cfg?.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="TodayTab" component={TodayScreen} />
      <Tab.Screen name="ReservationsTab" component={ReservationsScreen} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} />
      <Tab.Screen name="InboxTab" component={InboxScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  const { colors, isDark } = useTheme();
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.card,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Listings" component={ListingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Experiences" component={ExperiencesScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ExperienceCreate" component={ExperienceCreateScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ListingCreate" component={ListingWizardScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ListingEdit" component={ListingEditScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ListingDetails" component={ListingDetailsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="CheckInPrep" component={CheckInPrepScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Earnings" component={EarningsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MonthlyEarnings" component={MonthlyEarningsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Payouts" component={PayoutsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Trends" component={TrendsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SmartSuggestions" component={SmartSuggestionsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Safety" component={SafetyScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SmartPricing" component={SmartPricingScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="BookingSettings" component={BookingSettingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ScheduledMessages" component={ScheduledMessagesScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="HostReel" component={HostReelScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="HostStories" component={HostStoriesScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Guidebook" component={GuidebookScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="FirstBooking" component={FirstBookingScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Refer" component={ReferScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Cover" component={CoverScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="HostAssistant" component={HostAssistantScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="GuestReview" component={GuestReviewScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="PayoutSetup" component={PayoutSetupScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Support" component={SupportScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Resources" component={ResourcesScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Currency" component={CurrencyScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', height: Platform.OS === 'ios' ? 82 : 64, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8, borderTopWidth: 1, alignItems: 'flex-start' },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  activeDot: { width: 4, height: 4, borderRadius: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
});
