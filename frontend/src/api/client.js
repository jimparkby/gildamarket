import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE, timeout: 12000 });

// Attach JWT from localStorage
api.interceptors.request.use(config => {
  const token = localStorage.getItem('gilda_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ───────────────────────────────────────────────
export const authTelegram = (initData) =>
  api.post('/auth/telegram', { initData }).then(r => r.data);

// ─── Items ──────────────────────────────────────────────
export const getItems = (params = {}) =>
  api.get('/items', { params }).then(r => r.data);

export const getItem = (id) =>
  api.get(`/items/${id}`).then(r => r.data);

export const createItem = (formData) =>
  api.post('/items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const deleteItem = (id) =>
  api.delete(`/items/${id}`).then(r => r.data);

export const toggleItemLike = (id) =>
  api.post(`/items/${id}/like`).then(r => r.data);

export const markItemSold = (id) =>
  api.patch(`/items/${id}/sold`).then(r => r.data);

// ─── Profile / Shop ─────────────────────────────────────
export const getMe = () =>
  api.get('/profile/me').then(r => r.data);

export const getShop = (id) =>
  api.get(`/profile/${id}`).then(r => r.data);

export const updateProfile = (data) =>
  api.put('/profile/me', data).then(r => r.data);

export const uploadAvatar = (formData) =>
  api.post('/profile/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const uploadBackground = (formData) =>
  api.post('/profile/me/background', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

// ─── Favorites ──────────────────────────────────────────
export const getFavorites = () =>
  api.get('/favorites').then(r => r.data);

export const toggleShopLike = (shopId) =>
  api.post(`/favorites/shop/${shopId}`).then(r => r.data);

// ─── Look Board ─────────────────────────────────────────
export const getMyLookBoards = () =>
  api.get('/lookboard/me').then(r => r.data);

export const createLookBoard = (formData) =>
  api.post('/lookboard', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const deleteLookBoard = (id) =>
  api.delete(`/lookboard/${id}`).then(r => r.data);

export default api;
