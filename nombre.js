import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { NPC_URL, NPC_FACING } from './modelos.js';

/* ===== Pantalla "Ponele nombre a tu NPC" (diseño Teclado.png) =====
   Va después del tutorial y antes del menú de núcleos:
   npclab:tutorialend ─▶ esta pantalla ─ npclab:nameend ─▶ menú de núcleos
   · El teclado virtual está abierto desde que entra la pantalla.
   · El título "Escribí el nombre de tu NPC" titila; al escribir se reemplaza por el nombre.
   · ← → ↓ ↑ mueven el cursor · Enter pulsa la tecla marcada · "Aceptar" confirma.
   · También se puede tipear con el teclado real (la letra se escribe y el cursor salta a "Aceptar").
   · El UP del Arduino (que llega como 'r') hace de ↑.
   Al aceptar emite 'npclab:nombre' {name} y pone el nombre en la pantalla de Resultados (.f-name). */

var NPC_COLORS = { 'Material': 0xe8e8e8, 'Material.001': 0x1a1a1a };
var MAX = 12;                                         // largo máximo del nombre
var NPC_BOX = { x:473, y:865, h:540 };                // dónde se ve el NPC en el diseño 1920×1080 (x = centro, y = pies, h = alto)

function L(c){ return { k:c, t:c }; }
var ROWS = [
  'QWERTYUIOP'.split('').map(L),
  'ASDFGHJKLÑ'.split('').map(L),
  'ZXCVBNM'.split('').map(function(c){ return { k:c, t:c, cls:'z' }; }).concat([{ k:'back', t:'Borrar', cls:'wide' }]),
  [{ k:'space', t:'Espacio', cls:'sp' }, { k:'ok', t:'Aceptar', cls:'ok' }]
];

