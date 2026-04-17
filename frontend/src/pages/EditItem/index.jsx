import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { updateItem, getItem } from '../../api/client';
import { useTelegram } from '../../hooks/useTelegram';
import { compressImages } from '../../utils/imageCompression';
import { BackButtonContext } from '../../App';
import '../AddItem/AddItem.css';

// ─── Data ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'Обувь', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18c0-2 1-5 4-7l2-5h4l1 4 3 1c2 1 6 2 6 4v3H2v-1z"/></svg> },
  { value: 'Верхняя одежда', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l4-3 5 3 5-3 4 3v3l-3-1v11H6V9L3 10V7z"/><path d="M9 4l3 3 3-3"/></svg> },
  { value: 'Футболки', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l4-3 5 3 5-3 4 3v3l-3-1v11H6V9L3 10V7z"/></svg> },
  { value: 'Средний слой', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l3-3h3l3 3 3-3h3l3 3-3 3v11H6V9L3 6z"/></svg> },
  { value: 'Штаны/Джинсы/Юбки', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h16v5l-4 13H8L4 8V3z"/><line x1="12" y1="8" x2="12" y2="21"/></svg> },
  { value: 'Сумки', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M8 7V5a2 2 0 014 0v2M12 5a2 2 0 014 0v2"/></svg> },
  { value: 'Аксессуары', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M8 7V5a4 4 0 018 0v2"/></svg> },
  { value: 'Прочее', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg> },
];

const NO_SIZE = ['Аксессуары'];
const SHOE_SIZE = ['Обувь'];
const BOTTOMS_SIZE = ['Штаны/Джинсы/Юбки'];
const BAG_SIZE = ['Сумки'];

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

const BAG_SIZES = [
  { label: 'One\nSize', value: 'One Size' },
];

const TOTAL_STEPS = 4;

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const fileRef = useRef();
  const backOverrideRef = useContext(BackButtonContext);

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [form, setForm] = useState({
    title: '', brand: '', category: '', subcategory: '', size: '',
    price: '', currency: 'RUB', description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getItem(id)
      .then(item => {
        setForm({
          title: item.title || '',
          brand: item.brand || '',
          category: item.category || '',
          subcategory: item.subcategory || '',
          size: item.size || '',
          price: item.price?.toString() || '',
          currency: item.currency || 'RUB',
          description: item.description || '',
        });
        setExistingImages(item.images || []);
      })
      .catch(() => {
        setError('Failed to load item');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const setField = useCallback((field, val) => {
    setForm(prev => {
      if (field === 'category') return { ...prev, category: val, subcategory: '', size: '' };
      return { ...prev, [field]: val };
    });
  }, []);

  const next = useCallback(() => { haptic('light'); setStep(s => Math.min(s + 1, TOTAL_STEPS)); }, [haptic]);
  const back = useCallback(() => { setError(''); setStep(s => Math.max(s - 1, 1)); }, []);

  // ── Переопределяем TG BackButton для навигации по шагам ─────────────────────
  useEffect(() => {
    if (!backOverrideRef) return;
    if (step > 1) {
      backOverrideRef.current = back;
    } else {
      backOverrideRef.current = null;
    }
    return () => { backOverrideRef.current = null; };
  }, [step, back, backOverrideRef]);

  const getSizes = () => {
    if (SHOE_SIZE.includes(form.category)) return SHOE_SIZES;
    if (BOTTOMS_SIZE.includes(form.category)) return BOTTOMS_SIZES;
    if (BAG_SIZE.includes(form.category)) return BAG_SIZES;
    if (NO_SIZE.includes(form.category)) return null;
    return CLOTHING_SIZES;
  };

  const handlePhotos = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    try {
      const compressed = await compressImages(files);
      const newPhotos = compressed.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
    } catch (err) {
      console.error('Image compression error:', err);
      // Fallback to original files if compression fails
      const newPhotos = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
    }
  }, []);

  const removePhoto = useCallback((idx) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const removeExistingImage = useCallback((idx) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) return setError('Item name is required');
    if (!form.price || isNaN(parseFloat(form.price))) return setError('Valid price is required');

    haptic('medium');
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      // Send existing images that weren't deleted
      existingImages.forEach(img => fd.append('existingImages', img));

      // Send new photos
      photos.forEach(p => fd.append('images', p.file));

      await updateItem(id, fd);
      haptic('medium');
      navigate('/profile');
    } catch (err) {
      console.error('Update error:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Try uploading fewer or smaller photos.');
      } else if (err.response?.status === 413) {
        setError('Files too large. Maximum 10MB per photo.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (!navigator.onLine) {
        setError('No internet connection. Please check your network.');
      } else {
        setError('Failed to update. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, photos, existingImages, id, haptic, navigate]);

  if (loading) return <main className="page"><div className="spinner" /></main>;
  if (error && !form.title) return <main className="page"><div className="empty-state"><p>{error}</p></div></main>;

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
        <h2 className="wizard__title">Категория</h2>
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
      </div>
      <div className="wizard__footer">
        <button
          className="wizard__next"
          disabled={!form.category}
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
        <h2 className="wizard__title">Размер</h2>
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
            <p>Размер для этой категории не нужен</p>
          </div>
        )}
      </div>
      <div className="wizard__footer">
        {NO_SIZE.includes(form.category) ? (
          <button className="wizard__next" onClick={next}>Пропустить</button>
        ) : (
          <button className="wizard__next" disabled={!form.size} onClick={next}>Продолжить</button>
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
        <h2 className="wizard__title">Фотографии</h2>
      </div>
      <div className="wizard__scroll">
        <div className="photos-grid">
          {existingImages.map((img, i) => (
            <div key={`existing-${i}`} className="photo-thumb">
              <img src={img} alt="" />
              <button className="photo-thumb__del" onClick={() => removeExistingImage(i)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              {i === 0 && <span className="photo-thumb__cover">Обложка</span>}
            </div>
          ))}
          {photos.map((p, i) => (
            <div key={`new-${i}`} className="photo-thumb">
              <img src={p.preview} alt="" />
              <button className="photo-thumb__del" onClick={() => removePhoto(i)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
          {(existingImages.length + photos.length) < 10 && (
            <button className="photo-add" onClick={() => fileRef.current?.click()}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              <span>Добавить фото</span>
            </button>
          )}
        </div>
        <p className="wizard__hint">До 10 фото · Первое фото — обложка</p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handlePhotos} />
      </div>
      <div className="wizard__footer">
        <button className="wizard__next" onClick={next}>Продолжить</button>
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
        <h2 className="wizard__title">Детали</h2>
      </div>
      <div className="wizard__scroll wizard__scroll--form">

        <div className="form-field">
          <label className="form-label">Название *</label>
          <input className="form-input" placeholder="Например: Винтажные джинсы Levi's 501" value={form.title} onChange={e => setField('title', e.target.value)} />
        </div>

        <div className="form-divider" />

        <p className="form-section-title">Цена</p>
        <div className="price-row">
          <input className="price-input" type="number" placeholder="0" min="0" value={form.price} onChange={e => setField('price', e.target.value)} />
          <span className="currency-label">RUB</span>
        </div>

        <div className="form-divider" />

        <div className="form-field">
          <label className="form-label">Описание</label>
          <textarea className="form-textarea" placeholder="Замеры, ткань, состояние, недостатки…" rows={4} value={form.description} onChange={e => setField('description', e.target.value)} />
        </div>

        {error && <div className="wizard__error">{error}</div>}
      </div>

      <div className="wizard__footer">
        <button className="wizard__next" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </main>
  );
}
