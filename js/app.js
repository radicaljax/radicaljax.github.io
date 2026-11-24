// RadicalJax flagship: all page behaviour. Plain JavaScript, no libraries.
// Rule for everything here: animation responds to the visitor, it never takes the scroll away from them.
(function () {
  'use strict';
  const root = document.documentElement;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const motionOK = () => !root.classList.contains('rm');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  function tween(ms, step, done) {
    if (!motionOK()) { step(1); if (done) done(); return { stop() {} }; }
    let raf, t0 = performance.now(), live = true;
    (function f(now) {
      if (!live) return;
      const t = clamp((now - t0) / ms, 0, 1); step(easeOut(t));
      if (t < 1) raf = requestAnimationFrame(f); else if (done) done();
    })(t0);
    return { stop() { live = false; cancelAnimationFrame(raf); } };
  }
  let refresh = true;       // set when something scrolls into view, so the scroll-linked parts redraw once
  const seen = new Map();   // element -> is it on screen right now
  const watch = (el, margin) => {
    if (!el) return; seen.set(el, false);
    new IntersectionObserver(en => { seen.set(el, en[0].isIntersecting); refresh = true; }, { rootMargin: margin || '100px' }).observe(el);
  };

  /* ---------- hire links, year, entrance ---------- */
  const cfg = window.RJ || {};
  $$('[data-hire="email"]').forEach(a => { if (cfg.email) a.href = 'mailto:' + cfg.email; });
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('loaded')));
  setTimeout(() => root.classList.add('loaded'), 700);   // safety net if the tab opens in the background

  /* ---------- reveal on scroll ---------- */
  $$('.rv').forEach(el => {
    const sibs = Array.from(el.parentElement.children).filter(c => c.classList.contains('rv'));
    el.style.setProperty('--i', Math.min(sibs.indexOf(el), 6));
  });
  const rvIO = new IntersectionObserver(en => en.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rvIO.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('.rv').forEach(el => rvIO.observe(el));

  /* ---------- header ---------- */
  const hdr = $('#hdr'), prog = $('#prog'), menuBtn = $('#menu-btn'), navLinks = $$('#nav a');
  menuBtn.addEventListener('click', () => { const open = hdr.classList.toggle('nav-open'); menuBtn.setAttribute('aria-expanded', open); menuBtn.textContent = open ? 'Close' : 'Menu'; });
  navLinks.forEach(a => a.addEventListener('click', () => { hdr.classList.remove('nav-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = 'Menu'; }));
  const navIO = new IntersectionObserver(en => en.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => navIO.observe(s));

  /* ---------- theme + accent ---------- */
  let lastPX = innerWidth / 2, lastPY = innerHeight / 2;
  addEventListener('pointerdown', e => { lastPX = e.clientX; lastPY = e.clientY; }, { passive: true, capture: true });
  function wipe(fn) {
    if (!document.startViewTransition || !motionOK()) { fn(); return; }
    root.style.setProperty('--vx', lastPX + 'px'); root.style.setProperty('--vy', lastPY + 'px');
    document.startViewTransition(fn);
  }
  function syncControls() {
    $$('input[name="theme"]').forEach(i => { i.checked = i.value === root.dataset.theme; });
    $$('input[name="accent"]').forEach(i => { i.checked = i.value === root.dataset.accent; });
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = root.dataset.theme === 'light' ? '#eceef1' : '#07080b';
  }
  function setLook(key, val) {
    wipe(() => { root.dataset[key] = val; store.set('rj-' + key, val); syncControls(); dispatchEvent(new Event('rj:theme')); });
  }
  $$('input[name="theme"]').forEach(i => i.addEventListener('change', () => setLook('theme', i.value)));
  $$('input[name="accent"]').forEach(i => i.addEventListener('change', () => setLook('accent', i.value)));
  $('#theme-quick').addEventListener('click', () => setLook('theme', root.dataset.theme === 'light' ? 'dark' : 'light'));
  syncControls();

  /* ---------- motion switch ---------- */
  const mt = $('#motion-toggle');
  mt.checked = motionOK();
  mt.addEventListener('change', () => {
    root.classList.toggle('rm', !mt.checked); store.set('rj-motion', mt.checked ? 'on' : 'off');
    dispatchEvent(new Event('rj:motion'));
  });

  /* ---------- 01 scroll story ---------- */
  const story = $('#story'), stage = $('#stage'), steps = $$('.step'), bar = $('#stagebar'), barBtns = $$('button', bar), urlEl = $('#url');
  let cur = 0, typing = null;
  const storyLine = () => innerWidth <= 900 ? innerHeight * .74 : innerHeight * .5;
  function typeUrl() {
    const full = 'yourbusiness.com'; clearInterval(typing);
    if (!motionOK()) { urlEl.textContent = full; return; }
    let i = 0; urlEl.textContent = '';
    typing = setInterval(() => { urlEl.textContent = full.slice(0, ++i); if (i >= full.length) clearInterval(typing); }, 55);
  }
  function setStage(n) {
    if (n === cur) return; cur = n;
    stage.dataset.stage = n;
    stage.classList.toggle('is-layout', n >= 2); stage.classList.toggle('is-styled', n >= 3);
    steps.forEach((s, i) => s.classList.toggle('is-on', i === n - 1));
    barBtns.forEach((b, i) => { b.classList.toggle('is-on', i === n - 1); if (i === n - 1) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    bar.style.setProperty('--prog', n / 5);
    if (n === 5) typeUrl(); else { clearInterval(typing); urlEl.textContent = 'yourbusiness.com'; }
  }
  function updateStory() {
    const line = storyLine(); let best = 0, bd = Infinity;
    steps.forEach((s, i) => { const r = s.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - line); if (d < bd) { bd = d; best = i; } });
    setStage(best + 1);
  }
  barBtns.forEach((b, i) => b.addEventListener('click', () => {
    const r = steps[i].getBoundingClientRect();
    scrollTo({ top: scrollY + r.top + r.height / 2 - storyLine(), behavior: motionOK() ? 'smooth' : 'auto' });
  }));
  watch(story, '200px'); setStage(1);

  /* ---------- 02 motion lab ---------- */
  const lab = $('#lab'), tiles = $$('.tile', lab);
  let spotE = null;
  lab.addEventListener('pointermove', e => {
    if (spotE) { spotE = e; return; } spotE = e;
    requestAnimationFrame(() => {
      tiles.forEach(t => { const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (spotE.clientX - r.left) + 'px'); t.style.setProperty('--my', (spotE.clientY - r.top) + 'px'); });
      spotE = null;
    });
  }, { passive: true });
  lab.addEventListener('pointerleave', () => tiles.forEach(t => { t.style.setProperty('--mx', '-40rem'); t.style.setProperty('--my', '-40rem'); }));

  // type that reacts
  const kin = $('#kin'), kinL = $$('.kin-word span', kin); let kinX = null;
  kin.addEventListener('pointermove', e => { kinX = e.clientX; }, { passive: true });
  kin.addEventListener('pointerleave', () => { kinX = null; });
  watch(kin);
  function updateKin(t) {
    if (!seen.get(kin)) return;
    const w = kin.clientWidth * .3;
    kinL.forEach((l, i) => {
      let k;
      if (kinX !== null) { const r = l.getBoundingClientRect(); k = clamp(1 - Math.abs(kinX - (r.left + r.width / 2)) / w, 0, 1); k = k * k * (3 - 2 * k); }
      else if (motionOK()) k = .5 + .5 * Math.sin(t / 620 - i * .75);
      else k = i === 3 ? 1 : .35;
      l.style.setProperty('--wd', (66 + k * 59).toFixed(1)); l.style.setProperty('--wg', Math.round(260 + k * 640));
      l.classList.toggle('hot', kinX !== null && k > .7);
    });
  }

  // 3D tilt
  const tiltS = $('.tilt-stage'), tiltC = $('.tilt-card');
  tiltS.addEventListener('pointermove', e => {
    const r = tiltC.getBoundingClientRect(), x = clamp((e.clientX - r.left) / r.width, -.3, 1.3), y = clamp((e.clientY - r.top) / r.height, -.3, 1.3);
    tiltC.classList.add('live');
    tiltC.style.setProperty('--ry', ((x - .5) * 34).toFixed(2) + 'deg'); tiltC.style.setProperty('--rx', ((.5 - y) * 28).toFixed(2) + 'deg');
    tiltC.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); tiltC.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
  }, { passive: true });
  tiltS.addEventListener('pointerleave', () => { tiltC.classList.remove('live'); ['--rx', '--ry', '--gx', '--gy'].forEach(p => tiltC.style.removeProperty(p)); });

  // magnetic button
  const magZ = $('.mag-zone'), magB = $('.mag-btn');
  magZ.addEventListener('pointermove', e => {
    const r = magZ.getBoundingClientRect();
    magB.classList.add('live');
    magB.style.setProperty('--x', clamp((e.clientX - (r.left + r.width / 2)) * .42, -70, 70).toFixed(1) + 'px');
    magB.style.setProperty('--y', clamp((e.clientY - (r.top + r.height / 2)) * .42, -36, 36).toFixed(1) + 'px');
  }, { passive: true });
  magZ.addEventListener('pointerleave', () => { magB.classList.remove('live'); magB.style.setProperty('--x', '0px'); magB.style.setProperty('--y', '0px'); });

  // decode text
  const scr = $('#scr'); let scrRaf, scrFlip = false;
  function scramble(to) {
    cancelAnimationFrame(scrRaf);
    if (!motionOK()) { scr.textContent = to; return; }
    const from = scr.textContent, len = Math.max(from.length, to.length), glyphs = '!<>-_\\/[]{}=+*^?#01';
    const q = []; let f = 0;
    for (let i = 0; i < len; i++) { const s = Math.floor(Math.random() * 16); q.push({ from: from[i] || ' ', to: to[i] || ' ', s, e: s + 8 + Math.floor(Math.random() * 20), ch: '' }); }
    (function up() {
      let out = '', done = 0;
      q.forEach(o => {
        if (f >= o.e) { done++; out += o.to; }
        else if (f >= o.s) { if (!o.ch || Math.random() < .3) o.ch = glyphs[Math.floor(Math.random() * glyphs.length)]; out += o.ch; }
        else out += o.from;
      });
      scr.textContent = out;
      if (done < q.length) { f++; scrRaf = requestAnimationFrame(up); }
    })();
  }
  const scrGo = () => { scrFlip = !scrFlip; scramble(scrFlip ? scr.dataset.b : scr.dataset.a); };
  scr.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') scrGo(); });
  scr.addEventListener('click', scrGo);

  // little layout pictures, shared by the hover previews and the gallery
  function thumb(type, h) {
    const bg = `hsl(${h} 38% 13%)`, a = `hsl(${h} 92% 62%)`, m = `hsl(${h} 26% 27%)`, l = `hsl(${h} 30% 86%)`;
    let b = `<rect width="320" height="200" fill="${bg}"/><rect x="18" y="16" width="38" height="7" fill="${l}"/><rect x="232" y="17" width="20" height="5" fill="${m}"/><rect x="258" y="17" width="20" height="5" fill="${m}"/><rect x="286" y="14" width="16" height="11" fill="${a}"/>`;
    if (type === 'landing') b += `<rect x="18" y="62" width="150" height="16" fill="${l}"/><rect x="18" y="86" width="108" height="16" fill="${l}"/><rect x="18" y="116" width="130" height="5" fill="${m}"/><rect x="18" y="127" width="96" height="5" fill="${m}"/><rect x="18" y="148" width="66" height="20" fill="${a}"/><circle cx="244" cy="114" r="54" fill="${m}"/><circle cx="226" cy="100" r="30" fill="${a}"/>`;
    else if (type === 'store') { for (let i = 0; i < 3; i++) { const x = 18 + i * 98; b += `<rect x="${x}" y="46" width="88" height="98" fill="${m}"/><circle cx="${x + 44}" cy="92" r="${22 + i * 4}" fill="${i === 1 ? a : l}" opacity="${i === 1 ? 1 : .85}"/><rect x="${x}" y="154" width="58" height="6" fill="${l}"/><rect x="${x}" y="168" width="30" height="6" fill="${a}"/>`; } }
    else if (type === 'portfolio') b += `<rect x="18" y="44" width="132" height="138" fill="${m}"/><rect x="158" y="44" width="144" height="62" fill="${a}"/><rect x="158" y="114" width="68" height="68" fill="${l}" opacity=".85"/><rect x="234" y="114" width="68" height="68" fill="${m}"/><rect x="30" y="156" width="70" height="8" fill="${l}"/>`;
    else {
      b += `<rect x="18" y="56" width="112" height="14" fill="${l}"/><rect x="18" y="78" width="80" height="14" fill="${l}"/><rect x="18" y="106" width="104" height="5" fill="${m}"/><rect x="18" y="117" width="84" height="5" fill="${m}"/><rect x="18" y="146" width="72" height="20" fill="${a}"/><rect x="158" y="44" width="144" height="138" fill="none" stroke="${m}"/>`;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) b += `<rect x="${168 + c * 26}" y="${58 + r * 29}" width="20" height="22" fill="${r === 1 && c === 3 ? a : m}"/>`;
    }
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${b}</svg>`;
  }

  // hover previews
  const peek = $('#peek'), peekCard = $('.peek-card', peek), peekItems = $$('.peek-list li', peek);
  const peekHue = { landing: 28, store: 330, portfolio: 205, booking: 150 };
  peekCard.innerHTML = peekItems.map(li => thumb(li.dataset.type, peekHue[li.dataset.type]).replace('<svg ', `<svg data-type="${li.dataset.type}" `)).join('');
  let pTX = 0, pTY = 0, pX = 0, pY = 0, pR = 0, pFree = false;
  function peekShow(li, pinned) {
    peekItems.forEach(o => o.classList.toggle('is-on', o === li));
    $$('svg', peekCard).forEach(s => s.classList.toggle('is-on', !!li && s.dataset.type === li.dataset.type));
    peekCard.classList.toggle('show', !!li);
    if (li && pinned) {   // keyboard or touch: park the card at the right of the row
      const r = peek.getBoundingClientRect(), lr = li.getBoundingClientRect();
      pTX = r.width - peekCard.offsetWidth - 24; pTY = clamp(lr.top - r.top + lr.height / 2 - peekCard.offsetHeight / 2, 8, r.height - peekCard.offsetHeight - 8);
      pFree = false;
    }
  }
  peek.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = peek.getBoundingClientRect(), cw = peekCard.offsetWidth, ch = peekCard.offsetHeight;
    pTX = clamp(e.clientX - r.left + 22, 8, r.width - cw - 8); pTY = clamp(e.clientY - r.top - ch / 2, 8, r.height - ch - 8); pFree = true;
  }, { passive: true });
  peekItems.forEach(li => {
    li.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') peekShow(li, false); });
    $('button', li).addEventListener('focus', () => { if (!pFree) peekShow(li, true); });
    $('button', li).addEventListener('click', () => { if (!pFree) peekShow(li.classList.contains('is-on') && peekCard.classList.contains('show') ? null : li, true); });
  });
  $('.peek-list', peek).addEventListener('pointerleave', () => { peekShow(null); pFree = false; });
  watch(peek);
  function updatePeek() {
    if (!seen.get(peek)) return;
    const k = motionOK() ? .16 : 1, dx = pTX - pX;
    pX += dx * k; pY += (pTY - pY) * k; pR += (clamp(dx * .12, -9, 9) - pR) * .15;
    peekCard.style.setProperty('--px', pX.toFixed(1) + 'px'); peekCard.style.setProperty('--py', pY.toFixed(1) + 'px'); peekCard.style.setProperty('--pr', (motionOK() ? pR : 0).toFixed(2) + 'deg');
  }

  // count-up
  const countBtn = $('#count'), countN = $('#count-n'); let countTw;
  function runCount() { if (countTw) countTw.stop(); const to = +countN.dataset.to; countTw = tween(1900, t => { countN.textContent = fmt(to * t); }); }
  countBtn.addEventListener('click', runCount);
  new IntersectionObserver((en, io) => { if (en[0].isIntersecting) { runCount(); io.disconnect(); } }, { threshold: .6 }).observe(countBtn);

  // click feedback
  const burst = $('#burst'), burstN = $('#burst-n'); let likes = 128;
  burst.addEventListener('click', () => {
    const on = burst.getAttribute('aria-pressed') !== 'true';
    burst.setAttribute('aria-pressed', on); likes += on ? 1 : -1; burstN.textContent = likes;
    if (!on || !motionOK() || !burst.animate) return;
    for (let i = 0; i < 14; i++) {
      const b = document.createElement('i'); b.className = 'bit'; burst.appendChild(b);
      const ang = (i / 14) * Math.PI * 2 + Math.random() * .4, d = 46 + Math.random() * 46;
      b.animate([{ transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d}px) rotate(${180 + Math.random() * 180}deg) scale(0)`, opacity: 0 }],
        { duration: 620 + Math.random() * 260, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => b.remove();
    }
  });

  // lines that draw
  const draw = $('#draw');
  new IntersectionObserver((en, io) => { if (en[0].isIntersecting) { draw.classList.add('go'); io.disconnect(); } }, { threshold: .5 }).observe(draw);
  $('#draw-replay').addEventListener('click', () => { draw.classList.remove('go'); void draw.offsetWidth; draw.classList.add('go'); });

  // scroll-speed bands
  const marq = $('#marq'), rows = $$('.marq-row', marq).map(r => ({ el: $('.marq-in', r), dir: +r.dataset.dir, x: 0, w: 0 }));
  const measureMarq = () => rows.forEach(r => { r.w = r.el.firstElementChild.getBoundingClientRect().width || 1; });
  watch(marq, '200px');
  function updateMarq(dt, vel) {
    if (!seen.get(marq)) return;
    const base = motionOK() ? .05 * dt : 0, push = motionOK() ? vel * 1.4 : 0;
    rows.forEach(r => {
      if (!r.w || r.w === 1) measureMarq();
      r.x += (base + push) * r.dir; r.x = ((r.x % r.w) + r.w) % r.w;
      r.el.style.transform = `translate3d(${-r.x.toFixed(1)}px,0,0)`;
    });
  }

  /* ---------- 03 form ---------- */
  const form = $('#form'), fSteps = $$('.f-step', form), fBar = $('#f-bar'), fCount = $('#f-count'), fBack = $('#f-back'), fNext = $('#f-next');
  const fName = $('#f-name'), fMail = $('#f-mail'), pages = $('#pages'), pagesOut = $('#pages-out');
  const mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; let fi = 1, tried = false;
  const arrow = ' <span class="arr" aria-hidden="true">→</span>';
  function fShow(n, focus) {
    fi = n; fSteps.forEach(s => s.classList.toggle('is-on', +s.dataset.f === n));
    fBar.style.transform = `scaleX(${Math.min(n, 3) / 3})`;
    fCount.textContent = n <= 3 ? `Step ${n} of 3` : 'Done';
    fBack.hidden = n === 1 || n === 4;
    fNext.innerHTML = n === 3 ? 'Send brief' + arrow : n === 4 ? 'Start over' : 'Next' + arrow;
    if (focus) { const first = $('.f-step.is-on input', form); if (first && n !== 4) first.focus({ preventScroll: true }); }
  }
  function mark(input, errEl, msg) {
    input.classList.remove('bad', 'good'); void input.offsetWidth;
    input.classList.add(msg ? 'bad' : 'good'); input.setAttribute('aria-invalid', msg ? 'true' : 'false'); errEl.textContent = msg || '';
    return !msg;
  }
  const checkName = () => mark(fName, $('#err-name'), fName.value.trim().length < 2 ? 'Add your name so I know who to reply to.' : '');
  const checkMail = () => mark(fMail, $('#err-mail'), !fMail.value.trim() ? 'Add an email so I can reply.' : !mailRe.test(fMail.value.trim()) ? 'That email does not look right. Check the @ and the ending.' : '');
  function fValid(n) {
    if (n === 1) { const ok = $$('input[name="need"]:checked', form).length > 0; $('#err-need').textContent = ok ? '' : 'Pick at least one. You can pick several.'; return ok; }
    if (n === 3) { tried = true; const a = checkName(), b = checkMail(); if (!a) fName.focus(); else if (!b) fMail.focus(); return a && b; }
    return true;
  }
  $$('input[name="need"]', form).forEach(i => i.addEventListener('change', () => { $('#err-need').textContent = ''; }));
  fName.addEventListener('input', () => { if (tried) checkName(); });
  fMail.addEventListener('input', () => { if (tried) checkMail(); });
  pages.addEventListener('input', () => { pagesOut.textContent = pages.value === '20' ? '20+' : pages.value; });
  fBack.addEventListener('click', () => fShow(fi - 1, true));
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (fi === 4) { form.reset(); tried = false; pagesOut.textContent = pages.value; [fName, fMail].forEach(i => i.classList.remove('bad', 'good')); $$('.f-err', form).forEach(p => { p.textContent = ''; }); fShow(1, true); return; }
    if (!fValid(fi)) return;
    if (fi === 3) {
      const needs = $$('input[name="need"]:checked', form).map(i => i.value.toLowerCase());
      const when = ($('input[name="when"]:checked', form) || {}).value || '';
      $('#f-sum').textContent = `${fName.value.trim()}, your brief reads: ${needs.join(', ')}; about ${pagesOut.textContent} page${pages.value === '1' ? '' : 's'}; timing: ${when.toLowerCase()}.`;
    }
    fShow(fi + 1, true);
  });

  /* ---------- 03 chart ---------- */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DATA = {
    visitors: { v: [1200, 1350, 1500, 1480, 1900, 2300, 2250, 2700, 3100, 3000, 3600, 4200], unit: 'visitors this year' },
    enquiries: { v: [14, 18, 17, 25, 31, 29, 38, 44, 41, 52, 60, 71], unit: 'enquiries this year' },
    sales: { v: [9, 6, 11, 8, 15, 13, 12, 19, 16, 23, 21, 30], unit: 'sales this year' }
  };
  const chartEl = $('#chart'), svg = $('#chart-svg'), cBox = $('#chart-box'), cTip = $('#chart-tip'), cTotal = $('#chart-total'), cUnit = $('#chart-unit');
  const CW = 600, CH = 260, norm = set => { const mx = Math.max(...DATA[set].v) * 1.12; return DATA[set].v.map(v => v / mx); };
  svg.innerHTML = '<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--acc);stop-opacity:.34"/><stop offset="1" style="stop-color:var(--acc);stop-opacity:0"/></linearGradient></defs>' +
    [.25, .5, .75, 1].map(g => `<line class="c-grid" x1="0" x2="${CW}" y1="${CH - 8 - g * (CH - 24)}" y2="${CH - 8 - g * (CH - 24)}"/>`).join('') +
    '<path class="c-area" fill="url(#cg)"/><path class="c-line"/><line class="c-guide" y1="0" y2="' + CH + '" visibility="hidden"/>';
  const cLine = $('.c-line', svg), cArea = $('.c-area', svg), cGuide = $('.c-guide', svg);
  const cDot = document.createElement('i'); cDot.className = 'chart-dot'; cDot.hidden = true; cBox.appendChild(cDot);
  const px = i => i / 11 * CW, py = n => CH - 8 - n * (CH - 24);
  let cSet = 'visitors', cVals = new Array(12).fill(0), cTw, cTot = 0;
  function cDraw(vals) {
    const p = vals.map((n, i) => [px(i), py(n)]); let d = `M${p[0][0]},${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    cLine.setAttribute('d', d); cArea.setAttribute('d', d + ` L${CW},${CH} L0,${CH} Z`);
  }
  function cGo(set) {
    cSet = set; const from = cVals.slice(), to = norm(set), t0 = cTot, t1 = DATA[set].v.reduce((a, b) => a + b, 0);
    cUnit.textContent = DATA[set].unit; cTip.hidden = cDot.hidden = true; cGuide.setAttribute('visibility', 'hidden');
    if (cTw) cTw.stop();
    cTw = tween(900, t => { cVals = from.map((v, i) => v + (to[i] - v) * t); cDraw(cVals); cTot = t0 + (t1 - t0) * t; cTotal.textContent = fmt(cTot); });
  }
  cDraw(cVals);
  $$('.tabs button', chartEl).forEach(b => b.addEventListener('click', () => {
    $$('.tabs button', chartEl).forEach(o => o.setAttribute('aria-pressed', o === b)); cGo(b.dataset.set);
  }));
  cBox.addEventListener('pointermove', e => {
    const r = cBox.getBoundingClientRect(), i = clamp(Math.round((e.clientX - r.left) / r.width * 11), 0, 11), n = cVals[i];
    cGuide.setAttribute('x1', px(i)); cGuide.setAttribute('x2', px(i)); cGuide.setAttribute('visibility', 'visible');
    cDot.hidden = cTip.hidden = false;
    cDot.style.left = cTip.style.left = (i / 11 * 100) + '%'; cDot.style.top = cTip.style.top = (py(n) / CH * 100) + '%';
    cTip.textContent = `${MONTHS[i]} · ${fmt(DATA[cSet].v[i])}`;
    cTip.style.transform = `translate(${i < 2 ? '0' : i > 9 ? '-100%' : '-50%'},calc(-100% - 1rem))`;
  }, { passive: true });
  cBox.addEventListener('pointerleave', () => { cTip.hidden = cDot.hidden = true; cGuide.setAttribute('visibility', 'hidden'); });
  new IntersectionObserver((en, io) => { if (en[0].isIntersecting) { cGo('visitors'); io.disconnect(); } }, { threshold: .35 }).observe(chartEl);

  /* ---------- 03 gallery ---------- */
  const GAL = [
    ['Coffee roaster', 'landing', 28], ['Skate shop', 'store', 330], ['Photographer', 'portfolio', 205], ['Barber', 'booking', 150],
    ['App launch', 'landing', 262], ['Candle brand', 'store', 42], ['Architect', 'portfolio', 188], ['Yoga studio', 'booking', 300]
  ];
  const gGrid = $('#gal-grid'), gCount = $('#gal-count');
  gGrid.innerHTML = GAL.map(g => `<figure class="g-card" data-type="${g[1]}" style="margin:0"><div class="g-thumb">${thumb(g[1], g[2])}</div><figcaption class="g-cap"><b>${g[0]}</b><span>${g[1]}</span></figcaption></figure>`).join('');
  const gCards = $$('.g-card', gGrid);
  $$('#gal .tabs button').forEach(b => b.addEventListener('click', () => {
    $$('#gal .tabs button').forEach(o => o.setAttribute('aria-pressed', o === b));
    const f = b.dataset.filter, first = new Map(gCards.map(c => [c, c.hidden ? null : c.getBoundingClientRect()]));
    gCards.forEach(c => { c.hidden = !(f === 'all' || c.dataset.type === f); });
    const shown = gCards.filter(c => !c.hidden);
    gCount.textContent = `Showing ${shown.length} of ${gCards.length} example layouts`;
    if (!motionOK() || !gGrid.animate) return;
    shown.forEach((c, i) => {
      const a = first.get(c), z = c.getBoundingClientRect();
      if (!a) c.animate([{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: i * 30, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      else if (a.left !== z.left || a.top !== z.top) c.animate([{ transform: `translate(${a.left - z.left}px,${a.top - z.top}px)` }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)' });
    });
  }));

  /* ---------- 04 responsive frame ---------- */
  const rs = $('#rsp-stage'), rf = $('#rsp-frame'), rpg = $('#rsp-page'), rh = $('#rsp-handle'), rPx = $('#rsp-px'), rName = $('#rsp-name'), rBtns = $$('#rsp .tabs button');
  const LH = 680, MINW = 320; let MAXW = 1280, RW = 1280, rScale = 1, rTw, rTouched = false;
  function rApply() {
    rf.style.width = (RW * rScale) + 'px'; rf.style.height = (LH * rScale) + 'px';
    rpg.style.width = RW + 'px'; rpg.style.height = LH + 'px'; rpg.style.transform = `scale(${rScale})`;
    rPx.textContent = Math.round(RW); rName.textContent = RW <= 560 ? 'Phone' : RW <= 980 ? 'Tablet' : 'Laptop';
    rh.setAttribute('aria-valuenow', Math.round(RW)); rh.setAttribute('aria-valuemax', MAXW);
    rBtns.forEach(b => b.setAttribute('aria-pressed', Math.abs(+b.dataset.w - RW) < 6));
  }
  function rLayout() {
    const cs = getComputedStyle(rs), avail = rs.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
    const wasMax = RW >= MAXW; MAXW = avail < 640 ? 820 : 1280; if (wasMax || RW > MAXW) RW = MAXW;
    rScale = avail / MAXW; rApply();
  }
  function rTo(w, ms) { if (rTw) rTw.stop(); const from = RW; w = clamp(w, MINW, MAXW); rTw = tween(ms || 700, t => { RW = from + (w - from) * t; rApply(); }); }
  rBtns.forEach(b => b.addEventListener('click', () => { rTouched = true; rTo(+b.dataset.w); }));
  let grab = null;
  rh.addEventListener('pointerdown', e => { rTouched = true; if (rTw) rTw.stop(); rh.setPointerCapture(e.pointerId); grab = e.clientX - rf.getBoundingClientRect().right; e.preventDefault(); });
  rh.addEventListener('pointermove', e => {
    if (grab === null) return; const r = rs.getBoundingClientRect(), cx = r.left + r.width / 2;
    RW = clamp(2 * (e.clientX - grab - cx) / rScale, MINW, MAXW); rApply();
  });
  const rDrop = () => { grab = null; };
  rh.addEventListener('pointerup', rDrop); rh.addEventListener('pointercancel', rDrop);
  rh.addEventListener('keydown', e => {
    const k = { ArrowLeft: -24, ArrowRight: 24, ArrowDown: -24, ArrowUp: 24 }[e.key];
    if (k) { rTouched = true; RW = clamp(RW + k, MINW, MAXW); rApply(); e.preventDefault(); }
    else if (e.key === 'Home') { rTouched = true; RW = MINW; rApply(); e.preventDefault(); }
    else if (e.key === 'End') { rTouched = true; RW = MAXW; rApply(); e.preventDefault(); }
  });
  rLayout();
  // one unprompted sweep the first time it scrolls in, so people see that it moves
  new IntersectionObserver((en, io) => {
    if (!en[0].isIntersecting) return; io.disconnect();
    if (!motionOK() || rTouched) return;
    setTimeout(() => { if (rTouched) return; rTo(390, 1300); setTimeout(() => { if (!rTouched) rTo(MAXW, 1300); }, 2300); }, 500);
  }, { threshold: .55 }).observe(rs);

  /* ---------- 05 measured numbers ---------- */
  const stats = $('#stats'), stFps = $('#st-fps');
  function measure() {
    const nav = performance.getEntriesByType('navigation')[0], res = performance.getEntriesByType('resource');
    let bytes = 0; [nav].concat(res).forEach(e => { if (e) bytes += e.transferSize || e.encodedBodySize || 0; });
    const ready = nav ? (nav.domContentLoadedEventEnd || nav.responseEnd) : performance.now();
    $('#st-load').textContent = (ready / 1000).toFixed(2);
    $('#st-kb').textContent = fmt(bytes / 1024);
    $('#st-req').textContent = res.length + 1;
  }
  if (document.readyState === 'complete') setTimeout(measure, 400); else addEventListener('load', () => setTimeout(measure, 400));
  watch(stats);

  /* ---------- 06 timeline ---------- */
  const tl = $('#tl'), tlItems = $$('li', tl);
  watch(tl, '200px');
  function updateTl() {
    if (!seen.get(tl)) return;
    const r = tl.getBoundingClientRect(), vert = innerWidth <= 900;
    const p = vert ? clamp((innerHeight * .7 - r.top) / r.height, 0, 1) : clamp((innerHeight * .9 - r.top) / (innerHeight * .5), 0, 1);
    tl.style.setProperty('--p', p.toFixed(3));
    tlItems.forEach(li => { const at = vert ? li.offsetTop / tl.offsetHeight : li.offsetLeft / tl.offsetWidth; li.classList.toggle('on', p >= at + .012); });
  }

  /* ---------- cursor glow ---------- */
  const glowEl = $('.cursor-glow'); let gTX = -999, gTY = -999, gX = -999, gY = -999;
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { gTX = e.clientX; gTY = e.clientY; if (gX < -900) { gX = gTX; gY = gTY; } } }, { passive: true });

  /* ---------- one loop for everything that follows the scroll ---------- */
  let lastY = -1, prevY = scrollY, vel = 0, lastT = performance.now(), frames = 0, fpsT = lastT;
  function tick(now) {
    const dt = Math.min(50, now - lastT); lastT = now;
    const y = scrollY; vel += ((y - prevY) - vel) * .18; prevY = y;
    if (y !== lastY || refresh) {
      lastY = y; refresh = false;
      hdr.classList.toggle('scrolled', y > 24);
      const max = document.documentElement.scrollHeight - innerHeight;
      prog.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
      updateStory();
      updateTl();
    }
    updateKin(now); updatePeek(); updateMarq(dt, vel);
    if (gX > -900 && motionOK()) { gX += (gTX - gX) * .12; gY += (gTY - gY) * .12; glowEl.style.setProperty('--cx', gX.toFixed(1) + 'px'); glowEl.style.setProperty('--cy', gY.toFixed(1) + 'px'); }
    frames++; if (now - fpsT >= 600) { if (seen.get(stats)) stFps.textContent = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  addEventListener('resize', () => { lastY = -1; rLayout(); measureMarq(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureMarq(); lastY = -1; });
})();
