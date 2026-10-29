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
  // pantalla, para no ver dos botones iguales a la vez. En las paginas internas la referencia es el boton del encabezado de la pagina. Sin ninguno, entra a los 1,2 s.
  var heroBtn = document.querySelector('.hero-actions .cta-btn, .page-hero .page-cta .cta-btn');
  var listo = false, contactoVisible = false;
  // La entrada con rebote y el anillo corren una sola vez; despues el boton solo aparece y
  // desaparece con opacidad. Antes la animacion se repetia cada vez que se cruzaba el formulario
  // y se veia como un parpadeo al hacer scroll.
  var yaEntro = false;
  function pintar(){
    var on = listo && !contactoVisible;
    if(on && !yaEntro){ yaEntro = true; barra.classList.add('es-primera'); setTimeout(function(){ barra.classList.remove('es-primera'); }, 3400); }
    barra.classList.toggle('is-on', on);
  }
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
