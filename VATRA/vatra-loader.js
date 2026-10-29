/* Керує лише стартовою заставкою та не втручається в логіку сторінки. */
(() => {
  const loader = document.getElementById('vatraLoader');
  if (!loader) return;

  const isAuthPage = Boolean(document.querySelector('.auth-layout'));
  const startedAt = performance.now();
  const minimumVisible = 280;
  let finished = false;

  function hideLoader() {
    if (finished) return;
    finished = true;
    window.clearInterval(checkReady);
    window.clearTimeout(safetyTimeout);

    const delay = Math.max(0, minimumVisible - (performance.now() - startedAt));
    window.setTimeout(() => {
      loader.classList.add('vatra-loading--leaving');
      loader.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => loader.remove(), 500);
    }, delay);
  }

  function appIsReady() {
    return isAuthPage ? window.__vatraAuthReady === true : window.__vatraStarted === true;
  }

  const checkReady = window.setInterval(() => {
    if (appIsReady()) {
      hideLoader();
      return;
    }

    const startupError = document.getElementById('startupError');
    if (startupError && !startupError.hidden) hideLoader();
  }, 80);

  const safetyTimeout = window.setTimeout(hideLoader, 5000);
  window.addEventListener('load', () => {
    window.setTimeout(() => {
      if (appIsReady()) hideLoader();
    }, 120);
  }, { once: true });
})();
