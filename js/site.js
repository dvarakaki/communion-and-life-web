// Casa Comunhão e Vida — interações do protótipo.
(() => {
  const root = document.documentElement;
  const CFG = window.CCV || {};
  const reduceMotion = root.dataset.motion === 'reduced'; // escolha do visitante (rodapé) ou preferência do sistema
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => innerWidth < 768;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
    sget: k => { try { return sessionStorage.getItem(k); } catch { return null; } },
    sset: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
  };

  // ================= Alternador de animações (+ aviso quando o sistema reduz) =================
  const motionBtn = $('#motion-toggle');
  motionBtn.setAttribute('aria-pressed', String(!reduceMotion));
  motionBtn.querySelector('.motion-toggle__label').textContent = reduceMotion ? 'Animações reduzidas' : 'Animações ligadas';
  motionBtn.addEventListener('click', () => { store.set('ccv-motion', reduceMotion ? 'full' : 'reduced'); location.reload(); });
  if (root.dataset.os === 'reduced' && !store.get('ccv-motion') && !store.get('ccv-motion-note')) {
    const note = document.createElement('div');
    note.className = 'motion-note'; note.setAttribute('role', 'status');
    note.innerHTML = '<span>Seu dispositivo pede menos movimento, então as animações foram reduzidas.</span><button type="button">Ativar</button><button type="button" class="motion-note__x" aria-label="Dispensar aviso">✕</button>';
    const [on, x] = $$('button', note);
    on.addEventListener('click', () => { store.set('ccv-motion', 'full'); location.reload(); });
    x.addEventListener('click', () => { store.set('ccv-motion-note', '1'); note.remove(); });
    document.body.appendChild(note);
  }

  // ================= Programação (horário de SP, UTC-3; dow 0 = domingo) =================
  const SERVICES = [
    { dow: 2, h: 9,  m: 0, dur: 90,  name: 'Reunião de Oração' },
    { dow: 3, h: 20, m: 0, dur: 120, name: 'Culto Profético' },
    { dow: 0, h: 9,  m: 0, dur: 60,  name: 'Discipulado' },
    { dow: 0, h: 10, m: 0, dur: 120, name: 'Culto de Celebração' },
  ];
  const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const SP_OFFSET = -3 * 3600e3;
  const spNow = () => new Date(Date.now() + SP_OFFSET);

  function occurrences(count) {
    const now = spNow();
    const out = [];
    for (let day = 0; out.length < count && day < 21; day++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day));
      SERVICES.filter(s => s.dow === d.getUTCDay()).sort((a, b) => a.h - b.h).forEach(s => {
        const start = new Date(d.getTime() + (s.h * 60 + s.m) * 60e3);
        const end = new Date(start.getTime() + s.dur * 60e3);
        if (end > now) out.push({ ...s, start, end, live: start <= now });
      });
    }
    return out.slice(0, count);
  }
  const fmtHour = s => `${s.h}h${s.m ? String(s.m).padStart(2, '0') : ''}`;

  // ---------- Ao vivo no YouTube ----------
  let liveState = null; // { videoId, title, preview }
  const liveSec = $('#aovivo'), navLive = $('#nav-live'), playerBox = $('#live-player'), poster = $('#live-poster');
  const embedSrc = () => liveState.videoId
    ? `https://www.youtube-nocookie.com/embed/${liveState.videoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed/live_stream?channel=${CFG.youtubeChannelId}&autoplay=1&rel=0&playsinline=1`;
  poster.addEventListener('click', () => {
    if (!liveState) return;
    const f = document.createElement('iframe');
    f.src = embedSrc(); f.title = 'Transmissão ao vivo — Casa Comunhão e Vida';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    playerBox.replaceChildren(f);
  });
  function setLive(info) {
    const changed = (liveState && liveState.videoId) !== (info && info.videoId) || !!liveState !== !!info;
    liveState = info;
    if (info) {
      liveSec.hidden = false; navLive.hidden = false;
      $('#live-title').textContent = info.title || 'Estamos ao vivo!';
      $('#live-yt').href = info.videoId ? `https://www.youtube.com/watch?v=${info.videoId}` : `https://www.youtube.com/channel/${CFG.youtubeChannelId}/live`;
      const img = $('#live-thumb');
      if (info.videoId) {
        img.onerror = () => { img.onerror = null; img.src = `https://i.ytimg.com/vi/${info.videoId}/hqdefault.jpg`; };
        img.src = `https://i.ytimg.com/vi/${info.videoId}/maxresdefault_live.jpg`;
      } else img.removeAttribute('src');
      if (changed) playerBox.replaceChildren(poster);
    } else {
      liveSec.hidden = true; navLive.hidden = true;
      playerBox.replaceChildren(poster);
    }
    tick();
  }
  $('#live-share').addEventListener('click', async () => {
    const url = location.origin + location.pathname + '#aovivo';
    const text = 'Estamos ao vivo na Casa Comunhão e Vida! Assista com a gente:';
    if (navigator.share) { try { await navigator.share({ title: 'Casa Comunhão e Vida — ao vivo', text, url }); return; } catch { return; } }
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank', 'noopener');
  });
  // ---------- Próximo encontro + contagem regressiva ----------
  const badge = $('#next-badge'), dayEl = $('#next-day'), titleEl = $('#next-title'), nextLink = $('#next-link'), nextCard = $('.next-card');
  const units = Object.fromEntries($$('#countdown [data-u]').map(el => [el.dataset.u, el]));
  const setUnit = (el, v) => {
    if (el.textContent === v) return;
    el.textContent = v;
    if (!reduceMotion) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  };
  function tick() {
    if (liveState) {
      badge.textContent = 'Ao vivo agora'; badge.classList.add('is-live');
      titleEl.textContent = liveState.title || 'Transmissão ao vivo';
      dayEl.textContent = 'YouTube · agora';
      nextCard.classList.add('is-streaming');
      nextLink.href = '#aovivo'; nextLink.firstChild.textContent = 'Assistir agora ';
      return;
    }
    nextCard.classList.remove('is-streaming');
    nextLink.href = '#visite'; nextLink.firstChild.textContent = 'Como chegar ';
    const [next] = occurrences(1);
    if (!next) return;
    titleEl.textContent = next.name;
    dayEl.textContent = `${DAYS[next.dow]} · ${fmtHour(next)}`;
    if (next.live) {
      badge.textContent = 'Acontecendo agora'; badge.classList.add('is-live');
      ['h', 'm', 's'].forEach(u => setUnit(units[u], '00')); setUnit(units.d, '0');
      return;
    }
    badge.textContent = 'Próximo encontro'; badge.classList.remove('is-live');
    let diff = Math.max(0, Math.floor((next.start - spNow()) / 1000));
    const d = Math.floor(diff / 86400); diff -= d * 86400;
    const h = Math.floor(diff / 3600); diff -= h * 3600;
    const m = Math.floor(diff / 60), s = diff - m * 60;
    setUnit(units.d, String(d));
    setUnit(units.h, String(h).padStart(2, '0'));
    setUnit(units.m, String(m).padStart(2, '0'));
    setUnit(units.s, String(s).padStart(2, '0'));
  }
  tick();
  setInterval(tick, 1000);

  const preview = new URLSearchParams(location.search).get('live');
  if (preview) setLive({ preview: true, videoId: preview === '1' ? null : preview, title: 'Culto ao vivo' });
  else if (CFG.liveEndpoint) {
    const check = async () => {
      try {
        const r = await fetch(CFG.liveEndpoint, { cache: 'no-store' });
        const j = await r.json();
        setLive(j.live ? { videoId: j.videoId, title: j.title } : null);
      } catch { /* mantém o estado anterior */ }
    };
    check();
    setInterval(check, 90000);
  }

  // ---------- Semana + hoje ----------
  const todayDow = spNow().getUTCDay();
  const week = $('#week');
  [1, 2, 3, 4, 5, 6, 0].forEach(dow => {
    const list = SERVICES.filter(s => s.dow === dow);
    const el = document.createElement('div');
    el.className = 'week__day' + (list.length ? ' has-service' : '') + (dow === todayDow ? ' is-today' : '');
    el.setAttribute('role', 'listitem');
    el.innerHTML = `${DAYS_SHORT[dow]}<small>${list.length ? list.map(fmtHour).join(' · ') : '—'}</small>`;
    el.setAttribute('aria-label', `${DAYS[dow]}: ${list.length ? list.map(s => `${s.name} às ${fmtHour(s)}`).join(', ') : 'sem encontros'}`);
    week.appendChild(el);
  });
  $$('.service[data-dow]').forEach(card => { if (+card.dataset.dow === todayDow) card.classList.add('is-today'); });

  // ---------- Agenda ----------
  const agenda = $('#agenda-list');
  const rel = start => {
    const n = spNow();
    const days = Math.round((Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 86400e3);
    return days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`;
  };
  occurrences(5).forEach((o, i) => {
    const li = document.createElement('li');
    li.className = 'agenda__item';
    li.style.setProperty('--i', i);
    li.innerHTML = `
      <div class="agenda__date"><strong>${o.start.getUTCDate()}</strong><span>${MONTHS[o.start.getUTCMonth()]}</span></div>
      <div><p class="agenda__name">${o.name}</p><p class="agenda__meta">${DAYS[o.dow]} · ${fmtHour(o)} · Freguesia do Ó</p></div>
      <span class="agenda__rel">${o.live ? 'Agora' : rel(o.start)}</span>`;
    agenda.appendChild(li);
  });

  // ================= Abertura (1x por sessão) =================
  const heroTitle = $('[data-split="hero"]');
  const loader = $('#loader');
  const ready = () => { root.classList.add('is-ready'); heroTitle.classList.add('is-in'); };
  if (reduceMotion || store.sget('ccv-loaded') || !loader) {
    if (loader) loader.hidden = true;
    setTimeout(ready, 60);
  } else {
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      loader.classList.add('is-done');
      document.body.style.overflow = '';
      store.sset('ccv-loaded', '1');
      ready();
      setTimeout(() => (loader.hidden = true), 1100);
    }, 1900);
  }

  // ================= Texto: títulos palavra a palavra =================
  function splitWords(el) {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    $$('.w', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
  }
  $$('[data-split]').forEach(splitWords);
  heroTitle.style.setProperty('--d0', '150ms');

  // Parágrafo que "acende" conforme a rolagem
  const scrub = $('[data-scrub]');
  let scrubWords = [];
  if (scrub) {
    scrub.innerHTML = scrub.textContent.trim().split(/\s+/).map(w => `<span class="sw">${w}</span>`).join(' ');
    scrubWords = $$('.sw', scrub);
  }

  // ================= Reveal on scroll =================
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 6) * 80}ms`);
    io.observe(el);
  });
  $$('[data-split]:not([data-split="hero"]), .reveal-img, .agenda__list').forEach(el => io.observe(el));
  $$('.sermon').forEach((el, i) => { el.style.setProperty('--d', `${Math.min(i, 5) * 80}ms`); io.observe(el); });

  // Contador "25"
  const counter = $('[data-count]');
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    const target = +counter.dataset.count;
    if (reduceMotion) { counter.textContent = target; return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / 1600);
      counter.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.6 }).observe(counter);

  // ================= Ticker de palavras (carrossel automático do hero) =================
  const tickerEl = $('#ticker');
  [...tickerEl.children].forEach(c => tickerEl.appendChild(c.cloneNode(true)));
  const tickerAnim = tickerEl.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }],
    { duration: 38000, iterations: Infinity, easing: 'linear' }
  );
  if (reduceMotion) tickerAnim.playbackRate = 0.5;
  const tickerBox = tickerEl.parentElement;
  tickerBox.addEventListener('pointerenter', () => tickerAnim.pause());
  tickerBox.addEventListener('pointerleave', () => tickerAnim.play());

  // ================= Galeria: fileiras em movimento =================
  const gallery = $('#gallery');
  $$('.gallery__row').forEach(row => {
    [...row.children].forEach(c => {
      const clone = c.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true'); clone.tabIndex = -1; clone.dataset.clone = '1';
      row.appendChild(clone);
    });
  });
  const rows = $$('.gallery__row').map(el => ({ el, dir: +el.dataset.dir || -1, speed: 0.35, x: 0, visible: true, hover: false }));
  rows.forEach(m => {
    if (m.dir > 0) m.x = -m.el.scrollWidth / 2;
    new IntersectionObserver(([e]) => { m.visible = e.isIntersecting; if (m.visible) kick(); }).observe(m.el);
    m.el.addEventListener('pointerenter', () => (m.hover = true));
    m.el.addEventListener('pointerleave', () => (m.hover = false));
  });
  if (reduceMotion) gallery.classList.add('is-static');

  // ================= Loop de rolagem (rAF) =================
  const nav = $('#nav'), bar = $('#progress-bar'), toTop = $('#to-top'), ring = $('#to-top-ring'), mbar = $('#mbar');
  const hero = $('.hero'), heroCopy = $('[data-hero-parallax]'), heroStack = $('[data-hero-stack]');
  const timeline = $('[data-timeline]');
  const parallaxImgs = $$('[data-parallax]');
  const bands = $$('.statement__row');
  const RING = 138.2;
  let lastY = scrollY, lastT = performance.now(), velocity = 0, idleTimer, drawerOpen = false, rafId = null;

  function onFrame(now) {
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const p = max > 0 ? clamp(y / max, 0, 1) : 0;
    const dt = Math.max(1, now - lastT);
    velocity += ((y - lastY) / dt - velocity) * 0.15;

    bar.style.transform = `scaleX(${p})`;
    ring.style.strokeDashoffset = RING * (1 - p);

    nav.classList.toggle('is-scrolled', y > 24);
    if (!drawerOpen && Math.abs(y - lastY) > 2) nav.classList.toggle('is-hidden', y > lastY && y > vh * 0.8);
    toTop.classList.toggle('is-visible', y > vh * 0.9);
    mbar.classList.toggle('is-visible', y > vh * 0.5 && !drawerOpen);

    if (!reduceMotion) {
      if (y < vh * 1.2) {
        const k = y / vh;
        heroCopy.style.transform = `translate3d(0, ${y * 0.22}px, 0)`;
        heroCopy.style.opacity = String(clamp(1 - k * 1.1, 0, 1));
        if (heroStack) heroStack.style.transform = `translate3d(0, ${y * -0.12}px, 0) rotate(${k * -4}deg)`;
      }
      parallaxImgs.forEach(img => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const c = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.transform = `translate3d(0, ${c * -100 * (+img.dataset.parallax || 0.1)}%, 0)`;
      });
      // ticker acelera junto com a rolagem
      tickerAnim.playbackRate = 1 + clamp(Math.abs(velocity) * 5, 0, 7);
      // texto gigante percorre a faixa conforme a seção cruza a tela
      bands.forEach(row => {
        const r = row.parentElement.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) return;
        const prog = clamp((vh - r.top) / (vh + r.height), 0, 1);
        const range = Math.max(0, row.scrollWidth - innerWidth);
        const x = +row.dataset.shift < 0 ? -prog * range : -(1 - prog) * range;
        row.style.transform = `translate3d(${x}px, 0, 0)`;
      });
      // galeria
      const boost = clamp(Math.abs(velocity) * 6, 0, 14);
      rows.forEach(m => {
        if (!m.visible) return;
        const half = m.el.scrollWidth / 2;
        const sp = (m.hover ? m.speed * 0.15 : m.speed) + boost;
        m.x += m.dir * sp * (dt / 16.7);
        if (m.x <= -half) m.x += half;
        if (m.x > 0) m.x -= half;
        m.el.style.transform = `translate3d(${m.x}px, 0, 0) skewX(${clamp(-velocity * 3, -6, 6)}deg)`;
      });
    }

    if (scrubWords.length) {
      const r = scrub.getBoundingClientRect();
      const prog = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      const n = Math.round(prog * scrubWords.length);
      scrubWords.forEach((w, i) => w.classList.toggle('on', i < n || reduceMotion));
    }
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const prog = clamp((vh * 0.7 - r.top) / r.height, 0, 1);
      timeline.style.setProperty('--tl', prog);
      [...timeline.children].forEach(li => li.classList.toggle('on', li.offsetTop / r.height <= prog - 0.02 || prog >= 1));
    }

    const moving = y !== lastY || Math.abs(velocity) > 0.002 || (!reduceMotion && rows.some(m => m.visible));
    lastY = y; lastT = now;
    if (moving) rafId = requestAnimationFrame(onFrame);
    else { rafId = null; tickerAnim.playbackRate = reduceMotion ? 0.5 : 1; }
  }
  function kick() { if (!rafId) { lastT = performance.now(); rafId = requestAnimationFrame(onFrame); } }
  kick();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);

  // ================= Scroll suave com easing próprio =================
  let scrollAnim = null;
  function smoothTo(targetY, dur) {
    cancelAnimationFrame(scrollAnim);
    const startY = scrollY, dist = targetY - startY;
    if (reduceMotion || Math.abs(dist) < 2) { scrollTo(0, targetY); return; }
    const d = dur || clamp(Math.abs(dist) / 2.2, 600, 1500);
    const t0 = performance.now();
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const stop = () => cancelAnimationFrame(scrollAnim);
    addEventListener('wheel', stop, { passive: true, once: true });
    addEventListener('touchstart', stop, { passive: true, once: true });
    const step = now => {
      const k = clamp((now - t0) / d, 0, 1);
      scrollTo(0, startY + dist * ease(k));
      if (k < 1) scrollAnim = requestAnimationFrame(step);
    };
    scrollAnim = requestAnimationFrame(step);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hash.length < 2) return;
    const target = document.getElementById(a.hash.slice(1));
    if (!target) return;
    e.preventDefault();
    smoothTo(target.id === 'inicio' ? 0 : target.getBoundingClientRect().top + scrollY);
    history.pushState(null, '', a.hash);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // "Parou de rolar" → botão topo se expande com rótulo
  addEventListener('scroll', () => {
    toTop.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (scrollY > innerHeight * 0.9) toTop.classList.add('is-idle'); }, 1200);
  }, { passive: true });
  toTop.addEventListener('click', () => { smoothTo(0, 1300); $('.brand').focus({ preventScroll: true }); });

  // ================= Menu: seção ativa + pílula deslizante =================
  const linksBox = $('.nav__links'), pill = $('.nav__pill');
  const links = $$('.nav__links a');
  let hovering = false;
  const activeLink = () => links.find(a => a.classList.contains('is-active'));
  function pillTo(a) {
    if (!a) { pill.style.setProperty('--po', 0); return; }
    if (!pill.dataset.init) { pill.style.transition = 'none'; pill.dataset.init = '1'; }
    pill.style.setProperty('--px', a.offsetLeft + 'px');
    pill.style.setProperty('--pw', a.offsetWidth + 'px');
    pill.style.setProperty('--po', 1);
    if (pill.style.transition === 'none') { void pill.offsetWidth; pill.style.transition = ''; }
  }
  links.forEach(a => {
    a.addEventListener('pointerenter', () => { hovering = true; pillTo(a); });
    a.addEventListener('focus', () => pillTo(a));
  });
  linksBox.addEventListener('pointerleave', () => { hovering = false; pillTo(activeLink()); });
  linksBox.addEventListener('focusout', () => pillTo(activeLink()));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-active', a.hash === '#' + e.target.id));
      if (!hovering) pillTo(activeLink());
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  // ================= Drawer móvel =================
  const drawer = $('#drawer'), toggle = $('.nav__toggle');
  $$('nav a', drawer).forEach((a, i) => a.style.setProperty('--i', i));
  function openDrawer() {
    drawerOpen = true;
    drawer.hidden = false; drawer.classList.remove('is-closing');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    nav.classList.remove('is-hidden');
    $('.drawer__close', drawer).focus();
  }
  function closeDrawer(focusToggle = true) {
    if (!drawerOpen) return;
    drawerOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (reduceMotion) drawer.hidden = true;
    else { drawer.classList.add('is-closing'); setTimeout(() => (drawer.hidden = true), 340); }
    if (focusToggle) toggle.focus();
  }
  toggle.addEventListener('click', openDrawer);
  drawer.addEventListener('click', e => {
    if (e.target.closest('.drawer__close')) closeDrawer();
    else if (e.target.closest('a')) closeDrawer(false);
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawerOpen) closeDrawer();
    if (e.key === 'Tab' && drawerOpen) {
      const f = $$('a, button', drawer);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });

  // ================= Carrossel de cultos (mobile) com dots =================
  const services = $('#services'), dotsBox = $('[data-dots-for="services"]');
  const cards = $$('.service', services);
  cards.forEach(c => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `Ir para ${c.querySelector('h3').textContent}`);
    b.addEventListener('click', () => services.scrollTo({ left: c.offsetLeft - services.offsetLeft - parseFloat(getComputedStyle(services).paddingLeft), behavior: 'smooth' }));
    dotsBox.appendChild(b);
  });
  const dotBtns = [...dotsBox.children];
  const syncDots = () => {
    const idx = Math.round(services.scrollLeft / (cards[0].offsetWidth + 12));
    dotBtns.forEach((b, i) => b.classList.toggle('on', i === clamp(idx, 0, cards.length - 1)));
  };
  services.addEventListener('scroll', syncDots, { passive: true });
  syncDots();
  const todayCard = cards.find(c => c.classList.contains('is-today'));
  if (todayCard && isMobile()) requestAnimationFrame(() => (services.scrollLeft = todayCard.offsetLeft - services.offsetLeft - 16));

  // ================= Rail de mensagens =================
  const rail = $('#rail'), railBar = $('#rail-progress');
  const [prevBtn, nextBtn] = $$('.rail-btn');
  const syncRail = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    const p = max > 0 ? rail.scrollLeft / max : 1;
    railBar.style.transform = `scaleX(${0.1 + p * 0.9})`;
    prevBtn.disabled = rail.scrollLeft < 8;
    nextBtn.disabled = rail.scrollLeft > max - 8;
  };
  rail.addEventListener('scroll', syncRail, { passive: true });
  syncRail();
  [prevBtn, nextBtn].forEach(btn => btn.addEventListener('click', () => {
    rail.scrollBy({ left: +btn.dataset.dir * rail.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
  }));
  if (finePointer) {
    let down = false, moved = false, startX = 0, startLeft = 0;
    rail.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { moved = true; rail.classList.add('is-dragging'); }
      rail.scrollLeft = startLeft - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      rail.classList.remove('is-dragging');
      if (moved) rail.addEventListener('click', e => e.preventDefault(), { capture: true, once: true });
    });
  }

  // ================= Inclinação 3D + brilho nos cards (mouse) =================
  if (finePointer && !reduceMotion) {
    $$('.sermon, .tile, .service').forEach(card => {
      const amp = card.classList.contains('sermon') ? 10 : 6;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${(px - 0.5) * amp}deg`);
        card.style.setProperty('--rx', `${(0.5 - py) * amp}deg`);
        card.style.setProperty('--gx', `${px * 100}%`);
        card.style.setProperty('--gy', `${py * 100}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      btn.addEventListener('pointerleave', () => (btn.style.transform = ''));
    });
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
      hero.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  // ================= Ondas nos botões =================
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn');
    if (!b || reduceMotion) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.left = `${e.clientX - r.left}px`; s.style.top = `${e.clientY - r.top}px`;
    s.style.setProperty('--s', Math.ceil(Math.max(r.width, r.height) / 4));
    b.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  });

  // ================= Lightbox da galeria =================
  const lb = $('#lightbox'), lbImg = $('#lightbox-img'), lbCap = $('#lightbox-cap');
  const shots = $$('.shot:not([data-clone])');
  let lbIndex = 0, lastShot = null;
  function showShot(i) {
    lbIndex = (i + shots.length) % shots.length;
    const s = shots[lbIndex], img = s.querySelector('img');
    lbImg.src = s.dataset.full; lbImg.alt = img.alt;
    lbCap.textContent = `${img.alt} · ${lbIndex + 1}/${shots.length}`;
    lbImg.classList.remove('swap'); void lbImg.offsetWidth; lbImg.classList.add('swap');
  }
  gallery.addEventListener('click', e => {
    const s = e.target.closest('.shot');
    if (!s) return;
    const real = s.dataset.clone ? shots.find(o => o.dataset.full === s.dataset.full) : s;
    lastShot = real;
    showShot(shots.indexOf(real));
    lb.showModal();
  });
  lb.addEventListener('click', e => {
    const b = e.target.closest('[data-lb]');
    if (b) { b.dataset.lb === 'close' ? lb.close() : showShot(lbIndex + +b.dataset.lb); }
    else if (e.target === lb) lb.close();
  });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') showShot(lbIndex + 1);
    if (e.key === 'ArrowLeft') showShot(lbIndex - 1);
  });
  lb.addEventListener('close', () => lastShot && lastShot.focus({ preventScroll: true }));
  let sx = null;
  lbImg.addEventListener('pointerdown', e => (sx = e.clientX));
  lbImg.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 40) showShot(lbIndex + (dx < 0 ? 1 : -1));
  });

  // ================= Facebook (carrega só quando chega perto) =================
  const fbFrame = $('#fb-frame');
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    const w = clamp(Math.round(fbFrame.clientWidth), 180, 500);
    const h = Math.max(400, Math.round(fbFrame.clientHeight));
    const f = document.createElement('iframe');
    f.src = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(CFG.facebookPage || 'https://www.facebook.com/cristocentrofreguesia/')}&tabs=timeline&width=${w}&height=${h}&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false&lang=pt_BR`;
    f.title = 'Página da igreja no Facebook';
    f.loading = 'lazy'; f.allow = 'encrypted-media';
    f.style.cssText = `left:50%;translate:-50% 0;width:${w}px`;
    f.addEventListener('load', () => fbFrame.classList.add('is-loaded'));
    fbFrame.appendChild(f);
  }, { rootMargin: '500px' }).observe(fbFrame);

  // ================= Copiar PIX =================
  const copyBtn = $('#copy-pix');
  copyBtn.addEventListener('click', async () => {
    const label = copyBtn.querySelector('span');
    const key = $('#pix-key');
    try { await navigator.clipboard.writeText(key.dataset.copy || key.textContent.trim()); label.textContent = 'Chave copiada!'; }
    catch { label.textContent = 'Selecione e copie a chave'; }
    setTimeout(() => (label.textContent = 'Copiar chave'), 2500);
  });

  // ================= Formulário → WhatsApp =================
  const form = $('#visit-form'), nameField = $('#f-name');
  const setError = msg => {
    const field = nameField.closest('.field');
    field.classList.toggle('has-error', !!msg);
    field.querySelector('.field__error').textContent = msg;
    nameField.setAttribute('aria-invalid', String(!!msg));
  };
  nameField.addEventListener('blur', () => { if (nameField.value.trim()) setError(''); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = nameField.value.trim();
    if (!name) { setError(''); requestAnimationFrame(() => setError('Conta pra gente o seu nome, por favor.')); nameField.focus(); return; }
    setError('');
    const data = new FormData(form);
    const withWho = data.getAll('with');
    let text = `Olá! Meu nome é ${name} e gostaria de visitar a Casa Comunhão e Vida no ${data.get('service')}.`;
    if (withWho.length) text += ` Vou com: ${withWho.join(', ')}.`;
    if (data.get('msg').trim()) text += `\n\n${data.get('msg').trim()}`;
    window.open(`https://wa.me/5511965514736?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  // ================= Brasas subindo no hero =================
  const canvas = $('.hero__embers');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, embers = [], running = true;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = () => ({
      x: w * (0.3 + Math.random() * 0.7), y: h + 10,
      r: 0.6 + Math.random() * 2.2, vy: 0.35 + Math.random() * 0.9,
      sway: Math.random() * Math.PI * 2, life: 0, max: 260 + Math.random() * 320,
    });
    resize();
    addEventListener('resize', resize);
    for (let i = 0, n = isMobile() ? 26 : 60; i < n; i++) { const p = spawn(); p.y = Math.random() * h; p.life = Math.random() * p.max; embers.push(p); }
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) requestAnimationFrame(draw); }).observe(canvas);
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const lift = Math.max(0, velocity) * 2;
      embers.forEach((p, i) => {
        p.life++; p.y -= p.vy + lift; p.sway += 0.02; p.x += Math.sin(p.sway) * 0.35;
        const a = Math.sin(Math.PI * (p.life / p.max));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(253,186,116,${a})`);
        g.addColorStop(0.4, `rgba(242,107,29,${a * 0.5})`);
        g.addColorStop(1, 'rgba(242,107,29,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
        if (p.life > p.max || p.y < -20) embers[i] = spawn();
      });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  $('#year').textContent = spNow().getUTCFullYear();
})();
