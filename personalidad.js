import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { fitInto } from './fit.js';
import { makeRig, POSES, runPose } from './rig.js';
import { propElegido, montarProps, ubicarProp } from './prop-npc.js';
import { NPC_URL, NPC_FACING, HAIR_MODELS, OUTFIT_MODELS } from './modelos.js';

/* ===== Núcleo 1 · Personalidad: tu NPC (OBJ) + peinados y atuendos (OBJ) =====
   ← → mueven la selección y Enter confirma.
   Paso 1: peinado (cabeza)  →  Paso 2: atuendo (cuerpo entero) */

var NPC_SHOW   = 0.65;
var NPC_COLORS = { 'Material': 0xe8e8e8, 'Material.001': 0x1a1a1a };

(function(){
  var cores=document.getElementById('cores'), scene=document.getElementById('personalidad'),
      atuendo=document.getElementById('atuendo'), cv=document.getElementById('npc3d'),
      built=false, ready=false;

  document.addEventListener('npclab:core',function(e){
    if(e.detail.id!=='personalidad') return;
    cores.hidden=true; scene.hidden=false;
    ready=false; setTimeout(function(){ ready=true; },400);
    if(!built){ built=true; build(); }
  });

  function showFact(root,id){ [].forEach.call(root.querySelectorAll('.fact'),function(f){ f.classList.toggle('on',f.dataset.opt===id); }); fitFacts(root); }
  function fitFacts(root){
    var info=root.querySelector('.info'), on=root.querySelector('.fact.on'); if(!on) return;
    [].forEach.call(on.querySelectorAll('.sub,.big'),function(el){ fitInto(el,info,16); });
  }
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ fitFacts(scene); fitFacts(atuendo); });
  [].forEach.call(scene.querySelectorAll('.dots'),function(d){
    var total=100, n=Math.round(total*(+d.dataset.pct)/100);
    for(var i=0;i<total;i++){ var dot=document.createElement('i'); if(total-1-i<n) dot.className='on'; d.appendChild(dot); }
  });

  var loader=new OBJLoader();
  function load(url,colors,fallback,side,done){
    loader.load(url,function(obj){
      obj.traverse(function(m){
        if(!m.isMesh) return;
        var list=Array.isArray(m.material)?m.material:[m.material];
        var out=list.map(function(old){
          if(old.map) return old;
          var c=(colors&&colors[old.name]!==undefined)?colors[old.name]:fallback;
          return new THREE.MeshStandardMaterial({color:c,roughness:.85,side:side});
        });
        m.material=Array.isArray(m.material)?out:out[0];
      });
      done(obj);
    },undefined,function(){ console.warn('No se pudo cargar '+url); done(null); });
  }

  function build(){
    var R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true});
    R.setClearColor(0x000000,0);
    var S=new THREE.Scene(), cam=new THREE.PerspectiveCamera(30,800/910,.1,50);
    cam.position.set(-.13,-.62,6.8);
    S.add(new THREE.HemisphereLight(0xffffff,0x8a7fc8,1.0));
    var key=new THREE.DirectionalLight(0xffffff,1.8); key.position.set(-2.5,3,4); S.add(key);
    var rim=new THREE.DirectionalLight(0x66ffd0,.7); rim.position.set(3,1,-3); S.add(rim);

    var root=new THREE.Group(), fit=new THREE.Group(), npcGroup=new THREE.Group();
    S.add(root); root.add(fit); fit.add(npcGroup);

    var FRAMES={ head:{show:NPC_SHOW,span:1,top:.30,camX:-.13}, body:{show:1,span:.86,top:.20,camX:-.08}, out:{show:1,span:.82,top:.20,camX:-.08} };
    var frame=FRAMES.head, bbox=null;
    function applyFrame(){
      if(!bbox) return;
      var s=3.65*frame.span/((bbox.max.y-bbox.min.y)*frame.show);
      fit.scale.setScalar(s);
      fit.position.y=(1.2-frame.top)-s*bbox.max.y;
      cam.position.x=frame.camX;
    }
    document.addEventListener('npclab:rasgos',function(){ frame=FRAMES.body; applyFrame(); });

    var prop=null;
    load(NPC_URL,NPC_COLORS,0xe8e8e8,THREE.FrontSide,function(obj){
      if(!obj) return;
      var rg=makeRig(obj);                                  // rg.obj es la copia posable: esa es la que va a la escena
      npcGroup.add(rg.obj); npcGroup.rotation.y=NPC_FACING; npcGroup.updateMatrixWorld(true);
      var b=new THREE.Box3().setFromObject(rg.obj), c=b.getCenter(new THREE.Vector3());
      npcGroup.position.set(-c.x,0,-c.z);
      bbox=b; applyFrame();
      rg.apply(POSES.rest);
      prop={pr:montarProps(rg.obj),rg:rg,kind:null};
    });

    function makeMount(models){
      var cache={}, cur=null, want=null;
      var f=function(id){
        want=id;
        if(cur){ npcGroup.remove(cur); cur=null; }
        var cfg=models[id]; if(!cfg) return;
        if(cache[id]){ cur=cache[id]; npcGroup.add(cur); return; }
        if(id in cache) return;
        cache[id]=null;
        load(cfg.url,cfg.colors||null,cfg.color,THREE.DoubleSide,function(o){
          cache[id]=o||false;
          if(o && want===id){ cur=o; npcGroup.add(o); }
        });
      };
      f.set=function(v){ if(cur) cur.visible=v; };
      return f;
    }
    var mountHair=makeMount(HAIR_MODELS), mountOutfit=makeMount(OUTFIT_MODELS);

    var hairCards=[].slice.call(scene.querySelectorAll('.hair')), hSel=1;
    function pickHair(k){
      hSel=(k+hairCards.length)%hairCards.length;
      hairCards.forEach(function(c,i){ c.classList.toggle('on',i===hSel); });
      var id=hairCards[hSel].dataset.id; showFact(scene,id); mountHair(id);
      document.dispatchEvent(new CustomEvent('npclab:hair',{detail:{id:id}}));
    }
    var outCards=[].slice.call(atuendo.querySelectorAll('.hair')), oSel=1;
    function pickOutfit(k){
      oSel=(k+outCards.length)%outCards.length;
      outCards.forEach(function(c,i){ c.classList.toggle('on',i===oSel); });
      var id=outCards[oSel].dataset.id; showFact(atuendo,id); mountOutfit(id);
      document.dispatchEvent(new CustomEvent('npclab:outfitpreview',{detail:{id:id}}));
    }

    function confirmHair(){
      setBk(false);
      var id=hairCards[hSel].dataset.id;
      scene.hidden=true; atuendo.hidden=false; atuendo.appendChild(cv);
      frame=FRAMES.out; applyFrame(); pickOutfit(1);
      ready=false; setTimeout(function(){ ready=true; },400);
      document.dispatchEvent(new CustomEvent('npclab:hairchosen',{detail:{id:id}}));
    }
    var done=false;
    function confirmOutfit(){
      if(done) return; done=true;
      document.dispatchEvent(new CustomEvent('npclab:outfit',{detail:{id:outCards[oSel].dataset.id}}));
    }

    function backToHair(){
      setBk(false);
      atuendo.hidden=true; scene.hidden=false; scene.insertBefore(cv,scene.querySelector('.tri.t1'));
      frame=FRAMES.head; applyFrame(); mountOutfit(null);
      ready=false; setTimeout(function(){ ready=true; },400);
      document.dispatchEvent(new CustomEvent('npclab:hairback'));
    }
    var bkBtn=atuendo.querySelector('button.bk'), bkOn=false;
    function setBk(v){ bkOn=v; if(bkBtn) bkBtn.classList.toggle('foc',v); }
    if(bkBtn) bkBtn.addEventListener('click',function(){ if(ready) backToHair(); });
    document.addEventListener('npclab:rasgosback',function(){
      setBk(false);
      done=false; ready=false; setTimeout(function(){ ready=true; },400);
    });

    document.addEventListener('keydown',function(e){
      var inHair=!scene.hidden, inOut=!atuendo.hidden;
      if(!ready||(!inHair&&!inOut)) return;
      if(e.key==='Backspace'||e.key==='Escape'){ if(inOut){ e.preventDefault(); backToHair(); } return; }
      if(inOut&&e.key==='ArrowDown'){ e.preventDefault(); setBk(true); return; }
      if(inOut&&e.key==='ArrowUp'){ e.preventDefault(); setBk(false); return; }
      var d=(e.key==='ArrowRight'?1:0)-(e.key==='ArrowLeft'?1:0);
      if(d){ e.preventDefault(); if(inHair) pickHair(hSel+d); else if(!bkOn) pickOutfit(oSel+d); }
      else if((e.key==='Enter'||e.key===' ')&&!e.repeat){
        e.preventDefault();
        if(inHair) confirmHair(); else if(bkOn) backToHair(); else confirmOutfit();
      }
    });
    hairCards.forEach(function(c,i){ c.addEventListener('click',function(){ pickHair(i); }); });
    outCards.forEach(function(c,i){ c.addEventListener('click',function(){ pickOutfit(i); }); });
    document.getElementById('hairPrev').addEventListener('click',function(){ pickHair(hSel-1); });
    document.getElementById('hairNext').addEventListener('click',function(){ pickHair(hSel+1); });
    document.getElementById('outPrev').addEventListener('click',function(){ pickOutfit(oSel-1); });
    document.getElementById('outNext').addEventListener('click',function(){ pickOutfit(oSel+1); });
    pickHair(1);

    new ResizeObserver(function(){
      var w=cv.clientWidth,h=cv.clientHeight; if(!w||!h) return;
      R.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); R.setSize(w,h,false);
      cam.aspect=w/h; cam.updateProjectionMatrix();
    }).observe(cv);
    var tgt=.3, t0=performance.now();
    [scene,atuendo].forEach(function(sc){ sc.addEventListener('pointermove',function(e){
      var r=sc.getBoundingClientRect(); tgt=((e.clientX-r.left)/r.width-.3)*1.2;
    }); });

    /* --- Pantalla final: el NPC corre con lo que se eligió en Movimiento (lo llama final.js) --- */
    var run=null, lastR=performance.now();
    window.NPCLAB=window.NPCLAB||{};
    var vestidos=[], vestidoOk=false, cargando=false;
    function rigidos(v){ mountHair.set(v); mountOutfit.set(v); }
    function vestidosVis(v){ vestidos.forEach(function(o){ o.visible=v; }); }
    window.NPCLAB.alternarCorrer=function(m){
      if(!prop) return false;
      if(run){                                                  // detener: vuelve a la pose original con las piezas de siempre
        run=null; prop.rg.apply(POSES.rest); vestidosVis(false); rigidos(true);
        if(prop.kind) ubicarProp(prop.pr,prop.kind,prop.rg,POSES.rest);   // el objeto vuelve a la mano
        return false;
      }
      if(cargando) return false;
      m=m||{value:.5,cycle:1,fps:24};
      var t=Math.max(0,Math.min(1,m.value)), L=function(a,b){ return a+(b-a)*t; };
      var cfg={ ph:0, cyc:m.cycle||1, fps:m.fps, yaw:.9,
        style:{ leg:L(.78,.42), knee:L(1.05,.5), lean:L(.22,.05), elbow:L(1.4,.95), swing:L(.85,.45), bob:L(.03,.012) } };
      function arrancar(){ rigidos(false); vestidosVis(true); run=cfg; cargando=false; }
      if(vestidoOk){ arrancar(); return true; }
      cargando=true;
      var pend=2, listo=false;
      function uno(){ if(--pend===0&&!listo){ listo=true; vestidoOk=true; arrancar(); } }
      setTimeout(function(){ if(!listo){ listo=true; vestidoOk=true; arrancar(); } },3000);   // por si algún modelo no carga
      var hc=HAIR_MODELS[hairCards[hSel].dataset.id], oid=outCards[oSel].dataset.id;
      if(hc) load(hc.url,hc.colors||null,hc.color,THREE.DoubleSide,function(o){ if(o) vestidos.push(prop.rg.hair(o)); uno(); }); else uno();
      import('./ropa.js').then(function(r){ r.cargarAtuendo(oid,function(o){ if(o) vestidos.push(prop.rg.dress(o)); uno(); }); });
      return true;
    };

    (function loop(now){
      requestAnimationFrame(loop);
      if(!cv.offsetParent) return;
      var dtR=Math.min(.05,(now-lastR)/1000); lastR=now;
      if(run&&prop){
        run.ph=(run.ph+dtR/run.cyc)%1;
        var ph=run.ph;
        if(run.fps){ var N=Math.max(1,Math.round(run.fps*run.cyc)); ph=Math.floor(ph*N)/N; }
        var pz=runPose(ph,run.style); prop.rg.apply(pz);
        if(prop.kind) ubicarProp(prop.pr,prop.kind,prop.rg,pz);
        root.rotation.y+=(run.yaw-root.rotation.y)*.08;
      } else {
        root.rotation.y+=(tgt+Math.sin((now-t0)/1400)*.06-root.rotation.y)*.08;
      }
      if(prop&&!run){ var k=propElegido(); if(k!==prop.kind){ prop.kind=k; ubicarProp(prop.pr,k,prop.rg,POSES.rest); } }
      R.render(S,cam);
    })(t0);
  }
})();

