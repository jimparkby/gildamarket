import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, searchUsers } from '../../api/client';
import { useSettings } from '../../App';
import { t } from '../../translations';
import ItemCard from '../../components/ItemCard';
import ItemDetail from '../../components/ItemDetail';
import { useItemDetailRestore } from '../../hooks/useItemDetailRestore';
import './Search.css';

const CATEGORIES = [
  'Обувь', 'Верхняя одежда', 'Футболки', 'Средний слой', 'Штаны/Джинсы/Юбки', 'Сумки', 'Аксессуары', 'Прочее',
];

export default function Search() {
  const { language } = useSettings();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('items'); // items | shops
  const [selectedCat, setSelectedCat] = useState('');
  const [items, setItems] = useState([]);
  const [shops, setShops] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);
  useItemDetailRestore(setSelected);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const doSearch = useCallback(async (q, cat, searchMode) => {
    const hasQuery = q.trim().length > 0;
    const hasCat = cat.length > 0;

    if (!hasQuery && !hasCat) {
      setItems([]);
      setShops([]);
      setTotal(0);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      if (searchMode === 'shops') {
        const data = await searchUsers(q);
        setShops(data);
      } else {
        const params = {};
        if (q.trim()) params.search = q;
        if (cat) params.category = cat;
        const data = await getItems(params);
        setItems(data.items);
        setTotal(data.total);
      }
    } catch {
      setItems([]);
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSearch = useCallback((q, cat, searchMode) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(q, cat, searchMode), 300);
  }, [doSearch]);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    triggerSearch(val, selectedCat, mode);
  }, [selectedCat, mode, triggerSearch]);

  const handleCatSelect = useCallback((cat) => {
    const newCat = cat === selectedCat ? '' : cat;
    setSelectedCat(newCat);
    triggerSearch(query, newCat, mode);
  }, [query, selectedCat, mode, triggerSearch]);

  const handleModeSwitch = useCallback((newMode) => {
    setMode(newMode);
    setItems([]);
    setShops([]);
    setSearched(false);
    triggerSearch(query, selectedCat, newMode);
  }, [query, selectedCat, triggerSearch]);

  const clearQuery = useCallback(() => {
    setQuery('');
    setItems([]);
    setShops([]);
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
        {/* Sticky-блок: поиск + переключатель + категории */}
        <div className="search-page__controls">
          {/* Строка поиска */}
          <div className="search-page__bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="search-page__icon">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              className="search-page__input"
              placeholder={mode === 'shops' ? t(language, 'searchShopsPlaceholder') : t(language, 'searchPlaceholder')}
              value={query}
              onChange={handleChange}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {query && (
              <button className="search-page__clear" onClick={clearQuery}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Переключатель Вещи / Магазины */}
          <div className="search-page__mode-tabs">
            <button
              className={`search-page__mode-tab${mode === 'items' ? ' active' : ''}`}
              onClick={() => handleModeSwitch('items')}
            >
              {t(language, 'items')}
            </button>
            <button
              className={`search-page__mode-tab${mode === 'shops' ? ' active' : ''}`}
              onClick={() => handleModeSwitch('shops')}
            >
              {t(language, 'shops')}
            </button>
          </div>

          {/* Категории (только для режима items) */}
          {mode === 'items' && (
            <div className="search-page__cats">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`search-page__cat${selectedCat === cat ? ' active' : ''}`}
                  onClick={() => handleCatSelect(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
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
            <p>{language === 'ru' ? 'Введите запрос для поиска' : 'Type to search'}</p>
          </div>
        ) : mode === 'shops' ? (
          shops.length === 0 ? (
            <div className="search-page__hint">
              <p>{t(language, 'noShopsFound')}</p>
            </div>
          ) : (
            <div className="search-page__shops">
              {shops.map(shop => (
                <button
                  key={shop.id}
                  className="search-shop-row"
                  onClick={() => navigate(`/shop/${shop.id}`)}
                >
                  <div className="search-shop-row__avatar">
                    {shop.avatar
                      ? <img src={shop.avatar} alt="" />
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    }
                  </div>
                  <div className="search-shop-row__info">
                    <span className="search-shop-row__name">
                      {shop.firstName}{shop.lastName ? ` ${shop.lastName}` : ''}
                    </span>
                    {shop.telegramUsername && (
                      <span className="search-shop-row__tg">@{shop.telegramUsername}</span>
                    )}
                  </div>
                  <span className="search-shop-row__count">{shop.itemsCount} товаров</span>
                </button>
              ))}
            </div>
          )
        ) : items.length === 0 ? (
          <div className="search-page__hint">
            <p>{language === 'ru' ? (query ? `По запросу «${query}» ничего не найдено` : 'Ничего не найдено') : `Nothing found`}</p>
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
