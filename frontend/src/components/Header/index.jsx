import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../../App';
import './Header.css';

const tg = window?.Telegram?.WebApp;

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useSettings();

  const isHome = location.pathname === '/';

  // ── Telegram BackButton (навигация назад через TG) ───────────────────────────
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

  // ── Заголовок страницы ───────────────────────────────────────────────────────
  const PAGE_TITLES = {
    '/search':    language === 'ru' ? 'ПОИСК' : 'SEARCH',
    '/favorites': language === 'ru' ? 'ИЗБРАННОЕ' : 'SAVED',
    '/add':       language === 'ru' ? 'НОВОЕ ОБЪЯВЛЕНИЕ' : 'NEW LISTING',
    '/profile':   language === 'ru' ? 'МОЙ ПРОФИЛЬ' : 'MY PROFILE',
  };

  const isShopRoute = location.pathname.startsWith('/shop/');
  const title = isShopRoute
    ? (language === 'ru' ? 'МАГАЗИН' : 'SHOP')
    : PAGE_TITLES[location.pathname] ?? null;

  return (
    <header className="header">
      <div className="header__logo">
        {title === null ? (
          <span className="header__logo-text">GILDA</span>
        ) : (
          <span className="header__page-title">{title}</span>
        )}
      </div>
    </header>
  );
}
