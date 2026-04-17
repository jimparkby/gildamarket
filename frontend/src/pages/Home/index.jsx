import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getItems } from '../../api/client';
import { useSettings } from '../../App';
import { t } from '../../translations';
import ItemCard from '../../components/ItemCard';
import ItemDetail from '../../components/ItemDetail';
import { getRestoredItem } from '../../hooks/useItemDetailRestore';
import './Home.css';

const INITIAL = 20;
const VIEW_MORE = 100;

export default function Home() {
  const { language } = useSettings();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [visible, setVisible] = useState(INITIAL);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [selected, setSelected] = useState(() => getRestoredItem(location.pathname));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getItems({ feed: 'true' })
      .then(data => {
        if (cancelled) return;
        setItems(data.items || []);
        setApiError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setApiError(true); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  const handleLikeChange = useCallback((itemId, liked) => {
    if (liked) {
      setItems(prev => prev.filter(i => i.id !== itemId));
    } else {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, isLiked: false } : i));
    }
  }, []);

  if (loading && !selected) return (
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

  const shown = items.slice(0, visible);

  return (
    <>
      <main className="page home">
        <div className="home__grid">
          {shown.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onLikeChange={handleLikeChange}
              onClick={setSelected}
            />
          ))}
        </div>

        {visible < items.length && (
          <div className="home__more">
            <button
              className="home__more-btn"
              onClick={() => setVisible(v => v + VIEW_MORE)}
            >
              {t(language, 'viewMore')}
            </button>
          </div>
        )}
      </main>

      {selected && (
        <ItemDetail
          item={selected}
          onClose={() => setSelected(null)}
          onLikeChange={handleLikeChange}
        />
      )}
    </>
  );
}
