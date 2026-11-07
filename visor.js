import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { NPC_URL, NPC_FACING, HAIR_MODELS } from './modelos.js';
import { makeRig, POSES } from './rig.js';
import { cargarAtuendo } from './ropa.js';
import { arquetipo } from './arquetipos.js';

/* ===== Visor: se activa cuando la página se abre desde el QR (?n=...) y arma la imagen 1080×1920 ===== */
var Q = new URLSearchParams(location.search);
if (Q.has('n')) iniciar();

function iniciar(){
  var KEYS=['habla','caracter','creatividad','expresividad','social'];
  var D={ n:(Q.get('n')||'NPC').slice(0,16), h:Q.get('h'), o:Q.get('o'), c:Q.get('c')||'DPS',
          v:parseFloat(Q.get('v')), p:(Q.get('p')||'4,4,4,4,4').split(',').map(Number) };
  if(isNaN(D.v)) D.v=.5;

  var scr=document.getElementById('screen'); if(scr) scr.style.display='none';
  var box=document.createElement('div');
  box.style.cssText='position:fixed;inset:0;z-index:99999;background:#05030f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:12px;font-family:Prompt,Arial,sans-serif;color:#fff;text-align:center';
  var info=document.createElement('p'); info.textContent='Armando tu NPC...'; info.style.cssText='margin:0;font-size:18px';
  var cvs=document.createElement('canvas'); cvs.width=1080; cvs.height=1920;
  cvs.style.cssText='max-width:100%;max-height:calc(100vh - 110px);display:none';
  var btn=document.createElement('button'); btn.textContent='Guardar imagen'; btn.disabled=true;
  btn.style.cssText='padding:14px 28px;font:600 18px Prompt,Arial,sans-serif;color:#000;background:#1bff00;border:0;cursor:pointer';
  box.appendChild(cvs); box.appendChild(info); box.appendChild(btn); document.body.appendChild(box);

  var R=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  R.setPixelRatio(1); R.setSize(1080,1920,false); R.setClearColor(0x000000,0);
  var S=new THREE.Scene(), cam=new THREE.PerspectiveCamera(30,1080/1920,.1,60); cam.position.set(0,0,10);
  S.add(new THREE.HemisphereLight(0xffffff,0x8a7fc8,1.0));
  var key=new THREE.DirectionalLight(0xffffff,1.8); key.position.set(-2.5,3,5); S.add(key);
  var rim=new THREE.DirectionalLight(0x66a8ff,.7); rim.position.set(3,1,-3); S.add(rim);

  var COL={ 'Material':0xe8e8e8, 'Material.001':0x1a1a1a }, pend=2, listo=false;
  function fin(){ if(--pend>0) return; mostrar(); }
  function mostrar(){ if(listo) return; listo=true; R.render(S,cam); componer(); }
  setTimeout(mostrar,6000);                                     // por si algún modelo no carga

  new OBJLoader().load(NPC_URL,function(obj){
    obj.traverse(function(m){
      if(!m.isMesh) return;
      var l=Array.isArray(m.material)?m.material:[m.material];
      var out=l.map(function(o){ return new THREE.MeshStandardMaterial({color:COL[o.name]!==undefined?COL[o.name]:0xe8e8e8,roughness:.85}); });
      m.material=Array.isArray(m.material)?out:out[0];
    });
    var rig=makeRig(obj), holder=new THREE.Group(), pivot=new THREE.Group(), c=rig.bb.getCenter(new THREE.Vector3());
    rig.obj.position.set(-c.x,-rig.bb.min.y,-c.z);
    pivot.rotation.y=NPC_FACING; pivot.add(rig.obj); holder.add(pivot);
    holder.scale.setScalar(2.4/rig.H); holder.position.y=-1.03;
    S.add(holder); rig.apply(POSES.rest);

    var hc=HAIR_MODELS[D.h];
    if(hc) new OBJLoader().load(hc.url,function(o){
      o.traverse(function(m){ if(m.isMesh) m.material=new THREE.MeshStandardMaterial({color:hc.color,roughness:.85,side:THREE.DoubleSide}); });
      rig.hair(o); fin();
    },undefined,fin); else fin();
    cargarAtuendo(D.o,function(o){ if(o) rig.dress(o); fin(); });
  },undefined,mostrar);

  /* ---------- Imagen final (1080×1920, con márgenes seguros para las historias) ---------- */
  function glow(g,x,y,r,c){ var q=g.createRadialGradient(x,y,0,x,y,r); q.addColorStop(0,c); q.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=q; g.fillRect(0,0,1080,1920); }
  function movNivel(v){ return v<.2?'Energético':v<.4?'Semienergético':v<.6?'Equilibrado':v<.8?'Semilento':'Lento'; }
  function persNombre(){
    try{ var o={}; KEYS.forEach(function(k,i){ o[k]=D.p[i]; }); return arquetipo(o).nombre.replace(/^El /,'').toUpperCase(); }
    catch(e){ return 'EQUILIBRADO'; }
  }
  function componer(){
    Promise.all([document.fonts.load('100px "PP NeueBit"'),document.fonts.load('600 40px Prompt'),document.fonts.load('400 30px Prompt')])
      .catch(function(){}).then(function(){
        var g=cvs.getContext('2d'), x, y;
        var bg=g.createLinearGradient(0,0,0,1920); bg.addColorStop(0,'#1a0f55'); bg.addColorStop(.6,'#0b0626'); bg.addColorStop(1,'#030209');
        g.fillStyle=bg; g.fillRect(0,0,1080,1920);
        glow(g,100,1700,700,'rgba(46,172,50,.45)'); glow(g,1000,300,700,'rgba(190,22,196,.4)'); glow(g,900,1500,600,'rgba(30,60,255,.35)');
        g.fillStyle='rgba(255,255,255,.06)';
        for(x=0;x<1080;x+=100) g.fillRect(x,0,2,1920);
        for(y=0;y<1920;y+=100) g.fillRect(0,y,1080,2);
        g.fillStyle='rgba(0,0,0,.55)'; g.beginPath(); g.ellipse(540,1335,230,34,0,0,6.3); g.fill();
        g.drawImage(R.domElement,0,0);

        g.textAlign='center';
        g.fillStyle='#01CBE4'; g.font='600 30px Prompt, sans-serif'; g.fillText('NPC LAB',540,275);
        g.fillStyle='#fff'; g.font='110px "PP NeueBit", Prompt, sans-serif'; g.fillText('Tu NPC está listo',540,350);
        var fs=84; g.font='600 '+fs+'px Prompt, sans-serif';
        while(g.measureText(D.n).width>900&&fs>30){ fs-=4; g.font='600 '+fs+'px Prompt, sans-serif'; }
        g.fillStyle='#fff'; g.fillText(D.n,540,1440);

        var rows=[['Personalidad',persNombre(),'#1EFF00'],['Movimiento',movNivel(D.v),'#E90BFB'],['Conciencia',D.c,'#5b6bff']];
        g.textAlign='left';
        rows.forEach(function(r,i){
          var yy=1520+i*70;
          g.fillStyle=r[2]; g.fillRect(180,yy-26,26,26);
          g.font='400 34px Prompt, sans-serif'; g.fillText(r[0],225,yy);
          g.fillStyle='#fff'; g.font='600 40px Prompt, sans-serif'; g.fillText(r[1],560,yy);
        });
        cvs.style.display='block'; info.textContent='1080×1920 · lista para tu historia'; btn.disabled=false;
      });
  }

  btn.onclick=function(){
    cvs.toBlob(function(b){
      var f=new File([b],'mi-npc.png',{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[f]})) navigator.share({files:[f]}).catch(function(){});
      else { var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='mi-npc.png'; a.click(); }
    },'image/png');
  };
}