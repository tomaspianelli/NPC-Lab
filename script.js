import * as THREE from 'three';
import { fitInto } from './fit.js';
document.fonts.load('700 1em "PP NeueBit"');   // la carga antes de que se midan los globos

/* ===== NPC LAB · mapa del recorrido (cada módulo avisa al siguiente con un evento) =====
   inicio (START)  ─ npclab:start ─▶  tutorial (3 pantallas)  ─ npclab:tutorialend ─▶  menú de núcleos
   menú de núcleos ─ npclab:core {id} ─▶  personalidad.js  peinado → atuendo ─ npclab:outfit ─▶ rasgos.js (personalidad → final)
                                       ▶  movimiento.js     mensajes → selector
                                       ▶  conciencia.js     IA tradicional vs generativa
   cada núcleo, al terminar:  npclab:backtocores {done:id}  → el menú marca el núcleo con tilde y no deja repetirlo
   cuando están los tres:     npclab:allcores               → acá engancha la recompensa
   R (o el botón ↑ del Arduino) reinicia todo. */

/* ===== Piso en perspectiva con Three.js ===== */
(function(){
  var cv=document.getElementById('floor');
  var F={camH:1.2,cell:0.45,fov:50,horizon:0.62,share:0.42,lineW:1.8,speed:0}; // speed > 0 hace avanzar la grilla
  var renderer=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true});
  renderer.setClearColor(0x000000,0);
  var scene=new THREE.Scene();
  var cam=new THREE.PerspectiveCamera(F.fov,16/9,0.1,200);
  cam.position.set(0,F.camH,0);
  var mat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{uCell:{value:F.cell},uScroll:{value:0},uW:{value:2}},
    vertexShader:'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader:[
      'varying vec3 vW; uniform float uCell,uScroll,uW;',
      'void main(){',
      '  vec2 co=vec2(vW.x,vW.z+uScroll)/uCell;',
      '  vec2 g=abs(fract(co-0.5)-0.5)/fwidth(co);',
      '  float l=1.0-clamp(min(g.x,g.y)-(uW-1.0)*0.5,0.0,1.0);',
      '  float fade=1.0-smoothstep(18.0,80.0,length(vW-cameraPosition));',
      '  gl_FragColor=vec4(vec3(1.0),l*fade*0.95);',
      '}'
    ].join('\n')
  });
  var plane=new THREE.Mesh(new THREE.PlaneGeometry(200,200),mat);
  plane.rotation.x=-Math.PI/2; plane.position.z=-100; scene.add(plane);

  // El canvas es solo el 42% inferior de la pantalla: la cámara "ve" el cuadro completo
  // y mostramos esa franja, con el horizonte al 62% de la altura total
  function resize(){
    var dpr=Math.min(window.devicePixelRatio||1,2), w=cv.clientWidth, h=cv.clientHeight, fullH=w*9/16;
    if(!w||!h)return; // la intro está oculta (pasó al tutorial)
    renderer.setPixelRatio(dpr); renderer.setSize(w,h,false);
    cam.aspect=w/fullH;
    cam.setViewOffset(w,fullH,0,fullH*(1-F.share-(F.horizon-0.5)),w,h);
    mat.uniforms.uW.value=Math.max(1,F.lineW*dpr*w/1920);
    renderer.render(scene,cam);
  }
  new ResizeObserver(resize).observe(cv);
  resize();
  if(F.speed>0){
    var t0=performance.now();
    (function loop(now){ mat.uniforms.uScroll.value=(now-t0)/1000*F.speed; renderer.render(scene,cam); requestAnimationFrame(loop); })(t0);
  }
})();

