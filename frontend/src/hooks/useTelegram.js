import { useEffect, useState, useCallback } from 'react';

const tg = window?.Telegram?.WebApp;

function applyTelegramSafeArea() {
  // contentSafeAreaInset = space reserved by Telegram's own UI (close button bar)
  // safeAreaInset = device notch/home indicator
  const contentTop = tg?.contentSafeAreaInset?.top ?? 0;
  const deviceTop = tg?.safeAreaInset?.top ?? 0;
  const top = Math.max(contentTop, deviceTop);
  const bottom = tg?.safeAreaInset?.bottom ?? 0;
  document.documentElement.style.setProperty('--tg-safe-top', `${top}px`);
  document.documentElement.style.setProperty('--tg-safe-bottom', `${bottom}px`);
}

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
      if (typeof tg.setBottomBarColor === 'function') {
        tg.setBottomBarColor('#ffffff');
      }

      // Apply safe area immediately and on each change
      applyTelegramSafeArea();
      tg.onEvent?.('safeAreaChanged', applyTelegramSafeArea);
      tg.onEvent?.('contentSafeAreaChanged', applyTelegramSafeArea);
      tg.onEvent?.('fullscreenChanged', applyTelegramSafeArea);

      setReady(true);
    } else {
      // Dev mode — no Telegram
      document.documentElement.style.setProperty('--tg-safe-top', '0px');
      document.documentElement.style.setProperty('--tg-safe-bottom', '0px');
      setReady(true);
    }

    return () => {
      tg?.offEvent?.('safeAreaChanged', applyTelegramSafeArea);
      tg?.offEvent?.('contentSafeAreaChanged', applyTelegramSafeArea);
      tg?.offEvent?.('fullscreenChanged', applyTelegramSafeArea);
    };
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
