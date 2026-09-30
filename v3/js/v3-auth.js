/* Nova v3 — sign in / sign up modal (core agent). Overrides window.Auth.open(mode, onSuccess).
   Phone-number-first with a demo 6-digit OTP step, plus an email + password option.
   Always creates / logs into a real Store account so the rest of the app works. */
(function () {
  const { esc, openModal, closeModal, toast } = UI;
  const IC = N3.IC;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* phone helpers (public: N3.phone.norm / net / pretty) */
  const norm = v => { let d = String(v || '').replace(/\D/g, ''); if (d.startsWith('256')) d = d.slice(3); if (d.startsWith('0')) d = d.slice(1); return d.slice(0, 9); };
  const net = d => /^7[678]|^39/.test(d) ? 'mtn' : /^7[054]|^20/.test(d) ? 'airtel' : '';
  const pretty = d => d.replace(/^(\d{3})(\d{0,3})(\d{0,3}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' '));
  N3.phone = { norm, net, pretty, valid: d => /^[237]\d{8}$/.test(d) };

  const phoneEmail = d => '256' + d + '@phone.nova';
  const phonePw = d => 'nova-' + d;

  let S; // state for the open modal

  function hero() {
    return `<div class="n3-auth-hero n3-night" data-grain>
      <div class="n3-ph duo-jac"><img src="assets/confetti.jpg" alt="" loading="eager"></div>
      ${N3.wordmark(true)}
      <h2 class="n3-auth-big">YOUR <br>TICKETS <br>LIVE HERE.</h2>
    </div>`;
  }
  const closeBtn = `<button type="button" class="modal-close" data-close aria-label="Close">${IC.x}</button>`;
  const fine = `<p class="n3-auth-fine">By continuing you agree to Nova's <a href="#/terms" data-close>terms</a> and <a href="#/privacy" data-close>privacy policy</a>.</p>`;

  function viewPhone() {
    const d = S.phone, n = net(d);
    return `<div class="n3-auth-form">
      <span class="n3-kicker-s">Sign in or sign up · same thing</span>
      <h2 class="n3-auth-q" id="authTitle">What's your number?</h2>
      <p class="n3-auth-sub">We'll text you a 6-digit code. No password to forget.</p>
      <form id="authPhoneF" novalidate>
        <div class="n3-field ${S.err ? 'bad' : ''}">
          <label for="authPhone">Phone number</label>
          <div class="n3-input n3-phone lg"><span class="pre">UG +256</span><input id="authPhone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="772 481 093" value="${esc(pretty(d))}" aria-describedby="authPhoneH">${n ? `<span class="n3-net ${n}">${n === 'mtn' ? 'MTN' : 'Airtel'}</span>` : '<span class="n3-net"></span>'}</div>
          <span class="n3-hint" id="authPhoneH">${S.err ? esc(S.err) : 'Ugandan mobile number. We never share it.'}</span>
        </div>
        <button class="n3-btn lg block" type="submit">Text me a code</button>
      </form>
      <div class="n3-auth-or" role="separator">or</div>
      <div class="n3-auth-alt">
        <button type="button" class="n3-btn sec" id="authToEmail">Continue with email</button>
        <button type="button" class="n3-btn sec" id="authGoogle">Continue with Google</button>
      </div>
      ${fine}
    </div>`;
  }
  function viewCode() {
    return `<div class="n3-auth-form">
      <button type="button" class="n3-iconbtn sm" id="authBack" aria-label="Back to phone number">${IC.back}</button>
      <h2 class="n3-h3 n3-auth-t" id="authTitle">CHECK YOUR TEXTS.</h2>
      <p class="n3-auth-sub">We sent a 6-digit code to <b>0${esc(pretty(S.phone))}</b>. <button type="button" class="n3-link inl" id="authWrong">Wrong number?</button></p>
      <form id="authCodeF" novalidate>
        <div class="n3-otp ${S.err ? 'bad' : ''}" role="group" aria-label="6-digit code">
          ${[0, 1, 2, 3, 4, 5].map(i => `<input type="text" inputmode="numeric" maxlength="1" autocomplete="${i ? 'off' : 'one-time-code'}" aria-label="Digit ${i + 1}" data-otp="${i}">`).join('')}
        </div>
        ${S.err ? `<p class="n3-auth-err" role="alert">${esc(S.err)}</p>` : ''}
        <div class="n3-auth-code" role="note">Demo mode: your code is <b>${S.code.slice(0, 3)} ${S.code.slice(3)}</b> <button type="button" class="n3-link inl" id="authFill">Fill it in</button></div>
        <span class="n3-auth-resend">Resend in <b id="authCd">00:30</b> · or <button type="button" class="n3-link inl" id="authWa">get it on WhatsApp</button></span>
        <button class="n3-btn lg block" type="submit">Verify and continue</button>
      </form>
      <p class="n3-auth-fine">Codes fill in automatically on Android.</p>
    </div>`;
  }
  function viewName() {
    return `<div class="n3-auth-form">
      <span class="n3-kicker-s">New here · welcome</span>
      <h2 class="n3-auth-q" id="authTitle">What should we call you?</h2>
      <p class="n3-auth-sub">This goes on your tickets. You can change it later.</p>
      <form id="authNameF" novalidate>
        <div class="n3-field ${S.err ? 'bad' : ''}"><label for="authName">Full name</label><input class="n3-input" id="authName" name="name" autocomplete="name" placeholder="Brenda Nakato" value="${esc(S.name || '')}"><span class="n3-hint">${S.err ? esc(S.err) : 'As it should appear on the ticket'}</span></div>
        <div class="n3-field"><label for="authMail">Email <span class="n3-muted">(optional, for receipts)</span></label><input class="n3-input" id="authMail" name="email" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(S.email || '')}"></div>
        <button class="n3-btn lg block" type="submit">Create my account</button>
      </form>
      ${fine}
    </div>`;
  }
  function viewEmail() {
    const up = S.mode === 'signup';
    return `<div class="n3-auth-form">
      <button type="button" class="n3-iconbtn sm" id="authBack" aria-label="Back to phone sign in">${IC.back}</button>
      <div class="n3-seg n3-auth-tabs" role="tablist" aria-label="Account">
        <button type="button" role="tab" aria-selected="${!up}" class="${!up ? 'on' : ''}" data-mode="login">Log in</button>
        <button type="button" role="tab" aria-selected="${up}" class="${up ? 'on' : ''}" data-mode="signup">Sign up</button>
      </div>
      <h2 class="n3-auth-q" id="authTitle">${up ? 'Make it official.' : 'Welcome back.'}</h2>
      <form id="authEmailF" novalidate>
        ${up ? `<div class="n3-field"><label for="aeName">Full name</label><input class="n3-input" id="aeName" name="name" autocomplete="name" required value="${esc(S.name || '')}"></div>` : ''}
        <div class="n3-field ${S.errField === 'email' ? 'bad' : ''}"><label for="aeMail">Email</label><input class="n3-input" id="aeMail" name="email" type="email" autocomplete="email" required value="${esc(S.email || '')}">${S.fix ? `<span class="n3-hint">Did you mean <a href="javascript:void 0" id="aeFix">${esc(S.fix)}</a>?</span>` : ''}</div>
        <div class="n3-field"><label for="aePw">Password</label><input class="n3-input" id="aePw" name="password" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" required>${up ? '<span class="n3-hint">At least 6 characters</span>' : ''}</div>
        ${S.err ? `<p class="n3-auth-err" role="alert">${esc(S.err)}</p>` : ''}
        <button class="n3-btn lg block" type="submit">${up ? 'Create account' : 'Log in'}</button>
      </form>
      <p class="n3-auth-fine">Demo accounts live only in this browser. ${up ? 'Already on Nova?' : 'New to Nova?'} <a href="javascript:void 0" id="aeSwap">${up ? 'Log in' : 'Sign up'}</a></p>
    </div>`;
  }

  function done(msg) {
    clearInterval(S.timer);
    const after = S.after;
    S.ok = true;
    closeModal();
    toast(msg);
    if (window.App) App.renderHeader();
    if (after) after(); else if (window.App) App.render();
  }

  const TYPO = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gamil.com': 'gmail.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com' };

  function paint(focusSel) {
    const body = { phone: viewPhone, code: viewCode, name: viewName, email: viewEmail }[S.step]();
    const m = openModal(`<div class="n3-auth" role="document" aria-labelledby="authTitle">${hero()}${body}${closeBtn}</div>`, { size: 'n3-auth-modal', noFocus: true, onClose: () => { clearInterval(S.timer); } });
    m.setAttribute('aria-labelledby', 'authTitle');
    wire(m);
    const f = focusSel ? $(focusSel, m) : $('input:not([type=hidden])', m);
    if (f) setTimeout(() => f.focus(), 40);
  }

  function wire(m) {
    const back = $('#authBack', m); if (back) back.onclick = () => { S.err = ''; S.step = 'phone'; clearInterval(S.timer); paint(); };
    if (S.step === 'phone') {
      const inp = $('#authPhone', m), chip = $('.n3-net', m);
      inp.oninput = () => {
        const d = norm(inp.value); S.phone = d;
        const n = net(d); chip.className = 'n3-net ' + n; chip.textContent = n === 'mtn' ? 'MTN' : n === 'airtel' ? 'Airtel' : '';
      };
      inp.onblur = () => { if (S.phone) inp.value = pretty(S.phone); };
      $('#authPhoneF', m).onsubmit = ev => {
        ev.preventDefault(); S.phone = norm(inp.value);
        if (!N3.phone.valid(S.phone)) { S.err = 'Enter a 9-digit number, like 772 481 093.'; return paint('#authPhone'); }
        S.err = ''; S.code = String(Math.floor(100000 + Math.random() * 900000)); S.step = 'code'; paint('[data-otp="0"]');
        toast('Code sent to 0' + pretty(S.phone));
      };
      $('#authToEmail', m).onclick = () => { S.err = ''; S.step = 'email'; paint(); };
      $('#authGoogle', m).onclick = () => { toast('Google sign-in is not in this demo. Use your phone or email.'); S.step = 'email'; paint(); };
    }
    if (S.step === 'code') {
      const boxes = $$('[data-otp]', m);
      const code = () => boxes.map(b => b.value).join('');
      boxes.forEach((b, i) => {
        b.oninput = () => {
          const v = b.value.replace(/\D/g, '');
          if (v.length > 1) { v.split('').slice(0, 6 - i).forEach((c, k) => { boxes[i + k].value = c; }); const nx = boxes[Math.min(5, i + v.length)]; nx.focus(); }
          else { b.value = v; if (v && i < 5) boxes[i + 1].focus(); }
          if (code().length === 6) $('#authCodeF', m).requestSubmit();
        };
        b.onkeydown = e => {
          if (e.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].value = ''; boxes[i - 1].focus(); e.preventDefault(); }
          if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
          if (e.key === 'ArrowRight' && i < 5) boxes[i + 1].focus();
        };
        b.onpaste = e => { const t = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, ''); if (t) { e.preventDefault(); t.slice(0, 6).split('').forEach((c, k) => { if (boxes[k]) boxes[k].value = c; }); if (t.length >= 6) $('#authCodeF', m).requestSubmit(); else boxes[Math.min(5, t.length)].focus(); } };
      });
      $('#authFill', m).onclick = () => { S.code.split('').forEach((c, k) => boxes[k].value = c); $('#authCodeF', m).requestSubmit(); };
      $('#authWrong', m).onclick = () => { S.step = 'phone'; S.err = ''; clearInterval(S.timer); paint('#authPhone'); };
      $('#authWa', m).onclick = () => toast('Code sent on WhatsApp to 0' + pretty(S.phone) + ' (demo: ' + S.code + ')');
      let left = 30; const cd = $('#authCd', m); clearInterval(S.timer);
      const res = cd.parentElement;
      S.timer = setInterval(() => {
        left--; if (left > 0) { cd.textContent = '00:' + N3.two(left); return; }
        clearInterval(S.timer);
        res.innerHTML = `Didn't get it? <button type="button" class="n3-link inl" id="authResend">Resend code</button>`;
        $('#authResend', m).onclick = () => { S.code = String(Math.floor(100000 + Math.random() * 900000)); S.err = ''; paint('[data-otp="0"]'); toast('New code sent'); };
      }, 1000);
      $('#authCodeF', m).onsubmit = ev => {
        ev.preventDefault();
        if (!/^\d{6}$/.test(code())) { S.err = 'Enter all 6 digits.'; return paint('[data-otp="0"]'); }
        S.err = '';
        try { Store.logIn({ email: phoneEmail(S.phone), password: phonePw(S.phone) }); return done('Welcome back' + (Store.user() ? ', ' + Store.user().name.split(' ')[0] : '') + '.'); }
        catch (x) { clearInterval(S.timer); S.step = 'name'; paint('#authName'); }
      };
    }
    if (S.step === 'name') {
      $('#authNameF', m).onsubmit = ev => {
        ev.preventDefault();
        S.name = $('#authName', m).value.trim(); S.email = $('#authMail', m).value.trim();
        if (S.name.length < 2) { S.err = 'Tell us your name so it can go on your tickets.'; return paint('#authName'); }
        try {
          Store.signUp({ name: S.name, email: phoneEmail(S.phone), password: phonePw(S.phone) });
          Store.updateUser({ phone: '0' + S.phone, contactEmail: S.email || '' });
          done('Welcome to Nova, ' + S.name.split(' ')[0] + '.');
        } catch (x) { S.err = x.message; paint(); }
      };
    }
    if (S.step === 'email') {
      $$('[data-mode]', m).forEach(b => b.onclick = () => { S.mode = b.dataset.mode; S.err = ''; S.fix = ''; paint(); });
      $('#aeSwap', m).onclick = () => { S.mode = S.mode === 'signup' ? 'login' : 'signup'; S.err = ''; S.fix = ''; paint(); };
      const mail = $('#aeMail', m);
      mail.onblur = () => {
        const v = mail.value.trim(), dom = v.split('@')[1];
        const fix = dom && TYPO[dom.toLowerCase()] ? v.split('@')[0] + '@' + TYPO[dom.toLowerCase()] : '';
        if (fix !== (S.fix || '')) { S.email = v; S.fix = fix; const nm = $('#aeName', m); if (nm) S.name = nm.value; paint('#aePw'); }
      };
      const fx = $('#aeFix', m); if (fx) fx.onclick = () => { mail.value = S.fix; S.email = S.fix; S.fix = ''; const h = fx.closest('.n3-hint'); if (h) h.remove(); $('#aePw', m).focus(); };
      $('#authEmailF', m).onsubmit = ev => {
        ev.preventDefault();
        const d = Object.fromEntries(new FormData(ev.target));
        S.email = d.email; S.name = d.name; S.errField = '';
        try {
          if (S.mode === 'signup') {
            if (!d.name || !d.name.trim()) throw new Error('Please enter your name.');
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || '')) { S.errField = 'email'; throw new Error('Please enter a valid email.'); }
            if ((d.password || '').length < 6) throw new Error('Password must be at least 6 characters.');
            Store.signUp(d); done('Welcome to Nova, ' + d.name.trim().split(' ')[0] + '.');
          } else { Store.logIn(d); done('Welcome back, ' + Store.user().name.split(' ')[0] + '.'); }
        } catch (x) { S.err = x.message; paint(S.mode === 'signup' ? '#aeName' : '#aeMail'); }
      };
    }
  }

  const Auth = window.Auth || {};
  Auth.open = function (mode, after) {
    S = { mode: mode === 'signup' ? 'signup' : 'login', after, step: 'phone', phone: '', err: '', code: '' };
    paint();
  };
  window.Auth = Auth;
})();
