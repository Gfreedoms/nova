/* Nova — shared UI helpers */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CURRENCY = 'UGX';

  const money = n => n === 0 ? 'Free' : CURRENCY + ' ' + Math.round(n).toLocaleString('en-US');
  const moneyPlain = n => CURRENCY + ' ' + Math.round(n).toLocaleString('en-US');

  const dFmt = (iso, opts) => new Date(iso).toLocaleString('en-US', opts);
  function relDay(iso) {
    const d = new Date(iso); const t = new Date(); t.setHours(0, 0, 0, 0);
    const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - t) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return dFmt(iso, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  const time = iso => dFmt(iso, { hour: 'numeric', minute: '2-digit' });
  const cardDate = iso => relDay(iso) + ' • ' + time(iso);
  const longDate = iso => dFmt(iso, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  function priceFrom(e) {
    const avail = e.tiers.map(t => t.price);
    const min = Math.min.apply(null, avail);
    return min === 0 ? (Math.max.apply(null, avail) === 0 ? 'Free' : 'Free – ' + moneyPlain(Math.max.apply(null, avail))) : 'From ' + moneyPlain(min);
  }
  const remaining = e => e.tiers.reduce((s, t) => s + Math.max(0, t.qty - t.sold), 0);
  const capacity = e => e.tiers.reduce((s, t) => s + t.qty, 0);
  const soldCount = e => e.tiers.reduce((s, t) => s + t.sold, 0);
  function statusBadge(e) {
    const now = Date.now();
    if (new Date(e.end).getTime() < now) return '<span class="badge neutral cover-badge">Ended</span>';
    const left = remaining(e);
    if (left === 0) return '<span class="badge danger cover-badge">Sold out</span>';
    if (left / capacity(e) < 0.15) return '<span class="badge warn cover-badge">Almost full</span>';
    if (new Date(e.start).getTime() - now < 36 * 3600000) return '<span class="badge cover-badge">Starting soon</span>';
    return '';
  }
  const location = e => e.online ? 'Online event' : (e.venue ? e.venue.name + ' · ' + e.venue.city : 'Location TBA');

  function cat(id) { id = Store.catId(id); return Store.categories.find(c => c.id === id) || { name: 'Other', emoji: '✨' }; }

  function photoUrl(id, w) { return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w || 800}&q=70`; }
  function gradient(e) { const p = Store.palettes[(e.palette || 0) % Store.palettes.length]; return `linear-gradient(135deg, ${p[0]}, ${p[1]})`; }
  function cover(e, opts) {
    opts = opts || {};
    const w = opts.w || 640;
    const bg = `background:${gradient(e)}`;
    if (e.image) return `<div class="cover" style="${bg}"><img src="${esc(e.image)}" alt="" loading="lazy"></div>`;
    if (e.photo) return `<div class="cover" style="${bg}"><img src="${photoUrl(e.photo, w)}" srcset="${photoUrl(e.photo, Math.round(w / 2))} ${Math.round(w / 2)}w, ${photoUrl(e.photo, w)} ${w}w, ${photoUrl(e.photo, w * 2)} ${w * 2}w" sizes="${opts.sizes || '(max-width: 600px) 100vw, 320px'}" alt="${esc(e.title || '')}" loading="${opts.eager ? 'eager' : 'lazy'}" onerror="this.remove()"><span class="cv-emoji cv-fallback">${cat(e.category).emoji}</span></div>`;
    return `<div class="cover" style="${bg}"><span class="cv-emoji">${cat(e.category).emoji}</span></div>`;
  }

  const heart = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2 0 3.4 1 5 2.8 1.6-1.8 3-2.8 5-2.8 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const heartOutline = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2 0 3.4 1 5 2.8 1.6-1.8 3-2.8 5-2.8 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21zm0-2.4c2.4-1.6 6.2-4.7 7.6-7.6 1-2.2-.4-4.5-2.6-4.5-1.4 0-2.4.8-3.8 2.5L12 10.4l-1.2-1.4C9.4 7.3 8.4 6.5 7 6.5c-2.2 0-3.6 2.3-2.6 4.5 1.4 2.9 5.2 6 7.6 7.6z"/></svg>';

  function card(e) {
    const liked = Store.isLiked(e.id);
    const org = Store.organizer(e.organizerId);
    return `<article class="card">
      <button class="icon-btn like-btn ${liked ? 'liked' : ''}" data-like="${e.id}" aria-label="Save event">${liked ? heart : heartOutline}</button>
      <a class="card-link" href="#/event/${e.id}">
        <div class="card-cover">${statusBadge(e)}${cover(e)}</div>
        <div class="card-body">
          <div class="card-title">${esc(e.title)}</div>
          <div class="card-date">${cardDate(e.start)}</div>
          <div class="card-loc">${esc(location(e))}</div>
          <div class="card-price">${priceFrom(e)}</div>
          <div class="card-meta">👤 ${esc(org.name)}${org.followers ? ' · ' + compact(org.followers) + ' followers' : ''}</div>
        </div>
      </a>
    </article>`;
  }
  const compact = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k' : String(n);

  function grid(events, emptyMsg) {
    if (!events.length) return `<div class="empty"><div class="big">🔍</div><h3>${emptyMsg || 'No events found'}</h3><p>Try a different search, date or category.</p></div>`;
    return `<div class="grid">${events.map(card).join('')}</div>`;
  }

  /* ----- modal ----- */
  let onCloseCb = null;
  function openModal(html, opts) {
    opts = opts || {};
    const root = document.getElementById('modalRoot');
    root.innerHTML = `<div class="modal-backdrop" data-close-backdrop><div class="modal ${opts.size || ''}" role="dialog" aria-modal="true">${html}</div></div>`;
    document.body.style.overflow = 'hidden';
    onCloseCb = opts.onClose || null;
    const first = root.querySelector('input, button:not(.modal-close)');
    if (first && !opts.noFocus) setTimeout(() => first.focus(), 30);
    return root.querySelector('.modal');
  }
  function closeModal() {
    const root = document.getElementById('modalRoot');
    if (!root.innerHTML) return;
    root.innerHTML = ''; document.body.style.overflow = '';
    if (onCloseCb) { const cb = onCloseCb; onCloseCb = null; cb(); }
  }
  document.addEventListener('click', ev => {
    if (ev.target.matches('[data-close-backdrop]') || ev.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeModal(); });

  let toastT;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* Decorative QR-style code, deterministic from a string (not a scannable QR standard) */
  function qr(text) {
    const n = 25; let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
    let rects = '';
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#111"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#111"/>`;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inF && rnd() > 0.52) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    return `<svg class="qr" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><g fill="#111">${rects}</g>${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
  }

  function initials(name) { return (name || '?').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase(); }

  function parseQuery(qs) {
    const o = {}; (qs || '').split('&').filter(Boolean).forEach(p => { const [k, v] = p.split('='); o[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' ')); });
    return o;
  }
  function buildQuery(o) { return Object.keys(o).filter(k => o[k] !== '' && o[k] != null).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(o[k])).join('&'); }

  function icsFor(e) {
    const f = iso => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nova//EN', 'BEGIN:VEVENT', 'UID:' + e.id + '@novaevents', 'DTSTAMP:' + f(new Date().toISOString()), 'DTSTART:' + f(e.start), 'DTEND:' + f(e.end), 'SUMMARY:' + e.title, 'LOCATION:' + location(e), 'DESCRIPTION:' + (e.summary || ''), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    a.download = e.title.replace(/[^\w]+/g, '-').toLowerCase() + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
  }

  window.UI = { photoUrl, esc, money, moneyPlain, cardDate, longDate, time, relDay, priceFrom, remaining, capacity, soldCount, location, cat, cover, card, grid, heart, heartOutline, openModal, closeModal, toast, qr, initials, parseQuery, buildQuery, icsFor, compact, statusBadge, dFmt };
})();