// START: solo la palanca ("+") · lluvia digital de 8 bits (estilo Matrix, en cian) y recién ahí pasa al tutorial
(function(){
  var s=document.getElementById('screen'), stage=document.getElementById('stage'), done=false;
  var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var CW=6, CH=8, NC=40, NR=17, COLS=NC*CW, ROWS=NR*CH;     // celdas de 6×8 px (glifo de 5×7) · 40 columnas × 17 filas
  var HOLD=2000, DUR=2600;                                  // ms: llueve · destello blanco y pasa al tutorial
  var PAL=['#ffffff','#01CBE4','#0fa9bd','#0b7c8e','#075566','#043a47'];   // cabeza · estela de más clara a más oscura
  var glyphs=[], cols=[];

  function R(a,b){ return a+Math.random()*(b-a); }
  function build(){
    var g,r,c;
    for(g=0;g<48;g++){                                      // 48 símbolos inventados de 5×7
      var rows=[];
      for(r=0;r<7;r++){ var m=0; for(c=0;c<5;c++) if(Math.random()<(c===2?.7:.42)) m|=1<<c; rows.push(m); }
      glyphs.push(rows);
    }
    for(c=0;c<NC;c++){
      var cells=[]; for(r=0;r<NR;r++) cells.push(Math.floor(R(0,glyphs.length)));
      cols.push({ delay:R(0,700), sp:R(7,15), len:Math.floor(R(6,14)), cells:cells, off:R(0,NR) });
    }
  }

  function lluvia(fin){
    build();
    var cv=document.createElement('canvas'); cv.width=COLS; cv.height=ROWS; cv.className='start-fx'; cv.setAttribute('aria-hidden','true');
    stage.appendChild(cv);
    var ctx=cv.getContext('2d'), t0=performance.now();
    function glyph(id,x,y){
      var G=glyphs[id], r, c;
      for(r=0;r<7;r++) for(c=0;c<5;c++) if(G[r]&(1<<c)) ctx.fillRect(x+c,y+r,1,1);
    }
    (function frame(now){
      var t=now-t0, c, r, k, L, h, d, col;
      ctx.clearRect(0,0,COLS,ROWS);
      ctx.fillStyle='rgba(0,8,16,'+Math.min(.93,t/350).toFixed(2)+')'; ctx.fillRect(0,0,COLS,ROWS);   // fondo oscuro: tapa toda la pantalla
      for(c=0;c<NC;c++){
        col=cols[c]; if(t<col.delay) continue;
        L=col.len; h=(col.off+(t-col.delay)/1000*col.sp)%(NR+L);     // posición de la cabeza (en filas)
        for(r=0;r<NR;r++){
          d=h-r; if(d<0||d>=L) continue;
          if(Math.random()<.04) col.cells[r]=Math.floor(R(0,glyphs.length));   // los símbolos cambian solos
          k=d<1?0:Math.min(5,1+Math.floor((d-1)/(L-1)*5));
          ctx.fillStyle=PAL[k];
          glyph(col.cells[r],c*CW,r*CH);
        }
      }
      ctx.fillStyle='rgba(1,203,228,.5)'; for(k=0;k<14;k++) ctx.fillRect(Math.floor(R(0,COLS)),Math.floor(R(0,ROWS)),1,1);   // chispas sueltas
      if(t>HOLD){ ctx.fillStyle='rgba(255,255,255,'+Math.min(1,(t-HOLD)/(DUR-HOLD)).toFixed(2)+')'; ctx.fillRect(0,0,COLS,ROWS); }   // destello final
      if(t<DUR){ requestAnimationFrame(frame); return; }
      fin();                                                                // el tutorial ya queda debajo del blanco
      cv.style.opacity='0'; setTimeout(function(){ cv.remove(); },400);
    })(t0);
  }

  function start(){
    if(done) return; done=true; s.classList.add('go');
    var ir=function(){ document.dispatchEvent(new CustomEvent('npclab:start')); };
    if(reduce) setTimeout(ir,700); else lluvia(ir);
  }
  document.addEventListener('keydown',function(e){
    if(e.key==='+'&&!e.repeat){e.preventDefault();start()}
  });
})();

