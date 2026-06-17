import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from '../api';
import { setTokens, clearTokens, getToken } from '../api/client';

interface User {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  dialCode?: string;     // e.g. "+91" — set at phone login
  countryCode?: string;  // ISO, e.g. "IN" — drives currency & formats
}

interface SendOtpResult {
  message: string;
  expiresIn: number;
  devCode?: string;
}

interface VerifyOtpResult {
  user: User;
  isNewUser: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Send an OTP to the given phone number. */
  sendOtp: (phone: string, dialCode: string, countryCode: string) => Promise<SendOtpResult>;
  /** Verify an OTP code. Returns { user, isNewUser }. */
  verifyOtp: (phone: string, code: string) => Promise<VerifyOtpResult>;
  /** Update the current user's profile (name/email) after sign-up. */
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  /** Phone-number sign-in shared across guest & host modes (backward compat). */
  loginWithPhone: (phone: string, dialCode: string, countryCode: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthBeforeAction: (action: () => void, navigation: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = '@stayon_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved auth on app start — load tokens from secure store & validate via /me
  useEffect(() => {
    checkSavedAuth();
  }, []);

  const checkSavedAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        try {
          // Validate with the server
          const serverUser = await Api.auth.me();
          const u: User = {
            id: serverUser.id,
            email: serverUser.email,
            name: serverUser.name,
            phone: serverUser.phone,
            dialCode: serverUser.dialCode,
            countryCode: serverUser.countryCode,
          };
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
          setUser(u);
        } catch {
          // Token invalid / server offline — try cached user
          const savedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          } else {
            // No cached user and token failed — clear
            await clearTokens();
          }
        }
      } else {
        // No token — check for cached user data
        const savedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      }
    } catch (error) {
      console.error('Error checking saved auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (phone: string, dialCode: string, countryCode: string): Promise<SendOtpResult> => {
    const fullPhone = `${dialCode}${phone.replace(/[^0-9]/g, '')}`;
    const res = await Api.auth.sendOtp(fullPhone, countryCode);
    return {
      message: res.message,
      expiresIn: res.expiresIn,
      devCode: res.devCode,
    };
  };

  const verifyOtp = async (phone: string, code: string): Promise<VerifyOtpResult> => {
    const res = await Api.auth.verifyOtp(phone, code);
    // Store tokens securely
    await setTokens(res.accessToken, res.refreshToken);
    // Build user object
    const u: User = {
      id: res.user.id,
      email: res.user.email,
      name: res.user.name,
      phone: res.user.phone,
      dialCode: res.user.dialCode,
      countryCode: res.user.countryCode,
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    return { user: u, isNewUser: res.isNewUser };
  };

  const updateProfile = async (data: { name?: string; email?: string }): Promise<void> => {
    const updated = await Api.auth.updateProfile(data);
    const u: User = {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      dialCode: user?.dialCode,
      countryCode: updated.countryCode ?? user?.countryCode,
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  /** Backward-compatible phone login for HostLoginScreen etc. */
  const loginWithPhone = async (phone: string, dialCode: string, countryCode: string) => {
    // In the new OTP flow this is a two-step process. For backward compat with
    // host screens that call loginWithPhone directly, we send + verify with a
    // dev code. In production the host flow should also use sendOtp + verifyOtp.
    const fullPhone = `${dialCode}${phone.replace(/[^0-9]/g, '')}`;
    const otpRes = await Api.auth.sendOtp(fullPhone, countryCode);
    const devCode = otpRes.devCode || '000000';
    const res = await Api.auth.verifyOtp(fullPhone, devCode);
    await setTokens(res.accessToken, res.refreshToken);
    const u: User = {
      id: res.user.id,
      email: res.user.email,
      name: res.user.name,
      phone,
      dialCode,
      countryCode,
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  const logout = async () => {
    try {
      await Api.auth.logout(); // calls signOut which clears tokens + calls backend
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      // Even on error, clear local state
      await clearTokens();
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
      console.error('Logout error:', error);
    }
  };

  // Check if user is authenticated before allowing an action
  const checkAuthBeforeAction = (action: () => void, navigation: any) => {
    if (user) {
      // User is logged in, proceed with action
      action();
    } else {
      // User not logged in, navigate to auth screen
      navigation.navigate('Auth', {
        returnAction: action,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        sendOtp,
        verifyOtp,
        updateProfile,
        loginWithPhone,
        logout,
        checkAuthBeforeAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
