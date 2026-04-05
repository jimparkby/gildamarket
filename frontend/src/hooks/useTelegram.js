import { useEffect, useState, useCallback } from 'react';

const tg = window?.Telegram?.WebApp;

function applyTelegramSafeArea() {
  // contentSafeAreaInset.top = height of Telegram's close-button bar (fullscreen)
  // safeAreaInset.top        = device notch / status bar
  const contentTop = tg?.contentSafeAreaInset?.top ?? 0;
  const deviceTop  = tg?.safeAreaInset?.top ?? 0;
  const isFullscreen = tg?.isFullscreen ?? false;

  // If contentSafeAreaInset returns 0 but we are in fullscreen,
  // fall back to 52 px — the consistent height of Telegram's overlay bar.
  const safeTop = contentTop > 0
    ? contentTop
    : isFullscreen
      ? Math.max(deviceTop, 52)
      : deviceTop;

  const bottom = tg?.safeAreaInset?.bottom ?? 0;
  document.documentElement.style.setProperty('--tg-safe-top', `${safeTop}px`);
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

      // Apply immediately, then re-apply after a short delay
      // (fullscreen transition takes ~300ms before values settle)
      applyTelegramSafeArea();
      setTimeout(applyTelegramSafeArea, 350);

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
