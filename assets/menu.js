/* Menu desplegable del encabezado. Abre y cierra con transform y opacity; se cierra con Escape,
   clic fuera, clic en un enlace o al salir con Tab. Marca la pagina actual con aria-current. */
(function () {
  var b = document.getElementById('menuBtn');
  var p = document.getElementById('menuPanel');
  if (!b || !p) return;
  var t;
  function abierto() { return b.getAttribute('aria-expanded') === 'true'; }
  function abrir() {
    clearTimeout(t);
    p.hidden = false;
    void p.offsetWidth;
    p.classList.add('is-open');
    b.setAttribute('aria-expanded', 'true');
  }
  function cerrar(devolverFoco) {
    p.classList.remove('is-open');
    b.setAttribute('aria-expanded', 'false');
    clearTimeout(t);
    t = setTimeout(function () { if (!abierto()) p.hidden = true; }, 200);
    if (devolverFoco) b.focus();
  }
  b.addEventListener('click', function () { if (abierto()) cerrar(false); else abrir(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && abierto()) cerrar(true); });
  document.addEventListener('click', function (e) {
    if (abierto() && !p.contains(e.target) && !b.contains(e.target)) cerrar(false);
  });
  p.addEventListener('click', function (e) { if (e.target.closest('a')) cerrar(false); });
  p.addEventListener('focusout', function (e) {
    if (abierto() && e.relatedTarget && !p.contains(e.relatedTarget) && e.relatedTarget !== b) cerrar(false);
  });
  var ruta = location.pathname.replace(/\/$/, '').replace(/\/index\.html$|\.html$/, '') || '/';
  p.querySelectorAll('a[data-ruta]').forEach(function (a) {
    if (a.getAttribute('data-ruta') === ruta) a.setAttribute('aria-current', 'page');
  });
})();

/* Al llegar por un enlace (no con atras, adelante ni recargar) la pagina abre arriba. El navegador ya lo
   hace en polysellos.net; scrollIntoView tambien sube el scroll del marco que contenga la pagina, como
   la vista previa. Con #ancla se respeta el destino. */
(function () {
  try {
    var nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'navigate' && !location.hash) {
      document.documentElement.scrollIntoView({ behavior: 'instant' });
    }
  } catch (e) {}
})();
