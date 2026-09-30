/* Nova v3 — Event page (board "Nova 03 Event"): poster header, facts, buy box, agenda, getting there, FAQ, organiser, related.
   Overrides V.eventPage / V.eventMount. Styles in css/v3-event.css (scoped under .n3-p-event). */
(function () {
  const V = window.Views;
  const { esc, moneyPlain, remaining, soldCount, cat, dFmt, toast, openModal, closeModal } = UI;
  const IC = N3.IC;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const num = n => Math.round(n).toLocaleString('en-US');

  /* per-page selection state (kept across re-renders of the same event) */
  let SEL = { id: null, tier: null, qty: 1 };
  /* previous in-app route, so the phone back button can return to the list the user came from */
  let PREV = null;
  window.addEventListener('hashchange', ev => { try { PREV = new URL(ev.oldURL).hash || null; } catch (x) { PREV = null; } });

  /* ---------- helpers ---------- */
  const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const FRIEND_NAMES = ['Daniel Kato', 'Sheila Mirembe', 'Brian Okello', 'Aisha Nakato', 'Moses Tumusiime', 'Grace Achieng', 'Ivan Ssemwanga', 'Joan Atim', 'Esther Namusoke', 'Ronald Mugisha', 'Patience Auma', 'Isaac Byaruhanga'];
  const first = n => n.split(' ')[0];
  function friendsOf(e) {
    const n = N3.friends(e); if (!n) return { n: 0, names: [] };
    const h = hash(e.id + 'f'); const a = FRIEND_NAMES[h % FRIEND_NAMES.length]; let b = FRIEND_NAMES[(h >>> 4) % FRIEND_NAMES.length];
    if (b === a) b = FRIEND_NAMES[(FRIEND_NAMES.indexOf(a) + 1) % FRIEND_NAMES.length];
    return { n, names: [a, b] };
  }
  const to24 = t => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})\s*([AP]M)?$/i); if (!m) return t; let h = +m[1]; if (m[3]) { const pm = /p/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; } return N3.two(h) + ':' + m[2]; };
  const orgMark = name => (name || '?').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 3).map(w => w[0]).join('').toUpperCase();
  const isEnded = e => new Date(e.end) < new Date();
  const tierLeft = t => Math.max(0, t.qty - t.sold);
  const dayMon = d => d.getDate() + ' ' + dFmt(d.toISOString(), { month: 'short' }).toUpperCase();
  function refundInfo(e) {
    const r = e.refund || '';
    if (N3.isFree(e)) return { big: 'FREE', sub: 'Cancel any time in My tickets', free: true };
    const m = r.match(/up to (\d+) days?/i);
    if (/no refunds/i.test(r)) return { big: 'NO REFUNDS', sub: /transfer/i.test(r) ? 'Tickets can be transferred instead' : 'All sales final' };
    if (m) { const d = new Date(new Date(e.start).getTime() - (+m[1]) * 864e5); return { big: 'UNTIL ' + dayMon(d), sub: 'Full refund to your MoMo', until: dFmt(d.toISOString(), { weekday: 'short' }) + ' ' + d.getDate() + ' ' + dFmt(d.toISOString(), { month: 'short' }) }; }
    return { big: 'ASK', sub: r.replace(/\.$/, '') };
  }
  function ageInfo(e) {
    const a = (e.ageLimit || 'All ages').trim();
    const n = parseInt(a, 10);
    if (/all/i.test(a)) return { big: 'ALL AGES', sub: 'Bring the whole family' };
    if (n >= 18) return { big: a.toUpperCase(), sub: 'ID checked at the door' };
    return { big: a.toUpperCase(), sub: 'Under ' + n + 's with a guardian' };
  }
  /* transport hints by city (demo copy, in the board's voice) */
  const HUBS = {
    Kampala: { hub: 'the city centre', boda: 'UGX 5,000', park: 'UGX 5,000' },
    Entebbe: { hub: 'Entebbe town', boda: 'UGX 3,000', park: 'UGX 3,000' },
    Jinja: { hub: 'Jinja town', boda: 'UGX 2,000', park: 'UGX 2,000' },
    Mbarara: { hub: 'Mbarara town', boda: 'UGX 3,000', park: 'free' },
    Nairobi: { hub: 'the CBD', boda: 'KES 200', park: 'KES 300' }
  };
  function transport(e) {
    const h = HUBS[e.venue.city] || { hub: 'town', boda: 'UGX 5,000', park: 'UGX 5,000' };
    const start = new Date(e.start), end = new Date(e.end);
    const leave = N3.hhmm(new Date(end.getTime() - 15 * 60000).toISOString());
    const fills = N3.hhmm(new Date(start.getTime() - 50 * 60000).toISOString());
    return [
      { ic: IC.boda, k: 'Boda', t: `~${h.boda} from ${h.hub}. Ask for drop-off at the ${esc(e.venue.address)} side, not the main road.`, chip: `<b>Boda</b> ~${h.boda}` },
      { ic: IC.car, k: 'Uber / Bolt', t: `pickup at the main gate. Surge after ${N3.hhmm(e.end)} — leave at ${leave} or stay to the end.`, chip: '<b>Uber</b> main gate' },
      { ic: '<span class="n3e-p" aria-hidden="true">P</span>', k: 'Parking', t: `${h.park === 'free' ? 'Free' : h.park} on site. Fills by ${fills}.`, chip: `<b>Parking</b> ${h.park === 'free' ? 'free' : h.park.replace(',000', 'k')}` }
    ];
  }
  /* poster headline size: biggest size where the longest word fits and the title wraps into few lines */
  function fitTitle(title, width, sizes, maxLines) {
    const words = title.toUpperCase().split(/\s+/);
    for (const s of sizes) {
      const per = Math.floor(width / (0.52 * s));
      if (Math.max(...words.map(w => w.length)) > per) continue;
      let lines = 1, cur = 0;
      words.forEach(w => { const add = cur ? w.length + 1 : w.length; if (cur + add > per) { lines++; cur = w.length; } else cur += add; });
      if (lines <= maxLines) return s;
    }
    return sizes[sizes.length - 1];
  }
  const shareUrl = e => location.href.split('#')[0] + '#/event/' + e.id;
  const waHref = e => 'https://wa.me/?text=' + encodeURIComponent(e.title + ' · ' + N3.dateParts(e.start).dow + ' ' + N3.dateParts(e.start).dd + ' ' + N3.dateParts(e.start).mon + ' — ' + shareUrl(e));
  const mapQ = e => encodeURIComponent(e.venue.name + ', ' + e.venue.address + ', ' + e.venue.city);
  const dirHref = e => 'https://www.google.com/maps/dir/?api=1&destination=' + mapQ(e);
  function copy(text, msg) {
    legacyCopy(text);
    try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(() => {}); } catch (x) {}
    toast(msg || 'Link copied');
  }
  function legacyCopy(text) { const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (x) {} t.remove(); }

  /* ---------- state per event ---------- */
  function ensureSel(e) {
    if (SEL.id !== e.id) SEL = { id: e.id, tier: null, qty: 1 };
    const avail = e.tiers.filter(t => tierLeft(t) > 0);
    if (!SEL.tier || !avail.some(t => t.id === SEL.tier)) { const roomy = avail.filter(t => tierLeft(t) > 20); SEL.tier = (roomy[0] || avail[0] || {}).id || null; }
    const t = e.tiers.find(t => t.id === SEL.tier);
    if (t) SEL.qty = Math.max(1, Math.min(SEL.qty, tierLeft(t), 10));
  }
  const checkoutHref = (e, tierId, qty) => '#/checkout/' + e.id + (tierId ? '?tier=' + encodeURIComponent(tierId) + (qty > 1 ? '&qty=' + qty : '') : '');

  /* ---------- buy box (desktop) ---------- */
  function buyBox(e) {
    const ended = isEnded(e), left = remaining(e), free = N3.isFree(e);
    const weekSold = Math.max(3, Math.round(soldCount(e) * (0.12 + (hash(e.id) % 10) / 100)));
    if (ended) return `<div class="n3e-box" id="evBox">
      <div class="n3e-box-h"><span>THIS ONE'S OVER</span><span class="n3e-box-note">Ended ${esc(dayMon(new Date(e.end)))}</span></div>
      <div class="n3e-box-b"><p class="n3e-box-msg">Tickets are closed. The same crowd has plenty else on this week.</p>
        <a class="n3-btn block" href="#/search?cat=${e.category}">More ${esc(cat(e.category).name)}</a>
        <a class="n3-btn sec block" href="#/organizer/${e.organizerId}">See what the organiser has next</a></div></div>`;
    const tiers = e.tiers.map(t => {
      const l = tierLeft(t), out = l === 0, on = SEL.tier === t.id;
      return `<div class="n3e-tier ${on ? 'on' : ''} ${out ? 'out' : ''}">
        <label class="n3e-tier-l"><input type="radio" name="evTier" value="${t.id}" ${on ? 'checked' : ''} ${out ? 'disabled' : ''} class="n3-sr"><span class="n3e-radio" aria-hidden="true"></span>
          <span class="n3e-tier-t"><b>${esc(t.name)}</b>${t.desc && !/^sold out$/i.test(t.desc) ? `<small>${esc(t.desc)}</small>` : ''}
            ${out ? '<em class="n3e-pill sold">Sold out</em>' : l <= 20 ? `<em class="n3e-pill">Only ${l} left</em>` : ''}</span>
          <b class="n3e-tier-p">${t.price ? num(t.price) : 'Free'}</b></label>
        ${on ? `<div class="n3e-qty" role="group" aria-label="Number of ${esc(t.name)} tickets"><button type="button" data-q="-1" aria-label="Fewer" ${SEL.qty <= 1 ? 'disabled' : ''}>${IC.minus}</button><output aria-live="polite">${SEL.qty}</output><button type="button" data-q="1" aria-label="More" ${SEL.qty >= Math.min(10, l) ? 'disabled' : ''}>${IC.plus}</button></div>` : ''}
      </div>`;
    }).join('');
    const t = e.tiers.find(x => x.id === SEL.tier);
    const total = t ? t.price * SEL.qty : 0;
    const cta = left === 0 ? 'Join the waitlist' : free ? (SEL.qty > 1 ? `Reserve ${SEL.qty} spots` : 'Reserve a free spot') : `Get ${SEL.qty} ticket${SEL.qty === 1 ? '' : 's'}`;
    return `<div class="n3e-box" id="evBox">
      <div class="n3e-box-h"><span>${left === 0 ? 'SOLD OUT' : free ? 'RESERVE' : 'GET TICKETS'}</span><span class="n3e-box-note">${left === 0 ? 'Waitlist open' : left <= 20 ? 'Only ' + left + ' left' : num(weekSold) + ' sold this week'}</span></div>
      <div role="radiogroup" aria-label="Ticket type" class="n3e-tiers">${tiers}</div>
      <div class="n3e-box-b">
        ${t ? `<div class="n3e-total"><span>${SEL.qty} × ${esc(t.name)}</span><b>${total ? moneyPlain(total) : 'FREE'}</b></div>` : `<p class="n3e-box-msg">Every ticket has gone. Join the waitlist and we'll text you if seats come back.</p>`}
        ${left === 0 ? `<button type="button" class="n3-btn block lg" data-waitlist>${cta}</button>`
          : `<a class="n3-btn block lg" data-buy href="${checkoutHref(e, SEL.tier, SEL.qty)}">${cta}</a>`}
        ${t && t.price ? (SEL.qty > 1
          ? `<button type="button" class="n3e-split" data-split>${IC.friends}<span>Going with friends? Split it on MoMo — ${moneyPlain(t.price)} each</span></button>`
          : `<button type="button" class="n3e-split" data-split>${IC.friends}<span>Going with a friend? Add a ticket and split it on MoMo</span></button>`) : ''}
        ${left === 0 ? '' : free ? `<p class="n3e-pay">No payment needed · your ticket arrives by SMS &amp; WhatsApp</p>` : `<p class="n3e-pay"><span class="n3e-chip mtn">MTN</span><span class="n3e-chip airtel">Airtel</span>Card · Bank · tickets arrive by SMS &amp; WhatsApp</p>`}
        <div class="n3e-box-acts">${saveWide(e)}<a class="n3e-wa" href="${waHref(e)}" target="_blank" rel="noopener">${IC.wa}WhatsApp</a></div>
        <button type="button" class="n3-link n3e-copy" data-copy>Copy event link</button>
      </div></div>`;
  }
  function saveWide(e) {
    const on = Store.isLiked(e.id);
    return `<button type="button" class="n3e-savew ${on ? 'on' : ''}" data-like="${e.id}" aria-pressed="${on}">${on ? IC.saveFill : IC.save}<span>${on ? 'Saved' : 'Save'}</span></button>`;
  }

  /* ---------- page ---------- */
  V.eventPage = function (id) {
    const e = Store.getEvent(id);
    if (!e) return V.notFound('That event could not be found. It may have been removed, or the link is wrong.');
    ensureSel(e);
    const org = Store.organizer(e.organizerId), c = cat(e.category);
    const p = N3.dateParts(e.start), ended = isEnded(e), left = remaining(e), free = N3.isFree(e);
    const b = N3.badge(e);
    const year = new Date(e.start).getFullYear();
    const duo = N3.isToday(e.start) && !ended ? 'ember' : 'jac';
    const tsD = fitTitle(e.title, 740, [96, 84, 72, 62, 54, 48], 3);
    const tsM = fitTitle(e.title, 340, [44, 38, 34, 30, 26], 3);
    const fr = friendsOf(e);
    const ref = refundInfo(e), age = ageInfo(e);
    const following = Store.isFollowing(org.id), canEdit = Store.canEdit(e);
    const orgN = Store.organizerEvents(org.id).length;
    const followers = (org.followers || 0) + (following ? 1 : 0);
    const endP = N3.dateParts(e.end);
    const sameDay = new Date(e.start).toDateString() === new Date(e.end).toDateString() || (new Date(e.end) - new Date(e.start)) < 12 * 36e5;
    const bigDate = sameDay ? p.dd : p.dd + '–' + endP.dd;
    const whenBig = sameDay ? `${p.dow} ${+p.dd} ${p.mon}` : `${p.dow} ${+p.dd} – ${endP.dow} ${+endP.dd} ${endP.mon}`;

    const facts = [
      ['WHEN', whenBig, `${p.time} – ${N3.hhmm(e.end)} · <button type="button" class="n3e-cal" data-cal>Add to calendar</button>`, `${sameDay ? p.dow : p.dow + '–' + endP.dow} · ${p.time}`],
      e.online ? ['WHERE', 'ONLINE', 'Joining link by SMS &amp; WhatsApp', 'Link sent after booking'] : ['WHERE', e.venue.name.toUpperCase(), esc(e.venue.address + ', ' + e.venue.city), esc(N3.area(e))],
      ['AGE', age.big, esc(age.sub), ''],
      [ref.free ? 'ENTRY' : 'REFUNDS', ref.big, esc(ref.sub), ''],
      ended ? ['WENT', num(soldCount(e)), 'people were there', ''] : left === 0 ? ['TICKETS', 'SOLD OUT', 'Waitlist open', ''] : ['GOING', num(soldCount(e)), left <= 50 ? `Only ${left} spots left` : `${num(left)} spots left`, '']
    ];

    const lowTier = e.tiers.filter(t => tierLeft(t) > 0 && tierLeft(t) <= 20).sort((a, b) => tierLeft(a) - tierLeft(b))[0];
    const desc = (e.description || '').split(/\n\n+/).filter(Boolean);
    const faq = (e.faq || []).concat([
      ref.free ? { q: 'What if I can’t make it?', a: 'It’s free, so there’s nothing to refund. Cancel from My tickets so someone on the waitlist gets your spot.' }
        : { q: 'Can I get a refund?', a: ref.until ? `Yes, until ${ref.until}. Tap “Request refund” on your ticket and the money goes back to the MoMo or Airtel number you paid with, usually within an hour.` : e.refund },
      { q: 'Can I give my ticket to someone else?', a: 'Yes. Open the ticket in My tickets and tap “Transfer”, or just forward the SMS. The name on the ticket is not checked at the door.' },
      { q: 'How do I get my ticket?', a: e.online ? 'Your ticket and the joining link arrive instantly by SMS and WhatsApp, and they are always in My tickets.' : 'It arrives instantly by SMS and WhatsApp, and it is always in My tickets. Show the QR, or just your phone number, at the door.' }
    ]);
    const agenda = e.agenda || [];
    const plain = /doors|registration|lunch|break|breakfast|welcome|drinks|mixer/i;
    const rel = related(e);
    const tr = e.online ? null : transport(e);

    const orgCard = `<div class="n3e-org">
      <a class="n3e-org-mark" href="#/organizer/${org.id}" aria-label="${esc(org.name)} profile">${esc(orgMark(org.name))}</a>
      <div class="n3e-org-t"><span class="n3-kicker-s">Organised by</span><a href="#/organizer/${org.id}" class="n3e-org-n">${esc(org.name)}</a>
        <span class="n3e-org-m">${orgN} upcoming event${orgN === 1 ? '' : 's'} · ${num(followers)} followers · replies within the hour</span></div>
      <div class="n3e-org-a">${canEdit ? `<a class="n3-btn ink" href="#/manage/${e.id}">Manage event</a>`
        : `<button type="button" class="n3e-follow ${following ? 'on' : ''}" data-follow aria-pressed="${following}">${following ? IC.check + ' Following' : '+ Follow'}</button>`}
        <button type="button" class="n3e-msg" data-contact>Message on WhatsApp</button></div></div>`;

    return `<div class="n3-page n3-p-event" style="--tsd:${tsD}px;--tsm:${tsM}px">
      ${e.status === 'draft' ? `<div class="n3e-draft">Draft — only you can see this page. <a href="#/manage/${e.id}">Publish it</a></div>` : ''}
      <section class="n3e-hero n3-night" data-grain>
        <div class="n3-wrap n3e-hero-in">
          <div class="n3e-hero-top">
            <a class="n3e-rb" href="#/search" data-back aria-label="Back">${IC.back}</a>
            <span class="n3e-hero-acts">${N3.saveBtn(e, 'n3e-rb')}<button type="button" class="n3e-rb wa" data-share aria-label="Share this event">${IC.share}</button></span>
          </div>
          <div class="n3e-hero-txt">
            <nav class="n3e-crumbs" aria-label="Breadcrumb"><a href="#/">Explore</a><span aria-hidden="true">›</span><a href="#/search?cat=${e.category}">${esc(c.name)}</a></nav>
            <div class="n3e-hero-k"><span class="n3-label">${esc(c.name.toUpperCase())} · <span class="n3e-kd">${esc(N3.area(e).toUpperCase())}</span><span class="n3e-km">${p.mon} ${year}</span></span>${ended ? '<span class="n3-badge sold">Ended</span>' : b ? N3.badgeHtml(b) : ''}</div>
            <h1 class="n3e-title">${esc(e.title)}</h1>
            <p class="n3e-dek">${esc(e.summary || '')}</p>
          </div>
          <div class="n3e-hero-img">
            ${N3.img(e, 1200, { duo, eager: true, reveal: true, sizes: '(max-width: 900px) 100vw, 560px', alt: e.title })}
            <span class="n3e-bigdate" aria-hidden="true">${bigDate}</span>
            <span class="n3e-monyr" aria-hidden="true">${p.mon}<br>${year}</span>
          </div>
        </div>
      </section>

      <div class="n3e-facts"><div class="n3-wrap n3e-facts-in">${facts.map(([k, big, sub, subM], i) => `<div class="n3e-fact f${i}"><span class="n3-kicker-s">${k}</span><b>${esc(big)}</b>${sub ? `<small class="d">${sub}</small>` : ''}${subM ? `<small class="m">${subM}</small>` : ''}</div>`).join('')}</div></div>

      ${fr.n ? `<div class="n3e-friends-m">${N3.avatars(fr.names)}<span>${first(fr.names[0])}, ${first(fr.names[1])} + ${fr.n - 2} friends going</span></div>` : ''}

      <div class="n3-wrap n3e-grid">
        <div class="n3e-main">
          ${fr.n ? `<div class="n3e-friends">${N3.avatars(fr.names, fr.n - 2)}<span>${first(fr.names[0])}, ${first(fr.names[1])} and ${fr.n - 2} friends ${ended ? 'went' : 'are going'}</span><button type="button" class="n3-link" data-who>See who →</button></div>`
            : !ended ? `<div class="n3e-friends none">${IC.friends}<span>None of your friends are going yet. Be the first — send it to the group chat.</span><a class="n3-link" href="${waHref(e)}" target="_blank" rel="noopener">Share →</a></div>` : ''}

          <section class="n3e-sec n3e-mtickets" id="sec-tickets" aria-labelledby="h-tk"><h2 id="h-tk">${ended ? 'TICKETS CLOSED' : 'TICKETS'}</h2>
            <div class="n3e-mt">${e.tiers.map(t => { const l = tierLeft(t), dis = ended || l === 0; return `<a class="n3e-mt-r ${dis ? 'out' : ''}" ${dis ? 'aria-disabled="true"' : `href="${checkoutHref(e, t.id, 1)}"`}><span><b>${esc(t.name)}</b>${l === 0 ? '<small class="hot">Sold out</small>' : l <= 20 && !ended ? `<small class="hot">Only ${l} left</small>` : t.desc && !/^sold out$/i.test(t.desc) ? `<small>${esc(t.desc)}</small>` : ''}</span><b class="n3e-mt-p">${t.price ? num(t.price) : 'Free'}</b></a>`; }).join('')}</div>
            ${ended ? `<p class="n3e-note">This event has ended. <a href="#/search?cat=${e.category}">Find more ${esc(c.name)} →</a></p>` : ''}</section>

          <section class="n3e-sec" id="sec-about" aria-labelledby="h-ab"><h2 id="h-ab">ABOUT</h2>
            <p class="n3e-lede">${esc(e.summary || '')}</p>
            <div class="n3e-body" id="evBody">${desc.map(x => `<p>${esc(x)}</p>`).join('')}</div>
            ${desc.join(' ').length > 160 ? `<button type="button" class="n3-link n3e-more" id="evMore" aria-expanded="false" aria-controls="evBody">Read more</button>` : ''}
            ${e.tags && e.tags.length ? `<div class="n3e-tags">${e.tags.map(t => `<a class="n3-chip sm" href="#/search?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>` : ''}
          </section>

          ${agenda.length ? `<section class="n3e-sec" id="sec-agenda" aria-labelledby="h-ag"><div class="n3e-sec-h"><h2 id="h-ag">AGENDA</h2><span class="n3e-day"><span>${p.dow} ${+p.dd} ${p.mon}</span></span></div>
            <ol class="n3e-agenda">${agenda.map(a => `<li><span class="n3e-ag-t">${esc(to24(a.time))}</span><span class="n3e-ag-x ${plain.test(a.title) ? 'plain' : ''}">${esc(a.title)}</span>${a.where ? `<span class="n3e-ag-w">${esc(a.where)}</span>` : ''}</li>`).join('')}</ol></section>` : ''}

          ${e.online ? `<section class="n3e-sec" id="sec-location" aria-labelledby="h-lo"><h2 id="h-lo">HOW TO JOIN</h2>
            <div class="n3e-online"><div class="n3e-online-ic">${IC.phone}</div><div><b>Online · join from anywhere</b><p>Your joining link arrives by SMS and WhatsApp right after you ${free ? 'reserve' : 'book'}, and again an hour before start. Works on a phone; 3G is enough for audio.</p>
              <div class="n3e-online-a"><button type="button" class="n3-btn ink sm" data-cal>Add to calendar</button><span>Starts ${p.time} EAT · ${Math.round((new Date(e.end) - new Date(e.start)) / 36e5 * 10) / 10} hrs</span></div></div></div></section>`
          : `<section class="n3e-sec" id="sec-location" aria-labelledby="h-lo"><h2 id="h-lo">GETTING THERE</h2>
            <div class="n3e-there">
              <div class="n3e-map"><iframe loading="lazy" title="Map of ${esc(e.venue.name)}" src="https://maps.google.com/maps?q=${mapQ(e)}&z=15&output=embed" referrerpolicy="no-referrer-when-downgrade"></iframe><span class="n3e-map-l">map · ${esc(e.venue.address)}, ${esc(e.venue.city)}</span></div>
              <div class="n3e-tr">
                ${tr.map(x => `<div class="n3e-tr-r">${x.ic}<span><b>${x.k}</b> · ${x.t}</span></div>`).join('')}
                <div class="n3e-tr-chips">${tr.map(x => `<span>${x.chip}</span>`).join('')}</div>
                <div class="n3e-tr-a"><a class="n3e-dir" href="${dirHref(e)}" target="_blank" rel="noopener"><span class="d">Directions</span><span class="m">Open directions</span></a><button type="button" class="n3e-shl" data-shareloc>Share location</button></div>
              </div>
            </div></section>`}

          <section class="n3e-sec" id="sec-faq" aria-labelledby="h-fq"><h2 id="h-fq">FAQ</h2>
            <div class="n3e-faq">${faq.map((q, i) => `<details ${i === 0 ? 'data-first' : ''}><summary>${esc(q.q)}<i aria-hidden="true"></i></summary><p>${esc(q.a)}</p></details>`).join('')}</div></section>

          <section class="n3e-sec n3e-orgsec" id="sec-org" aria-label="Organiser">${orgCard}</section>
        </div>

        <aside class="n3e-aside" aria-label="Tickets">${buyBox(e)}</aside>
      </div>

      ${rel.length ? `<section class="n3e-rel" aria-labelledby="h-rel"><div class="n3-wrap">
        <div class="n3e-rel-h"><h2 id="h-rel">IF YOU LIKE THIS</h2><a class="n3-link" href="#/search?cat=${e.category}">More ${esc(c.name)} →</a></div>
        <div class="n3e-rel-g">${rel.map(relCard).join('')}</div></div></section>` : ''}

      <div class="n3e-bar n3-night" role="region" aria-label="Buy tickets">
        ${ended ? `<span class="n3e-bar-t"><small>ENDED</small><b>${p.dd} ${p.mon}</b><em>Tickets closed</em></span><a class="n3-btn" href="#/search?cat=${e.category}">Find more</a>`
          : left === 0 ? `<span class="n3e-bar-t"><small>TICKETS</small><b>SOLD OUT</b><em>Waitlist open</em></span><button type="button" class="n3-btn" data-waitlist>Join waitlist</button>`
          : `<span class="n3e-bar-t"><small>${free ? 'ENTRY' : N3.priceFrom(e).startsWith('From') ? 'FROM' : 'PRICE'}</small><b>${free ? 'FREE' : moneyPlain(Math.min(...e.tiers.filter(t => t.price > 0).map(t => t.price)))}</b>${lowTier ? `<em>Only ${tierLeft(lowTier)} ${esc(lowTier.name)} left</em>` : `<em class="soft">${p.dow} ${+p.dd} ${p.mon} · ${p.time}</em>`}</span>
             <a class="n3-btn" href="#/checkout/${e.id}" data-buybar>${free ? 'Reserve' : 'Get tickets'}</a>`}
      </div>
    </div>`;
  };

  function related(e) {
    const up = N3.upcoming().filter(x => x.id !== e.id);
    const score = x => (x.category === e.category ? 2 : 0) + (x.organizerId === e.organizerId ? 1 : 0);
    return up.map((x, i) => ({ x, s: score(x), i })).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 4).map(o => o.x);
  }
  function relCard(x) {
    const p = N3.dateParts(x.start);
    const where = x.online ? 'ONLINE' : x.venue.city !== 'Kampala' ? x.venue.city.toUpperCase() : p.time;
    const pr = N3.priceFrom(x);
    return `<a class="n3e-rc" href="#/event/${x.id}">${N3.img(x, 600, { duo: N3.isToday(x.start) ? 'ember' : '', sizes: '(max-width: 900px) 200px, 300px' })}
      <span class="n3e-rc-d">${p.dow} ${p.dd} · ${esc(where)}</span><span class="n3e-rc-t">${esc(x.title)}</span><b class="n3e-rc-p">${pr === 'Free' ? 'Free · RSVP' : esc(pr)}</b></a>`;
  }

  /* ---------- modals ---------- */
  function shareModal(e) {
    const url = shareUrl(e);
    openModal(`<button type="button" class="modal-close" data-close aria-label="Close">${IC.x}</button>
      <div class="n3e-modal"><h2>SEND IT TO THE GROUP</h2><p>Plans happen in the group chat. Drop it there.</p>
        <a class="n3-btn wa block" href="${waHref(e)}" target="_blank" rel="noopener">${IC.wa} Share on WhatsApp</a>
        <label class="n3e-copyrow"><span class="n3-sr">Event link</span><input class="n3-input" id="evShareUrl" readonly value="${esc(url)}"><button type="button" class="n3-btn sec" id="evCopy">Copy link</button></label>
      </div>`, { noFocus: true });
    $('#evCopy').onclick = () => { $('#evShareUrl').select(); copy(url); };
  }
  function contactModal(e) {
    const org = Store.organizer(e.organizerId);
    openModal(`<button type="button" class="modal-close" data-close aria-label="Close">${IC.x}</button>
      <div class="n3e-modal"><h2>MESSAGE ${esc(org.name.toUpperCase())}</h2><p>They usually reply within an hour on WhatsApp.</p>
        <div class="n3-field"><label for="evMsg">Your message</label><textarea class="n3-input" id="evMsg" rows="4">Hi! I have a question about ${esc(e.title)}: </textarea></div>
        <button type="button" class="n3-btn wa block" id="evSend">${IC.wa} Send on WhatsApp</button>
        <a class="n3-link" href="#/organizer/${org.id}">View ${esc(org.name)}'s profile</a></div>`);
    $('#evSend').onclick = () => {
      const m = $('#evMsg').value.trim(); if (!m) { toast('Write a message first'); return; }
      window.open('https://wa.me/?text=' + encodeURIComponent(m), '_blank', 'noopener'); closeModal(); toast('Opening WhatsApp…');
    };
  }
  function whoModal(e) {
    const fr = friendsOf(e);
    const others = FRIEND_NAMES.filter(n => !fr.names.includes(n)).slice(0, Math.min(6, fr.n - 2));
    const all = fr.names.concat(others);
    openModal(`<button type="button" class="modal-close" data-close aria-label="Close">${IC.x}</button>
      <div class="n3e-modal"><h2>${fr.n} FRIENDS GOING</h2><p>From your contacts who use Nova.</p>
        <ul class="n3e-who">${all.map((n, i) => `<li>${N3.avatars([n])}<b>${esc(n)}</b><span>${i < 2 ? 'Bought this week' : 'Going'}</span></li>`).join('')}${fr.n > all.length ? `<li class="more">+ ${fr.n - all.length} more</li>` : ''}</ul>
        <a class="n3-btn block" href="#/checkout/${e.id}">Join them</a></div>`, { noFocus: true });
  }

  /* ---------- mount ---------- */
  V.eventMount = function (id) {
    const e = Store.getEvent(id); const root = $('.n3-p-event'); if (!e || !root) return;

    /* first FAQ open on desktop only (board: open on desktop, closed on phone) */
    if (innerWidth > 900) { const f = $('details[data-first]', root); if (f) f.open = true; }

    const repaintBox = () => { const a = $('.n3e-aside', root); if (!a) return; ensureSel(e); a.innerHTML = buyBox(e); wireBox(); };
    function wireBox() {
      const box = $('#evBox'); if (!box) return;
      $$('input[name="evTier"]', box).forEach(r => r.addEventListener('change', () => { SEL.tier = r.value; SEL.qty = 1; repaintBox(); const n = $(`input[value="${r.value}"]`, $('#evBox')); if (n) n.focus(); }));
      $$('[data-q]', box).forEach(bt => bt.addEventListener('click', () => { SEL.qty += +bt.dataset.q; repaintBox(); const again = $(`#evBox [data-q="${bt.dataset.q}"]`); if (again && !again.disabled) again.focus(); else { const o = $('#evBox .n3e-qty output'); if (o) o.focus && o.focus(); } }));
      const sp = $('[data-split]', box); if (sp) sp.onclick = () => {
        const t = e.tiers.find(x => x.id === SEL.tier);
        if (SEL.qty < 2 && t && tierLeft(t) >= 2) { SEL.qty = 2; repaintBox(); toast('Added a second ticket. Split it on MoMo at checkout.'); return; }
        toast(`Split on: after you pay, each friend gets a MoMo request for ${moneyPlain(t ? t.price : 0)}.`);
        try { sessionStorage.setItem('nova.v3.split.' + e.id, '1'); } catch (x) {}
      };
      const cp = $('[data-copy]', box); if (cp) cp.onclick = () => copy(shareUrl(e));
      $$('[data-waitlist]', box).forEach(w => w.onclick = waitlist);
    }
    function waitlist() {
      const go = () => { try { localStorage.setItem('nova.v3.wait.' + e.id, '1'); } catch (x) {} toast("You're on the waitlist. We'll text you if tickets come back."); $$('[data-waitlist]').forEach(b => { b.textContent = "You're on the waitlist"; b.disabled = true; }); };
      if (!Store.user() && window.Auth) return Auth.open('login', go);
      go();
    }
    wireBox();
    $$('.n3e-bar [data-waitlist]', root).forEach(w => w.onclick = waitlist);

    $$('[data-cal]', root).forEach(b => b.onclick = () => { UI.icsFor(e); toast('Calendar file downloaded'); });
    $$('[data-share]', root).forEach(b => b.onclick = () => shareModal(e));
    const sl = $('[data-shareloc]', root); if (sl) sl.onclick = () => {
      const url = 'https://www.google.com/maps/search/?api=1&query=' + mapQ(e);
      if (navigator.share) { navigator.share({ title: e.venue.name, url }).catch(() => {}); return; }
      copy(url, 'Location link copied');
    };
    $$('[data-contact]', root).forEach(b => b.onclick = () => contactModal(e));
    $$('[data-who]', root).forEach(b => b.onclick = () => whoModal(e));
    $$('[data-follow]', root).forEach(b => b.onclick = () => {
      const oid = e.organizerId, name = Store.organizer(oid).name;
      const r = Store.toggleFollow(oid);
      if (r === null) { Auth.open('login', () => { if (!Store.isFollowing(oid)) Store.toggleFollow(oid); App.render(); toast('Following ' + name + '. Their new events land in your feed.'); }); return; }
      toast(r ? 'Following ' + name + '. Their new events land in your feed.' : 'Unfollowed ' + name);
      const y = scrollY; App.render(); scrollTo(0, y);
    });
    const back = $('[data-back]', root); if (back) back.onclick = ev => { if (PREV && !/^#\/(event|checkout)\//.test(PREV)) { ev.preventDefault(); history.back(); } };
    const more = $('#evMore'); if (more) more.onclick = () => { const open = root.classList.toggle('n3e-open'); more.setAttribute('aria-expanded', open); more.textContent = open ? 'Show less' : 'Read more'; };
    /* FAQ: one open at a time on phones keeps the page short */
    $$('.n3e-faq details', root).forEach(d => d.addEventListener('toggle', () => { if (d.open && innerWidth <= 900) $$('.n3e-faq details', root).forEach(o => { if (o !== d) o.open = false; }); }));
    $$('.n3e-mt-r[aria-disabled]', root).forEach(a => a.addEventListener('click', ev => ev.preventDefault()));
  };
})();
