import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItem } from '../../api/client';
import { useTelegram } from '../../hooks/useTelegram';
import './AddItem.css';

// ─── Category icons (SVG paths) ──────────────────────────────────────────────
const CATEGORIES = [
  {
    value: 'Tops',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6l3-3h3l3 3 3-3h3l3 3-3 3v11H6V9L3 6z"/>
      </svg>
    ),
  },
  {
    value: 'Bottoms',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 3h16v5l-4 13H8L4 8V3z"/>
        <line x1="12" y1="8" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    value: 'Outerwear',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l4-3 5 3 5-3 4 3v3l-3-1v11H6V9L3 10V7z"/>
        <path d="M9 4l3 3 3-3"/>
      </svg>
    ),
  },
  {
    value: 'Footwear',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18c0-2 1-5 4-7l2-5h4l1 4 3 1c2 1 6 2 6 4v3H2v-1z"/>
      </svg>
    ),
  },
  {
    value: 'Dresses',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l-3 7H5l4 5-2 8h10l-2-8 4-5h-4L12 2z"/>
      </svg>
    ),
  },
  {
    value: 'Tailoring',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3l3 4 4-2 4 2 3-4M8 7v14M16 7v14M8 14h8"/>
        <path d="M8 7c0 2 4 3 4 3s4-1 4-3"/>
      </svg>
    ),
  },
  {
    value: 'Bags',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2h12v20H6z"/>
        <path d="M9 2c0-1.5 6-1.5 6 0"/>
        <line x1="6" y1="8" x2="18" y2="8"/>
      </svg>
    ),
  },
  {
    value: 'Accessories',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4c-4 0-7 2-7 5 0 2 1 3 2 4l5 9 5-9c1-1 2-2 2-4 0-3-3-5-7-5z"/>
        <circle cx="12" cy="9" r="2"/>
      </svg>
    ),
  },
  {
    value: 'Jewellery',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M8 8L4 4M16 8l4-4M8 16l-4 4M16 16l4 4"/>
      </svg>
    ),
  },
  {
    value: 'Other',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
];

// ─── Sizes ───────────────────────────────────────────────────────────────────
const CLOTHING_SIZES = [
  { label: 'One Size', sub: '' },
  { label: 'XXS', sub: '/ 40' },
  { label: 'XS', sub: '/ 42' },
  { label: 'S', sub: '/ 44–46' },
  { label: 'M', sub: '/ 48–50' },
  { label: 'L', sub: '/ 52–54' },
  { label: 'XL', sub: '/ 56' },
  { label: 'XXL', sub: '/ 58' },
];

const SHOE_SIZES = [
  '35','36','37','38','39','40','41','42','43','44','45','46',
];

const NO_SIZE_CATEGORIES = ['Accessories', 'Jewellery', 'Bags'];
const SHOE_CATEGORIES = ['Footwear'];

