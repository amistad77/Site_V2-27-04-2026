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

/* --- Redirige automatiquement file:// vers http://localhost:8765 ---
   Le site a besoin du serveur Python pour charger content.json. Si l'utilisateur
   a ouvert index.html en double-cliquant (file://), on le redirige sur le bon URL. */
if (location.protocol === 'file:') {
  const path = location.pathname.split(/[\\/]/).pop() || 'index.html';
  location.replace('http://localhost:8765/' + path + location.search + location.hash);
}

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
          // Force le loader à disparaître complètement après sa transition CSS.
          // Sécurité : si la transition échoue (cache, override), on cache en dur
          // pour qu'il ne masque pas l'intro et la home révélée par le split.
          setTimeout(() => {
            if (loader) {
              loader.style.display = 'none';
              loader.style.visibility = 'hidden';
              loader.style.opacity = '0';
              loader.style.pointerEvents = 'none';
            }
          }, 600);
          // Démarre l'animation intro pilotée au scroll
          startIntro();
        }, 450);
      } else {
        if (loaderProgress) loaderProgress.style.width = p + '%';
        if (loaderCount) loaderCount.textContent = String(Math.round(p)).padStart(2, '0');
      }
    }, 100);
  }

  /* ----------  INTRO — BANDE DÉMO + SPLIT WIPE  ----------
     Overlay fixe. Le scroll est bloqué pendant l'intro,
     wheel/touch fait avancer la progression.
     Phases (progress 0 → 1) :
       0.00 → 0.25  : texte "Baptiste Dumoulin présente" s'efface
       0.25 → 0.65  : la vidéo grandit cinéma → plein écran
       0.65 → 1.00  : split-wipe — les 2 moitiés partent vers les côtés
       = 1.00       : intro retirée → homepage
  */
  function startIntro() {
    const intro = $('#intro');
    if (!intro) return;
    if (sessionStorage.getItem('introSeen') === '1') {
      intro.remove();
      return;
    }

    const video = $('#introVideo');

    // Démarre la lecture de la vidéo plein écran
    try { video && video.play().catch(() => {}); } catch (e) {}

    document.body.classList.add('intro-locked');
    // Petit délai pour permettre au navigateur de reflow avant le fondu d'apparition
    setTimeout(() => intro.classList.add('is-armed'), 30);

    let progress = 0;
    let touchStartY = 0;
    let done = false;

    const lerp  = (a, b, t) => a + (b - a) * t;
    const phase = (p, p0, p1) => Math.max(0, Math.min(1, (p - p0) / (p1 - p0)));
    const smooth = t => t * t * (3 - 2 * t);
    const isMobile = () => window.innerWidth < 768;

    function applyProgress(p) {
      progress = Math.max(0, Math.min(1, p));

      // --- Phase A : fondu du texte (0 → 0.25) ---
      const textT = phase(progress, 0, 0.25);
      intro.style.setProperty('--intro-text-opacity', (1 - textT).toFixed(3));
      intro.style.setProperty('--intro-text-y', (-textT * 24).toFixed(1) + 'px');
      intro.style.setProperty('--intro-hint-opacity', progress > 0.015 ? 0 : 0.75);

      // --- Voile : sombre au début, transparent ensuite (0 → 0.55) ---
      const veilT = phase(progress, 0, 0.55);
      intro.style.setProperty('--intro-veil', lerp(0.35, 0, veilT).toFixed(3));

      // --- Phase C : sortie en fondu + léger zoom (0.65 → 1.0) ---
      // La vidéo s'estompe en zoomant légèrement, comme si on entrait dans la home.
      const exitT = smooth(phase(progress, 0.65, 1.0));
      intro.style.setProperty('--intro-stage-opacity', (1 - exitT).toFixed(3));
      intro.style.setProperty('--intro-exit-scale', (1 + exitT * 0.12).toFixed(4));

      // Fond noir → transparent dès le milieu (on voit la home apparaître dessous)
      const bgT = phase(progress, 0.55, 0.85);
      intro.style.setProperty('--intro-bg', (1 - bgT).toFixed(3));

      intro.style.setProperty('--intro-progress', (progress * 100).toFixed(1) + '%');
      intro.style.setProperty('--intro-progress-opacity', progress < 0.92 ? 0.7 : 0);

      if (progress >= 1 && !done) finishIntro();
    }

    function finishIntro() {
      done = true;
      sessionStorage.setItem('introSeen', '1');
      // Court palier pour laisser apprécier le split avant de cacher l'intro
      setTimeout(() => {
        intro.classList.add('is-done');
        document.body.classList.remove('intro-locked');
        cleanup();
        // Retire l'élément après la fin de la transition pour libérer la vidéo
        setTimeout(() => intro.remove(), 900);
      }, 350);
    }

    function onWheel(e) {
      if (done) return;
      e.preventDefault();
      applyProgress(progress + e.deltaY * 0.0011);
    }
    function onTouchStart(e) {
      if (done) return;
      touchStartY = e.touches[0].clientY;
    }
    function onTouchMove(e) {
      if (done) return;
      if (!touchStartY) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      const dy = touchStartY - y;
      const factor = dy < 0 ? 0.009 : 0.006;
      applyProgress(progress + dy * factor);
      touchStartY = y;
    }
    function onTouchEnd() { touchStartY = 0; }
    function onKey(e) {
      if (done) return;
      if (['ArrowDown', 'PageDown', 'Space', ' '].includes(e.key)) {
        e.preventDefault();
        applyProgress(progress + 0.08);
      } else if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        applyProgress(1);
      }
    }
    function onScroll() { if (!done) window.scrollTo(0, 0); }

    function cleanup() {
      window.removeEventListener('wheel', onWheel, { passive: false });
      window.removeEventListener('touchstart', onTouchStart, { passive: false });
      window.removeEventListener('touchmove', onTouchMove, { passive: false });
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    }

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });

    applyProgress(0);
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
    $$('.work, .showcase-card, .fluid-card, .cat-stack__card, .pd__related-card', scope).forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor?.classList.add('is-view');
        cursor?.classList.remove('is-hover');
        if (cursorLabel) cursorLabel.textContent = 'View';
        // Smart accent: cursor adopts the card's accent color
        const accent = el.style.getPropertyValue('--w-accent') || el.style.getPropertyValue('--c-accent');
        if (accent) {
          cursor?.style.setProperty('--cursor-accent', accent.trim());
          cursor?.classList.add('is-accented');
        }
      });
      el.addEventListener('mouseleave', () => {
        cursor?.classList.remove('is-view');
        cursor?.classList.remove('is-accented');
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

  /* ----------  WORK CARDS — 3D TILT + LIQUID  ---------- */
  function bindTilt() {
    $$('.work').forEach(card => {
      const media = card.querySelector('.work__media');
      const title = card.querySelector('.work__title');
      if (title && !title.dataset.title) title.dataset.title = title.textContent;
      if (!media) return;
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const ry = (px - 0.5) * 8;
        const rx = (0.5 - py) * 6;
        media.style.setProperty('--tilt-x', rx + 'deg');
        media.style.setProperty('--tilt-y', ry + 'deg');
        card.style.setProperty('--lx', (px * 100) + '%');
        card.style.setProperty('--ly', (py * 100) + '%');
        card.style.setProperty('--liquid', '1');
      });
      card.addEventListener('mouseleave', () => {
        media.style.setProperty('--tilt-x', '0deg');
        media.style.setProperty('--tilt-y', '0deg');
        card.style.setProperty('--liquid', '0');
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
  const tickerClockEl = $('#tickerClock');
  function tickClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${hh}:${mm}`;
    if (tickerClockEl) tickerClockEl.textContent = `${hh}:${mm}`;
    // also update duplicate ticker clocks for the seamless loop
    $$('.hero__ticker-item span').forEach(s => {
      if (s.textContent.match(/^\d\d:\d\d$/) || s.textContent === '--:--') {
        s.textContent = `${hh}:${mm}`;
      }
    });
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

  /* ----------  SHOWCASE — STACKED CATEGORY CARDS  ----------
     3 cards visible (pos-0/1/2). "Suivant" → top card flies down,
     others shift up by one slot, a new card enters from the back. */
  let stackIdx = 0;
  let stackAnimating = false;
  let stackInited = false;

  function makeStackCard(catIndex, posClass, cats) {
    const cat = cats[catIndex % cats.length];
    const a = document.createElement('a');
    a.className = `cat-stack__card ${posClass}`;
    a.href = '#/work';
    a.style.setProperty('--c-accent', cat.accent || '#FF5633');
    a.dataset.catId = cat.id;
    a.innerHTML = `
      <div class="cat-stack__media">
        <img src="${esc(cat.projects?.[0]?.thumbnail || '')}" alt="${esc(cat.label || '')}" />
        <span class="cat-stack__num">${esc(cat.number || '')}</span>
      </div>
      <div class="cat-stack__info">
        <div class="cat-stack__txt">
          <span class="cat-stack__label">${esc(cat.label || '')}</span>
          <h3 class="cat-stack__title">${esc(cat.subtitle || '')}</h3>
          <span class="cat-stack__sub">${(cat.projects || []).length} projets</span>
        </div>
        <button class="cat-stack__btn" type="button" data-magnetic>
          Voir
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square">
            <path d="M9.5 18L15.5 12L9.5 6" />
          </svg>
        </button>
      </div>
    `;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.dataset.catId;
      navigateTo('work');
      setTimeout(() => applyFilter(id), 600);
    });
    return a;
  }

  function renderStack() {
    const deck = $('#catStackDeck');
    if (!deck || !CONTENT) return;
    const cats = SECTION_ORDER.map(k => CONTENT.sections[k]).filter(Boolean);
    if (!cats.length) return;
    deck.innerHTML = '';
    stackIdx = 0;
    for (let i = 0; i < Math.min(3, cats.length); i++) {
      deck.appendChild(makeStackCard(stackIdx + i, `pos-${i}`, cats));
    }
    if (!stackInited) {
      const btn = $('#catStackAnimate');
      btn?.addEventListener('click', () => animateStackForward(cats));
      stackInited = true;
    }
  }

  function animateStackForward(cats) {
    if (stackAnimating) return;
    const deck = $('#catStackDeck');
    if (!deck) return;
    const all = $$('.cat-stack__card', deck);
    if (!all.length) return;
    stackAnimating = true;

    const top = all.find(c => c.classList.contains('pos-0'));
    const mid = all.find(c => c.classList.contains('pos-1'));
    const back = all.find(c => c.classList.contains('pos-2'));

    if (top) { top.classList.remove('pos-0'); top.classList.add('exiting'); }
    if (mid) { mid.classList.remove('pos-1'); mid.classList.add('pos-0'); }
    if (back) { back.classList.remove('pos-2'); back.classList.add('pos-1'); }

    stackIdx = (stackIdx + 1) % cats.length;
    const next = makeStackCard(stackIdx + 2, 'entering', cats);
    deck.appendChild(next);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        next.classList.remove('entering');
        next.classList.add('pos-2');
      });
    });

    setTimeout(() => {
      top?.remove();
      bindCursorInteractions(deck);
      bindMagnetic();
      stackAnimating = false;
    }, 820);
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
    const previous = activeFilter;
    activeFilter = filterId;
    $$('.filterbar__pill').forEach(p => {
      p.classList.toggle('is-active', p.dataset.filter === filterId);
    });
    moveFilterIndicator(filterId);

    // Category wash with accent color of the chosen filter
    if (filterId !== previous && CONTENT) {
      const sec = CONTENT.sections?.[filterId];
      const accent = (filterId === 'all') ? '#15140F' : (sec?.accent || '#FF5633');
      const activePill = $(`.filterbar__pill[data-filter="${filterId}"]`);
      let ox, oy;
      if (activePill) {
        const r = activePill.getBoundingClientRect();
        ox = r.left + r.width / 2;
        oy = r.top + r.height / 2;
      }
      triggerCatWash(accent, ox, oy);
    }

    // Switch grid mode: per-category → fluid expanding grid; "all" → asymmetric grid
    const grid = $('#worksGrid');
    const fluid = $('#worksFluid');
    if (filterId === 'all') {
      if (grid) grid.hidden = false;
      if (fluid) { fluid.hidden = true; fluid.innerHTML = ''; }
    } else {
      if (grid) grid.hidden = true;
      renderFluid(filterId);
      // Defer layout calc until after fluid is laid out
      requestAnimationFrame(() => fluidApplyLayout());
    }

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

    grid.innerHTML = allWorks.map((p, i) => {
      const idx = String(i + 1).padStart(2, '0');
      return `
      <article class="work" data-project-id="${esc(p.id)}" data-section="${esc(p._section)}"
               style="--i: ${i}; --w-accent: ${esc(p._accent || '#FF5633')}">
        <span class="work__bar" aria-hidden="true"></span>
        <span class="work__index">N°<em>${idx}</em> / ${esc(p.year || '')}</span>
        <div class="work__media">
          <img class="work__img" src="${esc(p.thumbnail)}" alt="${esc(p.title)}" loading="lazy" />
          <div class="work__overlay">
            <span class="work__overlay-cta">Voir le projet →</span>
          </div>
        </div>
        <div class="work__info">
          <div>
            <div class="work__cat">
              <span class="work__cat-bar" aria-hidden="true"></span>
              <span>${esc(p._label || '')}</span>
            </div>
            <h3 class="work__title">${esc(p.title)}</h3>
          </div>
          <span class="work__year">${esc(p.year || '')}</span>
        </div>
      </article>
    `;
    }).join('');

    const counter = $('#filterCount');
    if (counter) counter.textContent = allWorks.length;
  }

  /* ----------  FLUID EXPANDING GRID (per-category)  ----------
     Layout: up to 4 projects in 2 rows. Click a card → it expands
     to fill its row, the sibling moves to the other row's first slot.
     Smooth animation via absolute positioning + transitions. */
  const fluidState = {
    container: null,
    deck: null,
    cards: new Map(),       // id -> element
    projects: [],           // array of project objects
    layout: { row1: [], row2: [] },
    selectedId: null,
    bound: false,
  };

  function renderFluid(filterId) {
    const fluid = $('#worksFluid');
    if (!fluid || !CONTENT) return;
    const sec = CONTENT.sections?.[filterId];
    if (!sec?.projects?.length) {
      fluid.innerHTML = '';
      fluid.hidden = true;
      return;
    }

    // Cap to 3 to keep all items visible during expansion (matches reference UX)
    const allProjects = sec.projects;
    const projects = allProjects.slice(0, 3);
    const extras = allProjects.length - projects.length;

    // Build deck container
    fluid.innerHTML = `
      <div class="fluid-deck" id="fluidDeck"></div>
      ${extras > 0 ? `<div class="fluid-more">
        <span class="fluid-more__count">+${extras}</span>
        <span class="fluid-more__label">autre${extras > 1 ? 's' : ''} projet${extras > 1 ? 's' : ''} dans cette catégorie</span>
      </div>` : ''}
    `;
    fluid.hidden = false;
    const deck = $('#fluidDeck', fluid);
    fluidState.deck = deck;
    fluidState.projects = projects;
    fluidState.cards = new Map();
    fluidState.selectedId = null;

    const ids = projects.map(p => p.id);
    fluidState.layout = {
      row1: ids.slice(0, Math.min(2, ids.length)),
      row2: ids.slice(2, Math.min(4, ids.length)),
    };

    projects.forEach(p => {
      const el = document.createElement('div');
      el.className = 'fluid-card';
      el.dataset.projectId = p.id;
      el.dataset.section = filterId;
      el.style.setProperty('--w-accent', sec.accent || '#FF5633');
      el.innerHTML = `
        <div class="fluid-card__media">
          <img src="${esc(p.thumbnail)}" alt="${esc(p.title)}" loading="lazy" />
          <div class="fluid-card__mask"></div>
        </div>
        <div class="fluid-card__overlay"></div>
        <div class="fluid-card__border"></div>
        <button class="fluid-card__open" type="button" data-magnetic>
          Voir le projet ↗
        </button>
        <div class="fluid-card__body">
          <span class="fluid-card__category">${esc(sec.labelShort || sec.label)}</span>
          <h3 class="fluid-card__title">${esc(p.title)}</h3>
          <p class="fluid-card__sub">${esc(p.client || '')} · ${esc(p.year || '')}</p>
        </div>
      `;
      deck.appendChild(el);
      fluidState.cards.set(p.id, el);

      // Click on card → expand (or open if already expanded)
      el.addEventListener('click', (e) => {
        if (e.target.closest('.fluid-card__open')) return;
        if (fluidState.selectedId === p.id) {
          openProject(p.id, filterId);
        } else {
          fluidExpand(p.id);
        }
      });
      const openBtn = el.querySelector('.fluid-card__open');
      openBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        openProject(p.id, filterId);
      });
    });

    // Initial layout — no pre-selection, all cards visible in 2x2 grid
    fluidApplyLayout(true);

    // Resize hook
    if (!fluidState.bound) {
      addEventListener('resize', () => fluidApplyLayout());
      fluidState.bound = true;
    }

    bindCursorInteractions(fluid);
    bindMagnetic();
  }

  function fluidExpand(id, { skipTransition = false } = {}) {
    const { layout } = fluidState;
    const inRow1 = layout.row1.includes(id);
    const inRow2 = layout.row2.includes(id);
    if (!inRow1 && !inRow2) return;
    // No expansion if already alone in its row
    if (inRow1 && layout.row1.length === 1) {
      // toggle off → return to default split
      restoreFluidDefault();
      return;
    }
    if (inRow2 && layout.row2.length === 1) {
      restoreFluidDefault();
      return;
    }
    if (inRow1) {
      const neighbor = layout.row1.find(i => i !== id);
      fluidState.layout = {
        row1: [id],
        row2: neighbor ? [neighbor, ...layout.row2.filter(i => i !== neighbor)].slice(0, 2) : layout.row2.slice(0, 2),
      };
    } else {
      const neighbor = layout.row2.find(i => i !== id);
      fluidState.layout = {
        row1: neighbor ? [neighbor, ...layout.row1.filter(i => i !== neighbor)].slice(0, 2) : layout.row1.slice(0, 2),
        row2: [id],
      };
    }
    fluidState.selectedId = id;
    fluidApplyLayout(skipTransition);
  }

  function restoreFluidDefault() {
    const ids = fluidState.projects.map(p => p.id);
    fluidState.layout = {
      row1: ids.slice(0, Math.min(2, ids.length)),
      row2: ids.slice(2, Math.min(4, ids.length)),
    };
    fluidState.selectedId = null;
    fluidApplyLayout();
  }

  function fluidApplyLayout(skipTransition = false) {
    const deck = fluidState.deck;
    if (!deck) return;
    const r = deck.getBoundingClientRect();
    const W = r.width;
    const H = r.height || 540;
    const gap = 24;
    const halfW = (W - gap) / 2;
    const halfH = (H - gap) / 2;

    function place(id, row, isAlone, indexInRow) {
      const el = fluidState.cards.get(id);
      if (!el) return;
      const isSel = fluidState.selectedId === id;
      el.classList.toggle('is-selected', isSel);
      if (skipTransition) {
        el.style.transition = 'none';
        // restore after 1 frame
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = ''; }));
      }
      const top = row === 1 ? 0 : (halfH + gap);
      let left, width;
      if (isAlone) {
        left = 0;
        width = W;
      } else {
        left = indexInRow === 0 ? 0 : (halfW + gap);
        width = halfW;
      }
      el.style.top = top + 'px';
      el.style.left = left + 'px';
      el.style.width = width + 'px';
      el.style.height = halfH + 'px';
    }

    const { row1, row2 } = fluidState.layout;
    row1.forEach((id, i) => place(id, 1, row1.length === 1, i));
    row2.forEach((id, i) => place(id, 2, row2.length === 1, i));
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

    const accent = s.accent || '#FF5633';
    const heroSrc = p.gallery?.[0] || p.thumbnail;

    // Build "related projects" from other categories + same category siblings
    const related = [];
    SECTION_ORDER.forEach(k => {
      const sec = CONTENT.sections[k];
      if (!sec?.projects) return;
      sec.projects.forEach(pp => {
        if (pp.id !== p.id) related.push({ ...pp, _section: k, _label: sec.labelShort || sec.label, _accent: sec.accent });
      });
    });
    // Pick 3 — prefer same section first
    related.sort((a, b) => {
      const sa = a._section === sectionKey ? 0 : 1;
      const sb = b._section === sectionKey ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return Math.random() - 0.5;
    });
    const relatedPicks = related.slice(0, 3);

    pdScroll.innerHTML = `
      <article class="pd" style="--pd-accent:${esc(accent)}">
        <header class="pd__head">
          <div>
            <span class="pd__eyebrow">${esc(s.label)} / ${esc(p.year || '')}</span>
            <h1 class="pd__title" data-shadow="${esc(p.title)}">${esc(p.title)}</h1>
          </div>
          <div class="pd__facts">
            ${p.client ? factHtml('Client', p.client) : ''}
            ${p.role ? factHtml('Role', p.role) : ''}
            ${p.year ? factHtml('Year', p.year) : ''}
            ${(p.tags || []).length ? factHtml('Tools', p.tags.join(' · ')) : ''}
          </div>
        </header>

        <div class="pd__hero-image">
          <img src="${esc(heroSrc)}" alt="${esc(p.title)}" />
        </div>

        <div class="pd__chapter">— Note d'intention</div>
        <p class="pd__description">${esc(p.description || '')}</p>

        <div class="pd__chapter">— Specs</div>
        <table class="pd__specs">
          <tbody>
            ${specsHtml(p, s)}
          </tbody>
        </table>

        ${(p.gallery?.length > 1) ? `<div class="pd__chapter">— Images / ${p.gallery.length}</div>` : ''}
        <div class="pd__gallery">
          ${(p.gallery?.length ? p.gallery : [p.thumbnail]).map((src, i) => `
            <img src="${esc(src)}" alt="${esc(p.title)} ${i+1}" data-gi="${i}" loading="lazy" />
          `).join('')}
        </div>

        ${relatedPicks.length ? `
          <div class="pd__related">
            <div class="pd__chapter">— À découvrir aussi</div>
            <h2 class="pd__related-title">Other <em>worlds</em>.</h2>
            <div class="pd__related-grid">
              ${relatedPicks.map(rp => `
                <a class="pd__related-card" data-related-id="${esc(rp.id)}" data-related-section="${esc(rp._section)}" style="--w-accent:${esc(rp._accent || '#FF5633')}">
                  <img src="${esc(rp.thumbnail)}" alt="${esc(rp.title)}" loading="lazy" />
                  <span class="pd__related-card-label">${esc(rp.title)}</span>
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </article>
    `;

    const imgs = p.gallery?.length ? p.gallery : [p.thumbnail];
    $$('.pd__gallery img', pdScroll).forEach(img => {
      img.addEventListener('click', () => openLightbox(imgs, parseInt(img.dataset.gi, 10), p.title));
    });
    $$('.pd__related-card', pdScroll).forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        openProject(card.dataset.relatedId, card.dataset.relatedSection);
      });
    });

    // Update scrub bar count
    const label = $('#projectScrubLabel');
    if (label) label.textContent = `01 / ${String(imgs.length).padStart(2, '0')}`;
    const fill = $('#projectScrubFill');
    if (fill) {
      fill.style.background = accent;
      fill.style.width = '0%';
    }

    pdOverlay?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    pdScroll.scrollTop = 0;

    // Trigger a category wash with the project's accent
    triggerCatWash(accent);
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

  /* Build a "specs sheet" from project data + parsed numbers from description */
  function specsHtml(p, s) {
    const rows = [];
    const description = (p.description || '');

    // Parse numeric facts from description (frames / TB / hours / mm / etc.)
    const numericPatterns = [
      { regex: /(\d[\d\s]*)\s*frames?/i, label: 'Frames' },
      { regex: /(\d[\d\s.,]*)\s*(TB|GB|MB)\s*de?\s*cache/i, label: 'Cache', combine: true },
      { regex: /(\d+)\s*heures?/i, label: 'Heures' },
      { regex: /(\d+)\s*minutes?/i, label: 'Minutes' },
    ];
    const extras = [];
    numericPatterns.forEach(({ regex, label, combine }) => {
      const m = description.match(regex);
      if (m) extras.push([label, combine ? `${m[1].trim()} ${m[2]}` : m[1].trim()]);
    });

    rows.push(['Catégorie', s.label]);
    if (p.client) rows.push(['Client', p.client]);
    if (p.role) rows.push(['Rôle', p.role]);
    if (p.year) rows.push(['Année', p.year]);
    if (p.tags?.length) rows.push(['Outils', p.tags.join(' · ')]);
    extras.forEach(r => rows.push(r));
    rows.push(['Statut', 'Livré']);
    rows.push(['Réf.', p.id.toUpperCase()]);

    return rows.map(([k, v]) => `
      <tr>
        <th>${esc(k)}</th>
        <td>${esc(v)}</td>
      </tr>
    `).join('');
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
    renderStack();
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

  /* ==========================================================================
     ============================ ARTISTIC LAYER =============================
     Hero flock · Wildlife companion · Category wash · Cinematic project detail
     ========================================================================== */

  /* ----------  HERO LIVING FLOCK CANVAS  ----------
     50 colored "creatures" that drift via flow noise,
     respect cursor as a soft attractor/repulsor.
     Inspired by the wildlife-photo + 3D theme. */
  function initHeroFlock() {
    const canvas = $('#heroFlock');
    if (!canvas || PREFERS_REDUCED) return;
    const hero = $('.hero');
    if (!hero) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));

    // Palette pulled from CSS theme
    const PALETTE = ['#FF4D1A', '#FF5633', '#2D2AF0', '#4F4DFF', '#D93A5A', '#F9C846', '#E63946'];

    const COUNT = innerWidth < 720 ? 28 : 56;
    const particles = [];
    let mx = innerWidth / 2, my = innerHeight / 2;
    let mActive = false;

    let lastW = 0, lastH = 0;
    function resize() {
      const r = hero.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Seed lazily on first valid measurement
      if (particles.length === 0 && w > 1 && h > 1) {
        for (let i = 0; i < COUNT; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size: 60 + Math.random() * 140,
            color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            phase: Math.random() * Math.PI * 2,
            speed: 0.0008 + Math.random() * 0.0014,
          });
        }
      } else {
        particles.forEach(p => {
          if (p.x > w) p.x = Math.random() * w;
          if (p.y > h) p.y = Math.random() * h;
        });
      }
    }

    resize();
    addEventListener('resize', resize);
    // Re-check when hero becomes visible (page change, fonts loaded, etc.)
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(resize);
      ro.observe(hero);
    }

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      mActive = true;
    });
    hero.addEventListener('pointerleave', () => { mActive = false; });

    // Simple flow-noise approximation using sin of coords
    function flow(x, y, t) {
      return [
        Math.sin((x + t * 30) * 0.0028) + Math.cos((y - t * 20) * 0.0019),
        Math.cos((x - t * 25) * 0.0021) + Math.sin((y + t * 35) * 0.0024),
      ];
    }

    let t0 = performance.now();
    function tick() {
      const r = hero.getBoundingClientRect();
      const w = r.width, h = r.height;
      if (w < 2 || h < 2) { requestAnimationFrame(tick); return; }
      if (w !== lastW || h !== lastH) resize();
      ctx.clearRect(0, 0, w, h);

      const now = performance.now();
      const t = (now - t0) * 0.001;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // flow steering
        const [fx, fy] = flow(p.x, p.y, t);
        p.vx += fx * 0.02;
        p.vy += fy * 0.02;

        // cursor attraction with falloff
        if (mActive) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const d2 = dx * dx + dy * dy;
          const d = Math.sqrt(d2) + 0.0001;
          const radius = 280;
          if (d < radius) {
            const force = (1 - d / radius) * 0.55;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
          }
        }

        // damping
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;

        // wrap
        if (p.x < -p.size) p.x = w + p.size;
        if (p.x > w + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = h + p.size;
        if (p.y > h + p.size) p.y = -p.size;

        // breathing scale
        const breath = 1 + Math.sin(now * p.speed + p.phase) * 0.18;
        const radius = p.size * breath;

        // soft radial gradient blob
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        grd.addColorStop(0, hexA(p.color, 0.55));
        grd.addColorStop(0.55, hexA(p.color, 0.15));
        grd.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(tick);
    }
    tick();
  }

  function hexA(hex, a) {
    const m = hex.replace('#', '').match(/.{2}/g);
    if (!m) return `rgba(255,77,26,${a})`;
    const [r, g, b] = m.map(x => parseInt(x, 16));
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ----------  WILDLIFE LINE-ART GLYPHS (nav mark + accents)  ----------
     Hand-drawn-ish SVG glyphs that cycle: feather → bird → fox → leaf.
     Replaces the generic ✦ sparkle and ties to the artist's wildlife focus. */
  const NAV_GLYPHS = [
    {
      name: 'feather',
      paths: [
        'M16 4 C20 8 22 14 21 21 C20 25 18 27 16 28 C14 27 12 25 11 21 C10 14 12 8 16 4 Z',
        'M16 6 L16 27',
        'M16 10 L13 11 M16 10 L19 11 M16 14 L12 15.5 M16 14 L20 15.5 M16 18 L11.5 19.8 M16 18 L20.5 19.8'
      ]
    },
    {
      name: 'bird',
      paths: [
        'M5 18 Q9 11 16 13 Q23 11 27 18 Q23 21 16 19 Q9 21 5 18 Z',
        'M16 13 L16 19',
        'M21 14 L24 9'
      ]
    },
    {
      name: 'fox',
      paths: [
        'M16 8 C20 8 24 11 25 16 C25.5 19 25 22 24 24 L20 26 L16 25 L12 26 L8 24 C7 22 6.5 19 7 16 C8 11 12 8 16 8 Z',
        'M9 12 L7 7 L13 10',
        'M23 12 L25 7 L19 10',
        'M14 17 L14.6 17 M17.4 17 L18 17',
        'M16 21 L16 22'
      ]
    },
    {
      name: 'leaf',
      paths: [
        'M16 4 C24 8 27 17 16 28 C5 17 8 8 16 4 Z',
        'M16 6 L16 28',
        'M16 12 L11.5 14 M16 12 L20.5 14 M16 18 L10.5 20.5 M16 18 L21.5 20.5'
      ]
    },
  ];

  function initNavGlyph() {
    const g = $('#navMarkG');
    const svg = $('#navMark');
    if (!g || !svg) return;
    let idx = 0;
    function render() {
      const glyph = NAV_GLYPHS[idx];
      g.innerHTML = glyph.paths.map(d => `<path d="${d}"/>`).join('');
      svg.dataset.glyph = glyph.name;
    }
    render();
    setInterval(() => {
      idx = (idx + 1) % NAV_GLYPHS.length;
      svg.classList.add('is-morphing');
      setTimeout(() => {
        render();
        svg.classList.remove('is-morphing');
      }, 280);
    }, 5500);
  }

  /* ----------  WILDLIFE COMPANION  ----------
     A soft creature that follows the cursor with delay,
     morphs between bird / fox / leaf / feather every few seconds. */
  const COMPANION_SHAPES = {
    fox: 'M40 22 C50 22 56 30 56 40 C56 50 50 58 40 58 C30 58 24 50 24 40 C24 30 30 22 40 22 Z M28 32 L24 26 L32 30 Z M52 32 L56 26 L48 30 Z',
    bird: 'M22 42 Q28 32 40 38 Q52 32 58 42 Q52 50 40 46 Q28 50 22 42 Z',
    leaf: 'M40 18 C56 24 60 44 40 62 C20 44 24 24 40 18 Z M40 18 L40 62',
    feather: 'M40 18 Q50 28 50 42 Q50 56 40 62 Q30 56 30 42 Q30 28 40 18 Z M40 22 L40 60',
  };
  const COMPANION_ORDER = ['fox', 'bird', 'leaf', 'feather'];

  function initCompanion() {
    const el = $('#companion');
    const shape = $('#companionShape');
    if (!el || !shape || matchMedia('(hover: none)').matches || PREFERS_REDUCED) return;

    let cx = -100, cy = -100;
    let tx = -100, ty = -100;
    let prevX = -100, prevY = -100;
    let shapeIdx = 0;

    addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      el.classList.add('is-active');
    });

    function loop() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;

      const dx = cx - prevX;
      const dy = cy - prevY;
      const angle = Math.atan2(dy, dx);
      const speed = Math.sqrt(dx * dx + dy * dy);
      const wobble = Math.sin(performance.now() * 0.005) * 8;
      const finalAngle = (angle * 180 / Math.PI) + 90 + wobble * Math.min(1, speed * 0.05);

      el.style.transform = `translate3d(${cx - 17}px, ${cy - 17}px, 0) rotate(${finalAngle}deg)`;
      prevX = cx;
      prevY = cy;
      requestAnimationFrame(loop);
    }
    loop();

    // Cycle shape every ~7 seconds
    function cycle() {
      shapeIdx = (shapeIdx + 1) % COMPANION_ORDER.length;
      const name = COMPANION_ORDER[shapeIdx];
      shape.setAttribute('d', COMPANION_SHAPES[name]);
      el.classList.remove('is-fox', 'is-bird', 'is-leaf', 'is-feather');
      el.classList.add('is-' + name);
    }
    shape.setAttribute('d', COMPANION_SHAPES.fox);
    el.classList.add('is-fox');
    setInterval(cycle, 7000);
  }

  /* ----------  CATEGORY COLOR WASH  ----------
     Flash an accent radial wipe when filter changes / category opens. */
  function triggerCatWash(accent, originX, originY) {
    const wash = $('#catWash');
    if (!wash || PREFERS_REDUCED) return;
    wash.style.background = accent || 'var(--coral)';
    if (originX != null && originY != null) {
      wash.style.top = originY + 'px';
      wash.style.left = originX + 'px';
    } else {
      wash.style.top = '50%';
      wash.style.left = '50%';
    }
    wash.classList.remove('is-washing');
    void wash.offsetWidth; // restart
    wash.classList.add('is-washing');
    setTimeout(() => wash.classList.remove('is-washing'), 1000);
  }

  /* ----------  PROJECT DETAIL — scrub bar + related projects  ---------- */
  function bindProjectScrub() {
    const scroll = $('#projectScroll');
    const fill = $('#projectScrubFill');
    const label = $('#projectScrubLabel');
    if (!scroll || !fill) return;
    scroll.addEventListener('scroll', () => {
      const max = scroll.scrollHeight - scroll.clientHeight;
      const pct = max > 0 ? (scroll.scrollTop / max) * 100 : 0;
      fill.style.width = pct + '%';
      // figure out current image index
      const imgs = $$('.pd__gallery img', scroll);
      if (!imgs.length) return;
      let visible = 0;
      const mid = scroll.scrollTop + scroll.clientHeight / 2;
      imgs.forEach((img, i) => {
        const top = img.offsetTop;
        const bot = top + img.offsetHeight;
        if (mid >= top && mid <= bot) visible = i;
      });
      if (label) label.textContent = `${String(visible + 1).padStart(2, '0')} / ${String(imgs.length).padStart(2, '0')}`;
    }, { passive: true });
  }

  /* ----------  INIT  ---------- */
  async function init() {
    try {
      CONTENT = await loadContent();
      try { lastMtime = (await (await fetch('/mtime?t=' + Date.now())).json()).mtime; } catch (_) {}
      rerenderAll();
      animateLoader();
      initLens();
      initHeroLiquidCursor();
      initHeroFlock();
      initNavGlyph();
      initCompanion();
      initTidalCanvas();
      bindProjectScrub();
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
