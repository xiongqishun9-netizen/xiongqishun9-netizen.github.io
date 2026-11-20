(() => {
  const connection = navigator.connection;
  const constrained = () => connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
  const warmed = new Set();
  const queue = [];
  let active = false;

  const drain = () => {
    if (active || !queue.length || document.hidden) return;
    active = true;
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    const next = () => { active = false; drain(); };
    image.onload = next;
    image.onerror = () => { warmed.delete(image.src); next(); };
    image.src = queue.shift();
  };

  // Speculative downloads are serial and bounded so they cannot flood a slow connection.
  const warmImage = (source, intent = true) => {
    if (!source || constrained() || (!intent && warmed.size >= 4)) return;
    const url = new URL(source, document.baseURI).href;
    if (warmed.has(url)) return;
    if (queue.length >= 4) {
      if (!intent) return;
      warmed.delete(queue.pop());
    }
    warmed.add(url);
    if (intent) queue.unshift(url);
    else queue.push(url);
    drain();
  };
  document.addEventListener('visibilitychange', drain);
  window.portfolioPerformance = { warmImage };

  let ready = false;
  window.addEventListener('portfolio:ready', () => { ready = true; });
  const links = [...document.querySelectorAll('[data-document], [data-other-view]')];
  const firstImage = (link) => {
    if (link.dataset.document) return window.portfolioDocuments?.[link.dataset.document]?.tiles[0]?.src;
    if (link.dataset.otherView === 'posters') return './public/assets/posters/zenless-burnice.jpg';
    return './public/assets/videos/watch-poster.jpg?v=20261022b';
  };
  links.forEach((link) => {
    let timer;
    link.addEventListener('pointerenter', () => {
      timer = setTimeout(() => warmImage(firstImage(link)), 150);
    });
    link.addEventListener('pointerleave', () => clearTimeout(timer));
    link.addEventListener('focus', () => warmImage(firstImage(link)));
    link.addEventListener('touchstart', () => warmImage(firstImage(link)), { passive: true });
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
        if (!ready || !isIntersecting || intersectionRatio < .5 || target.closest('[inert]')) return;
        warmImage(firstImage(target), false);
      });
    }, { threshold: .5 });
    links.forEach((link) => observer.observe(link));
  }

  const registerCache = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
  };
  if (document.readyState === 'complete') registerCache();
  else window.addEventListener('load', registerCache, { once: true });
})();
