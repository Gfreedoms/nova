/* v3 home — owned by the home agent. Board: "Nova 01 Home.dc.html" → V.home / V.homeMount */
(function () {
  const V = window.Views;
  const { esc, remaining, soldCount, cat, dFmt } = UI;
  const IC = N3.IC;
  const DAY = 864e5;
  const q = o => Object.keys(o).filter(k => o[k] !== '' && o[k] != null).map(k => k + '=' + encodeURIComponent(o[k])).join('&');
  const S = o => '#/search' + (q(o) ? '?' + q(o) : '');
  const up = s => String(s).toUpperCase();
  const isoOf = d => d.toISOString();
  const CAT_IMG = { music: 'confetti', arts: 'mic', food: 'food', business: 'summit', sports: 'yoga', social: 'festival', education: 'summit', charity: 'friends' };
  const photoAsset = (name, alt, cls) => `<div class="n3-ph ${cls || ''}"><img src="assets/${name}.jpg" alt="${esc(alt || '')}" loading="lazy"></div>`;
  const venueShort = e => e.online ? 'Online' : e.venue.name;
  const inCity = (e, city) => !e.online && e.venue && e.venue.city === city;

  /* upcoming Fri–Sun (or the current one if we're in it) */
  function weekendRange() {
    const now = new Date(), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), wd = d0.getDay();
    const toFri = wd === 0 ? -2 : wd === 6 ? -1 : 5 - wd;
    const fri = new Date(d0.getTime() + toFri * DAY), sun = new Date(fri.getTime() + 2 * DAY);
    return { fri, sun };
  }
  const inRange = (e, a, b) => { const s = new Date(e.start); return s >= a && s < new Date(b.getTime() + DAY); };

  function pickCover(list) {
    const now = Date.now();
    const pool = list.filter(e => (e.image || e.photo) && !N3.isToday(e.start) && remaining(e) > 0 && new Date(e.start) - now > 36e5 * 36);
    const big = pool.filter(e => /festival|party|concert|gig/i.test(e.title + ' ' + (e.tags || []).join(' ')) || ['music', 'social'].includes(Store.catId(e.category)));
    const src = big.length ? big : (pool.length ? pool : list);
    return src.slice().sort((a, b) => soldCount(b) - soldCount(a))[0];
  }

  /* ---------- sections ---------- */
  function daysStrip(city) {
    const all = N3.filter(city && city !== 'Anywhere' ? { loc: city } : {});
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const key = d => d.getFullYear() + '-' + N3.two(d.getMonth() + 1) + '-' + N3.two(d.getDate());
    let out = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(t0.getTime() + i * 864e5), k = key(d);
      const evs = all.filter(e => key(new Date(e.start)) === k);
      const lbl = i === 0 ? 'TONIGHT' : i === 1 ? 'TMRW' : d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
      const first = evs[0];
      out += `<a class="h-day ${evs.length ? '' : 'none'} ${i === 0 ? 'now' : ''}" href="#/search?day=${k}${city && city !== 'Anywhere' ? '&loc=' + encodeURIComponent(city) : ''}">
        <span class="h-day-l">${lbl}</span><b>${N3.two(d.getDate())}</b>
        <span class="h-day-n">${evs.length ? evs.length + ' on' : 'Quiet'}</span>
        ${first ? `<span class="h-day-e">${esc(first.title)}</span>` : '<span class="h-day-e">Host something?</span>'}
      </a>`;
    }
    return out;
  }
  function hero(ctx) {
    const { city, cover, weekCount, weekFree } = ctx;
    const cp = cover && N3.dateParts(cover.start);
    const end = cover && new Date(cover.end), multi = cover && end - new Date(cover.start) > 20 * 36e5;
    const coverDate = cover ? (multi ? cp.dd + '–' + N3.two(end.getDate()) + ' ' + cp.mon : cp.dow + ' ' + cp.dd + ' ' + cp.mon + ' · ' + cp.time) : '';
    const whereOpts = ['Anywhere'].concat(N3.CITIES, ['Online']);
    return `<section class="h-hero n3-night" data-grain aria-labelledby="hHeroT">
      <div class="n3-wrap">
        <div class="h-issue" aria-label="This week's issue">
          <span>NO. ${N3.issueNo()}</span><span>THIS WEEK IN ${esc(up(city))}</span><span class="h-issue-d">${esc(N3.weekRange())}</span><span class="h-issue-n">${weekCount} EVENT${weekCount === 1 ? '' : 'S'} · ${weekFree} FREE</span>
        </div>
        <div class="h-grid">
          ${cover ? `<div class="h-cover">
            ${N3.img(cover, 1000, { duo: 'jac', eager: true, reveal: true, sizes: '(max-width: 900px) 100vw, 40vw', alt: cover.title })}
            <span class="h-stamp" aria-hidden="true">ON THE COVER</span>
            <a class="h-cover-cap" href="#/event/${cover.id}">
              <span class="h-cover-k">${esc(up(coverDate))} · ${esc(up(venueShort(cover)))}</span>
              <span class="h-cover-t">${esc(cover.title)}</span>
              <span class="h-cover-m">${esc(N3.kicker(cover).split(' · ')[0].toLowerCase().replace(/^./, c => c.toUpperCase()))} · ${esc(N3.priceFrom(cover))} →</span>
            </a>
          </div>` : ''}
          <div class="h-lead-w">
            <h1 class="h-title2" id="hHeroT">Something on in ${esc(city === 'Anywhere' ? 'the city' : city)}, <em>every night.</em></h1>
            <div class="h-days" aria-label="Next 7 days">${daysStrip(city)}</div>
          </div>
          ${cover ? `<a class="h-cover-mob" href="#/event/${cover.id}"><span>On the cover</span> ${esc(cover.title)} →</a>` : ''}
          <form class="h-search" id="hSearch" role="search" aria-label="Find events">
            <label class="h-f h-f-what"><span>WHAT</span><input id="hQ" name="q" type="search" autocomplete="off" placeholder="Afro-jazz, comedy, rolex, rafting…" aria-label="What"></label>
            <label class="h-f h-f-where"><span>WHERE</span><select id="hLoc" name="loc" aria-label="Where">${whereOpts.map(c => `<option value="${c === 'Anywhere' ? '' : esc(c)}" ${c === city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
            <label class="h-f h-f-when"><span>WHEN</span><select id="hDate" name="date" aria-label="When"><option value="">Any time</option>${N3.DATES.map(([k, l]) => `<option value="${k}" ${k === 'weekend' ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <button class="h-go" type="submit">Find it</button>
          </form>
          <div class="h-picks" aria-label="Quick picks"><span>Quick picks:</span>
            <a class="hot" href="${S({ date: 'today', loc: city })}"><i></i>Tonight</a>
            <a href="${S({ price: 'free', loc: city })}">Free</a>
            <a href="${S({ max: 20000, sort: 'price', loc: city })}">Under UGX 20k</a>
            <a href="${S({ sort: 'popular', loc: city })}">Friends going</a>
            <a href="${S({ cat: 'sports' })}">Outdoors</a>
          </div>
        </div>
      </div>
    </section>`;
  }

  function tonight(ctx) {
    const { city, tonightList, nearList } = ctx;
    const today = N3.dateParts(new Date().toISOString());
    const n = tonightList.length;
    const dek = n ? `${n} thing${n === 1 ? '' : 's'} on tonight in ${esc(city)}${nearList.length > n ? ' — and what\'s next' : ''}` : `Quiet night in ${esc(city)} — here's what's next`;
    const card = e => {
      const p = N3.dateParts(e.start), b = N3.badge(e), left = remaining(e), f = N3.friends(e);
      const right = b && b.cls === 'fast' ? '<span class="warm">Selling fast</span>' : left <= 50 ? `<span class="warm">${left} spot${left === 1 ? '' : 's'} left</span>` : f ? `<span>${f} friends</span>` : '';
      return `<a class="h-tn" href="#/event/${e.id}">
        <span class="h-tn-t">${p.time}</span>
        <span class="h-tn-n">${esc(e.title)}</span>
        <span class="h-tn-w">${N3.isToday(e.start) ? '' : `<b>${esc(p.rel === 'Tomorrow' ? 'Tomorrow' : p.dow + ' ' + p.dd + ' ' + p.mon)}</b> · `}${esc(N3.where(e))}</span>
        <span class="h-tn-f"><b>${esc(N3.isFree(e) ? 'Free · RSVP' : N3.priceFrom(e).replace('From ', ''))}</b>${right}</span>
      </a>`;
    };
    return `<section class="h-tonight" aria-labelledby="hTonT"><div class="n3-wrap">
      <div class="h-sec-head">
        <div class="h-tn-head"><span class="h-pill"><i></i>TONIGHT<span class="h-pill-d"> · ${today.dow} ${today.dd} ${today.mon}</span></span><h2 id="hTonT">NEAR YOU</h2><span class="h-tn-dek">${dek}</span></div>
        <a class="n3-link h-more" href="${S({ date: n ? 'today' : 'week', loc: city })}"><span class="h-dsk">${n ? 'The whole night' : 'This week'} →</span><span class="h-mob">All ${n || ''}</span></a>
      </div>
      <div class="h-tn-row">${nearList.map(card).join('')}</div>
    </div></section>`;
  }

  function trending(list) {
    const top = list.slice().sort((a, b) => soldCount(b) - soldCount(a)).slice(0, 7);
    const one = `<span>TRENDING THIS WEEK</span><span class="dot" aria-hidden="true">●</span>` + top.map(e => `<a href="#/event/${e.id}">${esc(e.title.split(':')[0])}</a><span class="dot" aria-hidden="true">●</span>`).join('');
    return `<div class="n3-marquee h-marquee" data-marquee="40" role="region" aria-label="Trending events"><div>${one}<span aria-hidden="true" class="h-mq-dup">${one.replace(/<a /g, '<a tabindex="-1" ')}</span></div></div>`;
  }

  function index(list) {
    const cats = Store.categories;
    const wk = N3.filter({ date: 'week' });
    const item = (c, i) => {
      const all = list.filter(e => Store.catId(e.category) === c.id), w = wk.filter(e => Store.catId(e.category) === c.id).length, free = all.filter(N3.isFree).length;
      const meta = (w ? w + ' this week' : all.length ? all.length + ' coming up' : 'Nothing yet — host one?') + (free ? ' · ' + free + ' free' : '');
      return `<a class="h-ix" href="${S({ cat: c.id })}">
        <span class="h-ix-n">${N3.two(i + 1)}</span>
        <span class="h-ix-b"><b>${esc(up(c.name))}<i aria-hidden="true"> →</i></b><small>${meta}</small></span>
        ${photoAsset(CAT_IMG[c.id] || 'festival', '', 'h-ix-img')}
      </a>`;
    };
    return `<section class="h-index" aria-labelledby="hIxT"><div class="n3-wrap h-index-g">
      <div class="h-index-l"><span class="h-lab">CONTENTS</span><h2 id="hIxT">THE <br class="h-br">INDEX</h2><p class="n3-dek">Eight ways to spend a night out — or a morning in.</p></div>
      <div class="h-ix-list">${cats.map(item).join('')}</div>
    </div></section>`;
  }

  function weekend(ctx) {
    const { wk, wkList } = ctx;
    const f = wk.fri, s = wk.sun, sameMon = f.getMonth() === s.getMonth();
    const range = `${N3.dateParts(isoOf(f)).dow} ${N3.two(f.getDate())}${sameMon ? '' : ' ' + N3.dateParts(isoOf(f)).mon} — ${N3.dateParts(isoOf(s)).dow} ${N3.two(s.getDate())} ${N3.dateParts(isoOf(s)).mon}`;
    const short = `${N3.two(f.getDate())}–${N3.two(s.getDate())} ${N3.dateParts(isoOf(s)).mon}`;
    let lead = wkList.slice().sort((a, b) => soldCount(b) - soldCount(a))[0];
    let rest = wkList.filter(e => e !== lead);
    let extra = [];
    if (!lead) { const nx = N3.upcoming().filter(e => new Date(e.start) > s); lead = nx[0]; rest = []; extra = nx.slice(1, 4); }
    else if (rest.length < 4) extra = N3.upcoming().filter(e => new Date(e.start) >= new Date(s.getTime() + DAY) && e !== lead).slice(0, 4 - rest.length);
    if (!lead) return '';
    const p = N3.dateParts(lead.start), b = N3.badge(lead), left = remaining(lead), fr = N3.friends(lead);
    const badge = b ? up(b.t) + (b.cls === 'fast' && left < 100 ? ' · ' + left + ' LEFT' : '') : '';
    const lk = up(cat(lead.category).name.split(' & ')[0] + ' · ' + N3.area(lead));
    const row = e => {
      const rp = N3.dateParts(e.start), rl = remaining(e);
      const price = N3.isFree(e) ? `<span class="h-free">FREE</span> · ${rp.time}` : `${esc(N3.priceFrom(e).replace('From ', ''))}${rl > 0 && rl <= 50 ? ` <span class="warm">· ${rl} left</span>` : rl === 0 ? ' <span class="warm">· sold out</span>' : ` · ${rp.time}`}`;
      return `<a class="h-wr" href="#/event/${e.id}">
        <span class="h-wr-d"><b>${rp.dd}</b><small>${rp.dow}</small></span>
        <span class="h-wr-b"><span class="n3-kicker-s">${esc(up(cat(e.category).name.split(' & ')[0] + ' · ' + venueShort(e)))}</span><span class="h-wr-t">${esc(e.title)}</span><span class="h-wr-p">${price}</span></span>
        ${N3.img(e, 280, { duo: '', sizes: '120px' })}
      </a>`;
    };
    const names = ['Brenda Nakato', 'Ivan Okello'];
    return `<section class="h-weekend" aria-labelledby="hWkT"><div class="n3-wrap">
      <div class="h-wk-head"><h2 id="hWkT">THIS <br class="h-br">WEEKEND</h2><span class="h-wk-r"><span class="h-wk-long">${esc(range)}</span><span class="h-wk-short">${esc(short)}</span></span></div>
      <div class="h-wk-g">
        <article class="h-lead">
          <a class="h-lead-img" href="#/event/${lead.id}" aria-label="${esc(lead.title)}">
            ${N3.img(lead, 1200, { duo: 'jac', reveal: true, sizes: '(max-width: 900px) 100vw, 55vw' })}
            <span class="h-lead-date" aria-hidden="true"><b>${p.dd}</b><span>${p.dow}<br><span class="h-lead-mon">${p.mon}<br></span>${p.time}</span></span>
            ${badge ? `<span class="h-lead-badge">${esc(badge)}</span>` : ''}
          </a>
          <div class="h-lead-hd">
            <div><span class="n3-kicker-s">COVER STORY · ${esc(lk)}</span><h3><a href="#/event/${lead.id}">${esc(lead.title)}</a></h3></div>
            <div class="h-lead-pr">${/^From /.test(N3.priceFrom(lead)) ? '<small>From</small>' : ''}<b>${esc(N3.priceFrom(lead).replace('From ', ''))}</b></div>
          </div>
          <p class="h-lead-sum">${esc(lead.summary || '')}</p>
          <div class="h-lead-ft">
            ${fr ? `${N3.avatars(names, Math.max(0, fr - 2))}<span class="h-lead-fr">${fr > 2 ? `Brenda, Ivan and ${fr - 2} friends are going` : fr + ' friends are going'}</span>` : `<span class="h-lead-fr">${soldCount(lead)} going</span>`}
            <span class="h-lead-sp"></span>
            <a class="n3-btn" href="#/event/${lead.id}">Get tickets</a>
          </div>
          <span class="h-lead-mob"><span>${esc(N3.priceFrom(lead))}</span>${fr ? `<span>${fr} friends going</span>` : ''}</span>
        </article>
        <div class="h-wk-list">
          ${rest.map(row).join('')}
          ${extra.length ? `<span class="h-wk-sub">${wkList.length ? 'And early next week' : 'Quiet weekend — coming up next'}</span>${extra.map(row).join('')}` : ''}
          <a class="n3-link h-more" href="${S({ date: 'weekend' })}">All ${wkList.length} weekend event${wkList.length === 1 ? '' : 's'} →</a>
        </div>
      </div>
    </div></section>`;
  }

  function guides(ctx) {
    const { city, list } = ctx;
    const music = list.filter(e => Store.catId(e.category) === 'music');
    let freeWk = N3.filter({ price: 'free', date: 'week' }), freeLbl = 'this week', freeDate = 'week';
    if (freeWk.length < 2) { freeWk = N3.filter({ price: 'free', date: 'month' }); freeLbl = 'this month'; freeDate = 'month'; }
    const others = N3.CITIES.filter(c => c !== city).map(c => ({ c, l: list.filter(e => inCity(e, c)) })).sort((a, b) => b.l.length - a.l.length);
    const trip = others[0];
    const venues = l => Array.from(new Set(l.filter(e => !e.online).map(e => e.venue.name.split(',')[0]))).slice(0, 3).join(', ');
    const G = [
      { n: music.length, t: 'late sets for a Friday', href: S({ cat: 'music' }), e: music[0], by: 'By Aisha Namutebi · 4 min · ' + (venues(music) || 'Kololo, Nakasero, Bugolobi'), col: 'jac', duo: 'jac' },
      { n: freeWk.length, t: 'free things ' + freeLbl, href: S({ price: 'free', date: freeDate }), e: freeWk[0], by: 'By Ivan Okello · 3 min · No wallet required', col: 'ember', duo: '' },
      { n: 24, t: 'hours in ' + trip.c, href: S({ loc: trip.c }), e: trip.l[0], by: `By Grace Achieng · 6 min · ${trip.l.length} event${trip.l.length === 1 ? '' : 's'}${trip.l.length ? ' · ' + venues(trip.l) : ''}`, col: 'jac', duo: '' }
    ];
    const card = (g, i) => `<a class="h-gd ${i === 0 ? 'big' : ''}" href="${g.href}">
      <span class="h-gd-h"><b class="${g.col}">${g.n}</b><span>${esc(g.t)}</span></span>
      ${g.e ? N3.img(g.e, 800, { duo: g.duo, reveal: true, sizes: '(max-width: 900px) 250px, 33vw', alt: '' }) : photoAsset(['friends', 'yoga', 'beach'][i], '')}
      <span class="h-gd-by">${esc(g.by)}</span>
    </a>`;
    // venue of the week = venue with the most upcoming events
    const byV = {};
    list.filter(e => !e.online).forEach(e => { (byV[e.venue.name] = byV[e.venue.name] || []).push(e); });
    const vv = Object.keys(byV).sort((a, b) => byV[b].length - byV[a].length)[0];
    const ve = vv ? byV[vv] : [];
    const vp = ve[0] && N3.dateParts(ve[0].start);
    return `<section class="h-guides n3-night" data-grain aria-labelledby="hGdT"><div class="n3-wrap">
      <div class="h-gd-head"><h2 id="hGdT">THE GUIDES</h2><p class="n3-dek">Edited by people who actually go out. New every Thursday.</p></div>
      <div class="h-gd-row">${G.map(card).join('')}</div>
      ${vv ? `<div class="h-venue"><span class="h-venue-k">VENUE OF THE WEEK</span>
        <span class="h-venue-t"><b>${esc(vv)}</b> — ${ve.length} event${ve.length === 1 ? '' : 's'} coming up, starting with ${esc(ve[0].title)} on ${esc(vp.dow.charAt(0) + vp.dow.slice(1).toLowerCase())} ${+vp.dd} ${esc(vp.mon.charAt(0) + vp.mon.slice(1).toLowerCase())}.</span>
        <a href="${S({ loc: vv })}">Visit the venue →</a></div>` : ''}
    </div></section>`;
  }

  function cities(ctx) {
    const { city, list } = ctx;
    const cur = city;
    return `<section class="h-cities" aria-labelledby="hCtT"><div class="n3-wrap">
      <div class="h-ct-head"><span class="h-lab" id="hCtT">NOT IN ${esc(up(cur))}?</span><span class="n3-dek">Same Nova, different city.</span></div>
      <div class="h-ct-row">${N3.CITIES.map(c => {
        const n = list.filter(e => inCity(e, c)).length, on = c === cur;
        return `<a class="h-ct ${on ? 'on' : ''}" href="${S({ loc: c })}" data-city="${esc(c)}" ${on ? 'aria-current="true"' : ''}><span class="h-ct-n ${on ? 'n3-swash' : ''}">${esc(up(c))}${on ? '<i class="h-ct-ck" aria-hidden="true"> ✓</i>' : ''}</span><sup>${n}<span class="n3-sr"> events</span></sup></a>`;
      }).join('')}</div>
    </div></section>`;
  }

  const organiser = () => `<section class="h-org h-org-mini" aria-labelledby="hOrgT"><div class="n3-wrap h-orgm">
      <h2 id="hOrgT">THROWING SOMETHING?</h2>
      <p>Sell out your night on Nova. Free events cost nothing; paid tickets 3.5% + UGX 1,000. Paid on Mobile Money the next morning.</p>
      <div class="h-orgm-cta"><a class="n3-btn ink" href="#/create">Start selling</a><a class="n3-link" href="#/pricing">Pricing</a></div>
    </div></section>`;
  const newsletter = () => {
    let subd = ''; try { subd = localStorage.getItem('nova.v3.letter') || ''; } catch (e) {}
    return `<section class="h-news" aria-labelledby="hNwT"><div class="n3-wrap h-news-g">
      <div><span class="h-lab h-dsk">NEWSLETTER</span><h2 id="hNwT">The Thursday Letter</h2></div>
      <div class="h-news-r">
        <p><span class="h-dsk">Every Thursday at 7 AM: the weekend, before it sells out. 18,400 Kampalans read it with their chai.</span><span class="h-mob">The weekend, before it sells out. 7 AM every Thursday.</span></p>
        <form class="h-nf ${subd ? 'done' : ''}" id="hNews" novalidate>
          <label for="hNwE" class="n3-sr">Email</label>
          <input id="hNwE" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${esc(subd)}" aria-describedby="hNwH">
          <button type="submit">${subd ? 'Subscribed ✓' : 'Sign me up'}</button>
        </form>
        <span class="h-nf-h" id="hNwH" aria-live="polite">${subd ? `You're on the list as ${esc(subd)}. See you Thursday.` : 'One email a week. Unsubscribe in one tap. Prefer WhatsApp? <button type="button" class="h-wa" id="hWa">Get it on WhatsApp</button>'}</span>
      </div>
    </div></section>`;
  };

  /* ---------- page ---------- */
  V.home = () => {
    const city = N3.city();
    const list = N3.upcoming();
    const cityList = list.filter(e => e.online || inCity(e, city));
    const wkIn = N3.filter({ date: 'week', loc: city }).concat(N3.filter({ date: 'week', online: '1' }));
    const weekCount = wkIn.length, weekFree = wkIn.filter(N3.isFree).length;
    const tonightList = list.filter(e => N3.isToday(e.start) && remaining(e) > 0 && (inCity(e, city) || e.online));
    const nearList = tonightList.slice(0, 4);
    if (nearList.length < 4) (cityList.length >= 4 ? cityList : list).filter(e => !nearList.includes(e) && new Date(e.start) > new Date()).slice(0, 4 - nearList.length).forEach(e => nearList.push(e));
    const cover = pickCover(cityList.length > 3 ? cityList : list);
    const wk = weekendRange();
    const wkList = list.filter(e => inRange(e, wk.fri, wk.sun));
    const ctx = { city, list, cover, weekCount, weekFree, tonightList, nearList, wk, wkList };
    return `<div class="n3-page n3-p-home">
      ${hero(ctx)}
      ${tonight(ctx)}
      ${index(list)}
      ${weekend(ctx)}
      ${guides(ctx)}
      ${cities(ctx)}
      ${organiser()}
    </div>`;
  };

  V.homeMount = () => {
    const root = document.querySelector('.n3-p-home'); if (!root) return;
    const $ = s => root.querySelector(s);
    const form = $('#hSearch');
    if (form) form.addEventListener('submit', ev => {
      ev.preventDefault();
      const loc = $('#hLoc').value;
      if (loc && N3.CITIES.includes(loc) && loc !== N3.city()) N3.setCity(loc);
      location.hash = S({ q: $('#hQ').value.trim(), loc, date: $('#hDate').value });
    });
    root.querySelectorAll('.h-ct[data-city]').forEach(a => a.addEventListener('click', () => { const c = a.dataset.city; if (c !== N3.city()) N3.setCity(c); }));
    const nf = $('#hNews');
    if (nf) nf.addEventListener('submit', ev => {
      ev.preventDefault();
      const inp = $('#hNwE'), hint = $('#hNwH'), v = inp.value.trim();
      if (nf.classList.contains('done')) { UI.toast("You're already on the Thursday Letter."); return; }
      const ok = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
      const typo = v.match(/@(gmial|gmal|gamil|gnail|yaho|yahooo|hotmial|outlok)\.[a-z.]+$/i);
      if (!ok || typo) {
        nf.classList.add('bad'); inp.setAttribute('aria-invalid', 'true');
        hint.textContent = !v ? 'Enter your email address.' : typo ? 'Check the spelling after the @ — did you mean ' + v.replace(/@[^.]+/, m => '@' + ({ gmial: 'gmail', gmal: 'gmail', gamil: 'gmail', gnail: 'gmail', yaho: 'yahoo', yahooo: 'yahoo', hotmial: 'hotmail', outlok: 'outlook' })[m.slice(1).toLowerCase()]) + '?' : "That email doesn't look right — try name@example.com.";
        inp.focus(); return;
      }
      try { localStorage.setItem('nova.v3.letter', v); } catch (e) {}
      nf.classList.remove('bad'); nf.classList.add('done'); inp.removeAttribute('aria-invalid');
      nf.querySelector('button').textContent = 'Subscribed ✓';
      hint.textContent = "You're on the list as " + v + '. See you Thursday.';
      UI.toast('Subscribed. The Thursday Letter lands at 7 AM.');
    });
    const nin = $('#hNwE'); if (nin) nin.addEventListener('input', () => { if (nf.classList.contains('bad')) { nf.classList.remove('bad'); nin.removeAttribute('aria-invalid'); } });
    const wa = $('#hWa'); if (wa) wa.addEventListener('click', () => UI.toast('WhatsApp “NOVA” to 0800 100 668 to get the Letter there.'));
  };
})();
