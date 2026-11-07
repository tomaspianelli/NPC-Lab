/* Núcleo 2 · botones Regresar/Siguiente y globo del científico (no toca HTML ni CSS) */
(function () {
    var scene = document.getElementById('movimiento');
    var foco = 'next';                          // 'next' = Siguiente o barra · 'back' = Regresar
    var iniciado = false;
  
    /* Ajustes a ojo (px del diseño 1920×1080) */
    var BACK_FPS   = { bx: 340, by: 936 };     // Regresar en "¿Qué son los FPS?"
    var BACK_ELIGE = { bx: 78,  by: 936 };      // Regresar en "Elige tu movimiento" (abajo del personaje)
    var GLOBO      = { w: 580,  h: 200 };       // globo del científico (antes 640×250)
  
    function globoD(w, h) {
      return 'M20.5 3.5H' + (w - 20.5) + 'Q' + (w - 3.5) + ' 3.5 ' + (w - 3.5) + ' 20.5V' + (h - 20.5) +
        'Q' + (w - 3.5) + ' ' + (h - 3.5) + ' ' + (w - 20.5) + ' ' + (h - 3.5) +
        'H32L0 ' + (h + 9) + 'Q-7 ' + (h + 12) + ' -6 ' + (h + 6) + 'Q-2 ' + (h - 13) + ' 3.5 ' + (h - 30) + 'V20.5Q3.5 3.5 20.5 3.5Z';
    }
    function slideActual() { return scene.querySelector('.mv-slide[data-n="' + scene.dataset.s + '"]'); }
  
    function pintar() {                         // marca Regresar o Siguiente según el foco
      var s = slideActual(); if (!s) return;
      var bk = s.querySelector('.bk'), sig = s.querySelector('.mv-btn');
      if (bk)  bk.classList.toggle('foc', foco === 'back');
      if (sig) sig.classList.toggle('off', foco === 'back');
    }
  
    function iniciar() {
      if (iniciado) return; iniciado = true;
  
      // Siguiente "apagado" cuando el foco está en Regresar
      var st = document.createElement('style');
      st.textContent = '#screen .mv-btn.off{border-width:calc(3*var(--u));background:#000;padding:0}' +
                       '#screen .mv-btn.off::before,#screen .mv-btn.off::after{display:none}';
      document.head.appendChild(st);
  
      // Regresar en las pantallas 2 y 3 (copia el de "Patrones de movimiento")
      var modelo = scene.querySelector('.mv-slide[data-n="3"] .bk');
      [[1, BACK_FPS], [2, BACK_ELIGE]].forEach(function (a) {
        var b = modelo.cloneNode(true);
        b.style.setProperty('--bx', a[1].bx); b.style.setProperty('--by', a[1].by);
        scene.querySelector('.mv-slide[data-n="' + a[0] + '"]').appendChild(b);
      });
  
      // Globo del científico: más chico y sin el círculo verde
      var bub = document.getElementById('mvBub');
      bub.style.width  = 'calc(' + GLOBO.w + '*var(--u))';
      bub.style.height = 'calc(' + GLOBO.h + '*var(--u))';
      bub.style.top    = 'calc(' + (526 + 250 - GLOBO.h) + '*var(--u))';   // la base queda donde estaba
      bub.querySelector('svg').setAttribute('viewBox', '0 0 ' + GLOBO.w + ' ' + GLOBO.h);
      bub.querySelector('path').setAttribute('d', globoD(GLOBO.w, GLOBO.h));
      bub.querySelector('p').style.width = 'calc(' + (GLOBO.w - 80) + '*var(--u))';
      bub.querySelector('.mv-chev').style.display = 'none';
  
      // Al cambiar de pantalla, el foco vuelve a Siguiente
      new MutationObserver(function () {
        foco = 'next';
        [].forEach.call(scene.querySelectorAll('.bk'), function (b) { b.classList.remove('foc'); });
        [].forEach.call(scene.querySelectorAll('.mv-btn'), function (b) { b.classList.remove('off'); });
        pintar();
      }).observe(scene, { attributes: true, attributeFilter: ['data-s'] });
    }
  
    document.addEventListener('npclab:core', function (e) {
      if (e.detail && e.detail.id === 'movimiento') iniciar();
    });
  
    /* Teclas (captura: corre antes que movimiento.js) */
    window.addEventListener('keydown', function (e) {
      if (scene.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      var n = +scene.dataset.s, k = e.key;
      function stop() { e.preventDefault(); e.stopImmediatePropagation(); }
      if (n === 5) {                                           // Resultados: no se puede volver
        if (k === 'ArrowLeft' || k === 'Backspace' || k === 'Escape') stop();
        return;
      }
      if (n < 1 || n > 4) return;
      var bk = slideActual().querySelector('.bk');
  
      if ((k === 'Enter' || k === ' ') && foco === 'back') {   // Enter sobre Regresar: vuelve
        stop(); if (!e.repeat && bk) bk.click(); return;
      }
      if (n === 2) {                                           // "Elige tu movimiento": ↓ baja a Regresar, ↑ vuelve a la barra
        if (k === 'ArrowDown') { stop(); foco = 'back'; pintar(); }
        else if (foco === 'back' && k === 'ArrowUp') { stop(); foco = 'next'; pintar(); }
        else if (foco === 'back' && (k === 'ArrowLeft' || k === 'ArrowRight')) stop();
        return;
      }
      if (k === 'ArrowLeft')  { stop(); foco = 'back'; pintar(); }   // pantallas 1, 3 y 4
      if (k === 'ArrowRight') { stop(); foco = 'next'; pintar(); }
      
    }, true);
  })();