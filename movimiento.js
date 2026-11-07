import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { fitInto, designBox } from './fit.js';
import { NPC_URL, NPC_FACING, HAIR_MODELS, OUTFIT_MODELS } from './modelos.js';
import './movimiento-botones.js';
import { cargarAtuendo } from './ropa.js';
import { makeRig, runPose, POSES } from './rig.js';
import { propElegido, montarProps, ubicarProp } from './prop-npc.js';

/* ===== Núcleo 2 · Movimiento =====
   6 pantallas (Enter avanza, ← vuelve):
   1 ¿Qué es un ciclo?  ·  2 ¿Qué son los FPS?  ·  3 Elige tu movimiento (← → o clic/arrastre en la barra)  ·
   4 Patrones tradicionales  ·  5 Patrones con IA generativa  ·  6 Resultados (Enter termina y vuelve al menú).
   El NPC corre con una animación hecha por código sobre tu modelo 3D (el OBJ no tiene esqueleto):
   el rig (rig.js, con las medidas del cuerpo en JOINTS) mueve piernas, rodillas, brazos, codos y torso según el momento del ciclo.
   Resultados: tu NPC de frente con el peinado y el atuendo que elegiste, el nombre que le pusiste en el texto
   y tres barras (FPS, ciclos y pasos por minuto) que salen de donde dejaste la barra de velocidad.
   Barra de progreso (magenta, arriba a la derecha): se rellena al avanzar de pantalla y no se muestra en Resultados. */

var NPC_COLORS = { 'Material': 0xe8e8e8, 'Material.001': 0x1a1a1a };
var TAU = Math.PI * 2;

/* ---- Dónde va cada NPC en cada pantalla (px del diseño 1920×1080: x = centro, y = pies, h = alto) ----
   cycle = segundos que dura un ciclo · fps = cuadros por segundo (si no se indica, se mueve fluido) · ph = fase fija (NPC quieto) */
var PLAN = [
  [ {x:575, y:830, h:430, ph:.04, run:1}, {x:930, y:830, h:430, ph:.34, run:1}, {x:1305, y:830, h:430, ph:.62, run:1} ],   // 1 · ciclo (quietos)
  [ {x:1100, y:565, h:413, cycle:.98, fps:30, run:1}, {x:1539, y:565, h:413, cycle:.9, fps:60, run:1} ],                   // 2 · 30 FPS y 60 FPS
  [ {x:265, y:766, h:515, slider:1, run:1} ],                                                                              // 3 · lo mueve la barra
  [ {x:1160, y:815, h:350, cycle:.8, run:1} ],                                                                             // 4 · tradicionales
  [ {x:1155, y:818, h:352, cycle:.8, run:1} ],                                                                             // 5 · con IA
  [ {x:362, y:900, h:600, slider:1, run:1} ]                                                                               // 6 · tu NPC corriendo a la velocidad elegida                                                                                       // 6 · tu NPC de frente
];

