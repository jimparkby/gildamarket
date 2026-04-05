import React, { useCallback } from 'react';
import { useSettings } from '../../App';
import { toggleItemLike } from '../../api/client';
import { useTelegram } from '../../hooks/useTelegram';
import './ItemCard.css';

const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

export default function ItemCard({ item, onLikeChange, onClick }) {
  const { currency } = useSettings();
  const { haptic } = useTelegram();

  const handleLike = useCallback(async (e) => {
    e.stopPropagation();
    haptic('light');
    try {
      const res = await toggleItemLike(item.id);
      onLikeChange?.(item.id, res.liked);
    } catch {}
  }, [item.id, haptic, onLikeChange]);

  const image = item.images?.[0];

  return (
    <article className="item-card" onClick={() => onClick?.(item)}>
      <div className="item-card__image-wrap">
        {image ? (
          <img className="item-card__image" src={image} alt={item.title} loading="lazy" />
        ) : (
          <div className="item-card__no-image">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
              <rect x="3" y="3" width="18" height="18" rx="0"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        {item.isSold && <div className="item-card__sold-badge">SOLD</div>}

        <button
          className={`item-card__like${item.isLiked ? ' liked' : ''}`}
          onClick={handleLike}
          aria-label={item.isLiked ? 'Unlike' : 'Like'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={item.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
      </div>

      <div className="item-card__body">
        {item.brand && <p className="item-card__brand">{item.brand}</p>}
        <p className="item-card__title">{item.title}</p>
        <div className="item-card__meta">
          <span className="item-card__price">
            {item.price} {currency || item.currency}
          </span>
          {item.size && <span className="item-card__size">{item.size}</span>}
        </div>
        <span className="item-card__condition">
          {CONDITION_LABELS[item.condition] || item.condition}
        </span>
      </div>
    </article>
  );
}
