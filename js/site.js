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

  // ================= Cookies e consentimento (LGPD) =================
  // Só cookies essenciais por padrão. YouTube, Facebook e Google Maps carregam apenas com permissão.
  const CONSENT_VERSION = 1;
  const OPTIONAL = ['video', 'social', 'maps'];
  function readConsent() {
    const m = document.cookie.match(/(?:^|;\s*)ccv_consent=([^;]*)/);
    if (!m) return null;
    try { const c = JSON.parse(decodeURIComponent(m[1])); return c.v === CONSENT_VERSION ? c : null; } catch { return null; }
  }
  function writeConsent(choice) {
    const c = { v: CONSENT_VERSION, at: new Date().toISOString() };
    OPTIONAL.forEach(k => (c[k] = !!choice[k]));
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `ccv_consent=${encodeURIComponent(JSON.stringify(c))}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${secure}`;
    return c;
  }
  let consent = readConsent();
  const allowed = k => !!(consent && consent[k]);
  const consentHooks = [];
  const onConsent = fn => consentHooks.push(fn);

  const cookieBox = $('#cookies'), prefsForm = $('#cookies-prefs'), customBtn = $('[data-consent="custom"]', cookieBox);
  function showPrefs(open) {
    prefsForm.hidden = !open;
    customBtn.setAttribute('aria-expanded', String(open));
    OPTIONAL.forEach(k => (prefsForm.elements[k].checked = allowed(k)));
  }
  function openCookies(withPrefs = false) {
    cookieBox.hidden = false;
    showPrefs(withPrefs);
    requestAnimationFrame(() => cookieBox.classList.add('is-open'));
    $('button', cookieBox).focus({ preventScroll: true });
  }
  function closeCookies() {
    cookieBox.classList.remove('is-open');
    setTimeout(() => (cookieBox.hidden = true), 300);
  }
  function setConsent(choice) {
    const before = consent;
    consent = writeConsent(choice);
    closeCookies();
    // Se alguém retirou uma permissão, recarrega para descarregar o conteúdo de terceiros já aberto.
    if (before && OPTIONAL.some(k => before[k] && !consent[k])) { location.reload(); return; }
    consentHooks.forEach(fn => fn());
  }
  cookieBox.addEventListener('click', e => {
    const b = e.target.closest('[data-consent]');
    if (!b) return;
    const kind = b.dataset.consent;
    if (kind === 'all') setConsent({ video: true, social: true, maps: true });
    else if (kind === 'reject') setConsent({});
    else showPrefs(prefsForm.hidden);
  });
  prefsForm.addEventListener('submit', e => {
    e.preventDefault();
    const choice = {};
    OPTIONAL.forEach(k => (choice[k] = prefsForm.elements[k].checked));
    setConsent(choice);
  });
  $$('[data-open-cookies]').forEach(b => b.addEventListener('click', () => openCookies(true)));
  if (!consent) setTimeout(() => openCookies(false), 1200);
  if (location.hash === '#cookies') openCookies(true);

  // Aviso no lugar de um conteúdo de terceiros ainda não permitido
  const SERVICE_NAME = { video: 'YouTube', social: 'Facebook', maps: 'Google Maps' };
  function consentGate(box, kind, opts) {
    const el = document.createElement('div');
    el.className = 'embed-consent' + (opts.dark ? ' embed-consent--dark' : '');
    el.innerHTML = `<p class="embed-consent__title">${opts.title}</p>
      <p>Este conteúdo vem do ${SERVICE_NAME[kind]}, que pode gravar cookies no seu navegador.</p>
      <div class="embed-consent__actions">
        <button type="button" class="btn btn--primary">Permitir e carregar</button>
        ${opts.href ? `<a class="btn btn--outline" href="${opts.href}" target="_blank" rel="noopener">${opts.hrefLabel}</a>` : ''}
      </div>`;
    el.querySelector('button').addEventListener('click', () => {
      setConsent({ ...(consent || {}), [kind]: true });
      el.remove();
      opts.load();
    });
    box.appendChild(el);
    return el;
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
  const playLive = () => {
    const f = document.createElement('iframe');
    f.src = embedSrc(); f.title = 'Transmissão ao vivo — Casa Comunhão e Vida';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    playerBox.replaceChildren(f);
  };
  poster.addEventListener('click', () => {
    if (!liveState) return;
    if (allowed('video')) return playLive();
    playerBox.replaceChildren();
    consentGate(playerBox, 'video', { dark: true, title: 'Assistir à transmissão aqui', href: $('#live-yt').href, hrefLabel: 'Abrir no YouTube', load: playLive });
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
  const whenEl = $('#next-when'), dowEl = $('#next-dow'), hourEl = $('#next-hour');
  const goMain = $('#next-go-main'), goSub = $('#next-go-sub'), goIcon = $('#next-go-icon');
  const units = Object.fromEntries($$('#countdown [data-u]').map(el => [el.dataset.u, el]));
  const setUnit = (el, v) => {
    if (el.textContent === v) return;
    el.textContent = v;
    if (!reduceMotion) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  };
  const setGo = (href, icon, main, sub) => {
    nextLink.href = href; goIcon.setAttribute('href', icon);
    goMain.textContent = main; goSub.textContent = sub;
  };
  const daysUntil = start => {
    const n = spNow();
    return Math.round((Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 86400e3);
  };
  function tick() {
    if (liveState) {
      badge.textContent = 'Ao vivo agora'; badge.classList.add('is-live');
      titleEl.textContent = liveState.title || 'Transmissão ao vivo';
      dayEl.textContent = 'Transmissão no YouTube';
      whenEl.textContent = 'Agora';
      nextCard.classList.add('is-streaming');
      setGo('#aovivo', '#i-play', 'Assistir agora', 'Ao vivo aqui no site');
      return;
    }
    nextCard.classList.remove('is-streaming');
    setGo('#visite', '#i-pin', 'Av. Elísio Teixeira Leite, 73', 'Freguesia do Ó · ver como chegar');
    const [next] = occurrences(1);
    if (!next) return;
    const endMin = next.h * 60 + next.m + next.dur;
    titleEl.textContent = next.name;
    dowEl.textContent = DAYS_SHORT[next.dow];
    hourEl.textContent = fmtHour(next);
    dayEl.textContent = `${DAYS[next.dow]}, das ${fmtHour(next)} às ${fmtHour({ h: Math.floor(endMin / 60) % 24, m: endMin % 60 })}`;
    if (next.live) {
      badge.textContent = 'Acontecendo agora'; badge.classList.add('is-live');
      whenEl.textContent = 'Agora';
      ['h', 'm', 's'].forEach(u => setUnit(units[u], '00')); setUnit(units.d, '0');
      return;
    }
    badge.textContent = 'Próximo encontro'; badge.classList.remove('is-live');
    const dd = daysUntil(next.start);
    whenEl.textContent = dd === 0 ? 'Hoje' : dd === 1 ? 'Amanhã' : `${next.start.getUTCDate()} ${MONTHS[next.start.getUTCMonth()]}`;
    let diff = Math.max(0, Math.floor((next.start - spNow()) / 1000));
    const d = Math.floor(diff / 86400); diff -= d * 86400;
    const h = Math.floor(diff / 3600); diff -= h * 3600;
    const m = Math.floor(diff / 60), sec = diff - m * 60;
    setUnit(units.d, String(d));
    setUnit(units.h, String(h).padStart(2, '0'));
    setUnit(units.m, String(m).padStart(2, '0'));
    setUnit(units.s, String(sec).padStart(2, '0'));
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

  // ---------- Programação: marca "agora", "hoje" e o próximo encontro ----------
  function tagSchedule() {
    const [next] = occurrences(1);
    const now = spNow();
    $$('.timetable .slot').forEach(slot => {
      const dow = +slot.dataset.dow, h = +slot.dataset.h;
      const tag = $('.slot__tag', slot);
      const isNext = next && next.dow === dow && next.h === h;
      slot.classList.toggle('is-next', !!isNext);
      slot.classList.toggle('is-live', !!(isNext && next.live));
      slot.classList.toggle('is-today', now.getUTCDay() === dow);
      if (isNext && next.live) tag.textContent = 'Acontecendo agora';
      else if (isNext) tag.textContent = `Próximo · ${rel(next.start).toLowerCase()}`;
      else if (now.getUTCDay() === dow) tag.textContent = 'Hoje';
      else tag.textContent = '';
    });
  }

  // ---------- Agenda ----------
  const agenda = $('#agenda-list');
  const rel = start => {
    const n = spNow();
    const days = Math.round((Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 86400e3);
    return days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`;
  };
  tagSchedule();
  setInterval(tagSchedule, 60000);
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

  // ================= Faixa "Comunhão e Vida": letreiro contínuo =================
  // Repete o conteúdo até cobrir a tela duas vezes e entra no mesmo loop da galeria
  // (anda sozinho e acelera com a rolagem).
  $$('.statement__row').forEach(row => {
    const unit = row.innerHTML + '<i></i>';
    row.innerHTML = unit;
    const reps = Math.ceil(Math.max(innerWidth, screen.width) / row.scrollWidth) + 1;
    row.innerHTML = unit.repeat(reps * 2);
    const m = { el: row, dir: +row.dataset.shift || -1, speed: 0.6, x: 0, visible: true, hover: false, calm: true };
    if (m.dir > 0) m.x = -row.scrollWidth / 2;
    new IntersectionObserver(([e]) => { m.visible = e.isIntersecting; if (m.visible) kick(); }).observe(row);
    rows.push(m);
  });

  // ================= Loop de rolagem (rAF) =================
  const nav = $('#nav'), bar = $('#progress-bar'), toTop = $('#to-top'), ring = $('#to-top-ring'), mbar = $('#mbar');
  const hero = $('.hero'), heroCopy = $('[data-hero-parallax]'), heroBg = $('[data-hero-bg]');
  const timeline = $('[data-timeline]');
  const parallaxImgs = $$('[data-parallax]');
  const heroSideBySide = matchMedia('(min-width: 1025px)');
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
        // Parallax do texto só quando texto e cartão ficam lado a lado (desktop).
        // Empilhados (tablet/celular), mover o texto faria o botão passar por baixo do cartão.
        if (heroSideBySide.matches) {
          heroCopy.style.transform = `translate3d(0, ${y * 0.22}px, 0)`;
          heroCopy.style.opacity = String(clamp(1 - k * 1.1, 0, 1));
        } else if (heroCopy.style.transform) {
          heroCopy.style.transform = ''; heroCopy.style.opacity = '';
        }
        if (heroBg) heroBg.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(${1 + k * 0.06})`;
      }
      parallaxImgs.forEach(img => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const c = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.transform = `translate3d(0, ${c * -100 * (+img.dataset.parallax || 0.1)}%, 0)`;
      });
      // ticker acelera junto com a rolagem
      tickerAnim.playbackRate = 1 + clamp(Math.abs(velocity) * 5, 0, 7);
    }
    // galeria + faixa. Com "reduzir movimento", só a faixa anda, devagar e sem inclinar.
    const boost = reduceMotion ? 0 : clamp(Math.abs(velocity) * 6, 0, 14);
    const skew = reduceMotion ? 0 : clamp(-velocity * 3, -6, 6);
    rows.forEach(m => {
      if (!m.visible || (reduceMotion && !m.calm)) return;
      const half = m.el.scrollWidth / 2;
      const sp = (m.hover ? m.speed * 0.15 : m.speed) * (reduceMotion ? 0.5 : 1) + boost;
      m.x += m.dir * sp * (dt / 16.7);
      if (m.x <= -half) m.x += half;
      if (m.x > 0) m.x -= half;
      m.el.style.transform = `translate3d(${m.x}px, 0, 0) skewX(${skew}deg)`;
    });

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

    const moving = y !== lastY || Math.abs(velocity) > 0.002 || rows.some(m => m.visible && (!reduceMotion || m.calm));
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
  // Aba lateral: o fundo escurece, o painel desliza da direita, os links entram em cascata
  // e o sanduíche vira X. Ao fechar, tudo volta na ordem inversa.
  const drawerPanel = $('.drawer__panel', drawer);
  let drawerTimer = null;
  function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;
    clearTimeout(drawerTimer);
    drawer.hidden = false;
    void drawer.offsetWidth; // garante que a transição parte do estado fechado
    drawer.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    nav.classList.remove('is-hidden');
    $('.drawer__close', drawer).focus({ preventScroll: true });
  }
  function closeDrawer(focusToggle = true) {
    if (!drawerOpen) return;
    drawerOpen = false;
    drawer.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    const done = () => { if (!drawerOpen) drawer.hidden = true; };
    drawerTimer = setTimeout(done, 650);
    if (focusToggle) toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', () => (drawerOpen ? closeDrawer() : openDrawer()));
  drawer.addEventListener('click', e => {
    if (e.target.closest('.drawer__close') || !drawerPanel.contains(e.target)) closeDrawer();
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

  // ================= Inclinação 3D + brilho nos cards (mouse) =================
  if (finePointer && !reduceMotion) {
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
  let fbLoaded = false;
  function loadFacebook() {
    if (fbLoaded) return;
    fbLoaded = true;
    $('.embed-consent', fbFrame)?.remove();
    const w = clamp(Math.round(fbFrame.clientWidth), 180, 500);
    const h = Math.max(400, Math.round(fbFrame.clientHeight));
    const f = document.createElement('iframe');
    f.src = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(CFG.facebookPage || 'https://www.facebook.com/cristocentrofreguesia/')}&tabs=timeline&width=${w}&height=${h}&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false&lang=pt_BR`;
    f.title = 'Página da igreja no Facebook';
    f.loading = 'lazy'; f.allow = 'encrypted-media';
    f.style.cssText = `left:50%;translate:-50% 0;width:${w}px`;
    f.addEventListener('load', () => fbFrame.classList.add('is-loaded'));
    fbFrame.appendChild(f);
  }
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    if (allowed('social')) loadFacebook();
    else {
      fbFrame.classList.add('is-blocked');
      consentGate(fbFrame, 'social', { title: 'Publicações da igreja no Facebook', href: CFG.facebookPage, hrefLabel: 'Abrir no Facebook', load: loadFacebook });
    }
  }, { rootMargin: '500px' }).observe(fbFrame);
  onConsent(() => { if (allowed('social') && fbFrame.classList.contains('is-blocked')) { fbFrame.classList.remove('is-blocked'); loadFacebook(); } });

  // ================= Mapa (Google Maps) =================
  const mapBox = $('#map');
  let mapLoaded = false;
  function loadMap() {
    if (mapLoaded) return;
    mapLoaded = true;
    $('.embed-consent', mapBox)?.remove();
    const f = document.createElement('iframe');
    f.title = 'Mapa: Igreja Casa Comunhão e Vida'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    f.src = mapBox.dataset.src;
    mapBox.appendChild(f);
  }
  if (allowed('maps')) loadMap();
  else consentGate(mapBox, 'maps', { title: 'Mapa de como chegar', href: 'https://www.google.com/maps/search/?api=1&query=Igreja%20Casa%20Comunh%C3%A3o%20e%20Vida%2C%20Av.%20El%C3%ADsio%20Teixeira%20Leite%2C%2073%2C%20S%C3%A3o%20Paulo%20-%20SP%2C%2002801-000', hrefLabel: 'Abrir no Google Maps', load: loadMap });
  onConsent(() => allowed('maps') && loadMap());

  // ================= Mensagens: player aberto na página + lista =================
  const sPlayer = $('#sermon-player'), sList = $('#sermon-list');
  const sPoster = $('.sermons__poster', sPlayer);
  let sCurrent = $('.sermon-row.is-current', sList), sStarted = false;
  const embedSermon = (row, autoplay) => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${row.dataset.video}?rel=0&playsinline=1${autoplay ? '&autoplay=1' : ''}`;
    f.title = row.dataset.title;
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    sPlayer.replaceChildren(f);
  };
  function showSermon(row, autoplay) {
    sStarted = true;
    if (allowed('video')) return embedSermon(row, autoplay);
    sPoster.src = row.dataset.poster;
    sPlayer.replaceChildren(sPoster);
    consentGate(sPlayer, 'video', { dark: true, title: 'Assistir aqui no site', href: row.href, hrefLabel: 'Abrir no YouTube', load: () => embedSermon(sCurrent, true) });
  }
  // Só carrega o player quando a seção chega perto da tela.
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    if (!sStarted) showSermon(sCurrent, false);
  }, { rootMargin: '400px 0px' }).observe(sPlayer);
  onConsent(() => { if (sStarted && allowed('video') && !$('iframe', sPlayer)) embedSermon(sCurrent, false); });
  sList.addEventListener('click', e => {
    const row = e.target.closest('.sermon-row');
    if (!row || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (row !== sCurrent) {
      sCurrent.classList.remove('is-current'); sCurrent.removeAttribute('aria-current');
      row.classList.add('is-current'); row.setAttribute('aria-current', 'true');
      sCurrent = row;
      $('#sermon-tag').textContent = row === $('.sermon-row', sList) ? 'Mensagem mais recente' : 'Assistindo agora';
      $('#sermon-title').textContent = row.dataset.title;
      $('#sermon-meta').textContent = row.dataset.meta;
      $('#sermon-yt').href = row.href;
    }
    showSermon(row, true);
    // No celular o player fica acima da lista: leva a pessoa até ele.
    const r = sPlayer.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) sPlayer.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  });

  // ================= PIX: QR Code (BR Code estático) + copiar =================
  const PIX = { key: '05136068000116', name: 'CASA COMUNHAO E VIDA', city: 'SAO PAULO' };
  const emv = (id, v) => id + String(v.length).padStart(2, '0') + v;
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  const brPayload = emv('00', '01') + emv('26', emv('00', 'br.gov.bcb.pix') + emv('01', PIX.key)) +
    emv('52', '0000') + emv('53', '986') + emv('58', 'BR') + emv('59', PIX.name) + emv('60', PIX.city) +
    emv('62', emv('05', '***')) + '6304';
  const brCode = brPayload + crc16(brPayload);
  window.CCV_PIX = brCode; // útil para conferência
  const qrBox = $('#pix-qr');
  const drawQr = () => {
    if (!window.qrcode) return false;
    const qr = window.qrcode(0, 'M'); // nível M aguenta a logo no centro
    qr.addData(brCode); qr.make();
    qrBox.insertAdjacentHTML('afterbegin', qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true }));
    qrBox.classList.add('is-ready');
    return true;
  };
  if (!drawQr()) addEventListener('load', () => { if (!drawQr()) { qrBox.hidden = true; $('#pix-qr-toggle').hidden = true; } });

  // No celular o QR fica recolhido (ninguém escaneia a própria tela); botão abre para usar em outro aparelho.
  const qrToggle = $('#pix-qr-toggle');
  qrToggle.addEventListener('click', () => {
    const open = qrToggle.getAttribute('aria-expanded') !== 'true';
    qrToggle.setAttribute('aria-expanded', String(open));
    qrToggle.firstChild.textContent = open ? 'Ocultar QR Code ' : 'Mostrar QR Code ';
    $('.pix').classList.toggle('is-qr-open', open);
  });

  const pixStatus = $('#pix-status');
  const pixDefault = pixStatus.textContent;
  async function copyText(text, btn, okLabel, isPix = true) {
    const label = btn.querySelector('span');
    const original = label.textContent;
    try {
      await navigator.clipboard.writeText(text);
      label.textContent = okLabel;
      if (isPix) { pixStatus.textContent = 'Copiado. Agora é só colar no app do seu banco.'; pixStatus.classList.add('is-ok'); }
    } catch {
      label.textContent = 'Não foi possível copiar';
    }
    setTimeout(() => { label.textContent = original; if (isPix) { pixStatus.textContent = pixDefault; pixStatus.classList.remove('is-ok'); } }, 3000);
  }
  $('#copy-pix').addEventListener('click', e => copyText($('#pix-key').dataset.copy, e.currentTarget, 'Chave copiada!'));
  $('#copy-address').addEventListener('click', e => copyText(e.currentTarget.dataset.copy, e.currentTarget, 'Copiado!', false));
  $('#copy-brcode').addEventListener('click', e => copyText(brCode, e.currentTarget, 'Código copiado!'));

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
