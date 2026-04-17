import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import { authTelegram } from './api/client';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import Home from './pages/Home';
import Search from './pages/Search';
import Favorites from './pages/Favorites';
import AddItem from './pages/AddItem';
import EditItem from './pages/EditItem';
import Profile from './pages/Profile';

// ─── Auth Context ────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ─── Settings Context (language/currency) ───────────────
export const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

// ─── BackButton Context ──────────────────────────────────
// Ref to a custom back handler; null = use default navigate(-1)
export const BackButtonContext = createContext(null);

// Fixed to Russian and RUB only
const CURRENCIES = ['RUB'];
const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
];

export default function App() {
  const { ready, initData } = useTelegram();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const backOverrideRef = useRef(null);

  // Settings - Fixed to RUB and Russian
  const [currency, setCurrency] = useState('RUB');
  const [language, setLanguage] = useState('ru');
  const [theme, setTheme] = useState(() => localStorage.getItem('gilda_theme') || 'dark');

  const persistCurrency = useCallback((c) => {
    setCurrency(c);
    localStorage.setItem('gilda_currency', c);
  }, []);

  const persistLanguage = useCallback((l) => {
    setLanguage(l);
    localStorage.setItem('gilda_language', l);
  }, []);

  const persistTheme = useCallback((t) => {
    setTheme(t);
    localStorage.setItem('gilda_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

  // Handle deep links: startapp=shop_123 (BotFather shortname) OR ?shop=123 (URL param fallback)
  useEffect(() => {
    if (authLoading) return;
    // 1. Telegram native startapp parameter (requires /newapp shortname in BotFather)
    const param = window?.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (param?.startsWith('shop_')) {
      navigate(`/shop/${param.replace('shop_', '')}`, { replace: true });
      return;
    }
    // 2. URL query param fallback ?shop=123
    const urlShop = new URLSearchParams(window.location.search).get('shop');
    if (urlShop) {
      navigate(`/shop/${urlShop}`, { replace: true });
    }
  }, [authLoading]); // eslint-disable-line

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <BackButtonContext.Provider value={backOverrideRef}>
    <AuthContext.Provider value={{ user, setUser }}>
      <SettingsContext.Provider value={{ currency, setCurrency: persistCurrency, language, setLanguage: persistLanguage, theme, setTheme: persistTheme, CURRENCIES, LANGUAGES }}>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/add" element={<AddItem />} />
          <Route path="/edit/:id" element={<EditItem />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shop/:id" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </SettingsContext.Provider>
    </AuthContext.Provider>
    </BackButtonContext.Provider>
  );
}
