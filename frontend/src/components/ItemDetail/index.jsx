import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toggleItemLike } from '../../api/client';
import { useSettings } from '../../App';
import { useTelegram } from '../../hooks/useTelegram';
import './ItemDetail.css';

const CONDITION_LABELS = {
  new: 'New with tags',
  like_new: 'Like new',
  good: 'Good condition',
  fair: 'Fair condition',
};

export default function ItemDetail({ item, onClose, onLikeChange }) {
  const navigate = useNavigate();
  const { currency } = useSettings();
  const { haptic } = useTelegram();
  const [activeImg, setActiveImg] = useState(0);
  const [isLiked, setIsLiked] = useState(item?.isLiked ?? false);

  const handleLike = useCallback(async () => {
    haptic('light');
    try {
      const res = await toggleItemLike(item.id);
      setIsLiked(res.liked);
      onLikeChange?.(item.id, res.liked);
    } catch {}
  }, [item?.id, haptic, onLikeChange]);

  const openShop = useCallback(() => {
    onClose();
    navigate(`/shop/${item.seller?.id}`);
  }, [item?.seller?.id, navigate, onClose]);

  const openTgChat = useCallback(() => {
    if (!item?.seller?.telegramUsername) return;
    window.Telegram?.WebApp?.openTelegramLink(
      `https://t.me/${item.seller.telegramUsername}`
    );
  }, [item?.seller?.telegramUsername]);

  if (!item) return null;

  const images = item.images || [];

  return (
    <div className="item-detail-overlay" onClick={onClose}>
      <div className="item-detail" onClick={e => e.stopPropagation()}>

        {/* Фото — занимает верхнюю часть, кнопка назад поверх него */}
        <div className="item-detail__hero">
          <div className="item-detail__overlay-bar">
            <button className="item-detail__overlay-btn" onClick={onClose} aria-label="Назад">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
              </svg>
            </button>
          </div>

          {images.length > 0 ? (
            <>
              <div className="item-detail__main-img-wrap">
                <img
                  className="item-detail__main-img"
                  src={images[activeImg]}
                  alt={item.title}
                />
                {item.isSold && <div className="item-detail__sold">SOLD</div>}
              </div>
              {images.length > 1 && (
                <div className="item-detail__thumbs">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      className={`item-detail__thumb${activeImg === i ? ' active' : ''}`}
                      onClick={() => setActiveImg(i)}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </>
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
            <span className="item-detail__pill">{CONDITION_LABELS[item.condition] || item.condition}</span>
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
                <svg className="item-detail__seller-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="item-detail__actions">
          <button className="item-detail__btn-secondary" onClick={openShop}>
            Visit Shop
          </button>
          {item.seller?.telegramUsername && (
            <button className="item-detail__btn-primary" onClick={openTgChat}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Message Seller
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
