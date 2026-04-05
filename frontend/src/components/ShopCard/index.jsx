import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toggleShopLike } from '../../api/client';
import { useTelegram } from '../../hooks/useTelegram';
import './ShopCard.css';

export default function ShopCard({ shop, onLikeChange }) {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const handleLike = useCallback(async (e) => {
    e.stopPropagation();
    haptic('light');
    try {
      const res = await toggleShopLike(shop.id);
      onLikeChange?.(shop.id, res.liked);
    } catch {}
  }, [shop.id, haptic, onLikeChange]);

  const openTg = useCallback((e) => {
    e.stopPropagation();
    if (!shop.telegramUsername) return;
    window.Telegram?.WebApp?.openTelegramLink(`https://t.me/${shop.telegramUsername}`);
  }, [shop.telegramUsername]);

  return (
    <div className="shop-card" onClick={() => navigate(`/shop/${shop.id}`)}>
      {/* Background banner */}
      <div className="shop-card__bg">
        {shop.backgroundImage ? (
          <img src={shop.backgroundImage} alt="" className="shop-card__bg-img" />
        ) : (
          <div className="shop-card__bg-placeholder" />
        )}
      </div>

      {/* Body */}
      <div className="shop-card__body">
        <div className="shop-card__avatar-wrap">
          {shop.avatar ? (
            <img src={shop.avatar} alt="" className="shop-card__avatar" />
          ) : (
            <div className="shop-card__avatar shop-card__avatar--empty">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          )}
        </div>

        <div className="shop-card__info">
          <p className="shop-card__name">
            {shop.firstName} {shop.lastName}
          </p>
          {shop.telegramUsername && (
            <p className="shop-card__tg">@{shop.telegramUsername}</p>
          )}
          <div className="shop-card__stats">
            <span>{shop.itemsCount ?? 0} items</span>
            <span>·</span>
            <span>{shop.shopLikesCount ?? 0} followers</span>
          </div>
        </div>

        <div className="shop-card__actions">
          <button
            className={`shop-card__follow${shop.isShopLiked ? ' followed' : ''}`}
            onClick={handleLike}
          >
            {shop.isShopLiked ? 'Following' : 'Follow'}
          </button>
          {shop.telegramUsername && (
            <button className="shop-card__msg" onClick={openTg} aria-label="Message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
