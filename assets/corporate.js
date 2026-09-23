/* Public marketing navigation enhancements. Existing menu click handler is retained. */
(() => {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  if (!nav || !toggle) return;
  const close = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) { close(); toggle.focus(); }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) close();
  });
  nav.querySelectorAll('a').forEach(link => {
    if (new URL(link.href).pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) link.setAttribute('aria-current', 'page');
    link.addEventListener('click', close);
  });
  matchMedia('(min-width: 981px)').addEventListener('change', close);
})();
