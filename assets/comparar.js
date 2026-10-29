// Comparador antes/despues: el input range manda la posicion de la linea y recorta la foto
// "antes" con clip-path. Sin libreria; funciona con el dedo, el teclado y el lector de pantalla.
(function(){
  document.querySelectorAll('[data-ba]').forEach(function(ba){
    var r = ba.querySelector('.ba-range');
    if(!r) return;
    function mover(){
      ba.style.setProperty('--ba', r.value + '%');
      r.setAttribute('aria-valuetext', 'Antes ' + r.value + ' %, después ' + (100 - r.value) + ' %');
    }
    r.addEventListener('input', mover);
    mover();
    // Una sola pista de que se puede deslizar: la linea va y vuelve cuando entra en pantalla.
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window){
      var io = new IntersectionObserver(function(es){
        if(!es[0].isIntersecting) return;
        io.disconnect();
        ba.classList.add('is-hint');
      }, { threshold: 0.6 });
      io.observe(ba);
    }
  });
})();
