import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, getLookBoardFeed } from '../../api/client';
import { useSettings } from '../../App';
import { t } from '../../translations';
import ItemCard from '../../components/ItemCard';
import ItemDetail from '../../components/ItemDetail';
import './Home.css';

const CATEGORIES = [
  'Обувь', 'Верхняя одежда', 'Средний слой', 'Штаны/Джинсы', 'Аксессуары', 'Прочее',
];

export default function Home() {
  const { language } = useSettings();
  const navigate = useNavigate();
  const [lookbooks, setLookbooks] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [archivedItems, setArchivedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getLookBoardFeed().catch(() => []),
      getItems({ feed: 'true' }).catch(() => ({ items: [] })),
      getItems({ feed: 'true', isSold: 'true' }).catch(() => ({ items: [] })),
    ]).then(([lbs, itemsData, soldData]) => {
      if (cancelled) return;
      setLookbooks(lbs || []);
      setAllItems(itemsData.items || []);
      setArchivedItems(soldData.items || []);
      setApiError(false);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setApiError(true); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const handleLikeChange = useCallback((itemId, liked) => {
    if (liked) {
      setAllItems(prev => prev.filter(i => i.id !== itemId));
    } else {
      setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, isLiked: false } : i));
    }
    if (selected?.id === itemId) setSelected(null);
  }, [selected?.id]);

  if (loading) return (
    <>
      <main className="page home"><div className="spinner" /></main>
    </>
  );

  if (apiError) return (
    <>
      <main className="page home">
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{t(language, 'couldNotConnect')}</p>
        </div>
      </main>
    </>
  );

  // Group items by category
  const byCategory = {};
  CATEGORIES.forEach(cat => {
    const catItems = allItems.filter(i => i.category === cat);
    if (catItems.length > 0) byCategory[cat] = catItems;
  });
  const other = allItems.filter(i => !CATEGORIES.includes(i.category));
  if (other.length > 0) byCategory['Other'] = [...(byCategory['Other'] || []), ...other];

  const hasContent = lookbooks.length > 0 || allItems.length > 0 || archivedItems.length > 0;

  return (
    <>
      <main className="page home">
        {!hasContent ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>{t(language, 'noItemsYet')}</p>
          </div>
        ) : (
          <>
            {/* ── Лукбук Strip ── */}
            {lookbooks.length > 0 && (
              <section className="home__section">
                <div className="home__section-header">
                  <h2 className="home__section-title">{t(language, 'lookBoard')}</h2>
                </div>
                <div className="home__lb-scroll">
                  {lookbooks.map(lb => (
                    <div
                      key={lb.id}
                      className="home__lb-card"
                      onClick={() => lb.user && navigate(`/shop/${lb.user.id}`)}
                    >
                      <div className="home__lb-imgs">
                        {lb.images.slice(0, 2).map((img, i) => (
                          <img key={i} src={img} alt="" className="home__lb-img" />
                        ))}
                      </div>
                      {lb.user && (
                        <div className="home__lb-meta">
                          <div className="home__lb-avatar">
                            {lb.user.avatar
                              ? <img src={lb.user.avatar} alt="" />
                              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            }
                          </div>
                          <span className="home__lb-username">
                            {lb.user.firstName || lb.user.telegramUsername}
                          </span>
                        </div>
                      )}
                      {lb.description && (
                        <p className="home__lb-desc">{lb.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Items by Category ── */}
            {Object.entries(byCategory).map(([cat, catItems]) => (
              <section key={cat} className="home__section">
                <div className="home__section-header">
                  <h2 className="home__section-title">{cat}</h2>
                  <span className="home__section-count">{catItems.length}</span>
                </div>
                <div className="home__items-scroll">
                  {catItems.map(item => (
                    <div key={item.id} className="home__item-cell">
                      <ItemCard
                        item={item}
                        onLikeChange={handleLikeChange}
                        onClick={setSelected}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* ── Архив ── */}
            {archivedItems.length > 0 && (
              <section className="home__section home__section--archive">
                <div className="home__section-header">
                  <h2 className="home__section-title">{t(language, 'archive')}</h2>
                  <span className="home__section-count">{archivedItems.length}</span>
                </div>
                <div className="home__items-scroll">
                  {archivedItems.map(item => (
                    <div key={item.id} className="home__item-cell">
                      <ItemCard
                        item={item}
                        onLikeChange={() => {}}
                        onClick={setSelected}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
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
