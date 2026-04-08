import { useEffect, useState, useCallback } from 'react';

const tg = window?.Telegram?.WebApp;

function applyTelegramSafeArea() {
  const contentTop   = tg?.contentSafeAreaInset?.top ?? 0;
  const deviceTop    = tg?.safeAreaInset?.top ?? 0;
  const isFullscreen = tg?.isFullscreen ?? false;

  // contentSafeAreaInset = height of Telegram's close-button bar (fullscreen only).
  // If it hasn't populated yet but we're already fullscreen, use the larger of
  // deviceTop and 52px (Telegram's bar is consistently ~52 px across devices).
  const safeTop = contentTop > 0
    ? contentTop
    : isFullscreen
      ? Math.max(deviceTop, 52)
      : deviceTop;

  const bottom = tg?.safeAreaInset?.bottom ?? 0;
  document.documentElement.style.setProperty('--tg-safe-top',    `${safeTop}px`);
  document.documentElement.style.setProperty('--tg-safe-bottom', `${bottom}px`);
}

export function useTelegram() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();

      if (typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
      }

      tg.setHeaderColor('#181818');
      tg.setBackgroundColor('#181818');
      if (typeof tg.setBottomBarColor === 'function') {
        tg.setBottomBarColor('#181818');
      }

      // Apply immediately, then retry as values settle after fullscreen transition
      applyTelegramSafeArea();
      const t1 = setTimeout(applyTelegramSafeArea, 150);
      const t2 = setTimeout(applyTelegramSafeArea, 400);
      const t3 = setTimeout(applyTelegramSafeArea, 800);

      tg.onEvent?.('safeAreaChanged',        applyTelegramSafeArea);
      tg.onEvent?.('contentSafeAreaChanged', applyTelegramSafeArea);
      tg.onEvent?.('fullscreenChanged',      applyTelegramSafeArea);

      setReady(true);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        tg.offEvent?.('safeAreaChanged',        applyTelegramSafeArea);
        tg.offEvent?.('contentSafeAreaChanged', applyTelegramSafeArea);
        tg.offEvent?.('fullscreenChanged',      applyTelegramSafeArea);
      };
    } else {
      // Dev mode — no Telegram
      document.documentElement.style.setProperty('--tg-safe-top',    '0px');
      document.documentElement.style.setProperty('--tg-safe-bottom', '0px');
      setReady(true);
    }
  }, []);

  const close  = useCallback(() => tg?.close(), []);
  const haptic = useCallback((type = 'light') => {
    tg?.HapticFeedback?.impactOccurred(type);
  }, []);

  return {
    tg,
    ready,
    user:        tg?.initDataUnsafe?.user ?? null,
    initData:    tg?.initData ?? '',
    close,
    haptic,
    colorScheme: tg?.colorScheme ?? 'light',
  };
}
