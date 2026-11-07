/* ===== Tutorial de los controles =====
   Va después de ponerle nombre al NPC y antes del menú de núcleos:
   nombre.js ─ npclab:nameend ─▶ esta pantalla ─ npclab:tut2end ─▶ menú de núcleos (script.js)

   · Flechas (← → ↑ ↓): cada botón que se toca titila y queda encendido. Enter (botón central) avanza.
   · Palanca ('+'): esa pantalla SOLO avanza con la palanca (Enter y clic no hacen nada).
   · Barra de progreso: animación sola. Enter avanza.
   · Botón rojo ('b'): la pantalla de prueba (data-red) SOLO avanza con el botón rojo.
   El UP del Arduino llega como 'r' sintética: se trata como ↑ y, mientras dura el tutorial,
   body.dataset.typing evita que la R reinicie todo (igual que en nombre.js). */

   (function(){
    var $=function(id){ return document.getElementById(id); };
    var screen=$('screen'), scene=$('tutorial2'), slides=[].slice.call(scene.querySelectorAll('.slide')), sr=$('t2Sr'), body=document.body,
        reduce=matchMedia('(prefers-reduced-motion:reduce)').matches, cursor=document.createElement('i');
    cursor.className='cur';
    var i=0, active=false, ready=false, typing=false, leaving=false, timer=null, tAdv=null, finishNow=null;
    var pads={}, lit={}, lever=scene.querySelector('.t2l');
    [].forEach.call(scene.querySelectorAll('.t2p'),function(p){ pads[p.dataset.k]=p; });
    var NAMES={ up:'arriba', down:'abajo', left:'izquierda', right:'derecha' };
    var DIRS={ ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' };
  
    /* ---------- Globos (mismo contorno que en el tutorial: la cola va a la derecha) ---------- */
    function bubbleD(w,h){
      return 'M20.5 3.5H'+(w-20.5)+'Q'+(w-3.5)+' 3.5 '+(w-3.5)+' 20.5V'+(h-30)+'Q'+(w+2)+' '+(h-13)+' '+(w+6)+' '+(h+2)+'Q'+(w+7)+' '+(h+8)+' '+w+' '+(h+5)+
        'L'+(w-32)+' '+(h-3.5)+'H20.5Q3.5 '+(h-3.5)+' 3.5 '+(h-20.5)+'V20.5Q3.5 3.5 20.5 3.5Z';
    }
    function draw(b,w,h){
      var svg=b.querySelector('svg'); svg.setAttribute('viewBox','0 0 '+w+' '+h); svg.firstElementChild.setAttribute('d',bubbleD(w,h));
    }
    function fitBubbles(slide){                               // el globo se ajusta al ancho del texto, así nunca se desborda
      var scale=screen.clientWidth/1920;
      [].forEach.call(slide.querySelectorAll('.b3[data-fit]'),function(b){
        var sp=b.querySelector('p span'), px=parseFloat(b.style.getPropertyValue('--px')), h=parseFloat(b.style.getPropertyValue('--h')),
            pr=parseFloat(b.style.getPropertyValue('--pr'))||34;
        var w=Math.ceil(sp.getBoundingClientRect().width/scale+px+pr);
        b.style.setProperty('--w',w); draw(b,w,h);
      });
    }
  
    /* ---------- Texto que se escribe solo ---------- */
    function type(slide){
      var rt=slide.querySelector('.rt'), g=rt.querySelector('.g'), t=rt.querySelector('.t');
      t.innerHTML=g.innerHTML; sr.textContent='';
      var nodes=[], w=document.createTreeWalker(t,NodeFilter.SHOW_TEXT);
      while(w.nextNode()) nodes.push(w.currentNode);
      var full=nodes.map(function(x){ return x.nodeValue; }), total=full.join('').length, c=0;
      function paint(){
        var left=c, last=null;
        nodes.forEach(function(nd,k){ var take=Math.max(0,Math.min(full[k].length,left)); nd.nodeValue=full[k].slice(0,take); left-=take; if(take>0) last=nd; });
        if(last) last.parentNode.insertBefore(cursor,last.nextSibling); else t.insertBefore(cursor,t.firstChild);
      }
      finishNow=function(){ clearInterval(timer); typing=false; c=total; paint(); sr.textContent=g.textContent; };
      if(reduce){ finishNow(); return; }
      typing=true; paint();
      timer=setInterval(function(){ c++; paint(); if(c>=total) finishNow(); },24);
    }
  
    /* ---------- Pantallas ---------- */
    function show(n){
      i=n; clearInterval(timer); typing=false; leaving=false; clearTimeout(tAdv);
      slides.forEach(function(s,k){ s.classList.toggle('on',k===n); });
      fitBubbles(slides[n]);
      type(slides[n]);
      if(slides[n].classList.contains('dim')) document.dispatchEvent(new CustomEvent('npclab:redtouched'));   // ya probó el botón rojo
    }
    function next(){
      if(i<slides.length-1) show(i+1);
      else finish();
    }
    function finish(){
      if(!active) return;
      clearTimeout(tAdv); clearInterval(timer);
      active=false; delete body.dataset.typing; scene.hidden=true;
      document.dispatchEvent(new CustomEvent('npclab:tut2end'));          // sigue el menú de núcleos
    }
    function solo(){                                                      // pantallas que NO avanzan con Enter ni con clic
      var s=slides[i];
      return s.hasAttribute('data-red')||s.hasAttribute('data-lever')||!!s.querySelector('.t2l');
    }
  
    /* ---------- Efectos ---------- */
    function retrigger(el,cls,ms){                                        // vuelve a disparar la animación aunque ya esté puesta
      el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls);
      clearTimeout(el._t); el._t=setTimeout(function(){ el.classList.remove(cls); },ms);
    }
    function press(k){                                                    // pantalla 1: una flecha
      var p=pads[k]; if(!p||i!==0) return;
      lit[k]=true; p.classList.add('lit'); retrigger(p,'hit',650);
      var n=Object.keys(lit).length;
      sr.textContent='Botón '+NAMES[k]+' detectado. '+(n>=4?'Las 4 flechas funcionan.':n+' de 4.');
    }
    function pull(){                                                      // la palanca: es lo único que avanza esa pantalla
      var s=slides[i]; if(!lever||!s||!s.querySelector('.t2l')||leaving) return;
      if(typing) finishNow();
      leaving=true;
      retrigger(lever,'hit',1150);
      clearTimeout(lever._o); lever._o=setTimeout(function(){ lever.classList.add('ok'); },1100);     // queda encendido
      sr.textContent='Palanca detectada. El indicador se iluminó.';
      tAdv=setTimeout(function(){ leaving=false; next(); },reduce?0:1500);        // se ve bajar la palanca y recién avanza
    }
    function red(){                                                       // botón rojo ('b' del Arduino o clic en el botón de la pantalla)
      var s=slides[i]; if(!s||!s.hasAttribute('data-red')||leaving) return;
      if(typing) finishNow();
      leaving=true;
      var b=s.querySelector('.t9btn'); if(b) retrigger(b,'hit',600);
      sr.textContent='Botón rojo detectado.';
      tAdv=setTimeout(function(){ leaving=false; next(); },reduce?0:600);         // se ve apretado y pasa a la pantalla siguiente
    }
    function center(){                                                    // Enter (botón central)
      if(typing){ finishNow(); return; }
      if(solo()) return;                                                  // palanca y botón rojo: Enter no hace nada
      next();
    }
  
    /* ---------- Entrada ---------- */
    document.addEventListener('keydown',function(e){
      if(!active||!ready||e.ctrlKey||e.metaKey||e.altKey) return;
      var k=e.key, dir=DIRS[k]||(((k==='r'||k==='R')&&!e.isTrusted)?'up':null);      // el UP del Arduino llega como 'r' sintética
      if(dir){ e.preventDefault(); if(!e.repeat) press(dir); }
      else if(k==='+'){ e.preventDefault(); if(!e.repeat) pull(); }                    // la palanca
      else if(k==='b'||k==='B'){ e.preventDefault(); if(!e.repeat) red(); }            // botón rojo
      else if(k==='Enter'||k===' '){ e.preventDefault(); if(!e.repeat) center(); }
    });


    // Finales de carrera del Arduino: i / w / u eligen el núcleo en el menú
document.addEventListener('keydown',function(e){
  var POR_TECLA={ i:'personalidad', w:'movimiento', u:'conciencia' };
  var k=e.key.length===1?e.key.toLowerCase():e.key;
  var id=POR_TECLA[k];
  var menu=document.getElementById('cores');
  if(!id||e.repeat||!menu||menu.hidden) return;
  var card=menu.querySelector('.core[data-core="'+id+'"]');
  if(card){ e.preventDefault(); card.click(); }
});

    scene.addEventListener('pointerdown',function(e){
      if(!active||!ready) return;
      var t=e.target, p=t.closest&&t.closest('.t2p');
      if(p){ press(p.dataset.k); return; }
      if(t.closest&&t.closest('.t2l')){ pull(); return; }
      if(t.closest&&t.closest('.t9btn')){ red(); return; }
      if(typing){ finishNow(); return; }
      if(solo()) return;                                                  // esas pantallas no avanzan con un clic suelto
      next();
    });
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ if(active) fitBubbles(slides[i]); });
  
    /* ---------- Entrada a la pantalla (la emite nombre.js al aceptar el nombre) ---------- */
    document.addEventListener('npclab:tutorialend',function(){
      document.getElementById('tutorial').hidden=true;
      lit={}; [].forEach.call(scene.querySelectorAll('.lit,.hit,.ok'),function(el){ el.classList.remove('lit','hit','ok'); });
      scene.hidden=false; active=true; ready=false;
      body.dataset.typing='1';                                            // script.js no reinicia con la R mientras dura el tutorial
      setTimeout(function(){ ready=true; },400);                          // el mismo Enter que aceptó el nombre no avanza
      show(0);
    });

      /* ---------- Cinta de seguridad en 8 bits (pantalla de advertencia) ---------- */
  (function(){
    var tape=scene.querySelector('.t9tape'); if(!tape) return;
    var PX=14, COLS=150, T=10, SL=.0875;                 // PX = tamaño del píxel (en px del diseño) · T = grosor en píxeles · SL = inclinación (≈5°)
    var ROWS=T+Math.ceil(COLS*SL)+1;
    var cv=document.createElement('canvas'); cv.width=COLS; cv.height=ROWS;
    var g=cv.getContext('2d');
    for(var x=0;x<COLS;x++){
      var r0=Math.floor((COLS-1-x)*SL);                  // cada columna sube un poco hacia la derecha: queda escalonada
      for(var k=0;k<T;k++){
        var y=r0+k;
        g.fillStyle=(Math.floor((x+y)/3)%2)?'#111':'#fcd116';
        g.fillRect(x,y,1,1);
      }
    }
    cv.style.cssText='display:block;width:100%;height:100%;image-rendering:pixelated';
    tape.appendChild(cv);
    tape.style.background='none';                        // saca las rayas lisas y la rotación
    tape.style.transform='none';
    tape.style.top='calc(846*var(--u))';
    tape.style.height='calc('+(ROWS*PX)+'*var(--u))';
  })();
  })();
