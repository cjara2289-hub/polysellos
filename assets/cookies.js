// Aviso de cookies. La decision se guarda en localStorage (no es una cookie) y el
// pixel de Meta solo se carga si es "si". Si alguien cambia de "si" a "no", se
// recarga la pagina para que el pixel no siga vivo en memoria y se borran sus cookies.
(function(){
  var caja = document.getElementById('cookie');
  if(!caja) return;
  var raiz = document.documentElement;
  function leer(){ try { return localStorage.getItem('ps_cookies'); } catch(e){ return null; } }
  function guardar(v){ try { localStorage.setItem('ps_cookies', v); } catch(e){} }
  function mostrar(){ caja.hidden = false; raiz.classList.add('cookie-pending'); }
  function ocultar(){ caja.hidden = true; raiz.classList.remove('cookie-pending'); }
  function borrarCookiesMeta(){
    ['_fbp','_fbc'].forEach(function(n){
      document.cookie = n + '=; Max-Age=0; path=/';
      document.cookie = n + '=; Max-Age=0; path=/; domain=' + location.hostname;
    });
  }
  var previa = leer();
  if(previa === 'si') window.psCargarPixel();
  else if(previa !== 'no') setTimeout(mostrar, 1200);

  document.getElementById('cookieSi').addEventListener('click', function(){
    guardar('si'); ocultar(); window.psCargarPixel();
  });
  document.getElementById('cookieNo').addEventListener('click', function(){
    var eraSi = leer() === 'si';
    guardar('no'); ocultar(); borrarCookiesMeta();
    if(eraSi) location.reload();
  });
  var reabrir = document.getElementById('cookieReabrir');
  if(reabrir) reabrir.addEventListener('click', mostrar);
})();
