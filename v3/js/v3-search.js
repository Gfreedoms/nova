/* v3 search — owned by the search agent.
   Board: "Nova 02 Search.dc.html" → V.search(qs) / V.searchMount(qs).
   State lives in the URL (#/search?q=&loc=&date=&day=&cat=&price=&max=&online=&sort=&friends=&view=), kept in sync with history.replaceState. */
(function () {
  const V = window.Views;
  const { esc, cat, parseQuery, buildQuery, toast, soldCount } = UI;
  const IC = N3.IC;
  const PAGE = 6;
  const KEYS = ['q', 'loc', 'date', 'day', 'cat', 'price', 'max', 'online', 'sort', 'friends', 'view'];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const isPhone = () => window.matchMedia('(max-width: 900px)').matches;

  const DATE_LABEL = Object.fromEntries(N3.DATES);
  const DATE_PHRASE = { today: 'tonight', tomorrow: 'tomorrow', weekend: 'this weekend', week: 'this week', month: 'this month' };
  const SHORT = { music: 'Music', arts: 'Arts', food: 'Food & Drink', business: 'Tech', sports: 'Outdoors', social: 'Festivals', education: 'Learning', charity: 'Causes' };
  const SORTS = [['', 'Soonest'], ['near', 'Nearest'], ['price', 'Cheapest'], ['friends', 'Most friends'], ['popular', 'Most popular']];
  const two = N3.two;
  const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dkey = d => d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
  const dayDate = k => new Date(k + 'T12:00:00');
  const dayLabel = k => { const d = dayDate(k); return isNaN(d) ? k : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const money = n => UI.moneyPlain(n);

  /* demo-only distance from the city centre (deterministic per venue) */
  const CITY_KM = { Kampala: 0, Entebbe: 38, Jinja: 81, Mbarara: 268, Nairobi: 662 };
  const km = e => {
    if (e.online || !e.venue) return null;
    let h = 0; for (const c of e.venue.name) h = (h * 33 + c.charCodeAt(0)) >>> 0;
    const base = CITY_KM[e.venue.city];
    return base == null ? 50 + (h % 200) : +(base + 0.4 + (h % 46) / 10).toFixed(1);
  };
  const kmTxt = e => { const k = km(e); return k == null ? '' : k + ' km'; };

  /* ---------------------------------------------------------------- state + results */
  function parse(qs) {
    const raw = parseQuery(qs || ''), f = {};
    KEYS.forEach(k => { if (raw[k] != null && String(raw[k]).trim() !== '') f[k] = String(raw[k]).trim(); });
    if (f.cat) f.cat = [...new Set(f.cat.split(',').map(c => Store.catId(c.trim())).filter(c => Store.categories.some(x => x.id === c)))].join(',');
    if (!f.cat) delete f.cat;
    if (f.date && !DATE_LABEL[f.date]) delete f.date;
    if (f.day && !/^\d{4}-\d{2}-\d{2}$/.test(f.day)) delete f.day;
    if (f.day) delete f.date;
    if (f.price && !/^(free|paid)$/.test(f.price)) delete f.price;
    if (f.online && !/^[01]$/.test(f.online)) delete f.online;
    if (f.max && !(+f.max > 0)) delete f.max;
    if (f.sort && !SORTS.some(s => s[0] === f.sort)) delete f.sort;
    if (f.view && !/^(grid|map)$/.test(f.view)) delete f.view;
    if (f.friends !== '1') delete f.friends;
    return f;
  }
  const catsOf = f => (f.cat || '').split(',').filter(Boolean);
  const qsOf = f => buildQuery(Object.fromEntries(KEYS.filter(k => f[k]).map(k => [k, f[k]])));

  function results(f) {
    let list = N3.filter({ q: f.q, loc: f.loc, date: f.day ? '' : f.date, cat: f.cat, price: f.price, online: f.online });
    if (f.day) list = list.filter(e => dkey(new Date(e.start)) === f.day);
    if (f.max && f.price !== 'free') list = list.filter(e => N3.minPrice(e) <= +f.max);
    const s = f.sort;
    if (s === 'popular') list.sort((a, b) => soldCount(b) - soldCount(a));
    else if (s === 'price') list.sort((a, b) => N3.minPrice(a) - N3.minPrice(b));
    else if (s === 'near') list.sort((a, b) => (km(a) == null ? 1e6 : km(a)) - (km(b) == null ? 1e6 : km(b)));
    else if (s === 'friends') list.sort((a, b) => N3.friends(b) - N3.friends(a));
    if (f.friends === '1') list = list.map((e, i) => [e, i]).sort((a, b) => ((N3.friends(a[0]) ? 0 : 1) - (N3.friends(b[0]) ? 0 : 1)) || a[1] - b[1]).map(x => x[0]);
    return list;
  }
  const maxPrice = () => { const ps = N3.upcoming().map(N3.minPrice); const m = Math.max(0, ...ps); return Math.max(10000, Math.ceil(m / 10000) * 10000); };

  function rangeText(f) {
    const lbl = d => DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
    if (f.day) return lbl(dayDate(f.day));
    if (!f.date) return 'ALL UPCOMING DATES';
    const t0 = new Date(); t0.setHours(12, 0, 0, 0); const days = [];
    for (let i = 0; i <= 31; i++) { const d = new Date(t0.getTime() + i * 864e5); if (N3.dateMatch({ start: d.toISOString() }, f.date)) days.push(d); }
    if (!days.length) return DATE_LABEL[f.date].toUpperCase();
    const a = days[0], b = days[days.length - 1];
    if (a === b) return (f.date === 'today' ? 'TONIGHT · ' : '') + lbl(a);
    return DOW[a.getDay()] + ' ' + a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + MON[a.getMonth()] : '') + ' – ' + lbl(b);
  }
  const whereText = f => f.online === '1' ? 'ONLINE' : (f.loc ? f.loc.toUpperCase() : 'EVERYWHERE');
  function headline(f, n) {
    const cs = catsOf(f), T = n === 1 ? 'THING' : 'THINGS';
    if (f.q) return `${n} ${T} FOR "${esc(f.q.toUpperCase())}"`;
    if (cs.length === 1) return `${n} ${T} IN ${esc(cat(cs[0]).name.toUpperCase())}`;
    if (f.date) return `${n} ${T} ${DATE_PHRASE[f.date].toUpperCase()}`;
    if (f.day) return `${n} ${T} ON ${esc(dayLabel(f.day).toUpperCase())}`;
    if (f.online === '1') return `${n} ${T} ONLINE`;
    if (f.loc) return `${n} ${T} IN ${esc(f.loc.toUpperCase())}`;
    return `${n} ${T} TO DO`;
  }
  function activeChips(f) {
    const c = [];
    catsOf(f).forEach(id => c.push(['cat:' + id, cat(id).name]));
    if (f.date) c.push(['date', DATE_LABEL[f.date]]);
    if (f.day) c.push(['day', dayLabel(f.day)]);
    if (f.price) c.push(['price', f.price === 'free' ? 'Free' : 'Paid']);
    if (f.max && f.price !== 'free') c.push(['max', 'Up to ' + money(+f.max)]);
    if (f.online) c.push(['online', f.online === '1' ? 'Online' : 'In person']);
    if (f.loc) c.push(['loc', f.loc]);
    if (f.q) c.push(['q', '"' + f.q + '"']);
    if (f.friends) c.push(['friends', 'Friends going first']);
    return c;
  }
  const nFilters = f => activeChips(f).filter(([k]) => k !== 'q').length;
  const sumLine = f => (f.online === '1' ? 'Online' : (f.loc || N3.city())) + ' · ' + (f.day ? dayLabel(f.day) : f.date ? DATE_LABEL[f.date] : 'Any date');

  /* ---------------------------------------------------------------- markup pieces */
  // list row = N3.cardRow, augmented with the board's "DOW · time" date line, distance/friends line and a share button
  function row(e) {
    const p = N3.dateParts(e.start), fr = N3.friends(e), k = kmTxt(e);
    const extra = [e.online ? 'Streams online' : esc(e.venue.name) + (k ? ' · ' + k : ''), fr ? `<b>${fr} friends going</b>` : ''].filter(Boolean).join(' · ');
    return N3.cardRow(e)
      .replace(/(<div class="n3-cr-date"><b>\d+<\/b><span>)[^<]*(<\/span>)/, `$1${p.dow}<i class="s-t"> · ${p.time}</i>$2`)
      .replace(/(<\/span>)(<\/div>\s*<div class="n3-cr-end">)/, `$1<span class="s-x">${extra}</span>$2`)
      .replace(/(<\/button>)(\s*<\/div>\s*<\/a>\s*)$/, `$1<button type="button" class="s-share" data-act="share" data-id="${e.id}" aria-label="Share ${esc(e.title)} on WhatsApp">${IC.share}</button>$2`);
  }
  const skelRows = n => Array.from({ length: n }, () => `<div class="s-skrow" aria-hidden="true"><i></i><i></i><span><i></i><i></i><i></i></span><i></i></div>`).join('');

  function aside(st, f, counts) {
    const cs = catsOf(f);
    const cats = Store.categories.slice().sort((a, b) => (cs.includes(b.id) - cs.includes(a.id)) || ((counts[b.id] || 0) - (counts[a.id] || 0)));
    const vis = st.allCats ? cats : cats.slice(0, 5);
    const mp = maxPrice(), mx = Math.min(+f.max || mp, mp);
    return `
      <div class="s-aside-h"><h2>Filters</h2>${nFilters(f) || f.q ? `<button type="button" class="n3-link" data-act="clear" data-k="clear">Clear all</button>` : ''}</div>
      <fieldset class="s-fs s-cats"><legend class="s-leg">Category</legend>
        ${vis.map(c => `<label class="n3-check ${cs.includes(c.id) ? 'on' : ''}"><input type="checkbox" data-act="cat" data-k="cat-${c.id}" value="${c.id}" ${cs.includes(c.id) ? 'checked' : ''}><span>${esc(c.name)}</span><em>${counts[c.id] || 0}</em></label>`).join('')}
        ${cats.length > 5 ? `<button type="button" class="n3-link s-catmore" data-act="catsmore" data-k="catsmore" aria-expanded="${!!st.allCats}">${st.allCats ? 'Show fewer' : '+ ' + (cats.length - 5) + ' more'}</button>` : ''}
      </fieldset>
      <fieldset class="s-fs"><legend class="s-leg">When</legend>
        <div class="s-when">${N3.DATES.map(([v, l]) => `<button type="button" class="n3-chip sm ${f.date === v ? 'on' : ''}" aria-pressed="${f.date === v}" data-act="date" data-v="${v}" data-k="date-${v}">${l}</button>`).join('')}
          <button type="button" class="n3-chip sm ${f.day ? 'on' : ''}" aria-pressed="${!!f.day}" aria-expanded="${!!(st.pick || f.day)}" data-act="pick" data-k="pick">${f.day ? esc(dayLabel(f.day)) : 'Pick dates'}</button></div>
        ${st.pick || f.day ? `<label class="s-day"><span class="n3-sr">Pick a date</span><input class="n3-input" type="date" data-act="day" data-k="day" min="${dkey(new Date())}" value="${esc(f.day || '')}"></label>` : ''}
      </fieldset>
      <fieldset class="s-fs"><legend class="s-leg">Price</legend>
        <div class="n3-seg block s-jac" role="group" aria-label="Price">${[['', 'Any'], ['free', 'Free'], ['paid', 'Paid']].map(([v, l]) => `<button type="button" class="${(f.price || '') === v ? 'on' : ''}" aria-pressed="${(f.price || '') === v}" data-act="price" data-v="${v}" data-k="price-${v}">${l}</button>`).join('')}</div>
        ${f.price === 'free' ? '' : `<label class="s-range"><span class="s-range-t">Up to <b data-maxout>${mx >= mp ? 'any price' : money(mx)}</b></span>
          <input type="range" min="0" max="${mp}" step="5000" value="${mx}" data-act="max" data-k="max" aria-label="Maximum ticket price" style="--p:${Math.round(mx / mp * 100)}%"></label>`}
      </fieldset>
      <fieldset class="s-fs"><legend class="s-leg">Format</legend>
        ${[['0', 'In person'], ['1', 'Online'], ['', 'Both']].map(([v, l]) => `<label class="n3-check s-radio"><input type="radio" name="sFormat" data-act="online" data-k="online-${v}" value="${v}" ${(f.online || '') === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </fieldset>
      <label class="s-switch"><input type="checkbox" role="switch" data-act="friends" data-k="friends" ${f.friends ? 'checked' : ''}><i aria-hidden="true"></i><span>Friends going first</span></label>`;
  }

  function mapCard(e, on, kind) {
    const p = N3.dateParts(e.start);
    if (kind === 'm') return `<a class="s-mcard ${on ? 'on' : ''}" href="#/event/${e.id}" data-act="sel" data-id="${e.id}" aria-current="${on}">${N3.img(e, 200, { duo: '' })}<span><b class="s-mcard-t">${esc(e.title)}</b><small>${p.dow.charAt(0) + p.dow.slice(1).toLowerCase()} ${p.time}${kmTxt(e) ? ' · ' + kmTxt(e) : ''}</small><b>${esc(N3.priceFrom(e))}</b></span></a>`;
    return `<a class="s-mrow ${on ? 'on' : ''}" href="#/event/${e.id}" data-act="sel" data-id="${e.id}" aria-current="${on}"><span class="s-mrow-d">${p.dd}<small>${p.dow}</small></span><span class="s-mrow-b"><b>${esc(e.title)}</b><small>${esc(e.venue.name)} · ${p.time}</small><em>${esc(N3.priceFrom(e))}</em></span>${N3.img(e, 200, { duo: '' })}</a>`;
  }
  const mapSrc = (e, z, f) => 'https://maps.google.com/maps?q=' + encodeURIComponent(e ? e.venue.name + ', ' + e.venue.city : (f.loc || N3.city())) + '&z=' + z + '&output=embed';
  const pinLabel = e => { if (!e) return ''; const p = N3.dateParts(e.start); return `<span class="s-pin" aria-hidden="true"><b>${N3.isToday(e.start) ? 'TONIGHT' : p.dd + ' ' + p.dow}</b><i></i></span>`; };

  function mapView(st, f, list) {
    const inPerson = list.filter(e => !e.online), online = list.length - inPerson.length;
    const sel = inPerson.find(e => e.id === st.sel) || inPerson[0];
    if (!inPerson.length) return `<div class="s-maponly"><p><b>No in-person events to map.</b> ${online ? plural(online, 'online event') + ' match your filters.' : ''}</p><button type="button" class="n3-btn sec" data-act="view" data-v="" data-k="view-list2">Back to the list</button></div>`;
    const p = N3.dateParts(sel.start);
    return `<div class="s-map">
      <div class="s-map-list" role="list" aria-label="Events on the map">${inPerson.map(e => mapCard(e, e === sel)).join('')}
        ${online ? `<p class="s-map-note">+ ${plural(online, 'online event')} not on the map.</p>` : ''}</div>
      <div class="s-map-canvas">
        <iframe class="s-iframe" title="Map centred on ${esc(sel.venue.name)}" src="${mapSrc(sel, st.z, f)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        ${pinLabel(sel)}
        <a class="s-float" href="#/event/${sel.id}">${N3.img(sel, 240, { duo: '' })}<span><b class="s-float-t">${esc(sel.title)}</b><small>${esc(N3.area(sel))} · ${p.time}${kmTxt(sel) ? ' · ' + kmTxt(sel) : ''}</small><b>${esc(N3.priceFrom(sel))}</b></span></a>
        <div class="s-zoom"><button type="button" data-act="zoom" data-d="1" aria-label="Zoom in">${IC.plus}</button><button type="button" data-act="zoom" data-d="-1" aria-label="Zoom out">${IC.minus}</button></div>
        <button type="button" class="s-area" data-act="area" data-id="${sel.id}">Search this area</button>
      </div></div>`;
  }

  function mobileMap(st, f, list) {
    const inPerson = list.filter(e => !e.online);
    const sel = inPerson.find(e => e.id === st.sel) || inPerson[0];
    return `<div class="s-mmap" role="dialog" aria-modal="true" aria-label="Map of events">
      ${sel ? `<iframe class="s-iframe" title="Map centred on ${esc(sel.venue.name)}" src="${mapSrc(sel, st.z, f)}" loading="lazy"></iframe>${pinLabel(sel)}` : `<div class="s-mmap-none"><b>No in-person events to map.</b></div>`}
      <div class="s-mmap-top"><button type="button" class="s-mmap-q" data-act="mmap-close" data-k="mmq">${esc(f.q || 'All events')} · ${esc(f.day ? dayLabel(f.day) : f.date ? DATE_LABEL[f.date].toLowerCase() : 'any date')}</button>
        <button type="button" class="s-mmap-f" data-act="sheet-open" data-k="mmf">Filters${nFilters(f) ? ' · ' + nFilters(f) : ''}</button></div>
      <button type="button" class="s-fab list" data-act="mmap-close" data-k="mmclose">${IC.list}List</button>
      <div class="s-mcards">${inPerson.map(e => mapCard(e, e === sel, 'm')).join('')}</div>
    </div>`;
  }

  function suggestions(f) {
    const out = [], seen = new Set();
    const add = (label, patch) => { const g = Object.assign({}, f, patch); Object.keys(g).forEach(k => { if (!g[k]) delete g[k]; }); const q = qsOf(g); if (seen.has(q)) return; const n = results(g).length; if (n) { seen.add(q); out.push({ label, n, q }); } };
    if (f.day || (f.date && f.date !== 'week' && f.date !== 'month')) add('Any day this week', { date: 'week', day: '' });
    if (f.day || f.date) add('Any date', { date: '', day: '' });
    if (f.loc) { const best = N3.CITIES.filter(c => c.toLowerCase() !== f.loc.toLowerCase()).map(c => [c, results(Object.assign({}, f, { loc: c })).length]).sort((a, b) => b[1] - a[1])[0]; if (best && best[1]) add(best[0] + ' instead', { loc: best[0] }); }
    if (f.price === 'free') add('Paid events too', { price: '' });
    if (f.max) add('Any price', { max: '' });
    if (catsOf(f).length) add('All categories', { cat: '' });
    if (f.online) add(f.online === '1' ? 'In person too' : 'Online too', { online: '' });
    if (f.q) add('Everything' + (f.date ? ' ' + DATE_PHRASE[f.date] : ''), { q: '' });
    if (out.length < 2) { // nothing one step away: relax progressively
      const steps = [[f.day || f.date, 'any date', { date: '', day: '' }], [f.price || f.max, 'any price', { price: '', max: '' }], [catsOf(f).length, 'all categories', { cat: '' }], [f.online, 'any format', { online: '' }], [f.q, 'without "' + (f.q || '') + '"', { q: '' }], [f.loc, 'everywhere', { loc: '' }]];
      const acc = {}, lbl = [];
      for (const [on, l, patch] of steps) { if (!on) continue; Object.assign(acc, patch); lbl.push(l); add(lbl.join(', ').replace(/^./, c => c.toUpperCase()), Object.assign({}, acc)); if (out.length >= 2) break; }
    }
    return out.slice(0, 3);
  }

  function empty(f) {
    const cs = catsOf(f), sug = suggestions(f);
    const what = f.q ? ` for "${esc(f.q)}"` : cs.length ? ` in ${esc(cs.map(c => cat(c).name).join(' or '))}` : '';
    const when = f.day ? ' on ' + esc(dayDate(f.day).toLocaleDateString('en-GB', { weekday: 'long' })) : f.date ? ' ' + DATE_PHRASE[f.date] : '';
    const where = f.online === '1' ? ' online' : f.loc ? ' in ' + esc(f.loc) : '';
    const near = (sug.length ? results(parse(sug[0].q)) : N3.upcoming()).slice(0, 3);
    return `<div class="s-empty">
      <div class="s-empty-l">
        <span class="s-zero" aria-hidden="true">0</span>
        <h2>Nothing${what}${when}${where}${f.price === 'free' ? ' for free' : ''}. Yet.</h2>
        <p><span class="s-dt">It's a quiet one on the listings. Try widening one thing — or we'll WhatsApp you the moment something's listed.</span><span class="s-mb">Try one of these instead:</span></p>
        <div class="s-sugg">${sug.map((s, i) => `<button type="button" class="n3-btn ${i ? 'sec' : ''}" data-act="sugg" data-q="${esc(s.q)}">${esc(s.label)} · ${s.n}${i ? '' : ' result' + (s.n === 1 ? '' : 's')}</button>`).join('')}
          <button type="button" class="s-clear" data-act="clear" data-k="clear2">Clear filters</button></div>
        <button type="button" class="s-wa" data-act="alert">${IC.wa}Alert me on WhatsApp</button>
      </div>
      ${near.length ? `<div class="s-near"><span class="s-leg">Meanwhile, nearby</span>
        ${near.map(e => { const p = N3.dateParts(e.start); return `<a class="s-near-row" href="#/event/${e.id}"><span class="s-near-d">${p.dd}</span><span><b>${esc(e.title)}</b><small>${p.dow.charAt(0) + p.dow.slice(1).toLowerCase()} · ${esc(e.online ? 'Online' : e.venue.name + ', ' + e.venue.city)} · ${esc(N3.priceFrom(e))}</small></span>${N3.img(e, 200, { duo: '' })}</a>`; }).join('')}</div>` : ''}
    </div>`;
  }

  function body(st, f, list) {
    const view = f.view || 'list';
    if (st.loading) return `<div class="s-loading" aria-busy="true" aria-label="Loading events">
        ${view === 'grid' ? `<div class="s-grid">${N3.skeleton(isPhone() ? 4 : 6, isPhone() ? 'cc' : 'cf')}</div>` : skelRows(4)}
        <p class="s-loadtxt">Finding your ${f.date === 'weekend' ? 'weekend' : f.date === 'today' ? 'night' : 'next night out'}… on a slow connection we load text first, photos after.</p></div>`;
    if (!list.length) return empty(f);
    if (view === 'map' && !isPhone()) return mapView(st, f, list);
    const shown = list.slice(0, st.shown);
    const more = list.length - shown.length;
    const items = view === 'grid'
      ? `<div class="s-grid">${shown.map(e => isPhone() ? N3.cardCompact(e) : N3.cardFeature(e, { w: 520, sizes: '(max-width: 1200px) 45vw, 360px' })).join('')}</div>`
      : `<div class="s-list">${shown.map(row).join('')}</div>`;
    return items + (more > 0 ? `<div class="s-more"><span>Showing ${shown.length} of ${list.length}</span><button type="button" class="s-more-btn" data-act="more" data-k="more">Show ${Math.min(PAGE, more)} more</button></div>` : '');
  }

  function sheet(st, f, list, counts) {
    const cs = catsOf(f);
    const segBtn = (act, v, l, on) => `<button type="button" class="${on ? 'on' : ''}" aria-pressed="${on}" data-act="${act}" data-v="${v}" data-k="sh-${act}-${v}">${l}</button>`;
    return `<div class="n3-sheet s-sheet ${st.sheet ? 'open' : ''}" id="sSheet" ${st.sheet ? '' : 'aria-hidden="true"'}>
      <div class="n3-sheet-bg" data-act="sheet-close"></div>
      <div class="n3-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sShTitle">
        <div class="s-sh-head"><h2 id="sShTitle">Filters</h2><button type="button" class="n3-iconbtn" data-act="sheet-close" data-k="sh-close" aria-label="Close filters">${IC.x}</button></div>
        <div class="s-sh-body">
          <div><span class="s-leg">Category · pick any</span><div class="s-chips">${Store.categories.map(c => `<button type="button" class="n3-chip ${cs.includes(c.id) ? 'on' : ''}" aria-pressed="${cs.includes(c.id)}" data-act="catt" data-v="${c.id}" data-k="sh-cat-${c.id}">${esc(SHORT[c.id] || c.name)}<small>${counts[c.id] || 0}</small></button>`).join('')}</div></div>
          <div><span class="s-leg">When</span><div class="n3-seg block s-jac s-seg5" role="group" aria-label="When">${[['today', 'Tonight'], ['tomorrow', 'Tmrw'], ['weekend', 'Weekend'], ['week', 'Week']].map(([v, l]) => segBtn('date', v, l, f.date === v)).join('')}${`<button type="button" class="${f.day ? 'on' : ''}" aria-pressed="${!!f.day}" data-act="pick" data-k="sh-pick">Dates</button>`}</div>
            ${st.pick || f.day ? `<label class="s-day"><span class="n3-sr">Pick a date</span><input class="n3-input" type="date" data-act="day" data-k="sh-day" min="${dkey(new Date())}" value="${esc(f.day || '')}"></label>` : ''}</div>
          <div><span class="s-leg">Where</span><div class="s-chips">${[['', 'Anywhere'], ...N3.CITIES.map(c => [c, c])].map(([v, l]) => `<button type="button" class="n3-chip sm s-nock ${(f.loc || '').toLowerCase() === v.toLowerCase() ? 'on' : ''}" aria-pressed="${(f.loc || '').toLowerCase() === v.toLowerCase()}" data-act="loc" data-v="${esc(v)}" data-k="sh-loc-${esc(v)}">${esc(l)}</button>`).join('')}</div></div>
          <div><span class="s-leg">Price</span><div class="n3-seg block s-jac" role="group" aria-label="Price">${[['', 'Any'], ['free', 'Free'], ['paid', 'Paid']].map(([v, l]) => segBtn('price', v, l, (f.price || '') === v)).join('')}</div></div>
          <div><span class="s-leg">Format</span><div class="n3-seg block s-jac" role="group" aria-label="Format">${[['0', 'In person'], ['1', 'Online'], ['', 'Both']].map(([v, l]) => segBtn('online', v, l, (f.online || '') === v)).join('')}</div></div>
          <div><span class="s-leg">Sort by</span><div class="s-chips">${SORTS.map(([v, l]) => `<button type="button" class="n3-chip s-nock ${(f.sort || '') === v ? 'on' : ''}" aria-pressed="${(f.sort || '') === v}" data-act="sort" data-v="${v}" data-k="sh-sort-${v}">${l.replace('Most ', '').replace(/^./, c => c.toUpperCase())}</button>`).join('')}</div></div>
          <label class="s-switch"><input type="checkbox" role="switch" data-act="friends" data-k="sh-friends" ${f.friends ? 'checked' : ''}><i aria-hidden="true"></i><span>Friends going first</span></label>
        </div>
        <div class="s-sh-foot"><button type="button" class="s-clear" data-act="clear" data-k="sh-clear">Clear all</button><button type="button" class="n3-btn" data-act="sheet-close" data-k="sh-show">${list.length ? 'Show ' + plural(list.length, 'event') : 'No events — widen filters'}</button></div>
      </div></div>`;
  }

  function inner(st) {
    const f = st.f, list = results(f), view = f.view || 'list';
    const counts = {}; results(Object.assign({}, f, { cat: '' })).forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    const chips = activeChips(f), nf = nFilters(f), hasMap = list.some(e => !e.online);
    st.list = list;
    return `
      <div class="s-mbar">
        <form class="s-mq" role="search" data-k="mform"><span aria-hidden="true">${IC.search}</span>
          <label><span class="n3-sr">Search events</span><input name="q" type="search" value="${esc(f.q || '')}" placeholder="Search events, artists, venues" autocomplete="off" data-k="mq" enterkeyhint="search"><small>${esc(sumLine(f))}</small></label>
          ${f.q ? `<button type="button" class="s-mq-x" data-act="rm" data-v="q" data-k="mqx" aria-label="Clear search">${IC.x}</button>` : ''}</form>
        <div class="s-mchips">
          <button type="button" class="n3-chip sm s-nock s-ink" data-act="sheet-open" data-k="mfilters" aria-haspopup="dialog">${IC.filter}Filters${nf ? ' · ' + nf : ''}</button>
          <button type="button" class="n3-chip sm s-nock ${f.date === 'today' ? 'on' : ''}" aria-pressed="${f.date === 'today'}" data-act="date" data-v="today" data-k="m-today">Tonight</button>
          <button type="button" class="n3-chip sm s-nock ${f.date === 'weekend' ? 'on' : ''}" aria-pressed="${f.date === 'weekend'}" data-act="date" data-v="weekend" data-k="m-weekend">Weekend</button>
          <button type="button" class="n3-chip sm s-nock ${f.price === 'free' ? 'on' : ''}" aria-pressed="${f.price === 'free'}" data-act="price" data-v="${f.price === 'free' ? '' : 'free'}" data-k="m-free">Free</button>
          <label class="n3-chip sm s-nock s-sortchip"><span class="n3-sr">Sort</span><select data-act="sort" data-k="m-sort">${SORTS.map(([v, l]) => `<option value="${v}" ${(f.sort || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>${IC.chev}</label>
          <button type="button" class="n3-chip sm s-nock ${view === 'grid' ? 'on' : ''}" aria-pressed="${view === 'grid'}" data-act="view" data-v="${view === 'grid' ? '' : 'grid'}" data-k="m-grid">${IC.grid}<span class="n3-sr">Grid view</span></button>
        </div>
      </div>
      <div class="s-layout">
        <aside class="s-aside" aria-label="Filters">${aside(st, f, counts)}</aside>
        <main class="s-main" id="sMain" aria-live="polite" aria-busy="${!!st.loading}">
          <div class="s-head">
            <div class="s-head-t"><span class="s-kick">${esc(whereText(f))} · ${esc(rangeText(f))}</span>
              <h1>${st.loading ? 'SEARCHING…' : list.length ? headline(f, list.length) : '0 RESULTS'}</h1></div>
            <div class="s-tools">
              <label class="s-sort">Sort<select class="n3-select" data-act="sort" data-k="sort">${SORTS.map(([v, l]) => `<option value="${v}" ${(f.sort || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
              <div class="n3-seg s-view" role="group" aria-label="View">${[['', 'List', IC.list], ['grid', 'Grid', IC.grid], ['map', 'Map', IC.map]].map(([v, l]) => `<button type="button" class="${(f.view || '') === v ? 'on' : ''}" aria-pressed="${(f.view || '') === v}" data-act="view" data-v="${v}" data-k="view-${v}">${l}</button>`).join('')}</div>
            </div>
          </div>
          ${chips.length ? `<div class="s-active"><span>Active:</span>${chips.map(([k, l]) => `<button type="button" class="s-pill" data-act="rm" data-v="${esc(k)}" data-k="rm-${esc(k)}" aria-label="Remove filter ${esc(l)}">${esc(l)} ${IC.x}</button>`).join('')}<button type="button" class="n3-link s-clearall" data-act="clear" data-k="clear3">Clear all</button></div>` : ''}
          <div class="s-mhead"><h1>${st.loading ? 'SEARCHING…' : plural(list.length, 'RESULT').replace('RESULTs', 'RESULTS')}</h1><span>${f.q ? 'for "' + esc(f.q) + '"' : esc(sumLine(f))}</span></div>
          <div class="s-body">${body(st, f, list)}</div>
        </main>
      </div>
      ${hasMap && !st.loading && view !== 'map' ? `<button type="button" class="s-fab" data-act="mmap-open" data-k="fab">${IC.pin}Map</button>` : ''}
      ${view === 'map' && isPhone() ? mobileMap(st, f, list) : ''}
      ${sheet(st, f, list, counts)}`;
  }

  /* ---------------------------------------------------------------- page + behaviour */
  const newState = qs => ({ f: parse(qs), shown: PAGE, allCats: false, pick: false, sheet: false, loading: false, sel: '', z: 14 });
  let CUR = null;

  V.search = qs => `<div class="n3-page n3-p-search" id="n3s">${inner(newState(qs))}</div>`;

  V.searchMount = qs => {
    const root = $('#n3s'); if (!root) return;
    const st = newState(qs); CUR = st;
    let loadT = 0, lastFocus = null;
    const hq = $('#hdQ'); if (hq) hq.value = st.f.q || '';
    if (catsOf(st.f).length > 0 && Store.categories.slice(5).some(c => catsOf(st.f).includes(c.id))) st.allCats = true;

    const sync = () => { const q = qsOf(st.f); history.replaceState(null, '', '#/search' + (q ? '?' + q : '')); };
    const lock = on => { document.body.style.overflow = on ? 'hidden' : ''; };
    const paint = () => {
      if (!root.isConnected) return;
      const a = document.activeElement, k = a && root.contains(a) && a.dataset ? a.dataset.k : null;
      const mcScroll = $('.s-mcards', root) ? $('.s-mcards', root).scrollLeft : 0;
      const shScroll = $('.s-sheet .n3-sheet-panel', root) ? $('.s-sheet .n3-sheet-panel', root).scrollTop : 0;
      root.innerHTML = inner(st);
      if (k) { const el = root.querySelector(`[data-k="${CSS.escape(k)}"]`); if (el) el.focus({ preventScroll: true }); }
      const mc = $('.s-mcards', root); if (mc) mc.scrollLeft = mcScroll;
      const sp = $('.s-sheet .n3-sheet-panel', root); if (sp) sp.scrollTop = shScroll;
      lock(st.sheet || ((st.f.view === 'map') && isPhone()));
    };
    // any filter change → URL sync, reset paging, brief skeleton
    const change = (mut, opts) => {
      mut(st.f); Object.keys(st.f).forEach(k => { if (!st.f[k]) delete st.f[k]; });
      if (st.f.day) delete st.f.date;
      st.shown = PAGE; st.sel = '';
      sync();
      if (opts && opts.quiet) return paint();
      st.loading = true; paint();
      clearTimeout(loadT); loadT = setTimeout(() => { st.loading = false; paint(); }, 320);
    };
    const toggleCat = id => change(f => { const s = new Set(catsOf(f)); s.has(id) ? s.delete(id) : s.add(id); f.cat = [...s].join(','); });
    const clearAll = () => change(f => { ['q', 'loc', 'date', 'day', 'cat', 'price', 'max', 'online', 'friends'].forEach(k => delete f[k]); if (hq) hq.value = ''; });
    const openSheet = () => { lastFocus = document.activeElement; st.sheet = true; paint(); const c = $('.s-sheet [data-k="sh-close"]', root); if (c) c.focus(); };
    const closeSheet = () => { st.sheet = false; paint(); if (lastFocus && lastFocus.isConnected) lastFocus.focus(); else { const b = $('[data-k="mfilters"]', root); if (b) b.focus(); } };
    const setView = v => { st.f.view = v; if (!v) delete st.f.view; st.shown = PAGE; sync(); paint(); };
    const select = id => {
      st.sel = id; const e = Store.getEvent(id); if (!e) return;
      $$('[data-act="sel"]', root).forEach(x => { const on = x.dataset.id === id; x.classList.toggle('on', on); x.setAttribute('aria-current', on); });
      $$('.s-iframe', root).forEach(fr => { fr.src = mapSrc(e, st.z, st.f); fr.title = 'Map centred on ' + e.venue.name; });
      $$('.s-pin', root).forEach(p => { p.outerHTML = pinLabel(e); });
      const fl = $('.s-float', root);
      if (fl) { const p = N3.dateParts(e.start); fl.href = '#/event/' + e.id; fl.innerHTML = `${N3.img(e, 240, { duo: '' })}<span><b class="s-float-t">${esc(e.title)}</b><small>${esc(N3.area(e))} · ${p.time}${kmTxt(e) ? ' · ' + kmTxt(e) : ''}</small><b>${esc(N3.priceFrom(e))}</b></span>`; }
      const ar = $('.s-area', root); if (ar) ar.dataset.id = id;
      const card = $(`.s-mcards [data-id="${id}"]`, root); if (card && card.scrollIntoView) card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    };

    root.addEventListener('click', ev => {
      if (ev.target.closest('[data-like]')) return; // app.js handles save
      const t = ev.target.closest('[data-act]'); if (!t || !root.contains(t)) return;
      const act = t.dataset.act, v = t.dataset.v != null ? t.dataset.v : '';
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT') return; // handled on change
      switch (act) {
        case 'date': return change(f => { f.date = f.date === v ? '' : v; f.day = ''; });
        case 'pick': st.pick = !(st.pick || st.f.day); if (!st.pick && st.f.day) return change(f => { f.day = ''; }); paint(); { const d = $(`[data-k="${t.dataset.k === 'pick' ? 'day' : 'sh-day'}"]`, root); if (d) { d.focus(); try { d.showPicker && d.showPicker(); } catch (x) { /* not allowed without gesture in some browsers */ } } } return;
        case 'price': return change(f => { f.price = v; if (v === 'free') f.max = ''; });
        case 'online': return change(f => { f.online = v; });
        case 'loc': return change(f => { f.loc = v; });
        case 'sort': return change(f => { f.sort = v; });
        case 'catt': return toggleCat(v);
        case 'view': return setView(v);
        case 'rm': return change(f => { if (v.startsWith('cat:')) f.cat = catsOf(f).filter(c => c !== v.slice(4)).join(','); else { f[v] = ''; if (v === 'q' && hq) hq.value = ''; } });
        case 'clear': return clearAll();
        case 'catsmore': st.allCats = !st.allCats; return paint();
        case 'more': { const from = st.shown; st.shown += PAGE; paint(); const items = $$('.s-list > *, .s-grid > *', root); if (items[from]) { const a = items[from].matches('a') ? items[from] : items[from].querySelector('a'); if (a) a.focus({ preventScroll: true }); } return; }
        case 'sheet-open': return openSheet();
        case 'sheet-close': return closeSheet();
        case 'mmap-open': st.f.view = 'map'; sync(); lastFocus = t; if (isPhone()) { paint(); const c = $('.s-mmap [data-k="mmclose"]', root); if (c) c.focus(); } else { paint(); window.scrollTo({ top: 0 }); } return;
        case 'mmap-close': return setView('');
        case 'sel': if (t.classList.contains('on')) return; ev.preventDefault(); return select(t.dataset.id);
        case 'zoom': st.z = Math.max(10, Math.min(18, st.z + (+t.dataset.d))); { const e = Store.getEvent(st.sel) || (st.list || []).find(x => !x.online); $$('.s-iframe', root).forEach(fr => { fr.src = mapSrc(e, st.z, st.f); }); } return;
        case 'area': { const e = Store.getEvent(t.dataset.id); if (!e) return; const city = e.venue.city; toast('Showing events around ' + city); return change(f => { f.loc = city; f.online = ''; }); }
        case 'share': {
          ev.preventDefault(); ev.stopPropagation();
          const e = Store.getEvent(t.dataset.id); if (!e) return;
          const url = location.href.split('#')[0] + '#/event/' + e.id;
          window.open('https://wa.me/?text=' + encodeURIComponent(e.title + ' — ' + url), '_blank', 'noopener');
          return;
        }
        case 'sugg': { const g = parse(t.dataset.q); g.view = st.f.view; g.sort = st.f.sort; return change(f => { KEYS.forEach(k => delete f[k]); Object.assign(f, g); }); }
        case 'alert': {
          const done = () => { const u = Store.user(); toast('Alert set — we\'ll WhatsApp ' + (u && u.phone ? u.phone : 'you') + ' when something matching is listed.'); };
          return Store.user() ? done() : Auth.open('login', done);
        }
      }
    });
    root.addEventListener('change', ev => {
      const t = ev.target, act = t.dataset && t.dataset.act; if (!act) return;
      if (act === 'cat') return toggleCat(t.value);
      if (act === 'online') return change(f => { f.online = t.value; });
      if (act === 'sort') return change(f => { f.sort = t.value; });
      if (act === 'friends') return change(f => { f.friends = t.checked ? '1' : ''; });
      if (act === 'day') { st.pick = true; return change(f => { f.day = t.value; f.date = ''; }); }
      if (act === 'max') return change(f => { f.max = +t.value >= maxPrice() ? '' : t.value; if (f.max && f.price === 'free') f.price = ''; });
    });
    root.addEventListener('input', ev => {
      const t = ev.target; if (!t.dataset || t.dataset.act !== 'max') return;
      const o = $('[data-maxout]', root), mp = maxPrice(); if (o) o.textContent = +t.value >= mp ? 'any price' : money(+t.value);
      t.style.setProperty('--p', Math.round(t.value / mp * 100) + '%');
    });
    root.addEventListener('submit', ev => {
      if (!ev.target.matches('.s-mq')) return; ev.preventDefault();
      const q = (new FormData(ev.target).get('q') || '').trim(); const inp = ev.target.querySelector('input'); if (inp) inp.blur();
      change(f => { f.q = q; });
    });

    // one-time global hooks (Esc to close overlays, breakpoint repaint, body-scroll cleanup on navigation)
    st.paint = paint; st.closeSheet = closeSheet; st.setView = setView;
    if (!V._searchHooks) {
      V._searchHooks = true;
      document.addEventListener('keydown', ev => {
        if (ev.key !== 'Escape' || !CUR || !$('#n3s')) return;
        if (CUR.sheet) { ev.preventDefault(); CUR.closeSheet(); } else if (CUR.f.view === 'map' && isPhone()) { ev.preventDefault(); CUR.setView(''); }
      });
      window.matchMedia('(max-width: 900px)').addEventListener('change', () => { if (CUR && $('#n3s')) CUR.paint(); });
      window.addEventListener('hashchange', () => { document.body.style.overflow = ''; });
    }
    sync();
    lock(st.f.view === 'map' && isPhone());
  };
})();
