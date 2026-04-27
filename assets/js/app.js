/* ==========================================================================
   PORTFOLIO — Logique principale
   - Catégories: Photo · 3D · FX · Motion (filterable)
   - Curseur custom + tidal canvas ripples
   - Hero loupe
   - Drag-rail showcase
   - Tilt 3D cards
   - Reveal char-by-char
   - Magnetic / Morph CTAs
   ========================================================================== */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let CONTENT = null;
  let lastMtime = 0;

  const SECTION_ORDER = ['photo', '3d', 'fx', 'motion'];
  const PREFERS_REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------  LOADER  ---------- */
  const loader = $('#loader');
  const loaderProgress = $('.loader__progress');
  const loaderCount = $('#loaderCount');

  function animateLoader() {
    let p = 0;
    const i = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) {
        p = 100;
        clearInterval(i);
        if (loaderProgress) loaderProgress.style.width = '100%';
        if (loaderCount) loaderCount.textContent = '100';
        setTimeout(() => {
          loader?.classList.add('is-done');
          document.body.classList.add('is-ready');
          $('.hero')?.classList.add('is-loaded');
        }, 450);
      } else {
        if (loaderProgress) loaderProgress.style.width = p + '%';
        if (loaderCount) loaderCount.textContent = String(Math.round(p)).padStart(2, '0');
      }
    }, 100);
  }

  /* ----------  CURSOR  ---------- */
  const cursor = $('#cursor');
  const cursorLabel = $('#cursorLabel');
  let cx = innerWidth / 2, cy = innerHeight / 2;
  let tx = cx, ty = cy;

  addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
  document.addEventListener('mouseleave', () => cursor?.classList.add('is-hidden'));
  document.addEventListener('mouseenter', () => cursor?.classList.remove('is-hidden'));

  function cursorLoop() {
    cx += (tx - cx) * 0.24;
    cy += (ty - cy) * 0.24;
    if (cursor) cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(cursorLoop);
  }
  cursorLoop();

  function bindCursorInteractions(scope = document) {
    $$('a, button, [data-magnetic], .nav__tab, .filterbar__pill', scope).forEach(el => {
      el.addEventListener('mouseenter', () => cursor?.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => {
        cursor?.classList.remove('is-hover');
        cursor?.classList.remove('is-view');
        if (cursorLabel) cursorLabel.textContent = '';
      });
    });
    $$('.work, .showcase-card', scope).forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor?.classList.add('is-view');
        cursor?.classList.remove('is-hover');
        if (cursorLabel) cursorLabel.textContent = 'View';
      });
      el.addEventListener('mouseleave', () => {
        cursor?.classList.remove('is-view');
        if (cursorLabel) cursorLabel.textContent = '';
      });
    });
  }

  /* ----------  TIDAL CURSOR CANVAS (ripples following the cursor)  ---------- */
  let tidalActive = true;
  function initTidalCanvas() {
    const canvas = $('#tidal');
    if (!canvas || PREFERS_REDUCED) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));
    const ripples = [];
    let lastEmit = 0;

    function resize() {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    addEventListener('resize', resize);

    addEventListener('mousemove', (e) => {
      if (!tidalActive) return;
      const now = performance.now();
      if (now - lastEmit < 28) return;
      lastEmit = now;
      ripples.push({ x: e.clientX, y: e.clientY, r: 0, a: 0.55 });
      if (ripples.length > 80) ripples.shift();
    });

    function tick() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 1.4;
        r.a -= 0.012;
        if (r.a <= 0) { ripples.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 77, 26, ${r.a})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      requestAnimationFrame(tick);
    }
    tick();

    // Toggle button
    const toggle = $('#ripplesToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        tidalActive = !tidalActive;
        toggle.setAttribute('aria-pressed', String(tidalActive));
        canvas.classList.toggle('is-off', !tidalActive);
      });
    }
  }

  /* ----------  HERO LENS EFFECT  ---------- */
  function initLens() {
    const wrap = $('#lensWrap');
    const reveal = $('.hero__title--reveal');
    const lens = $('#lens');
    if (!wrap || !reveal || !lens) return;

    let active = false;
    let lensX = 0, lensY = 0;
    let targetX = 0, targetY = 0;

    wrap.addEventListener('mouseenter', () => {
      active = true;
      lens.classList.add('is-visible');
      cursor?.classList.add('is-lens');
    });
    wrap.addEventListener('mouseleave', () => {
      active = false;
      lens.classList.remove('is-visible');
      cursor?.classList.remove('is-lens');
      wrap.style.setProperty('--lens-size', '0px');
    });

    wrap.addEventListener('mousemove', (e) => {
      const r = wrap.getBoundingClientRect();
      targetX = e.clientX - r.left;
      targetY = e.clientY - r.top;
      const xPct = (targetX / r.width) * 100;
      const yPct = (targetY / r.height) * 100;
      wrap.style.setProperty('--lens-x', xPct + '%');
      wrap.style.setProperty('--lens-y', yPct + '%');
      wrap.style.setProperty('--lens-size', '160px');
    });

    function lensLoop() {
      lensX += (targetX - lensX) * 0.28;
      lensY += (targetY - lensY) * 0.28;
      if (active) {
        lens.style.transform = `translate(${lensX}px, ${lensY}px) translate(-50%, -50%)`;
      }
      requestAnimationFrame(lensLoop);
    }
    lensLoop();

    setTimeout(() => {
      if (!active) {
        const r = wrap.getBoundingClientRect();
        const demoX = r.width / 2;
        const demoY = r.height / 2;
        wrap.style.setProperty('--lens-x', '50%');
        wrap.style.setProperty('--lens-y', '50%');
        wrap.style.setProperty('--lens-size', '130px');
        lens.style.transform = `translate(${demoX}px, ${demoY}px) translate(-50%, -50%)`;
        lens.classList.add('is-visible');
        setTimeout(() => {
          if (!active) {
            wrap.style.setProperty('--lens-size', '0px');
            lens.classList.remove('is-visible');
          }
        }, 1400);
      }
    }, 2400);
  }

  /* ----------  HERO BLOBS PARALLAX  ---------- */
  function initHeroLiquidCursor() {
    const hero = $('.hero');
    const group = $('#blobGroup');
    const svg = $('.wave-svg');
    if (!hero || !group || PREFERS_REDUCED) return;

    let tx = 0, ty = 0;
    let cx = 0, cy = 0;
    let running = false;

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

    function loop() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      group.setAttribute('transform', `translate(${(cx * 140).toFixed(1)}, ${(cy * 110).toFixed(1)})`);
      if (svg) svg.style.transform = `translate3d(${(-cx * 26).toFixed(1)}px, ${(-cy * 20).toFixed(1)}px, 0)`;
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }
  }

  /* ----------  MAGNETIC  ---------- */
  function bindMagnetic() {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${mx * 0.22}px, ${my * 0.32}px)`;
      });
      el.addEventListener('mouseleave', () => el.style.transform = '');
    });
  }

  /* ----------  WORK CARDS — 3D TILT  ---------- */
  function bindTilt() {
    $$('.work').forEach(card => {
      const media = card.querySelector('.work__media');
      if (!media) return;
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const ry = (px - 0.5) * 8;
        const rx = (0.5 - py) * 6;
        media.style.setProperty('--tilt-x', rx + 'deg');
        media.style.setProperty('--tilt-y', ry + 'deg');
      });
      card.addEventListener('mouseleave', () => {
        media.style.setProperty('--tilt-x', '0deg');
        media.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  /* ----------  REVEAL ON SCROLL  ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

  function bindReveals() {
    $$('[data-reveal], .contact__title > span, .split-wrap').forEach(el => revealObs.observe(el));
  }

  /* ----------  TEXT SPLIT  ---------- */
  function splitText(el) {
    if (!el || el.dataset.split === 'done') return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let n; while ((n = walker.nextNode())) textNodes.push(n);
    textNodes.forEach(node => {
      const text = node.nodeValue;
      if (!text.trim()) return;
      const frag = document.createDocumentFragment();
      let i = 0;
      for (const ch of text) {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(' '));
        } else {
          const span = document.createElement('span');
          span.className = 'split-char';
          span.style.transitionDelay = (i * 18) + 'ms';
          span.textContent = ch;
          frag.appendChild(span);
        }
        i++;
      }
      node.parentNode.replaceChild(frag, node);
    });
    el.classList.add('split-wrap');
    el.dataset.split = 'done';
  }

  function applyTextSplits() {
    $$('.showcase__title, .about__title').forEach(el => {
      if (el.hasAttribute('data-reveal')) {
        const inner = el.querySelector('span');
        if (inner) splitText(inner);
      } else {
        splitText(el);
      }
      revealObs.observe(el);
    });
  }

  /* ----------  PARALLAX images  ---------- */
  let parallaxItems = [];
  function collectParallax() {
    parallaxItems = $$('.work__img, .showcase-card__img').map(img => ({
      img, media: img.closest('.work__media, .showcase-card')
    }));
  }
  function parallaxLoop() {
    const vh = innerHeight;
    parallaxItems.forEach(({ img, media }) => {
      if (!media) return;
      const r = media.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const progress = (r.top + r.height / 2 - vh / 2) / vh;
      const shift = progress * 18;
      img.style.setProperty('--py', shift + 'px');
    });
    requestAnimationFrame(parallaxLoop);
  }

  /* ----------  ROUTER  ---------- */
  const ROUTES = ['home', 'work', 'contact'];
  const ptOverlay = $('#pageTransition');
  const ptLabel = $('#ptLabel');
  const navIndicator = $('#navIndicator');
  let currentRoute = null;
  let isTransitioning = false;

  function getRouteFromHash() {
    const h = (location.hash || '').replace(/^#\/?/, '').trim();
    return ROUTES.includes(h) ? h : 'home';
  }
  function labelFor(route) {
    return ({ home: 'Home', work: 'Work', contact: 'Contact' })[route] || 'Studio';
  }

  function moveNavIndicator(route) {
    const tabs = $$('.nav__tab');
    const active = tabs.find(t => t.dataset.route === route);
    if (!active || !navIndicator) return;
    const parentRect = active.parentElement.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    navIndicator.style.transform = `translateX(${r.left - parentRect.left - 0.4 * 16}px)`;
    navIndicator.style.width = r.width + 'px';
  }

  function setActivePage(route) {
    $$('.page').forEach(p => p.classList.toggle('is-active', p.dataset.page === route));
    $$('.nav__tab').forEach(t => t.classList.toggle('is-active', t.dataset.route === route));
    currentRoute = route;
    moveNavIndicator(route);
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = prev;
    updateScrollProgress();
    setTimeout(() => {
      $$('[data-reveal], .contact__title > span, .split-wrap', $('.page.is-active')).forEach(el => {
        el.classList.remove('is-visible');
        revealObs.observe(el);
      });
    }, 50);
    if (route === 'home') triggerCounters();
  }

  function navigateTo(route, { skipTransition = false } = {}) {
    route = ROUTES.includes(route) ? route : 'home';
    if (route === currentRoute && !skipTransition) return;
    if (isTransitioning) return;

    if (skipTransition) {
      setActivePage(route);
      return;
    }

    isTransitioning = true;
    if (ptLabel) ptLabel.textContent = labelFor(route);
    ptOverlay?.classList.add('is-sweeping');

    setTimeout(() => { setActivePage(route); }, 520);
    setTimeout(() => {
      ptOverlay?.classList.remove('is-sweeping');
      isTransitioning = false;
    }, 1150);

    if (location.hash !== '#/' + route) {
      history.pushState({}, '', '#/' + route);
    }
  }

  function bindRouterLinks() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-route]');
      if (!a) return;
      const route = a.dataset.route;
      if (!ROUTES.includes(route)) return;
      e.preventDefault();
      navigateTo(route);
    });
  }
  addEventListener('hashchange', () => {
    const r = getRouteFromHash();
    if (r !== currentRoute) navigateTo(r);
  });
  addEventListener('resize', () => moveNavIndicator(currentRoute));

  /* ----------  SCROLL PROGRESS  ---------- */
  addEventListener('scroll', () => { updateScrollProgress(); }, { passive: true });
  function updateScrollProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? (scrollY / max) * 100 : 0;
    document.documentElement.style.setProperty('--sp', pct + '%');
  }

  /* ----------  CLOCK  ---------- */
  const clockEl = $('#navClock');
  function tickClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${hh}:${mm}`;
  }
  tickClock();
  setInterval(tickClock, 15000);

  /* ----------  COUNTERS  ---------- */
  function triggerCounters() {
    $$('[data-counter]').forEach(el => {
      const target = parseInt(el.dataset.counter, 10) || 0;
      const dur = 1400;
      const start = performance.now();
      const pad = String(target).length >= 2;
      function step(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(target * eased);
        el.textContent = pad ? String(val).padStart(2, '0') : String(val);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ----------  SHOWCASE — Drag-to-scroll category rail  ---------- */
  function renderShowcase() {
    const rail = $('#showcaseRail');
    if (!rail || !CONTENT) return;
    const sections = CONTENT.sections || {};
    rail.innerHTML = SECTION_ORDER.map(key => {
      const s = sections[key];
      if (!s) return '';
      const firstThumb = s.projects?.[0]?.thumbnail || '';
      return `
        <a class="showcase-card" data-route="work" data-filter="${esc(key)}" style="--c-accent:${s.accent || '#FF5633'}">
          <img class="showcase-card__img" src="${esc(firstThumb)}" alt="${esc(s.label)}" loading="lazy" />
          <span class="showcase-card__num">${esc(s.number || '')}</span>
          <span class="showcase-card__cta">↗</span>
          <div class="showcase-card__body">
            <div class="showcase-card__label">${esc(s.label || '')}</div>
            <h3 class="showcase-card__title">${esc(s.subtitle || '')}</h3>
            <p class="showcase-card__sub">${(s.projects || []).length} projets</p>
          </div>
          <div class="showcase-card__bar"></div>
        </a>
      `;
    }).join('');

    bindShowcaseDrag(rail);

    // Filter shortcut: clicking a card navigates to /work and applies its filter
    $$('.showcase-card', rail).forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const f = card.dataset.filter;
        navigateTo('work');
        setTimeout(() => applyFilter(f), 600);
      });
    });
  }

  function bindShowcaseDrag(rail) {
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;

    rail.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX;
      scrollStart = rail.scrollLeft;
      cursor?.classList.add('is-drag');
      if (cursorLabel) cursorLabel.textContent = 'Drag';
    });
    addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      cursor?.classList.remove('is-drag');
      if (cursorLabel) cursorLabel.textContent = '';
    });
    rail.addEventListener('mouseleave', () => {
      if (!isDown) return;
      isDown = false;
      cursor?.classList.remove('is-drag');
      if (cursorLabel) cursorLabel.textContent = '';
    });
    rail.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      rail.scrollLeft = scrollStart - dx;
    });

    // Touch already handled natively by overflow-x: auto
  }

  /* ----------  WORK GRID + FILTER  ---------- */
  let activeFilter = 'all';
  let allWorks = [];

  function renderFilterPills() {
    const container = $('#filterPills');
    if (!container || !CONTENT) return;
    const sections = CONTENT.sections || {};
    const pills = [
      { id: 'all', label: 'Tous', accent: '#15140F' },
      ...SECTION_ORDER.map(k => ({
        id: k,
        label: sections[k]?.labelShort || sections[k]?.label || k,
        accent: sections[k]?.accent || '#FF5633'
      })).filter(p => sections[p.id])
    ];

    container.innerHTML = pills.map((p, i) => `
      <button class="filterbar__pill ${p.id === activeFilter ? 'is-active' : ''}"
              data-filter="${esc(p.id)}"
              style="--p-accent: ${esc(p.accent)}">
        <span class="filterbar__pill-dot"></span>
        <span>${esc(p.label)}</span>
      </button>
    `).join('') + '<span class="filterbar__indicator" id="filterIndicator"></span>';

    $$('.filterbar__pill', container).forEach(pill => {
      pill.addEventListener('click', () => applyFilter(pill.dataset.filter));
    });
    requestAnimationFrame(() => moveFilterIndicator(activeFilter));
  }

  function moveFilterIndicator(filterId) {
    const container = $('#filterPills');
    const ind = $('#filterIndicator');
    if (!container || !ind) return;
    const active = container.querySelector(`.filterbar__pill[data-filter="${filterId}"]`);
    if (!active) return;
    const parentRect = container.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    ind.style.transform = `translateX(${r.left - parentRect.left}px)`;
    ind.style.width = r.width + 'px';
    const accent = active.style.getPropertyValue('--p-accent') || '#15140F';
    ind.style.background = filterId === 'all' ? '#15140F' : accent;
  }

  function applyFilter(filterId) {
    activeFilter = filterId;
    $$('.filterbar__pill').forEach(p => {
      p.classList.toggle('is-active', p.dataset.filter === filterId);
    });
    moveFilterIndicator(filterId);

    let visibleCount = 0;
    let i = 0;
    $$('.work').forEach(w => {
      const cat = w.dataset.section;
      const show = filterId === 'all' || cat === filterId;
      if (show) {
        w.classList.remove('is-hidden');
        w.style.setProperty('--i', i);
        // Re-trigger entrance
        w.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        w.offsetHeight;
        w.style.animation = '';
        visibleCount++;
        i++;
      } else {
        w.classList.add('is-hidden');
      }
    });

    const counter = $('#filterCount');
    if (counter) animateCounter(counter, parseInt(counter.textContent, 10) || 0, visibleCount);

    const empty = $('#worksEmpty');
    if (empty) empty.hidden = visibleCount > 0;
  }

  function animateCounter(el, from, to) {
    const dur = 500;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderWorksGrid() {
    const grid = $('#worksGrid');
    if (!grid || !CONTENT) return;
    const sections = CONTENT.sections || {};

    // Flatten all projects and tag with section
    allWorks = [];
    SECTION_ORDER.forEach(key => {
      const s = sections[key];
      if (!s?.projects) return;
      s.projects.forEach(p => {
        allWorks.push({ ...p, _section: key, _accent: s.accent, _label: s.labelShort || s.label });
      });
    });

    // Shuffle alternating-ish by year then category for visual variety
    allWorks.sort((a, b) => {
      const ya = parseInt(a.year, 10) || 0;
      const yb = parseInt(b.year, 10) || 0;
      return yb - ya;
    });

    grid.innerHTML = allWorks.map((p, i) => `
      <article class="work" data-project-id="${esc(p.id)}" data-section="${esc(p._section)}"
               style="--i: ${i}; --w-accent: ${esc(p._accent || '#FF5633')}">
        <div class="work__media">
          <img class="work__img" src="${esc(p.thumbnail)}" alt="${esc(p.title)}" loading="lazy" />
          <div class="work__overlay">
            <span class="work__overlay-cta">Voir le projet ↗</span>
          </div>
        </div>
        <div class="work__info">
          <div>
            <div class="work__cat">
              <span class="work__cat-dot"></span>
              <span>${esc(p._label || '')}</span>
            </div>
            <h3 class="work__title">${esc(p.title)}</h3>
          </div>
          <span class="work__year">${esc(p.year || '')}</span>
        </div>
      </article>
    `).join('');

    const counter = $('#filterCount');
    if (counter) counter.textContent = allWorks.length;
  }

  /* ----------  POPULATE  ---------- */
  function populate() {
    const a = CONTENT.artist || {};
    const h = a.hero || {};
    const m = a.meta || {};

    setText('#navName', a.name);
    setText('#navStudio', a.studio || 'studio');
    setText('#loaderLogo', a.name);

    setText('#heroEyebrow', h.eyebrow);
    setText('#heroLine1', h.mainLine1);
    setText('#heroLine2', h.mainLine2);
    setText('#heroLine3', h.mainLine3);
    setText('#heroSecret1', h.secretLine1);
    setText('#heroSecret2', h.secretLine2);
    setText('#heroSecret3', h.secretLine3);
    const hint = $('#heroHint span:last-child');
    if (hint && h.hint) hint.textContent = h.hint;

    setText('#meta1a', m.col1Line1);
    setText('#meta1b', m.col1Line2);
    setText('#meta2a', m.col2Line1);
    setText('#meta2b', m.col2Line2);
    setText('#meta3a', m.col3Line1);
    setText('#meta3b', m.col3Line2);

    const manifesto = $('#manifestoText');
    if (manifesto) manifesto.innerHTML = `<span>${escWithEm(a.manifesto || '')}</span>`;

    setText('#aboutBody', a.about);
    setText('#footerName', a.name);
    setText('#footerLine', a.footerLine);
    setText('#footerYear', new Date().getFullYear());
    document.title = `${a.name || 'Portfolio'} — ${a.tagline || ''}`;

    const facts = [
      { label: 'Based in', value: a.location || '—' },
      { label: 'Contact', value: a.email || '—' },
      { label: 'Status', value: a.availability || '—' },
      { label: 'Fields', value: a.tagline || 'Photo · 3D · FX · Motion' },
    ];
    const factsEl = $('#aboutFacts');
    if (factsEl) factsEl.innerHTML = facts.map(f => `
      <li class="about__fact">
        <span class="about__fact-label">${esc(f.label)}</span>
        <span class="about__fact-value">${esc(f.value)}</span>
      </li>
    `).join('');

    const mail = $('#contactMail');
    if (mail && a.email) { mail.textContent = a.email; mail.href = 'mailto:' + a.email; }
    const socialsEl = $('#contactSocials');
    if (socialsEl) socialsEl.innerHTML = (a.social || []).map(s => `
      <a href="${esc(s.url)}" class="contact__social" target="_blank" rel="noopener">${esc(s.label)} ↗</a>
    `).join('');

    const items = [...(a.marquee || [])];
    const track = $('#marqueeTrack');
    if (track) {
      const chunk = items.map(i => `<span class="marquee__item">${esc(i)}</span>`).join('');
      track.innerHTML = chunk + chunk;
    }
  }

  /* ----------  LIGHTBOX  ---------- */
  const lightbox = $('#lightbox');
  const lbInner = $('#lightboxInner');
  const lbCaption = $('#lightboxCaption');
  let lbImages = [], lbIndex = 0, lbTitle = '';

  function openLightbox(images, i = 0, title = '') {
    if (!images?.length) return;
    lbImages = images; lbIndex = i; lbTitle = title;
    renderLb();
    lightbox?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function renderLb() {
    if (!lbInner || !lbCaption) return;
    lbInner.innerHTML = `<img src="${esc(lbImages[lbIndex])}" alt="" />`;
    lbCaption.textContent = lbTitle ? `${lbTitle} — ${lbIndex+1} / ${lbImages.length}` : `${lbIndex+1} / ${lbImages.length}`;
  }
  function closeLightbox() {
    lightbox?.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  $('#lightboxClose')?.addEventListener('click', closeLightbox);
  $('#lightboxPrev')?.addEventListener('click', () => { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; renderLb(); });
  $('#lightboxNext')?.addEventListener('click', () => { lbIndex = (lbIndex + 1) % lbImages.length; renderLb(); });
  lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') { lbIndex = (lbIndex + 1) % lbImages.length; renderLb(); }
    if (e.key === 'ArrowLeft') { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; renderLb(); }
  });

  /* ----------  PROJECT DETAIL  ---------- */
  const pdOverlay = $('#projectDetail');
  const pdScroll = $('#projectScroll');
  function openProject(id, sectionKey) {
    const s = CONTENT.sections[sectionKey];
    const p = s?.projects?.find(x => x.id === id);
    if (!p) return;
    if (!pdScroll) return;
    pdScroll.innerHTML = `
      <article class="pd">
        <header class="pd__head">
          <div>
            <span class="pd__eyebrow">${esc(s.label)} / ${esc(p.year || '')}</span>
            <h1 class="pd__title">${esc(p.title)}</h1>
          </div>
          <div class="pd__facts">
            ${p.client ? factHtml('Client', p.client) : ''}
            ${p.role ? factHtml('Role', p.role) : ''}
            ${p.year ? factHtml('Year', p.year) : ''}
            ${(p.tags || []).length ? factHtml('Tools', p.tags.join(' · ')) : ''}
          </div>
        </header>
        <p class="pd__description">${esc(p.description || '')}</p>
        <div class="pd__gallery">
          ${(p.gallery?.length ? p.gallery : [p.thumbnail]).map((src, i) => `
            <img src="${esc(src)}" alt="${esc(p.title)} ${i+1}" data-gi="${i}" loading="lazy" />
          `).join('')}
        </div>
      </article>
    `;
    const imgs = p.gallery?.length ? p.gallery : [p.thumbnail];
    $$('.pd__gallery img', pdScroll).forEach(img => {
      img.addEventListener('click', () => openLightbox(imgs, parseInt(img.dataset.gi, 10), p.title));
    });
    pdOverlay?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    pdScroll.scrollTop = 0;
  }
  function closeProject() {
    pdOverlay?.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  $('#projectClose')?.addEventListener('click', closeProject);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pdOverlay?.classList.contains('is-open')) closeProject();
  });
  function factHtml(label, value) {
    return `<div class="pd__fact"><span class="pd__fact-label">${esc(label)}</span><span class="pd__fact-value">${esc(value)}</span></div>`;
  }
  function bindProjectClicks() {
    $$('.work').forEach(el => {
      el.addEventListener('click', () => openProject(el.dataset.projectId, el.dataset.section));
    });
  }

  /* ----------  HELPERS  ---------- */
  function setText(sel, val) { const el = $(sel); if (el && val != null && val !== '') el.textContent = val; }
  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escWithEm(str) {
    return String(str ?? '')
      .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  /* ----------  FETCH & AUTO-REFRESH  ---------- */
  async function loadContent() {
    const res = await fetch('content.json?t=' + Date.now());
    if (!res.ok) throw new Error('content.json introuvable');
    return res.json();
  }
  async function checkForUpdates() {
    try {
      const r = await fetch('/mtime?t=' + Date.now());
      if (!r.ok) return;
      const { mtime } = await r.json();
      if (lastMtime && mtime > lastMtime) {
        CONTENT = await loadContent();
        rerenderAll();
        flashUpdate();
      }
      lastMtime = mtime;
    } catch (_) {}
  }
  function rerenderAll() {
    populate();
    renderShowcase();
    renderWorksGrid();
    renderFilterPills();
    bindProjectClicks();
    bindCursorInteractions();
    applyTextSplits();
    bindReveals();
    bindMagnetic();
    bindTilt();
    collectParallax();
    applyFilter(activeFilter);
  }
  function flashUpdate() {
    const f = document.createElement('div');
    f.textContent = 'UPDATED ✦';
    Object.assign(f.style, {
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      padding: '0.7rem 1.3rem', background: 'var(--coral)', color: '#000',
      borderRadius: '999px', fontFamily: 'JetBrains Mono, monospace',
      fontSize: '0.7rem', letterSpacing: '0.15em', zIndex: '2000',
      fontWeight: '500', boxShadow: '0 20px 40px rgba(255, 86, 51, 0.3)',
      opacity: '0', transition: 'opacity 0.4s, transform 0.4s'
    });
    document.body.appendChild(f);
    requestAnimationFrame(() => { f.style.opacity = '1'; f.style.transform = 'translate(-50%, -8px)'; });
    setTimeout(() => { f.style.opacity = '0'; setTimeout(() => f.remove(), 400); }, 1800);
  }

  /* ----------  SCROLL-LINKED BG  ---------- */
  const PAGE_TINTS = {
    home:    ['#F2EEE5', '#EBE2D2'],
    work:    ['#F2EEE5', '#E6DBCB'],
    contact: ['#F2EEE5', '#ECE5D8']
  };
  function lerpHex(a, b, t) {
    const pa = a.match(/\w\w/g).map(x => parseInt(x, 16));
    const pb = b.match(/\w\w/g).map(x => parseInt(x, 16));
    const r = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return '#' + r.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function updateScrollBG() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const t = max > 0 ? Math.min(1, scrollY / max) : 0;
    const pal = PAGE_TINTS[currentRoute] || PAGE_TINTS.home;
    document.documentElement.style.setProperty('background', lerpHex(pal[0], pal[1], t));
    const waves = $('.hero__waves');
    if (waves) waves.style.transform = `translate3d(0, ${scrollY * 0.18}px, 0)`;
  }
  addEventListener('scroll', updateScrollBG, { passive: true });

  /* ----------  INIT  ---------- */
  async function init() {
    try {
      CONTENT = await loadContent();
      try { lastMtime = (await (await fetch('/mtime?t=' + Date.now())).json()).mtime; } catch (_) {}
      rerenderAll();
      animateLoader();
      initLens();
      initHeroLiquidCursor();
      initTidalCanvas();
      parallaxLoop();
      bindRouterLinks();
      navigateTo(getRouteFromHash(), { skipTransition: true });
      updateScrollBG();
      setInterval(checkForUpdates, 1500);
    } catch (err) {
      console.error(err);
      if (loader) loader.innerHTML = `<div style="text-align:center; padding:2rem; color:#F5F4F0;">
        <h2 style="font-family:Space Grotesk, sans-serif; font-size:1.5rem; margin-bottom:1rem;">Unable to load site</h2>
        <p style="font-family:monospace; opacity:.6; font-size:0.85rem;">${esc(err.message)}</p>
        <p style="margin-top:1rem; opacity:.5; font-size:0.85rem;">Lance <code>start.bat</code> pour démarrer le serveur.</p>
      </div>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
