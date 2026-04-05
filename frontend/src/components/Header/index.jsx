import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SideMenu from '../SideMenu';
import './Header.css';

const MAIN_TABS = ['/', '/favorites', '/add', '/profile'];

const PAGE_TITLES = {
  '/': null,
  '/favorites': 'Сохранённое',
  '/add': 'Новое объявление',
  '/profile': 'Мой магазин',
};

export default function Header({ onSearch }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isHome = location.pathname === '/';
  const isMainTab = MAIN_TABS.includes(location.pathname);
  const title = PAGE_TITLES[location.pathname] ?? null;

  const handleSearch = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    onSearch?.(val);
  }, [onSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchOpen(false);
    onSearch?.('');
  }, [onSearch]);

  return (
    <>
      <header className="header">
        {/* Left: назад (вторичные страницы) или гамбургер (главные вкладки) */}
        {isMainTab ? (
          <button
            className="header__btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Меню"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="7" x2="21" y2="7"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="17" x2="21" y2="17"/>
            </svg>
          </button>
        ) : (
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

        {/* Center: логотип / поиск / заголовок */}
        {searchOpen && isHome ? (
          <div className="header__search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="header__search-icon">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              className="header__search-input"
              placeholder="Бренд, категория, описание…"
              value={query}
              onChange={handleSearch}
            />
          </div>
        ) : (
          <div className="header__logo">
            {title === null ? (
              <span className="header__logo-text">GILDA</span>
            ) : (
              <span className="header__page-title">{title}</span>
            )}
          </div>
        )}

        {/* Right: поиск (только на главной) */}
        <div className="header__right">
          {isHome && (
            searchOpen ? (
              <button className="header__btn" onClick={clearSearch} aria-label="Закрыть поиск">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            ) : (
              <button className="header__btn" onClick={() => setSearchOpen(true)} aria-label="Поиск">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            )
          )}
        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
