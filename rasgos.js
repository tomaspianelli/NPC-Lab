/* ===== Núcleo 1 · paso 3 (personalidad) + pantalla "Resultados" =====
   Después de confirmar el atuendo ('npclab:outfit') aparece la personalidad: 5 rasgos con 9 casilleros.
   ← → mueven el cursor naranja dentro del rasgo · Enter elige ese casillero (queda con tilde) y pasa al siguiente rasgo
   ↓ ↑ cambian de rasgo sin elegir · en "Siguiente", Enter confirma (si falta algún rasgo, te lleva a él).
   A la izquierda, cada rasgo tiene su propia torta: los porcentajes se mueven entre los dos extremos según el casillero.
   Al confirmar sale "Resultados" (NPC + mapa araña + resumen + torta de cómo te expresás) y Enter vuelve al menú de núcleos. */

import { fitInto, designBox } from './fit.js';
import { arquetipo } from './arquetipos.js';

(function(){
  var cv=document.getElementById('npc3d'), atuendo=document.getElementById('atuendo'), screen=document.getElementById('screen'),
      sc=document.getElementById('rasgos'), fin=document.getElementById('pfinal'),
      pie=document.getElementById('rPie'), leg=document.getElementById('rLeg'), rTitle=document.getElementById('rTitle'),
      next=document.getElementById('rNext'), sr=document.getElementById('rSr'),
      fSr=document.getElementById('fSr'), fRadar=document.getElementById('fRadar'), fSum=document.getElementById('fSum'),
      fHead=document.getElementById('fHead'), fPie=document.getElementById('fPie'), fLeg=document.getElementById('fLeg');
      var bk=sc.querySelector('.bk'), bsel='next';                   // en la fila de botones: 'back' = Regresar · 'next' = Siguiente

  /*DATOS-INICIO*/
  var COL=['#00ff55','#3dff86','#85f7a6','#b8f9d0','#ffffff','#f0c8ff','#e2a2fb','#cb62f5','#b000ff'];   // los 9 casilleros
  var PCOL=['#6670ff','#d062fb','#8dff78','#fff96d'];                                                    // colores de las 4 porciones

  /* Cada rasgo: dos extremos (a = izquierda, b = derecha) y su torta.
     dom = extremo del que vienen los porcentajes de "vec" · opp = cómo queda la torta en el extremo contrario (aproximado).
     title = título que diste · alt = título para el extremo contrario · wa/wb/na/nb/mid = palabras para el resumen. */
  var TR=[
    {k:'habla',n:'Habla',a:'Cortés',b:'Directo',dom:'a',
      cats:['Saludar y pedir amablemente','Expresar desacuerdo con tacto','Conversación neutral','Hablar de forma directa'],
      vec:[40,20,30,10], opp:[10,20,30,40],
      title:'Predominio de la cortesía', alt:'Predominio de la franqueza',
      wa:'cortés', wb:'directo', na:'cortesía', nb:'franqueza', mid:'equilibrado al hablar'},
    {k:'caracter',n:'Carácter',a:'Serio',b:'Alegre',dom:'b',
      cats:['Mostrar entusiasmo y optimismo','Reaccionar neutralmente','Hacer bromas','Responder con seriedad'],
      vec:[40,25,25,10], opp:[10,25,25,40],
      title:'Predominio de la alegría', alt:'Predominio de la seriedad',
      wa:'serio', wb:'alegre', na:'seriedad', nb:'alegría', mid:'de carácter equilibrado'},
    {k:'creatividad',n:'Creatividad',a:'Baja',b:'Alta',dom:'b',
      cats:['Proponer ideas originales','Experimentar con alternativas','Usar soluciones conocidas','Evitar explorar opciones'],
      vec:[40,30,20,10], opp:[10,20,30,40],
      title:'Tendencia a tener una creatividad original', alt:'Tendencia a seguir soluciones conocidas',
      wa:'práctico', wb:'creativo', na:'practicidad', nb:'creatividad', mid:'de creatividad media'},
    {k:'expresividad',n:'Expresividad',a:'Baja',b:'Alta',dom:'b',
      cats:['Gestos y emociones intensos','Expresión moderada','Cambios notorios de voz','Reacción poco visible'],
      vec:[40,25,25,10], opp:[10,35,15,40],
      title:'Predominio de la expresión emocional', alt:'Predominio de la reserva emocional',
      wa:'reservado', wb:'expresivo', na:'reserva', nb:'expresividad', mid:'de expresividad moderada'},
    {k:'social',n:'Social',a:'Introvertido',b:'Extrovertido',dom:'b',
      cats:['Iniciar conversaciones','Interactuar si se lo solicitan','Participar en grupos','Preferir actividades solitarias'],
      vec:[40,20,30,10], opp:[10,30,20,40],
      title:'Tendencia a ser sociable', alt:'Tendencia a la reserva social',
      wa:'introvertido', wb:'extrovertido', na:'introversión', nb:'sociabilidad', mid:'ni tímido ni sociable'}];
  var BY={}; TR.forEach(function(t){ BY[t.k]=t; });
  var AX=['habla','social','expresividad','creatividad','caracter'];            // orden del mapa araña, desde arriba y en sentido horario

  // Porcentajes de la torta de un rasgo según el casillero (0..8): va de "opp" (un extremo) a "vec" (el otro). Siempre suman 100.
  function dist(t,idx){
    var w=t.dom==='a'?(8-idx)/8:idx/8;
    var v=t.vec.map(function(x,i){ return w*x+(1-w)*t.opp[i]; });
    var fl=v.map(Math.floor), left=100-fl.reduce(function(a,b){ return a+b; },0);
    v.map(function(x,i){ return [x-fl[i],i]; }).sort(function(a,b){ return b[0]-a[0]; }).slice(0,left).forEach(function(o){ fl[o[1]]++; });
    return fl;
  }
  function titleFor(t,idx){ var pole=idx<4?'a':idx>4?'b':t.dom; return pole===t.dom?t.title:t.alt; }

  // Para el resumen: nivel de cada rasgo (qué tan lejos del centro está y de qué lado)
  function lvl(i){ var d=Math.abs(i-4); return {d:d, side:i<4?'a':i>4?'b':'m', adv:d>=3?'muy ':d>=1?'algo ':''}; }
  function phrase(t,i){ var p=lvl(i); return p.side==='m'?t.mid:p.adv+(p.side==='a'?t.wa:t.wb); }
  var HAIR={largo:'pelo largo ondulado',capucha:'pelo con capucha',corto:'pelo corto desordenado'};
  var OUTFIT={'ropa-1':'remera azul con bermuda y botas','ropa-2':'campera con pantalón gris','ropa-3':'buzo blanco con pantalón verde'};
  function unir(a){ return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' y '+a[a.length-1]; }
  function resumen(p,ch){
    var A=arquetipo(p);
    return {texto:A.largo, titulo:A.nombre.replace(/^El /,'')};
  }
  /*DATOS-FIN*/

  var CHECK='<svg viewBox="0 0 12 10" aria-hidden="true"><path d="M0 5H2V7H4V5H6V3H8V1H10V0H12V2H10V4H8V6H6V8H4V10H2V8H0Z"/></svg>';
  var pick={}, cur={}, f=0, lastF=0, step='off', ready=false, rows=[], choice={};
  TR.forEach(function(t){ pick[t.k]=null; cur[t.k]=4; });      // pick = casillero elegido (null = todavía no) · cur = cursor · 4 = centro

  // Lo que ya eligió el usuario en otros pasos (para el resumen)
  document.addEventListener('npclab:hairchosen',function(e){ choice.hair=e.detail.id; });
  document.addEventListener('npclab:movimiento',function(e){ choice.move=e.detail.value; });

  /* ---------- Filas de rasgos ---------- */
  TR.forEach(function(t,i){
    var r=document.createElement('div'); r.className='r-row'; r.style.setProperty('--i',i);
    r.innerHTML='<span class="r-n">'+t.n+'</span><span class="r-a">'+t.a+'</span><div class="r-sq"></div><span class="r-b">'+t.b+'</span>';
    var sq=r.querySelector('.r-sq');
    COL.forEach(function(c,j){
      var b=document.createElement('b'); b.style.background=c;
      b.addEventListener('click',function(e){ e.stopPropagation(); f=i; cur[t.k]=j; pick[t.k]=j; render(); });   // con el mouse: un clic elige
      sq.appendChild(b);
    });
    r.addEventListener('click',function(){ f=i; render(); });
    sc.appendChild(r); rows.push(r);
  });

  /* ---------- Tortas ---------- */
  function pieMarkup(d){                                         // mismas porciones y orden que el diseño: violeta, amarillo, verde, azul
    var order=[1,3,2,0], a=-17, C=157, R=157, out='';
    function pt(deg,r){ var t=deg*Math.PI/180; return [(C+r*Math.sin(t)).toFixed(1),(C-r*Math.cos(t)).toFixed(1)]; }
    order.forEach(function(i){
      var sw=d[i]*3.6, p0=pt(a,R), p1=pt(a+sw,R), mid=pt(a+sw/2,R*(d[i]<14?.78:.62));
      out+='<path d="M'+C+' '+C+'L'+p0[0]+' '+p0[1]+'A'+R+' '+R+' 0 '+(sw>180?1:0)+' 1 '+p1[0]+' '+p1[1]+'Z" fill="'+PCOL[i]+'"/>';
      if(d[i]>=6) out+='<text x="'+mid[0]+'" y="'+mid[1]+'">'+d[i]+'%</text>';
      a+=sw;
    });
    return out;
  }
  function legendMarkup(t){ return t.cats.map(function(c,i){ return '<li><i style="background:'+PCOL[i]+'"></i>'+c+'</li>'; }).join(''); }

  function render(){
    TR.forEach(function(t,i){
      var row=rows[i]; row.classList.toggle('foc',f===i);
      [].forEach.call(row.querySelectorAll('b'),function(b,j){
        var isPick=pick[t.k]===j;
        b.classList.toggle('pick',isPick); b.classList.toggle('cur',f===i&&cur[t.k]===j);      // naranja = cursor · tilde = elegido
        b.innerHTML=isPick?CHECK:'';
      });
    });
    next.classList.toggle('foc',f===TR.length&&bsel==='next');
    bk.classList.toggle('foc',f===TR.length&&bsel==='back');
    fitInto(leg,designBox(100,204,416,817),16);                   // la leyenda se achica si no entra en el panel
    // Panel izquierdo: la torta del rasgo enfocado (en "Siguiente" queda la del último)
    if(f<TR.length) lastF=f;
    var t=TR[lastF], idx=(f<TR.length||pick[t.k]===null)?cur[t.k]:pick[t.k];
    var d=dist(t,idx), ttl=titleFor(t,idx);
    rTitle.textContent=ttl; pie.innerHTML=pieMarkup(d); leg.innerHTML=legendMarkup(t);
    pie.setAttribute('aria-label',ttl+': '+t.cats.map(function(c,i){ return d[i]+'% '+c; }).join(', '));
    if(f<TR.length){ var c=cur[t.k]; sr.textContent=t.n+': '+(c<4?t.a:c>4?t.b:'equilibrado')+', casillero '+(c+1)+' de 9'+(pick[t.k]===c?' (elegido)':'')+'. '+ttl; }
    else sr.textContent=(bsel==='back'?'Regresar':'Siguiente');
  }

  /* ---------- Pantalla "Resultados" ---------- */
  var CX=1079, CY=372, RX=169, RY=182;                           // centro y radios del mapa araña (px del diseño 1920×1080)
  function vtx(k,f){ var a=(-90+72*k)*Math.PI/180; return [CX+RX*f*Math.cos(a), CY+RY*f*Math.sin(a)]; }   // f = 0..1 (1 = borde)
  function poly(f){ return AX.map(function(_,k){ var p=vtx(k,f); return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '); }
  function buildRadar(){
    var out='<defs><radialGradient id="fRg" gradientUnits="userSpaceOnUse" cx="1070" cy="415" r="190">'+
      '<stop offset="0" stop-color="#22ee22"/><stop offset=".5" stop-color="#b030ff"/><stop offset="1" stop-color="#8a00ff"/></radialGradient></defs>';
    for(var l=1;l<=5;l++) out+='<polygon points="'+poly(l/5)+'" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.3"/>';
    AX.forEach(function(_,k){ var p=vtx(k,1); out+='<line x1="'+CX+'" y1="'+CY+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'" stroke="#fff" stroke-opacity=".85" stroke-width="1.3"/>'; });
    var pts=AX.map(function(k,i){ var v=(pick[k]===null?4:pick[k])/8, p=vtx(i,.1+.9*v); return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' ');
    out+='<polygon points="'+pts+'" fill="url(#fRg)" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>';
    [['habla',1083,162,'middle'],['social',1262,313,'start'],['expresividad',1255,553,'middle'],['creatividad',893,553,'middle'],['caracter',903,312,'end']].forEach(function(o){
      out+='<text x="'+o[1]+'" y="'+o[2]+'" text-anchor="'+o[3]+'">'+BY[o[0]].n+'</text>'; });
    fRadar.innerHTML=out;
  }
  function buildResults(){
    var r=resumen(pick,choice);
    buildRadar();
    fHead.textContent=r.titulo;
    fSum.innerHTML=r.texto.split('|').map(function(p){ return '<span class="f-p">'+p.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')+'</span>'; }).join('');
    var soc=BY.social, d=dist(soc,pick.social);
    fPie.innerHTML=pieMarkup(d); fLeg.innerHTML=legendMarkup(soc);
    fPie.setAttribute('aria-label','Cómo te expresas: '+soc.cats.map(function(c,i){ return d[i]+'% '+c; }).join(', '));
    fSr.textContent='Resultados. '+r.titulo+'. '+fSum.textContent;
  }

  /* ---------- Flujo ---------- */
  function guard(){ ready=false; setTimeout(function(){ ready=true; },400); }       // el mismo Enter no debe avanzar dos pantallas

  document.addEventListener('npclab:outfit',function(e){          // lo emite personalidad.js al confirmar el atuendo
    choice.outfit=e.detail&&e.detail.id;
    atuendo.hidden=true; sc.hidden=false; step='rasgos'; f=0; guard(); render();
  });

  function faltante(){ for(var i=0;i<TR.length;i++) if(pick[TR[i].k]===null) return i; return -1; }
  function confirmar(){
    var m=faltante(); if(m>=0){ f=m; render(); return; }          // falta elegir algún rasgo: te lleva a ese rasgo
    step='final';
    var detail={}; TR.forEach(function(t){ detail[t.k]=pick[t.k]; });
    buildResults();
    // Resultados: el mismo canvas del NPC pasa acá (con peinado y atuendo elegidos)
    sc.hidden=true; fin.hidden=false; fin.appendChild(cv); guard();
    fitInto(fSum,designBox(752,71,1073,563),18);                   // el resumen se achica si no entra en el cuadro
    document.dispatchEvent(new CustomEvent('npclab:rasgos',{detail:detail}));
  }
  function volver(){
    if(step!=='final') return; step='off';
    // Resultados queda detrás: la despedida del científico (despedida.js) la oscurece y después vuelve al menú
    document.dispatchEvent(new CustomEvent('npclab:outro',{detail:{id:'personalidad',hair:choice.hair,outfit:choice.outfit}}));
  }

  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){
    if(!sc.hidden) fitInto(leg,designBox(100,204,416,817),16);
    if(!fin.hidden) fitInto(fSum,designBox(752,71,1073,563),18);
  });

  next.addEventListener('click',function(){ if(step==='rasgos'&&ready){ f=TR.length; confirmar(); } });
  fin.addEventListener('pointerdown',function(){ if(ready) volver(); });

  function atras(){
    if(step!=='rasgos'||!ready) return;
    step='off'; sc.hidden=true; atuendo.hidden=false;
    bsel='next';
    document.dispatchEvent(new CustomEvent('npclab:rasgosback'));
  }
  sc.querySelector('.bk').addEventListener('click',atras);

  document.addEventListener('keydown',function(e){
    if(!ready||step==='off') return;
    if(step==='rasgos'&&(e.key==='Backspace'||e.key==='Escape')){ e.preventDefault(); atras(); return; }
    var enter=(e.key==='Enter'||e.key===' ');
    if(step==='final'){ if(enter&&!e.repeat){ e.preventDefault(); volver(); } return; }
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();
      if(f<TR.length){ var k=TR[f].k; cur[k]=Math.max(0,Math.min(8,cur[k]+(e.key==='ArrowRight'?1:-1))); render(); }
      else { bsel=(e.key==='ArrowLeft')?'back':'next'; render(); }      // en los botones: ← Regresar · → Siguiente
    } else if(e.key==='ArrowDown'){ e.preventDefault(); if(f<TR.length) pick[TR[f].k]=cur[TR[f].k]; f=(f+1)%(TR.length+1); render(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); f=(f+TR.length)%(TR.length+1); render(); }
    else if(enter&&!e.repeat){
      e.preventDefault();
      if(f<TR.length){ pick[TR[f].k]=cur[TR[f].k]; f++; render(); }   // Enter elige el casillero del cursor y pasa al siguiente rasgo
      else if(bsel==='back') atras();
      else confirmar();
    }
  });
})();
