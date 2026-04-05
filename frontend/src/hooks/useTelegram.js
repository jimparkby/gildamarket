import { useEffect, useState, useCallback } from 'react';

const tg = window?.Telegram?.WebApp;

export function useTelegram() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      // Full screen (Telegram 8.0+)
      if (typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
      }
      tg.setHeaderColor('#ffffff');
      tg.setBackgroundColor('#ffffff');
      // Remove bottom bar if supported
      if (typeof tg.setBottomBarColor === 'function') {
        tg.setBottomBarColor('#ffffff');
      }
      setReady(true);
    } else {
      setReady(true);
    }
  }, []);

  const close = useCallback(() => tg?.close(), []);
  const haptic = useCallback((type = 'light') => {
    tg?.HapticFeedback?.impactOccurred(type);
  }, []);

  return {
    tg,
    ready,
    user: tg?.initDataUnsafe?.user ?? null,
    initData: tg?.initData ?? '',
    close,
    haptic,
    colorScheme: tg?.colorScheme ?? 'light',
  };
}
