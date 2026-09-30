/* Nova v3 — router, header / menus / drawer / tab bar / footer (core agent) */
(function () {
  const V = window.Views;
  const app = document.getElementById('app');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = UI.esc;
  const IC = N3.IC;
  const CITY_KEY = 'nova.v3.city', LITE_KEY = 'nova.v3.lite';
  const store = { get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------- city + lite mode (public: N3.city(), N3.setCity(name), N3.lite(on?)) ---------- */
  N3.city = () => store.get(CITY_KEY, 'Kampala');
  N3.setCity = name => { store.set(CITY_KEY, name); App.renderHeader(); };
  N3.lite = on => {
    if (on === undefined) return document.body.classList.contains('n3-lite');
    document.body.classList.toggle('n3-lite', !!on); store.set(LITE_KEY, on ? '1' : '');
    const b = $('#mobLite'); if (b) b.setAttribute('aria-pressed', !!on);
    const f = $('#ftLite'); if (f) f.checked = !!on;
  };
  const CITY_META = { Kampala: '', Entebbe: '40 min', Jinja: '2 hrs', Nairobi: 'prices in UGX', Mbarara: '4 hrs' };

  const menus = () => $$('.n3-menu, .n3-drawer');
  function closeMenus(except) {
    $$('.n3-menu.open').forEach(m => { if (m !== except) m.classList.remove('open'); });
    $$('[aria-controls][aria-expanded="true"]').forEach(b => { const t = document.getElementById(b.getAttribute('aria-controls')); if (!t || t !== except) b.setAttribute('aria-expanded', 'false'); });
  }
  function toggleMenu(btn, menu, place) {
    const open = !menu.classList.contains('open');
    closeMenus(open ? menu : null);
    if (open && place) place();
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    if (open) { const first = menu.querySelector('a, button'); if (first && btn.matches(':focus-visible')) setTimeout(() => first.focus(), 20); }
  }
  function placeUnder(btn, menu) {
    if (innerWidth <= 900) { menu.style.left = ''; return; }
    const hd = $('#n3Hd').getBoundingClientRect(), b = btn.getBoundingClientRect();
    menu.style.left = Math.max(0, Math.min(b.left - hd.left, hd.width - menu.offsetWidth - 48)) + 'px';
  }

  function openDrawer() {
    const d = $('#n3Drawer'), u = Store.user();
    d.innerHTML = `<div class="n3-drawer-bg" data-drawer-close></div>
      <div class="n3-drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="n3-drawer-top">${N3.wordmark(true)}<button type="button" class="n3-iconbtn sm" data-drawer-close aria-label="Close menu">${IC.x}</button></div>
        <a href="#/">Explore ${IC.arrow}</a>
        <a href="#/search">Search ${IC.arrow}</a>
        <a href="#/search?sort=popular">Guides ${IC.arrow}</a>
        <a href="#/tickets">My tickets ${IC.arrow}</a>
        <a href="#/likes">Saved ${IC.arrow}</a>
        <a href="#/create">Host an event ${IC.arrow}</a>
        ${u ? `<a href="#/manage">Organiser dashboard ${IC.arrow}</a><a href="#/account">Account ${IC.arrow}</a>` : ''}
        <span class="n3-kicker-s">When</span>
        <div class="n3-drawer-chips">${N3.DATES.map(([k, t]) => `<a class="n3-chip sm" href="#/search?date=${k}">${t}</a>`).join('')}</div>
        <span class="n3-kicker-s">Category</span>
        <div class="n3-drawer-chips">${Store.categories.map(c => `<a class="n3-chip sm" href="#/search?cat=${c.id}">${esc(c.name)}</a>`).join('')}</div>
        ${u ? `<button type="button" class="n3-btn sec block" id="drLogout">Log out</button>` : `<button type="button" class="n3-btn block" id="drSignin">Sign in</button>`}
        <a href="#/help" class="n3-drawer-small">Help · Refunds · Terms</a>
      </div>`;
    d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
    $('#menuToggle').setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const si = $('#drSignin'); if (si) si.onclick = () => { closeDrawer(); Auth.open('login'); };
    const lo = $('#drLogout'); if (lo) lo.onclick = () => { closeDrawer(); logout(); };
    $$('a', d).forEach(a => a.addEventListener('click', closeDrawer));
    setTimeout(() => { const c = d.querySelector('[data-drawer-close].n3-iconbtn'); if (c) c.focus(); }, 30);
  }
  function closeDrawer() {
    const d = $('#n3Drawer'); if (!d.classList.contains('open')) return;
    d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); d.innerHTML = '';
    $('#menuToggle').setAttribute('aria-expanded', 'false');
    if (!$('#modalRoot').innerHTML) document.body.style.overflow = '';
  }
  function logout() { Store.logOut(); UI.toast('Signed out. See you after dark.'); App.renderHeader(); App.render(); }

  const App = {
    refreshAfterOrder: false,

    renderHeader() {
      const u = Store.user();
      const up = Store.upcoming();
      const city = N3.city();
      const r = App.currentRoute || '';
      const nTickets = u ? Store.myOrders().filter(o => !o.cancelled && new Date((Store.getEvent(o.eventId) || {}).end || 0) > new Date()).reduce((s, o) => s + o.tickets.length, 0) : 0;
      const catCount = id => up.filter(e => e.category === id).length;
      const cityCount = n => up.filter(e => e.venue && !e.online && e.venue.city === n).length;

      /* desktop nav */
      $('#headerNav').innerHTML = `
        <div class="n3-hd-dd"><button type="button" id="ddExplore" aria-haspopup="true" aria-expanded="false" aria-controls="n3Mega">Explore ${IC.chev}</button></div>
        <div class="n3-hd-dd"><button type="button" id="ddCity" class="n3-hd-city" aria-haspopup="true" aria-expanded="false" aria-controls="n3Cities" aria-label="City: ${esc(city)}. Change city">${esc(city)} ${IC.chev}</button></div>
        <a href="#/search?sort=popular" class="n3-hd-opt" ${r === 'search' && /sort=popular/.test(location.hash) ? 'aria-current="page"' : ''}>Guides</a>`;

      /* right side */
      $('#headerRight').innerHTML = `
        <a href="#/create" ${r === 'create' ? 'aria-current="page"' : ''}>Host an event</a>
        <a href="#/tickets" ${r === 'tickets' ? 'aria-current="page"' : ''}>My tickets${nTickets ? ` <span class="n3-hd-count" aria-label="${nTickets} upcoming">${nTickets}</span>` : ''}</a>
        ${u ? `<button type="button" class="n3-hd-av" id="ddAcct" aria-haspopup="true" aria-expanded="false" aria-controls="n3Acct" aria-label="Account menu for ${esc(u.name)}">${esc(UI.initials(u.name))}</button>`
            : `<button type="button" class="n3-btn sec sm n3-hd-signin" id="signInBtn">Sign in</button>`}`;

      /* explore mega menu (board 08b) */
      const cats = Store.categories;
      const feat = up.find(e => e.photo || e.image);
      const weekend = up.filter(e => N3.dateMatch(e, 'weekend')).length;
      $('#n3Mega').innerHTML = `
        <div class="n3-mega-cats"><span class="n3-mega-h">By category</span>
          ${cats.map((c, i) => `<a role="menuitem" href="#/search?cat=${c.id}"><b>${N3.two(i + 1)}</b><span>${esc(c.name)}</span><small>${catCount(c.id)}</small></a>`).join('')}
        </div>
        <div class="n3-mega-time"><span class="n3-mega-h">By time</span>
          <a role="menuitem" href="#/search?date=today"><i class="n3-dot-live"></i>Tonight</a>
          <a role="menuitem" href="#/search?date=tomorrow">Tomorrow</a>
          <a role="menuitem" href="#/search?date=weekend">This weekend</a>
          <a role="menuitem" href="#/search?date=week&amp;price=free">Free this week</a>
          <a role="menuitem" href="#/search?online=1">Online</a>
          <a role="menuitem" class="n3-mega-all" href="#/search">All ${up.length} events →</a>
        </div>
        <a role="menuitem" class="n3-mega-guide" href="#/search?date=weekend"><span class="n3-mega-h">This week's guide</span>
          <div class="n3-ph"><img src="assets/friends.jpg" alt="" loading="lazy"></div>
          <span class="n3-mega-g"><b>${weekend || 5}</b><span>${weekend === 1 ? 'plan' : 'plans'} for the weekend${feat ? `, starting with <em>${esc(feat.title)}</em>` : ''}</span></span></a>`;

      /* city switcher (board 08c) */
      $('#n3Cities').innerHTML = N3.CITIES.map(n => `<a role="menuitemradio" aria-checked="${n === city}" href="#/search?loc=${encodeURIComponent(n)}" data-city="${esc(n)}"><span>${esc(n)}${n === city ? ' ✓' : ''}</span><b>${cityCount(n)} event${cityCount(n) === 1 ? '' : 's'}${CITY_META[n] ? ' · ' + CITY_META[n] : ''}</b></a>`).join('') +
        `<a role="menuitemradio" aria-checked="false" href="#/search?online=1" data-city=""><span>Online</span><b>${up.filter(e => e.online).length} events · anywhere</b></a>
         <p class="n3-cities-foot">Coming next: Kigali, Dar es Salaam. <a href="#/help">Tell us where</a></p>`;

      /* account menu */
      $('#n3Acct').innerHTML = u ? `
        <div class="n3-acct-h"><span class="n3-hd-av" aria-hidden="true">${esc(UI.initials(u.name))}</span><div><b>${esc(u.name)}</b><small>${esc(u.phone || u.email || '')}</small></div></div>
        <a role="menuitem" href="#/tickets">${IC.ticket}My tickets</a>
        <a role="menuitem" href="#/likes">${IC.save}Saved</a>
        <a role="menuitem" href="#/create">${IC.plus}Host an event</a>
        <a role="menuitem" href="#/manage">${IC.chart}Organiser dashboard</a>
        <a role="menuitem" href="#/account">${IC.cog}Account</a>
        <hr><button type="button" role="menuitem" id="logoutBtn">${IC.back}Sign out</button>` : '';

      /* mobile city pill */
      $('#mobCity').innerHTML = esc(city) + ' ' + IC.chev;
      $('#mobCity').setAttribute('aria-label', 'City: ' + city + '. Change city');

      /* wire */
      const ex = $('#ddExplore'), cb = $('#ddCity'), ac = $('#ddAcct');
      ex.onclick = ev => { ev.stopPropagation(); toggleMenu(ex, $('#n3Mega')); };
      cb.onclick = ev => { ev.stopPropagation(); toggleMenu(cb, $('#n3Cities'), () => placeUnder(cb, $('#n3Cities'))); };
      $('#mobCity').onclick = ev => { ev.stopPropagation(); toggleMenu($('#mobCity'), $('#n3Cities')); };
      if (ac) ac.onclick = ev => { ev.stopPropagation(); toggleMenu(ac, $('#n3Acct')); };
      const si = $('#signInBtn'); if (si) si.onclick = () => Auth.open('login');
      const lo = $('#logoutBtn'); if (lo) lo.onclick = () => { closeMenus(); logout(); };
      $$('#n3Cities [data-city]').forEach(a => a.addEventListener('click', () => { if (a.dataset.city) store.set(CITY_KEY, a.dataset.city); }));

      App.renderTabbar();
    },

    renderTabbar() {
      const r = App.currentRoute || '';
      const u = Store.user();
      const act = r === '' ? 'explore' : r === 'search' ? 'search' : (r === 'tickets' || r === 'likes') ? 'tickets' : (r === 'account' || r === 'manage' || r === 'create' || r === 'edit') ? 'account' : '';
      const n = u ? Store.myOrders().filter(o => !o.cancelled && new Date((Store.getEvent(o.eventId) || {}).end || 0) > new Date()).length : 0;
      const tkIc = '<svg class="n3-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4z"/><path d="M15 7v10" stroke-dasharray="2 2"/></svg>';
      const tab = (k, href, label, ic, extra) => `<a href="${href}" data-tab="${k}" ${act === k ? 'aria-current="page"' : ''}><span>${ic}${extra || ''}</span>${label}</a>`;
      $('#tabbar').innerHTML = tab('explore', '#/', 'Explore', IC.explore) + tab('search', '#/search', 'Search', IC.search) +
        tab('tickets', '#/tickets', 'Tickets', tkIc, n ? `<i class="n3-tab-count" aria-label="${n} upcoming">${n}</i>` : '') + tab('account', '#/account', 'Account', IC.user);
      const acc = $('#tabbar [data-tab="account"]');
      acc.onclick = ev => { if (!Store.user()) { ev.preventDefault(); Auth.open('login', () => { location.hash = '#/account'; }); } };
    },

    render() {
      const hash = location.hash.replace(/^#/, '') || '/';
      const [path, qs] = hash.split('?');
      const parts = path.split('/').filter(Boolean);
      let html, mount;
      const r = parts[0] || '';

      if (r === '') { html = V.home(); mount = V.homeMount; }
      else if (r === 'search') { html = V.search(qs); mount = () => V.searchMount(qs); }
      else if (r === 'event' && parts[1]) { html = V.eventPage(parts[1]); mount = () => V.eventMount(parts[1]); }
      else if (r === 'checkout' && parts[1]) { html = V.checkoutPage(parts[1]); mount = () => V.checkoutMount(parts[1]); }
      else if (r === 'tickets' && parts[1]) { html = V.orderPage(parts[1]); mount = () => V.orderMount(parts[1]); }
      else if (r === 'tickets') { html = V.tickets(); mount = () => V.tabsMount('#tkTabs'); }
      else if (r === 'likes') { html = V.likes(); mount = V.likesMount; }
      else if (r === 'organizer' && parts[1]) { html = V.organizerPage(parts[1]); mount = () => V.organizerMount(parts[1]); }
      else if (r === 'create') { html = V.createPage(); mount = () => V.createMount(); }
      else if (r === 'edit' && parts[1]) { html = V.createPage(parts[1]); mount = () => V.createMount(parts[1]); }
      else if (r === 'manage' && (!parts[1] || parts[1] === 'events')) { html = V.manage(parts[1]); mount = V.manageMount ? () => V.manageMount(parts[1]) : null; }
      else if (r === 'manage' && parts[1]) { html = V.manageEvent(parts[1], parts[2]); mount = () => V.manageEventMount(parts[1], parts[2]); }
      else if (r === 'account') { html = V.account(); mount = V.accountMount; }
      else if (r === 'pricing') { html = V.pricing(); }
      else if (['about', 'help', 'terms', 'privacy'].includes(r)) { html = V.staticPage(r); }
      else { html = V.notFound(); }

      closeMenus(); closeDrawer();
      document.body.classList.toggle('is-home', r === '');
      document.body.dataset.route = r || 'home';
      document.body.classList.toggle('is-checkout', r === 'checkout');
      document.body.classList.toggle('has-buybar', r === 'event' || r === 'checkout');
      $('#siteHeader').classList.toggle('dark', r === '');
      $('#siteHeader').classList.toggle('secure', r === 'checkout');
      if (r === 'checkout') { $('#n3HdBack').href = '#/event/' + parts[1]; }
      const loc = new URLSearchParams(qs || '').get('loc');
      if (r === 'search' && loc && N3.CITIES.includes(loc) && loc !== N3.city()) store.set(CITY_KEY, loc);
      const hq = $('#hdQ'); if (hq && r !== 'search') hq.value = '';
      document.querySelectorAll('.co-confetti').forEach(c => c.remove());
      app.innerHTML = html;
      App.currentRoute = r;
      App.renderHeader();
      if (mount) mount();

      const titles = { '': 'Kampala after dark', search: 'Find events', tickets: 'My tickets', likes: 'Saved', create: 'Host an event', edit: 'Edit event', manage: 'Organiser dashboard', account: 'Account', pricing: 'Pricing', checkout: 'Secure checkout', help: 'Help', about: 'About', terms: 'Terms', privacy: 'Privacy' };
      const ev = r === 'event' && Store.getEvent(parts[1]);
      document.title = 'Nova — ' + (ev ? ev.title : (titles[r] || 'Page not found'));
    }
  };
  window.App = App;

  /* ---------- leftover v1 pages, on-brand (pricing, static, 404) ---------- */
  const legacyHead = (label, title, dek) => `<header class="n3-lg-head"><div class="n3-wrap">${N3.label(label)}<h1 class="n3-h2">${title}</h1>${dek ? `<p class="n3-dek">${dek}</p>` : ''}</div></header>`;
  V.pricing = () => `<div class="n3-page n3-p-legacy n3-legacy">
    ${legacyHead('For organisers · Pricing', 'Free to list.<br>Fair to sell.', 'Free events stay free. On paid tickets, you choose who pays the fee.')}
    <div class="n3-wrap"><div class="n3-plans">
      <div class="n3-plan"><span class="n3-kicker-s">Free events</span><b class="n3-plan-p">UGX 0</b><p>Meetups, community nights and free registrations.</p><ul><li>Unlimited free tickets</li><li>Event page &amp; RSVP list</li><li>Door scanner app</li><li>SMS &amp; WhatsApp confirmations</li></ul><a class="n3-btn sec block" href="#/create">Start free</a></div>
      <div class="n3-plan hot n3-night" data-grain><span class="n3-kicker-s">Paid events</span><b class="n3-plan-p">3.5%<small> + UGX 1,000</small></b><p>Per paid ticket sold. Pass it to buyers or absorb it.</p><ul><li>Everything in Free</li><li>MTN MoMo, Airtel Money &amp; cards</li><li>Promo codes &amp; ticket tiers</li><li>Live sales dashboard &amp; CSV export</li></ul><a class="n3-btn block" href="#/create">Create a paid event</a></div>
      <div class="n3-plan"><span class="n3-kicker-s">Festivals &amp; venues</span><b class="n3-plan-p">Let's talk</b><p>For festivals, venues and conferences over 2,000 people.</p><ul><li>Volume pricing</li><li>A real person on WhatsApp</li><li>Your own branding</li><li>On-site check-in crew</li></ul><a class="n3-btn sec block" href="#/help">Talk to us</a></div>
    </div>
    <p class="n3-plans-fine">Payouts to MTN MoMo, Airtel Money or your bank within 2 working days after the event. No monthly fees, no set-up fees.</p></div></div>`;

  const PAGES = {
    about: ['About Nova', 'A city magazine that happens to sell tickets.', 'Rooftop jazz, rolex at midnight, a lake at sunrise.', `<p>Nova helps people in Kampala, Entebbe, Jinja and Nairobi find something worth leaving the house for, and gives organisers simple tools to sell tickets and run the door.</p><h2>Why jacaranda</h2><p>Every September the city's jacarandas turn Kololo and Nakasero purple. It's Kampala's own colour — so it's ours.</p><h2>Paper by day, ink by night</h2><p>We write about events the way a good city magazine does: short, honest, and with the date big enough to read from across the room.</p>`],
    help: ['Help', 'Help &amp; refunds.', 'Quick answers. Real humans on WhatsApp for the rest.', `
      <details open><summary>Where are my tickets?</summary><p>Open <a href="#/tickets">My tickets</a>. Every ticket is also sent by SMS to the phone number used at checkout — show the QR or just your number at the door.</p></details>
      <details><summary>Can I get a refund?</summary><p>Refunds follow each organiser's policy, shown on the event page. You can cancel eligible orders from the order page; MoMo refunds land within 48 hours.</p></details>
      <details><summary>I paid with MoMo but have no ticket</summary><p>Wait two minutes and check <a href="#/tickets">My tickets</a>. If it's still missing, WhatsApp us on 0800 100 668 with your transaction ID.</p></details>
      <details><summary>How do I host an event?</summary><p>Go to <a href="#/create">Host an event</a>, add the details and ticket types, and publish. Free events are free to list.</p></details>
      <details><summary>What is Lite mode?</summary><p>Lite mode hides photos so pages load fast on slow or expensive data. Turn it on from the header or the footer.</p></details>
      <h2>Still stuck?</h2><p><a class="n3-btn wa" href="https://wa.me/256800100668" target="_blank" rel="noopener">${IC.wa} WhatsApp us · 0800 100 668</a></p>`],
    terms: ['Terms', 'Terms of service.', 'The short version: be kind, show up, don\'t resell above face value.', '<p>This is a demonstration site. No real payments are processed and no real tickets are issued. Replace this page with your own terms before launch.</p>'],
    privacy: ['Privacy', 'Privacy.', 'Your data stays on your phone.', '<p>In this demo, all data — accounts, orders and events — is stored only in your own browser\'s local storage and is never sent to a server. Replace this page with your privacy policy before launch.</p>']
  };
  V.staticPage = kind => { const p = PAGES[kind] || PAGES.about; return `<div class="n3-page n3-p-legacy n3-legacy">${legacyHead(p[0], p[1], p[2])}<div class="n3-wrap"><div class="n3-prose">${p[3]}</div></div></div>`; };
  V.notFound = msg => `<div class="n3-page n3-p-legacy n3-404"><div class="n3-wrap">
      ${N3.label('No. 404 · Lost in Kampala')}
      <h1 class="n3-h1">NOTHING<br><span class="n3-hand-loop">HERE.</span></h1>
      <p class="n3-dek">${esc(msg || 'That page went home early. Plenty else is still on tonight.')}</p>
      <div class="n3-404-actions"><a class="n3-btn" href="#/">See what's on</a><a class="n3-btn sec" href="#/search?date=today">Tonight near you</a></div>
    </div></div>`;

  /* ---------- global delegated handlers ---------- */
  document.addEventListener('click', ev => {
    const like = ev.target.closest('[data-like]');
    if (like) {
      ev.preventDefault(); ev.stopPropagation();
      const id = like.dataset.like;
      const r = Store.toggleLike(id);
      if (r === null) { Auth.open('login', () => { if (!Store.isLiked(id)) Store.toggleLike(id); App.render(); UI.toast('Saved. Find it under My tickets → Saved.'); }); return; }
      const e = Store.getEvent(id);
      $$(`[data-like="${id}"]`).forEach(b => {
        b.classList.toggle('on', r); b.classList.toggle('liked', r); b.setAttribute('aria-pressed', r);
        if (b.classList.contains('n3-save')) {
          b.innerHTML = r ? IC.saveFill : IC.save;
          if (e) b.setAttribute('aria-label', (r ? 'Saved ' : 'Save ') + e.title);
        } else {
          const svg = b.querySelector('svg');
          if (svg) svg.outerHTML = r ? IC.saveFill : IC.save;
          const lbl = b.querySelector('[data-like-label], span:not(.n3-ic)'); if (lbl) lbl.textContent = r ? 'Saved' : 'Save';
        }
      });
      UI.toast(r ? 'Saved. Find it under My tickets → Saved.' : 'Removed from Saved');
      return;
    }
    if (ev.target.closest('[data-drawer-close]')) { closeDrawer(); return; }
    if (!ev.target.closest('.n3-menu') && !ev.target.closest('[aria-controls]')) closeMenus();
    if (ev.target.closest('.n3-menu a')) closeMenus();
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') {
      const open = $('.n3-menu.open');
      if (open) { const b = $(`[aria-controls="${open.id}"][aria-expanded="true"]`); closeMenus(); if (b) b.focus(); }
      closeDrawer();
    }
    if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && ev.target.closest('.n3-menu.open')) {
      const items = $$('a, button', ev.target.closest('.n3-menu')); const i = items.indexOf(document.activeElement);
      if (i > -1) { ev.preventDefault(); items[(i + (ev.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); }
    }
  });
  window.addEventListener('resize', () => { if ($('.n3-menu.open')) closeMenus(); });

  $('#headerSearch').addEventListener('submit', ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    location.hash = '#/search?' + UI.buildQuery({ q: (f.get('q') || '').trim(), loc: f.get('loc') });
  });
  $('#menuToggle').onclick = ev => { ev.stopPropagation(); $('#n3Drawer').classList.contains('open') ? closeDrawer() : openDrawer(); };
  $('#mobLite').onclick = () => { const on = !N3.lite(); N3.lite(on); UI.toast(on ? 'Lite mode on: photos hidden to save data' : 'Lite mode off'); };
  $('#ftLite').onchange = e => { N3.lite(e.target.checked); UI.toast(e.target.checked ? 'Lite mode on: photos hidden to save data' : 'Lite mode off'); };
  $('#year').textContent = new Date().getFullYear();
  if (store.get(LITE_KEY, '')) N3.lite(true);

  window.addEventListener('hashchange', () => {
    UI.closeModal();
    App.render();
    window.scrollTo(0, 0);
  });

  App.render();
})();
