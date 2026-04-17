export const RESTORE_KEY = 'gilda_restore_item';

// Синхронно читает sessionStorage при инициализации useState — модалка открывается сразу, без мигания
export function getRestoredItem() {
  const stored = sessionStorage.getItem(RESTORE_KEY);
  if (!stored) return null;
  try {
    const { item, fromPath } = JSON.parse(stored);
    if (fromPath === window.location.pathname) {
      sessionStorage.removeItem(RESTORE_KEY);
      return item;
    }
  } catch {
    sessionStorage.removeItem(RESTORE_KEY);
  }
  return null;
}
