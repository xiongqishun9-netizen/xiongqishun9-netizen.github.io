(() => {
  const reader = document.querySelector('.document-dialog');
  const viewport = reader.querySelector('.document-viewport');
  const pages = reader.querySelector('.document-pages');
  const error = reader.querySelector('.document-error');
  const zoomOutput = reader.querySelector('#document-zoom');
  const zoomIn = reader.querySelector('[data-reader="in"]');
  const zoomOut = reader.querySelector('[data-reader="out"]');
  let zoom = 1;
  let origin = null;
  let scrollPosition = 0;
  let previousBodyTop = '';
  let imageObserver;

  window.lucide?.createIcons();

  const setZoom = (next, preservePosition = true) => {
    const oldZoom = zoom;
    const top = viewport.scrollTop;
    zoom = Math.max(1, Math.min(2, next));
    pages.style.width = `${zoom * 100}%`;
    zoomOutput.value = `${Math.round(zoom * 100)}%`;
    zoomIn.disabled = zoom === 2;
    zoomOut.disabled = zoom === 1;
    if (preservePosition) viewport.scrollTop = top * zoom / oldZoom;
  };

  document.querySelectorAll('[data-document]').forEach((link) => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const entry = window.portfolioDocuments?.[link.dataset.document];
      if (!entry) return;
      event.preventDefault();
      origin = link;
      scrollPosition = window.scrollY;
      reader.querySelector('#document-title').textContent = entry.title;
      reader.querySelector('#document-category').textContent = entry.category;
      error.hidden = true;
      imageObserver?.disconnect();
      pages.style.backgroundImage = '';
      const cover = link.querySelector('img');
      const hasCover = cover?.complete && cover.naturalWidth > 0;
      if (hasCover) {
        pages.style.backgroundImage = `url(${JSON.stringify(cover.currentSrc)})`;
        pages.style.backgroundSize = '100% auto';
        pages.style.backgroundPosition = 'top center';
        pages.style.backgroundRepeat = 'no-repeat';
      }
      const fragment = document.createDocumentFragment();
      entry.tiles.forEach((tile, index) => {
        const image = new Image();
        image.width = tile.width;
        image.height = tile.height;
        image.alt = `${entry.title} · 第 ${index + 1} 段 / 共 ${entry.tiles.length} 段`;
        image.loading = 'eager';
        image.decoding = 'async';
        image.draggable = false;
        image.style.aspectRatio = `${tile.width} / ${tile.height}`;
        image.dataset.src = tile.src;
        if (index === 0 && hasCover) {
          image.style.opacity = '0';
          const showFullImage = () => {
            image.style.opacity = '';
            if (pages.contains(image)) pages.style.backgroundImage = '';
          };
          image.addEventListener('load', showFullImage, { once: true });
          image.addEventListener('error', showFullImage, { once: true });
        }
        image.addEventListener('error', () => { error.hidden = false; }, { once: true });
        fragment.appendChild(image);
      });
      pages.replaceChildren(fragment);
      reader.classList.toggle('is-resume', link.dataset.document === 'resume');
      setZoom(1, false);
      reader.showModal();
      // Fixed body also prevents background rubber-band scrolling on mobile.
      previousBodyTop = document.body.style.top;
      document.documentElement.classList.add('reader-open');
      document.body.style.top = `-${scrollPosition}px`;
      viewport.scrollTo(0, 0);
      const images = [...pages.querySelectorAll('img')];
      imageObserver = window.portfolioPerformance.observeImages(images, viewport);
    });
  });

  zoomIn.addEventListener('click', () => setZoom(zoom + 0.25));
  zoomOut.addEventListener('click', () => setZoom(zoom - 0.25));
  reader.querySelector('[data-reader="fit"]').addEventListener('click', () => setZoom(1));
  reader.querySelector('[data-reader="close"]').addEventListener('click', () => reader.close());
  pages.addEventListener('contextmenu', (event) => event.preventDefault());
  pages.addEventListener('dragstart', (event) => event.preventDefault());
  reader.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...reader.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === reader)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  let backdropPointerDown = false;
  const outsidePanel = (event) => {
    const bounds = reader.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  reader.addEventListener('pointerdown', (event) => {
    backdropPointerDown = event.target === reader && outsidePanel(event);
  });
  reader.addEventListener('click', (event) => {
    if (backdropPointerDown && event.target === reader && outsidePanel(event)) reader.close();
    backdropPointerDown = false;
  });
  reader.addEventListener('close', () => {
    imageObserver?.disconnect();
    document.documentElement.classList.remove('reader-open');
    document.body.style.top = previousBodyTop;
    window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    origin?.focus({ preventScroll: true });
    pages.replaceChildren();
    pages.style.backgroundImage = '';
  });
})();
