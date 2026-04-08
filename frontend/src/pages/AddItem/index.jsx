import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItem } from '../../api/client';
import { useTelegram } from '../../hooks/useTelegram';
import './AddItem.css';

// ─── Data ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'Обувь', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18c0-2 1-5 4-7l2-5h4l1 4 3 1c2 1 6 2 6 4v3H2v-1z"/></svg> },
  { value: 'Верхняя одежда', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l4-3 5 3 5-3 4 3v3l-3-1v11H6V9L3 10V7z"/><path d="M9 4l3 3 3-3"/></svg> },
  { value: 'Средний слой', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l3-3h3l3 3 3-3h3l3 3-3 3v11H6V9L3 6z"/></svg> },
  { value: 'Штаны/Джинсы', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h16v5l-4 13H8L4 8V3z"/><line x1="12" y1="8" x2="12" y2="21"/></svg> },
  { value: 'Аксессуары', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M8 7V5a4 4 0 018 0v2"/></svg> },
  { value: 'Прочее', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg> },
];

const NO_SIZE = ['Аксессуары'];
const SHOE_SIZE = ['Обувь'];
const BOTTOMS_SIZE = ['Штаны/Джинсы'];

const BOTTOMS_SUBCATEGORIES = [
  'Джинсы',
  'Брюки',
  'Шорты',
  'Джоггеры',
  'Леггинсы',
  'Комбинезоны',
  'Трекинговые штаны',
];

const CLOTHING_SIZES = [
  { label: 'One\nSize', value: 'One Size' },
  { label: 'XS', value: 'XS' },
  { label: 'S', value: 'S' },
  { label: 'M', value: 'M' },
  { label: 'L', value: 'L' },
  { label: 'XL', value: 'XL' },
];

const BOTTOMS_SIZES = ['26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44'].map(s => ({ label: s, value: s }));

const SHOE_SIZES = ['35','36','37','38','39','40','41','42','43','44','45','46'].map(s => ({ label: s, value: s }));

const CONDITIONS = [
  { value: 'new', label: 'New with tags' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good condition' },
  { value: 'fair', label: 'Fair condition' },
];

const CURRENCIES = ['USD', 'EUR', 'RUB', 'GBP'];

const TOTAL_STEPS = 4;

export default function AddItem() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const fileRef = useRef();

  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [form, setForm] = useState({
    title: '', brand: '', category: '', subcategory: '', size: '',
    condition: '', price: '', currency: 'RUB', description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const setField = useCallback((field, val) => {
    setForm(prev => {
      if (field === 'category') return { ...prev, category: val, subcategory: '', size: '' };
      return { ...prev, [field]: val };
    });
  }, []);

  const next = useCallback(() => { haptic('light'); setStep(s => Math.min(s + 1, TOTAL_STEPS)); }, [haptic]);
  const back = useCallback(() => { setError(''); setStep(s => Math.max(s - 1, 1)); }, []);

  const getSizes = () => {
    if (SHOE_SIZE.includes(form.category)) return SHOE_SIZES;
    if (BOTTOMS_SIZE.includes(form.category)) return BOTTOMS_SIZES;
    if (NO_SIZE.includes(form.category)) return null;
    return CLOTHING_SIZES;
  };

  const handlePhotos = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
  }, []);

  const removePhoto = useCallback((idx) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) return setError('Item name is required');
    if (!form.condition) return setError('Please select a condition');
    if (!form.price || isNaN(parseFloat(form.price))) return setError('Valid price is required');

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
      setError(err.response?.data?.error || err.code === 'ECONNABORTED'
        ? 'Request timed out.'
        : 'Failed to publish. Backend not connected.');
    } finally {
      setSubmitting(false);
    }
  }, [form, photos, haptic, navigate]);

  // ── Step indicator ───────────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="wizard__steps">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={`wizard__step-dot${step > i ? ' done' : ''}${step === i + 1 ? ' active' : ''}`} />
      ))}
    </div>
  );

  // ── Step 1: Category ────────────────────────────────────────────────────────
  if (step === 1) return (
    <main className="page wizard">
      <div className="wizard__header">
        <StepBar />
        <h2 className="wizard__title">Category</h2>
      </div>
      <div className="wizard__scroll">
        <div className="cat-grid">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              className={`cat-card${form.category === cat.value ? ' selected' : ''}`}
              onClick={() => { setField('category', cat.value); }}
            >
              <span className="cat-card__icon">{cat.icon}</span>
              <span className="cat-card__label">{cat.value}</span>
            </button>
          ))}
        </div>

        {/* Подкатегории для Штаны/Джинсы */}
        {form.category === 'Штаны/Джинсы' && (
          <div className="subcat-section">
            <p className="subcat-title">Тип</p>
            <div className="subcat-grid">
              {BOTTOMS_SUBCATEGORIES.map(sub => (
                <button
                  key={sub}
                  className={`subcat-chip${form.subcategory === sub ? ' selected' : ''}`}
                  onClick={() => setField('subcategory', sub)}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="wizard__footer">
        <button
          className="wizard__next"
          disabled={!form.category || (form.category === 'Штаны/Джинсы' && !form.subcategory)}
          onClick={next}
        >
          Continue
        </button>
      </div>
    </main>
  );

  // ── Step 2: Size ─────────────────────────────────────────────────────────────
  const sizes = getSizes();
  if (step === 2) return (
    <main className="page wizard">
      <div className="wizard__header">
        <button className="wizard__back" onClick={back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <StepBar />
        <h2 className="wizard__title">Size</h2>
      </div>
      <div className="wizard__scroll">
        {sizes ? (
          <div className={`size-grid${(SHOE_SIZE.includes(form.category) || BOTTOMS_SIZE.includes(form.category)) ? ' shoe' : ''}`}>
            {sizes.map(s => (
              <button
                key={s.value}
                className={`size-card${form.size === s.value ? ' selected' : ''}`}
                onClick={() => setField('size', s.value)}
              >
                <span className="size-card__label">{s.label}</span>
                {s.sub && <span className="size-card__sub">{s.sub}</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="wizard__no-size">
            <p>No size needed for this category</p>
          </div>
        )}
      </div>
      <div className="wizard__footer">
        {NO_SIZE.includes(form.category) ? (
          <button className="wizard__next" onClick={next}>Skip</button>
        ) : (
          <button className="wizard__next" disabled={!form.size} onClick={next}>Continue</button>
        )}
      </div>
    </main>
  );

  // ── Step 3: Photos ───────────────────────────────────────────────────────────
  if (step === 3) return (
    <main className="page wizard">
      <div className="wizard__header">
        <button className="wizard__back" onClick={back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <StepBar />
        <h2 className="wizard__title">Photos</h2>
      </div>
      <div className="wizard__scroll">
        <div className="photos-grid">
          {photos.map((p, i) => (
            <div key={i} className="photo-thumb">
              <img src={p.preview} alt="" />
              <button className="photo-thumb__del" onClick={() => removePhoto(i)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              {i === 0 && <span className="photo-thumb__cover">Cover</span>}
            </div>
          ))}
          {photos.length < 10 && (
            <button className="photo-add" onClick={() => fileRef.current?.click()}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              <span>Add photo</span>
            </button>
          )}
        </div>
        <p className="wizard__hint">Up to 10 photos · First photo is the cover</p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handlePhotos} />
      </div>
      <div className="wizard__footer">
        <button className="wizard__next" onClick={next}>
          {photos.length === 0 ? 'Skip' : 'Continue'}
        </button>
      </div>
    </main>
  );

  // ── Step 4: Details ──────────────────────────────────────────────────────────
  return (
    <main className="page wizard">
      <div className="wizard__header">
        <button className="wizard__back" onClick={back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <StepBar />
        <h2 className="wizard__title">Details</h2>
      </div>
      <div className="wizard__scroll wizard__scroll--form">

        <div className="form-field">
          <label className="form-label">Item Name *</label>
          <input className="form-input" placeholder="Например: Винтажные джинсы Levi's 501" value={form.title} onChange={e => setField('title', e.target.value)} />
        </div>

        <div className="form-field">
          <label className="form-label">Бренд</label>
          <input className="form-input" placeholder="Например: Levi's, Gucci, Zara…" value={form.brand} onChange={e => setField('brand', e.target.value)} />
        </div>

        <div className="form-divider" />

        <p className="form-section-title">Condition</p>
        <div className="condition-list">
          {CONDITIONS.map(c => (
            <button key={c.value} className={`condition-btn${form.condition === c.value ? ' selected' : ''}`} onClick={() => setField('condition', c.value)}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="form-divider" />

        <p className="form-section-title">Price</p>
        <div className="price-row">
          <input className="price-input" type="number" placeholder="0" min="0" value={form.price} onChange={e => setField('price', e.target.value)} />
          <div className="currency-row">
            {CURRENCIES.map(c => (
              <button key={c} className={`currency-btn${form.currency === c ? ' selected' : ''}`} onClick={() => setField('currency', c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="form-divider" />

        <div className="form-field">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" placeholder="Measurements, fabric, styling notes, any flaws…" rows={4} value={form.description} onChange={e => setField('description', e.target.value)} />
        </div>

        {error && <div className="wizard__error">{error}</div>}

        {/* Чекбокс согласия с правилами */}
        <label className="wizard__agree">
          <span
            className={`wizard__checkbox${agreed ? ' checked' : ''}`}
            onClick={() => setAgreed(v => !v)}
            role="checkbox"
            aria-checked={agreed}
          >
            {agreed && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </span>
          <span className="wizard__agree-text">
            I agree to the{' '}
            <span className="wizard__agree-link" onClick={(e) => { e.preventDefault(); setRulesOpen(true); }}>
              listing rules
            </span>
          </span>
        </label>
      </div>

      <div className="wizard__footer">
        <button className="wizard__next" onClick={handleSubmit} disabled={submitting || !agreed}>
          {submitting ? 'Publishing…' : 'Publish Listing'}
        </button>
      </div>

      {/* Модальное окно с правилами */}
      {rulesOpen && (
        <div className="rules-overlay" onClick={() => setRulesOpen(false)}>
          <div className="rules-modal" onClick={e => e.stopPropagation()}>
            <div className="rules-modal__header">
              <h3 className="rules-modal__title">Listing Rules</h3>
              <button className="rules-modal__close" onClick={() => setRulesOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="rules-modal__body">
              <p className="rules-modal__rule"><strong>1. Authenticity</strong><br/>Only list genuine items. Counterfeits, replicas, or items presented as something they are not are strictly prohibited.</p>
              <p className="rules-modal__rule"><strong>2. Accurate description</strong><br/>Photos and description must honestly reflect the item's condition. Hide no visible damage, stains, or defects.</p>
              <p className="rules-modal__rule"><strong>3. Availability</strong><br/>Only list items you actually own and are ready to sell. Do not list items that have already been sold elsewhere.</p>
              <p className="rules-modal__rule"><strong>4. Appropriate content</strong><br/>Prohibited items include: weapons, drugs, adult content, stolen goods, or anything illegal under applicable law.</p>
              <p className="rules-modal__rule"><strong>5. Fair pricing</strong><br/>Set a real price. Listings with placeholder prices (0, 1, 9999) will be removed.</p>
              <p className="rules-modal__rule"><strong>6. One listing per item</strong><br/>Do not create duplicate listings for the same item.</p>
            </div>
            <div className="rules-modal__footer">
              <button
                className="rules-modal__accept"
                onClick={() => { setAgreed(true); setRulesOpen(false); }}
              >
                I understand and agree
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
