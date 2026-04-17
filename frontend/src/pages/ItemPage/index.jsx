import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getItem } from '../../api/client';
import ItemDetail from '../../components/ItemDetail';

export default function ItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [item, setItem] = useState(state?.item ?? null);
  const [loading, setLoading] = useState(!state?.item);

  useEffect(() => {
    if (state?.item) return;
    getItem(id)
      .then(setItem)
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <main className="page"><div className="spinner" /></main>;
  if (!item) return null;

  return (
    <ItemDetail
      item={item}
      onClose={() => navigate(-1)}
      onLikeChange={(itemId, liked) => setItem(prev => ({ ...prev, isLiked: liked }))}
    />
  );
}
