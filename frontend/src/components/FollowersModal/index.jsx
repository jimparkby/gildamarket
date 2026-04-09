import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFollowers, getFollowing } from '../../api/client';
import './FollowersModal.css';

export default function FollowersModal({ shopId, mode, onClose }) {
  // mode: 'followers' | 'following'
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg?.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(onClose);
      return () => tg.BackButton.offClick(onClose);
    }
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    const fn = mode === 'followers' ? getFollowers : getFollowing;
    fn(shopId)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [shopId, mode]);

  const handleUserClick = (userId) => {
    onClose();
    navigate(`/shop/${userId}`);
  };

  const title = mode === 'followers' ? 'ПОДПИСЧИКИ' : 'ПОДПИСКИ';

  return (
    <div className="fw-overlay" onClick={onClose}>
      <div className="fw-sheet" onClick={e => e.stopPropagation()}>
        <div className="fw-sheet__header">
          <span className="fw-sheet__title">{title}</span>
          <button className="fw-sheet__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="fw-sheet__body">
          {loading ? (
            <div className="spinner" />
          ) : users.length === 0 ? (
            <p className="fw-sheet__empty">
              {mode === 'followers' ? 'Нет подписчиков' : 'Нет подписок'}
            </p>
          ) : (
            users.map(u => (
              <button
                key={u.id}
                className="fw-user-row"
                onClick={() => handleUserClick(u.id)}
              >
                <div className="fw-user-row__avatar">
                  {u.avatar
                    ? <img src={u.avatar} alt="" />
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                  }
                </div>
                <div className="fw-user-row__info">
                  <span className="fw-user-row__name">
                    {u.firstName}{u.lastName ? ` ${u.lastName}` : ''}
                  </span>
                  {u.telegramUsername && (
                    <span className="fw-user-row__tg">@{u.telegramUsername}</span>
                  )}
                </div>
                <span className="fw-user-row__count">{u.itemsCount} вещей</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
