import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import { authTelegram } from './api/client';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import Home from './pages/Home';
import Favorites from './pages/Favorites';
import AddItem from './pages/AddItem';
import Profile from './pages/Profile';

// ─── Auth Context ────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ─── Settings Context (language/currency) ───────────────
export const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

const CURRENCIES = ['USD', 'EUR', 'RUB', 'GBP'];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

export default function App() {
  const { ready, initData } = useTelegram();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Settings
  const [currency, setCurrency] = useState(() => localStorage.getItem('gilda_currency') || 'USD');
  const [language, setLanguage] = useState(() => localStorage.getItem('gilda_language') || 'en');

  const persistCurrency = useCallback((c) => {
    setCurrency(c);
    localStorage.setItem('gilda_currency', c);
  }, []);

  const persistLanguage = useCallback((l) => {
    setLanguage(l);
    localStorage.setItem('gilda_language', l);
  }, []);

  // Telegram auth on mount
  useEffect(() => {
    if (!ready) return;

    async function doAuth() {
      try {
        let data;
        if (initData) {
          data = await authTelegram(initData);
        } else {
          // Dev fallback: mock auth with a fake initData
          // In production this path is never taken
          const stored = localStorage.getItem('gilda_token');
          if (stored) {
            setAuthLoading(false);
            return;
          }
          // Create a minimal mock for local dev
          data = await authTelegram('dev_mock');
        }
        localStorage.setItem('gilda_token', data.token);
        setUser(data.user);
      } catch (err) {
        // Still allow browsing without auth in dev
        console.warn('Auth failed:', err.message);
      } finally {
        setAuthLoading(false);
      }
    }

    doAuth();
  }, [ready, initData]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <SettingsContext.Provider value={{ currency, setCurrency: persistCurrency, language, setLanguage: persistLanguage, CURRENCIES, LANGUAGES }}>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/add" element={<AddItem />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shop/:id" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </SettingsContext.Provider>
    </AuthContext.Provider>
  );
}
