(() => {
  const videos = [
    { slug: 'watch', title: '智能腕表概念影像', detail: '产品视觉 / 15 SEC' },
    { slug: 'keyboard', title: '机械键盘产品视觉', detail: '产品视觉 / 15 SEC' },
    { slug: 'racing', title: '复古赛车叙事短片', detail: '叙事影像 / 15 SEC' },
    { slug: 'kpop', title: 'K-pop 节奏影像', detail: '音乐影像 / 30 SEC' },
  ];
  const posterGroups = [
    {
      title: '游戏视觉',
      items: [
        ['zenless-burnice', '绝区零 / 柏妮思', '角色海报'],
        ['zenless-caesar', '绝区零 / 凯撒', '角色海报'],
        ['zenless-lighter', '绝区零 / 莱特', '角色海报'],
        ['zenless-key-art', '绝区零 / 角色主题', '游戏海报', true],
        ['moonlight-blade', '天涯明月刀 / 赛事海报', '游戏海报', true],
        ['honkai-impact', '崩坏 3 / 角色海报', '游戏海报', true],
      ],
    },
    {
      title: '品牌与创意视觉',
      items: [
        ['tiny-lure', 'Tiny lure / 角落集乐', '品牌海报'],
        ['spring-romance', '春日浪漫', '创意海报'],
        ['qing-dumpling', '虎头局 / 爆料青团', '包装视觉'],
        ['hutouju-midautumn', '虎头局 / 中秋礼盒', '节日视觉'],
        ['hutouju-giftbox', '虎头局 / 中秋创意视觉', '节日视觉'],
        ['skateboard', '滑板@自由', '插画海报'],
      ],
    },
  ];
  const dialogs = {
    videos: document.querySelector('[data-other-dialog="videos"]'),
    posters: document.querySelector('[data-other-dialog="posters"]'),
  };
  const videoList = dialogs.videos.querySelector('.other-video-list');
  const posterList = dialogs.posters.querySelector('.other-poster-groups');
  let origin;
  let scrollPosition;
  let previousBodyTop;
  let mediaObserver;
  const posterSizes = {
    'zenless-burnice': [1440, 1440], 'zenless-caesar': [1440, 1440],
    'zenless-lighter': [1440, 1440], 'zenless-key-art': [1600, 900],
    'moonlight-blade': [1600, 900], 'honkai-impact': [1600, 901],
    'tiny-lure': [734, 981], 'spring-romance': [1199, 1600],
    'qing-dumpling': [1143, 1600], 'hutouju-midautumn': [1143, 1600],
    'hutouju-giftbox': [1143, 1600], 'skateboard': [1160, 1261],
  };

  videos.forEach(({ slug, title, detail }, index) => {
    const figure = document.createElement('figure');
    figure.className = 'other-video-item';
    const video = document.createElement('video');
    video.controls = true;
    video.setAttribute('controlsList', 'nodownload noplaybackrate');
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    video.playsInline = true;
    video.preload = 'none';
    video.dataset.poster = `./public/assets/videos/${slug}-poster.jpg?v=20261022b`;
    video.dataset.src = `./public/assets/videos/${slug}-preview.mp4?v=20261022b`;
    video.setAttribute('aria-label', title);
    video.addEventListener('contextmenu', (event) => event.preventDefault());
    video.addEventListener('play', () => {
      videoList.querySelectorAll('video').forEach((other) => {
        if (other !== video) other.pause();
      });
    });
    const caption = document.createElement('figcaption');
    caption.innerHTML = `<span>${String(index + 1).padStart(2, '0')} / 04</span><strong>${title}</strong><small>${detail}</small>`;
    figure.append(video, caption);
    videoList.append(figure);
  });

  let posterIndex = 0;
  posterGroups.forEach(({ title, items }) => {
    const group = document.createElement('section');
    group.className = 'other-poster-group';
    const heading = document.createElement('h4');
    heading.textContent = title;
    const list = document.createElement('div');
    list.className = 'other-poster-list';
    items.forEach(([slug, name, detail, wide]) => {
      posterIndex += 1;
      const figure = document.createElement('figure');
      figure.className = `other-poster-item${wide ? ' is-wide' : ''}`;
      const image = document.createElement('img');
      image.dataset.src = `./public/assets/posters/${slug}.jpg`;
      [image.width, image.height] = posterSizes[slug];
      image.alt = name;
      image.loading = 'eager';
      image.decoding = 'async';
      image.draggable = false;
      image.addEventListener('contextmenu', (event) => event.preventDefault());
      const caption = document.createElement('figcaption');
      caption.innerHTML = `<span>${String(posterIndex).padStart(2, '0')} / 12</span><strong>${name}</strong><small>${detail}</small>`;
      figure.append(image, caption);
      list.append(figure);
    });
    group.append(heading, list);
    posterList.append(group);
  });

  document.querySelectorAll('[data-other-view]').forEach((link) => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      origin = link;
      scrollPosition = window.scrollY;
      previousBodyTop = document.body.style.top;
      const dialog = dialogs[link.dataset.otherView];
      if (dialog === dialogs.videos) {
        videoList.querySelectorAll('video').forEach((video) => { video.src = video.dataset.src; });
      }
      dialog.showModal();
      document.documentElement.classList.add('reader-open');
      document.body.style.top = `-${scrollPosition}px`;
      dialog.querySelector('.other-viewport').scrollTop = 0;
      const media = [...dialog.querySelectorAll('img[data-src], video[data-poster]')];
      const loadMedia = (element) => {
        if (element.tagName === 'VIDEO') element.poster = element.dataset.poster;
        else element.src = element.dataset.src;
      };
      mediaObserver?.disconnect();
      if (dialog === dialogs.posters) {
        mediaObserver = window.portfolioPerformance.observeImages(media, dialog.querySelector('.other-viewport'));
      } else if ('IntersectionObserver' in window) {
        mediaObserver = new IntersectionObserver((entries) => {
          entries.forEach(({ target, isIntersecting }) => {
            if (!isIntersecting) return;
            loadMedia(target);
            mediaObserver.unobserve(target);
          });
        }, { root: dialog.querySelector('.other-viewport'), rootMargin: window.portfolioPerformance.conservative() ? '0px' : '100% 0px' });
        media.forEach((element) => mediaObserver.observe(element));
      } else media.forEach(loadMedia);
      if (media[0] && dialog !== dialogs.posters) loadMedia(media[0]);
    });
  });

  Object.values(dialogs).forEach((dialog) => {
    dialog.querySelector('.other-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      mediaObserver?.disconnect();
      if (dialog === dialogs.videos) {
        videoList.querySelectorAll('video').forEach((video) => {
          video.pause();
          video.removeAttribute('src');
          video.load();
        });
      }
      document.documentElement.classList.remove('reader-open');
      document.body.style.top = previousBodyTop;
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
      origin?.focus({ preventScroll: true });
    });
  });
})();