// Tutorial: tres pantallas con el científico (texto que se escribe solo)
(function(){
  var screen=document.getElementById('screen'), intro=document.getElementById('intro'), scene=document.getElementById('tutorial'),
      slides=[].slice.call(scene.querySelectorAll('.slide')), sr=document.getElementById('trSr'),
      reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,
      cursor=document.createElement('i'), i=0, timer=null, typing=false, active=false, finishNow=null;
  cursor.className='cur';

  // Contorno de los globos; la cola puede ir a la derecha ('r') o a la izquierda ('l')
  function bubbleD(w,h,t){
    var s='M20.5 3.5H'+(w-20.5)+'Q'+(w-3.5)+' 3.5 '+(w-3.5)+' 20.5';
    if(t==='l') return s+'V'+(h-20.5)+'Q'+(w-3.5)+' '+(h-3.5)+' '+(w-20.5)+' '+(h-3.5)+'H32L0 '+(h+5)+
      'Q-7 '+(h+8)+' -6 '+(h+2)+'Q-2 '+(h-13)+' 3.5 '+(h-30)+'V20.5Q3.5 3.5 20.5 3.5Z';
    return s+'V'+(h-30)+'Q'+(w+2)+' '+(h-13)+' '+(w+6)+' '+(h+2)+'Q'+(w+7)+' '+(h+8)+' '+w+' '+(h+5)+
      'L'+(w-32)+' '+(h-3.5)+'H20.5Q3.5 '+(h-3.5)+' 3.5 '+(h-20.5)+'V20.5Q3.5 3.5 20.5 3.5Z';
  }
  function draw(b,w,h){
    var svg=b.querySelector('svg');
    svg.setAttribute('viewBox','0 0 '+w+' '+h);
    svg.firstElementChild.setAttribute('d',bubbleD(w,h,b.dataset.tail));
  }
  [].forEach.call(scene.querySelectorAll('.b3'),function(b){
    draw(b,parseFloat(b.style.getPropertyValue('--w')),parseFloat(b.style.getPropertyValue('--h')));
  });
  // Los globos de una sola línea se ajustan al ancho del texto, así nunca se desborda
  function fitBubbles(slide){
    var scale=screen.clientWidth/1920;
    [].forEach.call(slide.querySelectorAll('.b3[data-fit]'),function(b){
      var sp=b.querySelector('p span'), px=parseFloat(b.style.getPropertyValue('--px')), h=parseFloat(b.style.getPropertyValue('--h'));
      var pr=parseFloat(b.style.getPropertyValue('--pr'))||34;                // aire a la derecha
      if(!b.classList.contains('nodot')) pr=Math.max(pr,96);                   // deja lugar para el punto verde
      var x=parseFloat(b.style.getPropertyValue('--x'))||0, maxW=1920-x-70;    // lo máximo que entra sin salirse de la pantalla
      if(b.dataset.fs0===undefined) b.dataset.fs0=b.style.getPropertyValue('--fs');
      b.style.setProperty('--fs',b.dataset.fs0);                               // vuelve al tamaño original antes de medir
      var tw=sp.getBoundingClientRect().width/scale;
      if(tw+px+pr>maxW){                                                       // si no entra, achica el texto justo lo necesario
        b.style.setProperty('--fs',(parseFloat(b.dataset.fs0)*(maxW-px-pr)/tw).toFixed(2));
        tw=sp.getBoundingClientRect().width/scale;
      }
      var w=Math.ceil(tw+px+pr);
      b.style.setProperty('--w',w); draw(b,w,h);
    });
  }

  function show(n){
    i=n; clearInterval(timer);
    slides.forEach(function(s,k){ s.classList.toggle('on',k===n); });
    fitBubbles(slides[n]);
    var rt=slides[n].querySelector('.rt');
if(!rt){ typing=false; sr.textContent=slides[n].textContent.replace(/\s+/g,' ').trim(); return; }   // pantalla sin texto que se escribe solo (la del científico)
var g=rt.querySelector('.g'), t=rt.querySelector('.t');
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
  function advance(){
    if(!active) return;
    if(typing){ finishNow(); return; }                 // si todavía escribe, completa el texto
    if(i<slides.length-1) show(i+1);
    else { active=false; document.dispatchEvent(new CustomEvent('npclab:tutorialend')); } // sigue la pantalla de núcleos
  }

  // La intro dispara 'npclab:start' y pasamos al tutorial
  document.addEventListener('npclab:start',function(){ intro.hidden=true; scene.hidden=false; active=true; show(0); });

  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ if(active) fitBubbles(slides[i]); });

  function back(){
    if(!active||i<=0) return;
    show(i-1);
  }
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft'&&active&&!e.repeat){ e.preventDefault(); back(); }
  });

  // Avanzar: Enter, Espacio, clic o toque
  screen.addEventListener('pointerdown',advance);
  document.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(!e.repeat) advance(); }
  });
})();

