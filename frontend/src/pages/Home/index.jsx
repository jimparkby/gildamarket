import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getItems } from '../../api/client';
import ItemCard from '../../components/ItemCard';
import ItemDetail from '../../components/ItemDetail';
import Header from '../../components/Header';
import './Home.css';

const INITIAL = 20;
const MORE = 10;
const PAGE_SIZE = 30;

export default function Home() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mode, setMode] = useState('initial'); // initial | more | paginated
  const [page, setPage] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const searchRef = useRef('');

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

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchItems().then(data => {
      setItems(data.items);
      setTotal(data.total);
      setMode('initial');
      setPage(null);
      setLoading(false);
    });
  }, [fetchItems]);

  // Search
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

  // Pagination info
  const shownAll = mode === 'initial' && items.length >= INITIAL && items.length < total;
  const shownMore = mode === 'more';
  const showPagination = shownMore || (mode === 'paginated');
  const totalPages = Math.ceil((total - INITIAL - MORE) / PAGE_SIZE);

  return (
    <>
      {/* Header with search */}
      <Header onSearch={handleSearch} />

      <main className="page home">
        {loading ? (
          <div className="spinner" />
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>No items found</p>
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

            {/* View More button */}
            {shownAll && !loadingMore && (
              <div className="home__more">
                <button className="home__more-btn" onClick={handleViewMore}>
                  View More
                </button>
              </div>
            )}

            {loadingMore && <div className="spinner" />}

            {/* Pagination */}
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
