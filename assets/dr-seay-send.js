/* Send quiz results to Dr. Seay, 2026-11-04. Used by /quiz, /thyroid and /lowback.

   Two ways in, both through a Google Apps Script web app on Adam's Google Workspace
   account (covered by the Workspace HIPAA BAA accepted 2026-10-07), so the results
   never pass through Relay, Supabase or the mailing system:
   1. Patient link (?patient=1): the capture step says the results will go to
      Dr. Seay, then they are sent automatically once the results show.
   2. Everyone else: a "Send my results to Dr. Seay" button under the results.

   The script source and setup steps live in the workspace at
   Root Health Ops/Quiz-Results-to-Dr-Seay/. While SEND_URL is empty the feature
   hides itself and every quiz behaves exactly as it did before. */
(function () {
  'use strict';

  // Paste the Apps Script web app link (ends in /exec) here after deploying it.
  var SEND_URL = '';
  // Must match SEND_KEY in Code.gs. Public by nature; the script's hourly cap is the real guard.
  var SEND_KEY = 'VdPpnhwQFodo_2vdBHvcucEN';

  var on = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(SEND_URL);
  var patientLink = false;
  try { patientLink = new URLSearchParams(window.location.search).get('patient') === '1'; } catch (e) { /* old browser */ }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var CSS =
    '.drs-eyebrow{font-family:Arial,sans-serif;font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--primary,#3A66A4);margin-bottom:4px;}' +
    '.drs-p{font-family:Arial,sans-serif;font-size:0.86rem;color:var(--text-mid,#444);line-height:1.6;margin:0 0 12px;}' +
    '.drs-note{font-weight:700;color:var(--text-dark,#111);}' +
    '.drs-btn{border:none;cursor:pointer;}' +
    '.drs-btn[disabled]{opacity:0.6;cursor:default;}' +
    '.drs-status{font-family:Arial,sans-serif;font-size:0.86rem;color:var(--text-mid,#444);line-height:1.55;margin:10px 0 0;}' +
    '.drs-status:empty{display:none;}' +
    '.drs-done .drs-status{color:var(--primary,#3A66A4);font-weight:700;}' +
    '.drs-notice{font-family:Arial,sans-serif;font-size:0.8rem;color:var(--text-mid,#444);line-height:1.55;background:#F3F6FB;border-left:3px solid var(--primary,#3A66A4);border-radius:6px;padding:8px 11px;margin:10px 0 4px;}';

  function addStyle() {
    if (document.getElementById('drs-style')) return;
    var s = document.createElement('style');
    s.id = 'drs-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  /* Visible text of each selector or element, in order, as the patient sees it.
     Hidden pieces are skipped. */
  function textOf(items) {
    var out = [];
    items.forEach(function (item) {
      var nodes = typeof item === 'string' ? document.querySelectorAll(item) : [item];
      Array.prototype.forEach.call(nodes, function (n) {
        if (!n || !n.getClientRects().length) return;
        var t = (n.innerText || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        if (t) out.push(t);
      });
    });
    return out.join('\n\n');
  }

  function send(data) {
    var body = { key: SEND_KEY };
    for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) body[k] = data[k];
    // text/plain keeps this a simple request, which Apps Script answers without a CORS preflight.
    return fetch(SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'not sent');
    });
  }

  /* Renders the Dr. Seay card into host.
     opts: quiz, collect() -> {name, email, phone, concern, results}, cardClass, btnClass,
     headTag, askIdentity (adds name and email fields), prefill() -> {name, email} for
     those fields, note, fallback, onSent. Mounting again after a send shows the sent state. */
  function mount(host, opts) {
    if (!host) return;
    host.innerHTML = '';
    if (!on) { host.style.display = 'none'; return; }
    host.style.display = '';
    addStyle();

    var card = make('div', (opts.cardClass || '') + ' drs-card');
    if (host.getAttribute('data-drs-sent') === '1') {
      card.className += ' drs-done';
      card.appendChild(make('div', 'drs-eyebrow', 'Dr. Seay'));
      card.appendChild(make('p', 'drs-status', 'Sent. Dr. Seay has your results.'));
      host.appendChild(card);
      return;
    }

    var auto = patientLink && !opts.askIdentity;
    card.appendChild(make('div', 'drs-eyebrow', 'Dr. Seay'));
    var head = make(opts.headTag || 'h3', 'drs-h',
      auto ? 'Sending your results to Dr. Seay' : opts.askIdentity ? 'Send this to Dr. Seay' : 'Send these results to Dr. Seay');
    card.appendChild(head);
    var desc = card.appendChild(make('p', 'drs-p',
      auto ?'You opened this from Dr. Seay’s patient link, so a copy of these results goes to him automatically.'
        : opts.askIdentity ? 'Add your first name and email so Dr. Seay knows who this is from.'
        : 'Tap below to email these results, with the contact details you entered, to Dr. Seay.'));
    if (opts.note) card.appendChild(make('p', 'drs-p drs-note', opts.note));

    var nameIn = null, emailIn = null, fields = null;
    if (opts.askIdentity) {
      fields = make('div', 'drs-fields');
      [['First name', 'text', 'given-name'], ['Email', 'email', 'email']].forEach(function (f, i) {
        var wrap = make('div', 'field');
        var id = 'drs-' + (i ? 'email' : 'name') + '-' + Math.random().toString(36).slice(2, 7);
        var label = make('label', '', f[0]);
        label.setAttribute('for', id);
        var input = make('input');
        input.type = f[1];
        input.id = id;
        input.setAttribute('autocomplete', f[2]);
        wrap.appendChild(label);
        wrap.appendChild(input);
        fields.appendChild(wrap);
        if (i) emailIn = input; else nameIn = input;
      });
      if (opts.prefill) {
        try {
          var pre = opts.prefill() || {};
          nameIn.value = pre.name || '';
          emailIn.value = pre.email || '';
        } catch (e) { /* leave blank */ }
      }
      card.appendChild(fields);
    }

    var btn = make('button', (opts.btnClass || '') + ' drs-btn', 'Send my results to Dr. Seay');
    btn.type = 'button';
    var status = make('p', 'drs-status');
    status.setAttribute('role', 'status');
    card.appendChild(btn);
    card.appendChild(status);
    host.appendChild(card);

    var sent = false, busy = false;
    function go() {
      if (sent || busy) return;
      var data = {};
      try { data = opts.collect() || {}; } catch (e) { data = {}; }
      if (opts.askIdentity) {
        data.name = nameIn.value.trim();
        data.email = emailIn.value.trim();
        if (!data.name || !EMAIL_RE.test(data.email)) {
          status.textContent = 'Please add your first name and a valid email so Dr. Seay knows who this is from.';
          return;
        }
      }
      if (!data.results) {
        status.textContent = 'There are no results on this page to send yet.';
        return;
      }
      data.quiz = opts.quiz;
      data.mode = auto ? 'patient link' : 'button';
      busy = true;
      btn.disabled = true;
      status.textContent = 'Sending…';
      send(data).then(function () {
        sent = true;
        busy = false;
        host.setAttribute('data-drs-sent', '1');
        head.textContent = 'Your results were sent to Dr. Seay';
        desc.style.display = 'none';
        btn.style.display = 'none';
        if (fields) fields.style.display = 'none';
        card.classList.add('drs-done');
        status.textContent = 'Sent. Dr. Seay has your results.';
        if (opts.onSent) { try { opts.onSent(); } catch (e) { /* cosmetic */ } }
      }, function () {
        busy = false;
        btn.disabled = false;
        btn.style.display = '';
        btn.textContent = 'Try again';
        status.textContent = 'That did not go through. Check your connection and try again' +
          (opts.fallback ? ', ' + opts.fallback : '.');
      });
    }
    btn.addEventListener('click', go);
    if (auto) { btn.style.display = 'none'; go(); }
  }

  /* On a patient link, tells the patient before they submit that the results will go to Dr. Seay. */
  function notice(host) {
    if (!host || !on || !patientLink) return;
    addStyle();
    host.appendChild(make('p', 'drs-notice',
      'You opened this from Dr. Seay’s patient link, so your full results will also be sent to Dr. Seay.'));
  }

  window.DrSeaySend = { on: on, patientLink: on && patientLink, mount: mount, notice: notice, textOf: textOf };
})();
