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
      const I = {
        chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>',
        plus: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
        heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2 0 3.4 1 5 2.8 1.6-1.8 3-2.8 5-2.8 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21zm0-2.4c2.4-1.6 6.2-4.7 7.6-7.6 1-2.2-.4-4.5-2.6-4.5-1.4 0-2.4.8-3.8 2.5L12 10.4l-1.2-1.4C9.4 7.3 8.4 6.5 7 6.5c-2.2 0-3.6 2.3-2.6 4.5 1.4 2.9 5.2 6 7.6 7.6z"/></svg>',
        ticket: '<svg viewBox="0 0 24 24"><path d="M3 6a1 1 0 011-1h16a1 1 0 011 1v3a2 2 0 000 4v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4a2 2 0 000-4zm2 1v1.5a4 4 0 010 7V17h14v-1.5a4 4 0 010-7V7z"/></svg>'
      };
      const quick = [['⚡', 'Today', 'date=today'], ['🎉', 'This weekend', 'date=weekend'], ['🎟️', 'Free events', 'price=free'], ['💻', 'Online', 'online=1'], ['🔥', 'Most popular', 'sort=popular']];
      const catCount = id => up.filter(e => e.category === id).length;
      const cityCount = n => up.filter(e => e.venue && e.venue.city === n).length;
      const explore = `
        <div class="nv-dd" data-dd>
          <button class="nv-link" data-r="search" aria-haspopup="true" aria-expanded="false">Explore ${I.chev}</button>
          <div class="nv-panel nv-mega" role="menu">
            <div class="mega-quick">
              <span class="mega-h">Quick picks</span>
              ${quick.map(([ic, t, q]) => `<a href="#/search?${q}" role="menuitem"><span class="mq-ic">${ic}</span>${t}</a>`).join('')}
              <a class="mega-all" href="#/search">Browse all ${up.length} events →</a>
            </div>
            <div class="mega-cats">
              <span class="mega-h">Categories</span>
              <div class="mega-grid">${Store.categories.map(c => `<a href="#/search?cat=${c.id}" role="menuitem"><img src="${UI.photoUrl(c.photo, 96)}" alt="" loading="lazy"><span><b>${c.name}</b><small>${catCount(c.id)} upcoming</small></span></a>`).join('')}</div>
            </div>
          </div>
        </div>`;
      const cities = `
        <div class="nv-dd" data-dd>
          <button class="nv-link" aria-haspopup="true" aria-expanded="false">Cities ${I.chev}</button>
          <div class="nv-panel nv-cities" role="menu">
            ${Store.cities.map(c => `<a href="#/search?loc=${encodeURIComponent(c.name)}" role="menuitem"><img src="${UI.photoUrl(c.photo, 96)}" alt="" loading="lazy"><span><b>${c.name}</b><small>${cityCount(c.name)} event${cityCount(c.name) === 1 ? '' : 's'}</small></span></a>`).join('')}
            <a class="nv-online" href="#/search?online=1" role="menuitem"><span class="mq-ic">💻</span><span><b>Online</b><small>Join from anywhere</small></span></a>
          </div>
        </div>`;
      nav.innerHTML = `
        <div class="nv-group">
          ${explore}
          ${cities}
          <a class="nv-link" data-r="pricing" href="#/pricing">Pricing</a>
          ${u ? `<a class="nv-link" data-r="manage" href="#/manage">My events</a>` : ''}
        </div>
        <div class="nv-actions">
          ${u ? `
            <a class="nv-icon" data-r="likes" href="#/likes" title="Likes" aria-label="Likes">${I.heart}</a>
            <a class="nv-icon" data-r="tickets" href="#/tickets" title="Tickets" aria-label="Tickets">${I.ticket}${Store.myOrders().filter(o => !o.cancelled).length ? `<i class="nv-badge">${Store.myOrders().filter(o => !o.cancelled).length}</i>` : ''}</a>
            <a class="nv-create" href="#/create">${I.plus}<span>Create</span></a>
            <div class="user-menu">
              <button id="userBtn" aria-haspopup="true" aria-label="Account menu"><span class="avatar">${UI.initials(u.name)}</span></button>
              <div class="dropdown" id="userDD">
                <div class="dd-head"><span class="avatar">${UI.initials(u.name)}</span><div><b>${UI.esc(u.name)}</b><div class="muted">${UI.esc(u.email)}</div></div></div>
                <a href="#/tickets">🎟️ Tickets</a>
                <a href="#/likes">❤️ Likes</a>
                <a href="#/manage">📊 Manage my events</a>
                <a href="#/account">⚙️ Account settings</a>
                <hr>
                <button id="logoutBtn">Log out</button>
              </div>
            </div>` : `
            <a class="nv-create" href="#/create">${I.plus}<span>Create event</span></a>
            <button class="nv-login" id="loginBtn">Log in</button>
            <button class="nv-signup" id="signupBtn">Sign up</button>`}
        </div>
      `;
      const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
      on('loginBtn', () => Auth.open('login'));
      on('signupBtn', () => Auth.open('signup'));
      on('logoutBtn', () => { Store.logOut(); UI.toast('Logged out'); App.renderHeader(); App.render(); });
      on('userBtn', ev => { ev.stopPropagation(); closeDDs(); document.getElementById('userDD').classList.toggle('open'); });
      // dropdowns: click to toggle (touch/keyboard), hover handled in CSS for mouse users
      const closeDDs = except => nav.querySelectorAll('[data-dd].open').forEach(d => { if (d !== except) { d.classList.remove('open'); d.querySelector('.nv-link').setAttribute('aria-expanded', 'false'); } });
      nav.querySelectorAll('[data-dd] > .nv-link').forEach(b => b.onclick = ev => {
        ev.stopPropagation(); const dd = b.parentElement; closeDDs(dd);
        const open = dd.classList.toggle('open'); b.setAttribute('aria-expanded', open);
      });
      nav.querySelectorAll('.nv-panel a').forEach(a => a.addEventListener('click', () => { closeDDs(); a.blur(); }));
      if (!App._ddBound) {
        App._ddBound = true;
        document.addEventListener('click', ev => { if (!ev.target.closest('[data-dd]')) document.querySelectorAll('[data-dd].open').forEach(d => d.classList.remove('open')); });
        document.addEventListener('keydown', ev => { if (ev.key === 'Escape') document.querySelectorAll('[data-dd].open').forEach(d => d.classList.remove('open')); });
      }
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
      document.body.classList.toggle('is-checkout', r === 'checkout');
      document.querySelectorAll('.co-confetti').forEach(c => c.remove());
      app.innerHTML = html;
      App.currentRoute = r;
      if (mount) mount();

      document.querySelectorAll('#headerNav [data-r]').forEach(a => a.classList.toggle('active', a.dataset.r === r));
      document.querySelectorAll('#headerNav [data-dd].open').forEach(d => d.classList.remove('open'));
      document.getElementById('headerNav').classList.remove('open');
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
      document.querySelectorAll(`[data-like="${like.dataset.like}"]`).forEach(b => { b.classList.toggle('liked', r); b.innerHTML = r ? UI.heart : UI.heartOutline; });
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
