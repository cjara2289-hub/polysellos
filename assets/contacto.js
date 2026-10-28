// El tracking de conversion va fuera del bloque de animacion: ese sale temprano
// con "reducir movimiento" activado y se perdian los clics a WhatsApp del pixel.
//
// Hubo aqui un refuerzo por sendBeacon en visibilitychange, pensado para rescatar
// el evento cuando el <img> GET de fbq no alcanza a salir al saltar a WhatsApp en
// iOS. Se quito, y conviene no volver a ponerlo sin resolver esto primero:
// los 6 enlaces son target="_blank", asi que el documento pasa a hidden en CADA
// clic, no solo cuando el GET falla. O sea que el beacon disparaba siempre y
// quedaba dependiendo por completo de que Meta deduplique dos eventos de
// navegador con el mismo eventID — que esta documentado para pixel contra CAPI,
// no para navegador contra navegador. Si esa dedup no ocurre, no se duplican
// algunos Contact: se duplican todos. Cambiar una perdida estimada de 5-15% en
// iOS por un posible doble conteo del 100% es mal negocio.
// El eventID se mantiene: no cuesta nada y deja el navegador listo para el dia
// que exista CAPI, que es cuando la dedup si esta documentada.
(function(){
  var TOPE = 'ps_contact_';
  var VENTANA_MS = 30 * 60 * 1000;

  document.querySelectorAll('a[href*="wa.me"]').forEach(function(link){
    link.addEventListener('click', function(){
      if(typeof fbq !== 'function') return;
      var cta = link.getAttribute('data-cta') || 'sin-etiqueta';
      // Tres toques nerviosos seguidos no son tres contactos. Es una ventana de
      // tiempo y no la sesion entera porque alguien que vuelve horas despues, o
      // que reintenta porque WhatsApp no le abrio, si es un contacto real.
      var ahora = Date.now();
      try {
        var previo = parseInt(sessionStorage.getItem(TOPE + cta) || '0', 10);
        if(previo && (ahora - previo) < VENTANA_MS) return;
      } catch(e){}
      var eventID = ahora.toString(36) + Math.random().toString(36).slice(2, 10);
      fbq('track', 'Contact', { content_name: cta }, { eventID: eventID });
      // El cupo se marca DESPUES de mandar el evento: al reves, un envio fallido
      // (fbevents bloqueado, o la pagina cerrada antes de vaciar la cola) quemaba
      // el cupo igual y el reintento del usuario ya no contaba.
      try { sessionStorage.setItem(TOPE + cta, String(ahora)); } catch(e){}
    });
  });
})();
