import { fitInto, designBox } from './fit.js';
import { arquetipo } from './arquetipos.js';

/* ===== Pantalla final · "Tu NPC está listo" =====
   Se abre con 'npclab:allcores' (cuando terminan los 3 núcleos) y junta lo que eligió el usuario:
   nombre (nombre.js) · personalidad (rasgos.js) · movimiento (movimiento.js) · clase (conciencia.js).
   El NPC 3D (con peinado y atuendo) es el mismo canvas de siempre. Enter, Espacio o la palanca (+) = Finalizar (reinicia todo). */

/* Rasgos en el orden de la pantalla: [clave, nombre, extremo izquierdo, extremo derecho] */
var RASGOS = [
  ['creatividad','Creatividad','práctico','creativo'], ['social','Social','introvertido','extrovertido'],
  ['expresividad','Expresividad','reservado','expresivo'], ['habla','Habla','cortés','directo'], ['caracter','Carácter','serio','alegre']
];
var EXPR = [['Inicia conversaciones','#6670ff'], ['Interactúa si le hablan','#d062fb'], ['Participa en grupos','#8dff78'], ['Actividades solitarias','#fff96d']];

/* Lo que dice cada clase: b = barras [nombre, valor (100 = llena), texto] · w = armas [nombre, 1 sí / 0 no] */
var CLASES = {
  DPS:   { t:'DPS',    d:'Máximo daño y movilidad, a costa de menos resistencia.',
           b:[['Daño crítico',100,'Máx'],['Movilidad',50,'+50%'],['Salud',-40,'−40%']],
           w:[['Dagas',1],['Arcos',1],['Armas pesadas',0]] },
  Healer:{ t:'Healer', d:'Mantiene al equipo con vida con curación constante.',
           b:[['Curación',100,'Máx'],['Regeneración',60,'+60%'],['Salud',50,'+50%']],
           w:[['Bastones',1],['Espadas',0],['Arcos',0]] },
  Tanque:{ t:'Tanque', d:'Absorbe el daño enemigo para proteger al equipo.',
           b:[['Defensa',100,'Máx'],['Salud',50,'+50%'],['Velocidad',-25,'−25%']],
           w:[['Martillos',1],['Escudos',1],['Magia',0]] }
};

var OK = '<svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="20" fill="none" stroke="#1EFF00" stroke-width="3"/><path d="M13 24L20 31L33 15" fill="none" stroke="#1EFF00" stroke-width="3.5"/></svg>';
var NO = '<svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="20" fill="none" stroke="#ff2a2a" stroke-width="3"/><path d="M15 15L31 31M31 15L15 31" fill="none" stroke="#ff2a2a" stroke-width="3.5"/></svg>';

