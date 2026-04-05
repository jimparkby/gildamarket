import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import SideMenu from '../SideMenu';
import './Header.css';

const PAGE_TITLES = {
  '/': null,           // shows Gilda logo
  '/favorites': 'Saved',
  '/add': 'New Listing',
  '/profile': 'My Shop',
};

export default function Header({ onSearch }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isHome = location.pathname === '/';
  const title = PAGE_TITLES[location.pathname] ?? 'Gilda';

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
        {/* Left: hamburger */}
        <button
          className="header__btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="7" x2="21" y2="7"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="17" x2="21" y2="17"/>
          </svg>
        </button>

        {/* Center: logo or search input */}
        {searchOpen && isHome ? (
          <div className="header__search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="header__search-icon">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              className="header__search-input"
              placeholder="Brand, item, category…"
              value={query}
              onChange={handleSearch}
            />
          </div>
        ) : (
          <div className="header__logo">
            {title === null || title === 'Gilda' ? (
              <span className="header__logo-text">GILDA</span>
            ) : (
              <span className="header__page-title">{title}</span>
            )}
          </div>
        )}

        {/* Right: search or close */}
        <div className="header__right">
          {isHome && (
            searchOpen ? (
              <button className="header__btn" onClick={clearSearch} aria-label="Close search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            ) : (
              <button className="header__btn" onClick={() => setSearchOpen(true)} aria-label="Search">
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
