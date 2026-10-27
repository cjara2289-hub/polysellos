// Eventos propios sin datos personales: clics a WhatsApp y envios del formulario.
// Se envian a /api/evento con navigator.sendBeacon, que no frena la salida a WhatsApp.
// Sin cookies. Solo viaja: tipo, boton (data-cta), pagina y utm_* si llegaron en el enlace.
(function(){
  var CLAVES = ['utm_source', 'utm_medium', 'utm_campaign'];
  // Los utm_ llegan en la primera pagina; se guardan para la sesion con las mismas
  // claves que usa el formulario de index.html (ps_utm_*).
  try {
    var q = new URLSearchParams(location.search);
    CLAVES.forEach(function(k){ if(q.get(k)) sessionStorage.setItem('ps_' + k, q.get(k).slice(0, 100)); });
  } catch(e){}

  function limpiarCta(v){
    var c = String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    return c || 'sin-etiqueta';
  }

  function enviar(tipo, cta){
    if(!navigator.sendBeacon) return;
    var cuerpo = { tipo: tipo, cta: limpiarCta(cta), pagina: (location.pathname || '/').slice(0, 100) };
    CLAVES.forEach(function(k){
      try { var v = sessionStorage.getItem('ps_' + k); if(v) cuerpo[k] = v.slice(0, 100); } catch(e){}
    });
    try {
      navigator.sendBeacon('/api/evento', new Blob([JSON.stringify(cuerpo)], { type: 'application/json' }));
    } catch(e){}
  }

  window.psEvento = enviar;

  document.addEventListener('click', function(ev){
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href*="wa.me"]') : null;
    if(a) enviar('clic_whatsapp', a.getAttribute('data-cta'));
  }, true);
})();
