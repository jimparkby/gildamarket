export const RESTORE_KEY = 'gilda_restore_item';

// pathname — из useLocation(), вызывается до useState в компоненте
export function getRestoredItem(pathname) {
  const stored = sessionStorage.getItem(RESTORE_KEY);
  if (!stored) return null;
  try {
    const { item, fromPath } = JSON.parse(stored);
    if (fromPath === pathname) {
      sessionStorage.removeItem(RESTORE_KEY);
      return item;
    }
  } catch {
    sessionStorage.removeItem(RESTORE_KEY);
  }
  return null;
}
