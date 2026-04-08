import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../../App';
import SideMenu from '../SideMenu';
import './Header.css';

const tg = window?.Telegram?.WebApp;

// Страницы без кнопки назад (главный экран — кнопка закрыть TG)
const HOME = '/';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === HOME;
  const isProfile = location.pathname === '/profile';
  const isShop = location.pathname.startsWith('/shop/');

  // ── Telegram BackButton ──────────────────────────────────
  useEffect(() => {
    if (!tg?.BackButton) return;

    if (isHome) {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
      const handler = () => navigate(-1);
      tg.BackButton.onClick(handler);
      return () => {
        tg.BackButton.offClick(handler);
      };
    }
  }, [isHome, navigate]);

  // ── Page titles ──────────────────────────────────────────
  const PAGE_TITLES = {
    '/search':    language === 'ru' ? 'ПОИСК' : 'SEARCH',
    '/favorites': language === 'ru' ? 'ИЗБРАННОЕ' : 'SAVED',
    '/add':       language === 'ru' ? 'НОВОЕ ОБЪЯВЛЕНИЕ' : 'NEW LISTING',
    '/profile':   language === 'ru' ? 'МОЙ МАГАЗИН' : 'MY SHOP',
  };

  const isShopRoute = location.pathname.startsWith('/shop/');
  const title = isShopRoute
    ? (language === 'ru' ? 'МАГАЗИН' : 'SHOP')
    : PAGE_TITLES[location.pathname] ?? null;

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  return (
    <>
      <header className="header">
        {/* Left: back button (all pages except home) */}
        <div className="header__side">
          {!isHome && (
            <button className="header__btn header__back-btn" onClick={handleBack} aria-label="Назад">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
        </div>

        {/* Center: logo or title */}
        <div className="header__logo">
          {title === null ? (
            <span className="header__logo-text">GILDA</span>
          ) : (
            <span className="header__page-title">{title}</span>
          )}
        </div>

        {/* Right: search icon (home) or menu dots (profile/shop) */}
        <div className="header__side header__side--right">
          {isHome && (
            <button
              className="header__btn"
              onClick={() => navigate('/search')}
              aria-label="Поиск"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          )}
          {(isProfile || isShop) && (
            <button
              className="header__btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Меню"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
                <circle cx="19" cy="12" r="1.5"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
