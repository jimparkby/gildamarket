import { useEffect, useState, useCallback } from 'react';

const tg = window?.Telegram?.WebApp;

function applyTelegramSafeArea() {
  // In non-fullscreen expanded mode, safeAreaInset reflects the device notch only.
  // Telegram's own UI bar sits above the webview, not overlapping it.
  const top    = tg?.safeAreaInset?.top ?? 0;
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

      tg.setHeaderColor('#ffffff');
      tg.setBackgroundColor('#ffffff');
      if (typeof tg.setBottomBarColor === 'function') {
        tg.setBottomBarColor('#ffffff');
      }

      applyTelegramSafeArea();
      tg.onEvent?.('safeAreaChanged', applyTelegramSafeArea);

      setReady(true);
    } else {
      // Dev mode — no Telegram
      document.documentElement.style.setProperty('--tg-safe-top', '0px');
      document.documentElement.style.setProperty('--tg-safe-bottom', '0px');
      setReady(true);
    }

    return () => {
      tg?.offEvent?.('safeAreaChanged', applyTelegramSafeArea);
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
