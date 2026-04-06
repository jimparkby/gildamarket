import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getItems } from '../../api/client';
import { useSettings } from '../../App';
import { t } from '../../translations';
import ItemCard from '../../components/ItemCard';
import ItemDetail from '../../components/ItemDetail';
import './Home.css';

const INITIAL = 20;
const MORE = 10;
const PAGE_SIZE = 30;

export default function Home() {
  const { language } = useSettings();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [mode, setMode] = useState('initial');
  const [page, setPage] = useState(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const searchRef = useRef('');
  const inputRef = useRef(null);

  // Слушаем событие от BottomNav
  useEffect(() => {
    const handler = () => {
      setSearchOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener('gilda:open-search', handler);
    return () => window.removeEventListener('gilda:open-search', handler);
  }, []);

  const fetchItems = useCallback(async (opts = {}) => {
    try {
      const params = {};
      if (searchRef.current) params.search = searchRef.current;
      if (opts.mode === 'more') params.mode = 'more';
      if (opts.page) params.page = opts.page;
      const data = await getItems(params);
      return data;
    } catch {
      return { items: [], total: 0 };
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setApiError(false);
    fetchItems().then(data => {
      setItems(data.items);
      setTotal(data.total);
      setMode('initial');
      setPage(null);
      setLoading(false);
    }).catch(() => {
      setApiError(true);
      setLoading(false);
    });
  }, [fetchItems]);

  const handleSearch = useCallback((q) => {
    searchRef.current = q;
    setSearch(q);
    setLoading(true);
    fetchItems().then(data => {
      setItems(data.items);
      setTotal(data.total);
      setMode('initial');
      setPage(null);
      setLoading(false);
    });
  }, [fetchItems]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    handleSearch('');
  }, [handleSearch]);

  const handleViewMore = useCallback(async () => {
    setLoadingMore(true);
    const data = await fetchItems({ mode: 'more' });
    setItems(prev => [...prev, ...data.items]);
    setMode('more');
    setLoadingMore(false);
  }, [fetchItems]);

  const handlePage = useCallback(async (p) => {
    setLoading(true);
    const data = await fetchItems({ page: p });
    setItems(data.items);
    setPage(p);
    setMode('paginated');
    setLoading(false);
    window.scrollTo({ top: 0 });
  }, [fetchItems]);

  const handleLikeChange = useCallback((itemId, liked) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, isLiked: liked } : i
    ));
    if (selected?.id === itemId) {
      setSelected(prev => ({ ...prev, isLiked: liked }));
    }
  }, [selected?.id]);

  const shownAll = mode === 'initial' && items.length >= INITIAL && items.length < total;
  const shownMore = mode === 'more';
  const showPagination = shownMore || (mode === 'paginated');
  const totalPages = Math.ceil((total - INITIAL - MORE) / PAGE_SIZE);

  return (
    <>
      {/* Search bar — появляется под хедером при открытии поиска */}
      {searchOpen && (
        <div className="home__search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="home__search-icon">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="home__search-input"
            placeholder={t(language, 'searchPlaceholder')}
            value={search}
            onChange={e => handleSearch(e.target.value)}
            autoFocus
          />
          <button className="home__search-close" onClick={closeSearch} aria-label="Закрыть">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <main className={`page home${searchOpen ? ' home--searching' : ''}`}>
        {loading ? (
          <div className="spinner" />
        ) : apiError ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p>{t(language, 'couldNotConnect')}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>{t(language, 'noItemsYet')}</p>
          </div>
        ) : (
          <>
            <div className="home__grid">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onLikeChange={handleLikeChange}
                  onClick={setSelected}
                />
              ))}
            </div>

            {shownAll && !loadingMore && (
              <div className="home__more">
                <button className="home__more-btn" onClick={handleViewMore}>
                  {language === 'ru' ? 'Показать ещё' : 'View More'}
                </button>
              </div>
            )}

            {loadingMore && <div className="spinner" />}

            {showPagination && totalPages > 0 && (
              <div className="home__pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`home__page-btn${page === p ? ' active' : ''}`}
                    onClick={() => handlePage(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
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
