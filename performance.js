(() => {
  const connection = navigator.connection;
  const constrained = () => connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
  const conservative = () => window.innerWidth <= 640 ||
    window.matchMedia('(pointer: coarse), (hover: none)').matches || constrained() || connection?.effectiveType === '3g';
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
    if (!source || conservative() || (!intent && warmed.size >= 4)) return;
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
  const observeImages = (images, root) => {
    let stopped = false;
    let active = 0;
    const compact = conservative();
    const limit = compact ? 1 : 3;
    const waiting = new Set();
    let observer;
    const pump = () => {
      if (stopped) return;
      const bounds = root.getBoundingClientRect();
      const ordered = [...waiting].sort((a, b) => {
        const distance = (image) => Math.max(0, image.getBoundingClientRect().top - bounds.bottom);
        return distance(a) - distance(b);
      });
      for (const image of ordered) {
        if (active >= limit) break;
        waiting.delete(image);
        observer?.unobserve(image);
        load(image);
      }
    };
    const load = (image) => {
      if (image.getAttribute('src')) return;
      active += 1;
      const settled = () => {
        image.removeEventListener('load', settled);
        image.removeEventListener('error', settled);
        active -= 1;
        pump();
      };
      image.addEventListener('load', settled);
      image.addEventListener('error', settled);
      image.src = image.dataset.src;
    };
    // On touch screens the first tile gets the connection to itself before the next visible tile.
    if (images[0]) {
      images[0].fetchPriority = 'high';
      load(images[0]);
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (target.hasAttribute('src')) return;
          if (isIntersecting) waiting.add(target);
          else waiting.delete(target);
        });
        pump();
      }, { root, rootMargin: compact ? '0px' : '100% 0px' });
      images.slice(1).forEach((image) => observer.observe(image));
    } else {
      images.slice(1).forEach((image) => waiting.add(image));
      pump();
    }
    return { disconnect() { stopped = true; waiting.clear(); observer?.disconnect(); } };
  };
  window.portfolioPerformance = { warmImage, conservative, observeImages };

  const deferLargeImages = () => {
    const images = [...document.querySelectorAll('img[data-deferred-src]')];
    const load = (image) => { image.src = image.dataset.deferredSrc; };
    if (!('IntersectionObserver' in window)) return images.forEach(load);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        load(target);
        observer.unobserve(target);
      });
    }, { rootMargin: conservative() ? '120px' : '600px' });
    images.forEach((image) => observer.observe(image));
  };
  const cover = document.querySelector('.landscape-sky img');
  if (cover) cover.decode().catch(() => {}).then(deferLargeImages);
  else deferLargeImages();

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
    link.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch' || conservative()) return;
      timer = setTimeout(() => warmImage(firstImage(link)), 150);
    });
    link.addEventListener('pointerleave', () => clearTimeout(timer));
    link.addEventListener('focus', () => warmImage(firstImage(link)));
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
