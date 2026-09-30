/* Nova — lightweight canvas confetti for the home hero */
(function () {
  const COLORS = ['#007bff', '#4da3ff', '#9fd0ff', '#ffffff', '#ffd166', '#ff6b9a', '#7cf3c8', '#b69cff'];
  const rand = (a, b) => a + Math.random() * (b - a);

  function Confetti(canvas) {
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, parts = [], running = true, visible = true, raf = 0, last = 0, burstT = 0;

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function make(x, y, angle, speed, kind) {
      return {
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        w: kind === 'ribbon' ? rand(3, 5) : rand(6, 11), h: kind === 'ribbon' ? rand(14, 22) : rand(4, 8),
        kind, color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: rand(0, Math.PI * 2), vr: rand(-0.2, 0.2),
        flip: rand(0, Math.PI * 2), vf: rand(0.08, 0.2),
        sway: rand(0, Math.PI * 2), life: 0, max: rand(240, 420), drag: rand(0.975, 0.99)
      };
    }
    function pickKind() { const r = Math.random(); return r < 0.6 ? 'paper' : r < 0.85 ? 'ribbon' : 'dot'; }

    function burst(x, y, n, spread, up) {
      n = n || 90;
      for (let i = 0; i < n && parts.length < 420; i++) {
        const a = (up != null ? up : -Math.PI / 2) + rand(-spread, spread);
        parts.push(make(x, y, a, rand(7, 15), pickKind()));
      }
    }
    function cannons() {
      burst(W * 0.02, H + 10, 70, 0.35, -Math.PI / 2 + 0.55);
      burst(W * 0.98, H + 10, 70, 0.35, -Math.PI / 2 - 0.55);
    }
    function drizzle() {
      if (parts.length < 140) parts.push(make(rand(0, W), -20, Math.PI / 2, rand(0.5, 1.5), pickKind()));
    }

    function draw(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = Math.cos(p.flip); // 3D flip illusion
      ctx.scale(1, s);
      const fade = Math.min(1, (p.max - p.life) / 60);
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = p.color;
      if (p.kind === 'dot') { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.4, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      // subtle shading on the back side of each piece
      if (s < 0) { ctx.globalAlpha = 0.25 * fade; ctx.fillStyle = '#000'; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      ctx.restore();
    }

    function tick(t) {
      if (!canvas.isConnected) { stop(); return; }
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) { last = t; return; }
      const dt = Math.min(2.5, (t - (last || t)) / 16.67); last = t;
      ctx.clearRect(0, 0, W, H);
      burstT += dt;
      if (burstT > 330) { cannons(); burstT = 0; }         // every ~5.5 s
      if (Math.random() < 0.35 * dt) drizzle();              // gentle continuous fall
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        p.vx *= Math.pow(p.drag, dt); p.vy = p.vy * Math.pow(p.drag, dt) + 0.18 * dt;
        if (p.vy > 2.6) p.vy = 2.6;                          // terminal velocity → floaty fall
        p.sway += 0.05 * dt;
        p.x += (p.vx + Math.sin(p.sway) * 0.7) * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt; p.flip += p.vf * dt;
        if (p.life > p.max || p.y > H + 40) { parts.splice(i, 1); continue; }
        draw(p);
      }
    }
    function stop() { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); if (io) io.disconnect(); }

    resize();
    window.addEventListener('resize', resize);
    let io = null;
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }); io.observe(canvas); }

    if (reduce) { // static sprinkle only
      for (let i = 0; i < 60; i++) { const p = make(rand(0, W), rand(0, H), 0, 0, pickKind()); p.life = 0; draw(p); }
      return { burst() {}, stop() {} };
    }
    setTimeout(() => { if (running) cannons(); }, 250);
    raf = requestAnimationFrame(tick);
    return {
      burst(x, y) { burst(x, y, 60, Math.PI); },
      stop
    };
  }

  window.NovaConfetti = Confetti;
})();