(function(){
  var $ = function(id){ return document.getElementById(id); };
  var tut=$('tutorial'), scene=$('nombre'), cv=$('nNpc'), title=$('nField'), txt=$('nText'), ph=$('nPh'),
      keysEl=$('nKeys'), sr=$('nSr'), body=document.body,
      reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var name='', active=false, ready=false, built=false, fr=0, fc=0, keys=[];

  /* ---------- Teclado virtual ---------- */
  function buildKeys(){
    ROWS.forEach(function(row,r){
      var d=document.createElement('div'); d.className='n-row'; keys[r]=[];
      row.forEach(function(def,c){
        var b=document.createElement('button'); b.type='button'; b.tabIndex=-1;
        b.className='n-key'+(def.cls?' '+def.cls:''); b.textContent=def.t;
        b.addEventListener('click',function(e){ e.stopPropagation(); if(!active||!ready) return; fr=r; fc=c; paintFocus(); press(def); });
        d.appendChild(b); keys[r].push(b);
      });
      keysEl.appendChild(d);
    });
  }
  function paintFocus(){
    keys.forEach(function(row,r){ row.forEach(function(b,c){ b.classList.toggle('foc',active&&r===fr&&c===fc); }); });
  }
  function move(dr,dc){
    if(dc){ var n=keys[fr].length; fc=(fc+dc+n)%n; }
    if(dr){                                            // al cambiar de fila se mantiene la posición relativa
      var rows=keys.length, nr=(fr+dr+rows)%rows, a=keys[fr].length, b=keys[nr].length;
      fc=a>1?Math.round(fc/(a-1)*(b-1)):0; fr=nr;
    }
    paintFocus();
  }

  /* ---------- Nombre (se muestra en el título del teclado) ---------- */
  function paintName(){
    txt.textContent=name;
    ph.hidden=!!name;                                  // con letras escritas, el título titilante desaparece
    sr.textContent=name?('Nombre: '+name):'Escribí el nombre de tu NPC';
  }
  function type(ch){
    if(name.length>=MAX) return;
    name+=(!name||name.slice(-1)===' ')?ch.toUpperCase():ch.toLowerCase();   // Primera Letra De Cada Palabra en mayúscula
  }
  function press(def){
    if(def.k==='ok'){ accept(); return; }
    if(def.k==='back') name=name.slice(0,-1);
    else if(def.k==='space'){ if(name&&name.slice(-1)!==' '&&name.length<MAX) name+=' '; }
    else type(def.k);
    paintName();
  }
  function error(){
    title.classList.add('err'); sr.textContent='Escribí un nombre antes de aceptar';
    setTimeout(function(){ title.classList.remove('err'); },320);
  }
  function accept(){
    var n=name.trim(); if(!n){ error(); return; }
    active=false; delete body.dataset.typing; paintFocus(); scene.hidden=true;
    [].forEach.call(document.querySelectorAll('.f-name'),function(el){ el.textContent=n; });   // pantalla de Resultados
    document.dispatchEvent(new CustomEvent('npclab:nombre',{detail:{name:n}}));
    document.dispatchEvent(new CustomEvent('npclab:nameend'));                                  // sigue el menú de núcleos
  }

  /* ---------- Entrada ---------- */
  document.addEventListener('keydown',function(e){
    if(!active||!ready||e.ctrlKey||e.metaKey||e.altKey) return;
    var k=e.key;
    if(k==='ArrowLeft'){ e.preventDefault(); move(0,-1); }
    else if(k==='ArrowRight'){ e.preventDefault(); move(0,1); }
    else if(k==='ArrowDown'){ e.preventDefault(); move(1,0); }
    else if(k==='ArrowUp'){ e.preventDefault(); move(-1,0); }   // el UP del Arduino llega como 'r' sintética
    else if(k==='Enter'){ e.preventDefault(); if(!e.repeat) press(ROWS[fr][fc]); }
    else if(k==='Backspace'){ e.preventDefault(); press({k:'back'}); }
    else if(k===' '){ e.preventDefault(); if(!e.repeat) press({k:'space'}); }
    else if(e.isTrusted&&/^[a-zñ0-9]$/i.test(k)){                       // teclado real: escribe y deja el cursor en "Aceptar"
      e.preventDefault(); type(k); paintName(); fr=ROWS.length-1; fc=1; paintFocus();
    }
  });

  /* ---------- NPC de frente (mismo modelo y luces que el resto) ---------- */
  function initThree(){
    var R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true}); R.setClearColor(0x000000,0);
    var S=new THREE.Scene(), cam=new THREE.PerspectiveCamera(30,16/9,.1,60); cam.position.set(0,0,10);
    var K=2*10*Math.tan(THREE.MathUtils.degToRad(15))/1080;             // unidades 3D por px del diseño
    S.add(new THREE.HemisphereLight(0xffffff,0x8a7fc8,1.0));
    var key=new THREE.DirectionalLight(0xffffff,1.8); key.position.set(-2.5,3,5); S.add(key);
    var rim=new THREE.DirectionalLight(0x66e8ff,.7); rim.position.set(3,1,-3); S.add(rim);

    var pivot=null;
    new OBJLoader().load(NPC_URL,function(obj){
      obj.traverse(function(m){
        if(!m.isMesh) return;
        var list=Array.isArray(m.material)?m.material:[m.material];
        var out=list.map(function(old){ return old.map?old:new THREE.MeshStandardMaterial({color:NPC_COLORS[old.name]!==undefined?NPC_COLORS[old.name]:0xe8e8e8,roughness:.85}); });
        m.material=Array.isArray(m.material)?out:out[0];
      });
      var bb=new THREE.Box3().setFromObject(obj), c=bb.getCenter(new THREE.Vector3());
      obj.position.set(-c.x,-bb.min.y,-c.z);                            // centrado y apoyado en el piso
      var holder=new THREE.Group(); pivot=new THREE.Group();
      pivot.rotation.y=NPC_FACING; pivot.add(obj); holder.add(pivot);
      holder.scale.setScalar(NPC_BOX.h*K/(bb.max.y-bb.min.y));
      holder.position.set((NPC_BOX.x-960)*K,(540-NPC_BOX.y)*K,0);
      S.add(holder);
    },undefined,function(){ console.warn('No se pudo cargar '+NPC_URL); });

    new ResizeObserver(function(){
      var w=cv.clientWidth,h=cv.clientHeight; if(!w||!h) return;
      R.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); R.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix();
    }).observe(cv);

    (function loop(now){
      requestAnimationFrame(loop);
      if(scene.hidden) return;
      if(pivot&&!reduce) pivot.rotation.y=NPC_FACING+Math.sin(now/1400)*.14;    // se mece suave
      R.render(S,cam);
    })(performance.now());
  }

  /* ---------- Entrada a la pantalla (la emite script.js al terminar el tutorial) ---------- */
  document.addEventListener('npclab:tut2end',function(){
    tut.hidden=true; scene.hidden=false; active=true; ready=false;
    body.dataset.typing='1';                                             // script.js no reinicia con la R mientras se escribe
    setTimeout(function(){ ready=true; },400);                           // el mismo Enter que cerró el tutorial no pulsa una tecla
    if(!built){ built=true; buildKeys(); initThree(); }
    fr=0; fc=0; paintFocus(); paintName();
  });
})();
