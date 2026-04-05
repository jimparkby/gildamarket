import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../App';
import './SideMenu.css';

export default function SideMenu({ open, onClose }) {
  const { currency, setCurrency, language, setLanguage, CURRENCIES, LANGUAGES } = useSettings();

  return (
    <>
      {/* Backdrop */}
      <div className={`side-menu-backdrop${open ? ' open' : ''}`} onClick={onClose} />

      {/* Drawer */}
      <div className={`side-menu${open ? ' open' : ''}`}>
        <div className="side-menu__header">
          <span className="side-menu__brand">GILDA</span>
          <button className="side-menu__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="side-menu__body">
          {/* Language */}
          <div className="side-menu__section">
            <p className="side-menu__label">Language</p>
            <div className="side-menu__options">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  className={`side-menu__option${language === l.code ? ' selected' : ''}`}
                  onClick={() => setLanguage(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="side-menu__divider" />

          {/* Currency */}
          <div className="side-menu__section">
            <p className="side-menu__label">Currency</p>
            <div className="side-menu__options">
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  className={`side-menu__option${currency === c ? ' selected' : ''}`}
                  onClick={() => setCurrency(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="side-menu__divider" />

          {/* Links */}
          <div className="side-menu__section side-menu__links">
            <a className="side-menu__link" href="#privacy" onClick={onClose}>Privacy Policy</a>
            <a className="side-menu__link" href="#support" onClick={onClose}>Support</a>
            <a className="side-menu__link" href="https://t.me/gilda_support" target="_blank" rel="noreferrer" onClick={onClose}>Contact Us</a>
          </div>
        </div>

        <div className="side-menu__footer">
          <span>© 2025 Gilda</span>
        </div>
      </div>
    </>
  );
}