// ─── Conditions ──────────────────────────────────────────────────────────────
const CONDITIONS = [
  { value: 'new', label: 'New with tags' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good condition' },
  { value: 'fair', label: 'Fair condition' },
];

const CURRENCIES = ['USD', 'EUR', 'RUB', 'GBP'];

export default function AddItem() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const fileRef = useRef();

  const [photos, setPhotos] = useState([]);
  const [form, setForm] = useState({
    title: '',
    brand: '',
    category: '',
    size: '',
    condition: '',
    price: '',
    currency: 'USD',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = useCallback((field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const setDirect = useCallback((field, val) => {
    setForm(prev => {
      // Reset size when category changes
      if (field === 'category') return { ...prev, category: val, size: '' };
      return { ...prev, [field]: val };
    });
  }, []);

  // Size options based on category
  const getSizes = () => {
    if (NO_SIZE_CATEGORIES.includes(form.category)) return null;
    if (SHOE_CATEGORIES.includes(form.category)) return SHOE_SIZES.map(s => ({ label: s, sub: '' }));
    return CLOTHING_SIZES;
  };

  const handlePhotos = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
  }, []);

  const removePhoto = useCallback((idx) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const { title, category, condition, price } = form;
    if (!category) return setError('Please select a category');
    if (!title.trim()) return setError('Item name is required');
    if (!condition) return setError('Please select a condition');
    if (!price || isNaN(parseFloat(price))) return setError('Valid price is required');

    haptic('medium');
    setSubmitting(true);
    setError('');

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      photos.forEach(p => fd.append('images', p.file));

      await createItem(fd);
      haptic('medium');
      navigate('/profile');
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (err.code === 'ECONNABORTED' ? 'Request timed out. Check your connection.' : null) ||
        'Failed to publish. Make sure the backend is running.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [form, photos, haptic, navigate]);

  const sizes = getSizes();

  return (
    <main className="page add-item">

      {/* ── 1. CATEGORY ── */}
      <section className="add-item__section">
        <h2 className="add-item__section-title">Category</h2>
        <div className="add-item__cat-grid">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              className={`add-item__cat-card${form.category === cat.value ? ' selected' : ''}`}
              onClick={() => setDirect('category', cat.value)}
            >
              <span className="add-item__cat-icon">{cat.icon}</span>
              <span className="add-item__cat-label">{cat.value}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── 2. SIZE ── */}
      {form.category && sizes && (
        <section className="add-item__section">
          <h2 className="add-item__section-title">Size</h2>
          <div className={`add-item__size-grid${SHOE_CATEGORIES.includes(form.category) ? ' shoe' : ''}`}>
            {sizes.map(s => (
              <button
                key={s.label}
                className={`add-item__size-card${form.size === s.label ? ' selected' : ''}`}
                onClick={() => setDirect('size', s.label)}
              >
                <span className="add-item__size-main">{s.label}</span>
                {s.sub && <span className="add-item__size-sub">{s.sub}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. PHOTOS ── */}
      <section className="add-item__section">
        <h2 className="add-item__section-title">Photos</h2>
        <div className="add-item__photos">
          {photos.map((p, i) => (
            <div key={i} className="add-item__photo-thumb">
              <img src={p.preview} alt="" />
              <button className="add-item__photo-remove" onClick={() => removePhoto(i)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              {i === 0 && <span className="add-item__photo-main-label">Cover</span>}
            </div>
          ))}
          {photos.length < 10 && (
            <button className="add-item__photo-add" onClick={() => fileRef.current?.click()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span>Add photo</span>
            </button>
          )}
        </div>
        <p className="add-item__photo-hint">Up to 10 photos · First is cover</p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handlePhotos} />
      </section>

      {/* ── 4. ITEM NAME + BRAND ── */}
      <section className="add-item__section">
        <div className="add-item__field">
          <label className="add-item__label">Item Name *</label>
          <input
            className="add-item__input"
            placeholder="e.g. Vintage Levi's 501 Jeans"
            value={form.title}
            onChange={set('title')}
          />
        </div>
        <div className="add-item__field">
          <label className="add-item__label">Brand</label>
          <input
            className="add-item__input"
            placeholder="e.g. Levi's, Gucci, Zara…"
            value={form.brand}
            onChange={set('brand')}
          />
        </div>
      </section>

      {/* ── 5. CONDITION ── */}
      <section className="add-item__section">
        <h2 className="add-item__section-title">Condition</h2>
        <div className="add-item__conditions">
          {CONDITIONS.map(c => (
            <button
              key={c.value}
              className={`add-item__condition-btn${form.condition === c.value ? ' selected' : ''}`}
              onClick={() => setDirect('condition', c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── 6. PRICE ── */}
      <section className="add-item__section">
        <h2 className="add-item__section-title">Price *</h2>
        <div className="add-item__price-row">
          <div className="add-item__price-wrap">
            <input
              className="add-item__price-input"
              type="number"
              placeholder="0"
              min="0"
              value={form.price}
              onChange={set('price')}
            />
          </div>
          <div className="add-item__currency-tabs">
            {CURRENCIES.map(c => (
              <button
                key={c}
                className={`add-item__currency-tab${form.currency === c ? ' selected' : ''}`}
                onClick={() => setDirect('currency', c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. DESCRIPTION ── */}
      <section className="add-item__section">
        <div className="add-item__field">
          <label className="add-item__label">Description</label>
          <textarea
            className="add-item__textarea"
            placeholder="Describe the item: measurements, fabric, styling notes, any flaws…"
            rows={5}
            value={form.description}
            onChange={set('description')}
          />
        </div>
      </section>

      {error && <div className="add-item__error">{error}</div>}

      {/* ── SUBMIT ── */}
      <div className="add-item__footer">
        <button className="add-item__submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Publishing…' : 'Publish Listing'}
        </button>
      </div>
    </main>
  );
}