/* ===== Barra de progreso verde del núcleo 1 ===== */
(function(){
  var PORC=[0,.5,.9,1], TOTAL=3, cur=0, timer=null;
  var bars=[].slice.call(document.querySelectorAll('.k-prog.g'));

  function aria(n){ bars.forEach(function(b){ b.setAttribute('aria-label','Progreso: '+n+' de '+TOTAL); }); }
  function reset(){
    clearTimeout(timer); cur=0;
    bars.forEach(function(b){ var i=b.firstElementChild; i.style.transition='none'; b.style.setProperty('--p',0); void i.offsetWidth; i.style.transition=''; });
    aria(0);
  }
  function go(n){
    clearTimeout(timer);
    var from=PORC[cur]; cur=n;
    bars.forEach(function(b){
      var i=b.firstElementChild; i.style.transition='none'; b.style.setProperty('--p',from); void i.offsetWidth; i.style.transition='';
    });
    aria(n);
    timer=setTimeout(function(){ bars.forEach(function(b){ b.style.setProperty('--p',PORC[n]); }); },350);
  }

  reset();
  document.addEventListener('npclab:core',function(e){ if(e.detail.id==='personalidad') reset(); });
  document.addEventListener('npclab:hairchosen',function(){ go(1); });
  document.addEventListener('npclab:outfit',function(){ go(2); });
  document.addEventListener('npclab:rasgos',function(){ go(3); });
})();