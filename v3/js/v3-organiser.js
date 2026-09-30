/* Nova v3 — organiser pages (owned by the organiser agent)
   Board: "Nova 06 Organiser.dc.html"
   Routes: #/create, #/edit/<id>            → V.createPage / V.createMount
           #/manage, #/manage/events        → V.manage / V.manageMount
           #/manage/<id>[/orders|checkin|payouts] → V.manageEvent / V.manageEventMount
           #/organizer/<id>                 → V.organizerPage / V.organizerMount
   All markup is scoped under .n3-p-org; component classes use the n3o- prefix. */
(function () {
  const V = window.Views;
  const { esc, moneyPlain, capacity, cat, photoUrl, dFmt, toast, openModal, closeModal, initials, compact } = UI;
  const IC = N3.IC;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  const DRAFT_KEY = 'nova.v3.org.draft', CI_KEY = 'nova.v3.org.ciAt';
  const DAY = 864e5;
  const two = N3.two;

  /* ---------- small helpers ---------- */
  const num = n => Math.round(n || 0).toLocaleString('en-US');
  const short = n => { n = Math.round(n || 0); if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M'; if (n >= 1e4) return Math.round(n / 1e3) + 'K'; return num(n); };
  const day0 = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const dshort = iso => dFmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });           // "Fri 2 Oct"
  const dmon = d => (new Date(d).getDate() + ' ' + dFmt(new Date(d).toISOString(), { month: 'short' })).toUpperCase(); // "2 OCT"
  const ago = iso => { const s = Math.max(0, (Date.now() - new Date(iso)) / 1000); if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) { const h = Math.floor(s / 3600); return h + (h === 1 ? ' hr' : ' hrs') + ' ago'; } if (s < 172800) return 'Yesterday'; return dshort(iso); };
  const PAY = { mtn: ['MTN', 'mtn', 'MoMo'], airtel: ['Airtel', 'airtel', 'Airtel Money'], card: ['Card', 'card', 'card'], bank: ['Bank', 'card', 'bank transfer'], free: ['Free', 'free', 'free RSVP'] };
  const payChip = p => { const m = PAY[p] || [p ? String(p) : '—', 'card', p || '']; return `<span class="n3o-pay ${m[1]}">${esc(m[0])}</span>`; };
  const buyerName = o => ((o.buyer && (o.buyer.first + ' ' + (o.buyer.last || ''))) || 'Guest').trim();
  const netOf = o => (o.subtotal || 0) - (o.discount || 0);
  const liveOrders = id => Store.ordersForEvent(id).filter(o => !o.cancelled);
  const soldOf = id => liveOrders(id).reduce((s, o) => s + o.tickets.length, 0);
  const myEvents = () => { const u = Store.user(); return u ? Store.allEvents().filter(e => e.organizerId === u.id).sort((a, b) => new Date(a.start) - new Date(b.start)) : []; };
  const nextEvent = list => list.find(e => new Date(e.end) > new Date() && e.status !== 'draft') || list.find(e => new Date(e.end) > new Date()) || list[list.length - 1];
  const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ciTimes = () => ls.get(CI_KEY, {});
  const setCiTime = (code, on) => { const m = ciTimes(); if (on) m[code] = new Date().toISOString(); else delete m[code]; ls.set(CI_KEY, m); };

  function copyText(text, msg) {
    const done = () => toast(msg || 'Link copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() { const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } t.remove(); done(); }
  }
  const eventUrl = e => location.href.split('#')[0] + '#/event/' + e.id;

  /* in-page confirm (never window.confirm) */
  function confirmBox(title, text, label, ok) {
    openModal(`<div class="n3-p-org n3o-confirm"><button type="button" class="modal-close" data-close aria-label="Close">${IC.x}</button>
      <h2>${esc(title)}</h2><p>${esc(text)}</p>
      <div class="modal-actions"><button type="button" class="n3-btn sec" data-close>Keep it</button><button type="button" class="n3-btn n3o-danger" id="n3oCfOk">${esc(label)}</button></div></div>`, { size: 'sm', noFocus: true });
    $('#n3oCfOk').onclick = () => { closeModal(); ok(); };
  }

  function signInPrompt(title, dek) {
    return `<div class="n3-page n3-p-org"><div class="n3-wrap n3o-gate">
      ${N3.label('For organisers')}
      <h1 class="n3-h2">${title}</h1>
      <p class="n3-dek">${dek}</p>
      <div class="n3o-gate-acts"><button type="button" class="n3-btn" data-org-signup>Create a free account</button><button type="button" class="n3-btn sec" data-org-login>I already have one</button></div>
      <ul class="n3o-gate-list"><li>${IC.check}Free events stay free to list</li><li>${IC.check}MTN MoMo, Airtel Money &amp; cards</li><li>${IC.check}Door scanner that works offline</li></ul>
    </div></div>`;
  }
  function wireGate() {
    const s = $('[data-org-signup]'); if (s) s.onclick = () => Auth.open('signup', () => App.render());
    const l = $('[data-org-login]'); if (l) l.onclick = () => Auth.open('login', () => App.render());
  }

  /* =====================================================================
     CREATE / EDIT EVENT
     ===================================================================== */
  const STEPS = [
    { k: 'basics', n: '01', t: 'Basics', h: 'The basics.' },
    { k: 'cover', n: '02', t: 'Cover photo', h: 'Cover photo.' },
    { k: 'when', n: '03', t: 'Date & venue', h: 'When &amp; where?' },
    { k: 'tickets', n: '04', t: 'Tickets', h: 'Tickets.' },
    { k: 'extras', n: '05', t: 'Agenda & FAQ', h: 'Agenda &amp; FAQ.' },
    { k: 'publish', n: '06', t: 'Publish', h: 'Ready?' }
  ];
  const AGES = ['All ages', '14+', '16+', '18+', '21+'];
  const REFUNDS = ['Refunds available up to 7 days before the event.', 'Refunds available up to 1 day before the event.', 'No refunds.'];
  const SUGGEST_FAQ = ['Is there a dress code?', 'Can I bring kids?', 'Is there parking?', 'Can I buy tickets at the door?'];
  let D = null, EDIT = null, STEP = 0, previewMode = 'card', savedAt = null, statusTimer = null;

  const pad = n => String(n).padStart(2, '0');
  const dateVal = iso => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const timeVal = iso => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  function blankEvent() {
    const start = new Date(); start.setDate(start.getDate() + 14); start.setHours(18, 0, 0, 0);
    return { title: '', summary: '', description: '', category: 'music', online: false, onlineUrl: '',
      venue: { name: '', address: '', city: 'Kampala', country: 'Uganda' }, gettingThere: '',
      start: start.toISOString(), end: new Date(start.getTime() + 5.5 * 3600000).toISOString(),
      tiers: [{ id: 't1', name: 'General', price: 0, qty: 100, sold: 0, desc: '' }],
      palette: 0, photo: Store.photos.mic, treatment: 'jac', ageLimit: 'All ages', refund: REFUNDS[0], tags: [], faq: [], agenda: [], promos: [] };
  }

  function venueList() {
    const m = new Map();
    Store.allEvents().forEach(e => { if (!e.venue || e.online || !e.venue.name) return; const k = e.venue.name.toLowerCase(); const v = m.get(k) || { v: e.venue, n: 0 }; v.n++; m.set(k, v); });
    return Array.from(m.values()).sort((a, b) => b.n - a.n);
  }

  /* ---- section markup ---- */
  const field = (name, label, input, hint, cls) => `<div class="n3-field ${cls || ''}" data-f="${name}">${label ? `<label for="f_${name}">${label}</label>` : ''}${input}<span class="n3-hint" id="h_${name}">${hint || ''}</span></div>`;

  function secBasics(d) {
    return `<div class="n3o-field-title">${field('title', 'Event name', `<input class="n3-input n3o-serif" id="f_title" name="title" maxlength="70" value="${esc(d.title)}" placeholder="Sunset Sessions: Afro-Jazz on the Rooftop" autocomplete="off" aria-describedby="h_title">`, '')}
        <div class="n3o-count"><span>Short and specific beats clever.</span><span id="titleCount">${d.title.length} / 70</span></div></div>
      ${field('summary', 'One-line hook', `<input class="n3-input" id="f_summary" name="summary" maxlength="160" value="${esc(d.summary)}" placeholder="Live Afro-jazz, city views and golden-hour cocktails." aria-describedby="h_summary">`, 'Shows under the title on cards and in WhatsApp shares.')}
      <div class="n3o-2">
        ${field('category', 'Category', `<select class="n3-select" id="f_category" name="category">${Store.categories.map(c => `<option value="${c.id}" ${d.category === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`)}
        ${field('ageLimit', 'Age', `<select class="n3-select" id="f_ageLimit" name="ageLimit">${AGES.map(a => `<option ${d.ageLimit === a ? 'selected' : ''}>${a}</option>`).join('')}</select>`)}
      </div>
      ${field('description', 'Description', `<textarea class="n3-input" id="f_description" name="description" rows="5" placeholder="Who's playing, what to expect, what's included. Leave a blank line between paragraphs.">${esc(d.description)}</textarea>`, 'Events with a description sell about twice as many tickets.')}
      ${field('tags', 'Tags', `<input class="n3-input" id="f_tags" name="tags" value="${esc((d.tags || []).join(', '))}" placeholder="jazz, rooftop, live music">`, 'Comma separated. Helps people find you in search.')}`;
  }

  function coverPh(d, w) {
    const duo = d.treatment === 'jac' ? 'duo-jac' : d.treatment === 'ember' ? 'duo-ember' : '';
    const src = d.image ? esc(d.image) : d.photo ? photoUrl(d.photo, w || 640) : '';
    return `<div class="n3-ph ${duo}">${src ? `<img src="${src}" alt="Cover photo preview">` : `<span class="n3-noimg">${esc(cat(d.category).name)}</span>`}</div>`;
  }
  function secCover(d) {
    const tr = [['', 'Original'], ['jac', 'Teal duotone'], ['ember', 'Ember duotone']];
    return `<div class="n3o-cover">
        <div class="n3o-cover-img" id="coverImg">${coverPh(d, 640)}</div>
        <div class="n3o-cover-side">
          <span class="n3o-sub" id="trLbl">Treatment</span>
          <div class="n3o-chips" role="group" aria-labelledby="trLbl">${tr.map(([k, t]) => `<button type="button" class="n3-chip" data-tr="${k}" aria-pressed="${(d.treatment || '') === k}">${t}</button>`).join('')}</div>
          <span class="n3-hint">We compress it to ~80 KB for Lite mode. 1600 × 2000 works best.</span>
          <div class="n3o-cover-acts"><label class="n3-link n3o-upl">Replace photo<input type="file" accept="image/*" id="imgUp" class="n3-sr"></label>${d.image ? '<button type="button" class="n3-link" id="imgRm">Use a library photo</button>' : ''}</div>
        </div>
      </div>
      <span class="n3o-sub" id="libLbl">Or pick from the library</span>
      <div class="n3o-lib" role="group" aria-labelledby="libLbl">${Object.entries(Store.photos).map(([k, id]) => `<button type="button" data-photo="${id}" aria-pressed="${!d.image && d.photo === id}" aria-label="Use photo: ${esc(k)}"><img src="${photoUrl(id, 160)}" alt="" loading="lazy"></button>`).join('')}</div>`;
  }

  function dateStrip(d) {
    const sel = day0(d.start), today = day0(new Date());
    let first = new Date(sel.getTime() - 2 * DAY); if (first < today) first = today;
    return Array.from({ length: 5 }, (_, i) => { const x = new Date(first.getTime() + i * DAY); const on = +x === +sel; return `<button type="button" data-day="${dateVal(x.toISOString())}" aria-pressed="${on}" aria-label="${dFmt(x.toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}"><span>${dFmt(x.toISOString(), { weekday: 'short' }).toUpperCase()}</span><b>${two(x.getDate())}</b></button>`; }).join('');
  }
  function secWhen(d) {
    const v = d.venue || { name: '', address: '', city: 'Kampala', country: 'Uganda' };
    return `<div class="n3o-strip" id="dayStrip" role="group" aria-label="Quick pick a date">${dateStrip(d)}</div>
      <div class="n3o-3">
        ${field('date', 'Date', `<input class="n3-input" type="date" id="f_date" name="date" value="${dateVal(d.start)}" min="${dateVal(new Date().toISOString())}">`, '', 'n3o-date')}
        ${field('doors', 'Doors', `<input class="n3-input n3o-time" type="time" id="f_doors" name="doors" value="${timeVal(d.start)}">`)}
        ${field('ends', 'Ends', `<input class="n3-input n3o-time" type="time" id="f_ends" name="ends" value="${timeVal(d.end)}">`, '')}
      </div>
      <div id="venueBox" ${d.online ? 'hidden' : ''}>
        <div class="n3-field n3o-venue" data-f="vname"><label for="f_vname">Venue</label>
          <div class="n3-input n3o-vin">${IC.pin}<input id="f_vname" name="vname" value="${esc(v.name)}" placeholder="Start typing: Skyline Rooftop, Kololo" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="vSug" aria-autocomplete="list"><span class="n3o-onmap" id="onMap" ${v.name ? '' : 'hidden'}>✓ On the map</span></div>
          <div class="n3o-sug" id="vSug" role="listbox" hidden></div>
          <span class="n3-hint" id="h_vname"></span></div>
        <div class="n3o-2">
          ${field('vaddr', 'Street / area', `<input class="n3-input" id="f_vaddr" name="vaddr" value="${esc(v.address || '')}" placeholder="Acacia Avenue, Kololo">`)}
          ${field('vcity', 'City', `<input class="n3-input" id="f_vcity" name="vcity" list="n3oCities" value="${esc(v.city || '')}"><datalist id="n3oCities">${Store.cities.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>`)}
        </div>
        ${field('getting', 'Getting there (shown to guests)', `<textarea class="n3-input n3o-short" id="f_getting" name="getting" rows="3" placeholder="Boda drop-off on Acacia Ave. Parking at the Kololo Courts, UGX 5,000.">${esc(d.gettingThere || '')}</textarea>`)}
      </div>
      <div id="onlineBox" ${d.online ? '' : 'hidden'}>
        ${field('onlineUrl', 'Joining link', `<input class="n3-input" type="url" id="f_onlineUrl" name="onlineUrl" value="${esc(d.onlineUrl || '')}" placeholder="https://meet.example.com/your-event">`, 'Only sent to people with a ticket, by SMS and email.')}
      </div>
      <label class="n3-check"><input type="checkbox" id="f_online" ${d.online ? 'checked' : ''}><span>It's online instead</span></label>`;
  }

  function tierRow(t, i, d) {
    const lock = t.sold > 0;
    return `<div class="n3o-tier" data-i="${i}">
      <label class="n3-sr" for="tn${i}">Ticket type ${i + 1} name</label><input class="n3-input" id="tn${i}" data-k="name" value="${esc(t.name)}" placeholder="General">
      <label class="n3-sr" for="tp${i}">Price in UGX</label><input class="n3-input" id="tp${i}" data-k="price" inputmode="numeric" value="${t.price ? num(t.price) : '0'}" placeholder="0 = free">
      <label class="n3-sr" for="tq${i}">Quantity</label><input class="n3-input" id="tq${i}" data-k="qty" inputmode="numeric" value="${t.qty}" placeholder="100">
      <button type="button" class="n3o-x" data-rmtier="${i}" ${d.tiers.length < 2 || lock ? 'disabled' : ''} aria-label="${lock ? 'Tickets already sold — cannot remove' : 'Remove ' + esc(t.name || 'ticket type')}" title="${lock ? t.sold + ' already sold' : 'Remove'}">${IC.x}</button>
    </div>`;
  }
  function payoutNote(d) {
    const paid = d.tiers.filter(t => t.price > 0);
    if (!paid.length) return 'Free events are free to list — no fees, ever. Guests get an SMS ticket just the same.';
    const t = paid.find(x => /general/i.test(x.name)) || paid[0];
    const fee = Store.feeFor(t.price, 1);
    return `You keep the full <b>${moneyPlain(t.price)}</b> per ${esc(t.name || 'ticket')} ticket — buyers pay Nova's 3.5% + UGX 1,000 (${moneyPlain(fee)}) at checkout. Payout to your Mobile Money the morning after.`;
  }
  function secTickets(d) {
    const p = d.promos && d.promos[0];
    return `<div class="n3o-tiers" id="tierList">
        <div class="n3o-tier head" aria-hidden="true"><span>TYPE</span><span>PRICE (UGX)</span><span>QUANTITY</span><span></span></div>
        ${d.tiers.map((t, i) => tierRow(t, i, d)).join('')}
      </div>
      <span class="n3-hint n3o-terr" id="h_tiers" role="alert"></span>
      <div class="n3o-adds"><button type="button" class="n3o-dash" data-add="custom">+ Add ticket type</button><button type="button" class="n3o-dash" data-add="rsvp">+ Free RSVP</button><button type="button" class="n3o-dash" data-add="group">+ Group of 4 deal</button></div>
      <p class="n3o-note" id="payNote">${payoutNote(d)}</p>
      <div class="n3o-2">
        ${field('refund', 'Refund policy', `<select class="n3-select" id="f_refund" name="refund">${REFUNDS.map(r => `<option ${d.refund === r ? 'selected' : ''}>${r}</option>`).join('')}</select>`)}
        <div class="n3-field n3o-promof" data-f="promo"><label for="f_promoCode">Promo code <small>(optional)</small></label>
          <div class="n3o-promo"><input class="n3-input" id="f_promoCode" name="promoCode" placeholder="EARLY20" value="${esc(p ? p.code : '')}" autocapitalize="characters"><label class="n3-sr" for="f_promoPct">Percent off</label><input class="n3-input" id="f_promoPct" name="promoPct" inputmode="numeric" placeholder="% off" value="${p ? p.pct : ''}"></div>
          <span class="n3-hint" id="h_promo"></span></div>
      </div>`;
  }

  function agendaSummary(d) { return d.agenda.length ? d.agenda.slice(0, 3).map(a => esc(a.time) + ' ' + esc(a.title)).join(' · ') : 'Add running order: doors, acts, last call.'; }
  function faqSummary(d) { return d.faq.length ? d.faq.slice(0, 2).map(f => '"' + esc(f.q) + '"').join(' · ') : 'Suggested: "Is there a dress code?" · "Can I bring kids?"'; }
  function secExtras(d) {
    return `<div class="n3o-2 n3o-xcards">
        <button type="button" class="n3o-xcard" data-x="agenda" aria-expanded="false" aria-controls="agendaEd"><b>Agenda · <span id="agN">${d.agenda.length}</span> item${d.agenda.length === 1 ? '' : 's'}</b><span id="agS">${agendaSummary(d)}</span></button>
        <button type="button" class="n3o-xcard" data-x="faq" aria-expanded="false" aria-controls="faqEd"><b>FAQ · <span id="fqN">${d.faq.length}</span> question${d.faq.length === 1 ? '' : 's'}</b><span id="fqS">${faqSummary(d)}</span></button>
      </div>
      <div class="n3o-xed" id="agendaEd" hidden><span class="n3o-sub">Agenda</span><div id="agRows"></div><button type="button" class="n3o-dash sm" id="agAdd">+ Add item</button></div>
      <div class="n3o-xed" id="faqEd" hidden><span class="n3o-sub">FAQ</span><div id="fqRows"></div>
        <div class="n3o-chips">${SUGGEST_FAQ.map(q => `<button type="button" class="n3-chip sm" data-sq="${esc(q)}">+ ${esc(q)}</button>`).join('')}</div>
        <button type="button" class="n3o-dash sm" id="fqAdd">+ Add question</button></div>`;
  }
  const agRow = (a, i) => `<div class="n3o-xrow ag" data-i="${i}"><label class="n3-sr" for="agT${i}">Time</label><input class="n3-input" id="agT${i}" data-k="time" value="${esc(a.time)}" placeholder="18:00"><label class="n3-sr" for="agL${i}">What happens</label><input class="n3-input" id="agL${i}" data-k="title" value="${esc(a.title)}" placeholder="Doors open"><button type="button" class="n3o-x" data-rm="${i}" aria-label="Remove agenda item">${IC.x}</button></div>`;
  const fqRow = (f, i) => `<div class="n3o-xrow fq" data-i="${i}"><label class="n3-sr" for="fqQ${i}">Question</label><input class="n3-input" id="fqQ${i}" data-k="q" value="${esc(f.q)}" placeholder="Question"><label class="n3-sr" for="fqA${i}">Answer</label><input class="n3-input" id="fqA${i}" data-k="a" value="${esc(f.a)}" placeholder="Answer"><button type="button" class="n3o-x" data-rm="${i}" aria-label="Remove question">${IC.x}</button></div>`;

  function secPublish() {
    return `<div class="n3o-ready" id="readyBox" aria-live="polite"></div>
      <div class="n3o-errs" id="evErr" role="alert" hidden></div>
      <div class="n3o-pubacts"><button type="submit" class="n3-btn lg" data-status="live">${EDIT && D.status !== 'draft' ? 'Save changes' : 'Publish event'}</button><button type="submit" class="n3-btn sec lg" data-status="draft">Save draft</button>${EDIT ? `<a class="n3-link" href="#/manage/${EDIT}">Cancel</a>` : ''}</div>`;
  }

  V.createPage = function (editId) {
    const u = Store.user();
    if (!u) return signInPrompt(editId ? 'Sign in to edit.' : 'Host your night.', 'Make a free organiser account to publish events, sell tickets on MoMo and run the door from your phone.');
    EDIT = editId || null;
    let e = editId ? Store.getEvent(editId) : null;
    if (editId && (!e || !Store.canEdit(e))) return V.notFound('You can only edit events you created.');
    let restored = false;
    if (!e) { const saved = ls.get(DRAFT_KEY, null); if (saved && saved.uid === u.id && saved.d) { e = saved.d; savedAt = saved.at; restored = true; } else savedAt = null; }
    else savedAt = null;
    D = JSON.parse(JSON.stringify(e || blankEvent()));
    D.agenda = D.agenda || []; D.faq = D.faq || []; D.tags = D.tags || []; D.promos = D.promos || [];
    if (D.treatment === undefined) D.treatment = D.image ? '' : (D.category === 'music' ? 'jac' : '');
    if (!D.venue && !D.online) D.venue = { name: '', address: '', city: 'Kampala', country: 'Uganda' };
    STEP = 0; previewMode = 'card';
    const bodies = { basics: secBasics, cover: secCover, when: secWhen, tickets: secTickets, extras: secExtras, publish: secPublish };
    return `<div class="n3-page n3-p-org n3o-create">
      <div class="n3o-bar" data-grain>
        <div class="n3o-bar-in">
          <span class="n3o-bar-l">${EDIT ? 'Editing · ' + esc(D.title) : 'For organisers'}</span>
          <span class="n3o-bar-s" id="saveState" aria-live="polite"></span>
          <button type="button" class="n3o-bar-b sec" data-save="draft">Save draft</button>
          <button type="button" class="n3o-bar-b" data-save="live">${EDIT && D.status !== 'draft' ? 'Save changes' : 'Publish'}</button>
        </div>
      </div>
      <div class="n3o-mtop">
        <a class="n3o-round" href="${EDIT ? '#/manage/' + EDIT : '#/manage'}" aria-label="Close editor">${IC.x}</a>
        <span class="n3o-mstep" id="mStep">${EDIT ? 'EDIT' : 'NEW EVENT'} · 1 OF 6</span>
        <button type="button" class="n3o-pill" id="mPrev">Preview</button>
      </div>
      <div class="n3o-prog" aria-hidden="true"><i id="mProg" style="width:${100 / 6}%"></i></div>
      ${restored ? `<div class="n3o-restore"><span>${IC.check} We kept your unsaved draft from ${esc(ago(savedAt))}.</span><button type="button" class="n3-link" id="startOver">Start over</button></div>` : ''}
      <form id="evForm" class="n3o-grid" novalidate>
        <nav class="n3o-steps" aria-label="Steps">${STEPS.map((s, i) => `<a href="#" data-step="${i}"><span class="n3o-sn">${s.n}</span>${esc(s.t)}</a>`).join('')}</nav>
        <div class="n3o-main">
          ${STEPS.map((s, i) => `<section class="n3o-sec" id="sec-${s.k}" data-sec="${i}" aria-labelledby="sl-${s.k}">
            <h2 class="n3o-mh">${s.h}</h2>
            <span class="n3o-sl" id="sl-${s.k}">${s.n} · ${esc(s.t).toUpperCase()}</span>
            ${bodies[s.k](D)}
          </section>`).join('')}
        </div>
        <aside class="n3o-aside" aria-label="Live preview">
          <div class="n3o-aside-in">
            <div class="n3o-ph-head"><span class="n3o-sl">Live preview</span><div class="n3-seg n3o-pseg" role="group" aria-label="Preview as">${[['card', 'Card'], ['page', 'Page'], ['wa', 'WhatsApp']].map(([k, t]) => `<button type="button" data-pv="${k}" aria-pressed="${k === 'card'}">${t}</button>`).join('')}</div></div>
            <div id="preview" class="n3o-preview"></div>
            <div class="n3o-ready" id="readyAside"></div>
          </div>
        </aside>
        <div class="n3o-mbar"><button type="button" class="n3-btn sec" id="mDraft">Save draft</button><button type="button" class="n3-btn" id="mNext">Next: cover photo</button></div>
      </form>
    </div>`;
  };

  function readForm() {
    const f = $('#evForm'); if (!f) return;
    const g = id => { const el = $('#' + id); return el ? el.value : ''; };
    D.title = g('f_title').trim(); D.summary = g('f_summary').trim(); D.category = g('f_category') || D.category; D.ageLimit = g('f_ageLimit');
    D.description = g('f_description').trim();
    D.tags = g('f_tags').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const date = g('f_date'), doors = g('f_doors') || '18:00', ends = g('f_ends');
    if (date) {
      const s = new Date(date + 'T' + doors);
      if (!isNaN(s)) {
        const span = new Date(D.end) - new Date(D.start);
        let en = ends ? new Date(date + 'T' + ends) : new Date(s.getTime() + (span > 0 ? span : 3 * 3600000));
        if (en <= s) en = new Date(en.getTime() + DAY);                   // past midnight
        if (span > DAY && ends && timeVal(D.end) === ends) en = new Date(s.getTime() + span); // keep multi-day spans on edit
        D.start = s.toISOString(); D.end = en.toISOString();
      }
    }
    D.online = !!($('#f_online') && $('#f_online').checked);
    if (!D.online) D.venue = { name: g('f_vname').trim(), address: g('f_vaddr').trim(), city: g('f_vcity').trim(), country: (D.venue && D.venue.country) || 'Uganda' };
    D.gettingThere = g('f_getting').trim(); D.onlineUrl = g('f_onlineUrl').trim();
    D.refund = g('f_refund') || D.refund;
    const pc = g('f_promoCode').trim().toUpperCase(), pp = parseInt(g('f_promoPct'), 10);
    D.promos = pc && pp ? [{ code: pc, pct: Math.min(100, Math.max(1, pp)) }] : [];
    D._promoHalf = !!(pc && !pp) || !!(!pc && pp);
    $$('.n3o-tier[data-i]').forEach(r => { const t = D.tiers[+r.dataset.i]; if (!t) return; $$('[data-k]', r).forEach(i => { const k = i.dataset.k; t[k] = k === 'name' ? i.value : Math.max(0, parseInt(String(i.value).replace(/[^\d]/g, ''), 10) || 0); }); });
    $$('#agRows .n3o-xrow').forEach(r => { const a = D.agenda[+r.dataset.i]; if (a) $$('[data-k]', r).forEach(i => a[i.dataset.k] = i.value); });
    $$('#fqRows .n3o-xrow').forEach(r => { const q = D.faq[+r.dataset.i]; if (q) $$('[data-k]', r).forEach(i => q[i.dataset.k] = i.value); });
  }
  const cleanAgenda = () => D.agenda.filter(a => (a.time || '').trim() || (a.title || '').trim()).map(a => ({ time: a.time.trim(), title: a.title.trim() }));
  const cleanFaq = () => D.faq.filter(f => (f.q || '').trim() && (f.a || '').trim()).map(f => ({ q: f.q.trim(), a: f.a.trim() }));

  /* validation: returns [{f, msg, step}] */
  function validate(status) {
    const errs = [];
    const add = (f, msg, step) => errs.push({ f, msg, step });
    if (!D.title) add('title', 'Give your event a name.', 0);
    if (status === 'draft') return errs;
    if (D.title && D.title.length < 4) add('title', 'A few more words — at least 4 characters.', 0);
    if (!D.summary) add('summary', 'Add a one-line hook for cards and shares.', 0);
    if (!D.image && !D.photo) add('cover', 'Pick or upload a cover photo.', 1);
    if (new Date(D.start) < new Date() && !EDIT) add('date', 'That date has passed — pick a future date.', 2);
    if (new Date(D.end) <= new Date(D.start)) add('ends', 'End time must be after doors.', 2);
    if (!D.online && !(D.venue && D.venue.name)) add('vname', 'Where is it? Add a venue.', 2);
    if (!D.online && !(D.venue && D.venue.city)) add('vcity', 'Add the city.', 2);
    if (D.online && D.onlineUrl && !/^https?:\/\/\S+\.\S+/.test(D.onlineUrl)) add('onlineUrl', 'That link doesn\'t look right — start with https://', 2);
    if (D.tiers.some(t => !t.name.trim())) add('tiers', 'Each ticket type needs a name.', 3);
    else if (D.tiers.some(t => t.qty < 1)) add('tiers', 'Each ticket type needs at least 1 ticket.', 3);
    else if (D.tiers.some(t => t.price > 0 && t.price < 1000)) add('tiers', 'Paid tickets start at UGX 1,000.', 3);
    else if (D.tiers.some(t => t.sold && t.qty < t.sold)) add('tiers', 'You can\'t go below tickets already sold.', 3);
    if (D._promoHalf) add('promo', 'Add both a code and a % off — or leave both empty.', 3);
    return errs;
  }
  function showErrors(errs) {
    $$('.n3o-create .n3-field.bad').forEach(f => { f.classList.remove('bad'); const h = $('.n3-hint', f); if (h && h.dataset.base !== undefined) h.innerHTML = h.dataset.base; $$('[aria-invalid]', f).forEach(i => i.removeAttribute('aria-invalid')); });
    $$('.n3o-tiers.bad').forEach(x => x.classList.remove('bad')); const th = $('#h_tiers'); if (th) th.textContent = '';
    const ci = $('#coverImg'); if (ci) ci.classList.remove('bad');
    errs.forEach(er => {
      if (er.f === 'tiers') { $('#tierList').classList.add('bad'); $('#h_tiers').textContent = er.msg; return; }
      if (er.f === 'cover') { ci.classList.add('bad'); return; }
      const fl = $(`.n3o-create [data-f="${er.f}"]`); if (!fl) return;
      fl.classList.add('bad'); const h = $('.n3-hint', fl); if (h) { if (h.dataset.base === undefined) h.dataset.base = h.innerHTML; h.textContent = er.msg; }
      $$('input,select,textarea', fl).forEach(i => i.setAttribute('aria-invalid', 'true'));
    });
    const box = $('#evErr');
    if (box) { box.hidden = !errs.length; box.innerHTML = errs.length ? `<b>${errs.length === 1 ? 'One thing' : errs.length + ' things'} before it goes live:</b><ul>${errs.map(er => `<li><button type="button" class="n3-link" data-goerr="${er.f}" data-gostep="${er.step}">${esc(er.msg)}</button></li>`).join('')}</ul>` : ''; }
  }
  function focusField(f, step) {
    if (isMobile()) goStep(step, true);
    const el = f === 'tiers' ? $('#tierList input') : f === 'cover' ? $('#coverImg') : f === 'promo' ? $('#f_promoCode') : $('#f_' + f);
    if (el) { el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' }); if (el.focus) setTimeout(() => el.focus({ preventScroll: true }), 250); }
  }

  const isMobile = () => innerWidth <= 900;
  function goStep(i, noScroll) {
    STEP = Math.max(0, Math.min(STEPS.length - 1, i));
    const root = $('.n3o-create'); if (!root) return;
    root.dataset.step = STEP;
    $$('.n3o-sec', root).forEach(s => s.classList.toggle('cur', +s.dataset.sec === STEP));
    $('#mStep').textContent = (EDIT ? 'EDIT' : 'NEW EVENT') + ' · ' + (STEP + 1) + ' OF 6';
    $('#mProg').style.width = ((STEP + 1) / 6 * 100) + '%';
    const nx = $('#mNext');
    nx.textContent = STEP === 5 ? (EDIT && D.status !== 'draft' ? 'Save changes' : 'Publish event') : 'Next: ' + STEPS[STEP + 1].t.toLowerCase();
    if (isMobile() && !noScroll) window.scrollTo(0, 0);
    markSteps();
  }
  function stepDone(i) {
    if (i === 0) return !!(D.title && D.summary);
    if (i === 1) return !!(D.image || D.photo);
    if (i === 2) return D.online ? true : !!(D.venue && D.venue.name && D.venue.city) && new Date(D.end) > new Date(D.start);
    if (i === 3) return D.tiers.length > 0 && D.tiers.every(t => t.name.trim() && t.qty > 0);
    if (i === 4) return cleanAgenda().length > 0 || cleanFaq().length > 0;
    return false;
  }
  function markSteps(active) {
    const act = active == null ? (isMobile() ? STEP : curDesktopSec()) : active;
    $$('.n3o-steps a').forEach(a => {
      const i = +a.dataset.step, done = stepDone(i) && i !== act;
      a.classList.toggle('done', done); a.toggleAttribute('aria-current', i === act); if (i === act) a.setAttribute('aria-current', 'step');
      $('.n3o-sn', a).textContent = done ? '✓' : STEPS[i].n;
    });
  }
  function curDesktopSec() {
    const secs = $$('.n3o-sec'); let cur = 0;
    const foc = document.activeElement && document.activeElement.closest && document.activeElement.closest('.n3o-sec');
    if (foc) return +foc.dataset.sec;
    secs.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = +s.dataset.sec; });
    return cur;
  }

  function previewEvent() {
    const u = Store.user();
    return Object.assign({}, D, { id: D.id || 'preview', title: D.title || 'Your event title', summary: D.summary || 'Your one-line hook goes here.', organizerId: u ? u.id : '', venue: D.online ? null : (D.venue && D.venue.name ? D.venue : { name: 'Venue TBC', address: '', city: (D.venue && D.venue.city) || 'Kampala', country: 'Uganda' }), tiers: D.tiers.length ? D.tiers.map(t => Object.assign({}, t, { sold: t.sold || 0, qty: Math.max(1, t.qty) })) : [{ id: 'x', name: 'General', price: 0, qty: 1, sold: 0 }] });
  }
  function renderPreview() {
    const pv = $('#preview'); if (!pv) return;
    const pe = previewEvent(); const p = N3.dateParts(pe.start);
    let html;
    if (previewMode === 'card') {
      html = N3.cardFeature(pe, { w: 480, sizes: '360px' }).replace(/^\s*<a class="n3-cf" href="[^"]*">/, '<div class="n3-cf">').replace(/<\/a>\s*$/, '</div>')
        .replace(/class="n3-ph[^"]*"/, `class="n3-ph ${pe.treatment ? 'duo-' + pe.treatment : ''}"`).replace(/data-reveal/g, '');
      html = `<div class="n3o-pcard">${html}</div>`;
    } else if (previewMode === 'page') {
      html = `<div class="n3o-ppage"><div class="n3o-ppage-img">${coverPh(pe, 480)}</div>
        <span class="n3-kicker"><span>${esc(N3.kicker(pe))}</span><span>${esc(pe.ageLimit || '')}</span></span>
        <h3>${esc(pe.title)}</h3><p class="n3o-ppage-dek">${esc(pe.summary)}</p>
        <dl><div><dt>${IC.date}</dt><dd>${p.dow} ${p.dd} ${p.mon} · ${p.time}–${N3.hhmm(pe.end)}</dd></div><div><dt>${IC.pin}</dt><dd>${esc(N3.where(pe))}</dd></div></dl>
        <ul class="n3o-ppage-t">${pe.tiers.map(t => `<li><span>${esc(t.name || 'Ticket')}</span><b>${esc(N3.money(t.price))}</b></li>`).join('')}</ul>
        ${cleanAgenda().length ? `<ol class="n3o-ppage-ag">${cleanAgenda().slice(0, 4).map(a => `<li><b>${esc(a.time)}</b>${esc(a.title)}</li>`).join('')}</ol>` : ''}</div>`;
    } else {
      html = `<div class="n3o-pwa"><div class="n3o-pwa-b"><div class="n3o-pwa-img">${coverPh(pe, 480)}</div>
        <p><b>${esc(pe.title)}</b><br>${p.dow} ${p.dd} ${p.mon} · ${p.time} · ${esc(pe.online ? 'Online' : pe.venue.name)}<br>${esc(pe.summary)}<br>🎟 ${esc(N3.priceFrom(pe))} · pay with MoMo<br><u>nova.ug/e/${esc((pe.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24))}</u></p>
        <span class="n3o-pwa-t">${N3.hhmm(new Date().toISOString())} ✓✓</span></div></div>`;
    }
    pv.innerHTML = html;
    const ready = readyHtml(); $('#readyAside').innerHTML = ready; const rb = $('#readyBox'); if (rb) rb.innerHTML = ready;
  }
  function readyHtml() {
    const basics = D.title && (D.image || D.photo) && D.start && (D.online || (D.venue && D.venue.name));
    const qty = D.tiers.reduce((s, t) => s + (t.qty || 0), 0);
    const items = [
      [basics, basics ? 'Name, photo, date, venue' : 'Add a name, photo, date and venue'],
      [D.tiers.length && D.tiers.every(t => t.name.trim() && t.qty > 0), `${D.tiers.length} ticket type${D.tiers.length === 1 ? '' : 's'} · ${num(qty)} tickets`],
      [!!D.summary, D.summary ? 'One-line hook' : 'Add a one-line hook'],
      [!!D.description, D.description ? 'Description' : 'Add a description (guests buy 2× more)'],
      [cleanAgenda().length > 0, cleanAgenda().length ? 'Agenda · ' + cleanAgenda().length + ' items' : 'Add an agenda (optional)']
    ];
    return `<b>Ready to publish?</b>${items.map(([ok, t]) => `<span class="${ok ? 'ok' : 'todo'}">${ok ? '✓' : '○'} ${esc(t)}</span>`).join('')}`;
  }
  function paintStatus() {
    const s = $('#saveState'); if (!s) { clearInterval(statusTimer); return; }
    if (EDIT) { s.textContent = s.dataset.dirty ? '● Unsaved changes' : (D.status === 'draft' ? 'Draft · only you can see it' : '✓ Live'); s.classList.toggle('dirty', !!s.dataset.dirty); return; }
    s.textContent = savedAt ? '✓ Draft saved ' + ago(savedAt).replace('just now', 'just now') : 'Autosaves as you type';
  }

  V.createMount = function (editId) {
    wireGate();
    const form = $('#evForm'); if (!form) return;
    const root = $('.n3o-create');
    let autosaveT;
    const changed = () => {
      readForm(); renderPreview(); markSteps();
      $('#titleCount').textContent = D.title.length + ' / 70';
      $('#payNote').innerHTML = payoutNote(D);
      if (EDIT) { $('#saveState').dataset.dirty = '1'; paintStatus(); }
      else { clearTimeout(autosaveT); autosaveT = setTimeout(() => { const u = Store.user(); if (!u) return; savedAt = new Date().toISOString(); ls.set(DRAFT_KEY, { uid: u.id, at: savedAt, d: Object.assign({}, D, { image: D.image && D.image.length < 400000 ? D.image : undefined }) }); paintStatus(); }, 600); }
    };
    const paintTiers = () => { $('#tierList').innerHTML = `<div class="n3o-tier head" aria-hidden="true"><span>TYPE</span><span>PRICE (UGX)</span><span>QUANTITY</span><span></span></div>` + D.tiers.map((t, i) => tierRow(t, i, D)).join(''); };
    const paintAg = () => { $('#agRows').innerHTML = D.agenda.map(agRow).join(''); $('#agN').textContent = cleanAgenda().length; $('#agS').innerHTML = agendaSummary({ agenda: cleanAgenda() }); };
    const paintFq = () => { $('#fqRows').innerHTML = D.faq.map(fqRow).join(''); $('#fqN').textContent = cleanFaq().length; $('#fqS').innerHTML = faqSummary({ faq: cleanFaq() }); };
    const paintCover = () => { $('#coverImg').innerHTML = coverPh(D, 640); $$('[data-photo]').forEach(b => b.setAttribute('aria-pressed', !D.image && b.dataset.photo === D.photo)); $$('[data-tr]').forEach(b => { const on = (D.treatment || '') === b.dataset.tr; b.setAttribute('aria-pressed', on);  }); };
    paintAg(); paintFq(); renderPreview(); goStep(0, true); paintStatus();
    clearInterval(statusTimer); statusTimer = setInterval(paintStatus, 5000);

    form.addEventListener('input', ev => {
      if (ev.target.matches('#agRows input')) { readForm(); $('#agN').textContent = cleanAgenda().length; $('#agS').innerHTML = agendaSummary({ agenda: cleanAgenda() }); }
      if (ev.target.matches('#fqRows input')) { readForm(); $('#fqN').textContent = cleanFaq().length; $('#fqS').innerHTML = faqSummary({ faq: cleanFaq() }); }
      const bad = ev.target.closest('.n3-field.bad'); if (bad) { bad.classList.remove('bad'); const h = $('.n3-hint', bad); if (h && h.dataset.base !== undefined) h.innerHTML = h.dataset.base; ev.target.removeAttribute('aria-invalid'); }
      changed();
    });
    form.addEventListener('change', ev => { if (ev.target.id === 'f_date') $('#dayStrip').innerHTML = (readForm(), dateStrip(D)); changed(); });
    /* price field: format with thousands separators on blur */
    form.addEventListener('focusout', ev => { if (ev.target.matches('[data-k="price"]')) { const v = parseInt(ev.target.value.replace(/[^\d]/g, ''), 10) || 0; ev.target.value = v ? num(v) : '0'; } });

    /* steps nav + mobile wizard */
    $('.n3o-steps').addEventListener('click', ev => { const a = ev.target.closest('[data-step]'); if (!a) return; ev.preventDefault(); const i = +a.dataset.step; if (isMobile()) goStep(i); else { const s = $('#sec-' + STEPS[i].k); s.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); markSteps(i); const f = $('input,select,textarea,button', s); if (f) setTimeout(() => f.focus({ preventScroll: true }), 350); } });
    const onScroll = () => { if (!document.body.contains(form)) { removeEventListener('scroll', onScroll); return; } if (!isMobile()) markSteps(); };
    addEventListener('scroll', onScroll, { passive: true });
    form.addEventListener('focusin', () => { if (!isMobile()) markSteps(); });
    $('#mNext').onclick = () => {
      readForm();
      if (STEP === 5) return submit('live');
      const errs = validate('live').filter(e => e.step === STEP);
      if (errs.length) { showErrors(errs); focusField(errs[0].f, errs[0].step); return; }
      showErrors([]); goStep(STEP + 1);
    };
    $('#mDraft').onclick = () => submit('draft');
    $('#mPrev').onclick = () => {
      readForm();
      openModal(`<div class="n3-p-org n3o-pmodal"><button type="button" class="modal-close" data-close aria-label="Close preview">${IC.x}</button><span class="n3o-sl">Live preview</span><div class="n3-seg n3o-pseg" role="group" aria-label="Preview as">${[['card', 'Card'], ['page', 'Page'], ['wa', 'WhatsApp']].map(([k, t]) => `<button type="button" data-pv="${k}" aria-pressed="${k === previewMode}">${t}</button>`).join('')}</div><div id="preview" class="n3o-preview"></div><div class="n3o-ready" id="readyAside"></div></div>`, { size: 'sm' });
      const orig = $('.n3o-aside #preview'); if (orig) orig.id = 'previewAside';
      const origR = $('.n3o-aside #readyAside'); if (origR) origR.id = 'readyAsideX';
      renderPreview();
      $$('.n3o-pmodal [data-pv]').forEach(b => b.onclick = () => { previewMode = b.dataset.pv; $$('.n3o-pmodal [data-pv]').forEach(x => x.setAttribute('aria-pressed', x === b)); renderPreview(); });
      const restore = () => { if (!$('.n3o-pmodal')) { const a = $('#previewAside'); if (a) a.id = 'preview'; const r = $('#readyAsideX'); if (r) r.id = 'readyAside'; renderPreview(); mo.disconnect(); } };
      const mo = new MutationObserver(restore); mo.observe($('#modalRoot'), { childList: true, subtree: true });
    };
    $$('.n3o-aside [data-pv]').forEach(b => b.onclick = () => { previewMode = b.dataset.pv; $$('.n3o-aside [data-pv]').forEach(x => x.setAttribute('aria-pressed', x === b)); renderPreview(); });
    $$('[data-save]', root).forEach(b => b.onclick = () => submit(b.dataset.save));
    const so = $('#startOver'); if (so) so.onclick = () => { ls.del(DRAFT_KEY); savedAt = null; App.render(); window.scrollTo(0, 0); };

    /* cover */
    $('.n3o-lib').addEventListener('click', ev => { const b = ev.target.closest('[data-photo]'); if (!b) return; D.photo = b.dataset.photo; delete D.image; const rm = $('#imgRm'); if (rm) rm.remove(); paintCover(); changed(); });
    $$('[data-tr]').forEach(b => b.onclick = () => { D.treatment = b.dataset.tr; paintCover(); changed(); });
    $('#imgUp').onchange = ev => {
      const file = ev.target.files[0]; if (!file) return;
      if (!/^image\//.test(file.type)) return toast('That isn\'t an image — try a JPG or PNG');
      if (file.size > 1.5 * 1024 * 1024) return toast('Image too large — max 1.5 MB');
      const r = new FileReader(); r.onload = () => { D.image = r.result; paintCover(); if (!$('#imgRm')) { $('.n3o-cover-acts').insertAdjacentHTML('beforeend', '<button type="button" class="n3-link" id="imgRm">Use a library photo</button>'); } changed(); toast('Photo added'); }; r.readAsDataURL(file);
    };
    $('.n3o-cover-acts').addEventListener('click', ev => { if (ev.target.id === 'imgRm') { delete D.image; ev.target.remove(); paintCover(); changed(); } });

    /* date strip, online toggle, venue suggestions */
    $('#dayStrip').addEventListener('click', ev => { const b = ev.target.closest('[data-day]'); if (!b) return; $('#f_date').value = b.dataset.day; readForm(); $('#dayStrip').innerHTML = dateStrip(D); changed(); const nb = $(`#dayStrip [data-day="${b.dataset.day}"]`); if (nb) nb.focus(); });
    $('#f_online').onchange = ev => { D.online = ev.target.checked; $('#venueBox').hidden = D.online; $('#onlineBox').hidden = !D.online; if (!D.online && !D.venue) D.venue = { name: '', address: '', city: 'Kampala', country: 'Uganda' }; changed(); };
    const vin = $('#f_vname'), sug = $('#vSug'), VENUES = venueList();
    const closeSug = () => { sug.hidden = true; vin.setAttribute('aria-expanded', 'false'); };
    const openSug = () => {
      const q = vin.value.trim().toLowerCase();
      const list = VENUES.filter(x => !q || (x.v.name + ' ' + (x.v.address || '') + ' ' + x.v.city).toLowerCase().includes(q)).slice(0, 4);
      if (!list.length || (list.length === 1 && list[0].v.name.toLowerCase() === q)) return closeSug();
      sug.innerHTML = list.map((x, i) => `<button type="button" role="option" id="vs${i}" data-vi="${VENUES.indexOf(x)}"><b>${esc(x.v.name)}</b><span>${esc([x.v.address, x.v.city].filter(Boolean).join(', '))} · used by ${x.n} event${x.n === 1 ? '' : 's'}</span></button>`).join('');
      sug.hidden = false; vin.setAttribute('aria-expanded', 'true');
    };
    vin.addEventListener('input', () => { $('#onMap').hidden = !vin.value.trim(); openSug(); });
    vin.addEventListener('focus', openSug);
    vin.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSug(); if (ev.key === 'ArrowDown' && !sug.hidden) { ev.preventDefault(); const f = $('button', sug); if (f) f.focus(); } });
    sug.addEventListener('keydown', ev => { const bs = $$('button', sug), i = bs.indexOf(document.activeElement); if (ev.key === 'ArrowDown') { ev.preventDefault(); (bs[i + 1] || bs[0]).focus(); } if (ev.key === 'ArrowUp') { ev.preventDefault(); i <= 0 ? vin.focus() : bs[i - 1].focus(); } if (ev.key === 'Escape') { closeSug(); vin.focus(); } });
    sug.addEventListener('click', ev => { const b = ev.target.closest('[data-vi]'); if (!b) return; const v = VENUES[+b.dataset.vi].v; vin.value = v.name; $('#f_vaddr').value = v.address || ''; $('#f_vcity').value = v.city || ''; $('#onMap').hidden = false; closeSug(); changed(); vin.focus(); });
    document.addEventListener('click', function off(ev) { if (!document.body.contains(sug)) return document.removeEventListener('click', off); if (!ev.target.closest('.n3o-venue')) closeSug(); });

    /* tickets */
    $('.n3o-adds').addEventListener('click', ev => {
      const b = ev.target.closest('[data-add]'); if (!b) return; readForm();
      const k = b.dataset.add, id = 't' + Date.now().toString(36);
      const paid = D.tiers.filter(t => t.price > 0).map(t => t.price);
      if (k === 'custom') D.tiers.push({ id, name: '', price: paid.length ? Math.min(...paid) : 0, qty: 50, sold: 0, desc: '' });
      if (k === 'rsvp') D.tiers.push({ id, name: 'Free RSVP', price: 0, qty: 100, sold: 0, desc: 'Free entry — register to get your SMS ticket' });
      if (k === 'group') { const base = paid.length ? Math.min(...paid) : 20000; D.tiers.push({ id, name: 'Group of 4', price: Math.round(base * 4 * 0.85 / 1000) * 1000, qty: 20, sold: 0, desc: 'Admits four friends — save 15%' }); }
      paintTiers(); changed();
      const last = $$('.n3o-tier[data-i]').pop(); if (last) $('input', last).focus();
    });
    $('#tierList').addEventListener('click', ev => { const b = ev.target.closest('[data-rmtier]'); if (!b || b.disabled) return; readForm(); D.tiers.splice(+b.dataset.rmtier, 1); paintTiers(); changed(); const f = $('#tierList [data-i] input'); if (f) f.focus(); });

    /* agenda + faq */
    $$('[data-x]').forEach(b => b.onclick = () => {
      const ed = $('#' + b.getAttribute('aria-controls')), open = ed.hidden;
      ed.hidden = !open; b.setAttribute('aria-expanded', open);
      if (open) { const list = b.dataset.x === 'agenda' ? D.agenda : D.faq; if (!list.length) { list.push(b.dataset.x === 'agenda' ? { time: timeVal(D.start), title: 'Doors open' } : { q: '', a: '' }); b.dataset.x === 'agenda' ? paintAg() : paintFq(); } const f = $('input', ed); if (f) f.focus(); }
    });
    $('#agAdd').onclick = () => { readForm(); D.agenda.push({ time: '', title: '' }); paintAg(); $$('#agRows input').slice(-2)[0].focus(); changed(); };
    $('#fqAdd').onclick = () => { readForm(); D.faq.push({ q: '', a: '' }); paintFq(); $$('#fqRows input').slice(-2)[0].focus(); changed(); };
    $('#agRows').addEventListener('click', ev => { const b = ev.target.closest('[data-rm]'); if (!b) return; readForm(); D.agenda.splice(+b.dataset.rm, 1); paintAg(); changed(); });
    $('#fqRows').addEventListener('click', ev => { const b = ev.target.closest('[data-rm]'); if (!b) return; readForm(); D.faq.splice(+b.dataset.rm, 1); paintFq(); changed(); });
    $$('[data-sq]').forEach(b => b.onclick = () => { readForm(); if (D.faq.some(f => f.q === b.dataset.sq)) return toast('Already added'); const empty = D.faq.find(f => !f.q.trim()); if (empty) empty.q = b.dataset.sq; else D.faq.push({ q: b.dataset.sq, a: '' }); paintFq(); const r = $$('#fqRows .n3o-xrow').find(r => $('[data-k="q"]', r).value === b.dataset.sq); if (r) $('[data-k="a"]', r).focus(); changed(); });

    $('#evErr').addEventListener('click', ev => { const b = ev.target.closest('[data-goerr]'); if (b) focusField(b.dataset.goerr, +b.dataset.gostep); });

    let submitter = 'live';
    $$('[type=submit]', form).forEach(b => b.addEventListener('click', () => { submitter = b.dataset.status; }));
    form.onsubmit = ev => { ev.preventDefault(); submit(submitter); };

    function submit(status) {
      readForm();
      const errs = validate(status);
      showErrors(errs);
      if (errs.length) { toast(errs.length === 1 ? errs[0].msg : errs.length + ' things to fix before publishing'); focusField(errs[0].f, errs[0].step); return; }
      const u = Store.user(); if (!u) return Auth.open('login', () => submit(status));
      const ords = id => Store.ordersForEvent(id).filter(o => !o.cancelled).flatMap(o => o.items);
      const out = Object.assign({}, D, { id: D.id || Store.newEventId(), organizerId: u.id, status, views: D.views || 0, createdAt: D.createdAt || new Date().toISOString(), agenda: cleanAgenda(), faq: cleanFaq() });
      delete out._promoHalf;
      if (out.online) out.venue = null;
      /* stored tiers hold the seeded "sold" base; Store adds order deltas back on read */
      out.tiers = out.tiers.map(t => { const x = Object.assign({}, t, { name: t.name.trim() }); const fromOrders = EDIT ? ords(EDIT).filter(i => i.tierId === t.id).reduce((s, i) => s + i.qty, 0) : 0; x.sold = Math.max(0, (t.sold || 0) - fromOrders); return x; });
      if (!u.orgName) Store.updateUser({ orgName: u.name });
      Store.saveEvent(out);
      if (!EDIT) ls.del(DRAFT_KEY);
      clearInterval(statusTimer);
      toast(status === 'draft' ? 'Draft saved — only you can see it' : (EDIT ? 'Changes saved' : 'You\'re live. Share the link!'));
      location.hash = status === 'draft' ? '#/manage/' + out.id : '#/event/' + out.id;
    }
  };

  /* =====================================================================
     DASHBOARD SHELL
     ===================================================================== */
  function shell(u, active, e, inner, extraCls) {
    const evs = myEvents(), id = e ? e.id : '';
    const base = id ? '#/manage/' + id : '#/manage';
    const org = Store.organizer(u.id);
    const followers = (org.followers || 0) + 0;
    const link = (k, href, t) => `<a href="${href}" ${active === k ? 'aria-current="page"' : ''}>${t}</a>`;
    return `<div class="n3-page n3-p-org n3o-dash ${extraCls || ''}">
      <aside class="n3o-side n3-night" data-grain>
        <div class="n3o-side-brand">${N3.wordmark(true)}<span class="n3o-side-org">${esc((u.orgName || u.name).toUpperCase())}</span></div>
        <nav class="n3o-side-nav" aria-label="Organiser">
          ${link('overview', base, 'Overview')}
          ${link('events', '#/manage/events', 'Events · ' + evs.length)}
          ${id ? link('orders', base + '/orders', 'Orders') : ''}
          ${id ? link('checkin', base + '/checkin', 'Check-in') : ''}
          ${id ? link('payouts', base + '/payouts', 'Payouts') : ''}
          ${link('followers', '#/organizer/' + u.id, 'Followers · ' + num(followers))}
          ${link('settings', '#/account', 'Settings')}
        </nav>
        <a class="n3o-side-new" href="#/create">${IC.plus} Create event</a>
      </aside>
      <div class="n3o-dmain">${inner}</div>
    </div>`;
  }
  function eventPicker(e, sub) {
    const evs = myEvents(); if (!evs.length) return '';
    return `<label class="n3o-pick"><span class="n3-sr">Switch event</span><select id="evPick" data-sub="${sub || ''}">${evs.map(x => `<option value="${x.id}" ${e && x.id === e.id ? 'selected' : ''}>${esc(x.title.length > 34 ? x.title.slice(0, 32) + '…' : x.title)} · ${dshort(x.start)}${x.status === 'draft' ? ' (draft)' : ''}</option>`).join('')}</select>${IC.chev}</label>`;
  }
  function countdown(e) {
    const now = new Date(), s = new Date(e.start), en = new Date(e.end);
    if (en < now) return 'That\'s a wrap.';
    if (s <= now) return 'On right now.';
    const d = Math.round((day0(s) - day0(now)) / DAY);
    if (d === 0) return 'Tonight.'; if (d === 1) return 'Tomorrow.';
    return d + ' days to go.';
  }

  /* ---- chart: tickets per day from real orders ---- */
  function salesSeries(e, range) {
    const os = liveOrders(e.id);
    const today = day0(new Date());
    let n = range === '7' ? 7 : range === '30' ? 30 : 0;
    if (!n) { const first = os.reduce((m, o) => Math.min(m, +day0(o.createdAt)), +day0(e.createdAt || today)); n = Math.min(90, Math.max(7, Math.round((today - first) / DAY) + 1)); }
    const days = Array.from({ length: n }, (_, i) => new Date(today.getTime() - (n - 1 - i) * DAY));
    const t = days.map(d => os.filter(o => +day0(o.createdAt) === +d).reduce((s, o) => s + o.tickets.length, 0));
    const m = days.map(d => os.filter(o => +day0(o.createdAt) === +d).reduce((s, o) => s + netOf(o), 0));
    return { days, t, m };
  }
  function chartSvg(sr, compactMode) {
    const n = sr.days.length, max = Math.max(1, ...sr.t), peak = sr.t.indexOf(Math.max(...sr.t));
    const W = n * 10, H = 100, bw = compactMode ? 8 : 7;
    const bars = sr.t.map((v, i) => {
      const h = v ? Math.max(2, v / max * 96) : 0.8;
      const c = !v ? 'var(--rule)' : i === peak && max > 0 && sr.t[peak] > 0 ? 'var(--ember)' : i >= n - 3 ? 'var(--jac)' : 'var(--ink)';
      return `<rect x="${i * 10 + (10 - bw) / 2}" y="${H - h}" width="${bw}" height="${h}" fill="${c}"><title>${dshort(sr.days[i].toISOString())}: ${v} ticket${v === 1 ? '' : 's'}${sr.m[i] ? ' · ' + moneyPlain(sr.m[i]) : ''}</title></rect>`;
    }).join('');
    const grid = compactMode ? '' : [25, 50, 75].map(p => `<line x1="0" x2="${W}" y1="${p}" y2="${p}" stroke="var(--rule)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`).join('');
    const total = sr.t.reduce((a, b) => a + b, 0);
    return `<svg class="n3o-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Tickets sold per day, last ${n} days: ${total} in total${total ? ', peak ' + sr.t[peak] + ' on ' + dshort(sr.days[peak].toISOString()) : ''}">${grid}${bars}</svg>`;
  }
  function axis(sr) {
    const n = sr.days.length, idx = [0, Math.round((n - 1) / 3), Math.round(2 * (n - 1) / 3), n - 1];
    return `<div class="n3o-axis" aria-hidden="true">${idx.map(i => `<span>${dmon(sr.days[i])}</span>`).join('')}</div>`;
  }

  function ordersTable(os, limit) {
    const list = os.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit || 999);
    if (!list.length) return `<div class="n3o-none"><b>No orders yet.</b><span>Share your link on WhatsApp — most tickets sell in the 48 hours after a share.</span></div>`;
    return `<table class="n3o-table"><thead><tr><th scope="col">Order</th><th scope="col">Name</th><th scope="col">Tickets</th><th scope="col">Paid with</th><th scope="col" class="r">Amount</th><th scope="col">When</th><th scope="col">Status</th></tr></thead>
      <tbody>${list.map(o => { const qs = o.items.map(i => i.qty + ' × ' + esc(i.name)).join(', '); const ci = o.tickets.filter(t => t.checkedIn).length;
        return `<tr data-s="${esc((o.id + ' ' + buyerName(o) + ' ' + (o.buyer.email || '') + ' ' + (o.buyer.phone || '')).toLowerCase())}">
        <td data-l="Order"><b>${esc(o.id)}</b></td><td data-l="Name"><b>${esc(buyerName(o))}</b><small>${esc(o.buyer.phone || o.buyer.email || '')}</small></td><td data-l="Tickets">${qs}</td><td data-l="Paid with">${payChip(o.payment)}</td>
        <td data-l="Amount" class="r"><b>${netOf(o) ? num(netOf(o)) : 'Free'}</b></td><td data-l="When" class="m">${esc(ago(o.createdAt))}</td>
        <td data-l="Status" class="st ${o.cancelled ? 'ref' : 'ok'}">${o.cancelled ? 'Refunded' : 'Paid' + (ci ? ` · ${ci}/${o.tickets.length} in` : '')}</td></tr>`; }).join('')}</tbody></table>`;
  }
  function exportCsv(e) {
    const rows = [['Order', 'First name', 'Last name', 'Email', 'Phone', 'Tickets', 'Ticket codes', 'Checked in', 'Net (UGX)', 'Total paid (UGX)', 'Payment', 'Date', 'Status']].concat(
      Store.ordersForEvent(e.id).map(o => [o.id, o.buyer.first, o.buyer.last, o.buyer.email, o.buyer.phone, o.items.map(i => i.qty + 'x ' + i.name).join('; '), o.tickets.map(t => t.code).join(' '), o.tickets.filter(t => t.checkedIn).length + '/' + o.tickets.length, netOf(o), o.total, o.payment, o.createdAt, o.cancelled ? 'Refunded' : 'Paid']));
    const body = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
    a.download = 'nova-orders-' + (e.title || e.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('CSV downloaded · ' + Store.ordersForEvent(e.id).length + ' orders');
  }
  function payoutInfo(e, u) {
    const net = liveOrders(e.id).reduce((s, o) => s + netOf(o), 0);
    const d = new Date(e.end); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    const to = u.phone ? (/^(\+?256)?0?7[01]/.test(u.phone.replace(/\s/g, '')) ? 'Airtel ' : 'MTN ') + u.phone : 'your Mobile Money';
    return { net, when: d, to, paid: d < new Date() };
  }

  /* ---- overview ---- */
  let RANGE = '30';
  function overview(u, e) {
    const os = liveOrders(e.id), all = Store.ordersForEvent(e.id);
    const sold = os.reduce((s, o) => s + o.tickets.length, 0), cap = capacity(e);
    const soldAll = e.tiers.reduce((s, t) => s + t.sold, 0);
    const net = os.reduce((s, o) => s + netOf(o), 0);
    const week = os.filter(o => Date.now() - new Date(o.createdAt) < 7 * DAY).reduce((s, o) => s + netOf(o), 0);
    const views = e.views || 0, conv = views ? (os.length / views * 100) : 0;
    const checked = os.reduce((s, o) => s + o.tickets.filter(t => t.checkedIn).length, 0);
    const sr = salesSeries(e, RANGE), pk = sr.t.indexOf(Math.max(...sr.t));
    const p = N3.dateParts(e.start), pay = payoutInfo(e, u);
    const latest = os.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const draft = e.status === 'draft';
    return `
      <div class="n3o-head">
        <div>${eventPicker(e, '')}<h1 class="n3o-h1">${esc(countdown(e))}</h1>
          <p class="n3o-evline">${draft ? '<span class="n3-badge sold">Draft</span>' : ''}<a href="#/event/${e.id}">${esc(e.title)}</a> · ${p.dow} ${p.dd} ${p.mon}, ${p.time} · ${esc(N3.where(e))}</p></div>
        <div class="n3o-head-r">
          <div class="n3-seg n3o-range" role="group" aria-label="Chart range">${[['7', '7 days'], ['30', '30 days'], ['all', 'All']].map(([k, t]) => `<button type="button" data-range="${k}" aria-pressed="${RANGE === k}">${t}</button>`).join('')}</div>
          <button type="button" class="n3o-obtn" id="shareLink">${IC.share}Share link</button>
        </div>
      </div>
      <div class="n3o-acts">${draft ? '<button type="button" class="n3-btn sm" id="pubBtn">Publish now</button>' : ''}
        <a class="n3o-act" href="#/event/${e.id}">View page</a><a class="n3o-act" href="#/edit/${e.id}">${IC.edit}Edit</a><button type="button" class="n3o-act" id="dupBtn">Duplicate</button>
        ${draft ? '' : '<button type="button" class="n3o-act" id="unpubBtn">Unpublish</button>'}<button type="button" class="n3o-act danger" id="delBtn">Delete</button></div>
      <div class="n3o-kpis">
        <div><span class="n3o-k">Sales</span><b class="n3o-kv">${short(net)}</b><small class="${week ? 'up' : ''}">${week ? '▲ ' + moneyPlain(week).replace('UGX ', 'UGX ') + ' this week' : 'UGX · after discounts'}</small></div>
        <div><span class="n3o-k">Tickets sold</span><b class="n3o-kv">${num(soldAll)}<span>/${num(cap)}</span></b><i class="n3o-meter" role="meter" aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${soldAll}" aria-label="Sold"><i style="width:${Math.min(100, soldAll / cap * 100)}%"></i></i>${soldAll !== sold ? `<small>${num(sold)} on Nova</small>` : ''}</div>
        <div><span class="n3o-k">Page views</span><b class="n3o-kv">${num(views)}</b><small>since you published</small></div>
        <div><span class="n3o-k">Conversion</span><b class="n3o-kv">${views ? conv.toFixed(1) + '%' : '—'}</b><small class="${conv >= 3 ? 'up' : ''}">${views ? (conv >= 3 ? 'Above the Nova average' : 'orders per page view') : 'no views yet'}</small></div>
      </div>
      <div class="n3o-mid">
        <div class="n3o-chartbox">
          <div class="n3o-chart-h"><h2>Daily sales · tickets</h2><span>${sr.t[pk] ? 'Peak: ' + dshort(sr.days[pk].toISOString()) + ' · ' + sr.t[pk] + ' ticket' + (sr.t[pk] === 1 ? '' : 's') : 'No sales in this range yet'}</span></div>
          ${chartSvg(sr)}${axis(sr)}
        </div>
        <div class="n3o-midr">
          <div class="n3o-ci n3-night" data-grain><span class="n3o-k">Check-in</span><b>${checked} / ${sold}</b>
            <p>Doors open ${p.dow.charAt(0) + p.dow.slice(1).toLowerCase()} ${p.time}. Add your door team — any phone works, even offline.</p>
            <a class="n3-btn block" href="#/manage/${e.id}/checkin">Open scanner</a><button type="button" class="n3o-invite" id="inviteBtn">+ Invite door staff</button></div>
          <div class="n3o-pay-box"><span class="n3o-k">${pay.paid ? 'Paid out' : 'Next payout'}</span><b>${moneyPlain(pay.net)}</b><small>${dFmt(pay.when.toISOString(), { weekday: 'short', day: 'numeric', month: 'short' })}, 09:00 → ${esc(pay.to)}</small></div>
        </div>
      </div>
      <div class="n3o-orders ov">
        <div class="n3o-orders-h"><h2>Latest orders</h2><div class="n3o-orders-tools"><label class="n3-input n3o-search">${IC.search}<span class="n3-sr">Search orders</span><input id="ordQ" type="search" placeholder="Name, phone or order no."></label><button type="button" class="n3-btn ink sm n3o-csv" data-csv>Export CSV</button></div></div>
        ${ordersTable(all, 8)}
        ${all.length > 8 ? `<a class="n3-link" href="#/manage/${e.id}/orders">All ${all.length} orders ${IC.arrow}</a>` : ''}
      </div>
      <div class="n3o-latest"><span class="n3o-k">Latest</span>${latest.slice(0, 4).map(o => `<div><span><b>${esc(o.buyer.first + ' ' + (o.buyer.last || '').charAt(0) + '.')}</b> · ${o.items.map(i => i.qty + ' ' + esc(i.name)).join(', ')}</span>${payChip(o.payment)}</div>`).join('') || '<p>No orders yet — share your link.</p>'}${all.length ? `<a class="n3-link" href="#/manage/${e.id}/orders">All orders ${IC.arrow}</a>` : ''}</div>
      <div class="n3o-mfoot"><button type="button" class="n3-btn sec" data-csv>Export CSV</button><a class="n3-btn" href="#/manage/${e.id}/checkin">Scan tickets</a></div>`;
  }

  function emptyDash(u) {
    return `<div class="n3o-head"><div>${N3.label('Organiser dashboard')}<h1 class="n3o-h1">Nothing on yet.</h1><p class="n3-dek">Hi ${esc(u.name.split(' ')[0])} — make your first event and this page fills up with sales, orders and the door list.</p></div></div>
      <div class="n3o-start"><a class="n3-btn lg" href="#/create">${IC.plus} Create your first event</a><a class="n3-link" href="#/pricing">How pricing works</a></div>`;
  }

  function eventsList(u) {
    const evs = myEvents();
    return `<div class="n3o-head"><div>${N3.label('Your events')}<h1 class="n3o-h1">${evs.length} event${evs.length === 1 ? '' : 's'}.</h1></div><div class="n3o-head-r"><a class="n3-btn" href="#/create">${IC.plus} Create event</a></div></div>
      ${evs.length ? `<div class="n3o-evlist">${evs.map(e => { const s = soldOf(e.id), sold = e.tiers.reduce((a, t) => a + t.sold, 0), cap = capacity(e), ended = new Date(e.end) < new Date(), p = N3.dateParts(e.start);
        return `<a class="n3o-evrow" href="#/manage/${e.id}">
          <div class="n3o-evrow-d"><b>${p.dd}</b><span>${p.dow} ${p.mon}</span></div>
          <div class="n3o-evrow-i">${N3.img(e, 240, { duo: e.treatment !== undefined ? e.treatment : undefined })}</div>
          <div class="n3o-evrow-b"><span class="n3-kicker-s">${e.status === 'draft' ? 'Draft' : ended ? 'Ended' : 'On sale'} · ${esc(N3.where(e))}</span><h3>${esc(e.title)}</h3>
            <span class="n3o-evrow-m"><i class="n3o-meter"><i style="width:${Math.min(100, sold / cap * 100)}%"></i></i>${num(sold)}/${num(cap)} sold · ${moneyPlain(liveOrders(e.id).reduce((a, o) => a + netOf(o), 0))}${s ? '' : ''}</span></div>
          <span class="n3o-evrow-go">Manage ${IC.arrow}</span></a>`; }).join('')}</div>` : emptyDash(u)}`;
  }

  V.manage = function (sub) {
    const u = Store.user();
    if (!u) return signInPrompt('How\'s it selling?', 'Sign in to see sales, orders and your door list — one glance.');
    if (sub === 'events') return shell(u, 'events', nextEvent(myEvents()), eventsList(u));
    const e = nextEvent(myEvents());
    return shell(u, 'overview', e, e ? overview(u, e) : emptyDash(u));
  };
  V.manageMount = function (sub) { wireGate(); const e = nextEvent(myEvents()); if (e && sub !== 'events') mountOverview(e); wirePicker(); };

  function wirePicker() { const p = $('#evPick'); if (p) p.onchange = () => { location.hash = '#/manage/' + p.value + (p.dataset.sub ? '/' + p.dataset.sub : ''); }; }
  function wireCsv(e) { $$('[data-csv]').forEach(b => b.onclick = () => exportCsv(e)); }
  function wireOrderSearch() { const q = $('#ordQ'); if (!q) return; q.oninput = () => { const v = q.value.trim().toLowerCase(); let n = 0; $$('.n3o-table tbody tr').forEach(r => { const hit = r.dataset.s.includes(v); r.hidden = !hit; if (hit) n++; }); let m = $('#ordNone'); if (!n && v) { if (!m) $('.n3o-table').insertAdjacentHTML('afterend', '<p class="n3o-nohit" id="ordNone" role="status"></p>'); $('#ordNone').textContent = 'No orders match "' + q.value.trim() + '".'; } else if (m) m.remove(); }; }

  function mountOverview(e) {
    wireCsv(e); wireOrderSearch();
    $$('[data-range]').forEach(b => b.onclick = () => { RANGE = b.dataset.range; const y = scrollY; App.render(); window.scrollTo(0, y); });
    const sh = $('#shareLink'); if (sh) sh.onclick = () => copyText(eventUrl(e), 'Event link copied — paste it in WhatsApp');
    const inv = $('#inviteBtn'); if (inv) inv.onclick = () => {
      const url = location.href.split('#')[0] + '#/manage/' + e.id + '/checkin';
      openModal(`<div class="n3-p-org n3o-confirm"><button type="button" class="modal-close" data-close aria-label="Close">${IC.x}</button><h2>Invite door staff</h2><p>Send this link to anyone working the door. It opens the scanner for <b>${esc(e.title)}</b> — no app needed, works offline once loaded.</p>
        <div class="n3-field"><label for="invUrl">Scanner link</label><input class="n3-input" id="invUrl" readonly value="${esc(url)}"></div>
        <div class="modal-actions"><a class="n3-btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Door scanner for ' + e.title + ': ' + url)}">${IC.wa} Send on WhatsApp</a><button type="button" class="n3-btn" id="invCopy">Copy link</button></div></div>`, { size: 'sm' });
      $('#invCopy').onclick = () => { copyText(url, 'Scanner link copied'); closeModal(); };
    };
    const raw = () => JSON.parse(JSON.stringify(e));
    const unhydrate = x => { x.tiers.forEach(t => { t.sold = Math.max(0, t.sold - liveOrders(e.id).flatMap(o => o.items).filter(i => i.tierId === t.id).reduce((s, i) => s + i.qty, 0)); }); return x; };
    const pub = $('#pubBtn'); if (pub) pub.onclick = () => { const x = unhydrate(raw()); x.status = 'live'; Store.saveEvent(x); toast('Published — you\'re live'); App.render(); };
    const un = $('#unpubBtn'); if (un) un.onclick = () => confirmBox('Unpublish this event?', 'It goes back to draft and disappears from search. Tickets already sold stay valid.', 'Unpublish', () => { const x = unhydrate(raw()); x.status = 'draft'; Store.saveEvent(x); toast('Unpublished — back to draft'); App.render(); });
    const dup = $('#dupBtn'); if (dup) dup.onclick = () => { const x = raw(); x.id = Store.newEventId(); x.title = 'Copy of ' + x.title; x.status = 'draft'; x.views = 0; x.tiers.forEach(t => t.sold = 0); x.createdAt = new Date().toISOString(); Store.saveEvent(x); toast('Duplicated as a draft'); location.hash = '#/edit/' + x.id; };
    const del = $('#delBtn'); if (del) del.onclick = () => confirmBox('Delete this event?', 'This removes the event page for everyone. Tickets already sold stay in buyers\' accounts.', 'Delete event', () => { Store.deleteEvent(e.id); toast('Event deleted'); location.hash = '#/manage/events'; });
  }

  /* ---- per-event subs ---- */
  function ordersSub(e) {
    const all = Store.ordersForEvent(e.id), os = all.filter(o => !o.cancelled);
    return `<div class="n3o-head"><div>${eventPicker(e, 'orders')}<h1 class="n3o-h1">${all.length} order${all.length === 1 ? '' : 's'}.</h1>
      <p class="n3o-evline">${num(os.reduce((s, o) => s + o.tickets.length, 0))} tickets · ${moneyPlain(os.reduce((s, o) => s + netOf(o), 0))} after discounts</p></div>
      <div class="n3o-head-r"><a class="n3o-obtn" href="#/manage/${e.id}">${IC.back}Overview</a></div></div>
      <div class="n3o-orders"><div class="n3o-orders-h"><h2>All orders</h2><div class="n3o-orders-tools"><label class="n3-input n3o-search">${IC.search}<span class="n3-sr">Search orders</span><input id="ordQ" type="search" placeholder="Name, phone or order no."></label><button type="button" class="n3-btn ink sm n3o-csv" data-csv>Export CSV</button></div></div>
      ${ordersTable(all)}</div>
      <div class="n3o-mfoot"><button type="button" class="n3-btn sec" data-csv>Export CSV</button><a class="n3-btn" href="#/manage/${e.id}/checkin">Scan tickets</a></div>`;
  }
  function payoutsSub(u, e) {
    const evs = myEvents();
    return `<div class="n3o-head"><div>${N3.label('Payouts')}<h1 class="n3o-h1">Money in.</h1><p class="n3o-evline">Paid to ${esc(payoutInfo(e, u).to)} the morning after each event. <a href="#/account">Change payout number</a></p></div>
      <div class="n3o-head-r"><a class="n3o-obtn" href="#/manage/${e.id}">${IC.back}Overview</a></div></div>
      <table class="n3o-table pay"><thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col" class="r">Tickets</th><th scope="col" class="r">Amount</th><th scope="col">Status</th></tr></thead><tbody>
      ${evs.map(x => { const p = payoutInfo(x, u); return `<tr><td data-l="Event"><a href="#/manage/${x.id}"><b>${esc(x.title)}</b></a></td><td data-l="Payout">${dshort(p.when.toISOString())}, 09:00</td><td data-l="Tickets" class="r">${num(soldOf(x.id))}</td><td data-l="Amount" class="r"><b>${moneyPlain(p.net)}</b></td><td data-l="Status" class="st ${p.paid ? 'ok' : ''}">${p.net ? (p.paid ? 'Paid' : 'Scheduled') : '—'}</td></tr>`; }).join('')}
      </tbody></table>`;
  }

  /* ---- door check-in / scanner ---- */
  function attendees(e) { return liveOrders(e.id).flatMap(o => o.tickets.map(t => ({ o, t }))); }
  function scannerSub(e) {
    const list = attendees(e), inN = list.filter(x => x.t.checkedIn).length;
    return `<div class="n3o-scan n3-night" data-grain>
      <div class="n3o-scan-top"><a class="n3o-round n" href="#/manage/${e.id}" aria-label="Close scanner">${IC.x}</a><b class="n3o-scan-n" id="ciCount" aria-live="polite">${inN} / ${list.length} IN</b><span class="n3o-off">● OFFLINE OK</span></div>
      <p class="n3o-scan-ev">${esc(e.title)} · ${esc(N3.dateParts(e.start).dow)} ${N3.dateParts(e.start).dd} ${N3.dateParts(e.start).mon}</p>
      <div class="n3o-scan-grid">
        <div class="n3o-scan-l">
          <button type="button" class="n3o-cam" id="camBtn" aria-label="Simulate scanning the next ticket (demo)"><span class="n3o-cam-f"><i></i></span><span class="n3o-cam-t">camera view · tap to simulate a scan</span></button>
          <form class="n3o-code" id="codeForm" novalidate><label for="codeIn" class="n3o-k">Or type the ticket code</label><div class="n3o-code-row"><input class="n3-input" id="codeIn" placeholder="NV-ABC123-1" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" class="n3-btn">Check in</button></div></form>
          <div class="n3o-res is-idle" id="ciRes" role="status" aria-live="assertive"><b>READY.</b><span>Point the camera at a ticket QR, or type the code.</span><small>Already-scanned tickets flash red with the time they came in.</small></div>
          <button type="button" class="n3o-lookup" id="lookupBtn">Look up by phone number</button>
        </div>
        <div class="n3o-scan-r">
          <div class="n3o-scan-rh"><span class="n3o-k">Guest list · ${list.length}</span><label class="n3-input n3o-search">${IC.search}<span class="n3-sr">Search guests</span><input id="ciQ" type="search" placeholder="Name, phone or code"></label></div>
          ${list.length ? `<ul class="n3o-guests" id="ciList">${list.map(({ o, t }) => `<li data-s="${esc((buyerName(o) + ' ' + (t.holder || '') + ' ' + (o.buyer.phone || '') + ' ' + (o.buyer.email || '') + ' ' + t.code).toLowerCase())}">
            <span><b>${esc(t.holder || buyerName(o))}</b><small>${esc(t.tierName)} · ${esc(t.code)}${o.buyer.phone ? ' · ' + esc(o.buyer.phone) : ''}</small></span>
            <button type="button" class="n3o-tick" data-ci="${esc(o.id)}|${esc(t.code)}" aria-pressed="${!!t.checkedIn}">${t.checkedIn ? '✓ In' : 'Check in'}</button></li>`).join('')}</ul><p class="n3o-nohit" id="ciNone" hidden role="status">Nobody matches that.</p>` : `<div class="n3o-none n"><b>No guests yet.</b><span>When people buy tickets they show up here for the door.</span></div>`}
        </div>
      </div>
    </div>`;
  }
  function mountScanner(e) {
    const res = $('#ciRes'), inp = $('#codeIn');
    const payWord = p => (PAY[p] || [0, 0, p || ''])[2];
    const recount = () => { const l = attendees(Store.getEvent(e.id) || e); $('#ciCount').textContent = l.filter(x => x.t.checkedIn).length + ' / ' + l.length + ' IN'; };
    const setRow = (code, on) => { const b = $(`[data-ci$="|${CSS.escape(code)}"]`); if (b) { b.setAttribute('aria-pressed', on); b.textContent = on ? '✓ In' : 'Check in'; } };
    const show = (cls, big, name, line, small) => { res.className = 'n3o-res is-' + cls; res.innerHTML = `<b>${big}</b>${name ? `<strong>${esc(name)}</strong>` : ''}<span>${esc(line)}</span>${small ? `<small>${esc(small)}</small>` : ''}`; if (!reduceMotion()) { res.classList.remove('flash'); void res.offsetWidth; res.classList.add('flash'); } };
    const find = raw => {
      const q = raw.trim().toUpperCase().replace(/\s+/g, ''); if (!q) return null;
      const list = attendees(e);
      return list.find(x => x.t.code.toUpperCase() === q) || list.filter(x => x.o.id.toUpperCase() === q).sort((a, b) => a.t.checkedIn - b.t.checkedIn)[0] || null;
    };
    const admit = x => {
      if (!x) return show('bad', '✕ NOT FOUND.', '', 'That code isn\'t on the list for this event.', 'Check the code, or look them up by phone number.');
      if (x.t.checkedIn) { const at = ciTimes()[x.t.code]; return show('dup', 'ALREADY IN.', x.t.holder || buyerName(x.o), x.t.tierName + ' · ' + x.t.code, at ? 'Came in at ' + N3.hhmm(at) + '.' : 'Checked in earlier.'); }
      Store.checkIn(x.o.id, x.t.code, true); x.t.checkedIn = true; setCiTime(x.t.code, true); setRow(x.t.code, true); recount();
      show('ok', '✓ IN.', x.t.holder || buyerName(x.o), x.t.tierName + ' · ' + x.t.code + (x.o.payment ? ' · paid ' + payWord(x.o.payment) : ''), 'Next scan ready.');
    };
    $('#codeForm').onsubmit = ev => { ev.preventDefault(); if (!inp.value.trim()) { inp.focus(); return show('bad', 'TYPE A CODE.', '', 'It\'s printed under the QR, e.g. NV-ABC123-1.'); } admit(find(inp.value)); inp.value = ''; inp.focus(); };
    $('#camBtn').onclick = () => { const next = attendees(e).find(x => !x.t.checkedIn); if (!next) { const any = attendees(e)[0]; return any ? admit(any) : show('bad', 'NOBODY TO SCAN.', '', 'No tickets sold for this event yet.'); } admit(next); };
    $('#lookupBtn').onclick = () => { const q = $('#ciQ'); if (q) { q.placeholder = 'Phone number, e.g. 0772…'; q.focus(); q.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); } };
    const q = $('#ciQ'); if (q) q.oninput = () => { const v = q.value.trim().toLowerCase().replace(/\s+/g, ' '); let n = 0; $$('#ciList li').forEach(li => { const hit = li.dataset.s.replace(/\s+/g, ' ').includes(v) || li.dataset.s.replace(/\s/g, '').includes(v.replace(/\s/g, '')); li.hidden = !hit; if (hit) n++; }); $('#ciNone').hidden = !!n; };
    const list = $('#ciList'); if (list) list.addEventListener('click', ev => {
      const b = ev.target.closest('[data-ci]'); if (!b) return;
      const [oid, code] = b.dataset.ci.split('|'); const on = b.getAttribute('aria-pressed') !== 'true';
      Store.checkIn(oid, code, on); setCiTime(code, on); setRow(code, on); recount();
      const x = attendees(e).find(a => a.t.code === code); if (x) x.t.checkedIn = on;
      if (on && x) show('ok', '✓ IN.', x.t.holder || buyerName(x.o), x.t.tierName + ' · ' + code, 'Checked in from the list.');
      else toast('Undone — ' + code + ' is no longer checked in');
    });
  }

  V.manageEvent = function (id, sub) {
    const u = Store.user();
    if (!u) return signInPrompt('Sign in to manage.', 'Only the organiser can see sales and the door list for this event.');
    const e = Store.getEvent(id);
    if (!e || !Store.canEdit(e)) return V.notFound('You can only manage events you created.');
    if (sub === 'orders') return shell(u, 'orders', e, ordersSub(e));
    if (sub === 'checkin') return shell(u, 'checkin', e, scannerSub(e), 'is-scan');
    if (sub === 'payouts') return shell(u, 'payouts', e, payoutsSub(u, e));
    return shell(u, 'overview', e, overview(u, e));
  };
  V.manageEventMount = function (id, sub) {
    wireGate(); const e = Store.getEvent(id); if (!e || !Store.canEdit(e)) return;
    wirePicker();
    if (sub === 'orders') { wireCsv(e); wireOrderSearch(); }
    else if (sub === 'checkin') mountScanner(e);
    else if (sub !== 'payouts') mountOverview(e);
  };

  /* =====================================================================
     PUBLIC ORGANISER PROFILE
     ===================================================================== */
  V.organizerPage = function (id) {
    const o = Store.organizer(id), u = Store.user(), me = u && u.id === id;
    const evs = Store.organizerEvents(id);
    const past = Store.publicEvents().filter(e => e.organizerId === id && new Date(e.end) < new Date()).sort((a, b) => new Date(b.start) - new Date(a.start));
    const f = Store.isFollowing(id), followers = (o.followers || 0) + (f ? 1 : 0);
    const cities = Array.from(new Set(evs.concat(past).map(e => e.online ? 'Online' : e.venue.city)));
    const cats = Array.from(new Set(evs.concat(past).map(e => cat(e.category).name.split(' & ')[0])));
    return `<div class="n3-page n3-p-org n3o-prof">
      <header class="n3o-prof-hd n3-night" data-grain><div class="n3-wrap">
        <div class="n3o-prof-top"><span class="n3o-prof-av" aria-hidden="true">${esc(initials(o.name))}</span>${N3.label('Organiser on Nova' + (cats.length ? ' · ' + cats.slice(0, 2).join(' · ') : ''))}</div>
        <h1 class="n3o-prof-name">${esc(o.name)}</h1>
        ${o.bio ? `<p class="n3-dek">${esc(o.bio)}</p>` : ''}
        <div class="n3o-prof-row">
          <dl class="n3o-prof-stats"><div><dt>Followers</dt><dd id="folN">${esc(compact(followers))}</dd></div><div><dt>Upcoming</dt><dd>${evs.length}</dd></div><div><dt>${cities.length === 1 ? 'City' : 'Cities'}</dt><dd>${cities.length ? esc(cities.slice(0, 3).join(', ')) : '—'}</dd></div></dl>
          <div class="n3o-prof-acts">${me ? `<a class="n3-btn" href="#/manage">Open dashboard</a><a class="n3-btn sec" href="#/account">Edit profile</a>` : `<button type="button" class="n3-btn ${f ? 'sec' : ''}" id="orgFollow" aria-pressed="${f}">${f ? '✓ Following' : '+ Follow'}</button>`}<button type="button" class="n3-iconbtn" id="orgShare" aria-label="Copy link to this organiser">${IC.share}</button></div>
        </div>
        ${me ? '' : `<p class="n3o-prof-note">${f ? 'You\'ll get a WhatsApp nudge when they announce something new.' : 'Follow to hear first when they announce something — no spam, one message per event.'}</p>`}
      </div></header>
      <div class="n3-wrap n3o-prof-body">
        <div class="n3o-prof-sh"><h2 class="n3-h3">Coming up</h2><span>${evs.length} event${evs.length === 1 ? '' : 's'}</span></div>
        ${evs.length ? `<div class="n3o-prof-grid">${evs.map(e => N3.cardFeature(e)).join('')}</div>` : `<div class="n3-empty">${IC.date}<h3>Nothing announced.</h3><p>${me ? 'Your next night starts here.' : 'Follow and you\'ll be first to know.'}</p>${me ? '<a class="n3-btn" href="#/create">Create event</a>' : ''}</div>`}
        ${past.length ? `<div class="n3o-prof-sh"><h2 class="n3-h3">Past nights</h2><span>${past.length}</span></div><div class="n3o-prof-past">${past.slice(0, 6).map(e => N3.cardRow(e)).join('')}</div>` : ''}
      </div>
    </div>`;
  };
  V.organizerMount = function (id) {
    const b = $('#orgFollow');
    if (b) b.onclick = () => {
      const r = Store.toggleFollow(id);
      if (r === null) return Auth.open('signup', () => { if (!Store.isFollowing(id)) Store.toggleFollow(id); App.render(); toast('Following ' + Store.organizer(id).name); });
      toast(r ? 'Following ' + Store.organizer(id).name : 'Unfollowed'); App.render();
    };
    const s = $('#orgShare'); if (s) s.onclick = () => copyText(location.href, 'Organiser link copied');
  };
})();
