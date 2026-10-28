(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;

  var reveals = [].slice.call(document.querySelectorAll('[data-reveal]'));
  var revObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      var d = parseInt(e.target.getAttribute('data-delay') || '0', 10);
      setTimeout(function(){ e.target.classList.add('is-visible'); }, d);
      revObs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  reveals.forEach(function(el){ revObs.observe(el); });

  function runCount(el){
    var target = parseFloat(el.getAttribute('data-count'));
    if(isNaN(target)) return;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var final = el.textContent;
    var dur = 1200;
    var t0 = performance.now();
    function tick(now){
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      if(p < 1){
        el.textContent = prefix + Math.round(target * eased) + suffix;
        requestAnimationFrame(tick);
      } else {
        el.textContent = final;
      }
    }
    requestAnimationFrame(tick);
  }
  var counters = [].slice.call(document.querySelectorAll('[data-count]'));
  var cntObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      cntObs.unobserve(e.target);
      runCount(e.target);
    });
  }, { threshold: 0.5 });
  counters.forEach(function(el){ cntObs.observe(el); });

  var grow = document.querySelector('[data-ps-grow]');
  if(grow){
    var growObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        e.target.classList.add('is-grown');
        growObs.unobserve(e.target);
      });
    }, { threshold: 0.35 });
    growObs.observe(grow);
  }

  var bg = document.querySelector('.hero-bg');
  var header = document.getElementById('siteHeader');
  var raf = null;
  function onScroll(){
    if(raf) return;
    raf = requestAnimationFrame(function(){
      raf = null;
      var y = window.scrollY || document.documentElement.scrollTop;
      if(bg) bg.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
      if(header) header.classList.toggle('is-tight', y > 40);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
