import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toggleItemLike } from '../../api/client';
import { useSettings, BackButtonContext } from '../../App';
import { useTelegram } from '../../hooks/useTelegram';
import './ItemDetail.css';

export default function ItemDetail({ item, onClose, onLikeChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currency } = useSettings();
  const { haptic } = useTelegram();
  const backOverrideRef = useContext(BackButtonContext);
  const [activeImg, setActiveImg] = useState(0);
  const [isLiked, setIsLiked] = useState(item?.isLiked ?? false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);
  const imgWrapRef = useRef(null);
  const trackRef = useRef(null);
  const activeImgRef = useRef(0);
  const imagesLenRef = useRef(0);
  const skipNextSnapRef = useRef(false);
  const mountedRef = useRef(false);

  const isHome = location.pathname === '/';

  // Управление Telegram BackButton при открытии модалки
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    tg.BackButton.show();

    if (isHome) {
      // На главной Header не регистрирует обработчик — ставим напрямую
      tg.BackButton.onClick(onClose);
      return () => {
        tg.BackButton.offClick(onClose);
        tg.BackButton.hide();
      };
    } else {
      // На других страницах Header уже показал кнопку и читает backOverrideRef
      if (backOverrideRef) backOverrideRef.current = onClose;
      return () => {
        if (backOverrideRef) backOverrideRef.current = null;
        // Не скрываем — Header отвечает за отображение на не-главных страницах
      };
    }
  }, [onClose, backOverrideRef, isHome]);

  // Блокируем вертикальный свайп Telegram (закрытие приложения) пока открыта деталь
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    tg?.disableVerticalSwipes?.();
    return () => tg?.enableVerticalSwipes?.();
  }, []);

  // Синхронизируем ref с состоянием для использования в замыканиях
  useEffect(() => { activeImgRef.current = activeImg; }, [activeImg]);

  // Подгоняем высоту обёртки под текущее фото (убирает серые полоски)
  const syncWrapHeight = useCallback((imgIndex) => {
    const el = imgWrapRef.current;
    if (!el) return;
    const imgs = el.querySelectorAll('img');
    const img = imgs[imgIndex];
    if (!img || !img.naturalWidth) return;
    const w = el.offsetWidth;
    const h = Math.min(w * img.naturalHeight / img.naturalWidth, window.innerHeight * 0.8);
    el.style.height = `${Math.round(h)}px`;
  }, []);

  useEffect(() => { syncWrapHeight(activeImg); }, [activeImg, syncWrapHeight]);

  // Snap трека при смене activeImg (клик по точке или инициализация)
  useEffect(() => {
    if (!trackRef.current) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      trackRef.current.style.transition = 'none';
      trackRef.current.style.transform = 'translateX(0%)';
      return;
    }
    if (skipNextSnapRef.current) {
      skipNextSnapRef.current = false;
      return;
    }
    trackRef.current.style.transition = 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    trackRef.current.style.transform = `translateX(${-activeImg * 100}%)`;
  }, [activeImg]);

  // Non-passive touchmove — блокирует перехват Telegram и даёт live drag
  useEffect(() => {
    const el = imgWrapRef.current;
    if (!el) return;
    const onMove = (e) => {
      if (touchStartX.current === null) return;
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.touches[0].clientY - (touchStartY.current ?? 0));
      if (Math.abs(dx) > dy && Math.abs(dx) > 5) {
        e.preventDefault();
        if (!trackRef.current || imagesLenRef.current <= 1) return;
        const cur = activeImgRef.current;
        const total = imagesLenRef.current;
        // Резиновый эффект на краях
        const atEdge = (cur === 0 && dx > 0) || (cur === total - 1 && dx < 0);
        const offset = atEdge ? dx * 0.25 : dx;
        trackRef.current.style.transition = 'none';
        trackRef.current.style.transform = `translateX(calc(${-cur * 100}% + ${offset}px))`;
      }
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const dt = Math.max(1, Date.now() - (touchStartTime.current ?? Date.now()));
    const velocity = Math.abs(diff) / dt; // px/ms
    const containerWidth = imgWrapRef.current?.offsetWidth ?? 300;
    const total = imagesLenRef.current;

    const isFastFlick = velocity > 0.4;                    // ~400px/s — быстрый бросок
    const isPastThreshold = Math.abs(diff) > containerWidth * 0.3; // 30% ширины экрана

    let newIndex = activeImgRef.current;
    if (isFastFlick || isPastThreshold) {
      if (diff > 0) newIndex = Math.min(newIndex + 1, total - 1);
      else newIndex = Math.max(newIndex - 1, 0);
    }

    // Чем быстрее бросок — тем короче анимация (как в Instagram)
    const snapMs = isFastFlick
      ? Math.max(150, Math.round(220 - velocity * 80))
      : 280;

    if (trackRef.current) {
      trackRef.current.style.transition = `transform ${snapMs}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      trackRef.current.style.transform = `translateX(${-newIndex * 100}%)`;
    }

    skipNextSnapRef.current = true;
    activeImgRef.current = newIndex;
    setActiveImg(newIndex);
    touchStartX.current = null;
    touchStartY.current = null;
    touchStartTime.current = null;
  }, []);

  const handleLike = useCallback(async () => {
    haptic('light');
    try {
      const res = await toggleItemLike(item.id);
      setIsLiked(res.liked);
      onLikeChange?.(item.id, res.liked);
    } catch {}
  }, [item?.id, haptic, onLikeChange]);

  const openShop = useCallback(() => {
    navigate(`/shop/${item.seller?.id}`);
  }, [item?.seller?.id, navigate]);

  const openTgChat = useCallback(() => {
    if (!item?.seller?.telegramUsername) return;
    window.Telegram?.WebApp?.openTelegramLink(
      `https://t.me/${item.seller.telegramUsername}`
    );
  }, [item?.seller?.telegramUsername]);

  if (!item) return null;

  const images = item.images || [];
  imagesLenRef.current = images.length;

  return (
    <div className="item-detail-overlay" onClick={onClose}>
      <div className="item-detail" onClick={e => e.stopPropagation()}>

        {/* Фото — занимает верхнюю часть */}
        <div className="item-detail__hero">

          {images.length > 0 ? (
            <div
              ref={imgWrapRef}
              className="item-detail__main-img-wrap"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div ref={trackRef} className="item-detail__img-track">
                {images.map((src, i) => (
                  <div key={i} className="item-detail__img-slide">
                    <img
                      className="item-detail__main-img"
                      src={src}
                      alt={item.title}
                      draggable={false}
                      onLoad={() => { if (i === activeImgRef.current) syncWrapHeight(i); }}
                    />
                  </div>
                ))}
              </div>
              {item.isSold && <div className="item-detail__sold">SOLD</div>}
              {images.length > 1 && (
                <div className="item-detail__dots">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      className={`item-detail__dot${activeImg === i ? ' active' : ''}`}
                      onClick={() => setActiveImg(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Нет фото — показываем пустой блок чтобы кнопки были видны */
            <div className="item-detail__no-img" />
          )}
        </div>

        {/* Info */}
        <div className="item-detail__info">
          <div className="item-detail__brand-row">
            {item.brand
              ? <p className="item-detail__brand">{item.brand}</p>
              : <span />}
            <button
              className={`item-detail__like-btn${isLiked ? ' liked' : ''}`}
              onClick={handleLike}
              aria-label="Лайк"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
          </div>
          <h2 className="item-detail__title">{item.title}</h2>

          <div className="item-detail__price-row">
            <span className="item-detail__price">{item.price} {currency || item.currency}</span>
            {item.size && <span className="item-detail__pill">{item.size}</span>}
            {item.subcategory && <span className="item-detail__pill">{item.subcategory}</span>}
          </div>

          {item.description && (
            <p className="item-detail__description">{item.description}</p>
          )}

          {/* Seller */}
          {item.seller && (
            <div className="item-detail__seller">
              <div className="item-detail__seller-info" onClick={openShop}>
                <div className="item-detail__seller-avatar">
                  {item.seller.avatar ? (
                    <img src={item.seller.avatar} alt="" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p className="item-detail__seller-name">
                    {item.seller.firstName} {item.seller.lastName}
                  </p>
                  {item.seller.telegramUsername && (
                    <p className="item-detail__seller-tg">@{item.seller.telegramUsername}</p>
                  )}
                </div>
              </div>
              {item.seller.about && (
                <p className="item-detail__seller-about">{item.seller.about}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="item-detail__actions">
          <button className="item-detail__btn-secondary" onClick={openShop}>
            Перейти в магазин
          </button>
          {item.seller?.telegramUsername && (
            <button className="item-detail__btn-primary" onClick={openTgChat}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Написать продавцу
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
