import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItem } from '../../api/client';
import { useTelegram } from '../../hooks/useTelegram';
import { compressImages } from '../../utils/imageCompression';
import api from '../../api/client';
import { BackButtonContext } from '../../App';
import './AddItem.css';
 
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
const BAG_SIZES = [{ label: 'One\nSize', value: 'One Size' }];
 
const TOTAL_STEPS = 4;
 
export default function AddItem() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const fileRef = useRef();
  const backOverrideRef = useContext(BackButtonContext);
 
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [draftPhotos, setDraftPhotos] = useState([]); // URL фото из черновика
  const [form, setForm] = useState({
    title: '', brand: '', category: '', subcategory: '', size: '',
    price: '', currency: 'RUB', description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
 
  // ── Проверяем черновик при открытии ─────────────────────────────────────────
  useEffect(() => {
    async function checkDraft() {
      try {
        const res = await api.get('/items/draft');
        const draft = res.data.draft;
        if (draft) {
          setHasDraft(true);
          setAgreed(true);
          setForm(prev => ({
            ...prev,
            description: draft.description || '',
            price: draft.price || '',
          }));
          if (draft.images && draft.images.length > 0) {
            setDraftPhotos(draft.images);
          }
          // Сразу переходим на шаг деталей
          setStep(4);
        }
      } catch (err) {
        // Нет черновика — обычный флоу
      } finally {
        setDraftLoading(false);
      }
    }
    checkDraft();
  }, []);
 
  const setField = useCallback((field, val) => {
    setForm(prev => {
      if (field === 'category') return { ...prev, category: val, subcategory: '', size: '' };
      return { ...prev, [field]: val };
    });
  }, []);
 
  const next = useCallback(() => { haptic('light'); setStep(s => Math.min(s + 1, TOTAL_STEPS)); }, [haptic]);
  const back = useCallback(() => {
    setError('');
    if (hasDraft && step === 4) {
      // Если пришли из черновика — назад идём на шаг 1
      setHasDraft(false);
      setStep(1);
    } else {
      setStep(s => Math.max(s - 1, 1));
    }
  }, [hasDraft, step]);

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
 
  const removeDraftPhoto = useCallback((idx) => {
    setDraftPhotos(prev => prev.filter((_, i) => i !== idx));
  }, []);
 
  const handleSubmit = useCallback(async () => {
    if (hasDraft && !form.category) return setError('Выберите категорию');
    if (!form.title.trim()) return setError('Введите название вещи');
    if (!form.price || isNaN(parseFloat(form.price))) return setError('Введите корректную цену');
 
    haptic('medium');
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
 
      // Добавляем новые фото файлами
      photos.forEach(p => fd.append('images', p.file));
 
      // Добавляем фото из черновика как URL
      if (draftPhotos.length > 0) {
        fd.append('draftImages', JSON.stringify(draftPhotos));
      }
 
      await createItem(fd);
 
      // Всегда удаляем черновик после публикации
      await api.delete('/items/draft').catch(() => {});
 
      haptic('medium');
      navigate('/profile');
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Превышено время ожидания. Попробуйте меньше или меньших фото.');
      } else if (err.response?.status === 413) {
        setError('Файлы слишком большие. Максимум 10 МБ на фото.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (!navigator.onLine) {
        setError('Нет подключения к интернету.');
      } else {
        setError('Не удалось опубликовать. Попробуйте ещё раз.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, photos, draftPhotos, hasDraft, haptic, navigate]);
 
  const StepBar = () => (
    <div className="wizard__steps">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={`wizard__step-dot${step > i ? ' done' : ''}${step === i + 1 ? ' active' : ''}`} />
      ))}
    </div>
  );
 
  if (draftLoading) {
    return (
      <main className="page wizard">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div className="spinner" />
        </div>
      </main>
    );
  }
 
  // ── Step 1: Category ─────────────────────────────────────────────────────────
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
        <button className="wizard__next" disabled={!form.category} onClick={next}>
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
 
        {/* Фото из черновика */}
        {draftPhotos.length > 0 && (
          <div className="form-field">
            <label className="form-label">Фото из поста</label>
            <div className="photos-grid">
              {draftPhotos.map((url, i) => (
                <div key={i} className="photo-thumb">
                  <img src={url} alt="" />
                  <button className="photo-thumb__del" onClick={() => removeDraftPhoto(i)}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {i === 0 && <span className="photo-thumb__cover">Обложка</span>}
                </div>
              ))}
            </div>
          </div>
        )}
 
        {hasDraft && (
          <div className="form-field">
            <label className="form-label">Категория *</label>
            <select className="form-input" value={form.category} onChange={e => setField('category', e.target.value)}>
              <option value="">Выберите категорию</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.value}</option>
              ))}
            </select>
          </div>
        )}

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
              <p className="rules-modal__rule"><strong>1. Подлинность</strong><br/>Размещайте только оригинальные вещи. Подделки и реплики строго запрещены.</p>
              <p className="rules-modal__rule"><strong>2. Честное описание</strong><br/>Фотографии и описание должны правдиво отражать состояние вещи.</p>
              <p className="rules-modal__rule"><strong>3. Наличие</strong><br/>Размещайте только те вещи, которые у вас есть и готовы продать.</p>
              <p className="rules-modal__rule"><strong>4. Допустимый контент</strong><br/>Запрещено: оружие, наркотики, товары для взрослых, краденые вещи.</p>
              <p className="rules-modal__rule"><strong>5. Честная цена</strong><br/>Указывайте реальную цену.</p>
              <p className="rules-modal__rule"><strong>6. Одно объявление на вещь</strong><br/>Не создавайте дублирующие объявления.</p>
            </div>
            <div className="rules-modal__footer">
              <button className="rules-modal__accept" onClick={() => { setAgreed(true); setRulesOpen(false); }}>
                Понятно, согласен
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
 