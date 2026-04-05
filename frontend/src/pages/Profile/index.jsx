import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getMe, getShop, updateProfile,
  uploadAvatar, uploadBackground,
  deleteLookBoard, createLookBoard,
  toggleShopLike, deleteItem, markItemSold,
} from '../../api/client';
import { useAuth, useSettings } from '../../App';
import { t } from '../../translations';
import ItemCard from '../../components/ItemCard';
import ItemDetail from '../../components/ItemDetail';
import './Profile.css';

export default function Profile() {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  const { language } = useSettings();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [selected, setSelected] = useState(null);
  const [lbUploading, setLbUploading] = useState(false);

  const avatarRef = useRef();
  const bgRef = useRef();
  const lbRef = useRef();

  const isOwner = !id || (authUser && String(authUser.id) === id);

  // Always use getShop — it returns items + lookBoards.
  // For own profile, pass authUser.id when no id param.
  const shopId = id || (authUser ? String(authUser.id) : null);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    getShop(shopId)
      .then(data => {
        setShop(data);
        setAboutDraft(data.about || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopId]);

  /* ── Avatar ── */
  const handleAvatar = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    const res = await uploadAvatar(fd);
    setShop(prev => ({ ...prev, avatar: res.avatar }));
  }, []);

  /* ── Background ── */
  const handleBg = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('background', file);
    const res = await uploadBackground(fd);
    setShop(prev => ({ ...prev, backgroundImage: res.backgroundImage }));
  }, []);

  /* ── About ── */
  const saveAbout = useCallback(async () => {
    const updated = await updateProfile({ about: aboutDraft });
    setShop(prev => ({ ...prev, about: updated.about }));
    setEditingAbout(false);
  }, [aboutDraft]);

  /* ── Shop follow ── */
  const handleFollow = useCallback(async () => {
    const res = await toggleShopLike(shop.id);
    setShop(prev => ({ ...prev, isShopLiked: res.liked }));
  }, [shop?.id]);

  /* ── Look Board ── */
  const handleLbUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLbUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('images', f));
      const lb = await createLookBoard(fd);
      setShop(prev => ({ ...prev, lookBoards: [lb, ...(prev.lookBoards || [])] }));
    } finally {
      setLbUploading(false);
    }
  }, []);

  const handleDeleteLb = useCallback(async (lbId) => {
    await deleteLookBoard(lbId);
    setShop(prev => ({ ...prev, lookBoards: prev.lookBoards.filter(l => l.id !== lbId) }));
  }, []);

  /* ── Item actions ── */
  const handleDeleteItem = useCallback(async (itemId) => {
    await deleteItem(itemId);
    setShop(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }));
    setSelected(null);
  }, []);

  const handleMarkSold = useCallback(async (itemId) => {
    const res = await markItemSold(itemId);
    setShop(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, isSold: res.isSold } : i),
    }));
  }, []);

  if (loading) return <main className="page"><div className="spinner" /></main>;
  if (!shop) return <main className="page"><div className="empty-state"><p>{t(language, 'shopNotFound')}</p></div></main>;

  const lookBoards = shop.lookBoards || [];
  const items = shop.items || [];

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

        {/* Avatar */}
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
          <div>
            <h1 className="profile__name">
              {shop.firstName} {shop.lastName}
            </h1>
            {shop.telegramUsername && (
              <p className="profile__tg">@{shop.telegramUsername}</p>
            )}
          </div>
          {!isOwner && (
            <button
              className={`profile__follow-btn${shop.isShopLiked ? ' followed' : ''}`}
              onClick={handleFollow}
            >
              {shop.isShopLiked ? t(language, 'following') : t(language, 'follow')}
            </button>
          )}
        </div>

        {/* About */}
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
            <p
              className="profile__about-text"
              onClick={() => isOwner && setEditingAbout(true)}
            >
              {shop.about || (isOwner ? t(language, 'addBio') : '')}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="profile__stats">
          <div className="profile__stat">
            <span className="profile__stat-num">{shop.itemsCount ?? items.length}</span>
            <span className="profile__stat-label">{t(language, 'items')}</span>
          </div>
          <div className="profile__stat-divider" />
          <div className="profile__stat">
            <span className="profile__stat-num">{shop.shopLikesCount ?? 0}</span>
            <span className="profile__stat-label">{t(language, 'followers')}</span>
          </div>
        </div>
      </div>

      {/* ── Look Board ── */}
      {(lookBoards.length > 0 || isOwner) && (
        <section className="profile__section">
          <div className="profile__section-header">
            <h2 className="profile__section-title">{t(language, 'lookBoard')}</h2>
            {isOwner && (
              <button
                className="profile__add-lb"
                onClick={() => lbRef.current?.click()}
                disabled={lbUploading}
              >
                {lbUploading ? '…' : t(language, 'addLook')}
              </button>
            )}
          </div>
          <input ref={lbRef} type="file" accept="image/*" multiple hidden onChange={handleLbUpload} />

          {lookBoards.length === 0 ? (
            <div className="profile__lb-empty">
              <p>{t(language, 'createFirstLook')}</p>
            </div>
          ) : (
            <div className="profile__lb-grid">
              {lookBoards.map(lb => (
                <div key={lb.id} className="profile__lb-item">
                  <div className="profile__lb-photos">
                    {lb.images.slice(0, 4).map((img, i) => (
                      <img key={i} src={img} alt="" className="profile__lb-img" />
                    ))}
                  </div>
                  {lb.title && <p className="profile__lb-title">{lb.title}</p>}
                  {isOwner && (
                    <button
                      className="profile__lb-delete"
                      onClick={() => handleDeleteLb(lb.id)}
                    >
                      {t(language, 'remove')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Catalogue ── */}
      <section className="profile__section">
        <div className="profile__section-header">
          <h2 className="profile__section-title">
            {isOwner ? t(language, 'myListings') : t(language, 'listings')}
          </h2>
          {isOwner && (
            <button
              className="profile__add-item-btn"
              onClick={() => navigate('/add')}
            >
              {t(language, 'newListing')}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <p>{isOwner ? t(language, 'listFirstItem') : t(language, 'noItemsYet')}</p>
          </div>
        ) : (
          <div className="profile__items-grid">
            {items.map(item => (
              <div key={item.id} className="profile__item-wrap">
                <ItemCard
                  item={item}
                  onClick={setSelected}
                  onLikeChange={() => {}}
                />
                {isOwner && (
                  <div className="profile__item-actions">
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
        )}
      </section>

      {selected && (
        <ItemDetail
          item={selected}
          onClose={() => setSelected(null)}
          onLikeChange={() => {}}
        />
      )}
    </main>
  );
}
