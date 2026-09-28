/* Delivery pages, 2026-09-28. The paid PDFs are no longer public files. This asks the
   rcu-download function for short-lived private links, using the Stripe checkout session id
   that arrives in the page address (?session_id=cs_...) from the Stripe redirect or the
   purchase email. Buttons stay disabled until the purchase is confirmed. */
(function () {
  var API = 'https://ckxinvzkaxxqllzjmspj.supabase.co/functions/v1/rcu-download';
  var HELP = 'info@seaywellness.com';
  var links = Array.prototype.slice.call(document.querySelectorAll('a[data-rcu-file]'));
  if (!links.length) return;

  var status = document.createElement('p');
  status.className = 'note rcu-dl-status';
  status.setAttribute('role', 'status');
  var host = links[0].closest('p, div') || links[0];
  host.parentNode.insertBefore(status, host);

  var fetchedAt = 0;
  links.forEach(function (a) {
    a.setAttribute('aria-disabled', 'true');
    a.style.opacity = '0.5';
    a.addEventListener('click', function (e) {
      if (a.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
      if (Date.now() - fetchedAt > 50 * 60 * 1000) { e.preventDefault(); location.reload(); }
    });
  });

  function say(html) { status.innerHTML = html; }
  var mail = '<a href="mailto:' + HELP + '">' + HELP + '</a>';
  var sid = new URLSearchParams(location.search).get('session_id');
  if (!sid || !/^cs_(live|test)_/.test(sid)) {
    say('To download, open this page from the link in your purchase email. That link carries ' +
        'your personal access code. Can’t find it? Email ' + mail + '.');
    return;
  }

  var tries = 0;
  function fail() {
    say('We could not confirm this purchase yet. Your download link is also in your purchase ' +
        'email. If it has not arrived within 15 minutes, email ' + mail + ' and we will send your file.');
  }
  function poll() {
    fetch(API + '?session_id=' + encodeURIComponent(sid), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.status === 'ready') {
          var byName = {};
          j.files.forEach(function (f) { byName[f.name] = f.url; });
          var found = 0;
          links.forEach(function (a) {
            var u = byName[a.getAttribute('data-rcu-file')];
            if (!u) return;
            a.href = u; a.removeAttribute('aria-disabled'); a.style.opacity = ''; found++;
          });
          fetchedAt = Date.now();
          if (found) {
            say('Your download is ready. To download again later, use the link in your purchase ' +
                'email or bookmark this page with its full address.');
          } else { fail(); }
          return;
        }
        if (j.status === 'pending' && tries++ < 40) {
          say('Confirming your payment. This usually takes a few seconds.');
          setTimeout(poll, 3000);
          return;
        }
        fail();
      })
      .catch(function () { if (tries++ < 40) setTimeout(poll, 3000); else fail(); });
  }
  say('Confirming your payment. This usually takes a few seconds.');
  poll();
})();
