import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getItems } from '../../api/client';
import { useSettings } from '../../App';
import { t } from '../../translations';
import ItemCard from '../../components/ItemCard';
import ItemDetail from '../../components/ItemDetail';
import './Search.css';

export default function Search() {
  const { language } = useSettings();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);
  const inputRef = useRef(null);
  const queryRef = useRef('');

  // Фокус при открытии страницы
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setItems([]);
      setTotal(0);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await getItems({ search: q });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Поиск с дебаунсом 300мс
  const timerRef = useRef(null);
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    queryRef.current = val;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  }, [doSearch]);

  const clearQuery = useCallback(() => {
    setQuery('');
    queryRef.current = '';
    setItems([]);
    setSearched(false);
    inputRef.current?.focus();
  }, []);

  const handleLikeChange = useCallback((itemId, liked) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, isLiked: liked } : i));
    if (selected?.id === itemId) setSelected(prev => ({ ...prev, isLiked: liked }));
  }, [selected?.id]);

  return (
    <>
      <main className="page search-page">
        {/* Строка поиска */}
        <div className="search-page__bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="search-page__icon">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="search-page__input"
            placeholder={t(language, 'searchPlaceholder')}
            value={query}
            onChange={handleChange}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button className="search-page__clear" onClick={clearQuery} aria-label="Очистить">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Состояния */}
        {loading ? (
          <div className="spinner" />
        ) : !searched ? (
          <div className="search-page__hint">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>{language === 'ru' ? 'Введите запрос для поиска' : 'Type to search items'}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="search-page__hint">
            <p>{language === 'ru' ? `По запросу «${query}» ничего не найдено` : `Nothing found for "${query}"`}</p>
          </div>
        ) : (
          <>
            <p className="search-page__count">
              {language === 'ru' ? `${total} результат${total === 1 ? '' : total < 5 ? 'а' : 'ов'}` : `${total} result${total !== 1 ? 's' : ''}`}
            </p>
            <div className="search-page__grid">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onLikeChange={handleLikeChange}
                  onClick={setSelected}
                />
              ))}
            </div>
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
