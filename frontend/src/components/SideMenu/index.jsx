import React, { useState, useCallback } from 'react';
import { useSettings } from '../../App';
import './SideMenu.css';

// ─── Static pages ─────────────────────────────────────────────────────────────
const PAGES = {
  privacy: {
    title: 'Privacy Policy',
    content: (
      <div className="side-page__content">
        <p className="side-page__updated">Last updated: April 2025</p>

        <h3>1. Information We Collect</h3>
        <p>When you use Gilda via Telegram, we receive basic profile information provided by Telegram: your name, username, and Telegram user ID. We do not collect passwords, phone numbers, or financial data.</p>

        <h3>2. How We Use Your Information</h3>
        <p>We use your data solely to operate the Gilda marketplace — to create and manage your shop, display your listings, and enable communication between buyers and sellers.</p>

        <h3>3. Photos & Listings</h3>
        <p>Photos you upload to Gilda are stored securely and displayed publicly as part of your listings. You can delete your listings at any time from your shop page.</p>

        <h3>4. Data Sharing</h3>
        <p>We do not sell or share your personal data with third parties. Your Telegram username is visible to other users only when you have active listings.</p>

        <h3>5. Data Retention</h3>
        <p>Your data is kept as long as your account is active. To request deletion, contact us at ernestgilda1@gmail.com.</p>

        <h3>6. Contact</h3>
        <p>Questions about privacy? Email us: <strong>ernestgilda1@gmail.com</strong></p>
      </div>
    ),
  },
  support: {
    title: 'Support',
    content: (
      <div className="side-page__content">
        <h3>How can we help?</h3>
        <p>We're here to make your Gilda experience smooth. Browse the topics below or reach out directly.</p>

        <h3>Common Questions</h3>
        <p><strong>How do I list an item?</strong><br/>Tap the + icon in the bottom navigation, fill in the details and upload photos.</p>
        <p><strong>How do I contact a seller?</strong><br/>Open any listing and tap "Message Seller" to start a chat on Telegram.</p>
        <p><strong>How do I delete a listing?</strong><br/>Go to your Shop tab, find the item, and tap Delete.</p>
        <p><strong>My item isn't showing up</strong><br/>Make sure the backend is connected and your listing was published successfully.</p>

        <h3>Contact Support</h3>
        <p>Email us and we'll get back to you within 24 hours:</p>
        <a className="side-page__email" href="mailto:ernestgilda1@gmail.com">ernestgilda1@gmail.com</a>
      </div>
    ),
  },
  contact: {
    title: 'Contact Us',
    content: (
      <div className="side-page__content">
        <h3>Get in touch</h3>
        <p>We'd love to hear from you — whether it's feedback, a partnership inquiry, or just a hello.</p>

        <h3>Email</h3>
        <a className="side-page__email" href="mailto:ernestgilda1@gmail.com">ernestgilda1@gmail.com</a>

        <h3>Response Time</h3>
        <p>We aim to respond within 24 hours on weekdays.</p>

        <h3>For Sellers</h3>
        <p>Interested in featuring your vintage shop on Gilda? Reach out and tell us about your collection.</p>
      </div>
    ),
  },
};

export default function SideMenu({ open, onClose }) {
  const { currency, setCurrency, language, setLanguage, CURRENCIES, LANGUAGES } = useSettings();

  // Local draft state — applied only on Save
  const [draftCurrency, setDraftCurrency] = useState(currency);
  const [draftLanguage, setDraftLanguage] = useState(language);
  const [activePage, setActivePage] = useState(null); // null | 'privacy' | 'support' | 'contact'

  const handleOpen = useCallback((key) => {
    setActivePage(key);
  }, []);

  const handleBack = useCallback(() => {
    setActivePage(null);
  }, []);

  const handleSave = useCallback(() => {
    setCurrency(draftCurrency);
    setLanguage(draftLanguage);
    onClose();
  }, [draftCurrency, draftLanguage, setCurrency, setLanguage, onClose]);

  const handleClose = useCallback(() => {
    // Reset drafts to current saved values on dismiss without save
    setDraftCurrency(currency);
    setDraftLanguage(language);
    setActivePage(null);
    onClose();
  }, [currency, language, onClose]);

  const page = activePage ? PAGES[activePage] : null;

  return (
    <>
      <div className={`side-menu-backdrop${open ? ' open' : ''}`} onClick={handleClose} />

      <div className={`side-menu${open ? ' open' : ''}`}>

        {/* ── Sub-page ── */}
        {page && (
          <div className="side-page">
            <div className="side-page__header">
              <button className="side-page__back" onClick={handleBack}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <span className="side-page__title">{page.title}</span>
              <button className="side-menu__close" onClick={handleClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="side-page__body">{page.content}</div>
          </div>
        )}

        {/* ── Main menu ── */}
        <div className="side-menu__header">
          <span className="side-menu__brand">GILDA</span>
          <button className="side-menu__close" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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
                  className={`side-menu__option${draftLanguage === l.code ? ' selected' : ''}`}
                  onClick={() => setDraftLanguage(l.code)}
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
                  className={`side-menu__option${draftCurrency === c ? ' selected' : ''}`}
                  onClick={() => setDraftCurrency(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="side-menu__section" style={{ paddingTop: 12 }}>
            <button className="side-menu__save" onClick={handleSave}>
              Save Changes
            </button>
          </div>

          <div className="side-menu__divider" />

          {/* Links */}
          <div className="side-menu__links">
            {[
              { key: 'privacy', label: 'Privacy Policy' },
              { key: 'support', label: 'Support' },
              { key: 'contact', label: 'Contact Us' },
            ].map(({ key, label }) => (
              <button key={key} className="side-menu__link" onClick={() => handleOpen(key)}>
                {label}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div className="side-menu__footer">
          <span>© 2025 Gilda</span>
        </div>
      </div>
    </>
  );
}
