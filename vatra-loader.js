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
    window.clearTimeout(longWaitTimer);

    const delay = Math.max(0, minimumVisible - (performance.now() - startedAt));
    window.setTimeout(() => {
      loader.classList.add('vatra-loading--leaving');
      loader.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => loader.remove(), 320);
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

  const safetyTimeout = window.setTimeout(hideLoader, 17000);
  const longWaitTimer = window.setTimeout(() => {
    if (finished) return;
    const subtitle = loader.querySelector('.vatra-loading-subtitle');
    const status = loader.querySelector('.vatra-loading-status');
    if (subtitle) subtitle.textContent = 'Підключення займає трохи більше часу. Перевіряємо з’єднання.';
    if (status) status.textContent = 'Очікуємо відповідь';
  }, 7000);
  window.addEventListener('load', () => {
    window.setTimeout(() => {
      if (appIsReady()) hideLoader();
    }, 120);
  }, { once: true });
})();
