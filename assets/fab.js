// Barra fija de WhatsApp: acompana el scroll hacia abajo y hacia arriba en todas las paginas. Se muestra
// cuando la tarjeta del hero ya salio de pantalla y se esconde mientras la seccion de
// contacto esta a la vista (alli ya hay un boton igual). Vive fuera del bloque de
// animacion: con "reducir movimiento" el JS de scroll sale temprano y la barra no
// aparecia nunca. visibility la saca del orden de tabulacion cuando esta escondida.
(function(){
  var barra = document.getElementById('ctaSticky');
  // En la home la referencia es la tarjeta del hero; en las paginas internas, su encabezado.
  var hero = document.querySelector('.hero-card, .page-hero');
  var contacto = document.getElementById('contacto');
  if(!barra) return;
  // Privacidad y 404 no tienen hero: la barra queda visible desde el principio.
  if(!hero || !('IntersectionObserver' in window)){ barra.classList.add('is-on'); return; }

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
