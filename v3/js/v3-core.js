/* Nova v3 "Kampala after dark" — shared helpers, icons and card markup.
   Loaded after ui.js / views.js and BEFORE every v3-<page>.js file.
   Everything lives on window.N3. Styling for the classes used here is in css/v3.css. */
(function () {
  const { esc, moneyPlain, time, relDay, remaining, capacity, soldCount, cat, photoUrl, dFmt } = UI;

  /* ---------- icons: 1.8px stroke, 24px grid, square caps (design system §08) ---------- */
  const s = (inner, extra) => `<svg class="n3-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" ${extra || ''} aria-hidden="true">${inner}</svg>`;
  const IC = {
    search: s('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    date: s('<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    pin: s('<path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
    clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    save: s('<path d="M6 3h12v18l-6-4-6 4z"/>'),
    saveFill: '<svg class="n3-ic" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    share: s('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 11l7.4-3.8M8.3 13l7.4 3.8"/>'),
    car: s('<rect x="4" y="10" width="16" height="7" rx="2"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/><path d="M7 10l2-4h6l2 4"/>'),
    boda: s('<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-7h5l3 7M13 6h3"/>'),
    phone: s('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
    friends: s('<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c1-3.5 3.3-5 6-5s5 1.5 6 5M15 15c2.5 0 4.5 1.3 5.5 4"/>'),
    check: s('<path d="M5 12l5 5 9-10"/>'),
    bright: s('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>'),
    back: s('<path d="M15 5l-7 7 7 7"/>'),
    next: s('<path d="M9 5l7 7-7 7"/>'),
    arrow: s('<path d="M4 12h15M13 6l6 6-6 6"/>'),
    chev: s('<path d="M6 9l6 6 6-6"/>'),
    x: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>'),
    minus: s('<path d="M5 12h14"/>'),
    filter: s('<path d="M4 6h16M7 12h10M10 18h4"/>'),
    map: s('<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>'),
    list: s('<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>'),
    grid: s('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
    ticket: s('<path d="M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z"/>'),
    user: s('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>'),
    explore: s('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
    lock: s('<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 018 0v4"/>'),
    wa: '<svg class="n3-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 000-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.3 2.2 2.2 0 00.1-1.3c0-.1-.2-.2-.5-.3z"/></svg>',
    download: s('<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>'),
    edit: s('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    menu: s('<path d="M3 7h18M3 12h18M3 17h18"/>'),
    scan: s('<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16"/>'),
    chart: s('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    cog: s('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>')
  };

  /* ---------- formatting ---------- */
  const two = n => (n < 10 ? '0' : '') + n;
  const mon = iso => dFmt(iso, { month: 'short' }).toUpperCase();
  const dow = iso => dFmt(iso, { weekday: 'short' }).toUpperCase();
  const hhmm = iso => { const d = new Date(iso); return two(d.getHours()) + ':' + two(d.getMinutes()); }; // 24h, per design
  const dateParts = iso => { const d = new Date(iso); return { dd: two(d.getDate()), dow: dow(iso), mon: mon(iso), time: hhmm(iso), rel: relDay(iso) }; };
  const isToday = iso => relDay(iso) === 'Today';
  const isFree = e => e.tiers.every(t => t.price === 0);
  const minPrice = e => Math.min(...e.tiers.map(t => t.price));
  const money = n => n === 0 ? 'Free' : moneyPlain(n);               // "UGX 50,000"
  const priceFrom = e => { const ps = e.tiers.map(t => t.price), mn = Math.min(...ps), mx = Math.max(...ps); if (mx === 0) return 'Free'; if (mn === mx) return moneyPlain(mn); return 'From ' + moneyPlain(mn || ps.filter(p => p > 0).sort((a, b) => a - b)[0]); };
  const area = e => e.online ? 'Online' : (e.venue.address && /kololo|nakasero|kansanga|lugogo|ntinda|bugolobi|muyenga|naguru|kisementi/i.test(e.venue.name + ' ' + e.venue.address) ? (e.venue.name + ' ' + e.venue.address).match(/kololo|nakasero|kansanga|lugogo|ntinda|bugolobi|muyenga|naguru|kisementi/i)[0] : e.venue.city);
  const where = e => e.online ? 'Online' : e.venue.name + ', ' + e.venue.city;
  const kicker = e => (cat(e.category).name.split(' & ')[0] + ' · ' + area(e)).toUpperCase(); // "MUSIC · KOLOLO"
  // deterministic, demo-only "friends going" number
  const friends = e => { let h = 0; for (const c of e.id) h = (h * 31 + c.charCodeAt(0)) >>> 0; const n = (h % 23); return n < 3 ? 0 : n; };

  /* badge: { t, cls } — cls one of tonight | fast | left | free | sold | online */
  const badge = e => {
    const left = remaining(e), cap = capacity(e);
    if (new Date(e.end) < new Date()) return { t: 'Ended', cls: 'sold' };
    if (left === 0) return { t: 'Sold out', cls: 'sold' };
    if (isToday(e.start)) return { t: 'Tonight', cls: 'tonight' };
    if (left <= 20) return { t: 'Only ' + left + ' left', cls: 'left' };
    if (soldCount(e) / cap > 0.75) return { t: 'Selling fast', cls: 'fast' };
    if (isFree(e)) return { t: 'Free', cls: 'free' };
    if (e.online) return { t: 'Online', cls: 'online' };
    return null;
  };
  const badgeHtml = b => b ? `<span class="n3-badge ${b.cls}">${b.cls === 'tonight' ? '<i></i>' : ''}${esc(b.t)}</span>` : '';

  /* duotone treatment per design: nightlife/music = jacaranda, live/tonight = ember, else full colour */
  const duoFor = e => isToday(e.start) ? 'ember' : (e.category === 'music' ? 'jac' : '');
  /* img(e, w, opts) -> <div class="n3-ph [duo-jac|duo-ember]"><img …></div>
     opts: { duo: 'jac'|'ember'|'' (default auto), eager, reveal, alt, cls } */
  const img = (e, w, o) => {
    o = o || {};
    const duo = o.duo === undefined ? duoFor(e) : o.duo;
    const alt = esc(o.alt != null ? o.alt : e.title);
    let im;
    if (e.image) im = `<img src="${esc(e.image)}" alt="${alt}" loading="${o.eager ? 'eager' : 'lazy'}">`;
    else if (e.photo) im = `<img src="${photoUrl(e.photo, w)}" srcset="${photoUrl(e.photo, Math.round(w / 2))} ${Math.round(w / 2)}w, ${photoUrl(e.photo, w)} ${w}w, ${photoUrl(e.photo, Math.min(2400, w * 2))} ${Math.min(2400, w * 2)}w" sizes="${o.sizes || w + 'px'}" alt="${alt}" loading="${o.eager ? 'eager' : 'lazy'}" onerror="this.style.visibility='hidden'">`;
    else im = `<span class="n3-noimg">${esc(cat(e.category).name)}</span>`;
    return `<div class="n3-ph ${duo ? 'duo-' + duo : ''} ${o.cls || ''}" ${o.reveal ? 'data-reveal' : ''}>${im}</div>`;
  };

  const saveBtn = (e, extra) => { const on = Store.isLiked(e.id); return `<button type="button" class="n3-save ${on ? 'on' : ''} ${extra || ''}" data-like="${e.id}" aria-pressed="${on}" aria-label="${on ? 'Saved' : 'Save'} ${esc(e.title)}">${on ? IC.saveFill : IC.save}</button>`; };

  /* ---------- card variants (design system §07) ---------- */
  function cardFeature(e, o) {
    o = o || {}; const p = dateParts(e.start), b = badge(e), f = friends(e);
    return `<a class="n3-cf" href="#/event/${e.id}">
      <div class="n3-cf-img">${img(e, o.w || 640, { reveal: true, sizes: o.sizes || '(max-width: 700px) 100vw, 33vw' })}
        <div class="n3-cf-date"><b>${p.dd}</b><span>${p.dow}<br>${p.mon}</span></div>${b ? `<div class="n3-cf-badge">${badgeHtml(b)}</div>` : ''}</div>
      <div class="n3-kicker"><span>${esc(kicker(e))}</span><span>${p.time}</span></div>
      <h3 class="n3-cf-title">${esc(e.title)}</h3>
      <div class="n3-cf-foot"><b>${esc(priceFrom(e))}</b>${f ? `<span>${f} friends going</span>` : ''}</div>
    </a>`;
  }
  function cardRow(e, o) {
    o = o || {}; const p = dateParts(e.start), b = badge(e);
    return `<a class="n3-cr" href="#/event/${e.id}">
      <div class="n3-cr-date"><b>${p.dd}</b><span>${p.dow} ${p.mon}</span></div>
      <div class="n3-cr-img">${img(e, 240, { duo: '' })}</div>
      <div class="n3-cr-body"><span class="n3-kicker-s">${esc(cat(e.category).name.toUpperCase())} · ${esc((e.online ? 'ONLINE' : e.venue.name).toUpperCase())}</span><h3>${esc(e.title)}</h3><span class="n3-cr-meta">${p.time}${e.online ? ' · Online' : ' · ' + esc(e.venue.city)}${b ? ' · ' + badgeHtml(b) : ''}</span></div>
      <div class="n3-cr-end"><b>${esc(priceFrom(e).replace('From ', ''))}</b>${saveBtn(e)}</div>
    </a>`;
  }
  function cardCompact(e) {
    const p = dateParts(e.start), b = badge(e);
    return `<a class="n3-cc" href="#/event/${e.id}">
      <div class="n3-cc-img">${img(e, 400, { duo: '', sizes: '(max-width: 700px) 50vw, 240px' })}${b ? badgeHtml(b) : ''}</div>
      <span class="n3-cc-date">${p.dow} ${p.dd} · ${p.time}</span>
      <b class="n3-cc-title">${esc(e.title)}</b>
      <span class="n3-cc-where">${esc(e.online ? 'Online' : e.venue.name)}</span>
    </a>`;
  }
  function skeleton(n, kind) { return Array.from({ length: n || 3 }, () => `<div class="n3-skel ${kind || 'cc'}" aria-busy="true"><i></i><i></i><i></i><i></i></div>`).join(''); }
  /* ticket stub: order o, ticket t (o.tickets[i]), event e */
  function ticketStub(o, t, e, opt) {
    opt = opt || {}; const p = dateParts(e.start);
    const venue = e.online ? 'ONLINE' : (e.venue.name.split(' ')[0] || '').toUpperCase();
    return `<div class="n3-stub ${opt.day ? 'day' : ''}">
      <div class="n3-stub-main">
        <div class="n3-stub-top"><span>NOVA · ADMIT ONE</span><span>${esc((t.tierName || '').toUpperCase())}</span></div>
        <div class="n3-stub-title">${esc(e.title)}</div>
        <div class="n3-stub-kv"><div><small>DATE</small><b>${p.dd} ${p.mon}</b></div><div><small>DOORS</small><b>${p.time}</b></div><div><small>VENUE</small><b>${esc(venue)}</b></div></div>
        ${t.holder || (o.buyer && o.buyer.first) ? `<div class="n3-stub-name">${esc(t.holder || (o.buyer.first + ' ' + o.buyer.last))}</div>` : ''}
      </div>
      <div class="n3-stub-qr"><canvas data-qr="${esc(t.code)}" width="248" height="248" aria-label="Ticket QR code"></canvas><span>${esc(t.code)}</span></div>
      <i class="n3-notch t"></i><i class="n3-notch b"></i>
    </div>`;
  }

  /* ---------- small building blocks ---------- */
  const label = t => `<span class="n3-label">${esc(t)}</span>`;               // "NO. 14 · THIS WEEK IN KAMPALA"
  const wordmark = (night) => `<span class="n3-wordmark ${night ? 'night' : ''}" aria-label="Nova">N<span class="moon"><i></i></span>VA</span>`;
  const issueNo = () => { const d = new Date(); const start = new Date(d.getFullYear(), 0, 1); return Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7); };
  const weekRange = () => { const d = new Date(); const e = new Date(d.getTime() + 6 * 864e5); return (dow(d.toISOString()) + ' ' + d.getDate() + ' ' + mon(d.toISOString()) + ' – ' + dow(e.toISOString()) + ' ' + e.getDate() + ' ' + mon(e.toISOString())); };
  const avatars = (names, more) => `<span class="n3-avs">${names.map((n, i) => `<i style="background:${['#5CD4C7', '#FF5A1F', '#D3EEEA', '#17794F'][i % 4]}">${esc(UI.initials(n))}</i>`).join('')}${more ? `<i class="more">+${more}</i>` : ''}</span>`;

  /* ---------- search / filtering (same semantics as v2) ---------- */
  const upcoming = () => Store.upcoming().slice().sort((a, b) => new Date(a.start) - new Date(b.start));
  function dateMatch(e, d) {
    if (!d) return true;
    const s = new Date(e.start), now = new Date(), day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dd = new Date(s.getFullYear(), s.getMonth(), s.getDate()), diff = Math.round((dd - day0) / 864e5);
    if (d === 'today') return diff === 0;
    if (d === 'tomorrow') return diff === 1;
    if (d === 'weekend') { const wd = day0.getDay(); const toSat = (6 - wd + 7) % 7; const sat = wd === 0 ? -1 : toSat; return diff >= Math.max(0, sat - (wd === 5 ? 1 : 0)) && diff <= sat + 1 && [5, 6, 0].includes(s.getDay()); }
    if (d === 'week') return diff >= 0 && diff <= 7;
    if (d === 'month') return diff >= 0 && diff <= 30;
    return true;
  }
  /* filter({q, loc, date, cat:'music,food', price:'free'|'paid', online:'1'|'0', sort:''|'popular'|'price'}) */
  function filter(f) {
    f = f || {}; let list = upcoming();
    const cats = (f.cat || '').split(',').filter(Boolean).map(c => Store.catId(c));
    if (f.q) { const q = f.q.toLowerCase(); list = list.filter(e => (e.title + ' ' + e.summary + ' ' + (e.tags || []).join(' ') + ' ' + cat(e.category).name + ' ' + (e.venue ? e.venue.name + ' ' + e.venue.city : 'online')).toLowerCase().includes(q)); }
    if (f.loc && !/^(anywhere|all)$/i.test(f.loc)) { const l = f.loc.toLowerCase(); list = list.filter(e => e.online ? /online/.test(l) : (e.venue.city + ' ' + e.venue.name + ' ' + (e.venue.address || '')).toLowerCase().includes(l)); }
    if (cats.length) list = list.filter(e => cats.includes(e.category));
    if (f.date) list = list.filter(e => dateMatch(e, f.date));
    if (f.price === 'free') list = list.filter(isFree); else if (f.price === 'paid') list = list.filter(e => !isFree(e));
    if (f.online === '1') list = list.filter(e => e.online); else if (f.online === '0') list = list.filter(e => !e.online);
    if (f.sort === 'popular') list.sort((a, b) => soldCount(b) - soldCount(a));
    else if (f.sort === 'price') list.sort((a, b) => minPrice(a) - minPrice(b));
    return list;
  }
  const DATES = [['today', 'Tonight'], ['tomorrow', 'Tomorrow'], ['weekend', 'This weekend'], ['week', 'This week'], ['month', 'Next 30 days']];
  const CITIES = ['Kampala', 'Entebbe', 'Jinja', 'Nairobi'];

  window.N3 = { IC, two, dateParts, hhmm, isToday, isFree, minPrice, money, priceFrom, area, where, kicker, friends, badge, badgeHtml, img, saveBtn,
    cardFeature, cardRow, cardCompact, skeleton, ticketStub, label, wordmark, issueNo, weekRange, avatars, upcoming, filter, dateMatch, DATES, CITIES };
})();
