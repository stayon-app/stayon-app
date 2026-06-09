import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from '../api';
import { setToken } from '../api/client';

// Establish a backend session keyed by a stable identifier (phone or email) so
// the SAME person is one backend account across devices and guest/host modes.
// Returns the backend userId. Fail-safe (returns null if the server is offline).
async function backendLogin(identifier: string, name?: string, countryCode?: string): Promise<string | null> {
  try {
    const r = await Api.auth.login(identifier, name, countryCode);
    await setToken(r.accessToken);
    return r.user?.id ?? null;
  } catch {
    return null;
  }
}

interface User {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  dialCode?: string;     // e.g. "+91" — set at phone login
  countryCode?: string;  // ISO, e.g. "IN" — drives currency & formats
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, phone?: string) => Promise<void>;
  /** Phone-number sign-in shared across guest & host modes. */
  loginWithPhone: (phone: string, dialCode: string, countryCode: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthBeforeAction: (action: () => void, navigation: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = '@stayon_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved auth on app start
  useEffect(() => {
    checkSavedAuth();
  }, []);

  const checkSavedAuth = async () => {
    try {
      const savedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error checking saved auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const name = email.split('@')[0];
      const beId = await backendLogin(email, name);
      const mockUser: User = { id: beId || '1', email, name };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, phone?: string) => {
    try {
      const name = email.split('@')[0];
      const beId = await backendLogin(phone || email, name);
      const mockUser: User = { id: beId || Date.now().toString(), email, name, phone };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const loginWithPhone = async (phone: string, dialCode: string, countryCode: string) => {
    const fullPhone = `${dialCode || ''}${phone}`;
    const beId = await backendLogin(fullPhone, 'You', countryCode);
    const mockUser: User = { id: beId || Date.now().toString(), phone, dialCode, countryCode, name: 'You' };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await setToken(null); // clear backend session too
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
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
        login,
        signup,
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
