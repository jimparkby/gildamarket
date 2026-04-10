import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItem } from '../../api/client';
import { useTelegram } from '../../hooks/useTelegram';
import { compressImages } from '../../utils/imageCompression';
import './AddItem.css';

// ─── Data ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'Обувь', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18.5h20"/><path d="M4 18.5l1-5H8l.5 2.5C11 14.5 13 14 15 14h5.5c.8 0 1.5.7 1.5 1.5v3H4z"/><path d="M7 13.5L7.8 7h2.2l-.8 6.5"/><path d="M10 9.5l3-.5"/></svg> },
  { value: 'Верхняя одежда', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l5-5h1.5C9.5 4.5 10.5 6 12 6s2.5-1.5 2.5-3H16l5 5-3 2v11H6V10L3 8z"/><line x1="6" y1="15" x2="18" y2="15"/><line x1="6" y1="19" x2="18" y2="19"/><line x1="12" y1="10" x2="12" y2="21"/></svg> },
  { value: 'Футболки', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 3H6L2 9l4.5 2V21h11V11l4.5-2L18 3h-3.5c-.4 1.8-1.6 3-3 3s-2.6-1.2-3-3z"/></svg> },
  { value: 'Средний слой', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4c0 2 2 4 5 4s5-2 5-4l3 5-3 2v10H6V11L3 9l4-5z"/><path d="M10 4a2 2 0 004 0"/></svg> },
  { value: 'Штаны/Джинсы', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h16v5H4V3z"/><path d="M4 8l2 13h5l1-7 1 7h5l2-13"/></svg> },
  { value: 'Сумки', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-2 13H7L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/><line x1="5" y1="13" x2="19" y2="13"/></svg> },
  { value: 'Аксессуары', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13c0-3.9 3.1-7 7-7s7 3.1 7 7H5z"/><path d="M5 13a2 2 0 002 2h10a2 2 0 002-2"/><path d="M3 13h2M19 13h2"/><circle cx="12" cy="6" r="1" fill="currentColor" stroke="none"/></svg> },
  { value: 'Прочее', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg> },
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


const TOTAL_STEPS = 4;

export default function AddItem() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const fileRef = useRef();

  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [form, setForm] = useState({
    title: '', brand: '', category: '', subcategory: '', size: '',
    condition: 'good', price: '', currency: 'RUB', description: '',
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

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) return setError('Введите название вещи');
    if (!form.price || isNaN(parseFloat(form.price))) return setError('Введите корректную цену');

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
      console.error('Publish error:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Превышено время ожидания. Попробуйте меньше или меньших фото.');
      } else if (err.response?.status === 413) {
        setError('Файлы слишком большие. Максимум 10 МБ на фото.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (!navigator.onLine) {
        setError('Нет подключения к интернету. Проверьте сеть.');
      } else {
        setError('Не удалось опубликовать. Попробуйте ещё раз.');
      }
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
          Продолжить
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
          {photos.map((p, i) => (
            <div key={i} className="photo-thumb">
              <img src={p.preview} alt="" />
              <button className="photo-thumb__del" onClick={() => removePhoto(i)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              {i === 0 && <span className="photo-thumb__cover">Обложка</span>}
            </div>
          ))}
          {photos.length < 10 && (
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
        <button className="wizard__next" onClick={next}>
          {photos.length === 0 ? 'Пропустить' : 'Продолжить'}
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
            Я согласен с{' '}
            <span className="wizard__agree-link" onClick={(e) => { e.preventDefault(); setRulesOpen(true); }}>
              правилами размещения
            </span>
          </span>
        </label>
      </div>

      <div className="wizard__footer">
        <button className="wizard__next" onClick={handleSubmit} disabled={submitting || !agreed}>
          {submitting ? 'Публикуем…' : 'Опубликовать'}
        </button>
      </div>

      {/* Модальное окно с правилами */}
      {rulesOpen && (
        <div className="rules-overlay" onClick={() => setRulesOpen(false)}>
          <div className="rules-modal" onClick={e => e.stopPropagation()}>
            <div className="rules-modal__header">
              <h3 className="rules-modal__title">Правила размещения</h3>
              <button className="rules-modal__close" onClick={() => setRulesOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="rules-modal__body">
              <p className="rules-modal__rule"><strong>1. Подлинность</strong><br/>Размещайте только оригинальные вещи. Подделки, реплики и товары, выдаваемые за то, чем они не являются, строго запрещены.</p>
              <p className="rules-modal__rule"><strong>2. Честное описание</strong><br/>Фотографии и описание должны правдиво отражать состояние вещи. Не скрывайте видимые повреждения, пятна или дефекты.</p>
              <p className="rules-modal__rule"><strong>3. Наличие</strong><br/>Размещайте только те вещи, которые у вас есть и которые вы готовы продать. Не публикуйте уже проданные товары.</p>
              <p className="rules-modal__rule"><strong>4. Допустимый контент</strong><br/>Запрещено: оружие, наркотики, товары для взрослых, краденые вещи и всё, что нарушает действующее законодательство.</p>
              <p className="rules-modal__rule"><strong>5. Честная цена</strong><br/>Указывайте реальную цену. Объявления с заглушками (0, 1, 9999) будут удалены.</p>
              <p className="rules-modal__rule"><strong>6. Одно объявление на вещь</strong><br/>Не создавайте дублирующие объявления для одной и той же вещи.</p>
            </div>
            <div className="rules-modal__footer">
              <button
                className="rules-modal__accept"
                onClick={() => { setAgreed(true); setRulesOpen(false); }}
              >
                Понятно, согласен
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
