window.psCargarPixel = function(){
  if(window.fbq) return;
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[]}(window, document,'script');
  // Sin configuracion automatica: el formulario lleva nombre y telefono y no deben ir a Meta.
  fbq('set', 'autoConfig', false, '1517272426842047');
  fbq('init', '1517272426842047');
  fbq('track', 'PageView');
  var pedido = false;
  function cargar(){
    if(pedido) return;
    pedido = true;
    var t = document.createElement('script');
    t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(t);
  }
  ['pointerdown','touchstart','scroll','keydown'].forEach(function(ev){
    window.addEventListener(ev, cargar, { once: true, passive: true, capture: true });
  });
  if(window.requestIdleCallback) requestIdleCallback(cargar, { timeout: 3000 });
  else setTimeout(cargar, 1200);
};
