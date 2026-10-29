// Selector de motivo: los botones principales abren un dialogo con 4 opciones y cada
// opcion abre WhatsApp con un mensaje distinto. Corre ANTES que contacto.js y que el
// resto: cambia el href de los botones a #motivo, asi que ya no cuentan como clic a
// WhatsApp (el clic real es el de la opcion elegida, que si lleva data-cta).
// Sin JavaScript, o sin <dialog>, los botones conservan su enlace directo a WhatsApp.
(function(){
  var dlg = document.getElementById('motivo');
  if(!dlg || typeof dlg.showModal !== 'function') return;
  var ops = [].slice.call(dlg.querySelectorAll('.motivo-op'));
  var origen = 'boton';
  var previo = null;

  function limpio(v){ return String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'boton'; }

  [].slice.call(document.querySelectorAll('[data-abrir-motivo]')).forEach(function(b){
    b.setAttribute('data-motivo-origen', limpio(b.getAttribute('data-cta')));
    b.removeAttribute('target');
    b.removeAttribute('rel');
    b.setAttribute('href', '#motivo');
    b.setAttribute('role', 'button');
    b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', function(ev){
      ev.preventDefault();
      origen = b.getAttribute('data-motivo-origen');
      // El origen va en la etiqueta del clic: hero-filtracion, fab-piso, etc. (max 40).
      ops.forEach(function(o){ o.setAttribute('data-cta', origen + '-' + o.getAttribute('data-motivo')); });
      previo = document.activeElement;
      dlg.showModal();
    });
  });

  function cerrar(){ if(dlg.open) dlg.close(); }
  document.getElementById('motivoCerrar').addEventListener('click', cerrar);
  // Clic en el fondo oscuro: el propio <dialog> es el objetivo, la caja no.
  dlg.addEventListener('click', function(ev){ if(ev.target === dlg) cerrar(); });
  // Al elegir una opcion el enlace abre WhatsApp en otra pestana; se cierra el dialogo.
  ops.forEach(function(o){ o.addEventListener('click', function(){ setTimeout(cerrar, 0); }); });
  dlg.addEventListener('close', function(){ if(previo && previo.focus) previo.focus(); });
})();
