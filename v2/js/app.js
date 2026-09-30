/* Nova — router & header */
(function () {
  const V = window.Views;
  const app = document.getElementById('app');

  const App = {
    refreshAfterOrder: false,
    renderHeader() {
      const u = Store.user();
      const nav = document.getElementById('headerNav');
      const up = Store.upcoming();
      const ic = (d, stroke) => `<svg viewBox="0 0 24 24" ${stroke ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' : ''}><path d="${d}"/></svg>`;
      const I = {
        chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>',
        heart: ic('M12 20s-7-4.4-8.8-8.8C2 8 4 5 7.2 5c1.9 0 3.2 1 4.8 2.8C13.6 6 14.9 5 16.8 5 20 5 22 8 20.8 11.2 19 15.6 12 20 12 20z', 1),
        ticket: ic('M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z', 1),
        plus: ic('M12 5v14M5 12h14', 1)
      };
      const quick = [
        ['M13 2L4 14h7l-1 8 9-12h-7z', 'Tonight', 'date=today', 'Happening in the next few hours'],
        ['M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', 'This weekend', 'date=weekend', 'Fri – Sun'],
        ['M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z', 'Free events', 'price=free', 'No ticket cost'],
        ['M3 5h18v11H3zM8 20h8M12 16v4', 'Online', 'online=1', 'Join from anywhere'],
        ['M12 3c2 3 5 5 5 9a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z', 'Most popular', 'sort=popular', 'What people are booking']
      ];
      const catCount = id => up.filter(e => e.category === id).length;
      const cityCount = n => up.filter(e => e.venue && e.venue.city === n).length;
      const explore = `
        <div class="nv-dd" data-dd>
          <button class="n2-navlink" data-r="search" aria-haspopup="true" aria-expanded="false">Explore ${I.chev}</button>
          <div class="nv-panel nv-mega n2-panel" role="menu">
            <div class="mega-quick">
              <span class="mega-h">Quick picks</span>
              ${quick.map(([d, t, q, s]) => `<a href="#/search?${q}" role="menuitem"><span class="mq-ic">${ic(d, 1)}</span><span><b>${t}</b><small>${s}</small></span></a>`).join('')}
              <a class="mega-all" href="#/search">Browse all ${up.length} events →</a>
            </div>
            <div class="mega-cats">
              <span class="mega-h">Categories</span>
              <div class="mega-grid">${Store.categories.map(c => `<a href="#/search?cat=${c.id}" role="menuitem"><img src="${UI.photoUrl(c.photo, 120)}" alt="" loading="lazy"><span><b>${c.name}</b><small>${catCount(c.id)} upcoming</small></span></a>`).join('')}</div>
            </div>
          </div>
        </div>`;
      const cities = `
        <div class="nv-dd" data-dd>
          <button class="n2-navlink" aria-haspopup="true" aria-expanded="false">Cities ${I.chev}</button>
          <div class="nv-panel nv-cities n2-panel" role="menu">
            ${Store.cities.map(c => `<a href="#/search?loc=${encodeURIComponent(c.name)}" role="menuitem"><img src="${UI.photoUrl(c.photo, 120)}" alt="" loading="lazy"><span><b>${c.name}</b><small>${cityCount(c.name)} event${cityCount(c.name) === 1 ? '' : 's'}</small></span></a>`).join('')}
            <a class="nv-online" href="#/search?online=1" role="menuitem"><span class="mq-ic">${ic('M3 5h18v11H3zM8 20h8M12 16v4', 1)}</span><span><b>Online</b><small>Join from anywhere</small></span></a>
          </div>
        </div>`;
      const nTickets = u ? Store.myOrders().filter(o => !o.cancelled).length : 0;
      nav.innerHTML = `
        <div class="n2-navgroup">
          ${explore}
          ${cities}
          <a class="n2-navlink" data-r="pricing" href="#/pricing">Pricing</a>
          ${u ? `<a class="n2-navlink" data-r="manage" href="#/manage">My events</a>` : ''}
        </div>
        <div class="n2-actions">
          ${u ? `
            <a class="n2-iconlink" data-r="likes" href="#/likes" title="Likes" aria-label="Likes">${I.heart}</a>
            <a class="n2-iconlink" data-r="tickets" href="#/tickets" title="Tickets" aria-label="Tickets">${I.ticket}${nTickets ? `<i class="nv-badge">${nTickets}</i>` : ''}</a>
            <a class="n2-btn-outline" href="#/create">${I.plus}<span>Create event</span></a>
            <div class="user-menu">
              <button id="userBtn" aria-haspopup="true" aria-label="Account menu"><span class="avatar">${UI.initials(u.name)}</span></button>
              <div class="dropdown" id="userDD">
                <div class="dd-head"><span class="avatar">${UI.initials(u.name)}</span><div><b>${UI.esc(u.name)}</b><div class="muted">${UI.esc(u.email)}</div></div></div>
                <a href="#/tickets">${I.ticket}Tickets</a>
                <a href="#/likes">${I.heart}Likes</a>
                <a href="#/manage">${ic('M4 20V10M10 20V4M16 20v-7M22 20H2', 1)}Manage my events</a>
                <a href="#/account">${ic('M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z', 1)}Account settings</a>
                <hr>
                <button id="logoutBtn">Log out</button>
              </div>
            </div>` : `
            <a class="n2-btn-outline" href="#/create">Create event</a>
            <button class="n2-textbtn" id="loginBtn">Log in</button>
            <button class="n2-btn-ink" id="signupBtn">Sign up</button>`}
        </div>
      `;
      const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
      on('loginBtn', () => Auth.open('login'));
      on('signupBtn', () => Auth.open('signup'));
      on('logoutBtn', () => { Store.logOut(); UI.toast('Logged out'); App.renderHeader(); App.render(); });
      on('userBtn', ev => { ev.stopPropagation(); closeDDs(); document.getElementById('userDD').classList.toggle('open'); });
      const closeDDs = except => nav.querySelectorAll('[data-dd].open').forEach(d => { if (d !== except) { d.classList.remove('open'); d.querySelector('button').setAttribute('aria-expanded', 'false'); } });
      nav.querySelectorAll('[data-dd] > button').forEach(b => b.onclick = ev => {
        ev.stopPropagation(); const dd = b.parentElement; closeDDs(dd);
        const open = dd.classList.toggle('open'); b.setAttribute('aria-expanded', open);
      });
      nav.querySelectorAll('.nv-panel a').forEach(a => a.addEventListener('click', () => { closeDDs(); a.blur(); }));
      if (!App._ddBound) {
        App._ddBound = true;
        document.addEventListener('click', ev => { if (!ev.target.closest('[data-dd]')) document.querySelectorAll('[data-dd].open').forEach(d => d.classList.remove('open')); });
        document.addEventListener('keydown', ev => { if (ev.key === 'Escape') document.querySelectorAll('[data-dd].open').forEach(d => d.classList.remove('open')); });
      }
      // tab bar account link
      const acc = document.querySelector('#tabbar [data-tab="account"]');
      if (acc) acc.onclick = ev => { if (!Store.user()) { ev.preventDefault(); Auth.open('login'); } };
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
      else if (r === 'likes') { html = V.likes(); }
      else if (r === 'organizer' && parts[1]) { html = V.organizerPage(parts[1]); mount = () => V.organizerMount(parts[1]); }
      else if (r === 'create') { html = V.createPage(); mount = () => V.createMount(); }
      else if (r === 'edit' && parts[1]) { html = V.createPage(parts[1]); mount = () => V.createMount(parts[1]); }
      else if (r === 'manage' && (!parts[1] || parts[1] === 'events')) { html = V.manage(parts[1]); }
      else if (r === 'manage' && parts[1]) { html = V.manageEvent(parts[1], parts[2]); mount = () => V.manageEventMount(parts[1]); }
      else if (r === 'account') { html = V.account(); mount = V.accountMount; }
      else if (r === 'pricing') { html = V.pricing(); }
      else if (['about', 'help', 'terms', 'privacy'].includes(r)) { html = V.staticPage(r); }
      else { html = V.notFound(); }

      document.body.classList.toggle('is-home', r === '');
      document.body.dataset.route = r || 'home';
      document.body.classList.toggle('is-checkout', r === 'checkout');
      document.querySelectorAll('.co-confetti').forEach(c => c.remove());
      app.innerHTML = html;
      App.currentRoute = r;
      if (mount) mount();

      document.querySelectorAll('#headerNav [data-r]').forEach(a => a.classList.toggle('active', a.dataset.r === r));
      document.querySelectorAll('#headerNav [data-dd].open').forEach(d => d.classList.remove('open'));
      document.getElementById('headerNav').classList.remove('open');
      document.querySelectorAll('#tabbar [data-tab]').forEach(a => a.classList.toggle('on', a.dataset.tab === (r === 'likes' || r === 'order' ? 'tickets' : r)));
      document.body.classList.toggle('has-buybar', r === 'event' || r === 'checkout');
      const titles = { '': 'Discover & host events', search: 'Find events', tickets: 'Tickets', likes: 'Likes', create: 'Create an event', manage: 'Organizer dashboard', account: 'Account', pricing: 'Pricing' };
      const ev = r === 'event' && Store.getEvent(parts[1]);
      document.title = 'Nova — ' + (ev ? ev.title : (titles[r] || r.charAt(0).toUpperCase() + r.slice(1)));
    }
  };
  window.App = App;

  /* global delegated handlers */
  document.addEventListener('click', ev => {
    const like = ev.target.closest('[data-like]');
    if (like) {
      ev.preventDefault(); ev.stopPropagation();
      const r = Store.toggleLike(like.dataset.like);
      if (r === null) { Auth.open('login'); return; }
      document.querySelectorAll(`[data-like="${like.dataset.like}"]`).forEach(b => { b.classList.toggle('liked', r); b.classList.toggle('on', r); b.setAttribute('aria-pressed', r); b.innerHTML = (r ? UI.heart : UI.heartOutline) + (b.classList.contains('n2-pillbtn') ? `<span>${r ? 'Saved' : 'Save'}</span>` : ''); });
      UI.toast(r ? 'Saved to Likes' : 'Removed from Likes');
      return;
    }
    const dd = document.getElementById('userDD');
    if (dd && !ev.target.closest('.user-menu')) dd.classList.remove('open');
  });

  document.getElementById('headerSearch').addEventListener('submit', ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    location.hash = '#/search?' + UI.buildQuery({ q: f.get('q'), loc: f.get('loc') });
  });
  document.getElementById('menuToggle').onclick = () => document.getElementById('headerNav').classList.toggle('open');
  document.getElementById('year').textContent = new Date().getFullYear();

  window.addEventListener('hashchange', () => {
    UI.closeModal();
    App.render();
    window.scrollTo(0, 0);
  });

  App.renderHeader();
  App.render();
})();
