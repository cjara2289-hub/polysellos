// Video de fondo y de muestra. Los archivos no se descargan hasta que hacen falta: preload="none"
// y la fuente se pone aqui. No se carga con "reducir movimiento", con ahorro de datos ni con
// conexion 2g/3g lenta. Los clips son verticales: el del hero solo corre en pantallas angostas.
// Los que no estan en pantalla se pausan para no gastar bateria ni datos.
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var c = navigator.connection || {};
  var lento = c.saveData || /(^|-)(slow-)?2g$|^3g$/.test(c.effectiveType || '');
  if(reduce || lento || !('IntersectionObserver' in window)) return;
  var angosta = window.matchMedia('(max-width: 860px)').matches;

  document.querySelectorAll('video[data-src]').forEach(function(v){
    if(v.hasAttribute('data-solo-movil') && !angosta) return;
    var listo = false;
    function listoParaVer(){ v.classList.add('is-playing'); }
    v.addEventListener('playing', listoParaVer);
    new IntersectionObserver(function(es){
      var ve = es[es.length - 1].isIntersecting;
      if(ve){
        if(!listo){ v.src = v.getAttribute('data-src'); listo = true; }
        var p = v.play(); if(p && p.catch) p.catch(function(){});
      } else if(listo){ v.pause(); }
    }, { threshold: 0.25 }).observe(v);
  });
})();