/* ---- Textos del resultado según dónde dejó la barra (0 = enérgico … 1 = lento) · {n} = el nombre del NPC ---- */
var CATS = [
  { max:.2,  n:'Energético',     s:'Movimiento rápido',
    d:'El NPC se mueve con rapidez y energía, realiza acciones dinámicas y responde con velocidad a los estímulos del entorno. Sus movimientos son amplios y transmite una sensación constante de actividad.',
    pro:'+30% velocidad · +20% reacción', con:'−25% resistencia · +15% consumo de energía' },
  { max:.4,  n:'Semienergético', s:'Ritmo ágil',
    d:'El NPC mantiene un ritmo activo, pero sin exagerar sus movimientos. Camina con decisión, cambia de dirección con fluidez y combina momentos de rapidez con pausas breves.',
    pro:'+15% velocidad · +10% reacción', con:'−10% resistencia · +5% consumo de energía' },
  { max:.6,  n:'Equilibrado',    s:'Ritmo moderado',
    d:'El NPC combina movimientos ágiles y pausados según la situación. Camina a una velocidad moderada, realiza transiciones naturales y mantiene un ritmo estable sin destacar por su rapidez ni por su lentitud.',
    pro:'Sin bonificaciones', con:'Sin penalizaciones' },
  { max:.8,  n:'Semilento',      s:'Ritmo pausado',
    d:'El NPC se mueve con tranquilidad y evita los desplazamientos apresurados. Sus pasos son más lentos, sus transiciones menos bruscas y sus acciones transmiten una actitud relajada o cautelosa.',
    pro:'+15% resistencia · +10% precisión', con:'−10% velocidad · −5% reacción' },
  { max:1.1, n:'Lento',          s:'Movimiento pausado',
    d:'El NPC se desplaza a un ritmo reducido y realiza sus movimientos sin apuro. Sus pasos son lentos, sus reacciones corporales pueden tener más demora y su presencia transmite calma, cansancio o pesadez, según las demás características de su personalidad.',
    pro:'+30% resistencia · +20% precisión', con:'−25% velocidad · −15% reacción' }
];

/* Barras de la pantalla de resultados: cada barra tiene su propio eje (marcas a la misma distancia una de otra)
   y el valor se ubica entre las dos marcas que lo rodean. Si pasa de la última marca, la barra queda llena. */
var TICKS = { fps:[2,30,60,90,120], cpm:[2,30,60,90,120], spm:[2,60,120,180,240] };
var TRACK = 734;                                                      // ancho de la barra en px del diseño
function posOf(v,T){
  if(v<=T[0]) return 0;
  if(v>=T[T.length-1]) return 1;
  for(var i=0;i<T.length-1;i++) if(v<T[i+1]) return (i+(v-T[i])/(T[i+1]-T[i]))/(T.length-1);
  return 1;
}

/* Estilo de carrera según la barra: más enérgico = zancada más grande, rodillas más altas, más inclinación */
function runStyle(t){
  var L=function(a,b){ return a+(b-a)*t; };
  return { leg:L(.78,.42), knee:L(1.05,.5), lean:L(.22,.05), elbow:L(1.4,.95), swing:L(.85,.45), bob:L(.03,.012) };
}
var RUN_DEFAULT = runStyle(.25);

