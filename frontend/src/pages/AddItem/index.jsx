import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItem } from '../../api/client';
import { useTelegram } from '../../hooks/useTelegram';
import './AddItem.css';

const CATEGORIES = [
  'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Footwear',
  'Bags', 'Accessories', 'Jewellery', 'Activewear', 'Other',
];

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

  const [photos, setPhotos] = useState([]); // { file, preview }
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

  const handlePhotos = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
  }, []);

  const removePhoto = useCallback((idx) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const set = useCallback((field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const setDirect = useCallback((field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const { title, category, condition, price } = form;
    if (!title.trim()) return setError('Item name is required');
    if (!category) return setError('Category is required');
    if (!condition) return setError('Condition is required');
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

  return (
    <main className="page add-item">
      {/* Photo Upload */}
      <section className="add-item__section">
        <div className="add-item__photos">
          {photos.map((p, i) => (
            <div key={i} className="add-item__photo-thumb">
              <img src={p.preview} alt="" />
              <button className="add-item__photo-remove" onClick={() => removePhoto(i)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              {i === 0 && <span className="add-item__photo-main-label">Main</span>}
            </div>
          ))}

          {photos.length < 10 && (
            <button className="add-item__photo-add" onClick={() => fileRef.current?.click()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span>Add photo</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handlePhotos}
        />
        <p className="add-item__photo-hint">Up to 10 photos · First photo is cover</p>
      </section>

      <div className="add-item__divider" />

      {/* Form fields */}
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
            placeholder="e.g. Levi's, Gucci, Zara..."
            value={form.brand}
            onChange={set('brand')}
          />
        </div>
      </section>

      <div className="add-item__divider" />

      {/* Category */}
      <section className="add-item__section">
        <label className="add-item__label">Category *</label>
        <div className="add-item__chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`add-item__chip${form.category === cat ? ' selected' : ''}`}
              onClick={() => setDirect('category', cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="add-item__divider" />

      {/* Condition */}
      <section className="add-item__section">
        <label className="add-item__label">Condition *</label>
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

      <div className="add-item__divider" />

      {/* Price & Size */}
      <section className="add-item__section">
        <div className="add-item__row">
          <div className="add-item__field" style={{ flex: 1 }}>
            <label className="add-item__label">Price *</label>
            <div className="add-item__price-wrap">
              <input
                className="add-item__input"
                type="number"
                placeholder="0"
                min="0"
                value={form.price}
                onChange={set('price')}
              />
              <select
                className="add-item__currency"
                value={form.currency}
                onChange={set('currency')}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="add-item__field" style={{ flex: 1 }}>
            <label className="add-item__label">Size</label>
            <input
              className="add-item__input"
              placeholder="XS / S / M / 38 / 10..."
              value={form.size}
              onChange={set('size')}
            />
          </div>
        </div>
      </section>

      <div className="add-item__divider" />

      {/* Description */}
      <section className="add-item__section">
        <div className="add-item__field">
          <label className="add-item__label">Description</label>
          <textarea
            className="add-item__textarea"
            placeholder="Describe the item: measurements, fabric, styling notes, any flaws..."
            rows={5}
            value={form.description}
            onChange={set('description')}
          />
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="add-item__error">{error}</div>
      )}

      {/* Submit */}
      <div className="add-item__footer">
        <button
          className="add-item__submit"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Publishing…' : 'Publish Listing'}
        </button>
      </div>
    </main>
  );
}