// Elegir núcleo: aparece cuando termina el tutorial
(function(){
  var COLORES={ personalidad:'#1bff00', movimiento:'#e50efa', conciencia:'#0027ff' };   // color de cada núcleo en la barra
  var tut=document.getElementById('tutorial'), scene=document.getElementById('cores'),
      txt=document.getElementById('coresMsg'), sr=document.getElementById('coresSr'),
      bar=document.getElementById('coresProg'), prog=[].slice.call(bar.querySelectorAll('i')),
      cards=[].slice.call(scene.querySelectorAll('.core')),
      reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var active=false, ready=false, sel=0, orden=[];       // orden = núcleos en el orden en que se fueron completando

  // El primer tramo toma el color del primer núcleo que terminaste, el segundo el del segundo, y así
  function pintarBarra(){
    prog.forEach(function(s,k){
      var id=orden[k];
      s.classList.toggle('on',!!id);
      if(id) s.style.setProperty('--c',COLORES[id]);
    });
    bar.setAttribute('aria-label','Progreso: '+orden.length+' de 3 núcleos');
  }

  var CABLE='<b>Cada cable corresponde a un nivel y se identifica por su color.</b> <b class="ac">Conectá un cable al maniquí</b> para poder iniciar.';
  var pname='Doc', typeTimer=null;
  document.addEventListener('npclab:nombre',function(e){ if(e.detail&&e.detail.name) pname=e.detail.name; });

  function typeHTML(box,html){                                 // escribe un texto con negritas y colores
    clearInterval(typeTimer);
    var g=box.querySelector('.g'), t=box.querySelector('.t');
    g.innerHTML=html; t.innerHTML=html;
    var nodes=[], w=document.createTreeWalker(t,NodeFilter.SHOW_TEXT);
    while(w.nextNode()) nodes.push(w.currentNode);
    var full=nodes.map(function(x){ return x.nodeValue; }), total=full.join('').length, c=0;
    function paint(){ var left=c; nodes.forEach(function(nd,k){ var take=Math.max(0,Math.min(full[k].length,left)); nd.nodeValue=full[k].slice(0,take); left-=take; }); }
    paint();
    if(reduce){ c=total; paint(); return; }
    typeTimer=setInterval(function(){ c++; paint(); if(c>=total) clearInterval(typeTimer); },22);
  }
  function typePlain(msg){                                     // "Elija uno, nombre" en el globo chico
    clearInterval(typeTimer);
    txt.textContent=msg; fitInto(txt,scene.querySelector('.bubble2'),12,.5);   // si el nombre es largo, se achica
    txt.textContent='';
    if(reduce){ txt.textContent=msg; return; }
    var c=0; typeTimer=setInterval(function(){ c++; txt.textContent=msg.slice(0,c); if(c>=msg.length) clearInterval(typeTimer); },26);
  }

  document.addEventListener('npclab:nameend',function(){
    tut.hidden=true; scene.hidden=false; active=true;
    sr.textContent='Cada cable corresponde a un nivel y se identifica por su color. Conectá un cable al maniquí para poder iniciar.';
    setTimeout(function(){ ready=true; cards[0].focus({preventScroll:true}); },400); // evita que el mismo toque elija un núcleo
    typeHTML(document.getElementById('coresCableT'),CABLE);
  });

  // Vuelta al menú cuando un núcleo termina (la emiten rasgos.js, movimiento.js y conciencia.js)
  document.addEventListener('npclab:backtocores',function(e){
    var id=e.detail&&e.detail.done;
    if(id){
      cards.forEach(function(b){ if(b.dataset.core===id) b.classList.add('done'); });   // gris + tilde
      if(orden.indexOf(id)<0){ orden.push(id); pintarBarra(); }                          // y se suma a la barra
    }
    if(cards.every(function(b){ return b.classList.contains('done'); })){                // los 3 núcleos listos: energía blanca y pantalla final
      var irFinal=function(){ document.dispatchEvent(new CustomEvent('npclab:allcores')); };
      if(reduce){ irFinal(); return; }
      scene.classList.remove('first'); scene.classList.add('fin');                       // el menú se ve sin globos
      scene.hidden=false; active=false; ready=false;
      var esperar=function(){ irFinal(); };                                              // apenas termina la animación blanca, pasa
      var n=0;
      setTimeout(function(){                                                             // espera a que termine la electricidad de la despedida
        cards.forEach(function(b){
          zap(b,function(){ if(++n===cards.length) esperar(); },'#ffffff');              // los tres cables a la vez, en blanco
        });
      },1300);
      return;
    }
    scene.classList.remove('first');                                                     // desde acá el mensaje es "Elija uno, nombre"
    scene.hidden=false; active=true; ready=false;
    var k=cards.findIndex(function(b){ return !b.classList.contains('done'); }); sel=k<0?0:k;
    setTimeout(function(){ ready=true; cards[sel].focus({preventScroll:true}); },400);   // primero se habilitan las teclas
    var msg='Elija uno, '+pname; sr.textContent=msg;
    try{ typePlain(msg); }catch(err){ txt.textContent=msg; console.warn(err); }          // si falla la animación, muestra el texto igual
  });

      /* ---------- Conexión del cable: la energía viaja por el cable y enciende el núcleo (8 bits) ---------- */
  var ZAP={ personalidad:'#1EFF00', movimiento:'#E90BFB', conciencia:'#0015FF' };
  var NSVG='http://www.w3.org/2000/svg', stageEl=document.getElementById('stage');

  // Todo va en una grilla de celdas: la tarjeta ocupa las celdas 4 a 19 y los cables entran por los costados
  var CABLE_L=[[0,17],[1,17],[2,17],[2,16],[2,15],[2,14],[2,13],[2,12],[3,12]];
  var CABLE_R=CABLE_L.map(function(c){ return [23-c[0],c[1]]; });
  var RING=[];                                                 // las 60 celdas del borde de la tarjeta, en sentido horario
  (function(){
    var x,y;
    for(x=4;x<=19;x++) RING.push([x,4]);
    for(y=5;y<=19;y++) RING.push([19,y]);
    for(x=18;x>=4;x--) RING.push([x,19]);
    for(y=18;y>=5;y--) RING.push([4,y]);
  })();

  function zap(b,done,colorFijo){
    var col=colorFijo||ZAP[b.dataset.core]||'#fff', tile=b.querySelector('.tile'), f=0;
    var svg=document.createElementNS(NSVG,'svg');
    svg.setAttribute('class','zap-fx'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
    tile.appendChild(svg); b.style.setProperty('--zc',col); b.classList.add('zap');

    function px(x,y,fill,inner){                               // una celda de 8 bits: cuadrado con un brillo adentro
      return '<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+fill+'"/>'+
        (inner?'<rect x="'+(x+.25)+'" y="'+(y+.25)+'" width=".5" height=".5" fill="'+inner+'"/>':'');
    }
    function frame(){
      var out='', n=CABLE_L.length;
      [CABLE_L,CABLE_R].forEach(function(path){                // la energía entra por los dos cables
        path.forEach(function(c,k){
          if(k<f) out+=px(c[0],c[1],col,(k+f)%2?'#fff':null);       // ya pasó la energía: cable encendido
          else if(k===f) out+=px(c[0],c[1],'#fff','#fff');           // cabeza del pulso
          else out+=px(c[0],c[1],'#2b2b35','#40404e');               // cable apagado
        });
      });
      if(f>=n){                                                // llegó a la tarjeta: el borde se enciende y salta energía adentro
        var tr=5*(f-n)+4;
        RING.forEach(function(c,j){
          var m=Math.min((j-52+60)%60,(j-23+60)%60);
          if(m<=tr) out+=px(c[0],c[1],col,m>=tr-4?'#fff':null);
        });
        for(var s=0;s<10;s++) out+='<rect x="'+(5+Math.floor(Math.random()*14))+'" y="'+(5+Math.floor(Math.random()*14))+'" width="1" height="1" fill="'+col+'" fill-opacity=".4"/>';
      }
      svg.innerHTML=out; f++;
    }
    frame(); var t=setInterval(frame,80);                      // 12,5 cuadros por segundo: se ve "de 8 bits"
    setTimeout(function(){                                     // destello del color del núcleo y recién ahí entra
      var fl=document.createElement('div'); fl.className='zap-flash'; fl.style.background=col; stageEl.appendChild(fl);
      fl.addEventListener('animationend',function(){ fl.remove(); });
      setTimeout(function(){ clearInterval(t); svg.remove(); b.classList.remove('zap'); done(); },180);
    },1200);
  }
  
    function choose(b){
      if(!active||!ready||b.classList.contains('done')) return;     // un núcleo completado no se repite
      active=false;
      var entrar=function(){ document.dispatchEvent(new CustomEvent('npclab:core',{detail:{id:b.dataset.core}})); };   // cada núcleo escucha su id
      if(reduce) entrar(); else zap(b,entrar);
    }
  cards.forEach(function(b,k){
    b.addEventListener('focus',function(){ sel=k; });
    b.addEventListener('click',function(){ choose(b); });
  });
  document.addEventListener('keydown',function(e){
    if(!active||!ready) return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      e.preventDefault();
      sel=(sel+(e.key==='ArrowRight'?1:cards.length-1))%cards.length;
      cards[sel].focus();
    }
  });
})();

// R: reinicia todo y vuelve a la pantalla de inicio
document.addEventListener('keydown',function(e){
  if((e.key==='r'||e.key==='R')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.repeat&&!document.body.dataset.typing) location.reload();
});

// La despedida sabe de qué núcleo viene (para ajustar el tamaño del ítem)
document.addEventListener('npclab:outro',function(e){
  var d=document.getElementById('despedida');
  if(d&&e.detail) d.dataset.id=e.detail.id;
});

// Guarda el objeto elegido en el núcleo 3 (lo leen personalidad.js y movimiento.js)
(function(){
  var PROP={ DPS:'sword', Tanque:'shield', Healer:'kit' };
  window.NPCLAB=window.NPCLAB||{};
  function guardar(e){
    var d=e.detail||{}, c=d.clase||d.habilidad;
    if(PROP[c]) window.NPCLAB.skill={ clase:c, prop:PROP[c] };
  }
  document.addEventListener('npclab:outro',guardar);
  document.addEventListener('npclab:conciencia',guardar);
})();