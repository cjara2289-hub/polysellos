// Formulario de contacto. Envia a /api/lead (funcion de Cloudflare Pages), nunca
// directo a la base de datos: la pagina no lleva ninguna llave. Turnstile se carga
// al acercarse al formulario, para no gastar ancho de banda en la ruta critica.
(function(){
  var form = document.getElementById('leadForm');
  if(!form) return;
  var estado = document.getElementById('leadStatus');
  var boton = form.querySelector('button[type="submit"]');
  var wa = 'https://wa.me/50763731269?text=Hola.%20Quisiera%20un%20diagn%C3%B3stico%20sin%20costo.';

  // Turnstile solo cuando el formulario esta por entrar en pantalla.
  var cargado = false;
  function cargarTurnstile(){
    if(cargado) return;
    cargado = true;
    var t = document.createElement('script');
    t.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    t.async = true; t.defer = true;
    document.head.appendChild(t);
  }
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(e, o){
      if(e[0].isIntersecting){ cargarTurnstile(); o.disconnect(); }
    }, { rootMargin: '600px 0px' }).observe(form);
  } else { cargarTurnstile(); }

  // Los utm_ llegan en la primera pagina y el formulario puede enviarse despues.
  var utm = {};
  try {
    var q = new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign'].forEach(function(k){
      if(q.get(k)) sessionStorage.setItem('ps_' + k, q.get(k).slice(0, 100));
      var v = sessionStorage.getItem('ps_' + k);
      if(v) utm[k] = v;
    });
  } catch(e){}

  var MENSAJES = {
    nombre: 'Escriba su nombre.',
    telefono: 'Escriba un teléfono válido, con 7 a 20 dígitos.',
    area_m2: 'El área debe ser un número mayor que cero.',
    consentimiento: 'Necesitamos su autorización para poder contactarlo.',
    turnstile: 'No pudimos verificar que sea una persona. Intente de nuevo.'
  };
  function decir(texto, error){
    estado.textContent = texto;
    estado.className = 'lead-status' + (error ? ' is-error' : ' is-ok');
  }

  // Mensaje de error con salida por WhatsApp, armado con el DOM (sin innerHTML).
  function fallo(prefijo){
    var a = document.createElement('a');
    a.setAttribute('href', wa);
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'WhatsApp';
    estado.textContent = prefijo;
    estado.appendChild(a);
    estado.appendChild(document.createTextNode('.'));
    estado.className = 'lead-status is-error';
  }

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    var f = new FormData(form);
    var token = f.get('cf-turnstile-response');
    if(!form.nombre.value.trim()) return decir(MENSAJES.nombre, true);
    if(!/^[0-9+()\-\s]{7,20}$/.test(form.telefono.value.trim())) return decir(MENSAJES.telefono, true);
    if(!form.consentimiento.checked) return decir(MENSAJES.consentimiento, true);
    if(!token) return decir('Espere un momento a que termine la verificación e intente de nuevo.', true);

    boton.disabled = true;
    decir('Enviando...', false);
    var cuerpo = {
      nombre: form.nombre.value, telefono: form.telefono.value,
      superficie: form.superficie.value, area_m2: form.area_m2.value,
      mensaje: form.mensaje.value, sitio: form.sitio.value,
      consentimiento: true, turnstile: token
    };
    Object.keys(utm).forEach(function(k){ cuerpo[k] = utm[k]; });

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    }).then(function(r){
      return r.json().catch(function(){ return { ok: false }; }).then(function(j){ return { status: r.status, j: j }; });
    }).then(function(x){
      if(x.j && x.j.ok){
        form.reset();
        if(window.turnstile) try { turnstile.reset(); } catch(e){}
        decir('Recibimos sus datos. Le respondemos en horario de oficina.', false);
        if(window.psEvento) window.psEvento('envio_formulario', 'formulario');
        if(typeof fbq === 'function') fbq('track', 'Lead');
      } else if(x.j && MENSAJES[x.j.campo]){
        decir(MENSAJES[x.j.campo], true);
        if(window.turnstile) try { turnstile.reset(); } catch(e){}
      } else {
        fallo('No pudimos guardar sus datos. Escríbanos por ');
      }
    }).catch(function(){
      fallo('No hay conexión. Escríbanos por ');
    }).then(function(){ boton.disabled = false; });
  });
})();
