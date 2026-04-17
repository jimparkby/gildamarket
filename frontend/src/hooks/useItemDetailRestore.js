import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const RESTORE_KEY = 'gilda_restore_item';

export function useItemDetailRestore(setSelected) {
  const location = useLocation();

  useEffect(() => {
    const stored = sessionStorage.getItem(RESTORE_KEY);
    if (!stored) return;
    try {
      const { item, fromPath } = JSON.parse(stored);
      if (fromPath === location.pathname) {
        sessionStorage.removeItem(RESTORE_KEY);
        setSelected(item);
      }
    } catch {
      sessionStorage.removeItem(RESTORE_KEY);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
