import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../../App';
import { t } from '../../translations';
import './Header.css';

const MAIN_TABS = ['/', '/favorites', '/add', '/profile'];

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useSettings();

  const isMainTab = MAIN_TABS.includes(location.pathname);

  const PAGE_TITLES = {
    '/': null,
    '/favorites': t(language, 'favorites'),
    '/add': t(language, 'add'),
    '/profile': t(language, 'myShop'),
  };
  const title = PAGE_TITLES[location.pathname] ?? null;

  return (
    <header className="header">
      {/* Left: назад на вторичных страницах, пусто на главных */}
      <div className="header__side">
        {!isMainTab && (
          <button
            className="header__btn header__back-btn"
            onClick={() => navigate(-1)}
            aria-label="Назад"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
      </div>

      {/* Center: логотип или заголовок страницы */}
      <div className="header__logo">
        {title === null ? (
          <span className="header__logo-text">GILDA</span>
        ) : (
          <span className="header__page-title">{title}</span>
        )}
      </div>

      {/* Right: пусто (симметрия) */}
      <div className="header__side" />
    </header>
  );
}
