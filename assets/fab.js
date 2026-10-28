// El FAB tambien vive fuera del bloque de animacion: estaba adentro y con
// "reducir movimiento" activado nunca se registraba, asi que quedaba encima del
// hero de forma permanente, que es justo lo que se queria evitar.
//
// Y solo se esconde en escritorio. En movil la tarjeta del hero pasa a ancho
// completo dentro del flujo, o sea que no puede solaparse con el FAB, pero el
// observer igual lo apagaba: hay una franja de viewports (845-894px de alto a
// 393px de ancho, o sea el iPhone 15 Pro) donde la tarjeta intersecta mas del
// 25% y su boton todavia no entra en pantalla. Ahi no quedaba ningun CTA visible
// al cargar. El breakpoint es el mismo en el que la tarjeta deja de flotar.
(function(){
  var fab = document.getElementById('fab');
  var corner = document.querySelector('.hero-card');
  if(!fab || !corner) return;
  if(!window.matchMedia('(min-width: 861px)').matches) return;

  new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      var hide = e.isIntersecting;
      fab.style.opacity = hide ? '0' : '1';
      // visibility saca el FAB del orden de tabulacion y del arbol de
      // accesibilidad: con opacity sola seguia recibiendo foco estando invisible.
      fab.style.visibility = hide ? 'hidden' : 'visible';
      fab.style.pointerEvents = hide ? 'none' : 'auto';
      fab.style.transform = hide ? 'translateY(14px) scale(.86)' : 'none';
    });
  }, { threshold: 0.25 }).observe(corner);
})();
