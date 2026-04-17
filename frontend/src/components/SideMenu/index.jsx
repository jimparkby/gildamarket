import React, { useState, useCallback, useContext, useEffect } from 'react';
import { useSettings, BackButtonContext } from '../../App';
import { t } from '../../translations';
import './SideMenu.css';

// ─── Static pages ─────────────────────────────────────────────────────────────
const PAGES_CONTENT = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      body: (
        <div className="side-page__content">
          <p className="side-page__updated">Last updated: April 2025</p>
          <h3>1. Information We Collect</h3>
          <p>When you use Gilda via Telegram, we receive basic profile information: your name, username, and Telegram user ID. We do not collect passwords, phone numbers, or financial data.</p>
          <h3>2. How We Use Your Information</h3>
          <p>We use your data solely to operate the Gilda marketplace — to create and manage your shop, display your listings, and enable communication between buyers and sellers.</p>
          <h3>3. Photos & Listings</h3>
          <p>Photos you upload are stored securely and displayed publicly as part of your listings. You can delete your listings at any time from your shop page.</p>
          <h3>4. Data Sharing</h3>
          <p>We do not sell or share your personal data with third parties.</p>
          <h3>5. Contact</h3>
          <p>Questions about privacy? Email us: <strong>ernestgilda1@gmail.com</strong></p>
        </div>
      ),
    },
    ru: {
      title: 'Политика конфиденциальности',
      body: (
        <div className="side-page__content">
          <p className="side-page__updated">Последнее обновление: апрель 2025</p>
          <h3>1. Какие данные мы собираем</h3>
          <p>При использовании Gilda через Telegram мы получаем базовую информацию: имя, имя пользователя и Telegram ID. Мы не собираем пароли, телефоны или платёжные данные.</p>
          <h3>2. Как мы используем данные</h3>
          <p>Данные используются исключительно для работы маркетплейса Gilda — создания магазина, публикации объявлений и общения между продавцами и покупателями.</p>
          <h3>3. Фото и объявления</h3>
          <p>Загруженные фото хранятся в безопасном хранилище и отображаются публично. Вы можете удалить объявление в любой момент.</p>
          <h3>4. Передача данных</h3>
          <p>Мы не продаём и не передаём ваши персональные данные третьим лицам.</p>
          <h3>5. Контакты</h3>
          <p>Вопросы по конфиденциальности: <strong>ernestgilda1@gmail.com</strong></p>
        </div>
      ),
    },
  },
  support: {
    en: {
      title: 'Support',
      body: (
        <div className="side-page__content">
          <h3>How can we help?</h3>
          <p>We're here to make your Gilda experience smooth.</p>
          <h3>Common Questions</h3>
          <p><strong>How do I list an item?</strong><br/>Tap the + icon, fill in the details and upload photos.</p>
          <p><strong>How do I contact a seller?</strong><br/>Open any listing and tap "Message Seller".</p>
          <p><strong>How do I delete a listing?</strong><br/>Go to your Shop tab, find the item, and tap Delete.</p>
          <h3>Contact Support</h3>
          <a className="side-page__email" href="mailto:ernestgilda1@gmail.com">ernestgilda1@gmail.com</a>
        </div>
      ),
    },
    ru: {
      title: 'Поддержка',
      body: (
        <div className="side-page__content">
          <h3>Как мы можем помочь?</h3>
          <p>Мы здесь, чтобы ваш опыт в Gilda был максимально удобным.</p>
          <h3>Часто задаваемые вопросы</h3>
          <p><strong>Как опубликовать вещь?</strong><br/>Нажмите + в нижнем меню, заполните данные и добавьте фото.</p>
          <p><strong>Как связаться с продавцом?</strong><br/>Откройте объявление и нажмите «Написать продавцу».</p>
          <p><strong>Как удалить объявление?</strong><br/>Перейдите в Мой магазин, найдите вещь и нажмите «Удалить».</p>
          <h3>Написать в поддержку</h3>
          <a className="side-page__email" href="mailto:ernestgilda1@gmail.com">ernestgilda1@gmail.com</a>
        </div>
      ),
    },
  },
  contact: {
    en: {
      title: 'Contact Us',
      body: (
        <div className="side-page__content">
          <h3>Get in touch</h3>
          <p>We'd love to hear from you — feedback, partnership inquiry, or just a hello.</p>
          <h3>Email</h3>
          <a className="side-page__email" href="mailto:ernestgilda1@gmail.com">ernestgilda1@gmail.com</a>
          <h3>Response Time</h3>
          <p>We aim to respond within 24 hours on weekdays.</p>
        </div>
      ),
    },
    ru: {
      title: 'Написать нам',
      body: (
        <div className="side-page__content">
          <h3>Свяжитесь с нами</h3>
          <p>Мы рады обратной связи — предложения, вопросы о партнёрстве или просто привет.</p>
          <h3>Email</h3>
          <a className="side-page__email" href="mailto:ernestgilda1@gmail.com">ernestgilda1@gmail.com</a>
          <h3>Время ответа</h3>
          <p>Отвечаем в течение 24 часов в рабочие дни.</p>
        </div>
      ),
    },
  },
};

export default function SideMenu({ open, onClose }) {
  const { language, theme, setTheme } = useSettings();
  const backOverrideRef = useContext(BackButtonContext);

  const [activePage, setActivePage] = useState(null);

  const handleOpen = useCallback((key) => setActivePage(key), []);
  const handleBack = useCallback(() => setActivePage(null), []);

  const handleClose = useCallback(() => {
    setActivePage(null);
    onClose();
  }, [onClose]);

  // ── Переопределяем TG BackButton пока меню открыто ──────────────────────────
  useEffect(() => {
    if (!backOverrideRef) return;
    if (!open) {
      backOverrideRef.current = null;
      return;
    }
    backOverrideRef.current = activePage ? handleBack : handleClose;
    return () => { backOverrideRef.current = null; };
  }, [open, activePage, handleBack, handleClose, backOverrideRef]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  // Use language for menu
  const lang = language;
  const page = activePage ? PAGES_CONTENT[activePage]?.[lang] || PAGES_CONTENT[activePage]?.en : null;

  const LINKS = [
    { key: 'privacy', label: t(lang, 'privacy') },
    { key: 'support', label: t(lang, 'support') },
    { key: 'contact', label: t(lang, 'contact') },
  ];

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
            <div className="side-page__body">{page.body}</div>
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

          {/* Theme Switcher */}
          <div className="side-menu__section">
            <p className="side-menu__label">Тема</p>
            <div className="side-menu__options">
              <button
                className={`side-menu__option${theme === 'light' ? ' selected' : ''}`}
                onClick={() => setTheme('light')}
              >
                Светлая
              </button>
              <button
                className={`side-menu__option${theme === 'dark' ? ' selected' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Темная
              </button>
            </div>
          </div>

          <div className="side-menu__divider" />

          {/* Links */}
          <div className="side-menu__links">
            {LINKS.map(({ key, label }) => (
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
