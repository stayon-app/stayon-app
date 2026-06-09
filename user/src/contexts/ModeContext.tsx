import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// One app, two experiences: 'guest' (travelling) and 'host' (hosting). The mode
// lives above both navigator trees so a Switch button in either can flip it.
export type AppMode = 'guest' | 'host';

interface ModeContextValue {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  toggle: () => void;
}

const KEY = '@stayon_app_mode';
const ModeContext = createContext<ModeContextValue>({ mode: 'guest', setMode: () => {}, toggle: () => {} });

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('guest');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((saved) => {
      if (saved === 'host' || saved === 'guest') setModeState(saved);
    }).catch(() => {});
  }, []);

  const setMode = useCallback((m: AppMode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  }, []);

  const toggle = useCallback(() => setMode(mode === 'guest' ? 'host' : 'guest'), [mode, setMode]);

  return <ModeContext.Provider value={{ mode, setMode, toggle }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  return useContext(ModeContext);
}
