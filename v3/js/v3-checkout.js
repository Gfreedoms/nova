/* Nova v3 — Checkout ("Nova 04 Checkout" board).
   Steps: Tickets → Details → Payment → Approve (MoMo / Airtel prompt, or card/bank processing) → Done.
   Free events: Tickets → Details → Done. Demo only: no real payments. */
(function () {
  const V = window.Views;
  const { esc, moneyPlain, toast, openModal, closeModal, dFmt, remaining } = UI;
  const IC = N3.IC;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const HOLD_MIN = 10, MOMO_SECS = 60, RESEND_SECS = 20, AUTO_APPROVE = 8, DECLINE_CARD = '4000000000000002';
  const PAY = {
    mtn: { name: 'MTN Mobile Money', short: 'MTN MoMo', tile: 'MoMo', chip: 'MTN', pin: 'MoMo', dial: '*165*8#', pre: '076 / 077 / 078', eg: '772 481 093' },
    airtel: { name: 'Airtel Money', short: 'Airtel Money', tile: 'Airtel', chip: 'Airtel', pin: 'Airtel Money', dial: '*185*9#', pre: '070 / 074 / 075', eg: '701 339 208' },
    card: { name: 'Visa or Mastercard', short: 'card', tile: 'Card' },
    bank: { name: 'Bank transfer', short: 'bank transfer', tile: 'Bank' }
  };
  /* phones are kept as 9 national digits ("772481093"), shown as "0772 481 093" */
  const norm = v => { let d = String(v || '').replace(/\D/g, ''); if (d.startsWith('256')) d = d.slice(3); if (d.startsWith('0')) d = d.slice(1); return d.slice(0, 9); };
  const netOf = v => { const d = norm(v); if (d.length !== 9) return ''; if (/^(76|77|78|39)/.test(d)) return 'mtn'; if (/^(70|74|75|20)/.test(d)) return 'airtel'; return ''; };
  const validPhone = v => /^[237]\d{8}$/.test(norm(v));
  const pretty = d => String(d || '').replace(/^(\d{3})(\d{0,3})(\d{0,3}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' '));
  const fmtPhone = v => { const d = norm(v); return d.length === 9 ? '0' + pretty(d) : v; };
  const isMomo = m => m === 'mtn' || m === 'airtel';
  const TYPO = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.con': 'gmail.com', 'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'outlok.com': 'outlook.com' };
  const emailFix = v => { const m = (v || '').trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+)$/); return m && TYPO[m[2]] ? m[1] + '@' + TYPO[m[2]] : ''; };
  const num = n => Math.round(n).toLocaleString('en-US');
  const ugx = n => moneyPlain(n);
  const clock = s => { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const short = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };
  const splitName = n => { const p = (n || '').trim().split(/\s+/); return { first: p[0] || '', last: p.slice(1).join(' ') }; };
  const sameDay = (a, b) => { const x = new Date(a), y = new Date(b); return x.toDateString() === y.toDateString(); };
  const dateBig = e => { const p = N3.dateParts(e.start); if (!sameDay(e.start, e.end) && new Date(e.end) - new Date(e.start) > 20 * 3600e3) return p.dd + '–' + N3.dateParts(e.end).dd; return p.dd + ' ' + p.mon; };
  const dateLine = e => { const f = iso => dFmt(iso, { weekday: 'short', day: 'numeric', month: 'short' }); return !sameDay(e.start, e.end) && new Date(e.end) - new Date(e.start) > 20 * 3600e3 ? f(e.start) + ' – ' + f(e.end) : f(e.start) + ' · ' + N3.hhmm(e.start); };

  let CK = null, lastBuyer = null;

  function freshCK(e, tier) {
    const u = Store.user();
    let buyer;
    if (lastBuyer) buyer = Object.assign({}, lastBuyer);
    else {
      const prev = u && Store.myOrders ? Store.myOrders()[0] : null;
      const phoneUser = u && /@phone\.nova$/.test(u.email || '');
      buyer = { name: u ? u.name : '', email: u && !phoneUser ? u.email : (prev && prev.buyer ? prev.buyer.email || '' : ''),
        phone: norm((prev && prev.buyer && prev.buyer.phone) || (phoneUser ? u.email.split('@')[0] : '') || (u && u.phone) || ''), wa: true };
    }
    const c = { eventId: e.id, step: 1, qty: {}, promo: null, promoCode: '', promoErr: '', promoOpen: false, pay: '', err: null,
      buyer, attendees: false, names: [], payer: { phone: '', cardName: '', cardNo: '', exp: '', cvc: '' }, editPhone: false,
      split: false, friends: 1, holdUntil: Date.now() + HOLD_MIN * 60000, order: null, proc: false, declined: '' };
    e.tiers.forEach(t => c.qty[t.id] = 0);
    const avail = e.tiers.filter(t => t.qty - t.sold > 0);
    const pick = tier && avail.find(t => t.id === tier);
    if (pick) c.qty[pick.id] = 1; else if (avail.length === 1) c.qty[avail[0].id] = 1;
    return c;
  }

  function checkoutPage(id) {
    const e = Store.getEvent(id);
    if (!e) return V.notFound('That event could not be found.');
    if (new Date(e.end) < new Date() || remaining(e) === 0) return V.notFound('Tickets for this event are no longer available.');
    const tier = new URLSearchParams((location.hash.split('?')[1]) || '').get('tier');
    if (!CK || CK.eventId !== id || CK.step === 'done' || CK.holdUntil < Date.now()) CK = freshCK(e, tier);
    else if (tier && Object.values(CK.qty).every(q => !q) && e.tiers.some(t => t.id === tier && t.qty - t.sold > 0)) CK.qty[tier] = 1;
    if (CK.step === 'approve') { CK.step = 'pay'; CK.proc = false; }
    return `<div class="n3-page n3-p-checkout" id="ck"></div>`;
  }

  function totals(e) {
    const items = e.tiers.filter(t => CK.qty[t.id] > 0).map(t => ({ tierId: t.id, name: t.name, price: t.price, qty: CK.qty[t.id] }));
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
    const disc = CK.promo ? Math.round(sub * CK.promo.pct / 100) : 0;
    const count = items.reduce((s, i) => s + i.qty, 0);
    const fees = Store.feeFor(sub - disc, count);
    const total = sub - disc + fees;
    const split = CK.split && total > 0;
    const parts = split ? CK.friends + 1 : 1;
    const share = split ? Math.floor(total / parts / 100) * 100 : 0;
    const mine = split ? total - share * CK.friends : total;
    return { items, sub, disc, fees, count, total, split, share, mine };
  }

  function checkoutMount(id) {
    const e = Store.getEvent(id); const root = $('#ck'); if (!e || !root) return;
    let holdTimer = null, momoTimer = null, procTimer = null, autoTimer = null, friendTimer = null;
    const T = () => totals(e);
    const freeFlow = () => { const t = T(); return t.count ? t.total === 0 : e.tiers.every(x => x.price === 0); };
    const keys = () => freeFlow() ? [1, 2, 'done'] : [1, 2, 'pay', 'approve', 'done'];
    const labels = () => freeFlow() ? ['Tickets', 'Details', 'Done'] : ['Tickets', 'Details', 'Payment', 'Approve', 'Done'];
    const idx = () => Math.max(0, keys().indexOf(CK.step));
    const holdLeft = () => (CK.holdUntil - Date.now()) / 1000;
    const clearFlow = () => { clearInterval(momoTimer); clearTimeout(procTimer); clearTimeout(autoTimer); clearTimeout(friendTimer); momoTimer = procTimer = autoTimer = friendTimer = null; };
    const mismatch = () => isMomo(CK.pay) && netOf(CK.payer.phone) && netOf(CK.payer.phone) !== CK.pay;
    const fromDetails = () => isMomo(CK.pay) && !CK.editPhone && netOf(CK.payer.phone) === CK.pay;

    /* ---------- header hold timer (fills the core header's #n3HdTimer) ---------- */
    const hd = $('#n3HdTimer');
    const paintHold = () => {
      if (!hd) return;
      if (CK.step === 'done') { hd.innerHTML = ''; return; }
      const s = holdLeft();
      if (!$('.ck-hold', hd)) hd.innerHTML = `<span class="ck-hold" role="timer" aria-label="Seats held for"><i aria-hidden="true"></i><span class="l">Seats held for</span><b id="ckHold">${clock(s)}</b></span>`;
      $('#ckHold').textContent = clock(s);
      $('.ck-hold', hd).classList.toggle('warn', s < 120);
      $$('.ck-holdtxt', root).forEach(x => x.textContent = clock(s));
    };

    /* ---------- pieces ---------- */
    const tabs = () => `<nav class="ck-tabs" aria-label="Checkout steps" style="--n:${keys().length}">${labels().map((l, i) => {
      const c = idx(), done = CK.step !== 'done' && i < c, cur = i === c;
      return `<button type="button" class="ck-tab ${cur ? 'cur' : ''} ${done ? 'done' : ''}" ${done ? `data-goto="${keys()[i]}"` : 'disabled'} ${cur ? 'aria-current="step"' : ''}><b>0${i + 1}</b><span>${l}</span></button>`;
    }).join('')}</nav>`;

    const mbar = () => {
      const n = keys().length - 1, i = Math.min(idx() + 1, n);
      return `<div class="ck-mbar"><button type="button" class="ck-mback" data-back aria-label="${CK.step === 1 ? 'Back to event' : 'Previous step'}">${IC.back}</button><span>Step ${i} of ${n}</span></div>
        <div class="ck-prog" aria-hidden="true"><i style="width:${Math.round(i / n * 100)}%"></i></div>`;
    };

    const sumLines = () => {
      const t = T();
      if (!t.count) return `<p class="ck-sum-empty">Pick your tickets to see the total.</p>`;
      return `<div class="ck-lines">${t.items.map(i => `<div><span>${i.qty} × ${esc(i.name)}</span><span>${i.price ? num(i.price * i.qty) : 'Free'}</span></div>`).join('')}
        ${t.disc ? `<div class="jac"><span>Promo ${esc(CK.promo.code.toUpperCase())} · ${CK.promo.pct}% off</span><span>−${num(t.disc)}</span></div>` : ''}
        ${t.fees ? `<div class="mut"><span>Service fee</span><span>${num(t.fees)}</span></div>` : ''}
        ${t.split ? `<div class="jac"><span>Split · ${CK.friends === 1 ? 'your friend pays' : CK.friends + ' friends pay'}</span><span>−${num(t.share * CK.friends)}</span></div>` : ''}</div>`;
    };
    const summary = () => {
      const t = T();
      return `<aside class="ck-sum" aria-label="Order summary"><div class="ck-sum-card">
        <div class="ck-sum-ph">${N3.img(e, 720, { duo: 'jac', eager: true, alt: '' })}<span class="ck-sum-date">${esc(dateBig(e))}</span></div>
        <div class="ck-sum-b">
          <span class="ck-sum-t">${esc(e.title)}</span>
          <span class="ck-sum-w">${esc(e.online ? 'Online' : e.venue.name)} · ${esc(dateLine(e))}</span>
          ${sumLines()}
          <div class="ck-sum-tot"><b>${CK.step === 'done' ? (t.total ? 'Paid' : 'Total') : t.split ? 'You pay' : 'Total'}</b><span>${t.count ? (t.total ? ugx(t.mine) : 'Free') : '—'}</span></div>
          ${e.refund ? `<span class="ck-sum-note">${esc(e.refund)}</span>` : ''}
        </div></div></aside>`;
    };

    const cta = (label, cls, dis) => {
      const t = T();
      return `<div class="ck-cta">
        <button type="button" class="ck-cta-sum" aria-expanded="false" aria-controls="ckCtaLines"><span>${t.split ? 'You pay' : 'Total incl. fee'} ${IC.chev}</span><b>${t.count ? (t.total ? ugx(t.mine) : 'Free') : '—'}</b></button>
        <div class="ck-cta-lines" id="ckCtaLines" hidden>${sumLines()}</div>
        <button type="button" class="n3-btn lg ${cls || ''}" data-next ${dis ? 'disabled' : ''}>${label}</button></div>`;
    };

    /* ---------- step 1: tickets ---------- */
    const s1 = () => {
      const t = T();
      const rows = e.tiers.map(tr => {
        const l = tr.qty - tr.sold, out = l <= 0, q = CK.qty[tr.id], max = Math.min(10, l);
        return `<div class="ck-tier ${q ? 'on' : ''} ${out ? 'out' : ''}">
          <span class="ck-tier-i"><b>${esc(tr.name)}</b><span>${tr.desc ? `<span class="desc">${esc(tr.desc)} · </span>` : ''}${tr.price ? ugx(tr.price) : 'Free'}${!out && l <= 20 ? ` · <em>only ${l} left</em>` : ''}</span></span>
          ${out ? '<span class="ck-sold">Sold out</span>' : `<span class="ck-qty" role="group" aria-label="${esc(tr.name)} quantity"><button type="button" data-dec="${tr.id}" ${q <= 0 ? 'disabled' : ''} aria-label="One fewer ${esc(tr.name)}">−</button><output aria-live="polite">${q}</output><button type="button" data-inc="${tr.id}" ${q >= max ? 'disabled' : ''} aria-label="One more ${esc(tr.name)}">+</button></span>`}
          <span class="ck-tier-t">${q ? (tr.price ? num(tr.price * q) : 'Free') : '—'}</span></div>`;
      }).join('');
      const promo = CK.promo
        ? `<div class="ck-promo-on">${IC.check}<span><b>${esc(CK.promo.code.toUpperCase())}</b> · ${CK.promo.pct}% off applied</span><button type="button" class="n3-link" id="ckPromoX">Remove</button></div>`
        : `<button type="button" class="n3-link ck-promo-tg" id="ckPromoTg" aria-expanded="${CK.promoOpen}">+ Add a promo code</button>
          <div class="n3-field promo ${CK.promoErr ? 'bad' : ''}"><label for="ckPromo">Promo code</label>
            <div class="n3-input"><input id="ckPromo" value="${esc(CK.promoCode)}" placeholder="e.g. NOVA10" autocomplete="off" autocapitalize="characters" aria-describedby="ckPromoH"><button type="button" class="ck-apply" id="ckApply">Apply</button></div>
            <span class="n3-hint" id="ckPromoH">${CK.promoErr ? esc(CK.promoErr) : ''}</span></div>`;
      return `<h1 class="ck-h" tabindex="-1">How many?</h1>
        <span class="ck-msub">${esc(e.title)} · ${esc(dateBig(e))}</span>
        <div class="ck-tiers">${rows}</div>
        <div class="ck-promo ${CK.promoOpen || CK.promo || CK.promoErr ? 'open' : ''}">${promo}</div>
        ${cta(t.count ? `Continue · ${t.total ? ugx(t.total) : 'Free'}` : 'Choose at least one ticket', '', !t.count)}`;
    };

    /* ---------- step 2: details ---------- */
    const phoneHint = d => { const n = netOf(d); return n ? `${IC.check} ${n === 'mtn' ? 'MTN' : 'Airtel'} number — we'll send the ${PAY[n].pin} prompt here` : validPhone(d) ? 'We\'ll text your tickets here.' : ''; };
    const fixHtml = v => { const f = emailFix(v); return f ? `Did you mean <button type="button" class="n3-link inl" data-fix="${esc(f)}">${esc(f)}</button>? Tap to fix.` : ''; };
    const s2 = () => {
      const b = CK.buyer, t = T(), n = netOf(b.phone);
      return `<h1 class="ck-h" tabindex="-1">Who's going?</h1>
        <p class="ck-lede">Tickets land on your phone in seconds — by SMS, WhatsApp and email.</p>
        ${!Store.user() ? `<p class="ck-login">Have a Nova account? <button type="button" class="n3-link inl" id="ckLogin">Log in</button> and we'll fill this in.</p>` : ''}
        <div class="ck-form">
          <div class="n3-field full"><label for="ckName">Full name</label><input class="n3-input" id="ckName" name="name" value="${esc(b.name)}" autocomplete="name" placeholder="e.g. Brenda Nakato" required></div>
          <div class="n3-field ck-phone ${n ? 'ok' : ''}" id="ckPhoneF"><label for="ckPhone">Phone number</label>
            <div class="n3-input"><span class="pre">+256</span><input id="ckPhone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="772 481 093" value="${esc(pretty(b.phone))}" aria-describedby="ckPhoneH" required><span class="n3-net ${n}" id="ckNet">${n ? PAY[n].chip : ''}</span></div>
            <span class="n3-hint" id="ckPhoneH">${phoneHint(b.phone)}</span></div>
          <div class="n3-field ck-email"><label for="ckEmail">Email</label><input class="n3-input" id="ckEmail" type="email" value="${esc(b.email)}" autocomplete="email" placeholder="you@example.com" aria-describedby="ckEmailH" required>
            <span class="ck-fix" id="ckEmailH" aria-live="polite">${fixHtml(b.email)}</span></div>
        </div>
        <label class="n3-check"><input type="checkbox" id="ckWa" ${b.wa ? 'checked' : ''}>Also send my tickets on WhatsApp</label>
        ${t.count > 1 ? `<label class="n3-check"><input type="checkbox" id="ckAtt" ${CK.attendees ? 'checked' : ''}>Tickets are for different people — add each name</label>
          <div class="ck-att" id="ckAttList" ${CK.attendees ? '' : 'hidden'}>${Array.from({ length: t.count }, (_, i) => `<div class="n3-field"><label for="ckAtt${i}">Ticket ${i + 1}${i === 0 ? ' (you)' : ''}</label><input class="n3-input" id="ckAtt${i}" data-att="${i}" value="${esc(CK.names[i] || (i === 0 ? b.name : ''))}" placeholder="Full name"></div>`).join('')}</div>` : ''}
        <p class="ck-terms">By continuing you agree to Nova's <a href="#/terms">Terms</a> and the organiser's refund policy.</p>
        <div class="ck-err" id="ckErr" role="alert" hidden></div>
        ${freeFlow() ? cta(t.count > 1 ? 'Get my free tickets' : 'Get my free ticket') : cta('Continue to payment')}`;
    };

    /* ---------- step 3: payment ---------- */
    const errNetwork = () => {
      const m = CK.pay, other = m === 'mtn' ? 'airtel' : 'mtn', d = norm(CK.payer.phone);
      return `<div class="ck-errbox" id="ckNetErr">
        <span class="k">Wrong network</span>
        <h2>That's ${other === 'airtel' ? 'an Airtel' : 'an MTN'} number.</h2>
        <div class="n3-field bad"><label for="ckPayPhone">${PAY[m].short} number</label>
          <div class="n3-input"><span class="pre">+256</span><input id="ckPayPhone" type="tel" inputmode="numeric" autocomplete="tel-national" value="${esc(pretty(d))}" aria-describedby="ckNetMsg"><span class="n3-net ${other}">${PAY[other].chip}</span></div></div>
        <p role="alert" id="ckNetMsg">You chose ${PAY[m].short}, but 0${esc(d.slice(0, 2))} numbers are ${PAY[other].chip}. Switch and we'll send the prompt there — or use ${m === 'mtn' ? 'an MTN' : 'an Airtel'} number.</p>
        <div class="acts"><button type="button" class="n3-btn ${other === 'mtn' ? 'momo' : 'airtel'}" id="ckSwitchNet">Pay with ${PAY[other].short}</button><button type="button" class="n3-btn sec" id="ckOtherNum">Use ${m === 'mtn' ? 'an MTN' : 'an Airtel'} number</button></div>
      </div>`;
    };
    const errDeclined = () => `<div class="ck-errbox" role="alert" id="ckDecl">
        <span class="k">Card declined</span>
        <h2>Your bank said no.</h2>
        <div class="ck-declcard"><b>VISA •••• ${esc(CK.declined)}</b><span>Declined</span></div>
        <p><b>Nothing was charged.</b> Many Ugandan cards block online payments by default — call your bank, or pay with Mobile Money in two taps.</p>
        <div class="acts"><button type="button" class="n3-btn ${netOf(CK.buyer.phone) === 'airtel' ? 'airtel' : 'momo'}" id="ckDeclMomo">Pay with ${PAY[netOf(CK.buyer.phone) || 'mtn'].short} instead</button><button type="button" class="n3-btn sec" id="ckDeclRetry">Try another card</button></div>
      </div>`;
    const payBody = () => {
      const m = CK.pay, p = CK.payer, t = T();
      if (isMomo(m)) {
        if (mismatch()) return errNetwork();
        if (fromDetails()) return `<div class="ck-momo-line">${IC.phone}<span>We'll send the ${PAY[m].pin} prompt to <b>${esc(fmtPhone(p.phone))}</b></span><button type="button" class="n3-link" id="ckEditPhone">Change</button></div>`;
        const n = netOf(p.phone);
        return `<div class="n3-field ${n === m ? 'ok' : ''}"><label for="ckPayPhone">${PAY[m].short} number</label>
          <div class="n3-input"><span class="pre">+256</span><input id="ckPayPhone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="${PAY[m].eg}" value="${esc(pretty(norm(p.phone)))}" aria-describedby="ckPayPhoneH"><span class="n3-net ${n}" id="ckPayNet">${n ? PAY[n].chip : ''}</span></div>
          <span class="n3-hint" id="ckPayPhoneH">Use a ${PAY[m].pre} number. You'll approve with your PIN.</span></div>`;
      }
      if (m === 'card') return `<div class="ck-card">
          <div class="n3-field full"><label for="ckCardName">Name on card</label><input class="n3-input" id="ckCardName" name="cardName" value="${esc(p.cardName || CK.buyer.name)}" autocomplete="cc-name"></div>
          <div class="n3-field full"><label for="ckCardNo">Card number</label><div class="n3-input"><input id="ckCardNo" name="cardNo" inputmode="numeric" value="${esc(p.cardNo)}" placeholder="1234 5678 9012 3456" autocomplete="cc-number" maxlength="23" aria-describedby="ckCardH"><b class="ck-brand" id="ckBrand"></b></div>
            <span class="n3-hint" id="ckCardH">Demo cards: 4242 4242 4242 4242 approves · 4000 0000 0000 0002 declines.</span></div>
          <div class="n3-field"><label for="ckExp">Expiry</label><input class="n3-input" id="ckExp" name="exp" value="${esc(p.exp)}" placeholder="MM / YY" autocomplete="cc-exp" inputmode="numeric" maxlength="7"></div>
          <div class="n3-field"><label for="ckCvc">Security code</label><input class="n3-input" id="ckCvc" name="cvc" value="${esc(p.cvc)}" placeholder="123" inputmode="numeric" autocomplete="cc-csc" maxlength="4"></div>
        </div>`;
      if (m === 'bank') return `<dl class="ck-bank">
          <div><dt>Bank</dt><dd>Stanbic Bank Uganda (demo)</dd></div><div><dt>Account name</dt><dd>Nova Events Ltd</dd></div>
          <div><dt>Account no.</dt><dd>9030 0123 4567</dd></div><div><dt>Reference</dt><dd>NV${esc(e.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-4))}${String(t.mine).slice(-4)}</dd></div>
          <div><dt>Amount</dt><dd>${ugx(t.mine)}</dd></div></dl><p class="n3-hint">Use the reference exactly so we can match your payment. Seats stay held while it clears.</p>`;
      return '';
    };
    const splitBox = () => {
      const t = T(), me = netOf(CK.buyer.phone);
      const msg = f => encodeURIComponent(`Hey! I'm getting tickets to ${e.title} on Nova. Your share is ${ugx(t.share)} — pay it on MoMo or Airtel here: ${location.href.split('#')[0]}#/event/${e.id}`);
      return `<div class="ck-split ${CK.split ? 'on' : ''}">
        <label class="ck-switch"><input type="checkbox" id="ckSplit" ${CK.split ? 'checked' : ''}><span class="tr" aria-hidden="true"></span><b>Split with friends</b><small>Each pays their share on MoMo or Airtel</small></label>
        ${CK.split ? `<div class="ck-split-n"><span>How many friends?</span><span class="ck-qty sm" role="group" aria-label="Number of friends"><button type="button" id="ckFrDec" ${CK.friends <= 1 ? 'disabled' : ''} aria-label="One fewer friend">−</button><output aria-live="polite">${CK.friends}</output><button type="button" id="ckFrInc" ${CK.friends >= 9 ? 'disabled' : ''} aria-label="One more friend">+</button></span></div>
          <div class="ck-shares">
            <div class="ck-share me"><span><b>You</b><small>${CK.buyer.phone ? esc(fmtPhone(CK.buyer.phone)) + (me ? ' · ' + PAY[me].chip : '') : 'Your share'}</small></span><b>${ugx(t.mine)}</b></div>
            ${Array.from({ length: CK.friends }, (_, i) => `<div class="ck-share"><span><b>Friend ${i + 1}</b><small><a href="https://wa.me/?text=${msg(i)}" target="_blank" rel="noopener" class="ck-walink">${IC.wa}Request on WhatsApp</a></small></span><b>${ugx(t.share)}</b></div>`).join('')}
          </div>
          <span class="ck-split-note">Each friend gets a WhatsApp link and their own prompt. Seats stay held while you all pay.</span>` : ''}
      </div>`;
    };
    const payCta = () => {
      const t = T(), m = CK.pay, amt = (t.split ? 'my ' : '') + ugx(t.mine);
      if (m === 'mtn') return cta(`Pay ${amt} with MoMo`, 'momo');
      if (m === 'airtel') return cta(`Pay ${amt} with Airtel Money`, 'airtel');
      if (m === 'card') return cta(`Pay ${amt} by card`);
      if (m === 'bank') return cta('I\'ve made the transfer', 'ink');
      return cta('Choose how to pay', '', true);
    };
    const s3 = () => {
      const m = CK.pay, bn = netOf(CK.buyer.phone);
      const sub = k => {
        if (isMomo(k)) return bn === k ? `${esc(fmtPhone(CK.buyer.phone))} · prompt on your phone` : `Use a ${PAY[k].pre} number`;
        if (k === 'card') return CK.err === 'declined' ? `VISA •••• ${esc(CK.declined)} · declined` : 'Visa, Mastercard · 3-D Secure';
        return 'Stanbic, Centenary, DFCU · confirms in ~2 hrs';
      };
      const row = k => { const on = m === k, bad = k === 'card' && CK.err === 'declined' && m === 'card';
        return `<label class="ck-m ${on ? 'on' : ''} ${bad ? 'bad' : ''}"><input type="radio" class="n3-sr" name="ckPay" value="${k}" ${on ? 'checked' : ''}><i class="ck-radio" aria-hidden="true"></i><span class="ck-tile ${k}">${PAY[k].tile}</span><span class="ck-m-t"><b>${PAY[k].name}</b><small>${sub(k)}</small></span>${k === (bn || 'mtn') ? '<span class="ck-fast">Fastest</span>' : '<span></span>'}</label>`; };
      return `<h1 class="ck-h" tabindex="-1">Pay how?</h1>
        ${CK.err === 'declined' ? errDeclined() : ''}
        <div class="ck-methods" role="radiogroup" aria-label="Payment method">${['mtn', 'airtel', 'card', 'bank'].map(row).join('')}</div>
        ${payBody()}
        ${splitBox()}
        <div class="ck-err" id="ckErr" role="alert" hidden></div>
        ${payCta()}
        <p class="ck-demo">${IC.lock} Demo checkout — no real money moves.</p>`;
    };

    /* ---------- step 4: approve ---------- */
    const friendRows = mePaid => { const t = T(); if (!t.split) return '';
      return `<div class="ck-rows">
        <div><span>You · ${esc(PAY[CK.pay].chip || PAY[CK.pay].tile)}</span><span class="${mePaid ? 'paid' : 'wait'}">${mePaid ? IC.check + ' Paid ' + ugx(t.mine) : '● Waiting for PIN'}</span></div>
        ${Array.from({ length: CK.friends }, (_, i) => `<div><span>Friend ${i + 1}</span><span class="wait" data-friend="${i}">● Link sent on WhatsApp</span></div>`).join('')}</div>`; };
    const sApprove = () => {
      const t = T(), m = CK.pay;
      if (CK.proc) return `<div class="ck-approve proc">
        <div class="ck-ap-top"><div class="ck-ring spin" aria-hidden="true"><svg viewBox="0 0 240 240"><circle class="bg" cx="120" cy="120" r="104"/><circle class="fg" cx="120" cy="120" r="104"/></svg><span><b>${m === 'card' ? '3DS' : 'BANK'}</b><small>CHECKING</small></span></div>
        <div class="ck-ap-c"><span class="ck-ap-k">Step 4 of 4 · ${m === 'card' ? 'Verify' : 'Confirm'}</span><h1 class="ck-h" tabindex="-1">Hold tight.</h1>
          <p class="ck-ap-serif">${m === 'card' ? `Checking <b>${ugx(t.mine)}</b> with your bank.` : `Matching your transfer of <b>${ugx(t.mine)}</b>.`}</p>
          <p class="ck-ap-m">${m === 'card' ? 'Your bank may ask you to confirm. Please don\'t close this page.' : 'In this demo we confirm it straight away.'}</p></div></div></div>`;
      if (CK.err === 'timeout') return `<div class="ck-approve to">
        <div class="ck-ap-top"><div class="ck-ring" aria-hidden="true"><svg viewBox="0 0 240 240"><circle class="fg" cx="120" cy="120" r="104"/></svg><span><b>00:00</b><small>TIMED OUT</small></span></div>
        <div class="ck-ap-c" role="alert"><span class="ck-ap-k err">Prompt timed out</span><h1 class="ck-h" tabindex="-1">The prompt<br>timed out.</h1>
          <p class="ck-ap-p">No money left your account. Your seats are still held for <b class="ck-holdtxt">${clock(holdLeft())}</b>.</p>
          <div class="ck-ap-acts"><button type="button" class="n3-btn ${m === 'mtn' ? 'momo' : 'airtel'}" id="ckNewPrompt">Send a new prompt</button><button type="button" class="n3-btn sec" id="ckAnother">Pay another way</button></div></div></div></div>`;
      return `<div class="ck-approve">
        <div class="ck-ap-top">
          <div class="ck-ring" role="timer" aria-label="Time left to approve"><svg viewBox="0 0 240 240" aria-hidden="true"><circle class="bg" cx="120" cy="120" r="104"/><circle class="fg" id="ckRing" cx="120" cy="120" r="104"/></svg><span><b id="ckCount">${clock(MOMO_SECS)}</b><small>TO APPROVE</small></span></div>
          <div class="ck-ap-c"><span class="ck-ap-k">Step 4 of 4 · Approve</span>
            <h1 class="ck-h" tabindex="-1">Check your<br>phone.</h1>
            <p class="ck-ap-serif">Enter your ${PAY[m].pin} PIN to approve <b>${ugx(t.mine)}</b> to NOVA EVENTS.</p>
            <p class="ck-ap-m">Sent to ${esc(fmtPhone(CK.payer.phone))}. No prompt? Dial <b>${PAY[m].dial}</b> → My Approvals.</p>
            <div class="ck-ap-acts"><button type="button" class="ck-resend" id="ckResend" disabled>Resend prompt in 0:${RESEND_SECS}</button><button type="button" class="n3-link" id="ckChange">Change number</button><button type="button" class="n3-link" id="ckAnother">Pay another way</button></div>
          </div></div>
        ${friendRows(false)}
        <div class="ck-proto"><button type="button" id="ckSim">Prototype: PIN entered →</button><button type="button" class="n3-link" id="ckForceTo">Let it time out</button></div>
        <p class="ck-demo">Demo: approves by itself after ${AUTO_APPROVE} seconds. No real money moves.</p>
      </div>`;
    };

    /* ---------- step 5: done ---------- */
    const sDone = () => {
      const o = CK.order, t = T(), first = (o.buyer.first || 'friend');
      const wd = dFmt(e.start, { weekday: 'long' });
      const dek = wd === 'Friday' ? 'Your Friday, sorted.' : `Your Friday… well, ${wd}, sorted.`;
      const shown = o.tickets.slice(0, 4);
      const d = new Date(), stampDate = [d.getDate(), d.getMonth() + 1, d.getFullYear() % 100].map(n => String(n).padStart(2, '0')).join('·');
      const via = o.payment === 'free' ? 'FREE' : o.payment === 'mtn' ? 'MOMO' : o.payment === 'airtel' ? 'AIRTEL' : o.payment === 'card' ? 'CARD' : 'BANK';
      const share = encodeURIComponent(`I'm going to ${e.title}! Get tickets on Nova: ${location.href.split('#')[0]}#/event/${e.id}`);
      return `<div class="ck-done">
        <h1 class="ck-h xl" tabindex="-1">You're in,<br>${esc(first)}.</h1>
        <p class="ck-done-dek">${esc(dek)}</p>
        <p class="ck-done-sub">${o.tickets.length === 1 ? 'Your ticket is' : o.tickets.length + ' tickets are'} on your phone — sent by SMS${CK.buyer.wa ? ', WhatsApp' : ''} and to ${esc(o.buyer.email)}.${t.split ? ` Your ${CK.friends === 1 ? 'friend has' : 'friends have'} a WhatsApp link for ${CK.friends === 1 ? 'their' : 'each'} share.` : ''} Order <b>${esc(o.id)}</b>.</p>
        <div class="ck-stubs">${shown.map((tk, i) => `<div class="ck-stubw">${N3.ticketStub(o, Object.assign({}, tk, { tierName: tk.tierName + ' · ' + (i + 1) + ' of ' + o.tickets.length }), e)}${i === 0 ? `<span class="ck-stamp" data-stamp aria-label="${o.total ? 'Paid' : 'Confirmed'}">${o.total ? 'PAID' : 'FREE'}<small>${stampDate}${o.total ? " · " + via : ""}</small></span>` : ''}</div>`).join('')}
          ${o.tickets.length > shown.length ? `<a class="n3-link" href="#/tickets/${esc(o.id)}">+ ${o.tickets.length - shown.length} more in My tickets</a>` : ''}</div>
        <div class="ck-done-acts">
          <a class="n3-btn wa" href="https://wa.me/?text=${share}" target="_blank" rel="noopener">${IC.wa}Share on WhatsApp</a>
          <button type="button" class="n3-btn sec" id="ckCal">${IC.date}Add to calendar</button>
          <a class="n3-btn ink" href="#/tickets/${esc(o.id)}"><span class="d">View in My tickets</span><span class="m">My tickets</span></a>
          <button type="button" class="n3-link ck-replay" id="ckReplay">Replay stamp</button>
        </div>
        ${!Store.user() ? `<div class="ck-upsell"><div><b>Keep your tickets in one place.</b><span>Create a free Nova account with ${esc(fmtPhone(CK.buyer.phone))} to see them any time, on any phone.</span></div><button type="button" class="n3-btn sm ink" id="ckAcct">Create account</button></div>` : ''}
      </div>`;
    };

    /* ---------- paint ---------- */
    const paint = focus => {
      const s = CK.step;
      const inner = s === 1 ? s1() : s === 2 ? s2() : s === 'pay' ? s3() : s === 'approve' ? sApprove() : sDone();
      root.className = 'n3-page n3-p-checkout ck-s-' + s + (CK.err ? ' ck-e-' + CK.err : '');
      root.innerHTML = `${s !== 'done' && s !== 'approve' ? mbar() : ''}${tabs()}
        <div class="n3-wrap ck-grid"><div class="ck-main">${inner}</div>${summary()}</div>`;
      bind(); paintHold();
      if (focus) { const f = typeof focus === 'string' ? $(focus, root) : $('.ck-h', root); if (f) { f.focus({ preventScroll: true }); if (f.setSelectionRange && f.type !== 'email' && f.value) try { f.setSelectionRange(f.value.length, f.value.length); } catch (x) {} } }
    };
    const go = (s, extra) => {
      save(); clearFlow(); CK.step = s; if (extra) Object.assign(CK, extra);
      paint(true); window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' });
      if (s === 'done') setTimeout(() => window.novaStamp && window.novaStamp('.ck-stamp'), 150);
    };
    const save = () => {
      const v = s => { const el = $(s, root); return el ? el.value : null; };
      if (CK.step === 2) {
        if (v('#ckName') != null) CK.buyer.name = v('#ckName').trim();
        if (v('#ckPhone') != null) CK.buyer.phone = norm(v('#ckPhone'));
        if (v('#ckEmail') != null) CK.buyer.email = v('#ckEmail').trim();
        const wa = $('#ckWa', root); if (wa) CK.buyer.wa = wa.checked;
        $$('[data-att]', root).forEach(i => CK.names[+i.dataset.att] = i.value.trim());
      }
      if (CK.step === 'pay') {
        if (v('#ckPayPhone') != null) CK.payer.phone = norm(v('#ckPayPhone'));
        [['#ckCardName', 'cardName'], ['#ckCardNo', 'cardNo'], ['#ckExp', 'exp'], ['#ckCvc', 'cvc']].forEach(([s, k]) => { if (v(s) != null) CK.payer[k] = v(s).trim(); });
      }
      if (CK.step === 1 && v('#ckPromo') != null) CK.promoCode = v('#ckPromo').trim();
    };
    const fail = (msg, el) => {
      const er = $('#ckErr', root); if (er) { er.innerHTML = `<span>!</span>${esc(msg)}`; er.hidden = false; } else toast(msg);
      if (el) { el.setAttribute('aria-invalid', 'true'); const f = el.closest('.n3-field'); if (f) f.classList.add('bad'); el.focus(); }
      return false;
    };
    const clearInvalid = () => { $$('[aria-invalid]', root).forEach(i => { i.removeAttribute('aria-invalid'); const f = i.closest('.n3-field'); if (f && !f.id) f.classList.remove('bad'); }); const er = $('#ckErr', root); if (er) er.hidden = true; };

    const validDetails = () => {
      clearInvalid(); const b = CK.buyer;
      if (b.name.length < 2) return fail('Please enter your name — it goes on the ticket.', $('#ckName'));
      if (!validPhone(b.phone)) return fail('Enter your 9-digit mobile number, like 772 481 093.', $('#ckPhone'));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) return fail('Please enter a valid email address.', $('#ckEmail'));
      return true;
    };
    const validPay = () => {
      clearInvalid(); const m = CK.pay, p = CK.payer;
      if (!m) return fail('Choose how you want to pay.');
      if (isMomo(m)) {
        if (mismatch()) { const b = $('#ckNetErr'); if (b) { b.scrollIntoView({ block: 'center', behavior: reduce() ? 'auto' : 'smooth' }); $('#ckSwitchNet').focus(); } return false; }
        if (!validPhone(p.phone) || netOf(p.phone) !== m) return fail(`Enter your ${PAY[m].short} number (${PAY[m].pre}…).`, $('#ckPayPhone'));
      }
      if (m === 'card') {
        const no = p.cardNo.replace(/\D/g, '');
        if (!p.cardName) return fail('Enter the name on the card.', $('#ckCardName'));
        if (no.length < 13 || !luhn(no)) return fail('That card number looks incorrect — check the digits.', $('#ckCardNo'));
        const mm = p.exp.match(/^(\d{2})\s*\/\s*(\d{2})$/);
        if (!mm || +mm[1] < 1 || +mm[1] > 12 || new Date(2000 + +mm[2], +mm[1]) <= new Date()) return fail('Enter a valid, unexpired date (MM / YY).', $('#ckExp'));
        if (!/^\d{3,4}$/.test(p.cvc)) return fail('Enter the 3–4 digit security code on the back.', $('#ckCvc'));
      }
      return true;
    };

    const place = () => {
      clearFlow();
      try {
        const t = T(), nm = splitName(CK.buyer.name);
        const o = Store.placeOrder({ eventId: e.id, items: t.items, buyer: { first: nm.first, last: nm.last, email: CK.buyer.email, phone: '0' + norm(CK.buyer.phone) }, payment: t.total === 0 ? 'free' : CK.pay, promo: CK.promo });
        if (CK.attendees) o.tickets.forEach((tk, i) => { if (CK.names[i]) tk.holder = CK.names[i]; });
        if (t.split) o.split = { friends: CK.friends, share: t.share, mine: t.mine };
        lastBuyer = Object.assign({}, CK.buyer);
        CK.order = o; go('done');
        if (window.App && App.renderHeader) App.renderHeader();
        if (window.NovaConfetti && !reduce()) { const cv = document.createElement('canvas'); cv.className = 'co-confetti'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv); const c = NovaConfetti(cv); setTimeout(() => { c.stop(); cv.remove(); }, 4500); }
      } catch (x) { CK.step = 1; paint(true); toast(x.message); }
    };

    const startMomo = () => {
      save(); clearFlow(); CK.err = null; CK.proc = false; CK.step = 'approve'; paint(true); window.scrollTo(0, 0);
      let n = MOMO_SECS, r = RESEND_SECS;
      const C = 2 * Math.PI * 104;
      const tick = () => {
        const c = $('#ckCount', root), ring = $('#ckRing', root), rs = $('#ckResend', root); if (!c) return clearInterval(momoTimer);
        c.textContent = clock(n); ring.style.strokeDashoffset = (C * (1 - n / MOMO_SECS)).toFixed(1);
        if (rs) { rs.disabled = r > 0; rs.textContent = r > 0 ? 'Resend prompt in ' + short(r) : 'Resend prompt'; }
      };
      const arm = () => { clearTimeout(autoTimer); autoTimer = setTimeout(() => { if (CK.step === 'approve' && !CK.err) place(); }, AUTO_APPROVE * 1000); };
      tick(); arm();
      momoTimer = setInterval(() => { n--; r = Math.max(0, r - 1); tick(); if (n <= 0) timeout(); }, 1000);
      if (T().split) friendTimer = setTimeout(() => $$('[data-friend]', root).forEach((x, i) => { if (i === 0) { x.className = 'paid'; x.innerHTML = IC.check + ' Paid ' + ugx(T().share); } }), 3000);
      $('#ckResend', root).onclick = () => { n = MOMO_SECS; r = RESEND_SECS; tick(); arm(); toast('New prompt sent to ' + fmtPhone(CK.payer.phone)); };
      $('#ckSim', root).onclick = place;
      $('#ckForceTo', root).onclick = timeout;
    };
    const timeout = () => { clearFlow(); CK.err = 'timeout'; paint(true); };
    const startProc = () => {
      save(); clearFlow(); CK.err = null; CK.proc = true; CK.step = 'approve'; paint(true); window.scrollTo(0, 0);
      procTimer = setTimeout(() => {
        const no = CK.payer.cardNo.replace(/\D/g, '');
        if (CK.pay === 'card' && no === DECLINE_CARD) { CK.proc = false; CK.declined = no.slice(-4); go('pay', { err: 'declined' }); return; }
        place();
      }, CK.pay === 'card' ? 2200 : 1600);
    };

    /* ---------- events ---------- */
    function bind() {
      const next = () => {
        save();
        if (CK.step === 1) { if (!T().count) return; return go(2, { err: null }); }
        if (CK.step === 2) {
          if (!validDetails()) return;
          if (freeFlow()) { $$('[data-next]', root).forEach(b => { b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = 'Confirming…'; }); return setTimeout(place, 600); }
          const n = netOf(CK.buyer.phone);
          if (!CK.pay || (isMomo(CK.pay) && !CK.editPhone)) CK.pay = CK.pay && !isMomo(CK.pay) ? CK.pay : (n || 'mtn');
          if (!CK.editPhone) CK.payer.phone = CK.buyer.phone;
          return go('pay', { err: CK.err === 'declined' ? 'declined' : null });
        }
        if (CK.step === 'pay') {
          if (!validPay()) return;
          if (isMomo(CK.pay)) return startMomo();
          startProc();
        }
      };
      $$('[data-next]', root).forEach(b => b.onclick = next);
      $$('input', root).forEach(i => i.addEventListener('keydown', ev => { if (ev.key === 'Enter' && i.type !== 'checkbox' && i.type !== 'radio' && i.id !== 'ckPromo') { ev.preventDefault(); next(); } }));
      $$('[data-goto]', root).forEach(b => b.onclick = () => { const k = b.dataset.goto; go(isNaN(+k) ? k : +k, { err: null, proc: false }); });
      $$('[data-back]', root).forEach(b => b.onclick = () => {
        if (CK.step === 1) { location.hash = '#/event/' + e.id; return; }
        go(CK.step === 2 ? 1 : 2, { err: CK.step === 'pay' ? null : CK.err });
      });
      const cs = $('.ck-cta-sum', root); if (cs) cs.onclick = () => { const l = $('#ckCtaLines', root), o = l.hidden; l.hidden = !o; cs.setAttribute('aria-expanded', String(o)); };

      /* step 1 */
      $$('[data-inc]', root).forEach(b => b.onclick = () => { CK.qty[b.dataset.inc]++; save(); paint(); const f = $(`[data-inc="${b.dataset.inc}"]`, root); (f && !f.disabled ? f : $(`[data-dec="${b.dataset.inc}"]`, root)).focus(); });
      $$('[data-dec]', root).forEach(b => b.onclick = () => { CK.qty[b.dataset.dec]--; save(); paint(); const f = $(`[data-dec="${b.dataset.dec}"]`, root); (f && !f.disabled ? f : $(`[data-inc="${b.dataset.dec}"]`, root)).focus(); });
      const ap = $('#ckApply', root);
      if (ap) {
        const apply = () => { CK.promoCode = $('#ckPromo', root).value.trim(); if (!CK.promoCode) { CK.promoErr = 'Type a code first.'; return paint('#ckPromo'); } const p = Store.validatePromo(CK.promoCode, e); CK.promo = p; CK.promoErr = p ? '' : `"${CK.promoCode.toUpperCase()}" isn't valid for this event. Try NOVA10.`; if (p) toast(p.pct + '% off applied'); paint(p ? '#ckPromoX' : '#ckPromo'); };
        ap.onclick = apply; $('#ckPromo', root).onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); apply(); } };
      }
      const pt = $('#ckPromoTg', root); if (pt) pt.onclick = () => { CK.promoOpen = true; $('.ck-promo', root).classList.add('open'); pt.setAttribute('aria-expanded', 'true'); $('#ckPromo', root).focus(); };
      const px = $('#ckPromoX', root); if (px) px.onclick = () => { CK.promo = null; CK.promoCode = ''; CK.promoErr = ''; paint('#ckPromo'); };

      /* step 2 */
      const ph = $('#ckPhone', root);
      if (ph) {
        ph.oninput = () => { const d = norm(ph.value), n = netOf(d); CK.buyer.phone = d; const chip = $('#ckNet', root); chip.className = 'n3-net ' + n; chip.textContent = n ? PAY[n].chip : ''; $('#ckPhoneH', root).innerHTML = phoneHint(d); const f = $('#ckPhoneF', root); f.classList.toggle('ok', !!n); if (n || validPhone(d)) { f.classList.remove('bad'); ph.removeAttribute('aria-invalid'); } };
        ph.onblur = () => { const d = norm(ph.value); if (d) ph.value = pretty(d); };
      }
      const em = $('#ckEmail', root);
      if (em) {
        const bindFix = () => $$('[data-fix]', root).forEach(b => b.onclick = () => { em.value = b.dataset.fix; CK.buyer.email = b.dataset.fix; $('#ckEmailH', root).innerHTML = ''; em.focus(); });
        em.oninput = () => { CK.buyer.email = em.value.trim(); $('#ckEmailH', root).innerHTML = fixHtml(em.value); bindFix(); };
        bindFix();
      }
      const att = $('#ckAtt', root); if (att) att.onchange = () => { save(); CK.attendees = att.checked; $('#ckAttList', root).hidden = !att.checked; if (att.checked) { const a0 = $('[data-att="0"]', root); if (a0 && !a0.value) a0.value = CK.buyer.name; } };
      const li = $('#ckLogin', root); if (li && window.Auth) li.onclick = () => { save(); Auth.open('login', () => { const u = Store.user(); if (u) { CK.buyer.name = CK.buyer.name || u.name; if (!/@phone\.nova$/.test(u.email)) CK.buyer.email = CK.buyer.email || u.email; else CK.buyer.phone = CK.buyer.phone || norm(u.email.split('@')[0]); } if (window.App) App.renderHeader(); paint(); }); };

      /* step 3 */
      $$('input[name="ckPay"]', root).forEach(r => r.onchange = () => {
        save(); CK.pay = r.value; if (CK.err === 'declined' && r.value !== 'card') CK.err = null;
        if (isMomo(CK.pay) && !CK.editPhone) CK.payer.phone = CK.buyer.phone;
        paint(`input[name="ckPay"][value="${r.value}"]`);
      });
      const pp = $('#ckPayPhone', root);
      if (pp) {
        pp.oninput = () => {
          const d = norm(pp.value), before = !!mismatch(); CK.payer.phone = d; CK.editPhone = true;
          if (before !== !!mismatch()) return paint('#ckPayPhone');
          const n = netOf(d), chip = $('#ckPayNet', root); if (chip) { chip.className = 'n3-net ' + n; chip.textContent = n ? PAY[n].chip : ''; }
          const f = pp.closest('.n3-field'); if (f && !mismatch()) f.classList.toggle('ok', n === CK.pay);
        };
        pp.onblur = () => { const d = norm(pp.value); if (d) pp.value = pretty(d); };
      }
      const sw = $('#ckSwitchNet', root); if (sw) sw.onclick = () => { CK.pay = netOf(CK.payer.phone); paint('.ck-cta [data-next]'); };
      const on = $('#ckOtherNum', root); if (on) on.onclick = () => { CK.editPhone = true; CK.payer.phone = ''; paint('#ckPayPhone'); };
      const ep = $('#ckEditPhone', root); if (ep) ep.onclick = () => { CK.editPhone = true; paint('#ckPayPhone'); };
      const dm = $('#ckDeclMomo', root); if (dm) dm.onclick = () => {
        CK.err = null; CK.pay = netOf(CK.buyer.phone) || 'mtn'; CK.editPhone = false; CK.payer.phone = CK.buyer.phone;
        if (netOf(CK.payer.phone) === CK.pay) startMomo(); else paint('#ckPayPhone');
      };
      const dr = $('#ckDeclRetry', root); if (dr) dr.onclick = () => { CK.err = null; CK.pay = 'card'; CK.payer.cardNo = ''; CK.payer.cvc = ''; paint('#ckCardNo'); };
      const sp = $('#ckSplit', root); if (sp) sp.onchange = () => { save(); CK.split = sp.checked; paint('#ckSplit'); };
      const fi = $('#ckFrInc', root); if (fi) fi.onclick = () => { save(); CK.friends = Math.min(9, CK.friends + 1); paint(CK.friends >= 9 ? '#ckFrDec' : '#ckFrInc'); };
      const fd = $('#ckFrDec', root); if (fd) fd.onclick = () => { save(); CK.friends = Math.max(1, CK.friends - 1); paint(CK.friends <= 1 ? '#ckFrInc' : '#ckFrDec'); };
      const cn = $('#ckCardNo', root);
      if (cn) {
        const brand = () => { const v = cn.value.replace(/\D/g, ''); $('#ckBrand', root).textContent = /^4/.test(v) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(v) ? 'MASTERCARD' : ''; };
        cn.oninput = () => { const v = cn.value.replace(/\D/g, '').slice(0, 19); cn.value = v.replace(/(.{4})/g, '$1 ').trim(); brand(); }; brand();
        const ex = $('#ckExp', root); ex.oninput = () => { const v = ex.value.replace(/\D/g, '').slice(0, 4); ex.value = v.length > 2 ? v.slice(0, 2) + ' / ' + v.slice(2) : v; };
      }

      /* step 4 */
      const an = $('#ckAnother', root); if (an) an.onclick = () => go('pay', { err: null, proc: false });
      const ch = $('#ckChange', root); if (ch) ch.onclick = () => { go('pay', { err: null, editPhone: true }); const i = $('#ckPayPhone', root); if (i) i.focus(); };
      const np = $('#ckNewPrompt', root); if (np) np.onclick = startMomo;

      /* done */
      const cal = $('#ckCal', root); if (cal) cal.onclick = () => { if (UI.icsFor) { UI.icsFor(e); toast('Calendar file downloaded'); } };
      const rp = $('#ckReplay', root); if (rp) rp.onclick = () => window.novaStamp && window.novaStamp('.ck-stamp');
      const ac = $('#ckAcct', root); if (ac && window.Auth) ac.onclick = () => Auth.open('signup', () => { if (window.App) App.renderHeader(); paint(); toast('Account created. Your tickets are saved.'); });
    }

    /* ---------- hold timer ---------- */
    holdTimer = setInterval(() => {
      if (!document.body.contains(root)) { clearInterval(holdTimer); clearFlow(); if (hd && !location.hash.startsWith('#/checkout/')) hd.innerHTML = ''; return; }
      if (CK.step === 'done') { clearInterval(holdTimer); if (hd) hd.innerHTML = ''; return; }
      paintHold();
      if (holdLeft() <= 0) {
        clearInterval(holdTimer); clearFlow();
        openModal(`<h2>Time's up.</h2><p>We held your seats for ${HOLD_MIN} minutes, so they've gone back on sale. Nothing was charged.</p><div class="modal-actions"><a class="n3-btn sec" href="#/event/${e.id}" data-close>Back to event</a><button type="button" class="n3-btn" id="ckRestart">Start again</button></div>`, { size: 'sm' });
        const b = $('#ckRestart'); if (b) b.onclick = () => { CK = null; closeModal(); App.render(); };
      }
    }, 1000);
    if (!window.__ckHash) { window.__ckHash = 1; window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/checkout/')) { const h = $('#n3HdTimer'); if (h) h.innerHTML = ''; } }); }
    paint();
  }

  V.checkoutPage = checkoutPage;
  V.checkoutMount = checkoutMount;
  window.Checkout = { open(id) { window.location.hash = '#/checkout/' + id; } };
})();