(function(){
  var $=function(id){ return document.getElementById(id); };
  var cores=$('cores'), scene=$('movimiento'), cv=$('mvNpc'), sr=$('mvSr'),
      slides=[].slice.call(scene.querySelectorAll('.mv-slide')),
      track=$('mvTrack'), prev=$('mvPrev'), next=$('mvNext'), labE=$('mvLabE'), labL=$('mvLabL'),
      enf=$('mvEnf'), dato=$('mvDato'), rains=[].slice.call(scene.querySelectorAll('.mv-rain')),
      progEl=$('mvProg'),
      reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var cur=0, ready=false, started=false, t=.5, choice={}, three=null, pname='NPC';

  document.addEventListener('npclab:hairchosen',function(e){ choice.hair=e.detail.id; });
  document.addEventListener('npclab:outfit',function(e){ choice.outfit=e.detail&&e.detail.id; });
  document.addEventListener('npclab:nombre',function(e){ pname=e.detail.name; });      // el nombre que le pusiste (nombre.js)

    /* ---------- Globo del científico (pantalla 2) ---------- */
    var BW=660, BH=300;
    function fitBub(){ fitInto($('mvBub').querySelector('p'),$('mvBub'),34,.7); }
    $('mvBub').querySelector('path').setAttribute('d','M20.5 3.5H'+(BW-20.5)+'Q'+(BW-3.5)+' 3.5 '+(BW-3.5)+' 20.5V'+(BH-20.5)+'Q'+(BW-3.5)+' '+(BH-3.5)+' '+(BW-20.5)+' '+(BH-3.5)+
      'H32L0 '+(BH+9)+'Q-7 '+(BH+12)+' -6 '+(BH+6)+'Q-2 '+(BH-13)+' 3.5 '+(BH-30)+'V20.5Q3.5 3.5 20.5 3.5Z');

  function fmt(c){ return String(Math.round(c*10)/10).replace('.',','); }
  function cycleOf(v){ return .5*Math.pow(4,v); }                      // 0 → 0,5 s · 0,5 → 1 s · 1 → 2 s
  function fpsOf(v){ return Math.round(120-100*v); }                   // 0 → 120 FPS · 1 → 20 FPS

  /* Los números y las etiquetas de "Elige tu movimiento" se achican solos si no entran en su casillero */
  var numEls=[].slice.call(scene.querySelectorAll('.mv-num[data-k],.mv-slide[data-n="2"] .mv-lab'));
  numEls.forEach(function(e){ e.dataset.fs=parseFloat(e.style.getPropertyValue('--fs')); });
  function fitNums(){
    var k=$('screen').clientWidth/1920; if(!k) return;
    numEls.forEach(function(e){
      if(!e.offsetParent) return;                                       // oculto: no se puede medir
      e.style.setProperty('--fs',e.dataset.fs);
      var w=e.getBoundingClientRect().width/k;
      if(w>264) e.style.setProperty('--fs',(e.dataset.fs*264/w).toFixed(1));
    });
    [].forEach.call(scene.querySelectorAll('.mv-st p'),function(p){ fitInto(p,p.parentNode,10); });
  }
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitNums);

  function paintNumbers(){
    var cyc=cycleOf(t), cpm=Math.round(60/cyc);                         // 0,5 s → 120 · 1 s → 60 · 2 s → 30
    var val={ cycle:fmt(cyc), fps:String(fpsOf(t)), cpm:String(cpm), spm:String(cpm*2) };   // FPS según la barra · pasos = 2 por ciclo (240 · 120 · 60)
    [].forEach.call(scene.querySelectorAll('.mv-num[data-k]'),function(el){ el.textContent=val[el.dataset.k]; });

    /* Resultados: cada fila (FPS, ciclos, pasos) llena su barra y pone el número pegado al final */
    [].forEach.call(scene.querySelectorAll('.mv-rbar'),function(r){
      var txt=val[r.dataset.k], p=posOf(+txt,TICKS[r.dataset.k]), num=r.querySelector('.mv-rval');
      r.style.setProperty('--p',p.toFixed(3));
      num.textContent=txt;
      num.classList.toggle('end',p*TRACK+14+txt.length*54>TRACK-6);     // si no entra a la derecha del relleno, va adentro, pegado al borde
    });

    var inf=$('mvInfo');                                                // frase que cambia con la barra
    if(inf){
      var c=fmt(cyc), un=c==='1'?'segundo':'segundos';
      var base=t<.33?'¡Movimiento rápido! El personaje completa su ciclo en '+c+' '+un+'. Sus pasos son más veloces y energéticos.'
        :t<.66?'Movimiento moderado. El personaje completa su ciclo en '+c+' '+un+'. Sus pasos son parejos y naturales.'
        :'Movimiento lento. El personaje completa su ciclo en '+c+' '+un+'. Sus pasos son más espaciados y tranquilos.';
        inf.innerHTML=base+' <span class="nw mv-ok">Confirma con el botón. <i class="mv-dot"></i></span>';
      fitInto(inf,designBox(537,620,1290,150),8);
    }
    fitNums();
  }
  function setSlider(v){
    t=Math.max(0,Math.min(1,Math.round(v*100)/100));                    // cualquier punto de la barra
    track.style.setProperty('--t',t); track.setAttribute('aria-valuenow',Math.round(t*10));
    labE.style.opacity=(1-t*.72).toFixed(2); labL.style.opacity=(.28+t*.72).toFixed(2);   // la etiqueta del lado elegido se enciende
    paintNumbers();
  }
  function flash(el){ el.classList.add('press'); setTimeout(function(){ el.classList.remove('press'); },140); }

  /* Clic o arrastre sobre la barra (mouse o toque) */
  track.style.touchAction='none';
  function trackPick(e){ var r=track.getBoundingClientRect(), kw=r.width*85/1079; setSlider((e.clientX-r.left-kw/2)/(r.width-kw)); }
  track.addEventListener('pointerdown',function(e){ if(!ready) return; track.setPointerCapture(e.pointerId); trackPick(e); });
  track.addEventListener('pointermove',function(e){ if(track.hasPointerCapture(e.pointerId)) trackPick(e); });

  /* Categoría según la barra (no toca el DOM) y texto del resultado con el nombre del NPC */
  function cat(){ return CATS.filter(function(x){ return t<x.max; })[0]; }
  function resultado(){
    var c=cat();
    enf.textContent=c.n;
    dato.textContent=c.d.replace('{n}',function(){ return pname; });
    fitInto(dato,designBox(751,240,1080,195),10);                      // si no entra en el espacio, se achica solo
    return c;
  }

  /* Barra de progreso: casi completa en la penúltima pantalla (90%) · la de Resultados no la muestra (la oculta el CSS) */
  function prog(n){
    if(!progEl) return;
    var p=n>=5?1:.9*n/4;
    progEl.style.setProperty('--p',p.toFixed(3));
    progEl.setAttribute('aria-label','Progreso: '+Math.round(p*100)+'%');
  }

  /* ---------- Pantallas ---------- */
  function show(n){
    cur=n; scene.dataset.s=n; prog(n);
    slides.forEach(function(s,k){ s.classList.toggle('on',k===n); });
    if(n===1) fitBub();
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ fitNums(); if(cur===1) fitBub(); });
    if(n===2||n===5) paintNumbers();
    if(n>=3) mountExtras();                                              // el peinado y el atuendo se cargan antes de llegar a los resultados
    var txt='';
    if(n===5){
      var c=resultado(), v=function(k){ return (scene.querySelector('.mv-rbar[data-k="'+k+'"] .mv-rval')||{}).textContent; };
      txt='Resultados. Movimiento '+c.n+'. '+dato.textContent+' FPS: '+v('fps')+'. Ciclos por minuto: '+v('cpm')+'. Pasos por minuto: '+v('spm')+'.';
    }
    else { var p=slides[n].querySelector('.mv-p,.mv-info'), tt=slides[n].querySelector('.mv-title'); txt=(tt?tt.textContent+'. ':'')+(p?p.textContent:''); }
    sr.textContent=txt;
  }
  function go(d){ var n=cur+d; if(n<0||n>5) return; show(n); }
  function finish(){
    ready=false;                                                      // Resultados queda detrás de la despedida del científico
    var c=cat();
    document.dispatchEvent(new CustomEvent('npclab:movimiento',{detail:{value:t,cycle:cycleOf(t),fps:fpsOf(t),nivel:c.n,corto:c.s,pro:c.pro,con:c.con}}));
    document.dispatchEvent(new CustomEvent('npclab:outro',{detail:{id:'movimiento',nivel:c.n}}));
  }

  document.addEventListener('npclab:core',function(e){
    if(e.detail.id!=='movimiento') return;
    cores.hidden=true; scene.hidden=false; ready=false; setTimeout(function(){ ready=true; },400);   // el mismo Enter no avanza
    if(!started){ started=true; initThree(); initRain(); }
    setSlider(.5);                                                       // la barra arranca en el medio
    show(0);
  });

  scene.addEventListener('click',function(e){
    if(ready&&e.target.closest('.bk')&&cur>=1&&cur<=4) go(-1);
  });

  document.addEventListener('keydown',function(e){
    if(scene.hidden||!ready) return;
    if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(e.repeat) return; if(cur<5) go(1); else finish(); return; }
    if((e.key==='Backspace'||e.key==='Escape')&&cur>=1&&cur<=4){ e.preventDefault(); go(-1); return; }
    if(cur===2&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){          // en "Elige tu movimiento" las flechas mueven la barra
      e.preventDefault(); var d=e.key==='ArrowRight'?1:-1; setSlider(t+d*.1); flash(d>0?next:prev); return;
    }
    if(e.key==='ArrowLeft'){ e.preventDefault(); go(-1); }
  });

  /* ---------- Lluvia (pantallas 4 y 5): cae siempre dentro del cuadro ---------- */
  var rainSets=[];
  // Escalones de la línea de píxeles que hace de techo en la pantalla "tradicionales" (x, y del diseño; cada uno mide 17×11)
  var ARC=[[1376,372],[1390,363],[1404,354],[1418,345],[1432,336],[1446,336],[1460,327],[1474,327],[1488,318],[1502,318],[1516,318],[1530,318],[1544,318],[1558,318],[1572,318],[1586,327],[1600,327],[1614,336],[1628,336],[1642,345],[1656,354],[1670,363],[1684,372]];
  function arcTop(px,w){                                  // altura del techo justo encima de una gota (1e9 = no hay techo)
    var tp=1e9;
    for(var k=0;k<ARC.length;k++){ var a=ARC[k]; if(px<a[0]+17&&px+w>a[0]&&a[1]<tp) tp=a[1]; }
    return tp;
  }
  function initRain(){
    rains.forEach(function(c,n){
      var ps=[]; for(var i=0;i<75;i++) ps.push({x:Math.random()*670,y:Math.random()*600,v:70+Math.random()*120,l:9+Math.random()*6});
      rainSets.push({c:c,ctx:c.getContext('2d'),ps:ps,arc:n===0,y0:215});   // solo la primera pantalla tiene techo
    });
  }
  function drawRain(r,dt){
    var c=r.c, dpr=Math.min(window.devicePixelRatio||1,2), w=c.clientWidth, h=c.clientHeight; if(!w) return;
    if(c.width!==Math.round(w*dpr)){ c.width=Math.round(w*dpr); c.height=Math.round(h*dpr); }
    var k=c.width/670, x=r.ctx; x.clearRect(0,0,c.width,c.height); x.fillStyle='#00e8cf';
    r.ps.forEach(function(p){
      if(!reduce){ p.y+=p.v*dt; if(p.y>600){ p.y=-p.l; p.x=Math.random()*670; } }
      var len=p.l;
      if(r.arc){
        var top=arcTop(1000+p.x,4.5)-r.y0;                 // techo en coordenadas del canvas
        if(top<1e8){
          if(p.y>=top){ p.y=-p.l; p.x=Math.random()*670; len=0; }   // ya tocó el techo: vuelve a empezar arriba
          else len=Math.min(p.l,top-p.y);                          // la gota se corta justo donde lo toca
        }
      }
      if(len>0) x.fillRect(p.x*k,p.y*k,4.5*k,len*k);
    });
  }

  /* ---------- NPC 3D con animación de carrera hecha por código (rig.js) ---------- */
  var insts=[], restObj=null;

  var peinado=false;
  function peinar(){
    var cfg=HAIR_MODELS[choice.hair];
    if(peinado||!cfg||!insts.length) return;
    peinado=true;
    new OBJLoader().load(cfg.url,function(o){
      try{
        o.traverse(function(m){ if(m.isMesh) m.material=new THREE.MeshStandardMaterial({color:cfg.color,roughness:.85,side:THREE.DoubleSide}); });
        insts.forEach(function(n){ n.rig.hair(o); });
      }catch(err){ console.error('Pelo:',err); }
    },undefined,function(err){ peinado=false; console.error('No se pudo cargar '+cfg.url,err); });
  }

  var peinado=false;
  function peinar(){                                   // el pelo elegido va en todos los NPC (corriendo y de frente)
    var cfg=HAIR_MODELS[choice.hair];
    if(peinado||!cfg||!insts.length) return;
    peinado=true;
    new OBJLoader().load(cfg.url,function(o){
      o.traverse(function(m){ if(m.isMesh) m.material=new THREE.MeshStandardMaterial({color:cfg.color,roughness:.85,side:THREE.DoubleSide}); });
      insts.forEach(function(n){ n.rig.hair(o); });
    },undefined,function(){ peinado=false; });
  }

  var vestido=false;
  function vestir(){                                   // el atuendo elegido corre y camina con el cuerpo
    if(vestido||!choice.outfit) return;
    cargarAtuendo(choice.outfit,function(o){
      if(!o||vestido) return; vestido=true;
      insts.forEach(function(n){ n.rig.dress(o); });
    });
  }

  var peinado=false;
  function peinar(){                                   // el pelo elegido va pegado a la cabeza de todos los NPC
    var cfg=HAIR_MODELS[choice.hair];
    if(peinado||!cfg||!insts.length) return;
    peinado=true;
    new OBJLoader().load(cfg.url,function(o){
      try{
        o.traverse(function(m){ if(m.isMesh) m.material=new THREE.MeshStandardMaterial({color:cfg.color,roughness:.85,side:THREE.DoubleSide}); });
        insts.forEach(function(n){ n.rig.hair(o); });
      }catch(err){ console.error('Pelo:',err); }
    },undefined,function(err){ peinado=false; console.error('No se pudo cargar '+cfg.url,err); });
  }

  function initThree(){
    var R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true}); R.setClearColor(0x000000,0);
    var S=new THREE.Scene(), cam=new THREE.PerspectiveCamera(30,16/9,.1,60); cam.position.set(0,0,10);
    var H=2*10*Math.tan(THREE.MathUtils.degToRad(15)), K=H/1080;                    // alto visible a z=0 y unidades por px del diseño
    S.add(new THREE.HemisphereLight(0xffffff,0x8a7fc8,1.0));
    var key=new THREE.DirectionalLight(0xffffff,1.8); key.position.set(-2.5,3,5); S.add(key);
    var rim=new THREE.DirectionalLight(0xff66e0,.7); rim.position.set(3,1,-3); S.add(rim);
    three={R:R,S:S,cam:cam};

    new OBJLoader().load(NPC_URL,function(obj){
      obj.traverse(function(m){
        if(!m.isMesh) return;
        var list=Array.isArray(m.material)?m.material:[m.material];
        var out=list.map(function(old){ return old.map?old:new THREE.MeshStandardMaterial({color:NPC_COLORS[old.name]!==undefined?NPC_COLORS[old.name]:0xe8e8e8,roughness:.85}); });
        m.material=Array.isArray(m.material)?out:out[0];
      });
      restObj=obj;
      PLAN.forEach(function(list,slide){ list.forEach(function(cfg){ insts.push(makeNpc(obj,cfg,slide)); }); });
      try{ vestir(); }catch(err){ console.error('Ropa:',err); }
      try{ peinar(); }catch(err){ console.error('Pelo:',err); }
    },undefined,function(err){ console.error('Falló la carga o el armado del NPC:',err); });

    function makeNpc(src,cfg,slide){
      var rig=makeRig(src), obj=rig.obj;                                             // copia posable del OBJ
      var holder=new THREE.Group(), inner=new THREE.Group();
      inner.rotation.y=cfg.front?NPC_FACING:0;                                       // de perfil (mira a la derecha) o de frente
      inner.add(obj); holder.add(inner); inner.updateMatrixWorld(true);
      var bb=new THREE.Box3().setFromObject(obj), c=bb.getCenter(new THREE.Vector3());
      obj.position.set(-c.x,-bb.min.y,-c.z);                                         // centrado y apoyado en el piso
      var restH=bb.max.y-bb.min.y, s=cfg.h*K/restH;
      holder.scale.setScalar(s); holder.position.set((cfg.x-960)*K,(540-cfg.y)*K,0);
      S.add(holder);
      var pose0=cfg.front?POSES.rest:runPose(cfg.ph!==undefined?cfg.ph:.25,RUN_DEFAULT);
var n={slide:slide,cfg:cfg,holder:holder,obj:obj,rig:rig,baseY:holder.position.y,ph:cfg.ph||0,time:0,K:K,bobPx:cfg.h*.025,
       props:montarProps(obj),pose0:pose0,kind:null};
      if(cfg.ph!==undefined||reduce) rig.apply(runPose(cfg.ph!==undefined?cfg.ph:.25,RUN_DEFAULT));   // quietos
      return n;
    }

    new ResizeObserver(function(){
      var w=cv.clientWidth,h=cv.clientHeight; if(!w||!h) return;
      R.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); R.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix();
    }).observe(cv);

    var last=performance.now();
    (function loop(now){
      requestAnimationFrame(loop);
      var dt=Math.min(.05,(now-last)/1000); last=now;
      if(scene.hidden) return;
      rainSets.forEach(function(r){ if(r.c.offsetParent) drawRain(r,dt); });
      insts.forEach(function(n){
        var vis=n.slide===cur; n.holder.visible=vis; if(!vis) return;
        var kind=propElegido();
        if(n.cfg.front||n.cfg.ph!==undefined||reduce){            // NPC quieto: el objeto se ubica una sola vez
          if(kind!==n.kind){ n.kind=kind; ubicarProp(n.props,kind,n.rig,n.pose0); }
          return;
        }
        var usr=n.cfg.slider||n.slide>=3;                          // barra de velocidad y pantallas de patrones: usan lo que eligió el usuario
        var cyc=usr?cycleOf(t):n.cfg.cycle, P=usr?runStyle(t):RUN_DEFAULT, ph;
        n.time+=dt;
        if(usr){
          n.ph=(n.ph+dt/cyc)%1;
          if(n.cfg.slider){ var N=Math.max(1,Math.round(fpsOf(t)*cyc)); ph=Math.floor(n.ph*N)/N; }   // en "Elige tu movimiento" se ven los FPS
          else ph=n.ph;                                                                              // en patrones, fluido
        } else {
          var tt=n.cfg.fps?Math.floor(n.time*n.cfg.fps)/n.cfg.fps:n.time;
          ph=(tt/cyc)%1;
        }
        var pz=runPose(ph,P); n.rig.apply(pz); ubicarProp(n.props,kind,n.rig,pz);
        n.holder.position.y=n.baseY+Math.abs(Math.sin(ph*TAU))*P.bob*n.cfg.h*n.K;
      });
      R.render(S,cam);
    })(last);
  }

  /* ---------- Resultados: tu NPC de frente con el peinado y el atuendo que elegiste (si los modelos existen) ----------
     Se montan sobre el mismo cuerpo (mismo origen y escala que TALLER.obj).
     Si el OBJ trae textura se respeta; si no, cada pieza usa el color de modelos.js
     (o, si definís cfg.colors = { 'NombreDelMaterial': 0xRRGGBB }, un color por material). */
  var extrasOn=false;
  function mountExtras(){
    if(extrasOn||!restObj) return;
    var n=insts.filter(function(i){ return i.cfg.front; })[0]; if(!n) return; extrasOn=true;
    function add(cfg){
      if(!cfg) return;
      new OBJLoader().load(cfg.url,function(o){
        o.traverse(function(m){
          if(!m.isMesh) return;
          var list=Array.isArray(m.material)?m.material:[m.material];
          var out=list.map(function(old){
            if(old.map) return old;
            var c=(cfg.colors&&cfg.colors[old.name]!==undefined)?cfg.colors[old.name]:cfg.color;
            return new THREE.MeshStandardMaterial({color:c,roughness:.85,side:THREE.DoubleSide});
          });
          m.material=Array.isArray(m.material)?out:out[0];
        });
        n.obj.add(o);
      },undefined,function(){});                                                     // si el archivo todavía no existe, no pasa nada
    }
  }
})();
