/* Núcleo 3 · botones Regresar / Siguiente (no toca HTML ni CSS) */
(function () {
    var scene = document.getElementById('conciencia');
    var foco = false;                                   // true = Regresar marcado
  
    // Pantallas con Regresar: 'abajo' = ↓ lo marca y ↑ lo suelta · 'lados' = ← lo marca y → lo suelta
    var MODO = { 1: 'abajo', 3: 'lados', 6: 'abajo', 7: 'abajo', 8: 'lados' };
    var SIG  = { 1: 'cBtn1', 6: 'cBtn6', 7: 'cBtn7' };  // el botón Siguiente de cada una
    var BACK_SENTIDOS = { bx: 40, w: 360 };             // Regresar de "Sentidos de usuario": más a la izquierda
  
    /* Estilos que faltaban (los inyecta el JS) */
    var st = document.createElement('style');
    st.textContent =
      '#conciencia .mv-btn.hide{display:none}' +
      '#screen .mv-btn.off{border-width:calc(3*var(--u));background:#000;padding:0}' +
      '#screen .mv-btn.off::before,#screen .mv-btn.off::after{display:none}' +
      '#conciencia.bk-foc .cnext{visibility:hidden}' +                  // sin punto verde en el globo si Regresar está marcado
      '#cs8 .c-bk,#cs8 .c-back{display:none}';
    document.head.appendChild(st);
  
      /* Regresar en "Lógica difusa" y "Elige una habilidad" (copia el de "Lógica clásica") */
  var modelo = scene.querySelector('#cs6 button.bk');
  ['cs7', 'cs8'].forEach(function (id) { scene.querySelector('#' + id).appendChild(modelo.cloneNode(true)); });
  
    /* Saca el Regresar dibujado a mano de "Elige una habilidad" para que sea igual a los demás */
    [].forEach.call(scene.querySelectorAll('#cs8 .hdr path'), function (p) {
      if (/^M(109 954|101 969|399 1049|148 997)/.test(p.getAttribute('d'))) p.remove();
    });
  
    /* "Sentidos de usuario": Regresar más a la izquierda para que no choque con la barra */
    var bs = scene.querySelector('#cs3 .bk');
    bs.style.setProperty('--bx', BACK_SENTIDOS.bx);
    bs.style.width = 'calc(' + BACK_SENTIDOS.w + '*var(--u))';
  
    function slide() { return +scene.dataset.s; }
    function back(n) { return scene.querySelector('#cs' + n + ' button.bk'); }

    function pintar() {
      var n = slide(), b = back(n), sg = SIG[n] && document.getElementById(SIG[n]);
      if (b) b.classList.toggle('foc', foco);
      if (sg) sg.classList.toggle('off', foco);
      scene.classList.toggle('bk-foc', foco);
      if (foco && n === 1) [].forEach.call(scene.querySelectorAll('#cs1 .c-card,#cBtn1'), function (c) { c.classList.remove('foc'); });
    }
  
    new MutationObserver(function () {
      foco = false; scene.classList.remove('bk-foc');
      [].forEach.call(scene.querySelectorAll('button.bk'), function (b) { b.classList.remove('foc'); });
      [].forEach.call(scene.querySelectorAll('.mv-btn'), function (b) { b.classList.remove('off'); });
    }).observe(scene, { attributes: true, attributeFilter: ['data-s'] });
  
    /* Teclas (captura: corre antes que conciencia.js) */
    window.addEventListener('keydown', function (e) {
      if (scene.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      var n = slide(), k = e.key;
      function stop() { e.preventDefault(); e.stopImmediatePropagation(); }
  
      if (n === 9) { if (k === 'ArrowLeft') stop(); return; }          // Resultados: no se puede volver
      var modo = MODO[n]; if (!modo) return;
      var entra = modo === 'lados' ? 'ArrowLeft' : 'ArrowDown';
      var sale  = modo === 'lados' ? 'ArrowRight' : 'ArrowUp';
  
      if (foco) {
        if (k === 'Enter' || k === ' ') {                              // Enter sobre Regresar: vuelve
          stop(); if (!e.repeat) back(n).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        } else if (k === sale) {
          stop(); foco = false; pintar();
          if (n === 1) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));   // vuelve a marcar la carta izquierda
        } else if (k.indexOf('Arrow') === 0) stop();                   // las otras flechas no hacen nada mientras está marcado
        return;
      }
      if (k === entra) {
        if (n === 1 && !scene.querySelector('#cs1 .c-card[data-k="t"]').classList.contains('foc')) return;   // en las cartas, solo desde la izquierda
        stop(); foco = true; pintar();
      }
    }, true);
  })();