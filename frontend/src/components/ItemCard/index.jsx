import React from 'react';
import { useSettings } from '../../App';
import './ItemCard.css';

const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

export default function ItemCard({ item, onClick }) {
  const { currency } = useSettings();

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
