// FAQ de una sola pregunta abierta a la vez: al abrir una, se cierran las demas.
// Sin esto cada pregunta abierta empuja a las otras y la lista se vuelve muy larga.
(function(){
  var items = [].slice.call(document.querySelectorAll('.faq-list details'));
  items.forEach(function(d){
    d.addEventListener('toggle', function(){
      if(!d.open) return;
      items.forEach(function(o){ if(o !== d) o.open = false; });
    });
  });
})();
