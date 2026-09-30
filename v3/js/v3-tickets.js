/* Nova v3 — My tickets, single ticket ("at the door"), account, saved (tickets agent).
   Board: "Nova 05 Tickets and Account.dc.html". All markup scoped under .n3-p-tickets. */
(function () {
  const V = window.Views;
  const { esc, moneyPlain, dFmt, toast } = UI;
  const IC = N3.IC;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RATE_KEY = 'nova.v3.ratings', PREF_KEY = 'nova.v3.prefs';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- helpers ---------- */
  const DAY = 864e5;
  const day0 = d => { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
  const daysTo = iso => Math.round((day0(iso) - day0(Date.now())) / DAY);
  const soon = e => { const n = daysTo(e.start); if (new Date(e.end) < new Date()) return null; if (n <= 0) return { t: new Date(e.start) <= new Date() ? 'ON NOW' : 'TONIGHT', live: true }; if (n === 1) return { t: 'TOMORROW' }; if (n <= 7) return { t: 'IN ' + n + ' DAYS' }; return null; };
  const venueShort = e => e.online ? 'Online' : e.venue.name;
  const areaOf = e => e.online ? 'Online' : N3.area(e);
  const spanDays = e => { const n = daysTo(e.end) - daysTo(e.start); return n >= 1 ? (n + 1) + ' days' : ''; };
  const itemsLine = o => o.items.map(i => i.qty + ' × ' + i.name).join(' · ');
  const nTk = o => o.tickets.length;
  const sentCount = o => o.tickets.filter(t => t.sentTo).length;
  const firstSent = o => (o.tickets.find(t => t.sentTo) || {}).sentTo;
  const userPhone = u => u ? (u.phone || (/^256(\d{9})@phone\.nova$/.test(u.email) ? '0' + u.email.slice(3, 12) : '')) : '';
  const prettyPhone = p => { const d = (p || '').replace(/\D/g, '').replace(/^256/, '').replace(/^0/, ''); return d ? '0' + (N3.phone ? N3.phone.pretty(d) : d) : ''; };
  const buyerPhone = o => prettyPhone((o.buyer && o.buyer.phone) || userPhone(Store.user()));
  const holder = (o, t) => t.holder || (o.buyer && (o.buyer.first || o.buyer.last) ? ((o.buyer.first || '') + ' ' + (o.buyer.last || '')).trim() : (Store.user() || {}).name || '');
  const PAY = { momo: 'Mobile Money', mtn: 'MTN MoMo', airtel: 'Airtel Money', card: 'Card', bank: 'Bank transfer', free: 'Free — no payment' };
  // Store returns the live order objects; persist edits (transfer) through a no-op check-in write.
  const persist = o => { const t = o.tickets[0]; Store.checkIn(o.id, t.code, t.checkedIn); };

  function mine() {
    const now = new Date();
    const all = Store.myOrders().map(o => ({ o, e: Store.getEvent(o.eventId) })).filter(x => x.e);
    const up = all.filter(x => !x.o.cancelled && new Date(x.e.end) >= now).sort((a, b) => new Date(a.e.start) - new Date(b.e.start));
    const past = all.filter(x => x.o.cancelled || new Date(x.e.end) < now).sort((a, b) => new Date(b.e.start) - new Date(a.e.start));
    return { up, past };
  }

  /* refund policy: "Refunds available up to N days before the event." / "No refunds…" */
  function refundState(o, e) {
    const policy = e.refund || 'Refunds available up to 7 days before the event.';
    if (o.cancelled) return { can: false, policy, why: 'This order was cancelled.' };
    if (new Date(e.start) <= new Date()) return { can: false, policy, why: 'The event has started, so this order can no longer be cancelled.' };
    if (!o.total) return { can: true, free: true, policy, why: 'Free ticket — cancelling releases your spot for someone else.' };
    if (/^no refunds/i.test(policy)) return { can: false, policy, why: 'The organiser doesn’t offer refunds for this event. You can transfer your ticket to a friend instead.' };
    const m = policy.match(/(\d+)\s*days?/i), n = m ? +m[1] : 0;
    const deadline = new Date(new Date(e.start).getTime() - n * DAY);
    if (new Date() > deadline) return { can: false, policy, why: 'The refund window closed on ' + dFmt(deadline.toISOString(), { weekday: 'short', day: 'numeric', month: 'short' }) + '. You can still transfer your ticket to a friend.' };
    return { can: true, policy, deadline, why: 'Full refund of ' + moneyPlain(o.total) + ' to ' + (PAY[o.payment] || 'your payment method') + ' until ' + dFmt(deadline.toISOString(), { weekday: 'short', day: 'numeric', month: 'short' }) + '.' };
  }

  /* ---------- shared bits ---------- */
  const head = (title, extra) => `<div class="tk-head"><h1 class="tk-h1">${title}</h1>${extra || ''}</div>`;
  function tabs(active, up, past, saved) {
    const t = (k, label, n, href) => href
      ? `<a role="tab" href="${href}" class="tk-tab-${k}" aria-selected="${active === k}">${label} · ${n}</a>`
      : `<button type="button" role="tab" id="tkTab-${k}" data-t="${k}" aria-controls="tkPane-${k}" aria-selected="${active === k}" tabindex="${active === k ? 0 : -1}">${label} · ${n}</button>`;
    const onLikes = active === 'saved';
    return `<div class="n3-seg tk-seg" role="tablist" aria-label="Your tickets" id="tkTabs">
      ${t('up', 'Upcoming', up, onLikes ? '#/tickets' : null)}${t('past', 'Past', past, onLikes ? '#/tickets?tab=past' : null)}${t('saved', 'Saved', saved, onLikes ? null : '#/likes')}</div>`;
  }
  function signedOut(title, line) {
    return `<div class="n3-page n3-p-tickets"><div class="n3-wrap tk-wrap">${head(title)}
      <div class="n3-empty tk-empty">${IC.ticket}<h2>Your tickets live here.</h2><p>${esc(line)}</p>
        <div class="tk-empty-a"><button type="button" class="n3-btn" data-tk-signin>Sign in with your phone</button><a class="n3-link" href="#/">See what’s on</a></div></div>
    </div></div>`;
  }
  const mountSignin = () => $$('[data-tk-signin]').forEach(b => b.onclick = () => Auth.open('login', () => App.render()));

  /* ================= MY TICKETS ================= */
  function tkCard({ o, e }, sel) {
    const p = N3.dateParts(e.start), s = soon(e), sent = sentCount(o);
    const kick = [itemsLine(o).toUpperCase(), sent ? sent + ' SENT TO ' + esc(String(firstSent(o).name || '').split(' ')[0].toUpperCase()) : ''].filter(Boolean).join(' · ');
    const ar = areaOf(e), vn = e.venue && e.venue.name || '';
    const meta = e.online ? 'Online · starts ' + p.time : esc(vn) + (vn.toLowerCase().includes(ar.toLowerCase()) ? '' : ', ' + esc(ar)) + ' · doors ' + p.time + (spanDays(e) ? ' · ' + spanDays(e) : '');
    const mmeta = (nTk(o) > 1 ? nTk(o) + ' tickets · ' : '') + esc(e.online ? 'Online' : areaOf(e)) + ' · ' + p.time;
    return `<a class="tk-card ${sel ? 'sel' : ''}" href="#/tickets/${o.id}" data-order="${o.id}" ${sel ? 'aria-current="true"' : ''}>
      <span class="tk-card-d"><b>${p.dd}</b><span>${p.dow} ${p.mon}</span></span>
      <span class="tk-card-b">
        <span class="tk-card-k">${s ? `<i class="tk-pill ${s.live ? 'live' : ''}">${s.t}</i>` : ''}<span>${kick}</span></span>
        <span class="tk-card-t">${esc(e.title)}</span>
        <span class="tk-card-m"><span class="dk">${meta}</span><span class="mb">${mmeta}</span></span>
      </span>
      <span class="tk-card-v"><small>${sel ? 'Selected' : ''}</small><b>View ${IC.arrow}</b></span>
      <i class="tk-notch t"></i><i class="tk-notch b"></i>
    </a>`;
  }
  function pastRow({ o, e }) {
    const p = N3.dateParts(e.start);
    const scanned = o.tickets.find(t => t.checkedIn);
    const rated = (ls.get(RATE_KEY, {}))[o.id];
    const bits = [dFmt(e.start, { weekday: 'short', day: 'numeric', month: 'short' })];
    if (o.cancelled) bits.push('Cancelled' + (o.total ? ' · refunded' : ''));
    else if (scanned) bits.push('Scanned ' + (scanned.scannedAt ? N3.hhmm(scanned.scannedAt) : 'at the door'));
    bits.push(o.total ? moneyPlain(o.total) : 'Free');
    const following = Store.isFollowing(e.organizerId);
    let btn;
    if (o.cancelled) btn = `<a class="tk-pbtn" href="#/event/${e.id}">See event</a>`;
    else if (rated) btn = `<span class="tk-rated" aria-label="You rated it ${rated} out of 5">${'★'.repeat(rated)}${'☆'.repeat(5 - rated)}</span>`;
    else if (!following && new Date(e.end) < new Date()) btn = `<button type="button" class="tk-pbtn" data-follow="${esc(e.organizerId)}">Follow organiser</button>`;
    else btn = `<button type="button" class="tk-pbtn" data-rate="${o.id}">Rate it</button>`;
    return `<div class="tk-past ${o.cancelled ? 'x' : ''}"><span class="tk-past-d">${p.dd}</span>
      <a class="tk-past-b" href="#/tickets/${o.id}"><span class="tk-past-t">${esc(e.title)}</span><span class="tk-past-m">${bits.join(' · ')}</span></a>${btn}</div>`;
  }
  function doorPanel(x) {
    if (!x) return '';
    const { o, e } = x, t = o.tickets.find(t => !t.sentTo) || o.tickets[0], ph = buyerPhone(o), r = refundState(o, e);
    return `<div class="tk-door" id="tkDoor">
      <span class="tk-door-k">Show this at the door</span>
      <a class="tk-door-t" href="#/tickets/${o.id}">${esc(e.title)}</a>
      <canvas data-qr="${esc(t.code)}" width="280" height="280" aria-label="QR code for ticket ${esc(t.code)}"></canvas>
      <span class="tk-door-code">${esc(t.code)}</span>
      ${nTk(o) > 1 ? `<span class="tk-door-n">Ticket 1 of ${nTk(o)} · <a href="#/tickets/${o.id}">see all ${nTk(o)}</a></span>` : ''}
      <span class="tk-door-p">${ph ? `No QR scanner? Give the door team your phone number: <b>${esc(ph)}</b>` : 'No QR scanner? Read the code above to the door team.'}</span>
      <div class="tk-door-a">
        <a class="n3-btn sec" href="#/tickets/${o.id}?transfer=1">Transfer</a>
        <a class="n3-btn sec" href="#/tickets/${o.id}?refund=1">${r.can ? (r.free ? 'Cancel spot' : 'Request refund') : 'Refund policy'}</a>
        <a class="n3-btn wa tk-door-wa" href="${waLink(o, e, t)}" target="_blank" rel="noopener">${IC.wa} Send to WhatsApp</a>
      </div>
    </div>`;
  }
  function waLink(o, e, t) {
    const p = N3.dateParts(e.start);
    const txt = `My Nova ticket for ${e.title} — ${p.dow} ${p.dd} ${p.mon}, doors ${p.time}${e.online ? ' (online)' : ' at ' + e.venue.name + ', ' + e.venue.city}. Ticket ${t ? t.code : o.id}. ${location.href.split('#')[0]}#/event/${e.id}`;
    return 'https://wa.me/?text=' + encodeURIComponent(txt);
  }

  V.tickets = function () {
    if (!Store.user()) return signedOut('My<br>tickets', 'Sign in and every ticket you buy is saved here — and on your phone, so it works at the door even with no data.');
    const { up, past } = mine();
    const saved = Store.likedEvents().length;
    const tab = /[?&]tab=past/.test(location.hash) ? 'past' : 'up';
    const sel = up[0];
    const upPane = up.length ? `
        <span class="tk-offline">${IC.check} Saved on this phone — works offline</span>
        <div class="tk-list">${up.map((x, i) => tkCard(x, i === 0)).join('')}</div>
        ${past.length ? `<div class="tk-recent"><span class="tk-sec">Recently · past</span>${past.slice(0, 3).map(pastRow).join('')}</div>` : ''}`
      : `<div class="n3-empty tk-empty">${IC.ticket}<h2>Nothing booked yet.</h2><p>Your Friday isn’t sorted. Yet. Find something worth leaving the house for.</p>
          <div class="tk-empty-a"><a class="n3-btn" href="#/">See what’s on</a><a class="n3-link" href="#/search?date=weekend">This weekend</a></div></div>
        ${past.length ? `<div class="tk-recent"><span class="tk-sec">Recently · past</span>${past.slice(0, 3).map(pastRow).join('')}</div>` : ''}`;
    const pastPane = past.length ? `<div class="tk-recent all">${past.map(pastRow).join('')}</div>`
      : `<div class="n3-empty tk-empty sm"><h2>No past nights yet.</h2><p>Once you’ve been out with Nova, your nights live here.</p><a class="n3-btn sec" href="#/">Find your first</a></div>`;
    return `<div class="n3-page n3-p-tickets"><div class="n3-wrap tk-wrap">
      <div class="tk-grid ${up.length ? '' : 'solo'}">
        <div class="tk-main">
          ${head('My<br>tickets', tabs(tab, up.length, past.length, saved))}
          <div role="tabpanel" id="tkPane-up" aria-labelledby="tkTab-up" data-pane="up" ${tab !== 'up' ? 'hidden' : ''}>${upPane}</div>
          <div role="tabpanel" id="tkPane-past" aria-labelledby="tkTab-past" data-pane="past" ${tab !== 'past' ? 'hidden' : ''}>${pastPane}</div>
          <a class="tk-savedlink" href="#/likes">${IC.save} Saved events · ${saved} ${IC.arrow}</a>
        </div>
        ${up.length ? `<aside class="tk-side" aria-label="Selected ticket">${doorPanel(sel)}</aside>` : ''}
      </div>
    </div></div>`;
  };

  const origTabs = V.tabsMount;
  V.tabsMount = function (sel) {
    const root = $('.n3-p-tickets');
    if (!root) return origTabs && origTabs(sel);
    mountSignin();
    const bar = $('#tkTabs');
    if (bar) {
      const btns = $$('button[role="tab"]', bar);
      const show = b => {
        btns.forEach(x => { const on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
        $$('[data-pane]', root).forEach(p => p.hidden = p.dataset.pane !== b.dataset.t);
        try { history.replaceState(null, '', '#/tickets' + (b.dataset.t === 'past' ? '?tab=past' : '')); } catch (e) {}
      };
      btns.forEach(b => b.onclick = () => show(b));
      bar.onkeydown = ev => {
        if (!['ArrowLeft', 'ArrowRight'].includes(ev.key)) return;
        const i = btns.indexOf(document.activeElement); if (i < 0) return;
        const n = btns[(i + (ev.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length]; n.focus(); show(n);
      };
    }
    // desktop: first click selects a ticket (door panel updates), second click / "View" opens it
    const { up } = mine();
    $$('.tk-card', root).forEach(c => c.addEventListener('click', ev => {
      if (innerWidth <= 900 || c.classList.contains('sel') || ev.target.closest('.tk-card-v')) return;
      ev.preventDefault();
      const x = up.find(x => x.o.id === c.dataset.order); if (!x) return;
      $$('.tk-card', root).forEach(k => { const on = k === c; k.classList.toggle('sel', on); on ? k.setAttribute('aria-current', 'true') : k.removeAttribute('aria-current'); $('.tk-card-v small', k).textContent = on ? 'Selected' : ''; });
      const side = $('.tk-side', root); if (side) side.innerHTML = doorPanel(x);
    }));
    mountPast(root);
  };

  function mountPast(root) {
    $$('[data-follow]', root).forEach(b => b.onclick = () => {
      const id = b.dataset.follow, r = Store.toggleFollow(id);
      if (r === null) return Auth.open('login', () => App.render());
      toast(r ? 'Following ' + Store.organizer(id).name + '. We’ll tell you when they announce something.' : 'Unfollowed');
      App.render();
    });
    $$('[data-rate]', root).forEach(b => b.onclick = () => rateSheet(b.dataset.rate));
  }
  function rateSheet(orderId) {
    const o = Store.myOrders().find(o => o.id === orderId); if (!o) return;
    const e = Store.getEvent(o.eventId);
    sheet(`<h2 class="tk-sh-h">How was it?</h2><p class="tk-sh-p">${esc(e.title)}</p>
      <div class="tk-stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="false" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
      <div class="tk-sh-a"><button type="button" class="n3-btn sec" data-sheet-close>Not now</button><button type="button" class="n3-btn" id="tkRateOk" disabled>Send rating</button></div>`, m => {
      let v = 0;
      $$('[data-star]', m).forEach(s => s.onclick = () => { v = +s.dataset.star; $$('[data-star]', m).forEach(x => { x.classList.toggle('on', +x.dataset.star <= v); x.setAttribute('aria-checked', +x.dataset.star === v); }); $('#tkRateOk', m).disabled = false; });
      $('#tkRateOk', m).onclick = () => { const r = ls.get(RATE_KEY, {}); r[orderId] = v; ls.set(RATE_KEY, r); closeSheet(); toast('Thanks — the organiser will see your ' + v + '★'); App.render(); };
    });
  }

  /* ---------- in-page sheet (uses core .n3-sheet) ---------- */
  let lastFocus = null;
  function sheet(html, wire) {
    closeSheet();
    lastFocus = document.activeElement;
    const s = document.createElement('div');
    s.className = 'n3-sheet open tk-sheet'; s.id = 'tkSheet';
    s.innerHTML = `<div class="n3-sheet-bg" data-sheet-close></div><div class="n3-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="tkShH">
      <button type="button" class="n3-iconbtn sm tk-sh-x" data-sheet-close aria-label="Close">${IC.x}</button>${html}</div>`;
    document.body.appendChild(s);
    const h = $('.tk-sh-h', s); if (h) h.id = 'tkShH';
    $$('[data-sheet-close]', s).forEach(b => b.onclick = closeSheet);
    s.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSheet(); });
    if (wire) wire(s);
    setTimeout(() => { const f = $('input, [data-star], .n3-btn:not([data-sheet-close])', s) || $('.tk-sh-x', s); if (f) f.focus(); }, 30);
  }
  function closeSheet() {
    const s = $('#tkSheet'); if (!s) return; s.remove();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  window.addEventListener('hashchange', closeSheet);

  /* ================= SINGLE ORDER — "ready for the door" ================= */
  V.orderPage = function (id) {
    if (!Store.user()) return signedOut('Your ticket', 'Sign in with the phone number or email you used at checkout to see this ticket.');
    const o = Store.myOrders().find(o => o.id === id);
    if (!o) return V.notFound('We couldn’t find that order on your account. Check you’re signed in with the number you used at checkout.');
    const e = Store.getEvent(o.eventId);
    if (!e) return V.notFound('This event is no longer on Nova. Your refund, if any, is on its way.');
    const p = N3.dateParts(e.start), r = refundState(o, e), n = nTk(o), ph = buyerPhone(o);
    const past = new Date(e.end) < new Date();
    const status = o.cancelled ? '<span class="n3-badge sold">Cancelled</span>' : past ? '<span class="n3-badge sold">Ended</span>' : (soon(e) ? `<span class="n3-badge tonight">${soon(e).live ? '<i></i>' : ''}${soon(e).t.toLowerCase().replace(/^./, c => c.toUpperCase())}</span>` : '');
    const slides = o.tickets.map((t, i) => {
      const stub = N3.ticketStub(o, t, e, { day: true }).replace(/width="248" height="248"/, 'width="320" height="320"');
      return `<div class="tk-slide" role="group" aria-roledescription="ticket" aria-label="Ticket ${i + 1} of ${n}" id="tkS${i}">
        ${stub}
        <div class="tk-slide-kv"><div><small>Name</small><b>${esc(holder(o, t))}</b></div><div><small>Ticket</small><b>${esc(t.tierName)} · ${i + 1} of ${n}</b></div></div>
        ${t.checkedIn ? `<span class="tk-slide-f ok">${IC.check} Scanned in${t.scannedAt ? ' at ' + N3.hhmm(t.scannedAt) : ''}</span>` : ''}
        ${t.sentTo ? `<span class="tk-slide-f">${IC.share} Sent to ${esc(t.sentTo.name)}${t.sentTo.phone ? ' · ' + esc(t.sentTo.phone) : ''}</span>` : ''}
      </div>`;
    }).join('');
    const dir = e.online ? '' : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e.venue.name + ', ' + (e.venue.address ? e.venue.address + ', ' : '') + e.venue.city);
    const line = p.dow + ' ' + p.dd + ' ' + p.mon + ' · ' + (e.online ? 'STARTS ' : 'DOORS ') + p.time + ' · ' + (e.online ? 'ONLINE' : areaOf(e).toUpperCase());
    return `<div class="n3-page n3-p-tickets tk-order ${o.cancelled ? 'is-x' : ''}" id="tkOrder">
      <div class="tk-o-top n3-night" data-grain><div class="n3-wrap">
        <div class="tk-o-bar"><a class="tk-o-close" href="#/tickets" aria-label="Back to my tickets">${IC.x}<span>My tickets</span></a>
          ${o.cancelled ? '' : `<button type="button" class="tk-bright" id="tkBright" aria-pressed="false">${IC.bright}<span>Brightness up</span></button>`}</div>
        <div class="tk-o-hd"><div>${status}<h1 class="tk-o-t">${esc(e.title)}</h1><span class="tk-o-l">${esc(line)}</span></div>
          <span class="tk-o-no">Order ${esc(o.id)}<br>${n} ticket${n > 1 ? 's' : ''}</span></div>
      </div></div>
      <div class="n3-wrap tk-o-grid">
        <section class="tk-o-main" aria-label="Your tickets">
          ${o.cancelled ? `<div class="tk-o-x">${IC.x}<div><b>This order was cancelled.</b><span>${o.total ? 'Your refund of ' + moneyPlain(o.total) + ' goes back to ' + esc(PAY[o.payment] || 'your payment method') + ' within 48 hours.' : 'Your spot was released.'} These codes won’t scan.</span></div></div>` : ''}
          <div class="tk-swipe" id="tkSwipe" tabindex="0" aria-label="Tickets — swipe or use arrow keys">${slides}</div>
          ${n > 1 ? `<div class="tk-nav"><button type="button" class="n3-iconbtn sm" id="tkPrev" aria-label="Previous ticket">${IC.back}</button>
            <div class="tk-dots" role="tablist" aria-label="Choose ticket">${o.tickets.map((t, i) => `<button type="button" role="tab" aria-label="Ticket ${i + 1}" aria-selected="${i === 0}" data-go-s="${i}"></button>`).join('')}</div>
            <span class="tk-count" id="tkCount" aria-live="polite">1 / ${n}</span>
            <button type="button" class="n3-iconbtn sm" id="tkNext" aria-label="Next ticket">${IC.next}</button></div>` : ''}
          ${o.cancelled ? '' : `<p class="tk-hint">${IC.bright}<span>Turn your brightness up at the door. ${ph ? `Scanner down? Say your number: <b>${esc(ph)}</b>` : 'Scanner down? Read out your ticket code.'}</span></p>`}
          <div class="tk-acts">
            <button type="button" class="tk-act" id="tkCal">${IC.date}<span>Add to calendar</span></button>
            <a class="tk-act wa" id="tkWa" href="${waLink(o, e, o.tickets[0])}" target="_blank" rel="noopener">${IC.wa}<span>Share on WhatsApp</span></a>
            ${dir ? `<a class="tk-act" href="${dir}" target="_blank" rel="noopener">${IC.pin}<span>Directions</span></a>` : `<button type="button" class="tk-act" id="tkJoin">${IC.phone}<span>How to join</span></button>`}
            ${!o.cancelled && !past ? `<button type="button" class="tk-act" id="tkTransfer">${IC.friends}<span>Transfer a ticket</span></button>` : `<a class="tk-act" href="#/event/${e.id}">${IC.arrow}<span>Event page</span></a>`}
          </div>
        </section>
        <aside class="tk-o-side">
          <div class="tk-rcpt">
            <span class="tk-sec">Order details</span>
            <dl class="tk-rc">
              ${o.items.map(i => `<div><dt>${i.qty} × ${esc(i.name)}</dt><dd>${i.price ? moneyPlain(i.price * i.qty) : 'Free'}</dd></div>`).join('')}
              ${o.discount ? `<div><dt>Promo${o.promo && o.promo.code ? ' ' + esc(o.promo.code) : ''}</dt><dd>− ${moneyPlain(o.discount)}</dd></div>` : ''}
              ${o.fees ? `<div><dt>Booking fee</dt><dd>${moneyPlain(o.fees)}</dd></div>` : ''}
              <div class="tot"><dt>Total</dt><dd>${o.total ? moneyPlain(o.total) : 'Free'}</dd></div>
            </dl>
            <dl class="tk-meta">
              <div><dt>Order</dt><dd>${esc(o.id)}</dd></div>
              <div><dt>Placed</dt><dd>${esc(dFmt(o.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }))} · ${N3.hhmm(o.createdAt)}</dd></div>
              <div><dt>Paid with</dt><dd>${esc(PAY[o.payment] || o.payment || '—')}</dd></div>
              ${o.buyer ? `<div><dt>Buyer</dt><dd>${esc(((o.buyer.first || '') + ' ' + (o.buyer.last || '')).trim() || '—')}${o.buyer.email ? '<br>' + esc(o.buyer.email) : ''}${ph ? '<br>' + esc(ph) : ''}</dd></div>` : ''}
              <div><dt>Where</dt><dd>${e.online ? 'Online — link by SMS before it starts' : esc(e.venue.name) + (e.venue.address ? '<br>' + esc(e.venue.address) : '') + '<br>' + esc(e.venue.city)}</dd></div>
            </dl>
            <div class="tk-refund" id="tkRefund">
              <span class="tk-sec">Refunds</span>
              <p class="tk-pol">${esc(r.policy)}</p>
              <p class="tk-why ${r.can ? 'ok' : ''}">${esc(r.why)}</p>
              ${r.can ? `<button type="button" class="n3-btn sec block tk-cancel" id="tkCancel">${r.free ? 'Cancel my spot' : 'Cancel order & refund'}</button>
                <div class="tk-confirm" id="tkConfirm" hidden role="alertdialog" aria-labelledby="tkCfH" aria-describedby="tkCfP">
                  <b id="tkCfH">Cancel ${n > 1 ? 'all ' + n + ' tickets' : 'this ticket'}?</b>
                  <p id="tkCfP">${r.free ? 'Your spot goes back to the pool. You can register again if there’s space.' : esc(moneyPlain(o.total)) + ' goes back to ' + esc(PAY[o.payment] || 'your payment method') + ' within 48 hours. Your QR codes stop working straight away.'}</p>
                  <div><button type="button" class="n3-btn sec sm" id="tkKeep">Keep my tickets</button><button type="button" class="n3-btn sm tk-danger" id="tkYes">Yes, cancel</button></div>
                </div>` : ''}
            </div>
            <a class="tk-org" href="#/organizer/${esc(e.organizerId)}"><small>Organised by</small><b>${esc(Store.organizer(e.organizerId).name)}</b>${IC.arrow}</a>
          </div>
        </aside>
      </div>
    </div>`;
  };

  V.orderMount = function (id) {
    mountSignin();
    const root = $('#tkOrder'); if (!root) return;
    const o = Store.myOrders().find(o => o.id === id); if (!o) return;
    const e = Store.getEvent(o.eventId);
    const sw = $('#tkSwipe'), n = o.tickets.length;
    let cur = 0;
    const setCur = i => {
      cur = Math.max(0, Math.min(n - 1, i));
      $$('[data-go-s]', root).forEach((d, k) => d.setAttribute('aria-selected', k === cur));
      const c = $('#tkCount'); if (c) c.textContent = (cur + 1) + ' / ' + n;
      const p = $('#tkPrev'), x = $('#tkNext'); if (p) p.disabled = cur === 0; if (x) x.disabled = cur === n - 1;
      const wa = $('#tkWa'); if (wa) wa.href = waLink(o, e, o.tickets[cur]);
    };
    const go = i => { const s = $('#tkS' + Math.max(0, Math.min(n - 1, i))); if (s) sw.scrollTo({ left: s.offsetLeft - sw.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); setCur(i); };
    if (n > 1) {
      $('#tkPrev').onclick = () => go(cur - 1);
      $('#tkNext').onclick = () => go(cur + 1);
      $$('[data-go-s]', root).forEach(d => d.onclick = () => go(+d.dataset.goS));
      let raf; sw.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setCur(Math.round(sw.scrollLeft / Math.max(1, sw.clientWidth)))); }, { passive: true });
      sw.addEventListener('keydown', ev => { if (ev.key === 'ArrowRight') { ev.preventDefault(); go(cur + 1); } if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(cur - 1); } });
      setCur(0);
    }

    /* brightness: max-contrast mode + keep the screen awake where supported */
    let lock = null;
    const br = $('#tkBright');
    if (br) br.onclick = async () => {
      const on = br.getAttribute('aria-pressed') !== 'true';
      br.setAttribute('aria-pressed', on); root.classList.toggle('is-bright', on);
      $('span', br).textContent = on ? 'Max contrast on' : 'Brightness up';
      if (on) {
        try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (x) { lock = null; }
        toast('Max contrast on. Turn your phone brightness all the way up too.');
        go(cur);
      } else { try { if (lock) lock.release(); } catch (x) {} lock = null; }
    };

    $('#tkCal').onclick = () => { UI.icsFor(e); toast('Calendar file downloaded — open it to add ' + e.title); };
    const j = $('#tkJoin'); if (j) j.onclick = () => toast('Your join link arrives by SMS and email 1 hour before it starts.');
    const tr = $('#tkTransfer'); if (tr) tr.onclick = () => transferSheet(o, cur);

    const c = $('#tkCancel'), cf = $('#tkConfirm');
    if (c && cf) {
      c.onclick = () => { cf.hidden = false; c.hidden = true; $('#tkKeep').focus(); };
      $('#tkKeep').onclick = () => { cf.hidden = true; c.hidden = false; c.focus(); };
      $('#tkYes').onclick = () => {
        Store.cancelOrder(o.id);
        toast(o.total ? 'Order cancelled. ' + moneyPlain(o.total) + ' is on its way back.' : 'Spot released. Thanks for letting someone else go.');
        App.render(); window.scrollTo(0, 0);
      };
    }
    const q = location.hash.split('?')[1] || '';
    if (/transfer=1/.test(q) && tr) transferSheet(o, 0);
    if (/refund=1/.test(q)) { const rf = $('#tkRefund'); if (rf) { rf.scrollIntoView({ block: 'center' }); rf.classList.add('flash'); if (c && !c.hidden) c.focus(); } }
  };

  function transferSheet(o, idx) {
    const e = Store.getEvent(o.eventId);
    const free = o.tickets.map((t, i) => ({ t, i })).filter(x => !x.t.sentTo && !x.t.checkedIn);
    if (!free.length) { toast('All tickets on this order have already been sent.'); return; }
    const start = free.find(x => x.i === idx) ? idx : free[0].i;
    sheet(`<h2 class="tk-sh-h">Send a ticket</h2>
      <p class="tk-sh-p">They get it by SMS and WhatsApp. Your copy stops working once it’s sent.</p>
      <form id="tkTrF" class="tk-trf" novalidate>
        ${free.length > 1 ? `<div class="n3-field"><label for="tkTrT">Which ticket</label><select class="n3-select" id="tkTrT" name="t">${free.map(x => `<option value="${x.i}" ${x.i === start ? 'selected' : ''}>Ticket ${x.i + 1} · ${esc(x.t.tierName)}</option>`).join('')}</select></div>` : `<input type="hidden" name="t" value="${free[0].i}">`}
        <div class="n3-field" id="tkTrNf"><label for="tkTrN">Their name</label><input class="n3-input" id="tkTrN" name="name" autocomplete="off" placeholder="Sheila Namuli" required><small class="n3-hint" id="tkTrNh">So the door team knows who to expect.</small></div>
        <div class="n3-field" id="tkTrPf"><label for="tkTrP">Their phone</label><div class="n3-input"><span class="pre">+256</span><input id="tkTrP" name="phone" type="tel" inputmode="numeric" placeholder="772 481 093" aria-describedby="tkTrPh"></div><small class="n3-hint" id="tkTrPh">Ugandan mobile number.</small></div>
        <div class="tk-sh-a"><button type="button" class="n3-btn sec" data-sheet-close>Cancel</button><button class="n3-btn">Send ticket</button></div>
      </form>`, m => {
      $('#tkTrF', m).onsubmit = ev => {
        ev.preventDefault();
        const d = Object.fromEntries(new FormData(ev.target));
        const name = (d.name || '').trim(), ph = N3.phone ? N3.phone.norm(d.phone) : (d.phone || '').replace(/\D/g, '');
        const nf = $('#tkTrNf', m), pf = $('#tkTrPf', m);
        nf.classList.toggle('bad', !name); $('#tkTrNh', m).textContent = name ? 'So the door team knows who to expect.' : 'Add their name.';
        const okP = N3.phone ? N3.phone.valid(ph) : ph.length === 9;
        pf.classList.toggle('bad', !okP); $('#tkTrPh', m).textContent = okP ? 'Ugandan mobile number.' : 'Enter a 9-digit number, like 772 481 093.';
        if (!name) return $('#tkTrN', m).focus();
        if (!okP) return $('#tkTrP', m).focus();
        const t = o.tickets[+d.t]; t.sentTo = { name, phone: '0' + (N3.phone ? N3.phone.pretty(ph) : ph), at: new Date().toISOString() };
        persist(o); closeSheet();
        toast('Ticket sent to ' + name.split(' ')[0] + ' for ' + e.title + '.');
        App.render();
      };
    });
  }

  /* ================= SAVED (likes) ================= */
  V.likes = function () {
    if (!Store.user()) return signedOut('Saved', 'Tap the bookmark on any event to save it. Sign in so your saved nights follow you to any phone.');
    const { up, past } = mine();
    const now = new Date();
    const liked = Store.likedEvents().sort((a, b) => new Date(a.start) - new Date(b.start));
    const soonL = liked.filter(e => new Date(e.end) >= now), gone = liked.filter(e => new Date(e.end) < now);
    return `<div class="n3-page n3-p-tickets tk-likes"><div class="n3-wrap tk-wrap">
      ${head('Saved', tabs('saved', up.length, past.length, liked.length))}
      <p class="tk-dek">${liked.length ? `${soonL.length} coming up. Book before they sell out — saved events aren’t held.` : ''}</p>
      <div id="tkLikes">
      ${soonL.length ? `<div class="tk-lgrid">${soonL.map(e => `<div class="tk-lcell" data-lcell="${e.id}">${N3.cardFeature(e, { w: 640, sizes: '(max-width: 700px) 100vw, 25vw' })}${N3.saveBtn(e, 'tk-lsave')}</div>`).join('')}</div>` : ''}
      ${gone.length ? `<div class="tk-recent"><span class="tk-sec">Already happened</span>${gone.map(e => `<div data-lcell="${e.id}">${N3.cardRow(e)}</div>`).join('')}</div>` : ''}
      ${!liked.length ? `<div class="n3-empty tk-empty">${IC.save}<h2>Nothing saved yet.</h2><p>Tap the bookmark on anything that catches your eye. It lands here.</p><div class="tk-empty-a"><a class="n3-btn" href="#/">See what’s on</a><a class="n3-link" href="#/search?date=today">Tonight</a></div></div>` : ''}
      </div>
    </div></div>`;
  };
  V.likesMount = function () {
    mountSignin();
    const box = $('#tkLikes'); if (!box) return;
    box.addEventListener('click', ev => {
      const b = ev.target.closest('[data-like]'); if (!b) return;
      const id = b.dataset.like;
      setTimeout(() => {
        if (Store.isLiked(id)) return;
        const cell = box.querySelector(`[data-lcell="${id}"]`);
        if (cell) { cell.classList.add('gone'); setTimeout(() => { App.render(); }, 260); }
      }, 0);
    });
  };

  /* ================= ACCOUNT ================= */
  const prefs = () => Object.assign({ remind: true, wa: true }, ls.get(PREF_KEY, {}));
  function followedOrgs() {
    const ids = new Set(Store.publicEvents().map(e => e.organizerId));
    return Array.from(ids).filter(id => Store.isFollowing(id)).map(id => Store.organizer(id));
  }
  V.account = function () {
    const u = Store.user();
    if (!u) return signedOut('Account', 'Your phone number is your account. Sign in to manage your profile, tickets and settings.');
    const { up, past } = mine();
    const saved = Store.likedEvents().length;
    const isPhone = /@phone\.nova$/.test(u.email);
    const email = isPhone ? (u.contactEmail || '') : u.email;
    const phone = userPhone(u).replace(/^0/, '');
    const pr = prefs(), orgs = followedOrgs(), lite = N3.lite ? N3.lite() : false;
    const sw = (id, label, sub, on) => `<label class="n3-switch tk-sw"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span aria-hidden="true"></span><em class="tk-sw-t"><b>${label}</b><small>${sub}</small></em></label>`;
    return `<div class="n3-page n3-p-tickets tk-acct"><div class="n3-wrap tk-wrap">
      <div class="tk-a-hd">
        <span class="tk-av" aria-hidden="true">${esc(UI.initials(u.name))}</span>
        <div><h1 class="tk-h1">Account</h1><p class="n3-dek">Hi, ${esc(u.name.split(' ')[0])}. Member since ${esc(dFmt(u.createdAt, { month: 'long', year: 'numeric' }))}.</p></div>
      </div>
      <div class="tk-a-grid">
        <div class="tk-a-main">
          <section class="tk-a-sec" aria-labelledby="tkPf">
            <h2 class="tk-a-h" id="tkPf">Profile</h2>
            <form id="tkProf" class="tk-form" novalidate>
              <div class="n3-field" id="tkNameF"><label for="tkName">Full name</label><input class="n3-input" id="tkName" name="name" autocomplete="name" value="${esc(u.name)}" required><small class="n3-hint" id="tkNameH">Shown on your tickets — bring ID with the same name.</small></div>
              <div class="n3-field" id="tkMailF"><label for="tkMail">Email</label><input class="n3-input" id="tkMail" name="email" type="email" autocomplete="email" value="${esc(email)}" placeholder="you@example.com" ${isPhone ? '' : 'required'}><small class="n3-hint" id="tkMailH">${isPhone ? 'Optional. For receipts.' : 'You sign in with this.'}</small></div>
              <div class="n3-field" id="tkPhF"><label for="tkPh">Phone</label><div class="n3-input"><span class="pre">+256</span><input id="tkPh" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" value="${esc(N3.phone ? N3.phone.pretty(phone) : phone)}" placeholder="772 481 093" ${isPhone ? 'readonly aria-readonly="true"' : ''} aria-describedby="tkPhH"></div><small class="n3-hint" id="tkPhH">${isPhone ? 'Your number is your account, so it can’t be changed here.' : 'Tickets and door codes go here by SMS.'}</small></div>
              <div class="tk-form-a"><button class="n3-btn" id="tkSave">Save changes</button><span class="tk-saved" id="tkSaved" role="status" aria-live="polite"></span></div>
            </form>
          </section>

          <section class="tk-a-sec" aria-labelledby="tkSt">
            <h2 class="tk-a-h" id="tkSt">Settings</h2>
            <div class="tk-sws">
              ${sw('tkLite', 'Low-data mode', 'Hides photos so pages load fast on slow or expensive data.', lite)}
              ${sw('tkRemind', 'Remind me the day before', 'An SMS with your ticket, doors time and directions.', pr.remind)}
              ${sw('tkWaP', 'WhatsApp updates', 'Line-up changes and new dates from organisers you follow.', pr.wa)}
            </div>
          </section>

          <section class="tk-a-sec" aria-labelledby="tkDz">
            <h2 class="tk-a-h" id="tkDz">Session</h2>
            <div class="tk-dz">
              <div class="tk-dz-r"><div><b>Log out</b><small>Your tickets stay saved to your account.</small></div><button type="button" class="n3-btn sec" id="tkOut">Log out</button></div>
              <div class="tk-dz-r"><div><b>Reset demo data</b><small>Clears every account, order and event made in this browser.</small></div><button type="button" class="n3-btn sec tk-danger-o" id="tkReset">Reset demo data</button></div>
              <div class="tk-confirm" id="tkResetC" hidden role="alertdialog" aria-labelledby="tkRcH" aria-describedby="tkRcP">
                <b id="tkRcH">Reset everything?</b>
                <p id="tkRcP">This signs you out and deletes accounts, orders, saved events and events you created in this browser. It can’t be undone.</p>
                <div><button type="button" class="n3-btn sec sm" id="tkResetNo">Keep my data</button><button type="button" class="n3-btn sm tk-danger" id="tkResetYes">Yes, reset</button></div>
              </div>
            </div>
          </section>
        </div>

        <aside class="tk-a-side">
          <div class="tk-a-card n3-night" data-grain>
            <a href="#/tickets" class="tk-a-link"><b>${up.length}</b><span>Upcoming ${up.length === 1 ? 'order' : 'orders'}</span>${IC.arrow}</a>
            <a href="#/tickets?tab=past" class="tk-a-link"><b>${past.length}</b><span>Past nights</span>${IC.arrow}</a>
            <a href="#/likes" class="tk-a-link"><b>${saved}</b><span>Saved events</span>${IC.arrow}</a>
          </div>
          <div class="tk-a-follow">
            <span class="tk-sec">Following · ${orgs.length}</span>
            ${orgs.length ? orgs.map(g => `<div class="tk-fo"><span class="tk-fo-av" aria-hidden="true">${esc(UI.initials(g.name))}</span><a href="#/organizer/${esc(g.id)}">${esc(g.name)}</a><button type="button" class="tk-pbtn" data-unfollow="${esc(g.id)}">Unfollow</button></div>`).join('')
              : `<p class="tk-fo-e">Follow organisers from their event pages and we’ll tell you when they announce something new.</p>`}
          </div>
          <a class="tk-a-host" href="#/manage"><small>Hosting?</small><b>Organiser dashboard</b>${IC.arrow}</a>
        </aside>
      </div>
    </div></div>`;
  };

  V.accountMount = function () {
    mountSignin();
    const f = $('#tkProf'); if (!f) return;
    const u = Store.user(), isPhone = /@phone\.nova$/.test(u.email);
    const setF = (id, ok, msg, hid) => { const el = $('#' + id); el.classList.toggle('bad', !ok); if (msg) $('#' + hid).textContent = msg; };
    f.onsubmit = ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const name = (d.name || '').trim(), email = (d.email || '').trim().toLowerCase();
      const okN = name.length >= 2, okE = isPhone ? (!email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      let ph = ''; let okP = true;
      if (!isPhone) { ph = N3.phone ? N3.phone.norm(d.phone) : (d.phone || '').replace(/\D/g, ''); okP = !ph || (N3.phone ? N3.phone.valid(ph) : ph.length === 9); }
      setF('tkNameF', okN, okN ? 'Shown on your tickets — bring ID with the same name.' : 'Add your name (at least 2 letters).', 'tkNameH');
      setF('tkMailF', okE, okE ? (isPhone ? 'Optional. For receipts.' : 'You sign in with this.') : 'That email doesn’t look right.', 'tkMailH');
      if (!isPhone) setF('tkPhF', okP, okP ? 'Tickets and door codes go here by SMS.' : 'Enter a 9-digit number, like 772 481 093.', 'tkPhH');
      if (!okN) return $('#tkName').focus();
      if (!okE) return $('#tkMail').focus();
      if (!okP) return $('#tkPh').focus();
      const patch = { name };
      if (isPhone) patch.contactEmail = email; else { patch.email = email; patch.phone = ph ? '0' + ph : ''; }
      Store.updateUser(patch);
      App.renderHeader();
      $('#tkSaved').textContent = '✓ Saved';
      setTimeout(() => { const s = $('#tkSaved'); if (s) s.textContent = ''; }, 2600);
      toast('Profile saved');
    };
    const lite = $('#tkLite'); lite.onchange = () => { N3.lite(lite.checked); toast(lite.checked ? 'Low-data mode on: photos hidden to save data' : 'Low-data mode off'); };
    const pref = (id, k, on, off) => { const el = $('#' + id); el.onchange = () => { const p = prefs(); p[k] = el.checked; ls.set(PREF_KEY, p); toast(el.checked ? on : off); }; };
    pref('tkRemind', 'remind', 'We’ll text you the day before each event', 'Day-before reminders off');
    pref('tkWaP', 'wa', 'WhatsApp updates on', 'WhatsApp updates off');
    $$('[data-unfollow]').forEach(b => b.onclick = () => { Store.toggleFollow(b.dataset.unfollow); toast('Unfollowed ' + Store.organizer(b.dataset.unfollow).name); App.render(); });
    $('#tkOut').onclick = () => { Store.logOut(); App.renderHeader(); toast('Signed out. See you after dark.'); location.hash = '#/'; };
    const rs = $('#tkReset'), rc = $('#tkResetC');
    rs.onclick = () => { rc.hidden = false; rs.disabled = true; $('#tkResetNo').focus(); };
    $('#tkResetNo').onclick = () => { rc.hidden = true; rs.disabled = false; rs.focus(); };
    $('#tkResetYes').onclick = () => Store.resetDemo();
  };
})();
