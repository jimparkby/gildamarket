import { useEffect, useState, useCallback } from 'react';

const tg = window?.Telegram?.WebApp;

export function useTelegram() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#ffffff');
      tg.setBackgroundColor('#ffffff');
      setReady(true);
    } else {
      // Dev mode without Telegram
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
