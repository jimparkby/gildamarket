import React, { useState, useEffect, useCallback } from 'react';
import { getFavorites, toggleShopLike } from '../../api/client';
import ItemCard from '../../components/ItemCard';
import ShopCard from '../../components/ShopCard';
import ItemDetail from '../../components/ItemDetail';
import './Favorites.css';

export default function Favorites() {
  const [tab, setTab] = useState('items'); // items | shops
  const [items, setItems] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    getFavorites()
      .then(data => {
        setItems(data.items || []);
        setShops(data.shops || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleItemLikeChange = useCallback((itemId, liked) => {
    if (!liked) setItems(prev => prev.filter(i => i.id !== itemId));
    if (selected?.id === itemId) setSelected(null);
  }, [selected?.id]);

  const handleShopLikeChange = useCallback((shopId, liked) => {
    if (!liked) setShops(prev => prev.filter(s => s.id !== shopId));
  }, []);

  return (
    <main className="page favorites">
      {/* Tabs */}
      <div className="favorites__tabs">
        <button
          className={`favorites__tab${tab === 'items' ? ' active' : ''}`}
          onClick={() => setTab('items')}
        >
          Items
          {items.length > 0 && (
            <span className="favorites__count">{items.length}</span>
          )}
        </button>
        <button
          className={`favorites__tab${tab === 'shops' ? ' active' : ''}`}
          onClick={() => setTab('shops')}
        >
          Shops
          {shops.length > 0 && (
            <span className="favorites__count">{shops.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : tab === 'items' ? (
        items.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            <p>No saved items yet</p>
          </div>
        ) : (
          <div className="favorites__grid">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onLikeChange={handleItemLikeChange}
                onClick={setSelected}
              />
            ))}
          </div>
        )
      ) : (
        shops.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <p>No saved shops yet</p>
          </div>
        ) : (
          <div className="favorites__shops">
            {shops.map(shop => (
              <ShopCard
                key={shop.id}
                shop={shop}
                onLikeChange={handleShopLikeChange}
              />
            ))}
          </div>
        )
      )}

      {selected && (
        <ItemDetail
          item={selected}
          onClose={() => setSelected(null)}
          onLikeChange={handleItemLikeChange}
        />
      )}
    </main>
  );
}
