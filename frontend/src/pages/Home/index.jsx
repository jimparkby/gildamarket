import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems } from '../../api/client';
import { useSettings } from '../../App';
import { t } from '../../translations';
import { getCache, setCache } from '../../cache';
import ItemCard from '../../components/ItemCard';
import './Home.css';

const SCROLL_KEY = 'home_scroll';
const FEED_CACHE = 'home_feed';

export default function Home() {
  const { language } = useSettings();
  const navigate = useNavigate();
  const pageRef = useRef(null);

  const cached = getCache(FEED_CACHE);
  const [items, setItems] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getItems({ feed: 'true' })
      .then(data => {
        if (cancelled) return;
        const fresh = data.items || [];
        setItems(fresh);
        setCache(FEED_CACHE, fresh);
        setApiError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          if (!getCache(FEED_CACHE)) setApiError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Restore scroll after items render
  useEffect(() => {
    if (loading || !pageRef.current) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      pageRef.current.scrollTop = parseInt(saved, 10);
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, [loading]);


  const handleLikeChange = useCallback((itemId, liked) => {
    if (liked) {
      setItems(prev => prev.filter(i => i.id !== itemId));
    } else {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, isLiked: false } : i));
    }
  }, []);

  if (loading) return (
    <main className="page home"><div className="spinner" /></main>
  );

  if (apiError) return (
    <main className="page home">
      <div className="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>{t(language, 'couldNotConnect')}</p>
      </div>
    </main>
  );

  if (items.length === 0) return (
    <main className="page home">
      <div className="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>{t(language, 'noItemsYet')}</p>
      </div>
    </main>
  );

  return (
    <main ref={pageRef} className="page home">
      <div className="home__grid">
        {items.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            onLikeChange={handleLikeChange}
            onClick={item => {
                sessionStorage.setItem(SCROLL_KEY, pageRef.current?.scrollTop ?? 0);
                navigate(`/item/${item.id}`, { state: { item } });
              }}
          />
        ))}
      </div>
    </main>
  );
}
