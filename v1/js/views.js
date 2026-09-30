/* Nova — page views */
(function () {
  const { esc, money, moneyPlain, cardDate, longDate, time, priceFrom, remaining, capacity, soldCount, location: locText, cat, cover, grid, openModal, closeModal, toast, qr, initials, parseQuery, buildQuery, compact } = UI;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const ICON = {
    cal: '<svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3a1 1 0 011 1v15a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3zm12 8H5v9h14zM5 6v2h14V6z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 017 7c0 5.2-7 13-7 13S5 14.2 5 9a7 7 0 017-7zm0 4.5A2.5 2.5 0 1012 11.5 2.5 2.5 0 0012 6.5z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 2a8 8 0 100 16 8 8 0 000-16zm1 3v5.4l3.6 2.1-1 1.7L11 13.5V7z"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path d="M3 6a1 1 0 011-1h16a1 1 0 011 1v3a2 2 0 000 4v3.9a1 1 0 01-1 1H4a1 1 0 01-1-1V13a2 2 0 000-4zm11 1v2h2V7zm0 4v2h2v-2zm0 4v2h2v-2z"/></svg>',
    screen: '<svg viewBox="0 0 24 24"><path d="M3 4h18a1 1 0 011 1v11a1 1 0 01-1 1h-7v2h3v2H7v-2h3v-2H3a1 1 0 01-1-1V5a1 1 0 011-1zm1 2v9h16V6z"/></svg>',
    person: '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M18 16a3 3 0 00-2.4 1.2l-6.7-3.4a3 3 0 000-1.6l6.7-3.4A3 3 0 1015 7l-6.7 3.4a3 3 0 100 3.2L15 17a3 3 0 103-1z"/></svg>'
  };

  /* ================= HOME ================= */
  function home() {
    const ev = Store.upcoming();
    const weekCount = ev.filter(e => new Date(e.start) - new Date() < 7 * 86400000).length;
    const trending = ev.slice().sort((a, b) => soldCount(b) - soldCount(a)).slice(0, 6);
    const bento = ev.filter(e => new Date(e.start) - new Date() < 7 * 86400000).slice(0, 5);
    const deck = Store.categories.map(c => ev.filter(e => e.category === c.id).sort((a, b) => soldCount(b) - soldCount(a))[0]).filter(Boolean);
    return `
    <section class="hero" id="hero">
      <img class="hero-bg" src="${UI.photoUrl(Store.photos.party, 1600)}" srcset="${UI.photoUrl(Store.photos.party, 800)} 800w, ${UI.photoUrl(Store.photos.party, 1600)} 1600w, ${UI.photoUrl(Store.photos.party, 2400)} 2400w" sizes="100vw" alt="" fetchpriority="high">
      <canvas class="hero-confetti" id="heroConfetti" aria-hidden="true"></canvas>
      <div class="container hero-inner">
        <div class="hero-copy">
          <span class="hero-eyebrow"><i></i>${weekCount} events this week near you</span>
          <h1>Find your next<br><span class="rotator" id="rotator"><span class="rw on">concert</span><span class="rw">festival</span><span class="rw">night out</span><span class="rw">conference</span><span class="rw">workshop</span></span></h1>
          <p class="lead">Discover what's happening around you, book in seconds, and never miss a moment.</p>
          <form class="hero-search" id="heroSearch" role="search">
            <label class="hs-field"><svg class="icon" viewBox="0 0 24 24"><path d="M10.5 3a7.5 7.5 0 015.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"/></svg><input name="q" placeholder="Search events, artists, topics" aria-label="Search events"></label>
            <label class="hs-field hs-loc"><svg class="icon" viewBox="0 0 24 24"><path d="M12 2a7 7 0 017 7c0 5.2-7 13-7 13S5 14.2 5 9a7 7 0 017-7zm0 4.5A2.5 2.5 0 1012 11.5 2.5 2.5 0 0012 6.5z"/></svg><input name="loc" placeholder="Kampala" aria-label="Location"></label>
            <button class="btn btn-primary" type="submit">Search</button>
          </form>
          <div class="hero-quick">${[['🎵 Music', 'cat=music'], ['💻 Tech', 'cat=business'], ['🍲 Food', 'cat=food'], ['🎟️ Free', 'price=free'], ['📅 This weekend', 'date=weekend']].map(([t, q]) => `<a href="#/search?${q}">${t}</a>`).join('')}</div>
        </div>
        <div class="hero-feature" id="deck" aria-label="Featured events by category">
          <a class="deck-cat" id="deckCat" href="#/search?cat=${deck[0] ? deck[0].category : ''}"><span id="deckCatText">${deck[0] ? cat(deck[0].category).emoji + ' ' + cat(deck[0].category).name : ''}</span></a>
          <div class="deck-stage">
            ${deck.map((e, i) => `<a class="hf-card" data-i="${i}" href="#/event/${e.id}" style="--tilt:${[-5, 4, -2, 6, -4, 3][i % 6]}deg">
              <div class="hf-img">${cover(e, { w: 480, sizes: '270px' })}</div>
              <div class="hf-body"><span class="hf-date">${cardDate(e.start)}</span><b>${esc(e.title)}</b><span class="hf-meta">${esc(e.venue ? e.venue.city : 'Online')} · ${priceFrom(e)}</span></div>
            </a>`).join('')}
          </div>
          <div class="deck-dots" id="deckDots">${deck.map((e, i) => `<button data-go="${i}" aria-label="${esc(cat(e.category).name)}"${i === 0 ? ' class="on"' : ''}></button>`).join('')}</div>
          <div class="hf-pill"><span class="dot"></span>${UI.compact(ev.reduce((s, e) => s + soldCount(e), 0))} tickets booked</div>
        </div>
      </div>
    </section>

    <div class="marquee" aria-label="Browse categories">
      <div class="marquee-track">
        ${Store.categories.map(c => `<a class="mq-item" href="#/search?cat=${c.id}"><img src="${UI.photoUrl(c.photo, 120)}" alt="" loading="lazy"><span>${c.name}</span></a>`).join('')}
      </div>
    </div>

    <section class="section reveal">
      <div class="container">
        <div class="section-head"><div><span class="kicker">🔥 Trending now</span><h2>What Kampala is booking</h2></div><div class="scroll-btns"><button class="icon-btn" data-scroll="-1" aria-label="Scroll left">‹</button><button class="icon-btn" data-scroll="1" aria-label="Scroll right">›</button></div></div>
        <div class="trend-row" id="trendRow">
          ${trending.map((e, i) => `<a class="trend" href="#/event/${e.id}"><div class="trend-img">${cover(e, { w: 520, sizes: '260px' })}<span class="trend-n">${i + 1}</span></div><div class="trend-body"><span class="hf-date">${cardDate(e.start)}</span><b>${esc(e.title)}</b><span class="muted">${esc(locText(e))}</span></div></a>`).join('')}
        </div>
      </div>
    </section>

    ${bento.length >= 3 ? `<section class="section reveal">
      <div class="container">
        <div class="section-head"><div><span class="kicker">📅 Coming up</span><h2>Don't miss this week</h2></div><a href="#/search?date=week">See the full week →</a></div>
        <div class="bento">
          ${bento.map((e, i) => `<a class="bento-card ${i === 0 ? 'big' : ''}" href="#/event/${e.id}">${cover(e, { w: i === 0 ? 1000 : 520, sizes: i === 0 ? '(max-width:860px) 100vw, 600px' : '300px' })}<div class="bento-meta"><span class="bento-when">${cardDate(e.start)}</span><b>${esc(e.title)}</b><span>${esc(e.venue ? e.venue.city : 'Online')} · ${priceFrom(e)}</span></div></a>`).join('')}
        </div>
      </div>
    </section>` : ''}

    <section class="section reveal">
      <div class="container">
        <div class="section-head">
          <div><span class="kicker">✨ Explore</span><h2>All upcoming events</h2></div>
          <a href="#/search">See all events →</a>
        </div>
        <div class="tabs pill-tabs" id="homeTabs">
          <button class="tab active" data-f="all">All</button>
          <button class="tab" data-f="today">Today</button>
          <button class="tab" data-f="weekend">This weekend</button>
          <button class="tab" data-f="free">Free</button>
          <button class="tab" data-f="online">Online</button>
          <button class="tab" data-f="music">Music & Nightlife</button>
          <button class="tab" data-f="food">Food & Drink</button>
          <button class="tab" data-f="tech">Business & Tech</button>
        </div>
        <div id="homeGrid">${grid(ev.slice(0, 8))}</div>
        <div style="text-align:center;margin-top:28px"><a class="btn btn-outline" href="#/search">See more events</a></div>
      </div>
    </section>

    <section class="section reveal">
      <div class="container">
        <div class="section-head"><div><span class="kicker">📍 Cities</span><h2>Explore by city</h2></div></div>
        <div class="city-grid">
          ${Store.cities.map(c => { const p = Store.palettes[c.palette]; const n = ev.filter(e => e.venue && e.venue.city === c.name).length; return `<a class="city" href="#/search?loc=${encodeURIComponent(c.name)}" style="background:linear-gradient(135deg,${p[0]},${p[1]})"><img src="${UI.photoUrl(c.photo, 600)}" alt="" loading="lazy"><span>${c.name}<small>${n} upcoming event${n === 1 ? '' : 's'}</small></span></a>`; }).join('')}
        </div>
      </div>
    </section>

    <section class="section reveal">
      <div class="container duo">
        <div class="duo-card duo-host">
          <span class="kicker light">For organizers</span>
          <h3>Host events people love to show up to</h3>
          <p>Sell with mobile money, card or bank. Free events cost nothing · 3.5% + UGX 1,000 per paid ticket.</p>
          <a class="btn btn-light" href="#/create">Create an event →</a>
        </div>
        <form class="duo-card duo-news" id="newsForm">
          <span class="kicker">The weekly lineup</span>
          <h3>Get the best events in your inbox</h3>
          <p>One short email every Thursday. No spam.</p>
          <div class="news-row"><input class="input" type="email" required placeholder="you@example.com" aria-label="Email"><button class="btn btn-primary">Subscribe</button></div>
        </form>
      </div>
    </section>`;
  }
  /* Floating, shuffling deck — cycles one event per category */
  function Deck(root) {
    if (!root) return;
    const cards = $$('.hf-card', root), dots = $$('#deckDots button', root);
    const label = $('#deckCatText', root), link = $('#deckCat', root);
    const n = cards.length; if (!n) return;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let top = 0, paused = false, busy = false;
    const layout = () => cards.forEach((c, i) => {
      const d = (i - top + n) % n; // depth: 0 = front
      c.dataset.d = d < 4 ? d : 'x';
      c.tabIndex = d === 0 ? 0 : -1;
      c.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
    });
    const setLabel = () => {
      const e = cards[top]; const id = e.getAttribute('href').split('/').pop();
      const ev = Store.getEvent(id); const c = cat(ev.category);
      label.classList.remove('in'); void label.offsetWidth;
      label.textContent = c.emoji + ' ' + c.name; label.classList.add('in');
      link.setAttribute('href', '#/search?cat=' + ev.category);
      dots.forEach((d, i) => d.classList.toggle('on', i === top));
    };
    const go = next => {
      if (busy || next === top) return; busy = true;
      const out = cards[top];
      out.classList.add('fly');                       // front card flicks away…
      setTimeout(() => {
        top = next; layout(); setLabel();              // …the rest step forward
        setTimeout(() => { out.classList.remove('fly'); busy = false; }, 420);
      }, reduce ? 0 : 380);
    };
    layout();
    const iv = setInterval(() => {
      if (!document.body.contains(root)) return clearInterval(iv);
      if (!paused && !document.hidden) go((top + 1) % n);
    }, 2800);
    root.addEventListener('mouseenter', () => { paused = true; root.classList.add('paused'); });
    root.addEventListener('mouseleave', () => { paused = false; root.classList.remove('paused'); });
    $('#deckDots', root).addEventListener('click', ev => { const b = ev.target.closest('[data-go]'); if (b) go(+b.dataset.go); });
  }

  function homeMount() {
    const all = Store.upcoming();
    // scroll reveal
    const rv = $$('.reveal');
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' }); rv.forEach(el => io.observe(el)); } else rv.forEach(el => el.classList.add('in'));
    // trending scroller buttons
    $$('[data-scroll]').forEach(b => b.onclick = () => $('#trendRow').scrollBy({ left: +b.dataset.scroll * 300, behavior: 'smooth' }));
    // newsletter (demo)
    $('#newsForm').onsubmit = ev => { ev.preventDefault(); ev.target.innerHTML = '<span class="kicker">The weekly lineup</span><h3>You\'re on the list 🎉</h3><p>Look out for your first lineup on Thursday.</p>'; };
    // subtle parallax on the hero deck
    const deckEl = $('#deck'), heroEl = $('#hero');
    if (deckEl && heroEl && window.matchMedia('(pointer:fine)').matches) heroEl.addEventListener('mousemove', ev => { const r = heroEl.getBoundingClientRect(); const x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5; deckEl.style.transform = `translate(${x * -14}px, ${y * -10}px)`; });
    const cv = $('#heroConfetti');
    if (cv && window.NovaConfetti) {
      const c = NovaConfetti(cv);
      $('#hero').addEventListener('click', ev => { if (ev.target.closest('a,button,input,form')) return; const r = cv.getBoundingClientRect(); c.burst(ev.clientX - r.left, ev.clientY - r.top); });
    }
    Deck($('#deck'));
    const words = $$('#rotator .rw'); let wi = 0;
    if (words.length && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      const iv = setInterval(() => {
        if (!document.body.contains(words[0])) return clearInterval(iv);
        words[wi].classList.remove('on'); words[wi].classList.add('out');
        const prev = words[wi]; setTimeout(() => prev.classList.remove('out'), 600);
        wi = (wi + 1) % words.length; words[wi].classList.add('on');
      }, 2400);
    }
    $('#heroSearch').onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target); location.hash = '#/search?' + buildQuery({ q: f.get('q'), loc: f.get('loc') }); };
    $('#homeTabs').addEventListener('click', ev => {
      const b = ev.target.closest('.tab'); if (!b) return;
      $$('#homeTabs .tab').forEach(t => t.classList.toggle('active', t === b));
      const list = applyFilters(all, { date: ['today', 'weekend'].includes(b.dataset.f) ? b.dataset.f : '', price: b.dataset.f === 'free' ? 'free' : '', online: b.dataset.f === 'online' ? '1' : '', cat: ['music', 'food', 'tech'].includes(b.dataset.f) ? Store.catId(b.dataset.f) : '' });
      $('#homeGrid').innerHTML = grid(list.slice(0, 8), 'Nothing here yet');
    });
  }

  /* ================= SEARCH ================= */
  function dateRange(key) {
    const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(s);
    if (key === 'today') e.setDate(e.getDate() + 1);
    else if (key === 'tomorrow') { s.setDate(s.getDate() + 1); e.setDate(e.getDate() + 2); }
    else if (key === 'weekend') {
      const d = s.getDay(); // 0 Sun … 6 Sat
      const toMon = d === 0 ? 1 : 8 - d; // next Monday 00:00
      e.setDate(e.getDate() + toMon);
      if (d >= 1 && d <= 4) s.setDate(s.getDate() + (5 - d)); // jump to Friday
    }
    else if (key === 'week') e.setDate(e.getDate() + 7);
    else if (key === 'month') e.setDate(e.getDate() + 31);
    else return null;
    return [s.getTime(), e.getTime()];
  }
  function applyFilters(list, f) {
    const q = (f.q || '').trim().toLowerCase();
    const loc = (f.loc || '').trim().toLowerCase();
    const range = dateRange(f.date);
    let out = list.filter(e => {
      if (q) { const hay = [e.title, e.summary, e.description, (e.tags || []).join(' '), Store.organizer(e.organizerId).name, cat(e.category).name].join(' ').toLowerCase(); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
      if (loc && loc !== 'anywhere') { if (loc === 'online') { if (!e.online) return false; } else if (!e.venue || !(e.venue.city + ' ' + e.venue.name + ' ' + e.venue.country).toLowerCase().includes(loc)) return false; }
      if (f.cat && e.category !== Store.catId(f.cat)) return false;
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
  function search(qs) {
    const f = parseQuery(qs); if (f.cat) f.cat = Store.catId(f.cat);
    const radio = (name, val, label) => `<label class="opt"><input type="radio" name="${name}" value="${val}" ${(f[name] || '') === val ? 'checked' : ''}> ${label}</label>`;
    return `
    <div class="container">
      <div class="search-layout">
        <aside class="filters" id="filters">
          <h3>Filters</h3>
          <div class="filter-group"><h4>Category</h4>
            <select class="input" name="cat"><option value="">All categories</option>${Store.categories.map(c => `<option value="${c.id}" ${f.cat === c.id ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}</select>
          </div>
          <div class="filter-group"><h4>Date</h4>
            ${radio('date', '', 'Any date')}${radio('date', 'today', 'Today')}${radio('date', 'tomorrow', 'Tomorrow')}${radio('date', 'weekend', 'This weekend')}${radio('date', 'week', 'Next 7 days')}${radio('date', 'month', 'Next 30 days')}
          </div>
          <div class="filter-group"><h4>Price</h4>
            ${radio('price', '', 'Any price')}${radio('price', 'free', 'Free')}${radio('price', 'paid', 'Paid')}
          </div>
          <div class="filter-group"><h4>Format</h4>
            ${radio('online', '', 'All')}${radio('online', '0', 'In person')}${radio('online', '1', 'Online')}
          </div>
          <div class="filter-group" style="border:0"><button class="btn btn-ghost btn-sm" id="clearFilters">Clear all filters</button></div>
        </aside>
        <section>
          <div class="field" style="display:flex;gap:10px;margin-bottom:20px">
            <input class="input" id="sq" placeholder="Search events, organizers, topics" value="${esc(f.q || '')}">
            <input class="input" id="sl" placeholder="City or 'online'" value="${esc(f.loc || '')}" style="max-width:220px">
            <button class="btn btn-primary" id="sgo">Search</button>
          </div>
          <div class="results-head">
            <h1 id="resTitle"></h1>
            <div style="display:flex;gap:10px;align-items:center">
              <select class="input" id="sort" style="width:auto"><option value="">Sort: Soonest</option><option value="popular" ${f.sort === 'popular' ? 'selected' : ''}>Most popular</option><option value="price" ${f.sort === 'price' ? 'selected' : ''}>Lowest price</option></select>
              <div class="seg" id="viewSeg"><button data-v="grid" class="active">Grid</button><button data-v="list">List</button></div>
            </div>
          </div>
          <div id="activeChips" class="chips" style="margin-bottom:16px"></div>
          <div id="results"></div>
        </section>
      </div>
    </div>`;
  }
  function searchMount(qs) {
    const f = parseQuery(qs); if (f.cat) f.cat = Store.catId(f.cat);
    const render = () => {
      const list = applyFilters(Store.upcoming(), f);
      const where = f.loc ? ' in ' + f.loc : (f.online === '1' ? ' online' : '');
      const what = f.cat ? cat(f.cat).name + ' events' : (f.q ? `“${f.q}”` : 'All events');
      $('#resTitle').textContent = what + where;
      $('#results').innerHTML = `<p class="muted" style="margin-top:-8px">${list.length} result${list.length === 1 ? '' : 's'}</p>` + grid(list);
      const labels = { cat: v => cat(v).name, date: v => ({ today: 'Today', tomorrow: 'Tomorrow', weekend: 'This weekend', week: 'Next 7 days', month: 'Next 30 days' }[v]), price: v => v === 'free' ? 'Free' : 'Paid', online: v => v === '1' ? 'Online' : 'In person', q: v => '“' + v + '”', loc: v => v };
      $('#activeChips').innerHTML = Object.keys(labels).filter(k => f[k]).map(k => `<button class="chip active" data-rm="${k}">${esc(labels[k](f[k]))} ✕</button>`).join('');
      history.replaceState(null, '', '#/search' + (buildQuery(f) ? '?' + buildQuery(f) : ''));
    };
    render();
    $('#filters').addEventListener('change', ev => { f[ev.target.name] = ev.target.value; render(); });
    $('#clearFilters').onclick = () => { ['cat', 'date', 'price', 'online', 'q', 'loc'].forEach(k => delete f[k]); location.hash = '#/search'; };
    $('#sort').onchange = ev => { f.sort = ev.target.value; render(); };
    const go = () => { f.q = $('#sq').value; f.loc = $('#sl').value; render(); };
    $('#sgo').onclick = go;
    [$('#sq'), $('#sl')].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
    $('#activeChips').addEventListener('click', ev => { const b = ev.target.closest('[data-rm]'); if (!b) return; delete f[b.dataset.rm]; const el = $(`[name=${b.dataset.rm}]`); if (el) { if (el.tagName === 'SELECT') el.value = ''; else { const r = $(`[name=${b.dataset.rm}][value=""]`); if (r) r.checked = true; } } if (b.dataset.rm === 'q') $('#sq').value = ''; if (b.dataset.rm === 'loc') $('#sl').value = ''; render(); });
    $('#viewSeg').addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; $$('#viewSeg button').forEach(x => x.classList.toggle('active', x === b)); $('#results').classList.toggle('list-view', b.dataset.v === 'list'); });
  }

  /* ================= EVENT PAGE ================= */
  function eventPage(id) {
    const e = Store.getEvent(id);
    if (!e) return notFound('That event could not be found. It may have been removed.');
    const org = Store.organizer(e.organizerId);
    const c = cat(e.category);
    const ended = new Date(e.end) < new Date();
    const left = remaining(e);
    const following = Store.isFollowing(org.id);
    const liked = Store.isLiked(e.id);
    const mapQ = e.venue ? encodeURIComponent(e.venue.name + ', ' + e.venue.address + ', ' + e.venue.city) : '';
    const dur = Math.round((new Date(e.end) - new Date(e.start)) / 3600000 * 10) / 10;
    const more = Store.upcoming().filter(x => x.id !== e.id && (x.category === e.category || x.organizerId === e.organizerId)).slice(0, 4);
    const allFree = e.tiers.every(t => t.price === 0);
    const cta = ended ? 'Event has ended' : left === 0 ? 'Sold out' : (allFree ? 'Reserve a spot' : 'Get tickets');
    const disabled = ended || left === 0 ? 'disabled' : '';
    const sections = [['about', 'About']].concat(e.agenda && e.agenda.length ? [['agenda', 'Agenda']] : [], [['location', 'Location']], e.faq && e.faq.length ? [['faq', 'FAQ']] : [], [['organizer', 'Organizer']]);
    const dateLine = UI.dFmt(e.start, { weekday: 'short', month: 'short', day: 'numeric' });

    return `
    <div class="ev2">
      <div class="container">
        <nav class="crumbs"><a href="#/">Home</a><span>›</span><a href="#/search?cat=${e.category}">${esc(c.name)}</a><span>›</span><em>${esc(e.title)}</em></nav>
        ${e.status === 'draft' ? '<div class="notice warn">Draft — only you can see this page. <a href="#/manage/' + e.id + '">Publish it</a></div>' : ''}

        <section class="ev2-top">
          <div class="ev2-media">
            ${cover(e, { w: 1100, sizes: '(max-width: 900px) 100vw, 640px', eager: true })}
            <div class="ev2-media-actions">
              <button class="icon-btn ${liked ? 'liked' : ''}" data-like="${e.id}" aria-label="Save">${liked ? UI.heart : UI.heartOutline}</button>
              <button class="icon-btn" id="shareBtn" aria-label="Share">${ICON.share}</button>
            </div>
          </div>
          <div class="ev2-info">
            <a class="ev2-cat" href="#/search?cat=${e.category}">${c.emoji} ${esc(c.name)}</a>
            <h1>${esc(e.title)}</h1>
            <p class="ev2-summary">${esc(e.summary)}</p>
            <ul class="ev2-facts">
              <li><span class="ic">${ICON.cal}</span><div><b>${esc(longDate(e.start))}</b><span>${time(e.start)} – ${time(e.end)} · ${dur} hrs</span></div></li>
              <li><span class="ic">${e.online ? ICON.screen : ICON.pin}</span><div><b>${e.online ? 'Online event' : esc(e.venue.name)}</b><span>${e.online ? 'Link sent after booking' : esc(e.venue.city + ', ' + e.venue.country)}</span></div></li>
              <li><span class="ic">${ICON.person}</span><div><b>${esc(e.ageLimit)}</b><span>${e.online ? 'Join from anywhere' : 'In-person'} · ${allFree ? 'Free entry' : 'Mobile ticket'}</span></div></li>
            </ul>
            <div class="ev2-buy">
              <div><div class="ev2-price">${priceFrom(e)}</div><div class="ev2-avail">${ended ? 'This event has ended' : left === 0 ? 'All tickets are gone' : left < 50 ? `<span class="hot">🔥 Only ${left} left</span>` : `${left} tickets available`}</div></div>
              <button class="btn btn-primary btn-lg" data-buy ${disabled}>${cta}</button>
            </div>
          </div>
        </section>
      </div>

      <div class="ev2-tabs" id="evTabs"><div class="container">${sections.map(([k, l], i) => `<button data-sec="${k}" class="${i === 0 ? 'on' : ''}">${l}</button>`).join('')}</div></div>

      <div class="container ev2-body">
        <div class="ev2-main">
          <section class="ev2-sec" id="sec-about">
            <h2>About this event</h2>
            ${(e.description || '').split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join('')}
            ${e.tags && e.tags.length ? `<div class="tags" style="margin-top:18px">${e.tags.map(t => `<a href="#/search?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>` : ''}
          </section>

          ${e.agenda && e.agenda.length ? `<section class="ev2-sec" id="sec-agenda"><h2>Agenda</h2><ol class="timeline">${e.agenda.map(a => `<li><time>${esc(a.time)}</time><span>${esc(a.title)}</span></li>`).join('')}</ol></section>` : ''}

          <section class="ev2-sec" id="sec-location">
            <h2>Location</h2>
            ${e.online
              ? `<div class="loc-card"><span class="ic">${ICON.screen}</span><div><b>Online event</b><p>You'll get a joining link by email right after you book.</p></div></div>`
              : `<div class="loc-card"><span class="ic">${ICON.pin}</span><div><b>${esc(e.venue.name)}</b><p>${esc(e.venue.address)}, ${esc(e.venue.city)}, ${esc(e.venue.country)}</p><a href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noopener">Get directions ↗</a></div></div>
                 <div class="map-box"><iframe loading="lazy" title="Map" src="https://maps.google.com/maps?q=${mapQ}&z=14&output=embed"></iframe></div>`}
          </section>

          ${e.faq && e.faq.length ? `<section class="ev2-sec faq" id="sec-faq"><h2>Frequently asked questions</h2>${e.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
            <details><summary>What's the refund policy?</summary><p>${esc(e.refund)}</p></details></section>` : ''}

          <section class="ev2-sec" id="sec-organizer">
            <h2>Organizer</h2>
            <div class="org-card">
              <div class="avatar">${initials(org.name)}</div>
              <div class="grow"><a href="#/organizer/${org.id}"><b>${esc(org.name)}</b></a><span class="muted">${compact(org.followers + (following ? 1 : 0))} followers · ${Store.organizerEvents(org.id).length} upcoming events</span><p>${esc(org.bio)}</p></div>
              ${Store.canEdit(e) ? `<a class="btn btn-outline btn-sm" href="#/manage/${e.id}">Manage event</a>` : `<button class="btn ${following ? 'btn-outline' : 'btn-primary'} btn-sm" id="followBtn">${following ? '✓ Following' : 'Follow'}</button>`}
            </div>
          </section>
        </div>

        <aside class="ev2-side">
          <div class="side-card">
            <div class="side-date"><span class="cal-chip"><small>${UI.dFmt(e.start, { month: 'short' })}</small><b>${new Date(e.start).getDate()}</b></span><div><b>${dateLine}</b><span>${time(e.start)} · ${esc(e.online ? 'Online' : e.venue.city)}</span></div></div>
            <ul class="side-tiers">${e.tiers.map(t => { const l = t.qty - t.sold; return `<li class="${l <= 0 ? 'out' : ''}"><div><b>${esc(t.name)}</b>${t.desc ? `<span>${esc(t.desc)}</span>` : ''}</div><em>${l <= 0 ? 'Sold out' : money(t.price)}</em></li>`; }).join('')}</ul>
            <button class="btn btn-primary btn-block btn-lg" data-buy ${disabled}>${cta}</button>
            <button class="btn btn-ghost btn-block btn-sm" id="addCal" style="margin-top:6px">＋ Add to calendar</button>
            <div class="side-trust"><span>🔒 Secure checkout</span><span>📱 Instant e-tickets</span></div>
          </div>
        </aside>
      </div>

      ${more.length ? `<section class="container ev2-more"><div class="section-head"><h2>You might also like</h2><a href="#/search?cat=${e.category}">See all ${esc(c.name.toLowerCase())} →</a></div>${grid(more)}</section>` : ''}

      <div class="mobile-buy"><div><b>${priceFrom(e)}</b><div class="muted" style="font-size:.8rem">${dateLine} · ${time(e.start)}</div></div><button class="btn btn-primary" data-buy ${disabled}>${cta}</button></div>
    </div>`;
  }
  function eventMount(id) {
    const e = Store.getEvent(id); if (!e) return;
    $$('[data-buy]').forEach(b => b.onclick = () => { window.location.hash = '#/checkout/' + e.id; });
    const f = $('#followBtn');
    if (f) f.onclick = () => { const r = Store.toggleFollow(e.organizerId); if (r === null) return Auth.open('login', () => App.render()); toast(r ? 'You are now following ' + Store.organizer(e.organizerId).name : 'Unfollowed'); App.render(); };
    $('#addCal').onclick = () => UI.icsFor(e);
    $('#shareBtn').onclick = () => share(e);
    // section tabs: smooth scroll + highlight current section
    const tabs = $('#evTabs');
    tabs.addEventListener('click', ev => { const b = ev.target.closest('[data-sec]'); if (!b) return; const s = $('#sec-' + b.dataset.sec); window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 124, behavior: 'smooth' }); });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) $$('#evTabs [data-sec]').forEach(b => b.classList.toggle('on', 'sec-' + b.dataset.sec === en.target.id)); });
      }, { rootMargin: '-130px 0px -60% 0px' });
      $$('.ev2-sec').forEach(s => io.observe(s));
    }
  }
  function share(e) {
    const url = window.location.href.split('?')[0];
    const enc = encodeURIComponent;
    openModal(`<div class="modal-head"><h3>Share this event</h3><button class="modal-close" data-close>×</button></div>
      <div class="modal-body">
        <div class="field"><label>Event link</label><div style="display:flex;gap:8px"><input class="input" id="shareUrl" readonly value="${esc(url)}"><button class="btn btn-primary" id="copyUrl">Copy</button></div></div>
        <div class="chips">
          <a class="chip" target="_blank" rel="noopener" href="https://wa.me/?text=${enc(e.title + ' ' + url)}">WhatsApp</a>
          <a class="chip" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${enc(e.title)}&url=${enc(url)}">X / Twitter</a>
          <a class="chip" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}">Facebook</a>
          <a class="chip" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}">LinkedIn</a>
          <a class="chip" href="mailto:?subject=${enc(e.title)}&body=${enc(url)}">Email</a>
        </div>
      </div>`, { size: 'sm', noFocus: true });
    $('#copyUrl').onclick = () => { const i = $('#shareUrl'); i.select(); try { navigator.clipboard.writeText(i.value); } catch (x) { document.execCommand('copy'); } toast('Link copied'); };
  }

  /* ================= CHECKOUT (full-page, step by step) ================= */
  const HOLD_MIN = 10;
  const PAY = {
    mtn: { name: 'MTN MoMo', icon: '<span class="pm-logo mtn">MTN</span>', hint: '077 / 078 / 076', re: /^0?7[678]\d{7}$/ },
    airtel: { name: 'Airtel Money', icon: '<span class="pm-logo airtel">airtel</span>', hint: '070 / 075 / 074', re: /^0?7[045]\d{7}$/ },
    card: { name: 'Card', icon: '<span class="pm-logo card">VISA · MC</span>' },
    bank: { name: 'Bank transfer', icon: '<span class="pm-logo bank">BANK</span>' }
  };
  let CK = null; // checkout state survives re-renders of the same event
  let lastBuyer = null; // remember contact details between purchases in this session

  function checkoutPage(id) {
    const e = Store.getEvent(id);
    if (!e) return notFound('That event could not be found.');
    if (new Date(e.end) < new Date() || remaining(e) === 0) return notFound('Tickets for this event are no longer available.');
    if (!CK || CK.eventId !== id || CK.step === 'done') {
      const u = Store.user();
      CK = { eventId: id, step: 1, qty: {}, promo: null, promoCode: '', pay: 'mtn', attendees: false, names: [],
        buyer: lastBuyer ? Object.assign({}, lastBuyer) : { first: u ? u.name.split(' ')[0] : '', last: u ? u.name.split(' ').slice(1).join(' ') : '', email: u ? u.email : '', email2: u ? u.email : '', phone: '' },
        payer: { phone: '', cardName: '', cardNo: '', exp: '', cvc: '' }, holdUntil: Date.now() + HOLD_MIN * 60000, order: null };
      e.tiers.forEach(t => CK.qty[t.id] = 0);
      const avail = e.tiers.filter(t => t.qty - t.sold > 0);
      if (avail.length === 1) CK.qty[avail[0].id] = 1;
    }
    return `<div class="co" id="co"></div>`;
  }

  function ckTotals(e) {
    const items = e.tiers.filter(t => CK.qty[t.id] > 0).map(t => ({ tierId: t.id, name: t.name, price: t.price, qty: CK.qty[t.id] }));
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
    const disc = CK.promo ? Math.round(sub * CK.promo.pct / 100) : 0;
    const count = items.reduce((s, i) => s + i.qty, 0);
    const fees = Store.feeFor(sub - disc, count);
    return { items, sub, disc, fees, count, total: sub - disc + fees };
  }

  function checkoutMount(id) {
    const e = Store.getEvent(id); const root = $('#co'); if (!e || !root) return;
    let timer = null;
    const free = () => ckTotals(e).total === 0 && ckTotals(e).count > 0;
    const steps = () => free() || (ckTotals(e).count === 0 && e.tiers.every(t => t.price === 0)) ? ['Tickets', 'Details', 'Confirmed'] : ['Tickets', 'Details', 'Payment', 'Confirmed'];
    const stepIndex = () => CK.step === 'done' ? steps().length : CK.step === 'pay' ? 3 : CK.step;

    const summary = () => {
      const t = ckTotals(e);
      return `<div class="co-sum">
        <div class="co-sum-ev"><div class="co-thumb">${cover(e, { w: 240, sizes: '96px' })}</div><div><b>${esc(e.title)}</b><span>${UI.dFmt(e.start, { weekday: 'short', month: 'short', day: 'numeric' })} · ${time(e.start)}</span><span>${esc(locText(e))}</span></div></div>
        ${t.items.length ? `
          <div class="co-lines">${t.items.map(i => `<div class="summary-line"><span>${i.qty} × ${esc(i.name)}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
          ${t.disc ? `<div class="summary-line ok"><span>Promo ${esc(CK.promo.code)} (−${CK.promo.pct}%)</span><span>− ${moneyPlain(t.disc)}</span></div>` : ''}
          ${t.fees ? `<div class="summary-line"><span>Service fee</span><span>${moneyPlain(t.fees)}</span></div>` : ''}</div>
          <div class="summary-line total"><span>Total</span><span>${t.total === 0 ? 'Free' : moneyPlain(t.total)}</span></div>`
          : `<p class="muted co-empty">Your selected tickets will appear here.</p>`}
        <div class="co-trust"><span>🔒 Payments are encrypted</span><span>↩︎ ${esc(e.refund)}</span></div>
      </div>`;
    };

    const stepTickets = () => {
      const t = ckTotals(e);
      return `<h2>Choose your tickets</h2><p class="muted">Select how many you need — up to 10 per ticket type.</p>
        <div class="co-tiers">${e.tiers.map(tr => { const l = tr.qty - tr.sold; const out = l <= 0; const q = CK.qty[tr.id]; return `<div class="co-tier ${q ? 'sel' : ''} ${out ? 'out' : ''}">
          <div class="co-tier-info"><b>${esc(tr.name)}</b>${tr.desc ? `<span>${esc(tr.desc)}</span>` : ''}${!out && l <= 20 ? `<span class="hot">Only ${l} left</span>` : ''}</div>
          <div class="co-tier-price">${money(tr.price)}${tr.price ? '<small>+ fee</small>' : ''}</div>
          ${out ? '<span class="badge danger">Sold out</span>' : `<div class="qty"><button data-dec="${tr.id}" ${q <= 0 ? 'disabled' : ''} aria-label="Remove one">−</button><span>${q}</span><button data-inc="${tr.id}" ${q >= Math.min(10, l) ? 'disabled' : ''} aria-label="Add one">+</button></div>`}
        </div>`; }).join('')}</div>
        <details class="co-promo" ${CK.promo || CK.promoCode ? 'open' : ''}><summary>Have a promo code?</summary>
          <div class="co-promo-row"><input class="input" id="promo" placeholder="Enter code" value="${esc(CK.promoCode)}"><button class="btn btn-outline" id="applyPromo">Apply</button></div>
          <div class="hint">${CK.promo ? `<span class="ok">✓ ${CK.promo.pct}% discount applied</span>` : 'Try <b>NOVA10</b> for 10% off.'}</div>
        </details>
        <div class="co-actions"><a class="btn btn-ghost" href="#/event/${e.id}">← Back to event</a><button class="btn btn-primary btn-lg" data-next ${t.count ? '' : 'disabled'}>Continue${t.count ? ` · ${t.count} ticket${t.count > 1 ? 's' : ''}` : ''}</button></div>`;
    };

    const stepDetails = () => {
      const t = ckTotals(e); const b = CK.buyer;
      return `<h2>Your details</h2><p class="muted">We'll send your tickets and receipt to this email.</p>
        ${!Store.user() ? `<div class="co-login"><span>Already have an account? Log in to check out faster.</span><button class="btn btn-outline btn-sm" id="ckLogin">Log in</button></div>` : ''}
        <div class="row"><div class="field"><label>First name</label><input class="input" name="first" value="${esc(b.first)}" autocomplete="given-name" required></div><div class="field"><label>Last name</label><input class="input" name="last" value="${esc(b.last)}" autocomplete="family-name" required></div></div>
        <div class="row"><div class="field"><label>Email</label><input class="input" type="email" name="email" value="${esc(b.email)}" autocomplete="email" required></div><div class="field"><label>Confirm email</label><input class="input" type="email" name="email2" value="${esc(b.email2)}" autocomplete="email" required></div></div>
        <div class="field"><label>Phone number <span class="muted" style="font-weight:400">(for event updates)</span></label><input class="input" type="tel" name="phone" value="${esc(b.phone)}" placeholder="07XX XXX XXX" autocomplete="tel"></div>
        ${t.count > 1 ? `<label class="co-check"><input type="checkbox" id="attToggle" ${CK.attendees ? 'checked' : ''}> Tickets are for different people — add each attendee's name</label>
          <div id="attList" class="${CK.attendees ? '' : 'hidden'}">${Array.from({ length: t.count }, (_, i) => `<div class="field"><label>Attendee ${i + 1} ${i === 0 ? '(you)' : ''}</label><input class="input" data-att="${i}" value="${esc(CK.names[i] || (i === 0 ? (b.first + ' ' + b.last).trim() : ''))}" placeholder="Full name"></div>`).join('')}</div>` : ''}
        <label class="co-check"><input type="checkbox" id="agree"> I agree to the <a href="#/terms" target="_blank">Terms</a> and the organizer's refund policy.</label>
        <div class="err hidden" id="ckErr"></div>
        <div class="co-actions"><button class="btn btn-ghost" data-back>← Back</button><button class="btn btn-primary btn-lg" data-next>${free() ? 'Complete registration' : 'Continue to payment'}</button></div>`;
    };

    const stepPayment = () => {
      const t = ckTotals(e); const m = CK.pay; const p = CK.payer;
      let body = '';
      if (m === 'mtn' || m === 'airtel') body = `<div class="field"><label>${PAY[m].name} number</label><input class="input input-lg" name="phone" inputmode="numeric" value="${esc(p.phone || CK.buyer.phone)}" placeholder="${PAY[m].hint.split(' / ')[0]}X XXX XXX" autocomplete="tel"><div class="hint">Numbers starting ${PAY[m].hint}. You'll get a prompt on your phone to enter your PIN.</div></div>`;
      else if (m === 'card') body = `<div class="field"><label>Name on card</label><input class="input" name="cardName" value="${esc(p.cardName || (CK.buyer.first + ' ' + CK.buyer.last).trim())}" autocomplete="cc-name"></div>
          <div class="field"><label>Card number</label><div class="card-input"><input class="input" name="cardNo" inputmode="numeric" value="${esc(p.cardNo)}" placeholder="1234 5678 9012 3456" autocomplete="cc-number" maxlength="23"><span id="cardBrand"></span></div><div class="hint">Test card: 4242 4242 4242 4242</div></div>
          <div class="row"><div class="field"><label>Expiry</label><input class="input" name="exp" value="${esc(p.exp)}" placeholder="MM / YY" autocomplete="cc-exp" maxlength="7"></div><div class="field"><label>CVC</label><input class="input" name="cvc" value="${esc(p.cvc)}" placeholder="123" inputmode="numeric" autocomplete="cc-csc" maxlength="4"></div></div>`;
      else body = `<div class="bank-box"><div><span>Bank</span><b>Demo Bank (replace with yours)</b></div><div><span>Account name</span><b>Nova Tickets Ltd</b></div><div><span>Account no.</span><b>9030 0123 4567</b></div><div><span>Reference</span><b>${'NV' + e.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-4) + String(t.total).slice(-4)}</b></div><div><span>Amount</span><b>${moneyPlain(t.total)}</b></div></div><p class="hint">Use the reference exactly so we can match your payment. Tickets are issued as soon as the transfer is confirmed.</p>`;
      return `<h2>Payment</h2><p class="muted">Choose how you'd like to pay <b>${moneyPlain(t.total)}</b>.</p>
        <div class="pm-grid">${Object.keys(PAY).map(k => `<button type="button" class="pm ${m === k ? 'on' : ''}" data-pm="${k}">${PAY[k].icon}<span>${PAY[k].name}</span></button>`).join('')}</div>
        <div class="pm-body">${body}</div>
        <div class="err hidden" id="ckErr"></div>
        <div class="co-actions"><button class="btn btn-ghost" data-back>← Back</button><button class="btn btn-primary btn-lg" data-next>${m === 'bank' ? "I've made the transfer" : 'Pay ' + moneyPlain(t.total)}</button></div>
        <p class="co-demo">Demo checkout — no real money is charged.</p>`;
    };

    const stepDone = () => {
      const o = CK.order;
      return `<div class="co-done">
        <div class="co-check-anim"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
        <h2>You're going! 🎉</h2>
        <p class="muted">Order <b>#${o.id}</b> is confirmed. ${o.tickets.length} ticket${o.tickets.length > 1 ? 's were' : ' was'} sent to <b>${esc(o.buyer.email)}</b>.</p>
        <div class="co-ticket">
          <div class="co-ticket-main"><small>${esc(UI.dFmt(e.start, { weekday: 'long', month: 'long', day: 'numeric' }))} · ${time(e.start)}</small><b>${esc(e.title)}</b><span>${esc(locText(e))}</span><span class="co-ticket-who">${esc(o.tickets[0].holder || (o.buyer.first + ' ' + o.buyer.last))} · ${esc(o.tickets[0].tierName)}${o.tickets.length > 1 ? ` + ${o.tickets.length - 1} more` : ''}</span></div>
          <div class="co-ticket-qr">${qr(o.tickets[0].code)}<small>${o.tickets[0].code}</small></div>
        </div>
        <div class="co-done-actions">
          <a class="btn btn-primary btn-lg" href="#/tickets/${o.id}">View my tickets</a>
          <button class="btn btn-outline" id="doneCal">Add to calendar</button>
          <button class="btn btn-outline" id="doneShare">Invite friends</button>
        </div>
        ${!Store.user() ? '<p class="muted" style="font-size:.85rem">Create a free account with this email to see your tickets any time.</p>' : ''}
        <a class="co-more" href="#/search">Discover more events →</a>
      </div>`;
    };

    const paint = () => {
      const st = steps(); const si = stepIndex();
      const done = CK.step === 'done';
      const mins = Math.max(0, CK.holdUntil - Date.now());
      root.innerHTML = `
        <div class="co-bar"><div class="container co-bar-in">
          <a class="co-back" href="#/event/${e.id}">← <span>${esc(e.title)}</span></a>
          ${done ? '' : `<div class="co-timer" id="coTimer">⏱ Tickets held for <b>${fmtClock(mins)}</b></div>`}
        </div></div>
        <div class="container">
          <ol class="stepper">${st.map((s, i) => `<li class="${i + 1 < si ? 'done' : i + 1 === si ? 'cur' : ''}"><span>${i + 1 < si ? '✓' : i + 1}</span>${s}</li>`).join('')}</ol>
          <div class="co-grid ${done ? 'co-grid-done' : ''}">
            <div class="co-card" id="coCard">${CK.step === 1 ? stepTickets() : CK.step === 2 ? stepDetails() : CK.step === 'pay' || CK.step === 3 ? stepPayment() : stepDone()}</div>
            ${done ? '' : `<aside class="co-side"><details class="co-sum-toggle" open><summary><span>Order summary</span><b>${ckTotals(e).count ? (ckTotals(e).total ? moneyPlain(ckTotals(e).total) : 'Free') : 'No tickets yet'}</b></summary>${summary()}</details></aside>`}
          </div>
        </div>`;
      bind();
      if (window.innerWidth < 860) { const d = $('.co-sum-toggle'); if (d) d.open = false; }
    };

    const saveInputs = () => {
      $$('#coCard [name]').forEach(i => { if (i.name in CK.buyer && CK.step === 2) CK.buyer[i.name] = i.value.trim(); if (i.name in CK.payer && CK.step !== 2) CK.payer[i.name] = i.value.trim(); });
      $$('#coCard [data-att]').forEach(i => { CK.names[+i.dataset.att] = i.value.trim(); });
    };
    const fail = (msg, el) => { const err = $('#ckErr'); err.textContent = msg; err.classList.remove('hidden'); if (el) { el.classList.add('invalid'); el.focus(); } };
    const go = step => { saveInputs(); CK.step = step; paint(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    const validateDetails = () => {
      $$('#coCard .invalid').forEach(i => i.classList.remove('invalid'));
      const b = CK.buyer;
      if (!b.first) return fail('Please enter your first name.', $('[name=first]'));
      if (!b.last) return fail('Please enter your last name.', $('[name=last]'));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) return fail('Please enter a valid email address.', $('[name=email]'));
      if (b.email.toLowerCase() !== b.email2.toLowerCase()) return fail("The two email addresses don't match.", $('[name=email2]'));
      if (b.phone && !/^\+?[\d\s]{9,15}$/.test(b.phone)) return fail('Please check your phone number.', $('[name=phone]'));
      if (!$('#agree').checked) return fail('Please accept the terms to continue.');
      return true;
    };
    const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };
    const validatePayment = () => {
      $$('#coCard .invalid').forEach(i => i.classList.remove('invalid'));
      const p = CK.payer, m = CK.pay;
      if (m === 'mtn' || m === 'airtel') { const ph = p.phone.replace(/\D/g, '').replace(/^256/, '0'); if (!PAY[m].re.test(ph)) return fail(`Enter a valid ${PAY[m].name} number (starts ${PAY[m].hint}).`, $('[name=phone]')); }
      if (m === 'card') {
        const no = p.cardNo.replace(/\D/g, '');
        if (!p.cardName) return fail('Enter the name on the card.', $('[name=cardName]'));
        if (no.length < 13 || !luhn(no)) return fail('That card number looks incorrect.', $('[name=cardNo]'));
        const mm = p.exp.match(/^(\d{2})\s*\/\s*(\d{2})$/); const now = new Date();
        if (!mm || +mm[1] < 1 || +mm[1] > 12 || new Date(2000 + +mm[2], +mm[1]) <= now) return fail('Enter a valid, unexpired date (MM / YY).', $('[name=exp]'));
        if (!/^\d{3,4}$/.test(p.cvc)) return fail('Enter the 3–4 digit security code.', $('[name=cvc]'));
      }
      return true;
    };

    const place = () => {
      try {
        const t = ckTotals(e);
        const o = Store.placeOrder({ eventId: e.id, items: t.items, buyer: { first: CK.buyer.first, last: CK.buyer.last, email: CK.buyer.email, phone: CK.buyer.phone }, payment: t.total === 0 ? 'free' : CK.pay, promo: CK.promo });
        if (CK.attendees) o.tickets.forEach((tk, i) => { tk.holder = CK.names[i] || ''; });
        lastBuyer = Object.assign({}, CK.buyer);
        CK.order = o; CK.step = 'done'; clearInterval(timer); paint(); App.renderHeader(); window.scrollTo(0, 0);
        const cv = document.createElement('canvas'); cv.className = 'co-confetti'; document.body.appendChild(cv);
        if (window.NovaConfetti) { const c = NovaConfetti(cv); setTimeout(() => { c.stop(); cv.remove(); }, 4500); }
      } catch (x) { CK.step = 1; paint(); toast(x.message); }
    };

    const processing = () => {
      const t = ckTotals(e); const m = CK.pay;
      const phone = (CK.payer.phone || '').replace(/\D/g, '').replace(/^256/, '0');
      const html = m === 'card'
        ? `<div class="proc"><div class="spinner"></div><h3>Securely processing your card…</h3><p class="muted">Verifying with your bank. Please don't close this page.</p></div>`
        : m === 'bank'
          ? `<div class="proc"><div class="spinner"></div><h3>Checking for your transfer…</h3><p class="muted">In this demo, we'll confirm it straight away.</p></div>`
          : `<div class="proc"><div class="phone-anim"><div class="phone-screen"><small>${PAY[m].name}</small><b>Pay ${moneyPlain(t.total)}</b><span>to NOVA TICKETS</span><i>Enter PIN</i></div></div>
              <h3>Check your phone</h3><p class="muted">We sent a payment request to <b>${esc(phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3'))}</b>.<br>Enter your ${PAY[m].name} PIN to approve.</p>
              <div class="proc-wait"><div class="spinner sm"></div>Waiting for approval… <b id="procCount">60</b>s</div>
              <div class="proc-actions"><button class="btn btn-ghost btn-sm" id="procCancel">Cancel</button><button class="btn btn-outline btn-sm" id="procApprove">Simulate approval</button></div></div>`;
      $('#coCard').innerHTML = html;
      let n = 60, done = false;
      const finish = () => { if (done) return; done = true; clearInterval(cd); place(); };
      const cd = setInterval(() => { n--; const el = $('#procCount'); if (el) el.textContent = n; if (n <= 0) { clearInterval(cd); if (!done) { CK.step = 'pay'; paint(); fail('The request timed out. Please try again.'); } } }, 1000);
      if (m === 'card' || m === 'bank') setTimeout(finish, 2200);
      else { setTimeout(finish, 6000); $('#procApprove').onclick = finish; $('#procCancel').onclick = () => { done = true; clearInterval(cd); CK.step = 'pay'; paint(); }; }
    };

    function bind() {
      root.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { CK.qty[b.dataset.inc]++; paint(); });
      root.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { CK.qty[b.dataset.dec]--; paint(); });
      const ap = $('#applyPromo'); if (ap) ap.onclick = () => { CK.promoCode = $('#promo').value.trim(); const p = Store.validatePromo(CK.promoCode, e); CK.promo = p; toast(p ? 'Promo code applied' : "That code isn't valid for this event"); paint(); };
      const promo = $('#promo'); if (promo) promo.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); ap.click(); } };
      root.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { saveInputs(); CK.pay = b.dataset.pm; paint(); });
      const att = $('#attToggle'); if (att) att.onchange = () => { saveInputs(); CK.attendees = att.checked; const a0 = $('[data-att="0"]'); if (a0 && !a0.value) a0.value = (CK.buyer.first + ' ' + CK.buyer.last).trim(); $('#attList').classList.toggle('hidden', !att.checked); };
      const li = $('#ckLogin'); if (li) li.onclick = () => { saveInputs(); Auth.open('login', () => { const u = Store.user(); if (u) { CK.buyer.first = CK.buyer.first || u.name.split(' ')[0]; CK.buyer.last = CK.buyer.last || u.name.split(' ').slice(1).join(' '); CK.buyer.email = CK.buyer.email2 = u.email; } paint(); }); };
      const back = root.querySelector('[data-back]'); if (back) back.onclick = () => go(CK.step === 2 ? 1 : 2);
      const next = root.querySelector('[data-next]');
      if (next) next.onclick = () => {
        saveInputs();
        if (CK.step === 1) return go(2);
        if (CK.step === 2) { if (!validateDetails()) return; if (free()) { next.disabled = true; next.textContent = 'Confirming…'; return setTimeout(place, 700); } return go('pay'); }
        if (CK.step === 'pay') { if (!validatePayment()) return; processing(); }
      };
      // card formatting
      const cn = $('[name=cardNo]');
      if (cn) {
        const brand = () => { const v = cn.value.replace(/\D/g, ''); $('#cardBrand').textContent = /^4/.test(v) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(v) ? 'Mastercard' : /^3[47]/.test(v) ? 'AMEX' : ''; };
        cn.oninput = () => { const v = cn.value.replace(/\D/g, '').slice(0, 19); cn.value = v.replace(/(.{4})/g, '$1 ').trim(); brand(); }; brand();
        const ex = $('[name=exp]'); ex.oninput = () => { const v = ex.value.replace(/\D/g, '').slice(0, 4); ex.value = v.length > 2 ? v.slice(0, 2) + ' / ' + v.slice(2) : v; };
      }
      root.querySelectorAll('#coCard input').forEach(i => i.addEventListener('keydown', ev => { if (ev.key === 'Enter' && i.type !== 'checkbox' && i.id !== 'promo') { ev.preventDefault(); const n = root.querySelector('[data-next]'); if (n) n.click(); } }));
      const dc = $('#doneCal'); if (dc) dc.onclick = () => UI.icsFor(e);
      const ds = $('#doneShare'); if (ds) ds.onclick = () => share(e);
    }

    function fmtClock(ms) { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    timer = setInterval(() => {
      if (!document.body.contains(root)) return clearInterval(timer);
      if (CK.step === 'done') return clearInterval(timer);
      const ms = CK.holdUntil - Date.now(); const el = $('#coTimer');
      if (el) { el.querySelector('b').textContent = fmtClock(ms); el.classList.toggle('low', ms < 120000); }
      if (ms <= 0) {
        clearInterval(timer);
        openModal(`<div class="modal-head"><h3>Time's up</h3></div><div class="modal-body"><p>We held your tickets for ${HOLD_MIN} minutes. They've been released so others can book.</p><button class="btn btn-primary btn-block" id="restart">Start again</button></div>`, { size: 'sm' });
        $('#restart').onclick = () => { CK = null; closeModal(); App.render(); };
      }
    }, 1000);
    paint();
  }
  const Checkout = { open(id) { window.location.hash = '#/checkout/' + id; } };

  /* ================= AUTH ================= */
  const Auth = {
    open(mode, after) {
      const paint = () => {
        const signup = mode === 'signup';
        openModal(`<div class="modal-head"><h3>${signup ? 'Create your account' : 'Log in'}</h3><button class="modal-close" data-close>×</button></div>
          <div class="modal-body">
            <form id="authForm" novalidate>
              ${signup ? '<div class="field"><label>Full name</label><input class="input" name="name" required autocomplete="name"></div>' : ''}
              <div class="field"><label>Email address</label><input class="input" type="email" name="email" required autocomplete="email"></div>
              <div class="field"><label>Password</label><input class="input" type="password" name="password" required minlength="${signup ? 6 : 1}" autocomplete="${signup ? 'new-password' : 'current-password'}">${signup ? '<div class="hint">At least 6 characters</div>' : ''}</div>
              <div class="err hidden" id="authErr"></div>
              <button class="btn btn-primary btn-block btn-lg" type="submit">${signup ? 'Sign up' : 'Log in'}</button>
            </form>
            <p class="muted" style="text-align:center;margin:18px 0 0;font-size:.9rem">${signup ? 'Already have an account?' : 'New to Nova?'} <a href="javascript:void 0" id="authSwap">${signup ? 'Log in' : 'Sign up'}</a></p>
            <p class="muted" style="text-align:center;font-size:.75rem;margin-top:12px">Demo accounts are stored only in this browser.</p>
          </div>`, { size: 'sm' });
        $('#authSwap').onclick = () => { mode = signup ? 'login' : 'signup'; paint(); };
        $('#authForm').onsubmit = ev => {
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target));
          const err = $('#authErr');
          try {
            if (signup) {
              if (!d.name.trim()) throw new Error('Please enter your name.');
              if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) throw new Error('Please enter a valid email.');
              if (d.password.length < 6) throw new Error('Password must be at least 6 characters.');
              Store.signUp(d); toast('Welcome to Nova, ' + d.name.split(' ')[0] + '!');
            } else { Store.logIn(d); toast('Welcome back!'); }
            closeModal(); App.renderHeader();
            if (after) after(); else App.render();
          } catch (x) { err.textContent = x.message; err.classList.remove('hidden'); }
        };
      };
      paint();
    }
  };

  /* ================= TICKETS ================= */
  function requireAuth(title) {
    return `<div class="page-head"><div class="container"><h1>${title}</h1></div></div><div class="container"><div class="empty"><div class="big">🔐</div><h3>Log in to continue</h3><p>Sign in to see this page.</p><button class="btn btn-primary" onclick="Auth.open('login')">Log in</button> <button class="btn btn-outline" onclick="Auth.open('signup')">Sign up</button></div></div>`;
  }
  function tickets() {
    if (!Store.user()) return requireAuth('Tickets');
    const orders = Store.myOrders();
    const now = new Date();
    const withEv = orders.map(o => ({ o, e: Store.getEvent(o.eventId) })).filter(x => x.e);
    const up = withEv.filter(x => new Date(x.e.end) >= now && !x.o.cancelled);
    const past = withEv.filter(x => new Date(x.e.end) < now || x.o.cancelled);
    const row = ({ o, e }) => { const d = new Date(e.start); return `<div class="order">
      <div class="date-box"><small>${d.toLocaleString('en-US', { month: 'short' })}</small><b>${d.getDate()}</b></div>
      <div><a href="#/event/${e.id}"><b style="color:var(--ink)">${esc(e.title)}</b></a><div class="muted" style="font-size:.88rem">${cardDate(e.start)} · ${esc(locText(e))}</div><div style="font-size:.85rem;margin-top:4px">${o.tickets.length} ticket${o.tickets.length > 1 ? 's' : ''} · Order #${o.id} ${o.cancelled ? '<span class="badge danger">Cancelled</span>' : ''}</div></div>
      <a class="btn btn-outline btn-sm" href="#/tickets/${o.id}">View tickets</a></div>`; };
    return `<div class="page-head"><div class="container"><h1>Tickets</h1><p class="muted" style="margin:0">All your orders in one place.</p></div></div>
      <div class="container" style="padding:32px 20px 64px">
        <div class="tabs" id="tkTabs"><button class="tab active" data-t="up">Upcoming (${up.length})</button><button class="tab" data-t="past">Past & cancelled (${past.length})</button></div>
        <div data-pane="up">${up.length ? up.map(row).join('') : '<div class="empty"><div class="big">🎟️</div><h3>No upcoming tickets</h3><p>When you register for an event, your tickets will show up here.</p><a class="btn btn-primary" href="#/search">Find events</a></div>'}</div>
        <div data-pane="past" class="hidden">${past.length ? past.map(row).join('') : '<div class="empty"><p>No past orders.</p></div>'}</div>
      </div>`;
  }
  function tabsMount(sel) {
    const t = $(sel); if (!t) return;
    t.addEventListener('click', ev => { const b = ev.target.closest('.tab'); if (!b) return; $$(sel + ' .tab').forEach(x => x.classList.toggle('active', x === b)); $$('[data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== b.dataset.t)); });
  }
  function orderPage(id) {
    const o = Store.myOrders().find(o => o.id === id);
    if (!Store.user()) return requireAuth('Your order');
    if (!o) return notFound('We couldn\'t find that order on your account.');
    const e = Store.getEvent(o.eventId);
    const canCancel = !o.cancelled && new Date(e.start) > new Date();
    return `<div class="page-head"><div class="container"><a href="#/tickets">← Back to tickets</a><h1 style="margin-top:10px">${esc(e.title)}</h1><p class="muted" style="margin:0">Order #${o.id} · placed ${UI.dFmt(o.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} ${o.cancelled ? '<span class="badge danger">Cancelled</span>' : ''}</p></div></div>
      <div class="container" style="padding:32px 20px 64px;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:32px" id="orderGrid">
        <div>
          ${o.tickets.map((t, i) => `<div class="ticket-visual" style="${o.cancelled ? 'filter:grayscale(1);opacity:.6' : ''}">
            <div class="tv-main"><small>Nova · Ticket ${i + 1} of ${o.tickets.length}</small><h3 style="color:#fff;margin:6px 0 0">${esc(e.title)}</h3>
              <div class="tv-grid"><div><small>Date</small><b>${UI.dFmt(e.start, { weekday: 'short', month: 'short', day: 'numeric' })}</b></div><div><small>Time</small><b>${time(e.start)}</b></div><div><small>Ticket</small><b>${esc(t.tierName)}</b></div><div><small>Name</small><b>${esc(t.holder || (o.buyer.first + ' ' + o.buyer.last))}</b></div><div style="grid-column:1/-1"><small>Location</small><b>${esc(locText(e))}</b></div></div></div>
            <div class="tv-stub">${qr(t.code)}<div style="font-size:.72rem;font-weight:600;margin-top:6px;letter-spacing:.04em">${t.code}</div>${t.checkedIn ? '<span class="badge success" style="margin-top:6px">Checked in</span>' : ''}</div>
          </div>`).join('')}
        </div>
        <aside>
          <div class="ticket-panel" style="position:static">
            <h3>Order summary</h3>
            ${o.items.map(i => `<div class="summary-line"><span>${i.qty} × ${esc(i.name)}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
            ${o.discount ? `<div class="summary-line"><span>Discount</span><span>− ${moneyPlain(o.discount)}</span></div>` : ''}
            ${o.fees ? `<div class="summary-line"><span>Fees</span><span>${moneyPlain(o.fees)}</span></div>` : ''}
            <div class="summary-line total"><span>Total</span><span>${o.total ? moneyPlain(o.total) : 'Free'}</span></div>
            <div class="muted" style="font-size:.85rem;margin:12px 0">Paid with: ${(({ momo: 'Mobile Money', mtn: 'MTN MoMo', airtel: 'Airtel Money', card: 'Card', bank: 'Bank transfer', free: '—' })[o.payment] || o.payment)}</div>
            <button class="btn btn-outline btn-block" onclick="window.print()">Print tickets</button>
            <button class="btn btn-outline btn-block" style="margin-top:8px" id="oCal">Add to calendar</button>
            ${canCancel ? '<button class="btn btn-danger btn-block" style="margin-top:8px" id="oCancel">Cancel order</button>' : ''}
          </div>
        </aside>
      </div>`;
  }
  function orderMount(id) {
    const o = Store.myOrders().find(o => o.id === id); if (!o) return;
    const e = Store.getEvent(o.eventId);
    if (window.innerWidth < 860) $('#orderGrid').style.gridTemplateColumns = '1fr';
    $('#oCal').onclick = () => UI.icsFor(e);
    const c = $('#oCancel');
    if (c) c.onclick = () => confirmBox('Cancel this order?', 'Your tickets will be released. ' + e.refund, 'Cancel order', () => { Store.cancelOrder(o.id); toast('Order cancelled'); App.render(); });
  }
  function confirmBox(title, text, label, ok) {
    openModal(`<div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" data-close>×</button></div><div class="modal-body"><p>${esc(text)}</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-ghost" data-close>Keep it</button><button class="btn btn-primary" id="cfOk">${esc(label)}</button></div></div>`, { size: 'sm', noFocus: true });
    $('#cfOk').onclick = () => { closeModal(); ok(); };
  }

  /* ================= LIKES ================= */
  function likes() {
    if (!Store.user()) return requireAuth('Likes');
    return `<div class="page-head"><div class="container"><h1>Likes</h1><p class="muted" style="margin:0">Events you've saved for later.</p></div></div><div class="container" style="padding:32px 20px 64px">${grid(Store.likedEvents(), 'No saved events yet')}</div>`;
  }

  /* ================= ORGANIZER PROFILE ================= */
  function organizerPage(id) {
    const o = Store.organizer(id);
    const evs = Store.organizerEvents(id);
    const f = Store.isFollowing(id);
    return `<div class="page-head"><div class="container" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
        <div class="avatar" style="width:88px;height:88px;font-size:2rem">${initials(o.name)}</div>
        <div style="flex:1;min-width:220px"><h1>${esc(o.name)}</h1><p class="muted" style="margin:0 0 6px">${esc(o.bio)}</p><b>${compact(o.followers + (f ? 1 : 0))}</b> <span class="muted">followers</span> · <b>${evs.length}</b> <span class="muted">upcoming events</span></div>
        <button class="btn ${f ? 'btn-outline' : 'btn-primary'}" id="orgFollow">${f ? 'Following' : 'Follow'}</button>
      </div></div>
      <div class="container" style="padding:32px 20px 64px"><h2>Upcoming events</h2>${grid(evs, 'No upcoming events')}</div>`;
  }
  function organizerMount(id) {
    $('#orgFollow').onclick = () => { const r = Store.toggleFollow(id); if (r === null) return Auth.open('login', () => App.render()); toast(r ? 'Following' : 'Unfollowed'); App.render(); };
  }

  /* ================= CREATE / EDIT ================= */
  function toLocalInput(iso) { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
  function createPage(editId) {
    const u = Store.user();
    if (!u) return `<div class="page-head"><div class="container"><h1>Create an event</h1></div></div><div class="container"><div class="empty"><div class="big">✨</div><h3>Sign up to start hosting</h3><p>Create a free account to publish events and sell tickets.</p><button class="btn btn-primary" onclick="Auth.open('signup')">Sign up free</button> <button class="btn btn-outline" onclick="Auth.open('login')">Log in</button></div></div>`;
    let e = editId ? Store.getEvent(editId) : null;
    if (editId && (!e || !Store.canEdit(e))) return notFound('You can only edit events you created.');
    const start = new Date(); start.setDate(start.getDate() + 14); start.setHours(18, 0, 0, 0);
    e = e || { title: '', summary: '', description: '', category: 'music', online: false, venue: { name: '', address: '', city: 'Kampala', country: 'Uganda' }, start: start.toISOString(), end: new Date(start.getTime() + 3 * 3600000).toISOString(), tiers: [{ id: 't1', name: 'General Admission', price: 0, qty: 100, sold: 0, desc: '' }], palette: 0, photo: Store.categories[0].photo, ageLimit: 'All ages', refund: 'Refunds available up to 7 days before the event.', tags: [], faq: [], agenda: [], promos: [] };
    window.__draft = JSON.parse(JSON.stringify(e));
    return `<div class="page-head"><div class="container"><h1>${editId ? 'Edit event' : 'Create an event'}</h1><p class="muted" style="margin:0">${editId ? 'Changes go live as soon as you save.' : 'Fill in the basics — you can edit everything later.'}</p></div></div>
    <div class="container"><form id="evForm" class="create-layout" novalidate>
      <div>
        <div class="form-card"><h3><span class="num">1</span>Basic info</h3>
          <div class="field"><label>Event title *</label><input class="input" name="title" maxlength="90" required value="${esc(e.title)}" placeholder="Be clear and descriptive"></div>
          <div class="field"><label>Summary *</label><input class="input" name="summary" maxlength="160" required value="${esc(e.summary)}" placeholder="One sentence that makes people want to come"></div>
          <div class="row"><div class="field"><label>Category</label><select class="input" name="category">${Store.categories.map(c => `<option value="${c.id}" ${e.category === c.id ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}</select></div>
            <div class="field"><label>Tags</label><input class="input" name="tags" value="${esc((e.tags || []).join(', '))}" placeholder="comma, separated"></div></div>
          <div class="field"><label>Description</label><textarea class="input" name="description" placeholder="Tell attendees what to expect. Leave a blank line between paragraphs.">${esc(e.description)}</textarea></div>
        </div>

        <div class="form-card"><h3><span class="num">2</span>Cover photo</h3>
          <div class="field"><label>Pick a photo</label><div class="cover-pick" id="coverPick">${Object.values(Store.photos).map(id => `<button type="button" data-photo="${id}" class="${e.photo === id && !e.image ? 'active' : ''}" aria-label="Use this photo"><img src="${UI.photoUrl(id, 160)}" alt="" loading="lazy"></button>`).join('')}</div></div>
          <div class="field"><label>…or upload your own</label><label class="upload"><input type="file" accept="image/*" id="imgUp" hidden>📷 Click to upload (JPG/PNG, max 1.5 MB)</label>${e.image ? '<button type="button" class="btn btn-ghost btn-sm" id="imgRm" style="margin-top:8px">Remove image</button>' : ''}</div>
        </div>

        <div class="form-card"><h3><span class="num">3</span>Date & location</h3>
          <div class="row"><div class="field"><label>Starts *</label><input class="input" type="datetime-local" name="start" required value="${toLocalInput(e.start)}"></div><div class="field"><label>Ends *</label><input class="input" type="datetime-local" name="end" required value="${toLocalInput(e.end)}"></div></div>
          <div class="field"><div class="seg" id="locSeg"><button type="button" data-o="0" class="${!e.online ? 'active' : ''}">Venue</button><button type="button" data-o="1" class="${e.online ? 'active' : ''}">Online event</button></div></div>
          <div id="venueFields" class="${e.online ? 'hidden' : ''}">
            <div class="field"><label>Venue name *</label><input class="input" name="vname" value="${esc(e.venue ? e.venue.name : '')}"></div>
            <div class="field"><label>Address</label><input class="input" name="vaddr" value="${esc(e.venue ? e.venue.address : '')}"></div>
            <div class="row"><div class="field"><label>City *</label><input class="input" name="vcity" value="${esc(e.venue ? e.venue.city : 'Kampala')}"></div><div class="field"><label>Country</label><input class="input" name="vcountry" value="${esc(e.venue ? e.venue.country : 'Uganda')}"></div></div>
          </div>
          <div id="onlineNote" class="hint ${e.online ? '' : 'hidden'}">Attendees receive the joining link by email after registering.</div>
        </div>

        <div class="form-card"><h3><span class="num">4</span>Tickets</h3>
          <div id="tierList"></div>
          <button type="button" class="btn btn-outline btn-sm" id="addTier">+ Add ticket type</button>
          <div class="row" style="margin-top:20px">
            <div class="field"><label>Age restriction</label><select class="input" name="ageLimit">${['All ages', '14+', '16+', '18+', '21+'].map(a => `<option ${e.ageLimit === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
            <div class="field"><label>Refund policy</label><select class="input" name="refund">${['Refunds available up to 7 days before the event.', 'Refunds available up to 1 day before the event.', 'No refunds.'].map(r => `<option ${e.refund === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
          </div>
          <div class="field"><label>Promo code (optional)</label><div class="row"><input class="input" name="promoCode" placeholder="e.g. EARLY20" value="${esc(e.promos && e.promos[0] ? e.promos[0].code : '')}"><input class="input" type="number" min="1" max="100" name="promoPct" placeholder="% off" value="${e.promos && e.promos[0] ? e.promos[0].pct : ''}"></div></div>
        </div>

        <div class="form-card"><h3><span class="num">5</span>Agenda & FAQ <span class="muted" style="font-size:.85rem;font-weight:400">(optional)</span></h3>
          <div class="field"><label>Agenda — one item per line, “time | title”</label><textarea class="input" name="agenda" placeholder="6:00 PM | Doors open">${esc((e.agenda || []).map(a => a.time + ' | ' + a.title).join('\n'))}</textarea></div>
          <div class="field"><label>FAQ — one per line, “question | answer”</label><textarea class="input" name="faq" placeholder="Is there parking? | Yes, free on site.">${esc((e.faq || []).map(f => f.q + ' | ' + f.a).join('\n'))}</textarea></div>
        </div>
        <div class="err hidden" id="evErr" style="margin-bottom:12px"></div>
      </div>
      <aside class="preview-sticky">
        <div class="ticket-panel" style="position:static;padding:18px">
          <b style="font-size:.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Preview</b>
          <div id="preview" style="margin:12px 0 20px"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" data-status="live">${editId && e.status !== 'draft' ? 'Save changes' : 'Publish event'}</button>
          <button type="submit" class="btn btn-outline btn-block" data-status="draft" style="margin-top:8px">Save as draft</button>
          ${editId ? `<a class="btn btn-ghost btn-block" style="margin-top:8px" href="#/manage/${editId}">Cancel</a>` : ''}
        </div>
      </aside>
    </form></div>`;
  }
  function createMount(editId) {
    const form = $('#evForm'); if (!form) return;
    const d = window.__draft;
    const tierRow = (t, i) => `<div class="tier-edit" data-i="${i}">
      <div class="field" style="margin:0"><label>Ticket name</label><input class="input" data-k="name" value="${esc(t.name)}"></div>
      <div class="field" style="margin:0"><label>Price (UGX)</label><input class="input" type="number" min="0" step="500" data-k="price" value="${t.price}"></div>
      <div class="field" style="margin:0"><label>Quantity</label><input class="input" type="number" min="${t.sold || 1}" data-k="qty" value="${t.qty}"></div>
      <button type="button" class="btn btn-ghost" data-rmtier="${i}" ${d.tiers.length < 2 || t.sold ? 'disabled title="Tickets already sold"' : ''} aria-label="Remove">✕</button>
      <div class="field" style="margin:0;grid-column:1/-1"><input class="input" data-k="desc" placeholder="Short description (optional)" value="${esc(t.desc || '')}"></div>
    </div>`;
    const paintTiers = () => { $('#tierList').innerHTML = d.tiers.map(tierRow).join('<hr style="border:0;border-top:1px solid var(--line);margin:14px 0">'); };
    const readForm = () => {
      const f = Object.fromEntries(new FormData(form));
      d.title = f.title.trim(); d.summary = f.summary.trim(); d.category = f.category; d.description = f.description.trim();
      d.tags = f.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      d.start = f.start ? new Date(f.start).toISOString() : d.start; d.end = f.end ? new Date(f.end).toISOString() : d.end;
      if (!d.online) d.venue = { name: f.vname.trim(), address: f.vaddr.trim(), city: f.vcity.trim(), country: f.vcountry.trim() };
      d.ageLimit = f.ageLimit; d.refund = f.refund;
      d.promos = f.promoCode.trim() && +f.promoPct ? [{ code: f.promoCode.trim().toUpperCase(), pct: Math.min(100, Math.max(1, +f.promoPct)) }] : [];
      d.agenda = f.agenda.split('\n').map(l => l.split('|')).filter(p => p[0].trim()).map(p => ({ time: p[0].trim(), title: (p[1] || '').trim() }));
      d.faq = f.faq.split('\n').map(l => l.split('|')).filter(p => p[0].trim() && p[1]).map(p => ({ q: p[0].trim(), a: p.slice(1).join('|').trim() }));
      $$('.tier-edit').forEach(r => { const t = d.tiers[+r.dataset.i]; r.querySelectorAll('[data-k]').forEach(i => { t[i.dataset.k] = i.type === 'number' ? Math.max(0, +i.value || 0) : i.value; }); });
    };
    const preview = () => { readForm(); const pe = Object.assign({}, d, { id: d.id || 'preview', title: d.title || 'Your event title', organizerId: Store.user().id, venue: d.online ? null : d.venue }); $('#preview').innerHTML = UI.card(pe).replace(/href="#\/event\/[^"]+"/, 'href="javascript:void 0"').replace(/<button class="icon-btn like-btn[^]*?<\/button>/, ''); };
    paintTiers(); preview();
    form.addEventListener('input', preview);
    form.addEventListener('change', preview);
    $('#addTier').onclick = () => { readForm(); d.tiers.push({ id: 't' + Date.now().toString(36), name: 'New ticket', price: 0, qty: 50, sold: 0, desc: '' }); paintTiers(); preview(); };
    $('#tierList').addEventListener('click', ev => { const b = ev.target.closest('[data-rmtier]'); if (!b) return; readForm(); d.tiers.splice(+b.dataset.rmtier, 1); paintTiers(); preview(); });
    $('#coverPick').addEventListener('click', ev => { const b = ev.target.closest('[data-photo]'); if (!b) return; d.photo = b.dataset.photo; delete d.image; $$('#coverPick button').forEach(x => x.classList.toggle('active', x === b)); preview(); });
    $('#imgUp').onchange = ev => { const file = ev.target.files[0]; if (!file) return; if (file.size > 1.5 * 1024 * 1024) return toast('Image too large — max 1.5 MB'); const r = new FileReader(); r.onload = () => { d.image = r.result; $$('#coverPick button').forEach(x => x.classList.remove('active')); preview(); toast('Image added'); }; r.readAsDataURL(file); };
    const rm = $('#imgRm'); if (rm) rm.onclick = () => { delete d.image; rm.remove(); preview(); };
    $('#locSeg').addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; d.online = b.dataset.o === '1'; $$('#locSeg button').forEach(x => x.classList.toggle('active', x === b)); $('#venueFields').classList.toggle('hidden', d.online); $('#onlineNote').classList.toggle('hidden', !d.online); if (!d.online && !d.venue) d.venue = { name: '', address: '', city: 'Kampala', country: 'Uganda' }; preview(); });
    let submitter = 'live';
    $$('[type=submit]', form).forEach(b => b.addEventListener('click', () => submitter = b.dataset.status));
    form.onsubmit = ev => {
      ev.preventDefault(); readForm();
      const errs = [];
      $$('.invalid', form).forEach(i => i.classList.remove('invalid'));
      const mark = (n, msg) => { const i = form.querySelector(`[name=${n}]`); if (i) i.classList.add('invalid'); errs.push(msg); };
      if (!d.title) mark('title', 'Add a title');
      if (!d.summary) mark('summary', 'Add a summary');
      if (new Date(d.end) <= new Date(d.start)) mark('end', 'End time must be after start time');
      if (!d.online && !d.venue.name) mark('vname', 'Add a venue name');
      if (!d.online && !d.venue.city) mark('vcity', 'Add a city');
      if (d.tiers.some(t => !t.name.trim() || t.qty < 1)) errs.push('Each ticket type needs a name and quantity');
      const err = $('#evErr');
      if (errs.length) { err.textContent = errs.join(' · '); err.classList.remove('hidden'); err.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const u = Store.user();
      const out = Object.assign({}, d, { id: d.id || Store.newEventId(), organizerId: u.id, status: submitter, views: d.views || 0, createdAt: d.createdAt || new Date().toISOString() });
      if (out.online) out.venue = null;
      out.tiers = out.tiers.map(t => Object.assign({}, t, { sold: 0 }));
      if (editId) { const orig = Store.getEvent(editId); out.tiers.forEach(t => { const o = orig.tiers.find(x => x.id === t.id); t.sold = o ? o.sold - (Store.ordersForEvent(editId).filter(x => !x.cancelled).flatMap(x => x.items).filter(i => i.tierId === t.id).reduce((s, i) => s + i.qty, 0)) : 0; if (t.sold < 0) t.sold = 0; }); }
      if (!u.orgName) Store.updateUser({ orgName: u.name });
      Store.saveEvent(out);
      toast(submitter === 'draft' ? 'Draft saved' : (editId ? 'Changes saved' : 'Your event is live! 🎉'));
      location.hash = submitter === 'draft' ? '#/manage' : '#/event/' + out.id;
    };
  }

  /* ================= DASHBOARD ================= */
  function dashNav(active) {
    return `<nav class="dash-nav"><a href="#/manage" class="${active === 'home' ? 'active' : ''}">📊 Dashboard</a><a href="#/manage/events" class="${active === 'events' ? 'active' : ''}">📅 Events</a><a href="#/create">➕ Create event</a><a href="#/account" class="${active === 'account' ? 'active' : ''}">⚙️ Settings</a></nav>`;
  }
  function myEvents() { const u = Store.user(); return u ? Store.allEvents().filter(e => e.organizerId === u.id) : []; }
  function manage(sub) {
    const u = Store.user(); if (!u) return requireAuth('Organizer dashboard');
    const evs = myEvents();
    const orders = evs.flatMap(e => Store.ordersForEvent(e.id).filter(o => !o.cancelled));
    const gross = orders.reduce((s, o) => s + o.subtotal - o.discount, 0);
    const sold = orders.reduce((s, o) => s + o.tickets.length, 0);
    const live = evs.filter(e => e.status !== 'draft' && new Date(e.end) > new Date()).length;
    const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + i); return d; });
    const perDay = days.map(d => orders.filter(o => { const c = new Date(o.createdAt); return c >= d && c < new Date(d.getTime() + 86400000); }).reduce((s, o) => s + o.tickets.length, 0));
    const max = Math.max(1, ...perDay);
    const table = list => list.length ? `<div class="table-wrap"><table><thead><tr><th>Event</th><th>Status</th><th>Sold</th><th>Gross</th><th></th></tr></thead><tbody>
      ${list.map(e => { const os = Store.ordersForEvent(e.id).filter(o => !o.cancelled); const s = os.reduce((a, o) => a + o.tickets.length, 0); const cap = capacity(e); const ended = new Date(e.end) < new Date(); return `<tr>
        <td><div class="ev-cell"><div class="ev-thumb">${cover(e, { w: 160 })}</div><div><a href="#/manage/${e.id}"><b style="color:var(--ink)">${esc(e.title)}</b></a><div class="muted" style="font-size:.8rem">${cardDate(e.start)}</div></div></div></td>
        <td>${e.status === 'draft' ? '<span class="badge warn">Draft</span>' : ended ? '<span class="badge neutral">Past</span>' : '<span class="badge success">On sale</span>'}</td>
        <td><div style="display:flex;align-items:center;gap:8px">${s}/${cap}<div class="progress"><i style="width:${Math.min(100, s / cap * 100)}%"></i></div></div></td>
        <td>${moneyPlain(os.reduce((a, o) => a + o.subtotal - o.discount, 0))}</td>
        <td><a class="btn btn-outline btn-sm" href="#/manage/${e.id}">Manage</a></td></tr>`; }).join('')}
      </tbody></table></div>` : `<div class="empty"><div class="big">📅</div><h3>No events yet</h3><p>Create your first event — it only takes a few minutes.</p><a class="btn btn-primary" href="#/create">Create event</a></div>`;
    return `<div class="container"><div class="dash">${dashNav(sub === 'events' ? 'events' : 'home')}<div>
      ${sub === 'events' ? `<div class="section-head"><h2>Your events</h2><a class="btn btn-primary" href="#/create">+ Create event</a></div>${table(evs)}` : `
      <div class="section-head"><div><h2>Hi, ${esc(u.name.split(' ')[0])} 👋</h2><p class="muted" style="margin:0">Here's how your events are doing.</p></div><a class="btn btn-primary" href="#/create">+ Create event</a></div>
      <div class="kpis"><div class="kpi"><span>Net sales</span><b>${moneyPlain(gross)}</b></div><div class="kpi"><span>Tickets sold</span><b>${sold}</b></div><div class="kpi"><span>Live events</span><b>${live}</b></div><div class="kpi"><span>Orders</span><b>${orders.length}</b></div></div>
      <h3>Tickets sold — last 14 days</h3>
      <div class="bar-chart">${perDay.map((v, i) => `<div class="bar" title="${v} tickets"><i style="height:${v / max * 100}%"></i><small>${days[i].getDate()}</small></div>`).join('')}</div>
      <h3>Events</h3>${table(evs.slice(0, 5))}`}
    </div></div></div>`;
  }
  function manageEvent(id, tab) {
    const u = Store.user(); if (!u) return requireAuth('Manage event');
    const e = Store.getEvent(id); if (!e || !Store.canEdit(e)) return notFound('You can only manage events you created.');
    const os = Store.ordersForEvent(id);
    const active = os.filter(o => !o.cancelled);
    const sold = active.reduce((s, o) => s + o.tickets.length, 0);
    const checked = active.reduce((s, o) => s + o.tickets.filter(t => t.checkedIn).length, 0);
    const net = active.reduce((s, o) => s + o.subtotal - o.discount, 0);
    tab = tab || 'overview';
    const attendees = active.flatMap(o => o.tickets.map(t => ({ o, t })));
    return `<div class="container"><div class="dash">${dashNav('events')}<div>
      <a href="#/manage/events">← All events</a>
      <div class="section-head" style="margin-top:10px"><div><h2>${esc(e.title)}</h2><div class="muted">${cardDate(e.start)} · ${esc(locText(e))} ${e.status === 'draft' ? '<span class="badge warn">Draft</span>' : ''}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-outline" href="#/event/${e.id}">View page</a><a class="btn btn-primary" href="#/edit/${e.id}">Edit</a></div></div>
      <div class="tabs"><a class="tab ${tab === 'overview' ? 'active' : ''}" href="#/manage/${id}">Overview</a><a class="tab ${tab === 'orders' ? 'active' : ''}" href="#/manage/${id}/orders">Orders (${os.length})</a><a class="tab ${tab === 'checkin' ? 'active' : ''}" href="#/manage/${id}/checkin">Check-in (${checked}/${sold})</a></div>
      ${tab === 'overview' ? `
        <div class="kpis"><div class="kpi"><span>Net sales</span><b>${moneyPlain(net)}</b></div><div class="kpi"><span>Tickets sold</span><b>${sold} / ${capacity(e)}</b></div><div class="kpi"><span>Checked in</span><b>${checked}</b></div><div class="kpi"><span>Page views</span><b>${e.views || 0}</b></div></div>
        <h3>Ticket types</h3>
        <div class="table-wrap" style="margin-bottom:24px"><table><thead><tr><th>Ticket</th><th>Price</th><th>Sold</th><th>Available</th></tr></thead><tbody>${e.tiers.map(t => `<tr><td><b>${esc(t.name)}</b></td><td>${money(t.price)}</td><td>${t.sold}</td><td>${Math.max(0, t.qty - t.sold)} / ${t.qty}</td></tr>`).join('')}</tbody></table></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${e.status === 'draft' ? '<button class="btn btn-primary" id="pubBtn">Publish now</button>' : '<button class="btn btn-outline" id="unpubBtn">Unpublish (make draft)</button>'}
          <button class="btn btn-outline" id="dupBtn">Duplicate</button>
          <button class="btn btn-danger" id="delBtn">Delete event</button>
        </div>` : tab === 'orders' ? (os.length ? `
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-outline btn-sm" id="csvBtn">⬇ Export CSV</button></div>
        <div class="table-wrap"><table><thead><tr><th>Order</th><th>Buyer</th><th>Tickets</th><th>Total</th><th>Date</th><th>Status</th></tr></thead><tbody>
        ${os.slice().reverse().map(o => `<tr><td>#${o.id}</td><td>${esc(o.buyer.first + ' ' + o.buyer.last)}<div class="muted" style="font-size:.8rem">${esc(o.buyer.email)}</div></td><td>${o.items.map(i => i.qty + '× ' + esc(i.name)).join('<br>')}</td><td>${o.total ? moneyPlain(o.total) : 'Free'}</td><td>${UI.dFmt(o.createdAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td>${o.cancelled ? '<span class="badge danger">Cancelled</span>' : '<span class="badge success">Completed</span>'}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><div class="big">🧾</div><h3>No orders yet</h3><p>Share your event page to start selling.</p></div>') : `
        <div class="field"><input class="input" id="ciSearch" placeholder="Search by name, email or ticket code"></div>
        ${attendees.length ? `<div class="table-wrap"><table><thead><tr><th>Attendee</th><th>Ticket</th><th>Code</th><th>Status</th></tr></thead><tbody id="ciBody">
        ${attendees.map(({ o, t }) => `<tr data-s="${esc((o.buyer.first + ' ' + o.buyer.last + ' ' + o.buyer.email + ' ' + t.code).toLowerCase())}"><td>${esc(o.buyer.first + ' ' + o.buyer.last)}<div class="muted" style="font-size:.8rem">${esc(o.buyer.email)}</div></td><td>${esc(t.tierName)}</td><td><code>${t.code}</code></td><td><button class="btn btn-sm ${t.checkedIn ? 'btn-primary' : 'btn-outline'}" data-ci="${o.id}|${t.code}">${t.checkedIn ? '✓ Checked in' : 'Check in'}</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><div class="big">🚪</div><h3>No attendees yet</h3></div>'}`}
    </div></div></div>`;
  }
  function manageEventMount(id) {
    const e = Store.getEvent(id); if (!e || !Store.canEdit(e)) return;
    const raw = () => JSON.parse(JSON.stringify(e));
    const pub = $('#pubBtn'); if (pub) pub.onclick = () => { const x = raw(); x.status = 'live'; x.tiers.forEach(t => t.sold -= (Store.ordersForEvent(id).filter(o => !o.cancelled).flatMap(o => o.items).filter(i => i.tierId === t.id).reduce((s, i) => s + i.qty, 0))); Store.saveEvent(x); toast('Event published'); App.render(); };
    const un = $('#unpubBtn'); if (un) un.onclick = () => { const x = raw(); x.status = 'draft'; x.tiers.forEach(t => t.sold -= (Store.ordersForEvent(id).filter(o => !o.cancelled).flatMap(o => o.items).filter(i => i.tierId === t.id).reduce((s, i) => s + i.qty, 0))); Store.saveEvent(x); toast('Event unpublished'); App.render(); };
    const dup = $('#dupBtn'); if (dup) dup.onclick = () => { const x = raw(); x.id = Store.newEventId(); x.title = 'Copy of ' + x.title; x.status = 'draft'; x.tiers.forEach(t => t.sold = 0); x.createdAt = new Date().toISOString(); Store.saveEvent(x); toast('Duplicated as draft'); location.hash = '#/edit/' + x.id; };
    const del = $('#delBtn'); if (del) del.onclick = () => confirmBox('Delete this event?', 'This removes the event page. Existing orders stay in attendees\' accounts.', 'Delete', () => { Store.deleteEvent(id); toast('Event deleted'); location.hash = '#/manage/events'; });
    const csv = $('#csvBtn'); if (csv) csv.onclick = () => {
      const rows = [['Order', 'First name', 'Last name', 'Email', 'Phone', 'Tickets', 'Total (UGX)', 'Payment', 'Date', 'Status']].concat(Store.ordersForEvent(id).map(o => [o.id, o.buyer.first, o.buyer.last, o.buyer.email, o.buyer.phone, o.items.map(i => i.qty + 'x ' + i.name).join('; '), o.total, o.payment, o.createdAt, o.cancelled ? 'Cancelled' : 'Completed']));
      const body = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = 'orders-' + id + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    };
    const s = $('#ciSearch'); if (s) s.oninput = () => { const q = s.value.toLowerCase(); $$('#ciBody tr').forEach(r => r.classList.toggle('hidden', !r.dataset.s.includes(q))); };
    $$('[data-ci]').forEach(b => b.onclick = () => { const [oid, code] = b.dataset.ci.split('|'); const on = !b.classList.contains('btn-primary'); Store.checkIn(oid, code, on); b.classList.toggle('btn-primary', on); b.classList.toggle('btn-outline', !on); b.textContent = on ? '✓ Checked in' : 'Check in'; const tab = $$('.tabs .tab')[2]; const m = tab.textContent.match(/\((\d+)\/(\d+)\)/); if (m) tab.textContent = `Check-in (${+m[1] + (on ? 1 : -1)}/${m[2]})`; });
  }

  /* ================= ACCOUNT ================= */
  function account() {
    const u = Store.user(); if (!u) return requireAuth('Account settings');
    return `<div class="container"><div class="dash">${dashNav('account')}<div style="max-width:560px">
      <h2>Account settings</h2>
      <form id="accForm" class="form-card">
        <div class="field"><label>Full name</label><input class="input" name="name" value="${esc(u.name)}"></div>
        <div class="field"><label>Email</label><input class="input" value="${esc(u.email)}" disabled></div>
        <div class="field"><label>Organizer display name</label><input class="input" name="orgName" value="${esc(u.orgName || u.name)}"><div class="hint">Shown on your event pages.</div></div>
        <button class="btn btn-primary">Save</button>
      </form>
      <div class="form-card"><h3>Demo data</h3><p class="muted">Everything on this site is stored in your browser. Reset to clear accounts, orders and events you created.</p><button class="btn btn-danger" id="resetBtn">Reset demo data</button></div>
    </div></div></div>`;
  }
  function accountMount() {
    const f = $('#accForm'); if (!f) return;
    f.onsubmit = ev => { ev.preventDefault(); const d = Object.fromEntries(new FormData(f)); Store.updateUser({ name: d.name.trim() || Store.user().name, orgName: d.orgName.trim() }); toast('Saved'); App.renderHeader(); };
    $('#resetBtn').onclick = () => confirmBox('Reset all demo data?', 'This signs you out and deletes accounts, orders and events you created in this browser.', 'Reset', () => Store.resetDemo());
  }

  /* ================= STATIC ================= */
  function pricing() {
    return `<div class="page-head"><div class="container" style="text-align:center"><h1>Simple, transparent pricing</h1><p class="muted">Free events are always free. For paid events, fees can be passed on to buyers.</p></div></div>
    <div class="container"><div class="pricing-grid">
      <div class="plan"><h3>Free events</h3><div class="p-price">UGX 0</div><p class="muted">For meetups, community & free registrations</p><ul><li>Unlimited free tickets</li><li>Event page & registration</li><li>Attendee check-in</li><li>Email confirmations</li></ul><a class="btn btn-outline btn-block" href="#/create">Start free</a></div>
      <div class="plan featured"><h3>Paid events</h3><div class="p-price">3.5% <span style="font-size:1rem;font-weight:600">+ UGX 1,000</span></div><p class="muted">Per paid ticket sold</p><ul><li>Everything in Free</li><li>Mobile money, card & bank payments</li><li>Promo codes & multiple ticket types</li><li>Sales dashboard & CSV exports</li></ul><a class="btn btn-primary btn-block" href="#/create">Create a paid event</a></div>
      <div class="plan"><h3>Enterprise</h3><div class="p-price">Custom</div><p class="muted">For festivals, venues & large conferences</p><ul><li>Volume pricing</li><li>Dedicated account manager</li><li>Custom branding & domains</li><li>On-site check-in support</li></ul><a class="btn btn-outline btn-block" href="#/help">Contact sales</a></div>
    </div></div>`;
  }
  function staticPage(kind) {
    const pages = {
      about: ['About Nova', '<p>Nova helps people discover experiences worth showing up for, and gives organizers simple tools to sell tickets and run great events.</p><h2>Our mission</h2><p>Bring people together — in person and online — by making it effortless to find, host and attend events of every size.</p>'],
      help: ['Help center', '<h2>Where are my tickets?</h2><p>Log in and open <a href="#/tickets">Tickets</a>. Every order is also emailed to the address used at checkout.</p><h2>How do I get a refund?</h2><p>Refunds follow each organizer\'s policy, shown on the event page. You can cancel eligible orders from the order page.</p><h2>How do I create an event?</h2><p>Go to <a href="#/create">Create event</a>, fill in the details, add ticket types and publish.</p><h2>Contact</h2><p>Email support@novaevents.example</p>'],
      terms: ['Terms of Service', '<p>This is a demonstration site. No real payments are processed and no real tickets are issued. Replace this page with your own terms before launch.</p>'],
      privacy: ['Privacy', '<p>In this demo, all data (accounts, orders, events) is stored only in your own browser\'s local storage and is never sent to a server. Replace this page with your privacy policy before launch.</p>']
    };
    const p = pages[kind];
    return `<div class="page-head"><div class="container"><h1>${p[0]}</h1></div></div><div class="container"><div class="prose">${p[1]}</div></div>`;
  }
  function notFound(msg) {
    return `<div class="container"><div class="empty" style="padding:96px 20px"><div class="big">🧭</div><h2>Page not found</h2><p>${esc(msg || 'We couldn\'t find what you were looking for.')}</p><a class="btn btn-primary" href="#/">Go home</a></div></div>`;
  }

  window.Auth = Auth;
  window.Checkout = Checkout;
  window.Views = { home, homeMount, search, searchMount, eventPage, eventMount, checkoutPage, checkoutMount, tickets, tabsMount, orderPage, orderMount, likes, organizerPage, organizerMount, createPage, createMount, manage, manageEvent, manageEventMount, account, accountMount, pricing, staticPage, notFound };
})();
