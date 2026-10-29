// Boton fijo de WhatsApp: acompana el scroll en todas las paginas. Aparece con una entrada
// animada (ver .cta-sticky en styles.css) y se esconde solo mientras
// la seccion de contacto esta a la vista, donde ya hay un boton igual. Vive fuera del bloque
// de animacion: con "reducir movimiento" ese JS sale temprano y el boton no aparecia nunca.
// visibility lo saca del orden de tabulacion cuando esta escondido.
(function(){
  var barra = document.getElementById('ctaSticky');
  if(!barra) return;
  var contacto = document.getElementById('contacto');
  // En la home el boton del hero ya esta a la vista: la pastilla entra cuando ese boton sale de
  // pantalla, para no ver dos botones iguales a la vez. Sin boton de hero, entra a los 1,2 s.
  var heroBtn = document.querySelector('.hero-actions .cta-btn');
  var listo = false, contactoVisible = false;
  function pintar(){ barra.classList.toggle('is-on', listo && !contactoVisible); }
  if(heroBtn && 'IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      listo = !es[es.length - 1].isIntersecting; pintar();
    }, { threshold: 0.4 }).observe(heroBtn);
  } else {
    setTimeout(function(){ listo = true; pintar(); }, 1200);
  }
  if(contacto && 'IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      contactoVisible = es[es.length - 1].isIntersecting; pintar();
    }, { threshold: 0.2 }).observe(contacto);
  }
})();
