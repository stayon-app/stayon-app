import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import HostProfileScreen from '../screens/HostProfileScreen';
import {
  HomeScreen,
  ExploreScreen,
  TripsScreen,
  MessagesScreen,
  ProfileScreen,
  PropertyDetailsScreen,
  BookingScreen,
  AuthScreen,
  OTPScreen,
  AccountCreationScreen,
  ChatScreen,
  DestinationDetailsScreen,
  ActivityDetailsScreen,
  ReelSubmitScreen,
  ReelViewerScreen,
  PlaceDetailsScreen,
  BlogPostScreen,
  GlobeExplorerScreen,
  VibeSearchScreen,
  StayBotScreen,
  StayCoinsScreen,
  StayServicesScreen,
  BookingConfirmationScreen,
  NotificationCenterScreen,
  CustomerSupportScreen,
  WishlistScreen,
  StayWalletScreen,
  WriteReviewScreen,
  PaymentMethodsScreen,
  IdentityVerificationScreen,
  PersonalInfoScreen,
  ViewProfileScreen,
  ResolutionCenterScreen,
  AccountSettingsScreen,
  NotificationSettingsScreen,
  LanguageCurrencyScreen,
  PrivacySharingScreen,
  AccessibilitySettingsScreen,
  OffersScreen,
  NearbyStaysScreen,
  TripSpendingScreen,
} from '../screens';
import { MapExploreScreen } from '../screens/MapExploreScreen';
import { MapSearchScreen } from '../screens/MapSearchScreen';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'HomeTab', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'ExploreTab', label: 'Explore', icon: 'compass', iconOutline: 'compass-outline' },
  { name: 'StayBotTab', label: 'StayBot', icon: 'sparkles', iconOutline: 'sparkles-outline', center: true },
  { name: 'TripsTab', label: 'Trips', icon: 'calendar', iconOutline: 'calendar-outline' },
  { name: 'ProfileTab', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.tabBar, {
      backgroundColor: colors.tabBarBackground,
      borderTopColor: colors.tabBarBorder,
    }]}>
      {state.routes.map((route, index) => {
        const config = TAB_CONFIG[index];
        const isFocused = state.index === index;
        const isCenter = config?.center;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCenter) {
          return (
            <View key={route.key} style={styles.centerTabWrap}>
              <TouchableOpacity
                onPress={onPress}
                style={styles.centerTab}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={STAYON_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centerTabInner}
                >
                  <Ionicons name="sparkles" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
              <Text style={[styles.tabLabel, { color: colors.primary, marginTop: 28 }]}>StayBot</Text>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Ionicons
              name={(isFocused ? config?.icon : config?.iconOutline) as any}
              size={22}
              color={isFocused ? colors.tabBarActive : colors.tabBarInactive}
            />
            {isFocused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            <Text style={[
              styles.tabLabel,
              { color: isFocused ? colors.tabBarActive : colors.tabBarInactive },
              isFocused && styles.tabLabelActive,
            ]}>
              {config?.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="ExploreTab" component={ExploreScreen} />
      <Tab.Screen name="StayBotTab" component={StayBotScreen} />
      <Tab.Screen name="TripsTab" component={TripsScreen} />
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
      notification: colors.secondary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="HostProfile" component={HostProfileScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Booking" component={BookingScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="DestinationDetails" component={DestinationDetailsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ActivityDetails" component={ActivityDetailsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ReelSubmit" component={ReelSubmitScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ReelViewer" component={ReelViewerScreen} options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
        <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="BlogPost" component={BlogPostScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MapExplore" component={MapExploreScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="MapSearch" component={MapSearchScreen} options={{ animation: 'fade' }} />
        {/* New screens */}
        <Stack.Screen name="GlobeExplorer" component={GlobeExplorerScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="VibeSearch" component={VibeSearchScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="StayCoins" component={StayCoinsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="StayServices" component={StayServicesScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="CustomerSupport" component={CustomerSupportScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="StayWallet" component={StayWalletScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ViewProfile" component={ViewProfileScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="LanguageCurrency" component={LanguageCurrencyScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="PrivacySharing" component={PrivacySharingScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="AccessibilitySettings" component={AccessibilitySettingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Offers" component={OffersScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="NearbyStays" component={NearbyStaysScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="TripSpending" component={TripSpendingScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ResolutionCenter" component={ResolutionCenterScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Messages" component={MessagesScreen} options={{ animation: 'slide_from_right' }} />
        {/* Auth modals */}
        <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="OTP" component={OTPScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
        <Stack.Screen name="AccountCreation" component={AccountCreationScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: 'flex-start',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  centerTabWrap: {
    flex: 1,
    alignItems: 'center',
    marginTop: -20,
  },
  centerTab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  centerTabInner: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});
