/* Nova — data store (persists in the browser's localStorage) */
(function () {
  const KEY = 'nova_events_v1';
  const seed = window.NOVA_SEED;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  let db = Object.assign({ users: [], session: null, events: [], orders: [], likes: [], follows: [], soldDelta: {} }, load());

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage unavailable: keep in memory */ }
  }
  function uid(p) { return (p || 'id') + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }

  function hydrate(e) {
    const copy = JSON.parse(JSON.stringify(e));
    copy.category = seed.CAT_ALIAS[copy.category] || copy.category;
    copy.tiers.forEach(t => { t.sold = (t.sold || 0) + (db.soldDelta[copy.id + ':' + t.id] || 0); });
    return copy;
  }

  const Store = {
    categories: seed.CATEGORIES,
    catId(id) { return seed.CAT_ALIAS[id] || id; },
    palettes: seed.PALETTES,
    cities: seed.CITIES,
    photos: seed.PHOTOS,

    /* ----- events ----- */
    allEvents() {
      const deleted = new Set(db.events.filter(e => e._deleted).map(e => e.id));
      const userEvents = db.events.filter(e => !e._deleted);
      const overridden = new Set(userEvents.map(e => e.id));
      const seeded = seed.EVENTS.filter(e => !overridden.has(e.id) && !deleted.has(e.id));
      return seeded.concat(userEvents).filter(e => e.status !== 'draft' || this.canEdit(e)).map(hydrate);
    },
    publicEvents() { return this.allEvents().filter(e => e.status !== 'draft'); },
    getEvent(id) { return this.allEvents().find(e => e.id === id); },
    upcoming() { const now = Date.now(); return this.publicEvents().filter(e => new Date(e.end).getTime() > now).sort((a, b) => new Date(a.start) - new Date(b.start)); },
    saveEvent(e) {
      const i = db.events.findIndex(x => x.id === e.id);
      if (i >= 0) db.events[i] = e; else db.events.push(e);
      save(); return e;
    },
    deleteEvent(id) {
      db.events = db.events.filter(e => e.id !== id);
      if (seed.EVENTS.some(e => e.id === id)) db.events.push({ id, _deleted: true });
      save();
    },
    newEventId() { return uid('ev_'); },

    /* ----- organizers ----- */
    organizer(id) {
      const o = seed.ORGANIZERS.find(o => o.id === id);
      if (o) return o;
      const u = db.users.find(u => u.id === id);
      return u ? { id: u.id, name: u.orgName || u.name, followers: 0, bio: 'Event organizer on Nova.' } : { id, name: 'Nova organizer', followers: 0, bio: '' };
    },
    organizerEvents(id) { return this.upcoming().filter(e => e.organizerId === id); },
    isFollowing(id) { const u = this.user(); return !!u && db.follows.includes(u.id + ':' + id); },
    toggleFollow(id) {
      const u = this.user(); if (!u) return null;
      const k = u.id + ':' + id; const i = db.follows.indexOf(k);
      if (i >= 0) db.follows.splice(i, 1); else db.follows.push(k);
      save(); return i < 0;
    },

    /* ----- auth ----- */
    user() { return db.users.find(u => u.id === db.session) || null; },
    signUp({ name, email, password }) {
      email = email.trim().toLowerCase();
      if (db.users.some(u => u.email === email)) throw new Error('An account with this email already exists. Try logging in.');
      const u = { id: uid('u_'), name: name.trim(), email, pw: btoa(unescape(encodeURIComponent(password))), createdAt: new Date().toISOString() };
      db.users.push(u); db.session = u.id; save(); return u;
    },
    logIn({ email, password }) {
      email = email.trim().toLowerCase();
      const u = db.users.find(u => u.email === email);
      if (!u || u.pw !== btoa(unescape(encodeURIComponent(password)))) throw new Error('Incorrect email or password.');
      db.session = u.id; save(); return u;
    },
    logOut() { db.session = null; save(); },
    updateUser(patch) { const u = this.user(); if (!u) return; Object.assign(u, patch); save(); return u; },
    canEdit(e) { const u = this.user(); return !!u && e.organizerId === u.id; },

    /* ----- likes ----- */
    isLiked(id) { const u = this.user(); return !!u && db.likes.includes(u.id + ':' + id); },
    toggleLike(id) {
      const u = this.user(); if (!u) return null;
      const k = u.id + ':' + id; const i = db.likes.indexOf(k);
      if (i >= 0) db.likes.splice(i, 1); else db.likes.push(k);
      save(); return i < 0;
    },
    likedEvents() { const u = this.user(); if (!u) return []; return this.publicEvents().filter(e => db.likes.includes(u.id + ':' + e.id)); },

    /* ----- orders ----- */
    placeOrder({ eventId, items, buyer, payment, promo }) {
      const e = this.getEvent(eventId);
      if (!e) throw new Error('Event not found');
      for (const it of items) {
        const t = e.tiers.find(t => t.id === it.tierId);
        if (!t || t.qty - t.sold < it.qty) throw new Error((t ? t.name : 'Ticket') + ' no longer has enough tickets available.');
      }
      items.forEach(it => { const k = eventId + ':' + it.tierId; db.soldDelta[k] = (db.soldDelta[k] || 0) + it.qty; });
      const u = this.user();
      const order = {
        id: 'NV-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        userId: u ? u.id : null, eventId, items, buyer, payment, promo: promo || null,
        subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
        createdAt: new Date().toISOString()
      };
      order.discount = promo ? Math.round(order.subtotal * promo.pct / 100) : 0;
      order.fees = feeFor(order.subtotal - order.discount, items.reduce((s, i) => s + i.qty, 0));
      order.total = order.subtotal - order.discount + order.fees;
      order.tickets = [];
      items.forEach(it => { for (let n = 0; n < it.qty; n++) order.tickets.push({ code: order.id + '-' + (order.tickets.length + 1), tierName: it.name, checkedIn: false }); });
      db.orders.push(order); save(); return order;
    },
    myOrders() {
      const u = this.user(); if (!u) return [];
      return db.orders.filter(o => o.userId === u.id || (o.buyer && o.buyer.email === u.email)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    ordersForEvent(eventId) { return db.orders.filter(o => o.eventId === eventId); },
    cancelOrder(orderId) {
      const o = db.orders.find(o => o.id === orderId); if (!o) return;
      o.items.forEach(it => { const k = o.eventId + ':' + it.tierId; db.soldDelta[k] = Math.max(0, (db.soldDelta[k] || 0) - it.qty); });
      o.cancelled = true; save();
    },
    checkIn(orderId, code, value) {
      const o = db.orders.find(o => o.id === orderId); if (!o) return;
      const t = o.tickets.find(t => t.code === code); if (t) t.checkedIn = value; save();
    },
    feeFor,
    validatePromo(code, e) {
      code = (code || '').trim().toUpperCase();
      if (!code) return null;
      const list = (e.promos || []).concat([{ code: 'NOVA10', pct: 10 }]);
      return list.find(p => p.code.toUpperCase() === code) || null;
    },
    resetDemo() { try { localStorage.removeItem(KEY); } catch (e) {} location.hash = '#/'; location.reload(); }
  };

  function feeFor(amount, count) {
    if (amount <= 0) return 0;
    return Math.round(amount * 0.035 + count * 1000);
  }

  window.Store = Store;
})();
