// Barra fija de WhatsApp: acompana el scroll hacia abajo y hacia arriba. Se muestra
// cuando la tarjeta del hero ya salio de pantalla y se esconde mientras la seccion de
// contacto esta a la vista (alli ya hay un boton igual). Vive fuera del bloque de
// animacion: con "reducir movimiento" el JS de scroll sale temprano y la barra no
// aparecia nunca. visibility la saca del orden de tabulacion cuando esta escondida.
(function(){
  var barra = document.getElementById('ctaSticky');
  var hero = document.querySelector('.hero-card');
  var contacto = document.getElementById('contacto');
  if(!barra || !hero || !('IntersectionObserver' in window)) return;

  var heroVisible = true, contactoVisible = false;
  function pintar(){
    var mostrar = !heroVisible && !contactoVisible;
    barra.classList.toggle('is-on', mostrar);
  }
  new IntersectionObserver(function(es){
    heroVisible = es[es.length - 1].isIntersecting; pintar();
  }, { threshold: 0.15 }).observe(hero);
  if(contacto){
    new IntersectionObserver(function(es){
      contactoVisible = es[es.length - 1].isIntersecting; pintar();
    }, { threshold: 0.2 }).observe(contacto);
  }
})();
