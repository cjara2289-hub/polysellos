// Cierre del splash. La decision de mostrarlo (o quitarlo) y la clase intro-active
// las pone el script en linea de index.html, que es el unico que corre antes del
// primer pintado. Este archivo solo cierra el splash cuando esa clase esta puesta.
(function(){
  var intro = document.getElementById('intro');
  if(!intro || !document.documentElement.classList.contains('intro-active')) return;

  var cerrado = false;
  function cerrar(){
    if(cerrado) return;
    cerrado = true;
    intro.classList.add('intro-hide');
    document.documentElement.classList.remove('intro-active');
    // Mientras el splash estaba activo la pagina tenia overflow:hidden, asi que el
    // salto al ancla (/#obra) que el navegador intenta al cargar no podia scrollear
    // y nadie lo reintentaba: el visitante nuevo con un enlace con ancla, incluidos
    // los atajos de la pagina 404, se quedaba arriba. Se hace aqui, ya sin el candado.
    if(location.hash.length > 1){
      // decodeURIComponent lanza URIError con un hash mal codificado (/#%): sin el
      // try/catch el splash no se cerraba ni se guardaba polysellos_intro_seen.
      var id = '';
      try { id = decodeURIComponent(location.hash.slice(1)); } catch(e){ id = ''; }
      var destino = id ? document.getElementById(id) : null;
      if(destino) destino.scrollIntoView({ behavior: 'instant' });
    }
    try { sessionStorage.setItem('polysellos_intro_seen','1'); } catch(e){}
    setTimeout(function(){ if(intro && intro.parentNode) intro.remove(); }, 650);
  }

  // Antes esto colgaba solo de 'load', que espera a TODAS las imagenes, a las
  // fuentes de Google y al script del pixel. En 4G desde el navegador de
  // Instagram eso son varios segundos de pantalla negra antes de ver nada.
  // Ahora gana el que llegue primero: load + 300ms, o un tope duro de 900ms.
  // Ya no cuelga de 'load' (esperaba a fbevents.js, a la config del pixel y a
  // imagenes que no pintan nada del hero). Con dos rAF basta: el contenido ya
  // esta pintado. El tope de 700ms es la red de seguridad.
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ setTimeout(cerrar, 120); }); });
  setTimeout(cerrar, 700);
})();
