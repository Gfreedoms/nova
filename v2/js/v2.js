/* Nova v2 — redesigned views (Home, Search, Event, Checkout) + v2 event card.
   Built from the Claude Design redesign; reuses the v1 data store and booking logic. */
(function () {
  const V = window.Views;
  const { esc, money, moneyPlain, time, relDay, remaining, capacity, soldCount, cat, openModal, closeModal, toast, qr, initials, parseQuery, buildQuery, compact, photoUrl, dFmt } = UI;
  const locText = UI.location;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- icons (one SVG set, no emoji) ---------------- */
  const svg = (d, o) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${(o && o.w) || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    search: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.5 3a7.5 7.5 0 015.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>',
    heart: svg('M12 20s-7-4.4-8.8-8.8C2 8 4 5 7.2 5c1.9 0 3.2 1 4.8 2.8C13.6 6 14.9 5 16.8 5 20 5 22 8 20.8 11.2 19 15.6 12 20 12 20z'),
    heartFill: '<svg viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" stroke-width="2" aria-hidden="true"><path d="M12 20s-7-4.4-8.8-8.8C2 8 4 5 7.2 5c1.9 0 3.2 1 4.8 2.8C13.6 6 14.9 5 16.8 5 20 5 22 8 20.8 11.2 19 15.6 12 20 12 20z"/></svg>',
    share: svg('M12 3v12M7 8l5-5 5 5M5 14v5h14v-5'),
    back: svg('M15 5l-7 7 7 7', { w: 2.4 }),
    left: svg('M15 6l-6 6 6 6', { w: 2.4 }),
    right: svg('M9 6l6 6-6 6', { w: 2.4 }),
    chev: svg('M6 9l6 6 6-6', { w: 2.4 }),
    check: svg('M5 12.5l4.5 4.5L19 7.5', { w: 3 }),
    cal: svg('M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'),
    venue: svg('M12 21s-6-6.5-6-11a6 6 0 0112 0c0 4.5-6 11-6 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'),
    people: svg('M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c.8-4 3.6-6 7-6s6.2 2 7 6M17 11l2 2 4-4'),
    refund: svg('M3 12a9 9 0 109-9M3 4v5h5'),
    screen: svg('M3 5h18v11H3zM8 20h8M12 16v4'),
    filter: svg('M4 6h16M7 12h10M10 18h4', { w: 2.2 }),
    lock: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3z"/></svg>',
    clock: svg('M12 21a8 8 0 100-16 8 8 0 000 16zM12 9v4l2.5 2M9 2h6', { w: 2.2 }),
    verified: '<svg viewBox="0 0 24 24" width="17" height="17" aria-label="Verified organiser"><circle cx="12" cy="12" r="10" fill="#007bff"/><path d="M7.5 12.3l3 3 6-6.2" stroke="#fff" stroke-width="2.4" fill="none"/></svg>',
    x: svg('M6 6l12 12M18 6L6 18', { w: 2.4 })
  };
  const SEED_ORGS = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8'];

  /* ---------------- formatting helpers ---------------- */
  const isToday = iso => relDay(iso) === 'Today';
  const whenLabel = iso => {
    const r = relDay(iso);
    if (r === 'Today') return 'Tonight · ' + time(iso).replace(':00', ':00');
    if (r === 'Tomorrow') return 'Tomorrow · ' + time(iso);
    return dFmt(iso, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + time(iso);
  };
  const priceLabel = e => {
    const ps = e.tiers.map(t => t.price); const min = Math.min(...ps), max = Math.max(...ps);
    if (max === 0) return 'Free';
    if (min === max) return moneyPlain(min);
    return min === 0 ? 'Free – ' + moneyPlain(max) : 'From ' + moneyPlain(min);
  };
  const priceFrom = e => { const min = Math.min(...e.tiers.map(t => t.price)); return min === 0 ? 'Free' : moneyPlain(min); };
  const whereLabel = e => e.online ? 'Online' : e.venue.name + ' · ' + e.venue.city;
  const badgeFor = e => {
    const left = remaining(e), cap = capacity(e);
    if (new Date(e.end) < new Date()) return { t: 'Ended', hot: false };
    if (left === 0) return { t: 'Sold out', hot: true };
    if (left <= 20) return { t: left + ' left', hot: true };
    if (isToday(e.start)) return { t: 'Tonight', hot: true };
    if (soldCount(e) / cap > 0.8) return { t: 'Selling fast', hot: true };
    if (e.tiers.every(t => t.price === 0)) return { t: 'Free', hot: false };
    if (e.online) return { t: 'Online', hot: false };
    return null;
  };
  const img = (e, w, sizes, eager) => {
    const bg = `background:${UI.cover ? '' : ''}`;
    if (e.image) return `<img src="${esc(e.image)}" alt="" loading="${eager ? 'eager' : 'lazy'}">`;
    if (e.photo) return `<img src="${photoUrl(e.photo, w)}" srcset="${photoUrl(e.photo, Math.round(w / 2))} ${Math.round(w / 2)}w, ${photoUrl(e.photo, w)} ${w}w, ${photoUrl(e.photo, w * 2)} ${w * 2}w" sizes="${sizes || '300px'}" alt="" loading="${eager ? 'eager' : 'lazy'}" onerror="this.style.display='none'">`;
    return `<span class="n2-noimg">${esc(cat(e.category).name)}</span>`;
  };
  const daysUntil = iso => { const d = new Date(iso); const t = new Date(); t.setHours(0, 0, 0, 0); const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return Math.round((dd - t) / 86400000); };

  /* ---------------- v2 event card (replaces UI.card everywhere) ---------------- */
  function card(e, layout) {
    const liked = Store.isLiked(e.id), b = badgeFor(e);
    const likeBtn = `<button class="n2-like ${liked ? 'on' : ''}" data-like="${e.id}" aria-label="${liked ? 'Remove from likes' : 'Save event'}" aria-pressed="${liked}">${liked ? IC.heartFill : IC.heart}</button>`;
    if (layout === 'row') return `<article class="n2-card n2-card-row">
      <a href="#/event/${e.id}" class="n2-card-link"><div class="n2-card-img">${img(e, 240, '104px')}</div>
      <div class="n2-card-body"><span class="n2-when">${esc(whenLabel(e.start))}</span><span class="n2-title">${esc(e.title)}</span><span class="n2-where">${esc(whereLabel(e))}</span>
      <span class="n2-price">${esc(priceLabel(e))}${b && b.hot ? ` <em class="n2-hot">· ${esc(b.t)}</em>` : ''}</span></div></a>${likeBtn}</article>`;
    return `<article class="n2-card">
      <a href="#/event/${e.id}" class="n2-card-link">
        <div class="n2-card-img">${img(e, 520, '(max-width: 700px) 100vw, 320px')}${b ? `<span class="n2-badge ${b.hot ? 'hot' : ''}">${esc(b.t)}</span>` : ''}</div>
        <div class="n2-card-body"><span class="n2-when">${esc(whenLabel(e.start))}</span><span class="n2-title">${esc(e.title)}</span><span class="n2-where">${esc(whereLabel(e))}</span><span class="n2-price">${esc(priceLabel(e))}</span></div>
      </a>${likeBtn}</article>`;
  }
  function grid(events, emptyMsg, cls) {
    if (!events.length) return `<div class="n2-empty"><div class="n2-empty-ic">${svg('M10.5 3a7.5 7.5 0 015.9 12.1l4.3 4.3M10.5 5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z')}</div><h3>${esc(emptyMsg || 'No events found')}</h3><p>Try a different date, category or city.</p><a class="n2-btn-outline" href="#/search">Clear filters</a></div>`;
    return `<div class="n2-grid ${cls || ''}">${events.map(e => card(e)).join('')}</div>`;
  }
  UI.card = card; UI.grid = grid; UI.heart = IC.heartFill; UI.heartOutline = IC.heart;

  /* ---------------- filtering (multi-category) ---------------- */
  function dateRange(key) {
    const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(s);
    if (key === 'today') e.setDate(e.getDate() + 1);
    else if (key === 'tomorrow') { s.setDate(s.getDate() + 1); e.setDate(e.getDate() + 2); }
    else if (key === 'weekend') { const d = s.getDay(); e.setDate(e.getDate() + (d === 0 ? 1 : 8 - d)); if (d >= 1 && d <= 4) s.setDate(s.getDate() + (5 - d)); }
    else if (key === 'week') e.setDate(e.getDate() + 7);
    else if (key === 'month') e.setDate(e.getDate() + 31);
    else return null;
    return [s.getTime(), e.getTime()];
  }
  const DATES = [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['weekend', 'This weekend'], ['week', 'This week'], ['month', 'Next 30 days']];
  function filter(list, f) {
    const q = (f.q || '').trim().toLowerCase(), loc = (f.loc || '').trim().toLowerCase();
    const cats = (f.cat || '').split(',').filter(Boolean).map(Store.catId);
    const range = dateRange(f.date);
    let out = list.filter(e => {
      if (q) { const hay = [e.title, e.summary, e.description, (e.tags || []).join(' '), Store.organizer(e.organizerId).name, cat(e.category).name].join(' ').toLowerCase(); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
      if (loc && loc !== 'anywhere') { if (loc === 'online') { if (!e.online) return false; } else if (!e.venue || !(e.venue.city + ' ' + e.venue.name + ' ' + e.venue.country).toLowerCase().includes(loc)) return false; }
      if (cats.length && !cats.includes(e.category)) return false;
      if (f.online === '1' && !e.online) return false;
      if (f.online === '0' && e.online) return false;
      if (f.price === 'free' && !e.tiers.some(t => t.price === 0)) return false;
      if (f.price === 'paid' && !e.tiers.some(t => t.price > 0)) return false;
      if (range) { const t = new Date(e.start).getTime(); if (t < range[0] || t >= range[1]) return false; }
      return true;
    });
    if (f.sort === 'price') out.sort((a, b) => Math.min(...a.tiers.map(t => t.price)) - Math.min(...b.tiers.map(t => t.price)));
    else if (f.sort === 'popular') out.sort((a, b) => soldCount(b) - soldCount(a));
    return out;
  }

  /* ================================================================ HOME */
  const WORDS = ['concert', 'food festival', 'night out', 'conference'];
  function home() {
    const ev = Store.upcoming();
    const week = ev.filter(e => daysUntil(e.start) < 7);
    const byPop = ev.slice().sort((a, b) => soldCount(b) - soldCount(a));
    const deck = byPop.filter(e => e.venue && e.venue.city === 'Kampala' && daysUntil(e.start) < 14).slice(0, 4);
    const trending = byPop.slice(0, 6);
    const lead = week[0] || ev[0];
    const weekRest = week.filter(e => e !== lead).slice(0, 4);
    const booked = ev.reduce((s, e) => s + soldCount(e), 0);
    const quick = [['Tonight', 'date=today'], ['This weekend', 'date=weekend'], ['Free', 'price=free'], ['Live music', 'cat=music'], ['Food & drink', 'cat=food']];
    const pills = [['all', 'All'], ['today', 'Today'], ['weekend', 'This weekend'], ['free', 'Free'], ['online', 'Online'], ['music', 'Music & Nightlife'], ['food', 'Food & Drink'], ['business', 'Business & Tech']];
    const heroPhoto = Store.photos.crowd;
    return `
    <section class="n2-hero">
      <img class="n2-hero-bg" src="${photoUrl(heroPhoto, 1800)}" srcset="${photoUrl(heroPhoto, 900)} 900w, ${photoUrl(heroPhoto, 1800)} 1800w" sizes="100vw" alt="" fetchpriority="high">
      <div class="n2-hero-shade"></div>
      <div class="n2-wrap n2-hero-grid">
        <div class="n2-hero-copy">
          <span class="n2-live"><i></i>${week.length} event${week.length === 1 ? '' : 's'} this week in Kampala</span>
          <h1>Find your next<span class="n2-rot" id="n2Rot"><span class="n2-rot-w">${WORDS[0]}</span></span></h1>
          <p class="n2-lead"><span class="d-only">Concerts, food festivals, rooftop sessions and more. Book in seconds with Mobile Money and your ticket lands on your phone.</span><span class="m-only">Book in seconds with Mobile Money. Your ticket lands on your phone.</span></p>
          <form class="n2-bigsearch" id="heroSearch" role="search">
            <label class="bs-f bs-what"><span>What</span><i class="bs-ic">${IC.search}</i><input name="q" placeholder="Events, artists, topics" autocomplete="off"></label>
            <span class="bs-div"></span>
            <label class="bs-f bs-where"><span>Where</span><i class="bs-ic pin">${IC.pin}</i><input name="loc" value="Kampala" autocomplete="off"></label>
            <span class="bs-div"></span>
            <label class="bs-f bs-when"><span>When</span><select name="date"><option value="">Any date</option>${DATES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
            <button type="submit">${IC.search}<span>Search</span></button>
          </form>
          <div class="n2-quick">${quick.map(([l, q]) => `<a href="#/search?${q}">${l}</a>`).join('')}</div>
          <div class="n2-trust"><span><strong>${booked.toLocaleString('en-US')}</strong> tickets booked this month</span><i></i><span class="n2-paywith">Pay with <b class="pay-mtn">MTN MoMo</b><b class="pay-airtel">Airtel Money</b><b class="pay-card">Card</b></span></div>
        </div>
        <div class="n2-deck" id="n2Deck" aria-label="Featured this week">
          ${deck.map((e, i) => `<a class="n2-dcard" data-i="${i}" href="#/event/${e.id}" aria-hidden="${i ? 'true' : 'false'}" tabindex="${i ? -1 : 0}">
            ${img(e, 760, '380px', i === 0)}<div class="n2-dshade"></div>
            <span class="n2-datechip"><small>${dFmt(e.start, { month: 'short' })}</small><b>${new Date(e.start).getDate()}</b></span>
            <div class="n2-dbody"><span class="n2-dwhen">${esc(dFmt(e.start, { weekday: 'short' }))} · ${time(e.start)}</span><span class="n2-dtitle">${esc(e.title)}</span><span class="n2-dwhere">${esc(whereLabel(e))}</span>
              <div class="n2-drow"><span>${priceFrom(e) === 'Free' ? 'Free' : 'From ' + priceFrom(e)}</span><span class="n2-dbtn" data-go-checkout="${e.id}">Get tickets</span></div></div>
          </a>`).join('')}
        </div>
      </div>
    </section>

    <section class="n2-sec n2-wrap">
      <div class="n2-head"><h2>What are you into?</h2><a class="d-only" href="#/search">All categories →</a></div>
      <div class="n2-cats">${Store.categories.map(c => `<a class="n2-cat" href="#/search?cat=${c.id}"><div>${`<img src="${photoUrl(c.photo, 320)}" alt="" loading="lazy">`}</div><b>${esc(c.name)}</b><small>${ev.filter(e => e.category === c.id).length} upcoming</small></a>`).join('')}</div>
    </section>

    <section class="n2-sec n2-trendsec">
      <div class="n2-wrap n2-head"><div><span class="n2-kicker sunset">Trending now</span><h2>What Kampala is booking</h2></div>
        <div class="n2-arrows"><button class="n2-round" data-trend="-1" aria-label="Previous">${IC.left}</button><button class="n2-round ink" data-trend="1" aria-label="Next">${IC.right}</button></div></div>
      <div class="n2-trend-wrap"><div class="n2-trend" id="n2Trend">
        ${trending.map((e, i) => `<a class="n2-titem" href="#/event/${e.id}"><span class="n2-num">${i + 1}</span><div class="n2-tcard"><div class="n2-timg">${img(e, 500, '250px')}<span class="n2-num-m">${i + 1}</span></div>
          <span class="n2-when">${esc(whenLabel(e.start))}</span><span class="n2-title">${esc(e.title)}</span><span class="n2-where"><span class="d-only">${esc(e.online ? 'Online' : e.venue.city)} · </span>${esc(priceLabel(e) === 'Free' ? 'Free' : priceLabel(e).startsWith('From') ? priceLabel(e) : 'From ' + priceLabel(e))}</span></div></a>`).join('')}
      </div></div>
    </section>

    ${lead ? `<section class="n2-sec n2-wrap">
      <div class="n2-head"><div><span class="n2-kicker d-only">This week</span><h2><span class="d-only">Don't miss this week</span><span class="m-only">This week</span></h2></div><a href="#/search?date=week"><span class="d-only">See the full week →</span><span class="m-only">See all</span></a></div>
      <div class="n2-bento">
        <a class="n2-bt n2-bt-lead" href="#/event/${lead.id}">${img(lead, 1200, '(max-width: 860px) 100vw, 560px')}<div class="n2-bshade"></div>
          <span class="n2-badge hot lg">${esc(whenLabel(lead.start))}</span>
          <div class="n2-bbody"><div><b>${esc(lead.title)}</b><span><span class="d-only">${esc(whereLabel(lead))}</span><span class="m-only">${esc(lead.online ? 'Online' : lead.venue.name)}</span> · ${esc(priceLabel(lead))}</span></div><span class="n2-btn-blue" data-go-checkout="${lead.id}">Get tickets</span></div></a>
        ${weekRest.map(e => `<a class="n2-bt" href="#/event/${e.id}">${img(e, 640, '300px')}<div class="n2-bshade"></div><span class="n2-badge">${esc(relDay(e.start) === 'Today' || relDay(e.start) === 'Tomorrow' ? relDay(e.start) : dFmt(e.start, { weekday: 'short' }) + ' · ' + time(e.start))}</span>
          <div class="n2-bbody small"><div><b>${esc(e.title)}</b><span>${esc(e.online ? 'Online' : e.venue.city)} · ${esc(priceLabel(e))}</span></div></div></a>`).join('')}
      </div>
      <div class="n2-weeklist">${weekRest.map(e => card(e, 'row')).join('')}</div>
    </section>` : ''}

    <section class="n2-sec n2-wrap n2-allsec">
      <div class="n2-head"><h2>All upcoming events</h2><a href="#/search">See all ${ev.length} events →</a></div>
      <div class="n2-pills" id="homePills" role="tablist">${pills.map(([k, l], i) => `<button class="n2-pill ${i ? '' : 'on'}" data-f="${k}" role="tab" aria-selected="${!i}">${l}</button>`).join('')}</div>
      <div id="homeGrid">${grid(ev.slice(0, 8))}</div>
      <div class="n2-center"><button class="n2-btn-outline lg" id="homeMore" ${ev.length <= 8 ? 'hidden' : ''}>Show ${Math.min(8, ev.length - 8)} more events</button></div>
    </section>

    <section class="n2-sec n2-wrap">
      <div class="n2-head"><h2>Explore by city</h2></div>
      <div class="n2-cities">${Store.cities.map(c => { const n = ev.filter(e => e.venue && e.venue.city === c.name).length; return `<a class="n2-city" href="#/search?loc=${encodeURIComponent(c.name)}"><img src="${photoUrl(c.photo, 600)}" alt="" loading="lazy"><div class="n2-bshade"></div><span><b>${c.name}</b><small>${n} event${n === 1 ? '' : 's'}</small></span></a>`; }).join('')}</div>
    </section>

    <section class="n2-sec n2-wrap">
      <div class="n2-org">
        <div class="n2-org-copy">
          <span class="n2-org-k"><img src="logo2.png" alt="" width="32" height="32">For organisers</span>
          <h2>Host events people love to show up to</h2>
          <p>Sell with Mobile Money, card or bank. Free events cost nothing. Paid tickets are 3.5% + UGX 1,000, and payouts go straight to your MoMo.</p>
          <div class="n2-org-cta"><a class="n2-btn-white" href="#/create">Create an event</a><a href="#/pricing">See pricing →</a></div>
        </div>
        <div class="n2-org-img"><img src="${photoUrl(Store.photos.stage, 1000)}" alt="" loading="lazy"></div>
      </div>
    </section>

    <section class="n2-wrap n2-newsec">
      <form class="n2-news" id="newsForm">
        <div><b>The weekly lineup</b><span>The best events in your city, every Thursday morning. No spam.</span></div>
        <div class="n2-news-row"><input class="n2-input" type="email" required placeholder="you@example.com" aria-label="Email address"><button class="n2-btn-ink">Subscribe</button></div>
      </form>
    </section>`;
  }

  function homeMount() {
    const all = Store.upcoming();
    // search
    $('#heroSearch').onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target); window.location.hash = '#/search?' + buildQuery({ q: f.get('q'), loc: f.get('loc'), date: f.get('date') }); };
    // rotating word
    const rot = $('#n2Rot'); let wi = 0;
    if (rot && !reduceMotion()) {
      const iv = setInterval(() => {
        if (!document.body.contains(rot)) return clearInterval(iv);
        wi = (wi + 1) % WORDS.length;
        rot.innerHTML = `<span class="n2-rot-w">${WORDS[wi]}</span>`;
      }, 2400);
    }
    // deck shuffle
    const deck = $('#n2Deck');
    if (deck) {
      const cards = $$('.n2-dcard', deck); const n = cards.length; let top = 0, paused = false;
      const layout = () => cards.forEach((c, i) => { const d = (i - top + n) % n; c.dataset.d = d; c.setAttribute('aria-hidden', d ? 'true' : 'false'); c.tabIndex = d ? -1 : 0; });
      layout();
      if (n > 1 && !reduceMotion()) {
        const iv = setInterval(() => { if (!document.body.contains(deck)) return clearInterval(iv); if (!paused && !document.hidden) { top = (top + 1) % n; layout(); } }, 3600);
      }
      deck.addEventListener('mouseenter', () => paused = true); deck.addEventListener('mouseleave', () => paused = false);
    }
    // "Get tickets" chips inside card links → go straight to checkout
    $$('[data-go-checkout]').forEach(b => b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); window.location.hash = '#/checkout/' + b.dataset.goCheckout; }));
    // trending arrows
    $$('[data-trend]').forEach(b => b.onclick = () => $('#n2Trend').scrollBy({ left: +b.dataset.trend * 560, behavior: 'smooth' }));
    // pills + show more
    let list = all, shown = 8;
    const paint = () => { $('#homeGrid').innerHTML = grid(list.slice(0, shown), 'Nothing here yet'); const m = $('#homeMore'); m.hidden = list.length <= shown; m.textContent = `Show ${Math.min(8, list.length - shown)} more events`; };
    $('#homePills').addEventListener('click', ev => {
      const b = ev.target.closest('.n2-pill'); if (!b) return;
      $$('#homePills .n2-pill').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
      const f = b.dataset.f;
      list = filter(all, { date: ['today', 'weekend'].includes(f) ? f : '', price: f === 'free' ? 'free' : '', online: f === 'online' ? '1' : '', cat: ['music', 'food', 'business'].includes(f) ? f : '' });
      shown = 8; paint();
    });
    $('#homeMore').onclick = () => { shown += 8; paint(); };
    $('#newsForm').onsubmit = ev => { ev.preventDefault(); ev.target.innerHTML = '<div><b>You\'re on the list</b><span>Look out for your first lineup on Thursday morning.</span></div>'; };
  }

  /* ================================================================ SEARCH */
  function search(qs) { return `<div class="n2-search" id="n2Search"></div>`; }
  function searchMount(qs) {
    const f = parseQuery(qs); if (f.cat) f.cat = f.cat.split(',').map(Store.catId).join(',');
    let shown = 9;
    const root = $('#n2Search');
    const catsOn = () => (f.cat || '').split(',').filter(Boolean);
    const nFilters = () => ['date', 'price', 'online'].filter(k => f[k]).length + catsOn().length + (f.loc ? 1 : 0);
    const seg = (name, opts) => `<div class="n2-seg" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${(f[name] || '') === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const catList = counts => Store.categories.map(c => `<label class="n2-check"><input type="checkbox" data-cat="${c.id}" ${catsOn().includes(c.id) ? 'checked' : ''}><span class="box">${IC.check}</span><span class="lbl">${esc(c.name)}</span><span class="cnt">${counts[c.id] || 0}</span></label>`).join('');
    const title = () => {
      if (f.q) return `Results for “${esc(f.q)}”`;
      const cs = catsOn(); const c1 = cs.length === 1 ? cat(cs[0]).name : '';
      const where = f.online === '1' ? 'online' : (f.loc ? 'in ' + esc(f.loc) : '');
      if (c1) return `${esc(c1)} ${where ? where : 'events'}`.replace(/^(.*) (in .*)$/, '$1 events $2');
      return where ? `Events ${where}` : 'All events';
    };
    const paint = () => {
      const base = Store.upcoming();
      const list = filter(base, f);
      const counts = {}; filter(base, Object.assign({}, f, { cat: '' })).forEach(e => counts[e.category] = (counts[e.category] || 0) + 1);
      const chips = [];
      if (f.loc) chips.push(['loc', f.loc]);
      if (f.date) chips.push(['date', (DATES.find(d => d[0] === f.date) || [0, f.date])[1]]);
      catsOn().forEach(c => chips.push(['cat:' + c, cat(c).name]));
      if (f.price) chips.push(['price', f.price === 'free' ? 'Free' : 'Paid']);
      if (f.online) chips.push(['online', f.online === '1' ? 'Online' : 'In person']);
      if (f.q) chips.push(['q', '“' + f.q + '”']);
      const sortLabel = { '': 'soonest', popular: 'most popular', price: 'lowest price' }[f.sort || ''];
      root.innerHTML = `
        <div class="n2-mbar">
          <a class="n2-iconbtn" href="#/" aria-label="Back">${IC.back}</a>
          <form class="n2-mpill" id="mSearchForm"><span class="ic">${IC.search}</span><span class="txt"><input name="q" value="${esc(f.q || '')}" placeholder="${esc(f.loc || 'Kampala')}" aria-label="Search events"><small>${esc((DATES.find(d => d[0] === f.date) || [0, 'Any date'])[1])} · ${f.price === 'free' ? 'Free' : f.price === 'paid' ? 'Paid' : 'Any price'}</small></span></form>
        </div>
        <div class="n2-mchips">
          <button class="n2-chip ink" id="openSheet">${IC.filter}Filters${nFilters() ? ' · ' + nFilters() : ''}</button>
          ${DATES.map(([v, l]) => `<button class="n2-chip ${f.date === v ? 'on' : ''}" data-date="${v}">${l}</button>`).join('')}
        </div>
        <div class="n2-shead">
          <div class="n2-wrap">
            <div class="n2-shead-top">
              <div><h1>${title()}</h1><span class="n2-sub">${list.length} event${list.length === 1 ? '' : 's'} · sorted by ${sortLabel}</span></div>
              <div class="n2-stools">
                <label class="n2-select"><span class="sr-only">Sort</span><select id="sortSel"><option value="">Sort: Soonest</option><option value="popular" ${f.sort === 'popular' ? 'selected' : ''}>Sort: Most popular</option><option value="price" ${f.sort === 'price' ? 'selected' : ''}>Sort: Lowest price</option></select>${IC.chev}</label>
                <div class="n2-seg" id="viewSeg"><button data-view="grid" class="${f.view !== 'list' ? 'on' : ''}">Grid</button><button data-view="list" class="${f.view === 'list' ? 'on' : ''}">List</button></div>
              </div>
            </div>
            <div class="n2-srow">
              ${DATES.map(([v, l]) => `<button class="n2-pill ${f.date === v ? 'on' : ''}" data-date="${v}">${l}</button>`).join('')}
              ${chips.length ? `<span class="n2-vdiv2"></span>${chips.map(([k, l]) => `<button class="n2-fchip" data-rm="${k}">${esc(l)}<span aria-label="Remove">✕</span></button>`).join('')}<button class="n2-link" id="clearAll">Clear all</button>` : ''}
            </div>
          </div>
        </div>
        <div class="n2-wrap n2-sbody">
          <aside class="n2-filters" aria-label="Filters">
            <div class="n2-fgroup"><span class="n2-flabel">Category</span>${catList(counts)}</div>
            <div class="n2-fgroup"><span class="n2-flabel">Price</span>${seg('price', [['', 'Any'], ['free', 'Free'], ['paid', 'Paid']])}</div>
            <div class="n2-fgroup"><span class="n2-flabel">Format</span>${seg('online', [['', 'All'], ['0', 'In person'], ['1', 'Online']])}</div>
            <div class="n2-savebox"><b>Get this search weekly</b><span>We'll email you new events matching these filters.</span><button class="n2-btn-outline sm" id="saveSearch">Save search</button></div>
          </aside>
          <div class="n2-results">
            <div class="n2-mcount"><b>${list.length} event${list.length === 1 ? '' : 's'}</b><label class="n2-msort"><span class="sr-only">Sort</span><select id="sortSelM"><option value="">Soonest</option><option value="popular" ${f.sort === 'popular' ? 'selected' : ''}>Most popular</option><option value="price" ${f.sort === 'price' ? 'selected' : ''}>Lowest price</option></select>${IC.chev}</label></div>
            ${list.length ? `<div class="n2-grid n2-grid3 ${f.view === 'list' ? 'is-list' : ''}">${list.slice(0, shown).map(e => card(e)).join('')}</div>
              <div class="n2-mlist">${list.slice(0, shown).map(e => card(e, 'row')).join('')}</div>` : grid([], 'No events match these filters')}
            ${list.length > shown ? `<div class="n2-more"><span>Showing ${shown} of ${list.length}</span><button class="n2-btn-outline lg" id="showMore">Show ${Math.min(9, list.length - shown)} more</button></div>` : ''}
          </div>
        </div>
        ${list.some(e => !e.online) ? `<button class="n2-mapfab m-only" id="openMap">${IC.pin || ''}Map</button>` : ''}
        <div class="n2-mapview" id="mapView" hidden>
          <div class="n2-mapview-head"><button class="n2-iconbtn" id="closeMap" aria-label="Back to list">${IC.back}</button><b>${esc(f.loc || 'Kampala')} · ${list.filter(e => !e.online).length} in person</b></div>
          <iframe id="mapFrame" title="Map of events" loading="lazy"></iframe>
          <div class="n2-mapcards">${list.filter(e => !e.online).map((e, i) => `<div class="n2-mapcard ${i === 0 ? 'on' : ''}" data-mq="${esc(e.venue.name + ', ' + (e.venue.city || f.loc || 'Kampala'))}">${card(e, 'row')}</div>`).join('')}</div>
        </div>
        <div class="n2-sheet" id="fSheet" hidden>
          <div class="n2-sheet-bg" data-close-sheet></div>
          <div class="n2-sheet-panel" role="dialog" aria-modal="true" aria-label="Filters">
            <div class="n2-sheet-grab"></div>
            <div class="n2-sheet-head"><button class="n2-iconbtn" data-close-sheet aria-label="Close">${IC.x}</button><b>Filters</b><button class="n2-link" id="sheetReset">Reset</button></div>
            <div class="n2-sheet-body">
              <div class="n2-fgroup"><span class="n2-flabel">When</span><div class="n2-wrapchips">${DATES.map(([v, l]) => `<button class="n2-chip sq ${f.date === v ? 'on' : ''}" data-date="${v}">${l}</button>`).join('')}</div></div>
              <div class="n2-fgroup"><span class="n2-flabel">Price</span>${seg('price', [['', 'Any'], ['free', 'Free'], ['paid', 'Paid']])}</div>
              <div class="n2-fgroup"><span class="n2-flabel">Format</span>${seg('online', [['', 'All'], ['0', 'In person'], ['1', 'Online']])}</div>
              <div class="n2-fgroup big"><span class="n2-flabel">Category</span>${catList(counts)}</div>
            </div>
            <div class="n2-sheet-foot"><button class="n2-btn-blue block" data-close-sheet>Show ${list.length} event${list.length === 1 ? '' : 's'}</button></div>
          </div>
        </div>`;
      history.replaceState(null, '', '#/search' + (buildQuery(f) ? '?' + buildQuery(f) : ''));
      bind();
    };
    const set = (k, v) => { if (v) f[k] = v; else delete f[k]; shown = 9; };
    const bind = () => {
      const sheetOpen = !$('#fSheet').hidden;
      $$('[data-date]', root).forEach(b => b.onclick = () => { set('date', f.date === b.dataset.date ? '' : b.dataset.date); rerender(); });
      $$('[data-seg] button', root).forEach(b => b.onclick = () => { set(b.parentElement.dataset.seg, b.dataset.v); rerender(); });
      $$('[data-cat]', root).forEach(c => c.onchange = () => { const s = new Set(catsOn()); c.checked ? s.add(c.dataset.cat) : s.delete(c.dataset.cat); set('cat', [...s].join(',')); rerender(); });
      $$('[data-rm]', root).forEach(b => b.onclick = () => { const k = b.dataset.rm; if (k.startsWith('cat:')) { set('cat', catsOn().filter(c => c !== k.slice(4)).join(',')); } else set(k, ''); rerender(); });
      const ca = $('#clearAll'); if (ca) ca.onclick = () => { ['q', 'loc', 'date', 'cat', 'price', 'online'].forEach(k => delete f[k]); rerender(); };
      $('#sortSel').onchange = ev => { set('sort', ev.target.value); rerender(); };
      const sm2 = $('#sortSelM'); if (sm2) sm2.onchange = ev => { set('sort', ev.target.value); rerender(); };
      $$('#viewSeg button').forEach(b => b.onclick = () => { set('view', b.dataset.view === 'list' ? 'list' : ''); rerender(); });
      const sm = $('#showMore'); if (sm) sm.onclick = () => { shown += 9; paint(); };
      $('#saveSearch').onclick = () => { if (!Store.user()) return Auth.open('signup', () => toast('Search saved — we\'ll email you weekly')); toast('Search saved — we\'ll email you weekly'); };
      $('#mSearchForm').onsubmit = ev => { ev.preventDefault(); set('q', new FormData(ev.target).get('q').trim()); rerender(); };
      $('#openSheet').onclick = () => { $('#fSheet').hidden = false; document.body.style.overflow = 'hidden'; };
      $$('[data-close-sheet]', root).forEach(b => b.onclick = () => { $('#fSheet').hidden = true; document.body.style.overflow = ''; });
      $('#sheetReset').onclick = () => { ['date', 'cat', 'price', 'online'].forEach(k => delete f[k]); rerender(); };
      const mapSrc = q => 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=14&output=embed';
      const om = $('#openMap'); if (om) om.onclick = () => {
        const first = $('.n2-mapcard'); $('#mapFrame').src = mapSrc(first ? first.dataset.mq : (f.loc || 'Kampala'));
        $('#mapView').hidden = false; document.body.style.overflow = 'hidden';
      };
      $('#closeMap').onclick = () => { $('#mapView').hidden = true; document.body.style.overflow = ''; };
      $$('.n2-mapcard').forEach(c => c.addEventListener('click', ev => {
        if (c.classList.contains('on')) return;
        ev.preventDefault(); ev.stopPropagation();
        $$('.n2-mapcard').forEach(x => x.classList.remove('on')); c.classList.add('on');
        $('#mapFrame').src = mapSrc(c.dataset.mq);
      }, true));
      if (sheetOpen) { $('#fSheet').hidden = false; }
    };
    const rerender = () => { const open = $('#fSheet') && !$('#fSheet').hidden; paint(); if (open) $('#fSheet').hidden = false; };
    paint();
  }

  /* ================================================================ EVENT */
  function share(e) {
    const url = window.location.href.split('?')[0], enc = encodeURIComponent;
    openModal(`<div class="modal-head"><h3>Share this event</h3><button class="modal-close" data-close aria-label="Close">×</button></div>
      <div class="modal-body">
        <div class="field"><label>Event link</label><div style="display:flex;gap:8px"><input class="input" id="shareUrl" readonly value="${esc(url)}"><button class="n2-btn-blue" id="copyUrl">Copy</button></div></div>
        <div class="n2-sharegrid">
          <a class="n2-btn-outline" target="_blank" rel="noopener" href="https://wa.me/?text=${enc(e.title + ' ' + url)}"><i class="dot wa"></i>WhatsApp</a>
          <a class="n2-btn-outline" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${enc(e.title)}&url=${enc(url)}">X / Twitter</a>
          <a class="n2-btn-outline" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}">Facebook</a>
          <a class="n2-btn-outline" href="mailto:?subject=${enc(e.title)}&body=${enc(url)}">Email</a>
        </div>
      </div>`, { size: 'sm', noFocus: true });
    $('#copyUrl').onclick = () => { const i = $('#shareUrl'); i.select(); try { navigator.clipboard.writeText(i.value); } catch (x) { document.execCommand('copy'); } toast('Link copied'); };
  }
  function eventPage(id) {
    const e = Store.getEvent(id);
    if (!e) return V.notFound('That event could not be found. It may have been removed.');
    const org = Store.organizer(e.organizerId), c = cat(e.category);
    const ended = new Date(e.end) < new Date(), left = remaining(e);
    const following = Store.isFollowing(org.id), liked = Store.isLiked(e.id);
    const dur = Math.round((new Date(e.end) - new Date(e.start)) / 3600000 * 10) / 10;
    const allFree = e.tiers.every(t => t.price === 0);
    const cta = ended ? 'Event has ended' : left === 0 ? 'Sold out' : allFree ? 'Reserve a spot' : 'Get tickets';
    const dis = ended || left === 0 ? 'disabled aria-disabled="true"' : '';
    const dn = daysUntil(e.start);
    const inDays = dn <= 0 ? 'today' : dn === 1 ? 'tomorrow' : 'in ' + dn + ' days';
    const mapQ = e.venue ? encodeURIComponent(e.venue.name + ', ' + e.venue.address + ', ' + e.venue.city) : '';
    const more = Store.upcoming().filter(x => x.id !== e.id && (x.category === e.category || x.organizerId === e.organizerId)).slice(0, 4);
    const facts = [
      [IC.cal, UI.longDate(e.start).replace(/, \d{4}$/, ''), `${time(e.start)} – ${time(e.end)} · ${dur} hrs`],
      e.online ? [IC.screen, 'Online event', 'Joining link sent after booking'] : [IC.venue, e.venue.name, e.venue.address + ', ' + e.venue.city],
      [IC.people, e.ageLimit + ' · ' + (e.online ? 'Online' : 'In person'), allFree ? 'Free entry, registration required' : 'Mobile ticket, shown at the door'],
      [IC.refund, e.refund.replace(/\.$/, '').replace('Refunds available up to', 'Refunds up to'), /No refunds/.test(e.refund) ? 'Tickets can\'t be refunded' : 'Full refund to your MoMo or card']
    ];
    const tierHtml = e.tiers.map(t => { const l = t.qty - t.sold; return `<div class="n2-tier ${l <= 0 ? 'out' : ''}"><div><b>${esc(t.name)}</b>${t.desc ? `<span>${esc(t.desc)}</span>` : ''}${l > 0 && l <= 20 ? `<em>Only ${l} left</em>` : ''}${l <= 0 ? '<em>Sold out</em>' : ''}</div><div class="n2-tier-p"><b>${money(t.price)}</b>${t.price ? `<span>+ ${moneyPlain(Store.feeFor(t.price, 1))} fee</span>` : ''}</div></div>`; }).join('');
    const low = e.tiers.find(t => t.qty - t.sold > 0 && t.qty - t.sold <= 20);
    const sections = [['about', 'About']].concat([['tickets', 'Tickets']], e.agenda && e.agenda.length ? [['agenda', 'Agenda']] : [], [['location', 'Location'], ['faq', 'FAQ'], ['organizer', 'Organiser']]);
    const faq = (e.faq || []).concat([{ q: 'What is the refund policy?', a: e.refund }, { q: 'How do I get my ticket?', a: 'Your ticket arrives instantly by SMS and email, and it\'s always in My tickets. Show the QR code at the door.' }]);
    const verified = SEED_ORGS.includes(org.id);
    return `
    <div class="n2-event">
      <div class="n2-wrap">
        <nav class="n2-crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><a href="#/search?cat=${e.category}">${esc(c.name)}</a><span>/</span><b>${esc(e.title)}</b></nav>
        ${e.status === 'draft' ? `<div class="n2-notice">Draft: only you can see this page. <a href="#/manage/${e.id}">Publish it</a></div>` : ''}
        <div class="n2-ehero">${img(e, 1600, '(max-width: 1280px) 100vw, 1280px', true)}
          <div class="n2-ehero-top"><a class="n2-round white n2-mob" href="#/" aria-label="Back">${IC.back}</a>
            <div class="n2-ehero-acts"><button class="n2-pillbtn" data-like="${e.id}" aria-pressed="${liked}">${liked ? IC.heartFill : IC.heart}<span>${liked ? 'Saved' : 'Save'}</span></button><button class="n2-pillbtn" id="shareBtn">${IC.share}<span>Share</span></button></div></div>
        </div>
      </div>
      <div class="n2-wrap n2-egrid">
        <div class="n2-emain">
          <div class="n2-eintro">
            <a class="n2-catpill" href="#/search?cat=${e.category}">${esc(c.name)}</a>
            <h1>${esc(e.title)}</h1>
            <p class="n2-esum">${esc(e.summary)}</p>
            <div class="n2-orgrow"><span class="n2-orgav">${initials(org.name)}</span><div><b>${esc(org.name)}${verified ? IC.verified : ''}</b><span>${compact(org.followers + (following ? 1 : 0))} followers · ${Store.organizerEvents(org.id).length} upcoming events</span></div>
              ${Store.canEdit(e) ? `<a class="n2-btn-outline sm" href="#/manage/${e.id}">Manage</a>` : `<button class="n2-btn-outline sm ${following ? 'on' : ''}" data-follow>${following ? '✓ Following' : 'Follow'}</button>`}</div>
          </div>
          <div class="n2-facts">${facts.map(([i, a, b]) => `<div class="n2-fact"><span class="n2-fic">${i}</span><div><b>${esc(a)}</b><span>${esc(b)}</span></div></div>`).join('')}</div>
          <div class="n2-orgrow n2-orgrow-m"><span class="n2-orgav">${initials(org.name)}</span><div><b>${esc(org.name)}</b><span>${compact(org.followers + (following ? 1 : 0))} followers</span></div>
            ${Store.canEdit(e) ? `<a class="n2-btn-outline sm" href="#/manage/${e.id}">Manage</a>` : `<button class="n2-btn-outline sm ${following ? 'on' : ''}" data-follow>${following ? '✓ Following' : 'Follow'}</button>`}</div>

          <div class="n2-etabs" id="evTabs" role="tablist">${sections.map(([k, l], i) => `<button data-sec="${k}" class="${i ? '' : 'on'} ${k === 'tickets' ? 'n2-mob-only' : ''}">${l}</button>`).join('')}</div>

          <section class="n2-esec" id="sec-about"><h2>About this event</h2>${(e.description || '').split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join('')}
            ${e.tags && e.tags.length ? `<div class="n2-tags">${e.tags.map(t => `<a href="#/search?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>` : ''}</section>
          <section class="n2-esec n2-mob-only" id="sec-tickets"><h2>Tickets</h2><div class="n2-tiers">${tierHtml}</div></section>
          ${e.agenda && e.agenda.length ? `<section class="n2-esec" id="sec-agenda"><h2>Agenda</h2><div class="n2-agenda">${e.agenda.map(a => `<div><span>${esc(a.time)}</span><b>${esc(a.title)}</b></div>`).join('')}</div></section>` : ''}
          <section class="n2-esec" id="sec-location"><h2>Location</h2>
            ${e.online ? `<div class="n2-loc"><div class="n2-loc-online">${IC.screen}<div><b>Online event</b><span>You'll get a joining link by SMS and email right after you book.</span></div></div></div>` :
              `<div class="n2-loc"><div class="n2-map"><iframe loading="lazy" title="Map of ${esc(e.venue.name)}" src="https://maps.google.com/maps?q=${mapQ}&z=15&output=embed"></iframe></div>
              <div class="n2-loc-row"><div><b>${esc(e.venue.name)}</b><span>${esc(e.venue.address)}, ${esc(e.venue.city)}, ${esc(e.venue.country)}</span></div>
              <a class="n2-btn-outline sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${mapQ}"><span class="d-only">Get directions</span><span class="m-only">Directions</span></a>
              <a class="n2-btn-outline sm" target="_blank" rel="noopener" href="https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${mapQ}">Book a ride</a></div></div>`}
          </section>
          <section class="n2-esec" id="sec-faq"><h2>Good to know</h2><div class="n2-faq">${faq.map((q, i) => `<details ${i === 0 && window.innerWidth > 1024 ? 'open' : ''}><summary>${esc(q.q)}${IC.chev}</summary><p>${esc(q.a)}</p></details>`).join('')}</div></section>
          <section class="n2-esec n2-d-sec" id="sec-organizer"><h2>Organiser</h2>
            <div class="n2-orgcard"><span class="n2-orgav lg">${initials(org.name)}</span><div class="grow"><b>${esc(org.name)}${verified ? IC.verified : ''}</b><span>${compact(org.followers + (following ? 1 : 0))} followers · ${Store.organizerEvents(org.id).length} upcoming events${verified ? ' · Hosting on Nova since 2023' : ''}</span><p>${esc(org.bio)}</p></div>
              <div class="n2-orgbtns">${Store.canEdit(e) ? `<a class="n2-btn-outline" href="#/manage/${e.id}">Manage</a>` : `<button class="n2-btn-outline ${following ? 'on' : ''}" data-follow>${following ? '✓ Following' : 'Follow'}</button><button class="n2-link" id="contactOrg">Contact</button>`}<a class="n2-link" href="#/organizer/${org.id}">View profile</a></div></div>
          </section>
        </div>

        <aside class="n2-easide">
          <div class="n2-buycard">
            <div class="n2-bc-date"><span class="n2-calchip"><small>${dFmt(e.start, { month: 'short' })}</small><b>${new Date(e.start).getDate()}</b></span><div><b>${dFmt(e.start, { weekday: 'long', month: 'long', day: 'numeric' })}</b><span>${time(e.start)} – ${time(e.end)} · ${inDays}</span></div></div>
            <div class="n2-tiers">${tierHtml}</div>
            <button class="n2-btn-blue xl block" data-buy ${dis}>${cta}</button>
            <ul class="n2-checks"><li>${IC.check}${esc(e.refund.replace('Refunds available up to', 'Refunds up to').replace(/\.$/, ''))}</li><li>${IC.check}Instant e-ticket by SMS &amp; email</li><li>${IC.check}Pay with MoMo, Airtel Money or card</li></ul>
            <div class="n2-bc-foot"><button class="n2-link ink" id="addCal">${IC.cal}Add to calendar</button><span>${soldCount(e).toLocaleString('en-US')} going</span></div>
          </div>
        </aside>
      </div>

      ${more.length ? `<section class="n2-sec n2-wrap n2-related"><div class="n2-head"><h2>You might also like</h2><a href="#/search?cat=${e.category}">More in ${esc(c.name)} →</a></div>${grid(more)}</section>` : ''}

      <div class="n2-buybar"><div><b>${priceFrom(e) === 'Free' ? 'Free' : 'From ' + priceFrom(e)}</b>${low ? `<span class="n2-hot">${esc(low.name)}: ${low.qty - low.sold} left</span>` : `<span>${dFmt(e.start, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time(e.start)}</span>`}</div><button class="n2-btn-blue lg" data-buy ${dis}>${cta}</button></div>
    </div>`;
  }
  function eventMount(id) {
    const e = Store.getEvent(id); if (!e) return;
    $$('[data-buy]').forEach(b => b.onclick = () => { window.location.hash = '#/checkout/' + e.id; });
    $$('[data-follow]').forEach(b => b.onclick = () => { const r = Store.toggleFollow(e.organizerId); if (r === null) return Auth.open('login', () => App.render()); toast(r ? 'Following ' + Store.organizer(e.organizerId).name : 'Unfollowed'); App.render(); });
    $('#addCal').onclick = () => UI.icsFor(e);
    $('#shareBtn').onclick = () => share(e);
    const co = $('#contactOrg'); if (co) co.onclick = () => {
      openModal(`<div class="modal-head"><h3>Message ${esc(Store.organizer(e.organizerId).name)}</h3><button class="modal-close" data-close aria-label="Close">×</button></div><div class="modal-body"><div class="field"><label>Your message</label><textarea class="input" id="orgMsg" placeholder="Hi! I have a question about ${esc(e.title)}…"></textarea></div><button class="n2-btn-blue block" id="sendMsg">Send message</button></div>`, { size: 'sm' });
      $('#sendMsg').onclick = () => { if (!$('#orgMsg').value.trim()) return toast('Write a message first'); closeModal(); toast('Message sent. The organiser usually replies within a day.'); };
    };
    const tabs = $('#evTabs');
    tabs.addEventListener('click', ev => { const b = ev.target.closest('[data-sec]'); if (!b) return; const s = $('#sec-' + b.dataset.sec); if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 140, behavior: reduceMotion() ? 'auto' : 'smooth' }); });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) $$('#evTabs [data-sec]').forEach(b => b.classList.toggle('on', 'sec-' + b.dataset.sec === x.target.id)); }), { rootMargin: '-150px 0px -60% 0px' });
      $$('.n2-esec').forEach(s => io.observe(s));
    }
  }

  /* ================================================================ CHECKOUT */
  const HOLD_MIN = 10;
  const PAY = {
    mtn: { name: 'MTN MoMo', short: 'MTN', cls: 'mtn', sub: 'Approve with your PIN', re: /^0?(76|77|78|39)\d{7}$/ },
    airtel: { name: 'Airtel Money', short: 'airtel', cls: 'airtel', sub: 'Approve with your PIN', re: /^0?(70|74|75|20)\d{7}$/ },
    card: { name: 'Card', short: 'VISA · MC', cls: 'card' },
    bank: { name: 'Bank transfer', short: 'BANK', cls: 'bank' }
  };
  const normPhone = v => { let d = (v || '').replace(/\D/g, ''); if (d.startsWith('256')) d = d.slice(3); if (d.length === 9) d = '0' + d; return d; };
  const netOf = v => { const d = normPhone(v); if (PAY.mtn.re.test(d)) return 'mtn'; if (PAY.airtel.re.test(d)) return 'airtel'; return ''; };
  const fmtPhone = v => { const d = normPhone(v); return d.length === 10 ? d.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') : v; };
  const TYPO = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com', 'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'outlok.com': 'outlook.com' };
  const emailFix = v => { const m = (v || '').trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+)$/); return m && TYPO[m[2]] ? m[1] + '@' + TYPO[m[2]] : ''; };
  let CK = null, lastBuyer = null;

  function checkoutPage(id) {
    const e = Store.getEvent(id);
    if (!e) return V.notFound('That event could not be found.');
    if (new Date(e.end) < new Date() || remaining(e) === 0) return V.notFound('Tickets for this event are no longer available.');
    if (!CK || CK.eventId !== id || CK.step === 'done') {
      const u = Store.user();
      CK = { eventId: id, step: 1, qty: {}, promo: null, promoCode: '', pay: '', attendees: false, names: [], editPhone: false,
        buyer: lastBuyer ? Object.assign({}, lastBuyer) : (() => { const prev = u && Store.myOrders ? Store.myOrders()[0] : null; return { first: u ? u.name.split(' ')[0] : '', last: u ? u.name.split(' ').slice(1).join(' ') : '', email: u ? u.email : '', phone: prev && prev.buyer ? prev.buyer.phone || '' : '' }; })(),
        payer: { phone: '', cardName: '', cardNo: '', exp: '', cvc: '' }, holdUntil: Date.now() + HOLD_MIN * 60000, order: null };
      e.tiers.forEach(t => CK.qty[t.id] = 0);
      const avail = e.tiers.filter(t => t.qty - t.sold > 0);
      if (avail.length === 1) CK.qty[avail[0].id] = 1;
    }
    return `<div class="n2-co" id="co"></div>`;
  }
  function totals(e) {
    const items = e.tiers.filter(t => CK.qty[t.id] > 0).map(t => ({ tierId: t.id, name: t.name, price: t.price, qty: CK.qty[t.id] }));
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
    const disc = CK.promo ? Math.round(sub * CK.promo.pct / 100) : 0;
    const count = items.reduce((s, i) => s + i.qty, 0);
    const fees = Store.feeFor(sub - disc, count);
    return { items, sub, disc, fees, count, total: sub - disc + fees };
  }
  function checkoutMount(id) {
    const e = Store.getEvent(id); const root = $('#co'); if (!e || !root) return;
    let holdTimer = null, momoTimer = null;
    const T = () => totals(e);
    const isFree = () => T().count > 0 && T().total === 0;
    const labels = () => isFree() || (T().count === 0 && e.tiers.every(t => t.price === 0)) ? ['Tickets', 'Details', 'Done'] : ['Tickets', 'Details', 'Payment', 'Done'];
    const curIdx = () => ({ 1: 0, 2: 1, pay: 2, momo: 2, proc: 2, done: labels().length - 1 })[CK.step];
    const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    const holdLeft = () => CK.holdUntil - Date.now();

    const stepper = () => `<ol class="n2-steps">${labels().map((l, i) => { const c = curIdx(); const st = CK.step === 'done' || i < c ? 'done' : i === c ? 'cur' : ''; return `<li class="${st}">${i ? '<i></i>' : ''}<span class="dot">${st === 'done' ? IC.check : i + 1}</span><b>${l}</b></li>`; }).join('')}</ol>
      <div class="n2-msteps">${labels().map((l, i) => `<div class="${i <= curIdx() ? 'on' : ''} ${i === curIdx() ? 'cur' : ''}"><span></span><b>${l}</b></div>`).join('')}</div>`;

    const summary = () => {
      const t = T(); const warn = holdLeft() < 120000;
      return `<aside class="n2-cosum">
        <div class="n2-cosum-img">${img(e, 900, '420px')}<div class="n2-bshade"></div><div><b>${esc(e.title)}</b><span>${dFmt(e.start, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time(e.start)} · ${esc(e.online ? 'Online' : e.venue.name)}</span></div></div>
        <div class="n2-cosum-body">
          ${t.items.length ? t.items.map(i => `<div class="n2-line"><span>${i.qty} × ${esc(i.name)}</span><b>${money(i.price * i.qty)}</b></div>`).join('') : '<p class="n2-muted">Choose tickets to see your total.</p>'}
          ${t.disc ? `<div class="n2-line ok"><span>Promo ${esc(CK.promo.code)} (−${CK.promo.pct}%)</span><b>− ${moneyPlain(t.disc)}</b></div>` : ''}
          ${t.fees ? `<div class="n2-line"><span>Service fee<small>3.5% + UGX 1,000 per ticket</small></span><b>${moneyPlain(t.fees)}</b></div>` : ''}
          <div class="n2-total"><span>Total</span><b>${t.count ? (t.total ? moneyPlain(t.total) : 'Free') : '—'}</b></div>
          ${CK.step !== 'done' ? `<div class="n2-hold ${warn ? 'warn' : ''}" id="holdBox">${IC.clock}<span>Tickets held for <strong id="holdClock">${clock(holdLeft())}</strong></span></div>` : ''}
          <ul class="n2-checks sm"><li>${IC.lock}Encrypted payment</li><li>${IC.check}${esc(e.refund.replace('Refunds available up to', 'Refunds up to').replace(/\.$/, ''))}</li></ul>
        </div></aside>
      <div class="n2-mstrip"><div class="im">${img(e, 200, '44px')}</div><div class="tx"><b>${esc(e.title)}</b><span>${T().count} ticket${T().count === 1 ? '' : 's'} · ${T().total ? moneyPlain(T().total) : T().count ? 'Free' : '—'}</span></div><span class="n2-holdchip ${holdLeft() < 120000 ? 'warn' : ''}" id="holdChip">${clock(holdLeft())}</span></div>`;
    };

    const s1 = () => `<h1>Choose your tickets</h1><p class="n2-muted d-only">Up to 10 per ticket type. Fees shown up front.</p>
      <div class="n2-cotiers">${e.tiers.map(tr => { const l = tr.qty - tr.sold, out = l <= 0, q = CK.qty[tr.id]; return `<div class="n2-cotier ${q ? 'sel' : ''} ${out ? 'out' : ''}">
        <div class="i"><b>${esc(tr.name)}</b>${tr.desc ? `<span>${esc(tr.desc)}</span>` : ''}${!out && l <= 20 ? `<em>Only ${l} left</em>` : ''}</div>
        <div class="p"><b>${money(tr.price)}</b>${tr.price ? `<span>+ ${moneyPlain(Store.feeFor(tr.price, 1))}<i class="d-only"> fee</i></span>` : ''}</div>
        <em class="n2-left-m">${!out && l <= 60 ? (l <= 20 ? 'Only ' + l + ' left' : l + ' left') : ''}</em>
        ${out ? '<span class="n2-soldout">Sold out</span>' : `<div class="n2-qty"><button data-dec="${tr.id}" ${q <= 0 ? 'disabled' : ''} aria-label="Remove one ${esc(tr.name)}">−</button><span aria-live="polite">${q}</span><button class="plus" data-inc="${tr.id}" ${q >= Math.min(10, l) ? 'disabled' : ''} aria-label="Add one ${esc(tr.name)}">+</button></div>`}
      </div>`; }).join('')}</div>
      <button type="button" class="n2-link n2-promo-toggle ${CK.promo || CK.promoCode ? 'hidden' : ''}" id="promoToggle">Have a promo code?</button>
      <div class="n2-promo ${CK.promo || CK.promoCode ? 'open' : ''}" id="promoRow"><input class="n2-input" id="promo" placeholder="Promo code" value="${esc(CK.promoCode)}" aria-label="Promo code"><button class="n2-btn-outline" id="applyPromo">Apply</button><span class="n2-promo-msg">${CK.promo ? `<b class="ok">${IC.check}${CK.promo.pct}% off applied</b>` : 'Try <b>NOVA10</b>'}</span></div>`;

    const s2 = () => {
      const b = CK.buyer, net = netOf(b.phone), fix = emailFix(b.email), t = T();
      return `<h1>Your details</h1><p class="n2-muted d-only">We'll send your tickets by SMS and email.</p>
      ${!Store.user() ? `<div class="n2-cologin"><span>Have a Nova account? Log in and we'll fill this in.</span><button class="n2-btn-white sm" id="ckLogin">Log in</button></div>` : ''}
      <div class="n2-row2"><label class="n2-field"><span>First name</span><input class="n2-input" name="first" value="${esc(b.first)}" autocomplete="given-name" required></label><label class="n2-field"><span>Last name</span><input class="n2-input" name="last" value="${esc(b.last)}" autocomplete="family-name" required></label></div>
      <label class="n2-field"><span>Mobile number <em>(tickets arrive by SMS)</em></span>
        <div class="n2-phone ${net ? 'ok' : ''}"><span class="cc">UG +256</span><input name="phone" inputmode="tel" value="${esc(b.phone)}" placeholder="0771 234 567" autocomplete="tel" required><span class="net" id="netTag">${net ? `<b class="pm-${net}">${PAY[net].short}</b>detected` : ''}</span></div></label>
      <label class="n2-field"><span>Email</span><input class="n2-input" type="email" name="email" value="${esc(b.email)}" autocomplete="email" required>
        <span class="n2-hint" id="emailHint">${fix ? `Did you mean <button type="button" class="n2-link" data-fix="${esc(fix)}">${esc(fix)}</button>?` : ''}</span></label>
      ${t.count > 1 ? `<label class="n2-cbx"><input type="checkbox" id="attToggle" ${CK.attendees ? 'checked' : ''}><span class="box">${IC.check}</span>Tickets are for different people: add each attendee's name</label>
        <div class="n2-att ${CK.attendees ? '' : 'hidden'}" id="attList">${Array.from({ length: t.count }, (_, i) => `<label class="n2-field"><span>Attendee ${i + 1}${i === 0 ? ' (you)' : ''}</span><input class="n2-input" data-att="${i}" value="${esc(CK.names[i] || (i === 0 ? (b.first + ' ' + b.last).trim() : ''))}" placeholder="Full name"></label>`).join('')}</div>` : ''}
      <label class="n2-cbx"><input type="checkbox" id="agree"><span class="box">${IC.check}</span><span>I agree to the <a href="#/terms" target="_blank">Terms</a> and the organiser's refund policy</span></label>
      <div class="n2-err" id="ckErr" role="alert" hidden></div>`;
    };

    const s3 = () => {
      const m = CK.pay, t = T(), p = CK.payer, fromDetails = !CK.editPhone && normPhone(p.phone) === normPhone(CK.buyer.phone) && netOf(p.phone) === m;
      const big = k => `<button type="button" class="n2-pm big ${m === k ? 'on' : ''}" data-pm="${k}"><span class="pm-${k} logo">${PAY[k].short}</span><span class="t"><b>${PAY[k].name}</b><small class="d-only">${PAY[k].sub}</small>${m === k && fromDetails ? `<small class="m-only">${esc(fmtPhone(p.phone))} · <span class="n2-link sm-link" data-edit-phone>Change</span></small>` : ''}</span>${m === k ? `<span class="tick">${IC.check}</span>` : ''}</button>`;
      const small = k => `<button type="button" class="n2-pm ${m === k ? 'on' : ''}" data-pm="${k}"><span class="pm-${k} tag">${PAY[k].short}</span>${PAY[k].name}${m === k ? `<span class="tick">${IC.check}</span>` : ''}</button>`;
      let body = '';
      if (m === 'mtn' || m === 'airtel') body = fromDetails
        ? `<div class="n2-field n2-momofield"><span>${PAY[m].name} number</span><div class="n2-momonum"><b>${esc(fmtPhone(p.phone))}</b><span class="ok">${IC.check}From your details</span><button type="button" class="n2-link" id="editPhone">Change</button></div><span class="n2-hint">You'll get a prompt on this phone. Enter your ${PAY[m].short === 'MTN' ? 'MoMo' : 'Airtel Money'} PIN to approve.</span></div>`
        : `<label class="n2-field"><span>${PAY[m].name} number</span><input class="n2-input lg" name="phone" inputmode="tel" value="${esc(p.phone)}" placeholder="${m === 'mtn' ? '0771 234 567' : '0701 234 567'}"><span class="n2-hint">Numbers starting ${m === 'mtn' ? '076, 077, 078' : '070, 074, 075'}. You'll get a prompt to approve with your PIN.</span></label>`;
      else if (m === 'card') body = `<label class="n2-field"><span>Name on card</span><input class="n2-input" name="cardName" value="${esc(p.cardName || (CK.buyer.first + ' ' + CK.buyer.last).trim())}" autocomplete="cc-name"></label>
          <label class="n2-field"><span>Card number</span><div class="n2-cardin"><input class="n2-input" name="cardNo" inputmode="numeric" value="${esc(p.cardNo)}" placeholder="1234 5678 9012 3456" autocomplete="cc-number" maxlength="23"><b id="cardBrand"></b></div><span class="n2-hint">Test card: 4242 4242 4242 4242</span></label>
          <div class="n2-row2"><label class="n2-field"><span>Expiry</span><input class="n2-input" name="exp" value="${esc(p.exp)}" placeholder="MM / YY" autocomplete="cc-exp" maxlength="7"></label><label class="n2-field"><span>Security code</span><input class="n2-input" name="cvc" value="${esc(p.cvc)}" placeholder="123" inputmode="numeric" autocomplete="cc-csc" maxlength="4"></label></div>`;
      else if (m === 'bank') body = `<div class="n2-bank"><div><span>Bank</span><b>Demo Bank (replace with yours)</b></div><div><span>Account name</span><b>Nova Tickets Ltd</b></div><div><span>Account no.</span><b>9030 0123 4567</b></div><div><span>Reference</span><b>NV${e.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-4)}${String(t.total).slice(-4)}</b></div><div><span>Amount</span><b>${moneyPlain(t.total)}</b></div></div><p class="n2-hint">Use the reference exactly so we can match your payment.</p>`;
      else body = `<p class="n2-hint">Choose a payment method above.</p>`;
      return `<h1><span class="d-only">How would you like to pay?</span><span class="m-only">Pay ${moneyPlain(t.total)}</span></h1><p class="n2-muted d-only">Total <strong>${moneyPlain(t.total)}</strong>. You won't be charged until you approve.</p>
        <div class="n2-pms-big">${big('mtn')}${big('airtel')}</div><div class="n2-pms-small">${small('card')}${small('bank')}</div>
        <div class="n2-pmbody">${body}</div><div class="n2-paysum m-only"><span>${t.items.map(i => i.qty + ' × ' + esc(i.name)).join(', ')}${t.fees ? ' + fee (' + moneyPlain(t.fees) + ')' : ''}</span><b>${moneyPlain(t.total)}</b></div><div class="n2-err" id="ckErr" role="alert" hidden></div><p class="n2-demo">Demo checkout: no real money is charged.</p>`;
    };

    const sMomo = () => `<div class="n2-momo">
        <div class="n2-ring" id="momoRing" style="--p:100"><div><b id="momoCount">1:00</b><small>to approve</small></div></div>
        <h1>Approve on your phone</h1>
        <p>We sent a request for <strong>${moneyPlain(T().total)}</strong> to <strong>${esc(fmtPhone(CK.payer.phone))}</strong>.</p>
        <div class="n2-msteps3">${['Unlock your phone and look for the ' + PAY[CK.pay].name + ' prompt', 'Check it says ' + moneyPlain(T().total) + ' to NOVA TICKETS', 'Enter your ' + (CK.pay === 'mtn' ? 'MoMo' : 'Airtel Money') + ' PIN to approve'].map((t, i) => `<div><span>${i + 1}</span><b>${esc(t)}</b></div>`).join('')}</div>
        <div class="n2-wait"><span class="n2-spin"></span>Waiting for ${PAY[CK.pay].name}…</div>
        <div class="n2-momo-acts"><button class="n2-btn-outline ink" id="resend">Resend prompt</button><button class="n2-btn-outline" id="changeNum">Change number</button><button class="n2-link muted" id="cancelMomo">Cancel</button></div>
        <p class="n2-demo">Demo checkout: no real money is charged. <button class="n2-link" id="simApprove">Simulate approval</button></p>
      </div>`;
    const sProc = () => `<div class="n2-momo"><span class="n2-spin xl"></span><h1>${CK.pay === 'card' ? 'Securely processing your card' : 'Checking for your transfer'}</h1><p>${CK.pay === 'card' ? 'Verifying with your bank. Please don\'t close this page.' : 'In this demo we confirm it straight away.'}</p></div>`;

    const sDone = () => {
      const o = CK.order, t0 = o.tickets[0];
      return `<div class="n2-done">
        <span class="n2-okbadge">${IC.check}</span>
        <h1>You're going, ${esc(o.buyer.first)}!</h1>
        <p class="m-only">${o.tickets.length} ticket${o.tickets.length > 1 ? 's' : ''} sent by SMS and to ${esc(o.buyer.email)}</p><p class="d-only">Order <strong>#${o.id}</strong> is ${o.total ? 'paid' : 'confirmed'}. ${o.tickets.length} ticket${o.tickets.length > 1 ? 's were' : ' was'} sent to ${esc(o.buyer.email)}${o.buyer.phone ? ' and ' + esc(fmtPhone(o.buyer.phone)) : ''}.</p>
        <div class="n2-ticket">
          <div class="n2-ticket-img">${img(e, 600, '220px')}<div class="n2-bshade m-only"></div><b class="m-only">${esc(e.title)}</b></div>
          <div class="n2-ticket-info"><span class="n2-when">${esc(dFmt(e.start, { weekday: 'short', month: 'short', day: 'numeric' }))} · ${time(e.start)}</span><b>${esc(e.title)}</b><span class="n2-muted">${esc(e.online ? 'Online event' : e.venue.name)}</span>
            <div class="kv"><span><small>Name</small><strong>${esc(t0.holder || (o.buyer.first + ' ' + o.buyer.last))}</strong></span><span><small>Ticket</small><strong>${esc(t0.tierName)} · 1 of ${o.tickets.length}</strong></span></div></div>
          <div class="n2-ticket-mrow m-only"><span><small>When</small><strong>${esc(dFmt(e.start, { weekday: 'short', month: 'short', day: 'numeric' }))} · ${time(e.start)}</strong></span><span><small>Ticket</small><strong>${esc(t0.tierName)} · 1 of ${o.tickets.length}</strong></span></div>
          <div class="n2-ticket-qr">${qr(t0.code)}<small>${t0.code}${o.tickets.length > 1 ? '<span class="m-only"> · ' + (o.tickets.length - 1) + ' more in My tickets</span>' : ''}</small></div>
        </div>
        <div class="n2-done-acts">
          <a class="n2-btn-blue xl" href="#/tickets/${o.id}">View my tickets</a>
          <button class="n2-btn-outline lg" id="doneCal">Add to calendar</button>
          <a class="n2-btn-outline lg" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('I\'m going to ' + e.title + '! ' + window.location.href.split('#')[0] + '#/event/' + e.id)}"><i class="dot wa d-only"></i><span class="d-only">Share on WhatsApp</span><span class="m-only">WhatsApp</span></a>
        </div>
        ${!Store.user() ? `<div class="n2-upsell"><img src="logo2.png" alt="" width="44" height="44"><div><b>Keep your tickets in one place</b><span>Create a free account with ${esc(o.buyer.email)} to see your tickets any time.</span></div><button class="n2-btn-ink" id="createAcc">Create account</button></div>` : ''}
      </div>`;
    };

    const ctaBar = () => {
      const t = T();
      if (CK.step === 1) return { back: ['Back to event', '#/event/' + e.id], cta: t.count ? `Continue · ${t.total ? moneyPlain(t.total) : 'Free'}` : 'Choose at least one ticket', ctaM: 'Continue', dis: !t.count };
      if (CK.step === 2) return { back: ['Back', 'back'], cta: isFree() ? 'Complete registration' : 'Continue to payment', ctaM: isFree() ? 'Register' : 'Continue to payment' };
      if (CK.step === 'pay') return { back: ['Back', 'back'], cta: CK.pay === 'bank' ? 'I\'ve made the transfer' : 'Pay ' + moneyPlain(t.total), ctaM: CK.pay === 'bank' ? 'I\'ve paid' : 'Pay ' + moneyPlain(t.total), dis: !CK.pay };
      return null;
    };

    const paint = () => {
      const bar = ctaBar(); const done = CK.step === 'done';
      const inner = CK.step === 1 ? s1() : CK.step === 2 ? s2() : CK.step === 'pay' ? s3() : CK.step === 'momo' ? sMomo() : CK.step === 'proc' ? sProc() : sDone();
      root.innerHTML = `${stepper()}
        ${done ? `<div class="n2-cowrap done">${inner}</div>` : `<div class="n2-cowrap">
          <div class="n2-cocard">${inner}
            ${bar ? `<div class="n2-cobar">${bar.back[1] === 'back' ? `<button class="n2-link ink" data-back>${IC.back}${bar.back[0]}</button>` : `<a class="n2-link ink" href="${bar.back[1]}">${IC.back}${bar.back[0]}</a>`}<button class="n2-btn-blue xl" data-next ${bar.dis ? 'disabled' : ''}>${bar.cta}</button></div>` : ''}
          </div>
          ${summary()}
        </div>
        ${bar ? `<div class="n2-mcta"><div><small>Total</small><b>${T().total ? moneyPlain(T().total) : T().count ? 'Free' : '—'}</b></div><button class="n2-btn-blue lg" data-next ${bar.dis ? 'disabled' : ''}>${bar.ctaM}</button></div>` : ''}`}`;
      bind();
    };

    const saveInputs = () => {
      $$('#co [name]').forEach(i => { if (CK.step === 2 && i.name in CK.buyer) CK.buyer[i.name] = i.value.trim(); if (CK.step === 'pay' && i.name in CK.payer) CK.payer[i.name] = i.value.trim(); });
      $$('#co [data-att]').forEach(i => CK.names[+i.dataset.att] = i.value.trim());
    };
    const fail = (msg, el) => { const er = $('#ckErr'); if (er) { er.textContent = msg; er.hidden = false; } else toast(msg); if (el) { el.classList.add('invalid'); el.focus(); } };
    const go = s => { saveInputs(); CK.step = s; clearInterval(momoTimer); paint(); window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); };
    const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };

    const validDetails = () => {
      $$('#co .invalid').forEach(i => i.classList.remove('invalid'));
      const b = CK.buyer;
      if (!b.first) return fail('Please enter your first name.', $('[name=first]'));
      if (!b.last) return fail('Please enter your last name.', $('[name=last]'));
      if (normPhone(b.phone).length !== 10) return fail('Enter your mobile number, e.g. 0771 234 567.', $('[name=phone]'));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) return fail('Please enter a valid email address.', $('[name=email]'));
      if (!$('#agree').checked) return fail('Please accept the terms to continue.');
      return true;
    };
    const validPay = () => {
      $$('#co .invalid').forEach(i => i.classList.remove('invalid'));
      const m = CK.pay, p = CK.payer;
      if (!m) return fail('Choose how you want to pay.');
      if (m === 'mtn' || m === 'airtel') { if (!PAY[m].re.test(normPhone(p.phone))) return fail(`That doesn't look like an ${PAY[m].name} number (${m === 'mtn' ? '076, 077, 078' : '070, 074, 075'}…).`, $('[name=phone]')); }
      if (m === 'card') {
        const no = p.cardNo.replace(/\D/g, '');
        if (!p.cardName) return fail('Enter the name on the card.', $('[name=cardName]'));
        if (no.length < 13 || !luhn(no)) return fail('That card number looks incorrect.', $('[name=cardNo]'));
        const mm = p.exp.match(/^(\d{2})\s*\/\s*(\d{2})$/);
        if (!mm || +mm[1] < 1 || +mm[1] > 12 || new Date(2000 + +mm[2], +mm[1]) <= new Date()) return fail('Enter a valid, unexpired date (MM / YY).', $('[name=exp]'));
        if (!/^\d{3,4}$/.test(p.cvc)) return fail('Enter the 3–4 digit security code.', $('[name=cvc]'));
      }
      return true;
    };

    const place = () => {
      clearInterval(momoTimer);
      try {
        const t = T();
        const o = Store.placeOrder({ eventId: e.id, items: t.items, buyer: { first: CK.buyer.first, last: CK.buyer.last, email: CK.buyer.email, phone: CK.buyer.phone }, payment: t.total === 0 ? 'free' : CK.pay, promo: CK.promo });
        if (CK.attendees) o.tickets.forEach((tk, i) => tk.holder = CK.names[i] || '');
        lastBuyer = Object.assign({}, CK.buyer);
        CK.order = o; CK.step = 'done'; clearInterval(holdTimer); paint(); window.scrollTo(0, 0); App.renderHeader();
        if (window.NovaConfetti && !reduceMotion()) { const cv = document.createElement('canvas'); cv.className = 'co-confetti'; document.body.appendChild(cv); const c = NovaConfetti(cv); setTimeout(() => { c.stop(); cv.remove(); }, 4500); }
      } catch (x) { CK.step = 1; paint(); toast(x.message); }
    };

    const startMomo = () => {
      CK.step = 'momo'; paint(); window.scrollTo(0, 0);
      let n = 60; const total = 60;
      const tick = () => { const c = $('#momoCount'), r = $('#momoRing'); if (!c) return clearInterval(momoTimer); c.textContent = clock(n * 1000); r.style.setProperty('--p', (n / total * 100).toFixed(1)); };
      tick();
      momoTimer = setInterval(() => { n--; tick(); if (n === 52) { /* demo: auto-approve after 8 seconds */ place(); } if (n <= 0) { clearInterval(momoTimer); CK.step = 'pay'; paint(); fail('The request timed out. Please try again.'); } }, 1000);
      $('#simApprove').onclick = place;
      $('#resend').onclick = () => { n = 60; tick(); toast('Prompt sent again to ' + fmtPhone(CK.payer.phone)); };
      $('#changeNum').onclick = () => { clearInterval(momoTimer); CK.editPhone = true; CK.step = 'pay'; paint(); const i = $('[name=phone]'); if (i) i.focus(); };
      $('#cancelMomo').onclick = () => { clearInterval(momoTimer); CK.step = 'pay'; paint(); };
    };

    function bind() {
      $$('[data-inc]', root).forEach(b => b.onclick = () => { CK.qty[b.dataset.inc]++; paint(); });
      $$('[data-dec]', root).forEach(b => b.onclick = () => { CK.qty[b.dataset.dec]--; paint(); });
      const ap = $('#applyPromo'); if (ap) { ap.onclick = () => { CK.promoCode = $('#promo').value.trim(); const p = Store.validatePromo(CK.promoCode, e); CK.promo = p; toast(p ? 'Promo code applied' : 'That code isn\'t valid for this event'); paint(); }; $('#promo').onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); ap.click(); } }; }
      const li = $('#ckLogin'); if (li) li.onclick = () => { saveInputs(); Auth.open('login', () => { const u = Store.user(); if (u) { CK.buyer.first = CK.buyer.first || u.name.split(' ')[0]; CK.buyer.last = CK.buyer.last || u.name.split(' ').slice(1).join(' '); CK.buyer.email = u.email; } App.renderHeader(); paint(); }); };
      const ph = $('#co [name=phone]');
      if (ph && CK.step === 2) ph.oninput = () => { const n = netOf(ph.value); $('#netTag').innerHTML = n ? `<b class="pm-${n}">${PAY[n].short}</b>detected` : ''; ph.parentElement.classList.toggle('ok', !!n); };
      const em = $('#co [name=email]');
      if (em) em.oninput = () => { const f = emailFix(em.value); $('#emailHint').innerHTML = f ? `Did you mean <button type="button" class="n2-link" data-fix="${esc(f)}">${esc(f)}</button>?` : ''; bindFix(); };
      const bindFix = () => $$('[data-fix]', root).forEach(b => b.onclick = () => { em.value = b.dataset.fix; CK.buyer.email = b.dataset.fix; $('#emailHint').innerHTML = ''; });
      bindFix();
      const att = $('#attToggle'); if (att) att.onchange = () => { saveInputs(); CK.attendees = att.checked; const a0 = $('[data-att="0"]'); if (a0 && !a0.value) a0.value = (CK.buyer.first + ' ' + CK.buyer.last).trim(); $('#attList').classList.toggle('hidden', !att.checked); };
      $$('[data-pm]', root).forEach(b => b.onclick = () => { saveInputs(); CK.pay = b.dataset.pm; if ((CK.pay === 'mtn' || CK.pay === 'airtel') && !CK.payer.phone) CK.payer.phone = CK.buyer.phone; paint(); });
      const pt = $('#promoToggle'); if (pt) pt.onclick = () => { pt.classList.add('hidden'); $('#promoRow').classList.add('open'); $('#promo').focus(); };
      $$('[data-edit-phone]', root).forEach(x => x.onclick = ev => { ev.stopPropagation(); CK.editPhone = true; paint(); const i = $('[name=phone]'); if (i) i.focus(); });
      const ep = $('#editPhone'); if (ep) ep.onclick = () => { CK.editPhone = true; paint(); const i = $('[name=phone]'); if (i) i.focus(); };
      $$('[data-back]', root).forEach(b => b.onclick = () => go(CK.step === 2 ? 1 : 2));
      $$('[data-next]', root).forEach(nx => nx.onclick = () => {
        saveInputs();
        if (CK.step === 1) return go(2);
        if (CK.step === 2) {
          if (!validDetails()) return;
          if (isFree()) { $$('[data-next]').forEach(b => { b.disabled = true; b.textContent = 'Confirming…'; }); return setTimeout(place, 600); }
          const n = netOf(CK.buyer.phone); if (!CK.pay) CK.pay = n || 'mtn'; if (!CK.payer.phone || !CK.editPhone) CK.payer.phone = CK.buyer.phone;
          return go('pay');
        }
        if (CK.step === 'pay') {
          if (!validPay()) return;
          if (CK.pay === 'mtn' || CK.pay === 'airtel') return startMomo();
          CK.step = 'proc'; paint(); setTimeout(place, 2000);
        }
      });
      const cn = $('#co [name=cardNo]');
      if (cn) { const brand = () => { const v = cn.value.replace(/\D/g, ''); $('#cardBrand').textContent = /^4/.test(v) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(v) ? 'Mastercard' : /^3[47]/.test(v) ? 'AMEX' : ''; }; cn.oninput = () => { const v = cn.value.replace(/\D/g, '').slice(0, 19); cn.value = v.replace(/(.{4})/g, '$1 ').trim(); brand(); }; brand();
        const ex = $('#co [name=exp]'); ex.oninput = () => { const v = ex.value.replace(/\D/g, '').slice(0, 4); ex.value = v.length > 2 ? v.slice(0, 2) + ' / ' + v.slice(2) : v; }; }
      $$('#co input', root).forEach(i => i.addEventListener('keydown', ev => { if (ev.key === 'Enter' && i.type !== 'checkbox' && i.id !== 'promo') { ev.preventDefault(); const n = $('.n2-cobar [data-next]'); if (n && !n.disabled) n.click(); } }));
      const dc = $('#doneCal'); if (dc) dc.onclick = () => UI.icsFor(e);
      const ca = $('#createAcc'); if (ca) ca.onclick = () => { Auth.open('signup', () => { App.renderHeader(); paint(); toast('Account created. Your tickets are saved.'); }); setTimeout(() => { const n = $('#authForm [name=name]'), m = $('#authForm [name=email]'); if (n) n.value = (CK.order.buyer.first + ' ' + CK.order.buyer.last).trim(); if (m) m.value = CK.order.buyer.email; }, 40); };
    }

    holdTimer = setInterval(() => {
      if (!document.body.contains(root)) { clearInterval(holdTimer); clearInterval(momoTimer); return; }
      if (CK.step === 'done') return clearInterval(holdTimer);
      const ms = holdLeft(), c = $('#holdClock'), chip = $('#holdChip');
      if (c) c.textContent = clock(ms); if (chip) chip.textContent = clock(ms);
      $('#holdBox') && $('#holdBox').classList.toggle('warn', ms < 120000); chip && chip.classList.toggle('warn', ms < 120000);
      if (ms <= 0) {
        clearInterval(holdTimer); clearInterval(momoTimer);
        openModal(`<div class="modal-head"><h3>Time's up</h3></div><div class="modal-body"><p>We held your tickets for ${HOLD_MIN} minutes. They've been released so others can book.</p><button class="n2-btn-blue block" id="restart">Start again</button></div>`, { size: 'sm' });
        $('#restart').onclick = () => { CK = null; closeModal(); App.render(); };
      }
    }, 1000);
    paint();
  }

  Object.assign(V, { home, homeMount, search, searchMount, eventPage, eventMount, checkoutPage, checkoutMount });
  window.Checkout = { open(id) { window.location.hash = '#/checkout/' + id; } };
})();
