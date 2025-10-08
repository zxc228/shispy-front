// Telegram WebApp viewport normalizer
// Sets CSS var --tg-vh to Telegram's viewportHeight or fallback to 100dvh
// Also prevents pinch-zoom where possible.

(function initTelegramViewport() {
  if (typeof window === 'undefined') return;

  const setVh = (h) => {
    const root = document.documentElement;
    if (!root) return;
    const px = typeof h === 'number' ? `${h}px` : h;
    root.style.setProperty('--tg-vh', px || '100dvh');
  };

  const preventZoom = () => {
    // Prevent pinch zoom
    window.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey) e.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener(
      'gesturestart',
      (e) => e.preventDefault(),
      { passive: false }
    );
  };

  // Try Telegram API if available
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg && typeof tg.expand === 'function') {
    try { tg.expand(); } catch {}
  }

  const readTgHeight = () => {
    if (!tg) return null;
    // Prefer stable height if available, fallback to viewportHeight
    const h = (tg.viewportStableHeight || tg.viewportHeight);
    return typeof h === 'number' && h > 0 ? h : null;
  };

  const update = () => {
    const h = readTgHeight();
    if (h) setVh(h);
    else setVh('100dvh');
  };

  update();

  // Listen to Telegram viewport changes
  if (tg && tg.onEvent) {
    tg.onEvent('viewportChanged', update);
    tg.onEvent('themeChanged', update);
  } else {
    // Fallback: update on resize and orientation change
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
  }

  preventZoom();
})();