(function(){
  var $=function(id){ return document.getElementById(id); };
  var scene=$('final'), cv=$('npc3d'), fin=$('fnFin'), sr=$('fnSr');
  var D={ name:'Nombre', pers:{}, mov:null, clase:'DPS', hair:null, outfit:null };
  document.addEventListener('npclab:hairchosen',function(e){ D.hair=e.detail.id; });
  document.addEventListener('npclab:outfit',function(e){ D.outfit=e.detail&&e.detail.id; });
  var active=false, ready=false;

  document.addEventListener('npclab:nombre',function(e){ D.name=e.detail.name; });
  document.addEventListener('npclab:rasgos',function(e){ D.pers=e.detail||{}; });
  document.addEventListener('npclab:movimiento',function(e){ D.mov=e.detail; });
  document.addEventListener('npclab:conciencia',function(e){ D.clase=e.detail.habilidad; });

  /* ---------- Personalidad ---------- */
  function resumen(p){                                         // frase corta con los dos rasgos más marcados
    var l=RASGOS.map(function(r){ var v=typeof p[r[0]]==='number'?p[r[0]]:4; return {d:Math.abs(v-4), w:v<4?r[2]:r[3]}; })
      .filter(function(x){ return x.d>0; }).sort(function(a,b){ return b.d-a.d; }).slice(0,2);
    if(!l.length) return 'Personalidad equilibrada en todos sus rasgos.';
    return 'Se destaca por ser '+l.map(function(x){ return (x.d>=3?'muy ':'algo ')+x.w; }).join(' y ')+'.';
  }
  function distSocial(idx){                                    // mismos porcentajes que la torta "Cómo te expresas" de rasgos.js
    var vec=[40,20,30,10], opp=[10,30,20,40], w=idx/8;
    var v=vec.map(function(x,i){ return w*x+(1-w)*opp[i]; });
    var fl=v.map(Math.floor), left=100-fl.reduce(function(a,b){ return a+b; },0);
    v.map(function(x,i){ return [x-fl[i],i]; }).sort(function(a,b){ return b[0]-a[0]; }).slice(0,left).forEach(function(o){ fl[o[1]]++; });
    return fl;
  }

  /* ---------- Movimiento: anillo con los números ---------- */
  function ringMarkup(cs,un,cpm,spm,fps){
    var CX=1152, CY=575.5, RO=163, RI=138, RM=115, RC=68, out='';
    var stops=[[0,[181,52,224]],[60,[150,86,196]],[100,[106,140,178]],[140,[88,150,140]],[220,[88,150,140]],[262,[118,100,175]],[300,[160,66,208]],[360,[181,52,224]]];
    function pt(a,r){ var t=a*Math.PI/180; return [CX+r*Math.sin(t), CY-r*Math.cos(t)]; }
    function P(a,r){ var p=pt(a,r); return p[0].toFixed(1)+' '+p[1].toFixed(1); }
    function col(a){
      for(var k=0;k<stops.length-1;k++){ var s=stops[k], n=stops[k+1];
        if(a<=n[0]){ var f=(a-s[0])/(n[0]-s[0]); return 'rgb('+s[1].map(function(v,i){ return Math.round(v+(n[1][i]-v)*f); }).join(',')+')'; } }
      return 'rgb(181,52,224)';
    }
    out+='<defs>'+
      '<linearGradient id="fnRg1" gradientUnits="userSpaceOnUse" x1="0" y1="'+(CY-RM)+'" x2="0" y2="'+(CY+RM)+'"><stop offset="0" stop-color="#b858d4"/><stop offset="1" stop-color="#64489a"/></linearGradient>'+
      '<linearGradient id="fnRg2" gradientUnits="userSpaceOnUse" x1="0" y1="'+(CY-RC)+'" x2="0" y2="'+(CY+RC)+'"><stop offset="0" stop-color="#b832c8"/><stop offset="1" stop-color="#6a28b8"/></linearGradient></defs>';
  
    for(var i=0;i<30;i++){                                        // aro exterior: 30 bloques de 12°
      var a0=i*12+.8, a1=(i+1)*12-.8;
      out+='<path d="M'+P(a0,RO)+'A'+RO+' '+RO+' 0 0 1 '+P(a1,RO)+'L'+P(a1,RI)+'A'+RI+' '+RI+' 0 0 0 '+P(a0,RI)+'Z" fill="'+col(i*12+6)+'"/>';
    }
  
    // anillo medio: flecha de ciclo abierta (sale arriba y vuelve en sentido antihorario)
    out+='<path d="M'+P(12,RM)+'A'+RM+' '+RM+' 0 1 0 '+P(28,RM)+'" fill="none" stroke="url(#fnRg1)" stroke-width="7"/>';
    var ta=26, tp=pt(ta,RM), tr=ta*Math.PI/180, bx=Math.cos(tr), by=Math.sin(tr), c=.7071, L=24;
    out+='<polyline fill="none" stroke="#b858d4" stroke-width="8" points="'+
      (tp[0]+c*(bx-by)*L).toFixed(1)+','+(tp[1]+c*(bx+by)*L).toFixed(1)+' '+tp[0].toFixed(1)+','+tp[1].toFixed(1)+' '+
      (tp[0]+c*(bx+by)*L).toFixed(1)+','+(tp[1]+c*(by-bx)*L).toFixed(1)+'"/>';
  
    // círculo central
    out+='<circle cx="'+CX+'" cy="'+CY+'" r="'+RC+'" fill="#12052a" stroke="url(#fnRg2)" stroke-width="10"/>';
    out+='<text x="'+CX+'" y="'+CY+'" text-anchor="middle" font-size="30">'+cs+'</text>'+
         '<text x="'+CX+'" y="'+(CY+22)+'" text-anchor="middle" font-size="20">'+un+'</text>';
  
    // flechas con sus puntos
    out+='<g fill="none" stroke="#fff" stroke-width="2">'+
         '<path d="M1250 461L1287 458L1314 433"/>'+       // Pasos (aro exterior)
         '<path d="M1086 667L1064 667L1028 721"/>'+       // Ciclos (anillo medio)
         '<path d="M1194 626V678L1280 716"/></g>';        // FPS (círculo central)
    out+='<g fill="#fff"><circle cx="1250" cy="461" r="8"/><circle cx="1086" cy="667" r="8"/><circle cx="1194" cy="626" r="8"/></g>';
  
    // números y rótulos
    out+='<text x="1321" y="435" font-size="30">'+spm+'</text><text x="1322" y="450" font-size="15">Pasos</text>';
    out+='<text x="989" y="744" font-size="30">'+cpm+'</text><text x="989" y="762" font-size="15">Ciclos</text>';
    out+='<text x="1289" y="732" font-size="30">'+fps+'</text><text x="1290" y="756" font-size="20">FPS</text>';
    return out;
  }
  /* ---------- QR: lleva a la página que arma la imagen del NPC ---------- */
  var QR_BASE='https://tomaspianelli.github.io/NPC-Lab/index.html'; 
  function qrUrl(){
    var P=D.pers||{}, p=['habla','caracter','creatividad','expresividad','social'].map(function(k){ return typeof P[k]==='number'?P[k]:4; });
    var q=new URLSearchParams({ n:D.name, h:D.hair||'', o:D.outfit||'', c:D.clase, v:(D.mov&&D.mov.value!==undefined?D.mov.value:.5), p:p.join(',') });
    return (QR_BASE||location.origin+location.pathname)+'?'+q.toString();
  }
  function hacerQr(){
    var img=document.querySelector('#final .fn-qr'); if(!img) return;
    import('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm').then(function(m){
      var qr=(m.default||m)(0,'L'); qr.addData(qrUrl()); qr.make();
      img.src=qr.createDataURL(8,3);
    }).catch(function(err){ console.warn('QR:',err); });
  }
  /* ---------- Armado ---------- */
  function build(){
    var p=D.pers||{};
    $('fnName').textContent=D.name;

    // Personalidad
    var h=$('fHead'); $('fnPt').textContent=(h&&h.textContent)||'Equilibrado';
    $('fnPd').textContent=resumen(p);
    $('fnDots').innerHTML=RASGOS.map(function(r){
      var v=typeof p[r[0]]==='number'?p[r[0]]:4, n=1+Math.round(v/8*4), s='';
      for(var k=0;k<5;k++) s+='<i'+(k<n?' class="on"':'')+'></i>';
      return '<div class="fn-row">'+r[1]+'<span>'+s+'</span></div>';
    }).join('');
    var d=distSocial(typeof p.social==='number'?p.social:4);
    $('fnBar').innerHTML=[0,2,1,3].map(function(i){ return '<i style="--p:'+d[i]+';--c:'+EXPR[i][1]+'"></i>'; }).join('');
    $('fnLeg').innerHTML=EXPR.map(function(x,i){ return '<li><i style="background:'+x[1]+'"></i>'+d[i]+'% '+x[0]+'</li>'; }).join('');

    // Movimiento
    var m=D.mov||{cycle:1,fps:24,nivel:'Moderado'}, cyc=m.cycle||1, cpm=Math.round(60/cyc), spm=cpm*2;
    var cs=String(Math.round(cyc*10)/10).replace('.',','), un=cs==='1'?'Segundo':'Segundos';
    $('fnMt').textContent=m.nivel;
    $('fnMd').textContent='Ciclo completo del movimiento de “'+D.name+'” (en '+cs+' '+un.toLowerCase()+').';
    try{
      var ring=$('fnRing');
      if(!ring){                                                // si el SVG no está en el HTML, lo crea
        ring=document.createElementNS('http://www.w3.org/2000/svg','svg');
        ring.id='fnRing'; ring.setAttribute('class','fn-art'); ring.setAttribute('viewBox','0 0 1920 1080'); ring.setAttribute('aria-hidden','true');
        scene.appendChild(ring);
      }
      ring.innerHTML='<g transform="translate(8 0)">'+ringMarkup(cs,un,cpm,spm,m.fps)+'</g>';   // +8 px: sigue a la tarjeta
    }catch(err){ console.error('Anillo de movimiento:',err); }   // si falla, Conciencia se arma igual

    // Conciencia
    var C=CLASES[D.clase]||CLASES.DPS;
    $('fnCt').textContent=C.t; $('fnCd').textContent=C.d;
    $('fnBars').innerHTML=C.b.map(function(b,i){
      var v=b[1], w=Math.min(Math.abs(v),100)*1.77, L=v<0?194-w:194;                // 100 % = 177 px del diseño
      return '<div class="fn-br" style="--i:'+i+'">'+b[0]+'<b'+(v<0?' class="neg"':'')+' style="left:calc('+L.toFixed(1)+'*var(--u));width:calc('+w.toFixed(1)+'*var(--u))">'+b[2]+'</b></div>';
    }).join('');
    $('fnWeap').innerHTML=C.w.map(function(w){ return '<div>'+(w[1]?OK:NO)+'<span>'+w[0]+'</span></div>'; }).join('');

    sr.textContent='Tu NPC '+D.name+' está listo. Personalidad '+$('fnPt').textContent+'. Movimiento '+m.nivel+'. Clase '+C.t+'. Finalizar con Enter o la palanca.';
  }
  function fit(){                                              // los textos se achican solos si no entran en su cuadro
    fitInto($('fnPt'),designBox(524,250,374,60),4,.5); fitInto($('fnPd'),designBox(524,325,374,75),4,.5);
    fitInto($('fnMt'),designBox(996,250,374,60),4,.5); fitInto($('fnMd'),designBox(996,325,374,75),4,.5);
    fitInto($('fnCt'),designBox(1472,250,374,60),4,.5); fitInto($('fnCd'),designBox(1472,325,374,75),4,.5);
    fitInto($('fnName'),designBox(68,935,374,75),4,.5);
  }
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ if(active) fit(); });

  document.addEventListener('npclab:allcores',function(){
    var st=$('stage'); if(scene.parentNode!==st) st.appendChild(scene);   // por si quedó dentro de otra pantalla oculta
    scene.hidden=false; active=true; ready=false; setTimeout(function(){ ready=true; },500);   // el mismo toque no cierra
    scene.appendChild(cv);
    build(); fit();
    hacerQr();
    var rb=$('fnRun'); if(rb) rb.textContent='Correr';
  });

  function alternar(){
    if(!active||!ready) return;
    if(!window.NPCLAB||!window.NPCLAB.alternarCorrer){ console.warn('Falta window.NPCLAB.alternarCorrer en personalidad.js'); return; }
    var on=window.NPCLAB.alternarCorrer(D.mov);
    $('fnRun').textContent=on?'Detener':'Correr';
  }
  $('fnRun').addEventListener('click',alternar);
  document.addEventListener('keydown',function(e){
    if(active&&ready&&!e.repeat&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){ e.preventDefault(); alternar(); }
  });

  /* ---------- Finalizar: reinicia todo para el próximo usuario ---------- */
  function terminar(){ if(!active||!ready) return; active=false; location.reload(); }
  fin.addEventListener('click',terminar);
  document.addEventListener('keydown',function(e){
    if(!active||!ready||e.repeat) return;
    if(e.key==='Enter'||e.key===' '||e.key==='+'){ e.preventDefault(); terminar(); }
  });
})();
