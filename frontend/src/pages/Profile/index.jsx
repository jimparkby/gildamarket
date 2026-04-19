import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getShop, updateProfile,
  uploadAvatar, uploadBackground,
  deleteLookBoard, createLookBoard,
  toggleShopLike, deleteItem, markItemSold,
} from '../../api/client';
import { useAuth, useSettings } from '../../App';
import { t } from '../../translations';
import ItemCard from '../../components/ItemCard';
import SideMenu from '../../components/SideMenu';
import FollowersModal from '../../components/FollowersModal';
import './Profile.css';

function renderTextWithLinks(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|(?:t\.me|vk\.com|instagram\.com|tiktok\.com)\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          onClick={e => { e.stopPropagation(); window.Telegram?.WebApp?.openLink(href); e.preventDefault(); }}
          className="profile__about-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
 
const CATEGORIES = ['Обувь','Верхняя одежда','Футболки','Средний слой','Штаны/Джинсы/Юбки','Сумки','Аксессуары','Прочее'];
const ITEMS_PER_PAGE = 20;
 
export default function Profile() {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  const { language } = useSettings();
  const navigate = useNavigate();
 
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [lbUploading, setLbUploading] = useState(false);
  const [lbModalOpen, setLbModalOpen] = useState(false);
  const [lbDesc, setLbDesc] = useState('');
  const [lbFiles, setLbFiles] = useState([]);
  const [lbPreviews, setLbPreviews] = useState([]);
  const [followersModal, setFollowersModal] = useState(null);
  const avatarRef = useRef();
  const bgRef = useRef();
  const lbFileRef = useRef();
 
  const isOwner = !id || (authUser && String(authUser.id) === id);
  const shopId = id || (authUser ? String(authUser.id) : null);
 
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    getShop(shopId)
      .then(data => {
        setShop(data);
        setAboutDraft(data.about || '');
        setNameDraft(`${data.firstName || ''}${data.lastName ? ' ' + data.lastName : ''}`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopId]);
 
  const handleAvatar = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    const res = await uploadAvatar(fd);
    setShop(prev => ({ ...prev, avatar: res.avatar }));
  }, []);
 
  const handleBg = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('background', file);
    const res = await uploadBackground(fd);
    setShop(prev => ({ ...prev, backgroundImage: res.backgroundImage }));
  }, []);
 
  const saveName = useCallback(async () => {
    const parts = nameDraft.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    const updated = await updateProfile({ firstName, lastName });
    setShop(prev => ({ ...prev, firstName: updated.firstName, lastName: updated.lastName }));
    setEditingName(false);
  }, [nameDraft]);
 
  const saveAbout = useCallback(async () => {
    const updated = await updateProfile({ about: aboutDraft });
    setShop(prev => ({ ...prev, about: updated.about }));
    setEditingAbout(false);
  }, [aboutDraft]);
 
  const handleFollow = useCallback(async () => {
    const res = await toggleShopLike(shop.id);
    setShop(prev => ({ ...prev, isShopLiked: res.liked }));
  }, [shop?.id]);
 
  const handleShare = useCallback(() => {
    const url = `https://t.me/Gildamarket_bot/app?startapp=shop_${shop.id}`;
    if (navigator.share) {
      navigator.share({ title: shop.firstName, url }).catch(() => {});
    } else if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shop.firstName || 'Gilda Market Shop')}`);
    }
  }, [shop]);
 
  const handleMessage = useCallback(() => {
    if (shop?.telegramUsername) {
      window.Telegram?.WebApp?.openTelegramLink(`https://t.me/${shop.telegramUsername}`);
    }
  }, [shop?.telegramUsername]);
 
  const openLbModal = useCallback(() => {
    setLbDesc('');
    setLbFiles([]);
    setLbPreviews([]);
    setLbModalOpen(true);
  }, []);
 
  const handleLbFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    setLbFiles(files);
    setLbPreviews(files.map(f => URL.createObjectURL(f)));
  }, []);
 
  const handleLbSubmit = useCallback(async () => {
    if (!lbFiles.length) return;
    setLbUploading(true);
    try {
      const fd = new FormData();
      lbFiles.forEach(f => fd.append('images', f));
      if (lbDesc.trim()) fd.append('description', lbDesc.trim());
      const lb = await createLookBoard(fd);
      setShop(prev => ({ ...prev, lookBoards: [lb, ...(prev.lookBoards || [])] }));
      setLbModalOpen(false);
    } finally {
      setLbUploading(false);
    }
  }, [lbFiles, lbDesc]);
 
  const handleDeleteLb = useCallback(async (lbId) => {
    await deleteLookBoard(lbId);
    setShop(prev => ({ ...prev, lookBoards: prev.lookBoards.filter(l => l.id !== lbId) }));
  }, []);
 
  const handleDeleteItem = useCallback(async (itemId) => {
    await deleteItem(itemId);
    setShop(prev => ({
      ...prev,
      items: (prev.items || []).filter(i => i.id !== itemId),
      archivedItems: (prev.archivedItems || []).filter(i => i.id !== itemId),
    }));
  }, []);
 
  const handleMarkSold = useCallback(async (itemId) => {
    const res = await markItemSold(itemId);
    setShop(prev => {
      const allItems = [...(prev.items || []), ...(prev.archivedItems || [])];
      const item = allItems.find(i => i.id === itemId);
      if (!item) return prev;
      const updatedItem = { ...item, isSold: res.isSold };
      return {
        ...prev,
        items: res.isSold
          ? (prev.items || []).filter(i => i.id !== itemId)
          : [...(prev.items || []), updatedItem],
        archivedItems: res.isSold
          ? [...(prev.archivedItems || []), updatedItem]
          : (prev.archivedItems || []).filter(i => i.id !== itemId),
      };
    });
  }, []);
 
  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);
 
  if (loading) return <main className="page"><div className="spinner" /></main>;
  if (!shop) return <main className="page"><div className="empty-state"><p>{t(language, 'shopNotFound')}</p></div></main>;
 
  const lookBoards = shop.lookBoards || [];
  const items = shop.items || [];
  const archivedItems = shop.archivedItems || [];
 
  const availableCategories = CATEGORIES.filter(cat => items.some(i => i.category === cat));
  const filteredItems = activeFilter === 'all' ? items : items.filter(i => i.category === activeFilter);
  const visibleItems = filteredItems.slice(0, visibleCount);
 
  const shopName = `${shop.firstName || ''}${shop.lastName ? ' ' + shop.lastName : ''}`.trim() || (isOwner ? t(language, 'addShopName') : '');
 
  return (
    <main className="page profile">
      {/* ── Hero / Banner ── */}
      <div className="profile__hero">
        <div className="profile__bg" onClick={() => isOwner && bgRef.current?.click()}>
          {shop.backgroundImage
            ? <img src={shop.backgroundImage} alt="" className="profile__bg-img" />
            : <div className="profile__bg-empty">
                {isOwner && (
                  <span className="profile__bg-hint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    {t(language, 'addCover')}
                  </span>
                )}
              </div>
          }
          {isOwner && <input ref={bgRef} type="file" accept="image/*" hidden onChange={handleBg} />}
        </div>
 
        <div className="profile__avatar-wrap" onClick={() => isOwner && avatarRef.current?.click()}>
          {shop.avatar
            ? <img src={shop.avatar} alt="" className="profile__avatar" />
            : <div className="profile__avatar profile__avatar--empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
          }
          {isOwner && (
            <>
              <div className="profile__avatar-edit">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
            </>
          )}
        </div>
      </div>
 
      {/* ── Info ── */}
      <div className="profile__info">
        <div className="profile__name-row">
          {editingName ? (
            <div className="profile__name-edit-wrap">
              <input
                className="profile__name-input"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                placeholder={t(language, 'addShopName')}
                autoFocus
              />
              <div className="profile__name-edit-actions">
                <button onClick={() => setEditingName(false)} className="profile__about-cancel">✕</button>
                <button onClick={saveName} className="profile__about-save">✓</button>
              </div>
            </div>
          ) : (
            <div className="profile__name-block" onClick={() => isOwner && setEditingName(true)}>
              <h1 className="profile__name">{shopName}</h1>
              {shop.telegramUsername && <p className="profile__tg">@{shop.telegramUsername}</p>}
            </div>
          )}
          {isOwner && !editingName && (
            <button className="profile__menu-btn" onClick={() => setMenuOpen(true)} aria-label="Меню">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
          )}
        </div>
 
        <div className="profile__stats">
          <button className="profile__stat profile__stat--btn" onClick={() => setFollowersModal('followers')}>
            <span className="profile__stat-num">{shop.shopLikesCount ?? 0}</span>
            <span className="profile__stat-label">{t(language, 'followers')}</span>
          </button>
          <div className="profile__stat-divider" />
          <button className="profile__stat profile__stat--btn" onClick={() => setFollowersModal('following')}>
            <span className="profile__stat-num">{shop.followingCount ?? 0}</span>
            <span className="profile__stat-label">{t(language, 'following')}</span>
          </button>
        </div>
 
        {!isOwner && (
          <div className="profile__actions">
            <button
              className={`profile__action-btn profile__action-btn--primary${shop.isShopLiked ? ' followed' : ''}`}
              onClick={handleFollow}
            >
              {shop.isShopLiked ? t(language, 'followAction') : t(language, 'follow')}
            </button>
            {shop.telegramUsername && (
              <button className="profile__action-btn" onClick={handleMessage}>
                {t(language, 'message')}
              </button>
            )}
            <button className="profile__action-btn profile__action-btn--icon" onClick={handleShare}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </div>
        )}
        {isOwner && (
          <div className="profile__actions">
            <button className="profile__action-btn" onClick={handleShare}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              {t(language, 'share')}
            </button>
          </div>
        )}
 
        <div className="profile__about">
          {editingAbout ? (
            <div className="profile__about-edit">
              <textarea
                className="profile__about-input"
                value={aboutDraft}
                onChange={e => setAboutDraft(e.target.value)}
                rows={3}
                placeholder={t(language, 'addBio')}
              />
              <div className="profile__about-actions">
                <button onClick={() => setEditingAbout(false)} className="profile__about-cancel">Cancel</button>
                <button onClick={saveAbout} className="profile__about-save">Save</button>
              </div>
            </div>
          ) : (
            <p className="profile__about-text" onClick={() => isOwner && setEditingAbout(true)}>
              {shop.about ? renderTextWithLinks(shop.about) : (isOwner ? t(language, 'addBio') : '')}
            </p>
          )}
        </div>
      </div>
 
      {/* ── Каталог Section ── */}
      <section className="profile__section">
        <div className="profile__section-header">
          <h3 className="profile__section-label">{t(language, 'myListings')}</h3>
          {isOwner && (
            <button className="profile__add-item-btn" onClick={() => navigate('/add')}>
              {t(language, 'newListing')}
            </button>
          )}
        </div>
 
        {items.length > 0 && (
          <div className="profile__filters">
            <button
              className={`profile__filter-chip${activeFilter === 'all' ? ' active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              Все
            </button>
            {availableCategories.map(cat => (
              <button
                key={cat}
                className={`profile__filter-chip${activeFilter === cat ? ' active' : ''}`}
                onClick={() => handleFilterChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
 
        {items.length === 0 ? (
          <div className="empty-state">
            <p>{isOwner ? t(language, 'listFirstItem') : t(language, 'noItemsYet')}</p>
          </div>
        ) : (
          <>
            <div className="profile__items-grid">
              {visibleItems.map(item => (
                <div key={item.id} className="profile__item-wrap">
                  <ItemCard item={item} onClick={item => navigate(`/item/${item.id}`, { state: { item } })} onLikeChange={() => {}} />
                  {isOwner && (
                    <div className="profile__item-actions">
                      <button onClick={() => navigate(`/edit/${item.id}`)} className="profile__item-edit">
                        {t(language, 'edit')}
                      </button>
                      <button onClick={() => handleMarkSold(item.id)} className="profile__item-sold">
                        {item.isSold ? t(language, 'markAvailable') : t(language, 'markSold')}
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="profile__item-del">
                        {t(language, 'delete')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
 
            {visibleCount < filteredItems.length && (
              <button
                className="profile__show-more"
                onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)}
              >
                Показать ещё
              </button>
            )}
          </>
        )}
      </section>
 
      {/* ── Лукбук Section ── */}
      <section className="profile__section">
        <div className="profile__section-header">
          <h3 className="profile__section-label">{t(language, 'lookBoard')}</h3>
          {isOwner && (
            <button className="profile__add-lb" onClick={openLbModal} disabled={lbUploading}>
              {lbUploading ? '…' : t(language, 'addLook')}
            </button>
          )}
        </div>
        {lookBoards.length === 0 ? (
          isOwner ? (
            <div className="profile__lb-empty">
              <p>{t(language, 'createFirstLook')}</p>
            </div>
          ) : null
        ) : (
          <div className="profile__lb-feed">
            {lookBoards.map(lb => (
              <div key={lb.id} className="profile__lb-post">
                <div className="profile__lb-scroll">
                  {lb.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="profile__lb-scroll-img" />
                  ))}
                </div>
                {(lb.title || lb.description) && (
                  <div className="profile__lb-text">
                    {lb.title && <p className="profile__lb-title">{lb.title}</p>}
                    {lb.description && <p className="profile__lb-desc">{lb.description}</p>}
                  </div>
                )}
                {isOwner && (
                  <button className="profile__lb-delete" onClick={() => handleDeleteLb(lb.id)}>
                    {t(language, 'remove')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
 
      {/* ── Архив Section ── */}
      {archivedItems.length > 0 && (
        <section className="profile__section profile__section--archive">
          <div className="profile__section-header">
            <h3 className="profile__section-label">{t(language, 'archive')}</h3>
            <span className="profile__section-count">{archivedItems.length}</span>
          </div>
          <div className="profile__items-grid">
            {archivedItems.map(item => (
              <div key={item.id} className="profile__item-wrap">
                <ItemCard item={item} onClick={item => navigate(`/item/${item.id}`, { state: { item } })} onLikeChange={() => {}} />
                {isOwner && (
                  <div className="profile__item-actions">
                    <button onClick={() => navigate(`/edit/${item.id}`)} className="profile__item-edit">
                      {t(language, 'edit')}
                    </button>
                    <button onClick={() => handleMarkSold(item.id)} className="profile__item-sold">
                      {t(language, 'markAvailable')}
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="profile__item-del">
                      {t(language, 'delete')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
 
      {/* Lookbook Create Modal */}
      {lbModalOpen && (
        <div className="lb-modal-overlay" onClick={() => setLbModalOpen(false)}>
          <div className="lb-modal" onClick={e => e.stopPropagation()}>
            <div className="lb-modal__header">
              <h3>{t(language, 'lookBoard')}</h3>
              <button onClick={() => setLbModalOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="lb-modal__body">
              {lbPreviews.length > 0 ? (
                <div className="lb-modal__previews">
                  {lbPreviews.map((src, i) => (
                    <img key={i} src={src} alt="" className="lb-modal__preview-img" />
                  ))}
                </div>
              ) : (
                <button className="lb-modal__pick" onClick={() => lbFileRef.current?.click()}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  <span>{language === 'ru' ? 'Выбрать фото' : 'Choose photos'}</span>
                </button>
              )}
              {lbPreviews.length > 0 && (
                <button className="lb-modal__pick-more" onClick={() => lbFileRef.current?.click()}>
                  {language === 'ru' ? 'Изменить фото' : 'Change photos'}
                </button>
              )}
              <input
                ref={lbFileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleLbFileSelect}
              />
              <textarea
                className="lb-modal__desc"
                value={lbDesc}
                onChange={e => setLbDesc(e.target.value)}
                placeholder={t(language, 'lookbookDescription')}
                rows={3}
              />
            </div>
            <div className="lb-modal__footer">
              <button
                className="lb-modal__submit"
                onClick={handleLbSubmit}
                disabled={!lbFiles.length || lbUploading}
              >
                {lbUploading ? '…' : (language === 'ru' ? 'Опубликовать' : 'Publish')}
              </button>
            </div>
          </div>
        </div>
      )}
 
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
 
      {followersModal && (
        <FollowersModal
          shopId={shopId}
          mode={followersModal}
          onClose={() => setFollowersModal(null)}
        />
      )}
    </main>
  );
}